/**
 * Orkestratör route testleri için hafif, bellek içi Supabase istemci taklidi.
 *
 * Neden gerçek DB yerine bu: orkestratör route'ları `supabase.auth.getUser()`
 * üzerinden kimlik çözer ve `is_primary_pet_owner` RPC'si `auth.uid()`e bağlıdır.
 * Service-role bir istemciyle bunlar anlamlı şekilde test edilemez. Bu taklit,
 * route'ların iş mantığını (durum kodları, analytics event tipleri, yazma/yazmama
 * kararları) DB'ye ihtiyaç duymadan deterministik olarak doğrular.
 */

export type Row = Record<string, any>
export type FakeDb = Record<string, Row[]>

type Filter = (row: Row) => boolean

interface BuilderState {
  table: string
  columns: string
  countMode: boolean
  headMode: boolean
  filters: Filter[]
  orderBy?: { column: string; ascending: boolean }
  limitCount?: number
}

function compare(a: unknown, b: unknown): number {
  if (a === b) return 0
  if (a === null || a === undefined) return -1
  if (b === null || b === undefined) return 1
  return a < b ? -1 : 1
}

export interface FakeSupabaseOptions {
  /** Bu tablo için count sorgusu hata döndürür (fail-closed testleri). */
  failCountForTable?: string
  /** Bu tabloya insert hata döndürür. */
  failInsertForTable?: string
}

export function createFakeSupabase(
  db: FakeDb,
  user: { id: string } | null,
  options: FakeSupabaseOptions = {}
) {
  const ensure = (table: string): Row[] => {
    if (!db[table]) db[table] = []
    return db[table]
  }

  function makeBuilder(table: string) {
    const state: BuilderState = {
      table,
      columns: '*',
      countMode: false,
      headMode: false,
      filters: [],
    }

    const applyRows = (): Row[] => {
      let rows = ensure(state.table).filter((row) => state.filters.every((f) => f(row)))

      // Nested select desteği: orchestrator_campaigns -> orchestrator_prompts
      if (state.table === 'orchestrator_campaigns' && state.columns.includes('orchestrator_prompts')) {
        rows = rows.map((campaign) => ({
          ...campaign,
          orchestrator_prompts: ensure('orchestrator_prompts').filter(
            (p) => p.campaign_id === campaign.id
          ),
        }))
      }

      if (state.orderBy) {
        const { column, ascending } = state.orderBy
        rows = [...rows].sort((a, b) => {
          const result = compare(a[column], b[column])
          return ascending ? result : -result
        })
      }

      if (typeof state.limitCount === 'number') {
        rows = rows.slice(0, state.limitCount)
      }

      return rows
    }

    const resolve = () => {
      if (state.countMode && options.failCountForTable === state.table) {
        return { data: null, error: { message: 'count failed' }, count: null }
      }

      const rows = applyRows()

      if (state.countMode) {
        return { data: state.headMode ? null : rows, error: null, count: rows.length }
      }

      return { data: rows, error: null, count: null }
    }

    const builder: any = {
      select(columns = '*', opts?: { count?: string; head?: boolean }) {
        state.columns = columns
        state.countMode = Boolean(opts?.count)
        state.headMode = Boolean(opts?.head)
        return builder
      },
      eq(column: string, value: unknown) {
        state.filters.push((row) => row[column] === value)
        return builder
      },
      in(column: string, values: unknown[]) {
        state.filters.push((row) => values.includes(row[column]))
        return builder
      },
      gte(column: string, value: any) {
        state.filters.push((row) => row[column] !== null && row[column] !== undefined && row[column] >= value)
        return builder
      },
      lte(column: string, value: any) {
        state.filters.push((row) => row[column] !== null && row[column] !== undefined && row[column] <= value)
        return builder
      },
      not(column: string, operator: string, value: unknown) {
        if (operator === 'is' && value === null) {
          state.filters.push((row) => row[column] !== null && row[column] !== undefined)
        }
        return builder
      },
      order(column: string, opts?: { ascending?: boolean }) {
        state.orderBy = { column, ascending: opts?.ascending !== false }
        return builder
      },
      limit(count: number) {
        state.limitCount = count
        return builder
      },
      single() {
        const rows = applyRows()
        if (rows.length === 0) {
          return Promise.resolve({ data: null, error: { message: 'no rows' } })
        }
        return Promise.resolve({ data: rows[0], error: null })
      },
      maybeSingle() {
        const rows = applyRows()
        return Promise.resolve({ data: rows[0] ?? null, error: null })
      },
      insert(payload: Row | Row[]) {
        const result = (() => {
          if (options.failInsertForTable === state.table) {
            return { data: null, error: { message: 'insert failed' } }
          }
          const items = Array.isArray(payload) ? payload : [payload]
          for (const item of items) {
            ensure(state.table).push({ id: `row-${ensure(state.table).length + 1}`, created_at: new Date().toISOString(), ...item })
          }
          return { data: items, error: null }
        })()

        return {
          then: (onFulfilled: (value: any) => unknown) => Promise.resolve(result).then(onFulfilled),
          select: () => Promise.resolve(result),
        }
      },
      update(payload: Row) {
        const rows = applyRows()
        for (const row of rows) Object.assign(row, payload)
        return {
          eq: (column: string, value: unknown) => {
            const targets = ensure(state.table).filter((row) => row[column] === value)
            for (const row of targets) Object.assign(row, payload)
            return Promise.resolve({ data: targets, error: null })
          },
          then: (onFulfilled: (value: any) => unknown) =>
            Promise.resolve({ data: rows, error: null }).then(onFulfilled),
        }
      },
      then(onFulfilled: (value: any) => unknown, onRejected?: (reason: unknown) => unknown) {
        return Promise.resolve(resolve()).then(onFulfilled, onRejected)
      },
    }

    return builder
  }

  return {
    from: (table: string) => makeBuilder(table),
    auth: {
      getUser: async () =>
        user
          ? { data: { user }, error: null }
          : { data: { user: null }, error: { message: 'Unauthorized' } },
    },
  }
}

/** Route handler'lara verilecek minimal Request taklidi. */
export function fakeRequest(body: unknown): Request {
  return { json: async () => body } as unknown as Request
}

export const hoursAgo = (hours: number) =>
  new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

export const daysAgo = (days: number) => hoursAgo(days * 24)
