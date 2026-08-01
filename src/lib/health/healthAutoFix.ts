/**
 * Y.4 — Health Auto-Fix Engine (Dry-Run First)
 *
 * Y.3 denetim motoru (auditHealthData) tarafından tespit edilen tutarsızlıklar için
 * otomatik onarım planı (AutoFixPlan) oluşturur.
 *
 * ⚠️ ÇOK ÖNEMLİ KURAL: Bu modül %100 DRY-RUN mantığıyla çalışır.
 * Hiçbir INSERT, UPDATE veya DELETE veritabanı işlemi YAPMAZ.
 */

import type { HealthAuditResult, AuditIssue } from './auditHealthData'
import { normalizeConfidenceLevel } from '../vaccines/confidenceLevels'

export interface AutoFixAction {
  issueId: string
  category: string
  code: string
  actionType:
    | 'DELETE_NOTIFICATION'
    | 'NORMALIZE_CONFIDENCE'
    | 'CLEANUP_ORPHAN_NOTIFICATION'
    | 'FLAG_DUPLICATE_PLAN'
    | 'FLAG_DUPLICATE_VACCINE'
  targetId: string
  targetTable: string
  proposedChanges: Record<string, unknown>
  description: string
}

export interface SkippedAction {
  issueId: string
  category: string
  code: string
  reason: string
  description: string
}

export interface AutoFixOptions {
  /**
   * Dry Run modu.
   * @default true (Y.4 seviyesinde her zaman true ve salt okunur kalır)
   */
  dryRun?: boolean
}

export interface AutoFixPlan {
  /** Gerçekleştirilecek değişiklik var mı ve canlı modda mı (Y.4'te her zaman false) */
  executable: boolean
  /** Otomatik düzeltilebilir eylemler */
  fixes: AutoFixAction[]
  /** İnsan müdahalesi gerektiren manuel konular */
  skipped: SkippedAction[]
  summary: {
    fixable: number
    manual: number
  }
}

/**
 * HealthAuditResult verisinden otomatik düzeltme planı üretir.
 * Salt okunur (pure function) olarak çalışır.
 */
export function planHealthAutoFix(
  auditResult: HealthAuditResult,
  options: AutoFixOptions = { dryRun: true }
): AutoFixPlan {
  const fixes: AutoFixAction[] = []
  const skipped: SkippedAction[] = []

  const allIssues: AuditIssue[] = [...auditResult.errors, ...auditResult.warnings]

  for (const issue of allIssues) {
    switch (issue.code) {
      // ── 1. OTOMATİK DÜZELTİLEBİLİR KONULAR (FIXABLE) ─────────────────────

      case 'DUPLICATE_NOTIFICATION_INSERT': {
        const notifId = (issue.metadata?.notification_id as string) || issue.id
        fixes.push({
          issueId: issue.id,
          category: issue.category,
          code: issue.code,
          actionType: 'DELETE_NOTIFICATION',
          targetId: notifId,
          targetTable: 'notifications',
          proposedChanges: { _action: 'DELETE', id: notifId },
          description: `Mükerrer bildirim kaydı (${notifId}) silinecek.`,
        })
        break
      }

      case 'NON_CANONICAL_CONFIDENCE_LEVEL': {
        const recordId = (issue.metadata?.record_id as string) || issue.id
        const currentConf = (issue.metadata?.confidence_level as string) || 'unknown'
        const normalized = normalizeConfidenceLevel(currentConf)

        fixes.push({
          issueId: issue.id,
          category: issue.category,
          code: issue.code,
          actionType: 'NORMALIZE_CONFIDENCE',
          targetId: recordId,
          targetTable: 'vaccine_records_v2',
          proposedChanges: { confidence_level: normalized },
          description: `Aşı kaydı (${recordId}) confidence_level '${currentConf}' -> '${normalized}' olarak güncellenecek.`,
        })
        break
      }

      case 'INVALID_PLAN_REFERENCE':
      case 'ORPHAN_NOTIFICATION_PET': {
        const notifId = (issue.metadata?.notification_id as string) || issue.id
        fixes.push({
          issueId: issue.id,
          category: issue.category,
          code: issue.code,
          actionType: 'CLEANUP_ORPHAN_NOTIFICATION',
          targetId: notifId,
          targetTable: 'notifications',
          proposedChanges: { _action: 'DELETE', id: notifId },
          description: `Bulunmayan plan/pet referanslı yetim bildirim (${notifId}) temizlenecek.`,
        })
        break
      }

      case 'DUPLICATE_COMPLETED_PLAN': {
        const planId = (issue.metadata?.plan_id as string) || issue.id
        fixes.push({
          issueId: issue.id,
          category: issue.category,
          code: issue.code,
          actionType: 'FLAG_DUPLICATE_PLAN',
          targetId: planId,
          targetTable: 'vaccination_plans',
          proposedChanges: { status: 'cancelled', notes: 'Auto-fixed duplicate plan candidate' },
          description: `Mükerrer tamamlanmış plan (${planId}) iptal adayı olarak işaretlenecek.`,
        })
        break
      }

      case 'DUPLICATE_VACCINE_RECORD': {
        const recId = (issue.metadata?.record_id as string) || issue.id
        fixes.push({
          issueId: issue.id,
          category: issue.category,
          code: issue.code,
          actionType: 'FLAG_DUPLICATE_VACCINE',
          targetId: recId,
          targetTable: 'vaccine_records_v2',
          proposedChanges: { is_duplicate_flag: true },
          description: `Aynı tarihteki mükerrer aşı kaydı (${recId}) incelenmek üzere işaretlenecek.`,
        })
        break
      }

      // ── 2. MANUEL BIRAKILACAK KONULAR (MANUAL / SKIPPED) ──────────────────

      case 'PET_WITHOUT_OWNER': {
        skipped.push({
          issueId: issue.id,
          category: issue.category,
          code: issue.code,
          reason: 'MANUAL_OWNERSHIP_ASSIGNMENT_REQUIRED',
          description: `Evcil hayvanın (${issue.metadata?.pet_id}) sahibi eksik. Manuel kullanıcı ataması gerektirir.`,
        })
        break
      }

      case 'ACTIVE_PLAN_ON_INACTIVE_PET': {
        skipped.push({
          issueId: issue.id,
          category: issue.category,
          code: issue.code,
          reason: 'INACTIVE_PET_REVIEW_REQUIRED',
          description: `Pasif evcil hayvan üzerindeki plan (${issue.metadata?.plan_id}) kullanıcı/veteriner onayı gerektirir.`,
        })
        break
      }

      case 'MISSING_LEGAL_REQUIRED_PLAN': {
        skipped.push({
          issueId: issue.id,
          category: issue.category,
          code: issue.code,
          reason: 'LEGAL_PROTOCOL_CONSENT_REQUIRED',
          description: `Evcil hayvan (${issue.metadata?.pet_id}) için zorunlu Kuduz planı oluşturulması kullanıcı onayı gerektirir.`,
        })
        break
      }

      case 'ORPHAN_VACCINE_RECORD': {
        skipped.push({
          issueId: issue.id,
          category: issue.category,
          code: issue.code,
          reason: 'MEDICAL_RECORD_AUDIT_REQUIRED',
          description: `Geçersiz pet_id'ye sahip aşı kaydı (${issue.metadata?.record_id}) medikal denetim gerektirir.`,
        })
        break
      }

      case 'VACCINE_INVALID_DATE_ORDER': {
        skipped.push({
          issueId: issue.id,
          category: issue.category,
          code: issue.code,
          reason: 'CHRONOLOGICAL_DATE_RESOLUTION_REQUIRED',
          description: `Tarih kronolojisi bozuk aşı kaydı (${issue.metadata?.record_id}) klinik doğrulaması gerektirir.`,
        })
        break
      }

      case 'OVERDUE_PLAN_MISSING_NOTIFICATION': {
        skipped.push({
          issueId: issue.id,
          category: issue.category,
          code: issue.code,
          reason: 'NOTIFICATION_ENGINE_DISPATCH_REQUIRED',
          description: `Eksik bildirim tetiklemesi Orchestration katmanı üzerinden yürütülecektir.`,
        })
        break
      }

      default: {
        skipped.push({
          issueId: issue.id,
          category: issue.category,
          code: issue.code,
          reason: 'UNCLASSIFIED_ISSUE',
          description: `Bilinmeyen sorun (${issue.code}). Manuel inceleme önerilir.`,
        })
        break
      }
    }
  }

  return {
    executable: false, // Y.4 seviyesinde %100 Dry-Run olduğu için her zaman false kalır
    fixes,
    skipped,
    summary: {
      fixable: fixes.length,
      manual: skipped.length,
    },
  }
}
