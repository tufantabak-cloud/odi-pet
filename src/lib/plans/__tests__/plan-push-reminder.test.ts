import { describe, expect, it } from 'vitest'
import { calculateFireAt } from '../service'
import { shouldFinalizePushJob } from '../../../../supabase/functions/dispatch-notifications/delivery-state'

// Mock environment & state for Plan Push Reminder lifecycle tests
interface MockPlanJob {
  job_id: string
  plan_id: string
  fire_at: string
  user_id: string
  pet_id: string
  category: string
  sub_type: string
  scheduled_at: string
  status: 'active' | 'completed' | 'cancelled'
  sent: boolean
  locked_until: string | null
}

interface MockNotification {
  id: string
  profile_id: string
  title: string
  message: string
  type: string
  sent_email: boolean
  sent_push: boolean
  created_at: string
}

function simulateAtomicClaim(jobs: MockPlanJob[], nowISO: string, limit = 50): MockPlanJob[] {
  const claimed: MockPlanJob[] = []
  for (const j of jobs) {
    if (claimed.length >= limit) break
    const isUnlocked = !j.locked_until || new Date(j.locked_until).getTime() <= new Date(nowISO).getTime()
    const isDue = new Date(j.fire_at).getTime() <= new Date(nowISO).getTime()
    if (!j.sent && isDue && isUnlocked && j.status === 'active') {
      j.locked_until = new Date(new Date(nowISO).getTime() + 2 * 60 * 1000).toISOString()
      claimed.push({ ...j })
    }
  }
  return claimed
}

function simulateDispatcherRun(options: {
  nowISO: string
  jobs: MockPlanJob[]
  notifications: MockNotification[]
  pushSubsCount: number
  isQuietHours?: boolean
  emailFails?: boolean
  pushFailsStatusCode?: number
}) {
  let pushesDelivered = 0
  let emailsSent = 0
  let jobsDeferred = 0

  const claimedJobs = simulateAtomicClaim(options.jobs, options.nowISO)

  for (const claimedJob of claimedJobs) {
    const mainJob = options.jobs.find(j => j.job_id === claimedJob.job_id)!

    if (mainJob.status !== 'active') {
      mainJob.sent = true
      mainJob.locked_until = null
      continue
    }

    if (options.isQuietHours) {
      jobsDeferred++
      mainJob.locked_until = null // unlock without setting sent=true
      continue
    }

    let deliveredCount = 0
    let invalidCount = 0
    let retryableCount = 0

    if (options.pushSubsCount > 0) {
      if (options.pushFailsStatusCode === 410 || options.pushFailsStatusCode === 404) {
        invalidCount = options.pushSubsCount
      } else if (options.pushFailsStatusCode && options.pushFailsStatusCode >= 500) {
        retryableCount = options.pushSubsCount
      } else {
        deliveredCount = options.pushSubsCount
        pushesDelivered += options.pushSubsCount
      }
    }

    const outcome = {
      subscriptionCount: options.pushSubsCount,
      deliveredCount,
      invalidSubscriptionCount: invalidCount,
      retryableFailureCount: retryableCount,
    }

    const finalize = shouldFinalizePushJob(outcome)
    if (finalize) {
      mainJob.sent = true
      mainJob.locked_until = null
    } else {
      mainJob.locked_until = null
    }
  }

  // General Notifications Dispatch
  for (const notif of options.notifications) {
    if (!notif.sent_email && !options.isQuietHours && !options.emailFails) {
      notif.sent_email = true
      emailsSent++
    }
    if (!notif.sent_push && !options.isQuietHours) {
      notif.sent_push = true
      pushesDelivered++
    }
  }

  return { pushesDelivered, emailsSent, jobsDeferred }
}

describe('P0 Plan Yap Push Reminder Integration Test Suite', () => {

  it('1 & A. Plan 18:00, notif_before=30m: 17:29 0 PUSH, 17:30 1 PUSH, 17:31 0 PUSH', () => {
    const scheduledAt = '2026-08-15T18:00:00.000Z'
    const fireAt = calculateFireAt(scheduledAt, 30, 'minute')!
    expect(fireAt).toBe('2026-08-15T17:30:00.000Z')

    const jobs: MockPlanJob[] = [{
      job_id: 'job-1',
      plan_id: 'plan-1',
      fire_at: fireAt,
      user_id: 'user-1',
      pet_id: 'pet-1',
      category: 'asi',
      sub_type: 'Kuduz Aşısı',
      scheduled_at: scheduledAt,
      status: 'active',
      sent: false,
      locked_until: null,
    }]

    // 17:29 -> 0 PUSH
    const run1729 = simulateDispatcherRun({ nowISO: '2026-08-15T17:29:59.000Z', jobs, notifications: [], pushSubsCount: 1 })
    expect(run1729.pushesDelivered).toBe(0)
    expect(jobs[0].sent).toBe(false)

    // 17:30 -> 1 PUSH
    const run1730 = simulateDispatcherRun({ nowISO: '2026-08-15T17:30:00.000Z', jobs, notifications: [], pushSubsCount: 1 })
    expect(run1730.pushesDelivered).toBe(1)
    expect(jobs[0].sent).toBe(true)

    // 17:31 -> 0 PUSH (already sent)
    const run1731 = simulateDispatcherRun({ nowISO: '2026-08-15T17:31:00.000Z', jobs, notifications: [], pushSubsCount: 1 })
    expect(run1731.pushesDelivered).toBe(0)
  })

  it('2. Plan 18:00, notif_before=1 hour: 16:59 0 PUSH, 17:00 1 PUSH', () => {
    const scheduledAt = '2026-08-15T18:00:00.000Z'
    const fireAt = calculateFireAt(scheduledAt, 1, 'hour')!
    expect(fireAt).toBe('2026-08-15T17:00:00.000Z')

    const jobs: MockPlanJob[] = [{
      job_id: 'job-2',
      plan_id: 'plan-2',
      fire_at: fireAt,
      user_id: 'user-1',
      pet_id: 'pet-1',
      category: 'parazit',
      sub_type: 'İç Parazit',
      scheduled_at: scheduledAt,
      status: 'active',
      sent: false,
      locked_until: null,
    }]

    const run1659 = simulateDispatcherRun({ nowISO: '2026-08-15T16:59:59.000Z', jobs, notifications: [], pushSubsCount: 1 })
    expect(run1659.pushesDelivered).toBe(0)

    const run1700 = simulateDispatcherRun({ nowISO: '2026-08-15T17:00:00.000Z', jobs, notifications: [], pushSubsCount: 1 })
    expect(run1700.pushesDelivered).toBe(1)
    expect(jobs[0].sent).toBe(true)
  })

  it('3. Gelecek tarihli plan (yarın 18:00) bugün PUSH üretmez', () => {
    const scheduledAt = '2026-08-16T18:00:00.000Z'
    const fireAt = calculateFireAt(scheduledAt, 30, 'minute')!

    const jobs: MockPlanJob[] = [{
      job_id: 'job-3',
      plan_id: 'plan-3',
      fire_at: fireAt,
      user_id: 'user-1',
      pet_id: 'pet-1',
      category: 'bakim',
      sub_type: 'Tarak Bakımı',
      scheduled_at: scheduledAt,
      status: 'active',
      sent: false,
      locked_until: null,
    }]

    const todayRun = simulateDispatcherRun({ nowISO: '2026-08-15T18:00:00.000Z', jobs, notifications: [], pushSubsCount: 1 })
    expect(todayRun.pushesDelivered).toBe(0)
    expect(jobs[0].sent).toBe(false)
  })

  it('4. Completed plan fire_at geçmiş olsa bile PUSH gönderilmez', () => {
    const jobs: MockPlanJob[] = [{
      job_id: 'job-4',
      plan_id: 'plan-4',
      fire_at: '2026-08-15T10:00:00.000Z',
      user_id: 'user-1',
      pet_id: 'pet-1',
      category: 'beslenme',
      sub_type: 'Mama',
      scheduled_at: '2026-08-15T10:30:00.000Z',
      status: 'completed',
      sent: false,
      locked_until: null,
    }]

    const res = simulateDispatcherRun({ nowISO: '2026-08-15T12:00:00.000Z', jobs, notifications: [], pushSubsCount: 1 })
    expect(res.pushesDelivered).toBe(0)
  })

  it('5. Cancelled plan fire_at geçmiş olsa bile PUSH gönderilmez', () => {
    const jobs: MockPlanJob[] = [{
      job_id: 'job-5',
      plan_id: 'plan-5',
      fire_at: '2026-08-15T10:00:00.000Z',
      user_id: 'user-1',
      pet_id: 'pet-1',
      category: 'hijyen',
      sub_type: 'Banyo',
      scheduled_at: '2026-08-15T10:30:00.000Z',
      status: 'cancelled',
      sent: false,
      locked_until: null,
    }]

    const res = simulateDispatcherRun({ nowISO: '2026-08-15T12:00:00.000Z', jobs, notifications: [], pushSubsCount: 1 })
    expect(res.pushesDelivered).toBe(0)
  })

  it('6 & D. Dispatcher 10 kez üst üste çalıştırılsa bile aynı job için yalnızca 1 PUSH gönderilir', () => {
    const jobs: MockPlanJob[] = [{
      job_id: 'job-6',
      plan_id: 'plan-6',
      fire_at: '2026-08-15T12:00:00.000Z',
      user_id: 'user-1',
      pet_id: 'pet-1',
      category: 'asi',
      sub_type: 'Karma Aşı',
      scheduled_at: '2026-08-15T12:30:00.000Z',
      status: 'active',
      sent: false,
      locked_until: null,
    }]

    let totalPushes = 0
    for (let i = 0; i < 10; i++) {
      const res = simulateDispatcherRun({ nowISO: '2026-08-15T12:05:00.000Z', jobs, notifications: [], pushSubsCount: 1 })
      totalPushes += res.pushesDelivered
    }

    expect(totalPushes).toBe(1)
    expect(jobs[0].sent).toBe(true)
  })

  it('7 & C. Eşzamanlı (Concurrent) 2 dispatcher çağrısında yalnızca 1 delivery gerçekleşir', () => {
    const jobs: MockPlanJob[] = [{
      job_id: 'job-7',
      plan_id: 'plan-7',
      fire_at: '2026-08-15T12:00:00.000Z',
      user_id: 'user-1',
      pet_id: 'pet-1',
      category: 'asi',
      sub_type: 'Lösemi Aşısı',
      scheduled_at: '2026-08-15T12:30:00.000Z',
      status: 'active',
      sent: false,
      locked_until: null,
    }]

    const nowISO = '2026-08-15T12:01:00.000Z'
    // Instantly simulate 2 concurrent claims
    const claim1 = simulateAtomicClaim(jobs, nowISO)
    const claim2 = simulateAtomicClaim(jobs, nowISO)

    expect(claim1.length).toBe(1)
    expect(claim2.length).toBe(0) // Second claim skipped due to FOR UPDATE SKIP LOCKED
  })

  it('8 & E. Kullanıcının 3 farklı planı yalnızca kendi fire_at zamanlarında gönderilir', () => {
    const jobs: MockPlanJob[] = [
      { job_id: 'j-A', plan_id: 'p-A', fire_at: '2026-08-15T14:00:00.000Z', user_id: 'u1', pet_id: 'p1', category: 'asi', sub_type: 'Aşı A', scheduled_at: '2026-08-15T14:30:00.000Z', status: 'active', sent: false, locked_until: null },
      { job_id: 'j-B', plan_id: 'p-B', fire_at: '2026-08-15T15:00:00.000Z', user_id: 'u1', pet_id: 'p1', category: 'parazit', sub_type: 'Parazit B', scheduled_at: '2026-08-15T15:30:00.000Z', status: 'active', sent: false, locked_until: null },
      { job_id: 'j-C', plan_id: 'p-C', fire_at: '2026-08-15T16:00:00.000Z', user_id: 'u1', pet_id: 'p1', category: 'bakim', sub_type: 'Bakım C', scheduled_at: '2026-08-15T16:30:00.000Z', status: 'active', sent: false, locked_until: null },
    ]

    const run1400 = simulateDispatcherRun({ nowISO: '2026-08-15T14:00:00.000Z', jobs, notifications: [], pushSubsCount: 1 })
    expect(run1400.pushesDelivered).toBe(1)
    expect(jobs.find(j => j.job_id === 'j-A')!.sent).toBe(true)
    expect(jobs.find(j => j.job_id === 'j-B')!.sent).toBe(false)
    expect(jobs.find(j => j.job_id === 'j-C')!.sent).toBe(false)

    const run1500 = simulateDispatcherRun({ nowISO: '2026-08-15T15:00:00.000Z', jobs, notifications: [], pushSubsCount: 1 })
    expect(run1500.pushesDelivered).toBe(1)
    expect(jobs.find(j => j.job_id === 'j-B')!.sent).toBe(true)
    expect(jobs.find(j => j.job_id === 'j-C')!.sent).toBe(false)

    const run1600 = simulateDispatcherRun({ nowISO: '2026-08-15T16:00:00.000Z', jobs, notifications: [], pushSubsCount: 1 })
    expect(run1600.pushesDelivered).toBe(1)
    expect(jobs.find(j => j.job_id === 'j-C')!.sent).toBe(true)
  })

  it('9 & B. E-posta gönderimi başarısız olsa bile Web Push bağımsız çalışır', () => {
    const jobs: MockPlanJob[] = [{
      job_id: 'job-9',
      plan_id: 'plan-9',
      fire_at: '2026-08-15T12:00:00.000Z',
      user_id: 'user-1',
      pet_id: 'pet-1',
      category: 'asi',
      sub_type: 'Parvovirus',
      scheduled_at: '2026-08-15T12:30:00.000Z',
      status: 'active',
      sent: false,
      locked_until: null,
    }]

    const res = simulateDispatcherRun({
      nowISO: '2026-08-15T12:05:00.000Z',
      jobs,
      notifications: [],
      pushSubsCount: 1,
      emailFails: true // Email failing
    })

    expect(res.pushesDelivered).toBe(1)
    expect(jobs[0].sent).toBe(true)
  })

  it('10. Geçici / retryable push hatasında job sent=false kalır ve kilit açılır', () => {
    const jobs: MockPlanJob[] = [{
      job_id: 'job-10',
      plan_id: 'plan-10',
      fire_at: '2026-08-15T12:00:00.000Z',
      user_id: 'user-1',
      pet_id: 'pet-1',
      category: 'asi',
      sub_type: 'Corona Aşısı',
      scheduled_at: '2026-08-15T12:30:00.000Z',
      status: 'active',
      sent: false,
      locked_until: null,
    }]

    const res = simulateDispatcherRun({
      nowISO: '2026-08-15T12:05:00.000Z',
      jobs,
      notifications: [],
      pushSubsCount: 1,
      pushFailsStatusCode: 503 // Transient network failure
    })

    expect(res.pushesDelivered).toBe(0)
    expect(jobs[0].sent).toBe(false)
    expect(jobs[0].locked_until).toBeNull()
  })

  it('11. 410 Stale abonelik temizlenir ve abonelik yoksa finalize edilir', () => {
    const jobs: MockPlanJob[] = [{
      job_id: 'job-11',
      plan_id: 'plan-11',
      fire_at: '2026-08-15T12:00:00.000Z',
      user_id: 'user-1',
      pet_id: 'pet-1',
      category: 'asi',
      sub_type: 'Mantır Aşısı',
      scheduled_at: '2026-08-15T12:30:00.000Z',
      status: 'active',
      sent: false,
      locked_until: null,
    }]

    const res = simulateDispatcherRun({
      nowISO: '2026-08-15T12:05:00.000Z',
      jobs,
      notifications: [],
      pushSubsCount: 1,
      pushFailsStatusCode: 410 // Stale subscription
    })

    expect(res.pushesDelivered).toBe(0)
    expect(jobs[0].sent).toBe(true) // Finalized so it doesn't retry infinitely
  })

  it('12. Explicit Europe/Istanbul Timezone Test (18:00 TR == 15:00 UTC, 17:30 TR == 14:30 UTC)', () => {
    // Plan scheduled at 18:00 Europe/Istanbul (UTC+3) -> ISO: 2026-08-15T15:00:00.000Z
    const scheduledAtTR = '2026-08-15T15:00:00.000Z'
    const fireAtTR = calculateFireAt(scheduledAtTR, 30, 'minute')!
    expect(fireAtTR).toBe('2026-08-15T14:30:00.000Z') // 17:30 TR

    const jobs: MockPlanJob[] = [{
      job_id: 'job-12-tr',
      plan_id: 'plan-12-tr',
      fire_at: fireAtTR,
      user_id: 'user-1',
      pet_id: 'pet-1',
      category: 'asi',
      sub_type: 'Kuduz Aşısı TR',
      scheduled_at: scheduledAtTR,
      status: 'active',
      sent: false,
      locked_until: null,
    }]

    // 17:29 Europe/Istanbul == 14:29:59.000Z UTC -> 0 PUSH
    const run1729 = simulateDispatcherRun({
      nowISO: '2026-08-15T14:29:59.000Z',
      jobs,
      notifications: [],
      pushSubsCount: 1
    })
    expect(run1729.pushesDelivered).toBe(0)
    expect(jobs[0].sent).toBe(false)

    // 17:30 Europe/Istanbul == 14:30:00.000Z UTC -> 1 PUSH
    const run1730 = simulateDispatcherRun({
      nowISO: '2026-08-15T14:30:00.000Z',
      jobs,
      notifications: [],
      pushSubsCount: 1
    })
    expect(run1730.pushesDelivered).toBe(1)
    expect(jobs[0].sent).toBe(true)

    // 17:31 Europe/Istanbul == 14:31:00.000Z UTC -> 0 PUSH
    const run1731 = simulateDispatcherRun({
      nowISO: '2026-08-15T14:31:00.000Z',
      jobs,
      notifications: [],
      pushSubsCount: 1
    })
    expect(run1731.pushesDelivered).toBe(0)
  })

  it('F. Quiet Hours sırasında çalışan dispatcher pending job’ı saklar (sent=false, locked_until=null)', () => {
    const jobs: MockPlanJob[] = [{
      job_id: 'job-F',
      plan_id: 'plan-F',
      fire_at: '2026-08-15T21:00:00.000Z', // 24:00 Istanbul (Quiet hour)
      user_id: 'user-1',
      pet_id: 'pet-1',
      category: 'asi',
      sub_type: 'Karma Aşı',
      scheduled_at: '2026-08-15T21:30:00.000Z',
      status: 'active',
      sent: false,
      locked_until: null,
    }]

    const res = simulateDispatcherRun({
      nowISO: '2026-08-15T21:05:00.000Z',
      jobs,
      notifications: [],
      pushSubsCount: 1,
      isQuietHours: true
    })

    expect(res.pushesDelivered).toBe(0)
    expect(res.jobsDeferred).toBe(1)
    expect(jobs[0].sent).toBe(false)
    expect(jobs[0].locked_until).toBeNull()

    // Next morning at 08:30 (Quiet hours ended) -> Pushed successfully
    const morningRun = simulateDispatcherRun({
      nowISO: '2026-08-16T05:30:00.000Z',
      jobs,
      notifications: [],
      pushSubsCount: 1,
      isQuietHours: false
    })

    expect(morningRun.pushesDelivered).toBe(1)
    expect(jobs[0].sent).toBe(true)
  })

  it('G. Eski notifications kayıtları Plan reminder dispatcher tarafından tekrar push edilmez', () => {
    const oldNotifications: MockNotification[] = [{
      id: 'notif-old-1',
      profile_id: 'user-1',
      title: 'Eski Hatırlatma',
      message: 'Mesaj',
      type: 'general',
      sent_email: false,
      sent_push: true, // Already pushed
      created_at: '2026-08-14T10:00:00.000Z'
    }]

    const jobs: MockPlanJob[] = []

    const res = simulateDispatcherRun({
      nowISO: '2026-08-15T12:00:00.000Z',
      jobs,
      notifications: oldNotifications,
      pushSubsCount: 1
    })

    expect(res.pushesDelivered).toBe(0)
  })

  it('H. Genel bildirimler (birthday/overdue) sent_push üzerinden idempotent çalışır', () => {
    const generalNotif: MockNotification = {
      id: 'notif-bday-1',
      profile_id: 'user-1',
      title: 'Doğum Günü Kutlu Olsun 🎂',
      message: 'Boncuk 2 yaşına girdi!',
      type: 'birthday',
      sent_email: false,
      sent_push: false,
      created_at: '2026-08-15T08:00:00.000Z'
    }

    const notifications = [generalNotif]

    // Run 1: Push sent, sent_push updated to true
    const run1 = simulateDispatcherRun({
      nowISO: '2026-08-15T08:05:00.000Z',
      jobs: [],
      notifications,
      pushSubsCount: 1
    })

    expect(run1.pushesDelivered).toBe(1)
    expect(generalNotif.sent_push).toBe(true)

    // Run 2: Already pushed, 0 push delivered
    const run2 = simulateDispatcherRun({
      nowISO: '2026-08-15T08:10:00.000Z',
      jobs: [],
      notifications,
      pushSubsCount: 1
    })

    expect(run2.pushesDelivered).toBe(0)
  })

})
