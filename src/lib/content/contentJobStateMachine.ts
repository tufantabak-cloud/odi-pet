/**
 * Odi.Pet — Content Job State Machine & Service Role Barrier
 * Merkezi durum geçişleri ve yetki kontrol tablosu.
 */

export type JobAction =
  | 'start_research'
  | 'finish_research'
  | 'inspect_source'
  | 'verify_source'
  | 'reject_source'
  | 'mark_ready_for_generation'
  | 'generate_draft'
  | 'request_admin_review'
  | 'request_vet_review'
  | 'approve_for_import'
  | 'reject_job'
  | 'import_as_draft'
  | 'import_generated_draft_to_article';

export type JobStatus =
  | 'queued'
  | 'research_required'
  | 'researching'
  | 'source_review_required'
  | 'ready_for_generation'
  | 'generating'
  | 'draft_ready'
  | 'admin_review_required'
  | 'vet_review_required'
  | 'approved_for_import'
  | 'imported'
  | 'rejected'
  | 'failed';

export type ActorRole = 'ai_agent' | 'admin_human' | 'founder_human' | 'vet_human';

export interface StateTransitionRule {
  allowedFromStatuses: JobStatus[];
  targetStatus: JobStatus;
  allowedRoles: ActorRole[];
}

export const STATE_MACHINE_RULES: Record<JobAction, StateTransitionRule> = {
  start_research: {
    allowedFromStatuses: ['queued', 'research_required'],
    targetStatus: 'researching',
    allowedRoles: ['ai_agent', 'admin_human', 'founder_human']
  },
  finish_research: {
    allowedFromStatuses: ['researching'],
    targetStatus: 'source_review_required',
    allowedRoles: ['ai_agent', 'admin_human', 'founder_human']
  },
  inspect_source: {
    allowedFromStatuses: ['source_review_required', 'ready_for_generation'],
    targetStatus: 'source_review_required',
    allowedRoles: ['ai_agent', 'admin_human', 'founder_human']
  },
  verify_source: {
    allowedFromStatuses: ['source_review_required', 'ready_for_generation'],
    targetStatus: 'source_review_required',
    allowedRoles: ['admin_human', 'founder_human'] // AI KESİNLİKLE ÇALIŞTIRAMAZ
  },
  reject_source: {
    allowedFromStatuses: ['source_review_required', 'ready_for_generation'],
    targetStatus: 'source_review_required',
    allowedRoles: ['admin_human', 'founder_human']
  },
  mark_ready_for_generation: {
    allowedFromStatuses: ['source_review_required'],
    targetStatus: 'ready_for_generation',
    allowedRoles: ['admin_human', 'founder_human'] // AI KESİNLİKLE ÇALIŞTIRAMAZ
  },
  generate_draft: {
    allowedFromStatuses: ['ready_for_generation'],
    targetStatus: 'draft_ready',
    allowedRoles: ['ai_agent', 'admin_human', 'founder_human']
  },
  request_admin_review: {
    allowedFromStatuses: ['draft_ready'],
    targetStatus: 'admin_review_required',
    allowedRoles: ['ai_agent', 'admin_human', 'founder_human']
  },
  request_vet_review: {
    allowedFromStatuses: ['admin_review_required', 'draft_ready'],
    targetStatus: 'vet_review_required',
    allowedRoles: ['admin_human', 'founder_human'] // AI KESİNLİKLE ÇALIŞTIRAMAZ
  },
  approve_for_import: {
    allowedFromStatuses: ['admin_review_required', 'vet_review_required'],
    targetStatus: 'approved_for_import',
    allowedRoles: ['admin_human', 'founder_human', 'vet_human'] // AI KESİNLİKLE ÇALIŞTIRAMAZ
  },
  reject_job: {
    allowedFromStatuses: [
      'queued', 'research_required', 'researching', 'source_review_required',
      'ready_for_generation', 'generating', 'draft_ready', 'admin_review_required',
      'vet_review_required', 'approved_for_import'
    ],
    targetStatus: 'rejected',
    allowedRoles: ['admin_human', 'founder_human']
  },
  import_as_draft: {
    allowedFromStatuses: ['approved_for_import', 'admin_review_required', 'imported'],
    targetStatus: 'imported',
    allowedRoles: ['admin_human', 'founder_human']
  },
  import_generated_draft_to_article: {
    allowedFromStatuses: ['approved_for_import', 'admin_review_required', 'imported'],
    targetStatus: 'imported',
    allowedRoles: ['admin_human', 'founder_human']
  }
};

/**
 * Geçiş geçerliliğini denetler
 */
export function validateStateTransition(
  action: string,
  currentStatus: JobStatus,
  actorRole: ActorRole
): { isValid: boolean; targetStatus?: JobStatus; error?: string } {
  // Generic action yasaklama
  if (['status', 'import', 'approve', 'update', 'process'].includes(action)) {
    return {
      isValid: false,
      error: `Generic veya belirsiz "${action}" aksiyonu kabul edilemez. Lütfen tanımlı açık aksiyonları kullanın.`
    };
  }

  const rule = STATE_MACHINE_RULES[action as JobAction];
  if (!rule) {
    return {
      isValid: false,
      error: `Geçersiz eylem: "${action}".`
    };
  }

  if (!rule.allowedFromStatuses.includes(currentStatus)) {
    return {
      isValid: false,
      error: `"${action}" eylemi "${currentStatus}" durumunda iken çalıştırılamaz. İzin verilen durumlar: ${rule.allowedFromStatuses.join(', ')}`
    };
  }

  if (!rule.allowedRoles.includes(actorRole)) {
    return {
      isValid: false,
      error: `"${action}" eylemini çalıştırmak için "${actorRole}" yetkili değildir. İzin verilen roller: ${rule.allowedRoles.join(', ')}`
    };
  }

  return { isValid: true, targetStatus: rule.targetStatus };
}
