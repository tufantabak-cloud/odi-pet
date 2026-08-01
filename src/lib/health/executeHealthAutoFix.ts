/**
 * Y.5 — Health Auto-Fix Executor (Approved Execution Engine)
 *
 * Y.4 (healthAutoFix) tarafından üretilen AutoFixPlan çıktılarındaki YALNIZCA Fixable
 * olarak işaretlenmiş güvenli düzeltmeleri veritabanında uygular.
 *
 * 🔒 KESİN GÜVENLİK KURALI:
 * `approved !== true` ise HİÇBİR MUTATION YAPILMAZ (executed = 0).
 * İdempotent ve hata izolasyonlu olarak çalışır.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import type { AutoFixPlan, AutoFixAction } from './healthAutoFix'

export interface ExecuteHealthAutoFixInput {
  supabase: SupabaseClient<Database>
  plan: AutoFixPlan
  /**
   * Açık onay bayrağı.
   * @default false (Onay verilmeden hiçbir mutation yapılmaz)
   */
  approved?: boolean
}

export interface ExecutionOperationResult {
  issueId: string
  action: string
  targetTable: string
  targetId: string
  status: 'executed' | 'skipped' | 'failed'
  reason?: string
}

export interface ExecuteHealthAutoFixResult {
  executed: number
  skipped: number
  failed: number
  operations: ExecutionOperationResult[]
}

/**
 * AutoFixPlan içerisindeki güvenli düzeltmeleri açık onay (approved = true) ile yürütür.
 */
export async function executeHealthAutoFix(
  input: ExecuteHealthAutoFixInput
): Promise<ExecuteHealthAutoFixResult> {
  const { supabase, plan, approved = false } = input

  const operations: ExecutionOperationResult[] = []
  let executedCount = 0
  let skippedCount = 0
  let failedCount = 0

  // 🔒 1. GÜVENLİK DUVARI: Approved onaylanmamışsa sıfır mutation
  if (!approved) {
    for (const fix of plan.fixes) {
      operations.push({
        issueId: fix.issueId,
        action: fix.actionType,
        targetTable: fix.targetTable,
        targetId: fix.targetId,
        status: 'skipped',
        reason: 'UNAPPROVED_EXECUTION_BLOCKED',
      })
      skippedCount++
    }

    for (const skippedIssue of plan.skipped) {
      operations.push({
        issueId: skippedIssue.issueId,
        action: 'MANUAL_REQUIRED',
        targetTable: 'n/a',
        targetId: 'n/a',
        status: 'skipped',
        reason: skippedIssue.reason,
      })
      skippedCount++
    }

    return {
      executed: 0,
      skipped: skippedCount,
      failed: 0,
      operations,
    }
  }

  // ── 2. FIXABLE EYLEMLERİN GÜVENLİ YÜRÜTÜLMESİ (APPROVED = TRUE) ────────────
  for (const fix of plan.fixes) {
    try {
      const opResult = await executeSingleFixAction(supabase, fix)
      operations.push(opResult)

      if (opResult.status === 'executed') executedCount++
      else if (opResult.status === 'skipped') skippedCount++
      else if (opResult.status === 'failed') failedCount++
    } catch (err: unknown) {
      operations.push({
        issueId: fix.issueId,
        action: fix.actionType,
        targetTable: fix.targetTable,
        targetId: fix.targetId,
        status: 'failed',
        reason: err instanceof Error ? err.message : 'UNHANDLED_EXECUTION_ERROR',
      })
      failedCount++
    }
  }

  // Manuel konular rapora skipped olarak eklenir
  for (const skippedIssue of plan.skipped) {
    operations.push({
      issueId: skippedIssue.issueId,
      action: 'MANUAL_REQUIRED',
      targetTable: 'n/a',
      targetId: 'n/a',
      status: 'skipped',
      reason: skippedIssue.reason,
    })
    skippedCount++
  }

  return {
    executed: executedCount,
    skipped: skippedCount,
    failed: failedCount,
    operations,
  }
}

/**
 * Tekil fix eylemini veritabanında idempotent olarak yürütür.
 */
async function executeSingleFixAction(
  supabase: SupabaseClient<Database>,
  fix: AutoFixAction
): Promise<ExecutionOperationResult> {
  switch (fix.actionType) {
    case 'DELETE_NOTIFICATION':
    case 'CLEANUP_ORPHAN_NOTIFICATION': {
      // 1. Önce varlığını kontrol et (Idempotency)
      const { data: existing } = await supabase
        .from('notifications')
        .select('id')
        .eq('id', fix.targetId)
        .maybeSingle()

      if (!existing) {
        return {
          issueId: fix.issueId,
          action: fix.actionType,
          targetTable: fix.targetTable,
          targetId: fix.targetId,
          status: 'skipped',
          reason: 'ALREADY_MUTATED_OR_DELETED',
        }
      }

      // 2. Silme işlemi
      const { error: deleteErr } = await supabase
        .from('notifications')
        .delete()
        .eq('id', fix.targetId)

      if (deleteErr) {
        return {
          issueId: fix.issueId,
          action: fix.actionType,
          targetTable: fix.targetTable,
          targetId: fix.targetId,
          status: 'failed',
          reason: deleteErr.message,
        }
      }

      return {
        issueId: fix.issueId,
        action: fix.actionType,
        targetTable: fix.targetTable,
        targetId: fix.targetId,
        status: 'executed',
      }
    }

    case 'NORMALIZE_CONFIDENCE': {
      const targetConfidence = fix.proposedChanges.confidence_level as string

      const { data: record } = await supabase
        .from('vaccine_records_v2')
        .select('id, confidence_level')
        .eq('id', fix.targetId)
        .maybeSingle()

      if (!record) {
        return {
          issueId: fix.issueId,
          action: fix.actionType,
          targetTable: fix.targetTable,
          targetId: fix.targetId,
          status: 'skipped',
          reason: 'TARGET_RECORD_NOT_FOUND',
        }
      }

      // Zaten kanonik ise tekrar güncelleme yapma (Idempotency)
      if (record.confidence_level === targetConfidence) {
        return {
          issueId: fix.issueId,
          action: fix.actionType,
          targetTable: fix.targetTable,
          targetId: fix.targetId,
          status: 'skipped',
          reason: 'ALREADY_NORMALIZED',
        }
      }

      const { error: updateErr } = await supabase
        .from('vaccine_records_v2')
        .update({ confidence_level: targetConfidence } as any)
        .eq('id', fix.targetId)

      if (updateErr) {
        return {
          issueId: fix.issueId,
          action: fix.actionType,
          targetTable: fix.targetTable,
          targetId: fix.targetId,
          status: 'failed',
          reason: updateErr.message,
        }
      }

      return {
        issueId: fix.issueId,
        action: fix.actionType,
        targetTable: fix.targetTable,
        targetId: fix.targetId,
        status: 'executed',
      }
    }

    case 'FLAG_DUPLICATE_PLAN': {
      const { data: plan } = await (supabase as any)
        .from('vaccination_plans')
        .select('id, status')
        .eq('id', fix.targetId)
        .maybeSingle()

      if (!plan) {
        return {
          issueId: fix.issueId,
          action: fix.actionType,
          targetTable: fix.targetTable,
          targetId: fix.targetId,
          status: 'skipped',
          reason: 'TARGET_PLAN_NOT_FOUND',
        }
      }

      if (plan.status === 'cancelled') {
        return {
          issueId: fix.issueId,
          action: fix.actionType,
          targetTable: fix.targetTable,
          targetId: fix.targetId,
          status: 'skipped',
          reason: 'ALREADY_CANCELLED',
        }
      }

      const { error: cancelErr } = await (supabase as any)
        .from('vaccination_plans')
        .update({ status: 'cancelled' })
        .eq('id', fix.targetId)

      if (cancelErr) {
        return {
          issueId: fix.issueId,
          action: fix.actionType,
          targetTable: fix.targetTable,
          targetId: fix.targetId,
          status: 'failed',
          reason: cancelErr.message,
        }
      }

      return {
        issueId: fix.issueId,
        action: fix.actionType,
        targetTable: fix.targetTable,
        targetId: fix.targetId,
        status: 'executed',
      }
    }

    case 'FLAG_DUPLICATE_VACCINE': {
      // Mükerrer aşı kaydını notlar alanına auto-fix etiketi ekleyerek işaretler
      const { data: rec } = await supabase
        .from('vaccine_records_v2')
        .select('id, notes')
        .eq('id', fix.targetId)
        .maybeSingle()

      if (!rec) {
        return {
          issueId: fix.issueId,
          action: fix.actionType,
          targetTable: fix.targetTable,
          targetId: fix.targetId,
          status: 'skipped',
          reason: 'TARGET_VACCINE_RECORD_NOT_FOUND',
        }
      }

      if (rec.notes?.includes('[AUTO-FIX-DUPLICATE]')) {
        return {
          issueId: fix.issueId,
          action: fix.actionType,
          targetTable: fix.targetTable,
          targetId: fix.targetId,
          status: 'skipped',
          reason: 'ALREADY_FLAGGED',
        }
      }

      const newNotes = rec.notes ? `${rec.notes} [AUTO-FIX-DUPLICATE]` : '[AUTO-FIX-DUPLICATE]'
      const { error: flagErr } = await supabase
        .from('vaccine_records_v2')
        .update({ notes: newNotes })
        .eq('id', fix.targetId)

      if (flagErr) {
        return {
          issueId: fix.issueId,
          action: fix.actionType,
          targetTable: fix.targetTable,
          targetId: fix.targetId,
          status: 'failed',
          reason: flagErr.message,
        }
      }

      return {
        issueId: fix.issueId,
        action: fix.actionType,
        targetTable: fix.targetTable,
        targetId: fix.targetId,
        status: 'executed',
      }
    }

    default: {
      return {
        issueId: fix.issueId,
        action: fix.actionType,
        targetTable: fix.targetTable,
        targetId: fix.targetId,
        status: 'skipped',
        reason: 'UNSUPPORTED_ACTION_TYPE',
      }
    }
  }
}
