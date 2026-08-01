/**
 * Y.6 — Health Audit History & Execution Log
 *
 * Health Audit (Y.3), Auto-Fix Plan (Y.4) ve Auto-Fix Execution (Y.5) sonuçlarını
 * benzersiz bir `runId` ile ilişkilendiren, değiştirilemez (append-only) merkezi log servisi.
 *
 * Bu modül KESİNLİKLE geçmiş kayıtların üzerine yazmaz; yalnızca yeni log kaydı ekler.
 */

import type { HealthAuditResult } from './auditHealthData'
import type { AutoFixPlan } from './healthAutoFix'
import type { ExecuteHealthAutoFixResult } from './executeHealthAutoFix'

export interface HealthExecutionLogEntry {
  /** Benzersiz çalıştırma kimliği (ör: run-20260801-120000 veya UUID) */
  runId: string
  /** ISO formatında zaman damgası */
  timestamp: string
  /** Y.3 denetim sonucu (isteğe bağlı) */
  auditResult?: HealthAuditResult
  /** Y.4 otomatik düzeltme planı (isteğe bağlı) */
  fixPlan?: AutoFixPlan
  /** Y.5 onaylı yürütme sonucu (isteğe bağlı) */
  executionResult?: ExecuteHealthAutoFixResult
  /** Ek metadata */
  metadata?: Record<string, unknown>
}

// Bellek içi değiştirilemez (append-only) kayıt deposu
const inMemoryHistoryLog: HealthExecutionLogEntry[] = []

/**
 * Otomatik çalıştırma kimliği üretir.
 */
export function generateRunId(): string {
  const now = new Date()
  const pad = (n: number) => n.toString().padStart(2, '0')
  const dateStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`
  const timeStr = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  const randomSuffix = Math.floor(1000 + Math.random() * 9000)
  return `run-${dateStr}-${timeStr}-${randomSuffix}`
}

/**
 * Yeni bir çalıştırma ve denetim kaydını append-only olarak günlüğe ekler.
 */
export function recordHealthExecution(entry: HealthExecutionLogEntry): HealthExecutionLogEntry {
  if (!entry.runId || !entry.runId.trim()) {
    throw new Error('HealthExecutionLogEntry must contain a valid runId.')
  }

  const frozenEntry: HealthExecutionLogEntry = Object.freeze({
    ...entry,
    timestamp: entry.timestamp || new Date().toISOString(),
  })

  inMemoryHistoryLog.push(frozenEntry)
  return frozenEntry
}

/**
 * Kayıtlı tüm çalıştırma geçmişini döndürür (append-only sırasıyla).
 */
export function getHealthExecutionHistory(): readonly HealthExecutionLogEntry[] {
  return Object.freeze([...inMemoryHistoryLog])
}

/**
 * Belirli bir runId ile eşleşen günlüğü getirir.
 */
export function getHealthExecutionByRunId(runId: string): HealthExecutionLogEntry | undefined {
  return inMemoryHistoryLog.find(item => item.runId === runId)
}

/**
 * Depoyu temizler (Yalnızca test izolasyonu amacıyla kullanılır).
 */
export function _clearHealthExecutionHistoryForTesting(): void {
  inMemoryHistoryLog.length = 0
}
