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
    const sentIds: string[] = []

    // 3. Fetch unsent notifications
    const { data: unsent, error: fetchErr } = await supabase
      .from("notifications")
      .select(`
        id,
        profile_id,
        title,
        message,
        type,
        pet_id,
        priority,
        profiles!notifications_profile_id_fkey ( email )
      `)
      .eq("sent_email", false)
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order("created_at", { ascending: false })

    if (fetchErr) throw new Error(`Fetch error: ${fetchErr.message}`)

    interface NotificationPayload {
      id: string;
      profile_id: string;
      title: string;
      message: string;
      type: string;
      pet_id: string | null;
      priority?: 'high' | 'normal' | 'low';
      profiles: { email: string } | { email: string }[] | null;
    }

    const byProfile = new Map<string, { email: string; notifs: NotificationPayload[] }>()
    for (const n of (unsent as unknown as NotificationPayload[]) ?? []) {
      const email = Array.isArray(n.profiles) ? n.profiles[0]?.email : n.profiles?.email
      if (!email) continue
      if (!byProfile.has(n.profile_id)) {
        byProfile.set(n.profile_id, { email, notifs: [] })
      }
      byProfile.get(n.profile_id)!.notifs.push(n)
    }

    const profileIds = Array.from(byProfile.keys())

    // Fetch Preferences & Push Subscriptions
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

    // Process Notifications
    for (const [profileId, { email, notifs }] of byProfile) {
      if (!notifs || notifs.length === 0) continue

      const userPref = prefMap.get(profileId)

      // Filter out notifications disabled by user preferences
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

      // Rate Limiting Check (Configurable: max 5 push per 10 mins, except high priority)
      const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000).toISOString()
      const { count: recentSentCount } = await supabase
        .from("notification_delivery_logs")
        .select("id", { count: 'exact', head: true })
        .eq("profile_id", profileId)
        .eq("event_type", "send_success")
        .gte("created_at", windowStart)

      const isRateLimited = (recentSentCount ?? 0) >= RATE_LIMIT_MAX_COUNT

      // Email Dispatch
      if (!isQuietHours) {
        const subject = filteredNotifs.length === 1
          ? `🐾 ${filteredNotifs[0].title}`
          : `🐾 ${filteredNotifs.length} yeni hatırlatma – Odi.Pet`
        const sent = await sendEmail(email, subject, buildEmailHtml(filteredNotifs))
        if (sent) {
          emailsSent++
          sentIds.push(...filteredNotifs.map(n => n.id))
        }
      }

      // Web Push Dispatch
      if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
        const userSubs = subsByProfile.get(profileId) ?? []

        for (const notif of filteredNotifs) {
          const isHighPriority = notif.priority === 'high' || notif.type.includes('emergency')
          
          // Quiet Hours Check (High priority bypasses quiet hours)
          if (isQuietHours && !isHighPriority) {
            continue
          }

          // Rate Limiting Check (High priority bypasses rate limiting)
          if (isRateLimited && !isHighPriority) {
            console.log(`[dispatch-notifications] Rate limit reached for profile ${profileId}. Skipping normal push.`)
            continue
          }

          // KVKK/GDPR Payload Privacy (Generic text on lock screen)
          const privacyBody = "Can dostunuz için 1 yeni sağlık güncellemeniz var 🐾"
          const deepLinkUrl = notif.pet_id ? `/owner/pets/${notif.pet_id}#pet-tasks` : '/owner/notifications'
          const entityType = notif.type.includes('vaccine') ? 'vaccine' : notif.type.includes('parasite') ? 'parasite' : 'general'
          const entityId = notif.pet_id ?? notif.id
          const notificationTag = `${entityType}:${entityId}:due`
          const channelId = getAndroidChannelId(notif.type, notif.priority ?? 'normal')

          const payload = JSON.stringify({
            version: 1,
            title: notif.title,
            body: privacyBody, // Privacy-protected lock screen text
            icon: 'https://odi.pet/brand/app-icons/odi-icon-256.png',
            badge: 'https://odi.pet/brand/app-icons/odi-icon-256.png',
            url: deepLinkUrl,
            tag: notificationTag, // Lock Screen Deduplication
            entity_type: entityType,
            entity_id: entityId,
            channel_id: channelId,
            priority: notif.priority ?? 'normal'
          })

          for (const sub of userSubs) {
            // Observability: Log attempt
            await supabase.from("notification_delivery_logs").insert({
              profile_id: profileId,
              notification_id: notif.id,
              device_id: sub.device_id,
              event_type: "send_attempted"
            })

            try {
              await webpush.sendNotification(
                { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
                payload,
                { urgency: isHighPriority ? 'high' : 'normal', TTL: 86400 }
              )
              pushesSent++

              // Observability: Log success
              await supabase.from("notification_delivery_logs").insert({
                profile_id: profileId,
                notification_id: notif.id,
                device_id: sub.device_id,
                event_type: "send_success"
              })
            } catch (err: unknown) {
              const pushErr = err as { statusCode?: number }
              if (pushErr.statusCode === 410 || pushErr.statusCode === 404) {
                // Delete stale 410 subscription
                await supabase.from("push_subscriptions").delete().eq("id", sub.id)
                await supabase.from("notification_delivery_logs").insert({
                  profile_id: profileId,
                  device_id: sub.device_id,
                  event_type: "subscription_removed",
                  error_code: "STALE_410_GONE"
                })
              } else {
                console.error(`[dispatch-notifications] Push error for ${profileId}:`, pushErr)
                await supabase.from("notification_delivery_logs").insert({
                  profile_id: profileId,
                  notification_id: notif.id,
                  device_id: sub.device_id,
                  event_type: "send_failed",
                  error_code: String(pushErr.statusCode ?? 'UNKNOWN')
                })
              }
            }
          }
        }
      }
    }

    if (sentIds.length > 0) {
      await supabase.from("notifications").update({ sent_email: true }).in("id", sentIds)
    }

    console.log(`[dispatch-notifications] Emails sent: ${emailsSent}, Web Pushes sent: ${pushesSent}`)

    return new Response(
      JSON.stringify({
        status: "success",
        request_id: requestId,
        in_app_notifications_created: bdayCount + scheduleCount,
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
