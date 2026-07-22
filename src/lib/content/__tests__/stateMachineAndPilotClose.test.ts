/**
 * Odi.Pet — State Machine & Pilot Workflow Close Vitest Test Suite
 */

import { describe, it, expect } from 'vitest';
import { validateStateTransition } from '../contentJobStateMachine';

describe('State Machine & Service Role Barrier Rules', () => {
  it('1. Generic status/import/approve eylemleri reddedilir', () => {
    const checkStatus = validateStateTransition('status', 'research_required', 'admin_human');
    expect(checkStatus.isValid).toBe(false);
    expect(checkStatus.error).toContain('Generic veya belirsiz');

    const checkImport = validateStateTransition('import', 'approved_for_import', 'admin_human');
    expect(checkImport.isValid).toBe(false);
  });

  it('2. AI ajanı insan rolleri için tanımlanmış durum geçişlerini çalıştıramaz', () => {
    // AI approve_for_import çalıştıramaz
    const checkAiApprove = validateStateTransition('approve_for_import', 'admin_review_required', 'ai_agent');
    expect(checkAiApprove.isValid).toBe(false);
    expect(checkAiApprove.error).toContain('yetkili değildir');

    // AI verify_source çalıştıramaz
    const checkAiVerify = validateStateTransition('verify_source', 'source_review_required', 'ai_agent');
    expect(checkAiVerify.isValid).toBe(false);

    // AI vet_review_required isteyemez
    const checkAiVet = validateStateTransition('request_vet_review', 'admin_review_required', 'ai_agent');
    expect(checkAiVet.isValid).toBe(false);
  });

  it('3. Tanımlı durum akışı dışında yasadışı durum sıçraması reddedilir', () => {
    // queued durumundayken direkt approved_for_import yapılamaz
    const checkJump = validateStateTransition('approve_for_import', 'queued', 'admin_human');
    expect(checkJump.isValid).toBe(false);
    expect(checkJump.error).toContain('çalıştırılamaz');
  });

  it('4. Admin ve Founder yetkili insan eylemlerini çalıştırabilir', () => {
    const checkAdminVerify = validateStateTransition('verify_source', 'source_review_required', 'admin_human');
    expect(checkAdminVerify.isValid).toBe(true);

    const checkFounderApprove = validateStateTransition('approve_for_import', 'admin_review_required', 'founder_human');
    expect(checkFounderApprove.isValid).toBe(true);
  });
});
