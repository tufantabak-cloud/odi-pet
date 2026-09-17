import { createBrowserClient } from '@supabase/ssr'

let client: ReturnType<typeof createBrowserClient> | undefined

// Resilient lock handler:
// Prevents Turbopack/Next.js fast refresh & parallel mount race conditions from throwing:
// "Lock '...' was released because another request stole it"
const resilientLock = async (name: string, acquireTimeout: number, fn: () => Promise<any>) => {
  if (typeof window !== 'undefined' && 'locks' in navigator) {
    try {
      return await navigator.locks.request(name, async () => {
        return await fn()
      })
    } catch (err: any) {
      if (err?.message?.includes('stole it') || err?.name === 'AbortError') {
        return await fn()
      }
      throw err
    }
  }
  return await fn()
}

export function createBrowserSupabaseClient() {
  if (typeof window === 'undefined') {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'
    )
  }

  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key',
      {
        auth: {
          lock: resilientLock,
        },
      }
    )
  }

  return client
}
