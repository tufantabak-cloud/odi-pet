import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import webpush from "https://esm.sh/web-push@3.6.7"
import { shouldFinalizePushJob } from "./delivery-state.ts"
import { isAuthorizedServiceRequest } from "./request-auth.ts"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? ""
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") ?? ""
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") ?? ""

const RATE_LIMIT_WINDOW_MINUTES = parseInt(Deno.env.get("NOTIFICATION_RATE_LIMIT_WINDOW_MINUTES") ?? "10", 10)
const RATE_LIMIT_MAX_COUNT = parseInt(Deno.env.get("NOTIFICATION_RATE_LIMIT_MAX_COUNT") ?? "5", 10)

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:destek@odi.pet',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  )
}

// ── Email Dispatcher via Resend ─────────────────────────────────
async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set – skipping email")
    return false
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "Odi.Pet <hatirlatma@odi.pet>",
      to,
      subject,
      html,
    }),
  })
  return res.ok
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildEmailHtml(notifications: Array<{ title: string; message: string; type: string }>) {
  const items = notifications
    .map(
      (n) => `
      <tr>
        <td style="padding:16px 24px;border-bottom:1px solid #f0f0f0;">
          <p style="margin:0;font-weight:700;font-size:15px;color:${n.type === 'vaccine_overdue' ? '#ef4444' : '#7c3aed'}">
            ${escapeHtml(n.title)}
          </p>
          <p style="margin:6px 0 0;font-size:13px;color:#6b7280;line-height:1.5">
            ${escapeHtml(n.message)}
          </p>
        </td>
      </tr>`
    )
    .join("")

  return `<!DOCTYPE html>
<html lang="tr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#7c3aed 0%,#a855f7 100%);padding:32px 24px;text-align:center;">
            <p style="margin:0;font-size:28px;">🐾</p>
            <h1 style="margin:8px 0 0;color:#fff;font-size:22px;font-weight:800;">Odi.Pet Hatırlatması</h1>
            <p style="margin:6px 0 0;color:rgba(255,255,255,.8);font-size:14px;">Evcil dostunuzun sağlık takvimi</p>
          </td>
        </tr>
        <table width="100%" cellpadding="0" cellspacing="0">
          ${items}
        </table>
        <tr>
          <td style="padding:24px;text-align:center;">
            <a href="https://odi.pet/owner/dashboard"
               style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 32px;border-radius:12px;">
              Takvimi Aç →
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding:0 24px 24px;text-align:center;border-top:1px solid #f0f0f0;">
            <p style="margin:16px 0 0;font-size:12px;color:#9ca3af;">
              Bu e-postayı Odi.Pet hatırlatma sistemi göndermiştir.<br>
              Bildirimleri kapatmak için <a href="https://odi.pet/owner/notifications" style="color:#7c3aed;">ayarlar</a> sayfasını ziyaret edin.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// Android Notification Channel Mapping
function getAndroidChannelId(type: string, priority: string): string {
  if (priority === 'high' || type.includes('emergency') || type.includes('lost')) return 'Emergency'
  if (type.includes('vaccine') || type.includes('parasite') || type.includes('treatment')) return 'Health'
  if (type.includes('food') || type.includes('water') || type.includes('task') || type.includes('care')) return 'Reminders'
  if (type.includes('social') || type.includes('message') || type.includes('adoption')) return 'Community'
  return 'System'
}

serve(async (req: Request) => {
  const requestId = req.headers.get("x-request-id")?.slice(0, 128) || crypto.randomUUID()

  if (!(await isAuthorizedServiceRequest(req, SERVICE_ROLE_KEY))) {
    return new Response(
      JSON.stringify({ status: "error", message: "Unauthorized" }),
      { status: 401, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } }
    )
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ status: "error", message: "Method not allowed" }),
      { status: 405, headers: { "Allow": "POST", "Cache-Control": "no-store", "Content-Type": "application/json" } }
    )
  }

  console.log(`[dispatch-notifications] Starting notification cycle request_id=${requestId}`)

  try {
    // 1. Generate in-app notifications
    let bdayCount = 0
    const { data: bCount, error: bdayErr } = await supabase.rpc("generate_birthday_notifications")
    if (bdayErr) console.error(`[dispatch-notifications] Birthday RPC error:`, bdayErr)
    else bdayCount = bCount ?? 0

    let scheduleCount = 0
    const { data: sCount, error: scheduleErr } = await supabase.rpc("generate_schedule_notifications")
    if (scheduleErr) console.error(`[dispatch-notifications] Schedule RPC error:`, scheduleErr)
    else scheduleCount = sCount ?? 0

    // 2. Quiet Hours Protection (22:00 - 08:00 Istanbul time)
    const istanbulTime = new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" })
    const istanbulHour = new Date(istanbulTime).getHours()
    const isQuietHours = istanbulHour >= 22 || istanbulHour < 8

    let emailsSent = 0
    let pushesSent = 0
    let pushJobsDeferred = 0
    let planJobsProcessed = 0
    let planPushesSent = 0

    // -----------------------------------------------------------------
    // 3. Plan Push Reminders (Canonical source: notification_jobs)
    // -----------------------------------------------------------------
    const { data: claimedJobs, error: claimErr } = await supabase.rpc("claim_notification_jobs", { p_limit: 50 })

    let jobsToProcess: Array<{
      job_id: string;
      plan_id: string;
      fire_at: string;
      user_id: string;
      pet_id: string | null;
      category: string;
      sub_type: string;
      scheduled_at: string;
      status: string;
    }> = []

    if (!claimErr && Array.isArray(claimedJobs)) {
      jobsToProcess = claimedJobs
    } else {
      // Fallback query if RPC unavailable in test environment
      const { data: fallbackJobs } = await supabase
        .from("notification_jobs")
        .select("id, plan_id, fire_at, plans!inner(user_id, pet_id, category, sub_type, scheduled_at, status)")
        .eq("sent", false)
        .lte("fire_at", new Date().toISOString())
        .eq("plans.status", "active")
        .limit(50)

      if (fallbackJobs) {
        jobsToProcess = fallbackJobs.map((j: any) => ({
          job_id: j.id,
          plan_id: j.plan_id,
          fire_at: j.fire_at,
          user_id: j.plans?.user_id,
          pet_id: j.plans?.pet_id,
          category: j.plans?.category,
          sub_type: j.plans?.sub_type,
          scheduled_at: j.plans?.scheduled_at,
          status: j.plans?.status
        }))
      }
    }

    if (jobsToProcess.length > 0) {
      const planUserIds = Array.from(new Set(jobsToProcess.map(j => j.user_id).filter(Boolean)))

      const { data: jobPushSubs } = await supabase
        .from("push_subscriptions")
        .select("*")
        .in("profile_id", planUserIds)
        .eq("is_active", true)

      const jobSubsMap = new Map<string, any[]>()
      for (const sub of jobPushSubs ?? []) {
        if (!jobSubsMap.has(sub.profile_id)) jobSubsMap.set(sub.profile_id, [])
        jobSubsMap.get(sub.profile_id)!.push(sub)
      }

      for (const job of jobsToProcess) {
        planJobsProcessed++

        // Skip completed/cancelled/invalid plans
        if (!job.status || job.status !== 'active') {
          await supabase.from("notification_jobs").update({ sent: true, locked_until: null }).eq("id", job.job_id)
          continue
        }

        // Quiet Hours Check: If quiet hours & normal priority -> DEFER (keep sent=false, unlock job)
        if (isQuietHours) {
          pushJobsDeferred++
          await supabase.from("notification_jobs").update({ locked_until: null }).eq("id", job.job_id)
          continue
        }

        const userSubs = jobSubsMap.get(job.user_id) ?? []
        let deliveredCount = 0
        let invalidCount = 0
        let retryableCount = 0

        if (userSubs.length > 0 && VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
          const categoryTr = job.category === 'asi' ? 'Aşı' : job.category === 'parazit' ? 'Parazit' : job.category === 'saglik' ? 'Sağlık' : 'Görev'
          const deepLink = job.pet_id ? `/owner/pets/${job.pet_id}#pet-tasks` : "/owner/notifications"
          const payload = JSON.stringify({
            version: 1,
            title: `${job.sub_type ?? categoryTr} Hatırlatması ⏰`,
            body: "Can dostunuz için 1 yeni sağlık güncellemeniz var 🐾",
            icon: 'https://odi.pet/brand/app-icons/odi-icon-256.png',
            badge: 'https://odi.pet/brand/app-icons/odi-icon-256.png',
            url: deepLink,
            tag: `plan_job:${job.job_id}`,
            entity_type: 'plan',
            entity_id: job.plan_id,
            channel_id: 'Reminders',
            priority: 'normal'
          })

          for (const sub of userSubs) {
            try {
              await webpush.sendNotification(
                { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
                payload,
                { urgency: 'normal', TTL: 86400 }
              )
              deliveredCount++
              pushesSent++
              planPushesSent++
              await supabase.from("push_subscriptions").update({ last_seen_at: new Date().toISOString() }).eq("id", sub.id)
            } catch (err: any) {
              if (err?.statusCode === 410 || err?.statusCode === 404) {
                invalidCount++
                await supabase.from("push_subscriptions").delete().eq("id", sub.id)
              } else {
                retryableCount++
                console.error(`[dispatch-notifications] Plan push error job=${job.job_id}:`, err)
              }
            }
          }
        }

        const outcome = {
          subscriptionCount: userSubs.length,
          deliveredCount,
          invalidSubscriptionCount: invalidCount,
          retryableFailureCount: retryableCount
        }

        const finalize = shouldFinalizePushJob(outcome)
        if (finalize) {
          await supabase.from("notification_jobs").update({ sent: true, locked_until: null }).eq("id", job.job_id)
        } else {
          // Unlock for retry on transient failure
          await supabase.from("notification_jobs").update({ locked_until: null }).eq("id", job.job_id)
        }
      }
    }

    // -----------------------------------------------------------------
    // 4. General In-App Notifications (Birthdays, System Alerts, etc.)
    // -----------------------------------------------------------------
    const { data: unsentGeneral } = await supabase
      .from("notifications")
      .select(`
        id,
        profile_id,
        title,
        message,
        type,
        pet_id,
        priority,
        sent_email,
        sent_push,
        profiles!notifications_profile_id_fkey ( email )
      `)
      .or("sent_email.eq.false,sent_push.eq.false")
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order("created_at", { ascending: false })

    interface NotificationPayload {
      id: string;
      profile_id: string;
      title: string;
      message: string;
      type: string;
      pet_id: string | null;
      priority?: 'high' | 'normal' | 'low';
      sent_email?: boolean;
      sent_push?: boolean;
      profiles: { email: string } | { email: string }[] | null;
    }

    const byProfile = new Map<string, { email: string; notifs: NotificationPayload[] }>()
    for (const n of (unsentGeneral as unknown as NotificationPayload[]) ?? []) {
      const email = Array.isArray(n.profiles) ? n.profiles[0]?.email : n.profiles?.email
      if (!email) continue
      if (!byProfile.has(n.profile_id)) {
        byProfile.set(n.profile_id, { email, notifs: [] })
      }
      byProfile.get(n.profile_id)!.notifs.push(n)
    }

    const profileIds = Array.from(byProfile.keys())

    const { data: prefs } = await supabase
      .from("notification_preferences")
      .select("*")
      .in("profile_id", profileIds)

    const prefMap = new Map<string, any>()
    for (const p of prefs ?? []) {
      prefMap.set(p.profile_id, p)
    }

    const { data: pushSubs } = await supabase
      .from("push_subscriptions")
      .select("*")
      .in("profile_id", profileIds)
      .eq("is_active", true)

    const subsByProfile = new Map<string, any[]>()
    for (const sub of pushSubs ?? []) {
      if (!subsByProfile.has(sub.profile_id)) subsByProfile.set(sub.profile_id, [])
      subsByProfile.get(sub.profile_id)!.push(sub)
    }

    const emailSentIds: string[] = []
    const pushSentIds: string[] = []

    for (const [profileId, { email, notifs }] of byProfile) {
      if (!notifs || notifs.length === 0) continue
      const userPref = prefMap.get(profileId)

      const filteredNotifs = notifs.filter(n => {
        if (!userPref) return true
        if (n.type.includes('vaccine') && userPref.vaccines === false) return false
        if (n.type.includes('parasite') && userPref.parasite === false) return false
        if (n.type.includes('nutrition') && userPref.nutrition === false) return false
        if (n.type.includes('care') && userPref.care === false) return false
        if (n.type.includes('promo') && userPref.promotions === false) return false
        return true
      })

      if (filteredNotifs.length === 0) continue

      // General Email Dispatch
      const pendingEmails = filteredNotifs.filter(n => n.sent_email === false)
      if (pendingEmails.length > 0 && !isQuietHours) {
        const subject = pendingEmails.length === 1
          ? `🐾 ${pendingEmails[0].title}`
          : `🐾 ${pendingEmails.length} yeni bildirim – Odi.Pet`
        const sent = await sendEmail(email, subject, buildEmailHtml(pendingEmails))
        if (sent) {
          emailsSent++
          emailSentIds.push(...pendingEmails.map(n => n.id))
        }
      }

      // General Web Push Dispatch
      const pendingPushes = filteredNotifs.filter(n => n.sent_push === false)
      if (pendingPushes.length > 0 && VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
        const userSubs = subsByProfile.get(profileId) ?? []

        for (const notif of pendingPushes) {
          const isHighPriority = notif.priority === 'high' || notif.type.includes('emergency')
          if (isQuietHours && !isHighPriority) continue

          const privacyBody = "Can dostunuz için 1 yeni güncellemeniz var 🐾"
          const deepLinkUrl = notif.pet_id ? `/owner/pets/${notif.pet_id}#pet-tasks` : '/owner/notifications'
          const entityType = notif.type.includes('vaccine') ? 'vaccine' : notif.type.includes('parasite') ? 'parasite' : 'general'
          const entityId = notif.pet_id ?? notif.id
          const notificationTag = `general:${entityType}:${entityId}`
          const channelId = getAndroidChannelId(notif.type, notif.priority ?? 'normal')

          const payload = JSON.stringify({
            version: 1,
            title: notif.title,
            body: privacyBody,
            icon: 'https://odi.pet/brand/app-icons/odi-icon-256.png',
            badge: 'https://odi.pet/brand/app-icons/odi-icon-256.png',
            url: deepLinkUrl,
            tag: notificationTag,
            entity_type: entityType,
            entity_id: entityId,
            channel_id: channelId,
            priority: notif.priority ?? 'normal'
          })

          let anyPushed = false
          for (const sub of userSubs) {
            try {
              await webpush.sendNotification(
                { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
                payload,
                { urgency: isHighPriority ? 'high' : 'normal', TTL: 86400 }
              )
              pushesSent++
              anyPushed = true
              await supabase.from("push_subscriptions").update({ last_seen_at: new Date().toISOString() }).eq("id", sub.id)
            } catch (err: any) {
              if (err?.statusCode === 410 || err?.statusCode === 404) {
                await supabase.from("push_subscriptions").delete().eq("id", sub.id)
              }
            }
          }

          if (anyPushed || userSubs.length === 0) {
            pushSentIds.push(notif.id)
          }
        }
      }
    }

    if (emailSentIds.length > 0) {
      await supabase.from("notifications").update({ sent_email: true }).in("id", emailSentIds)
    }
    if (pushSentIds.length > 0) {
      await supabase.from("notifications").update({ sent_push: true }).in("id", pushSentIds)
    }

    console.log(`[dispatch-notifications] Plan jobs processed: ${planJobsProcessed}, Plan pushes: ${planPushesSent}, General emails: ${emailsSent}, General pushes: ${pushesSent}`)

    return new Response(
      JSON.stringify({
        status: "success",
        request_id: requestId,
        in_app_notifications_created: bdayCount + scheduleCount,
        plan_jobs_processed: planJobsProcessed,
        plan_pushes_sent: planPushesSent,
        emails_sent: emailsSent,
        pushes_sent: pushesSent,
      }),
      { headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } }
    )
  } catch (err) {
    console.error(`[dispatch-notifications] Error request_id=${requestId}:`, err)
    return new Response(
      JSON.stringify({ status: "error", message: "Internal error", request_id: requestId }),
      { status: 500, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } }
    )
  }
})
