import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import webpush from "https://esm.sh/web-push@3.6.7"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? ""
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") ?? ""
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") ?? ""

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:odiplatform@gmail.com',
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

// ── HTML E-mail Template ────────────────────────────────────────
function buildEmailHtml(notifications: Array<{ title: string; message: string; type: string }>) {
  const items = notifications
    .map(
      (n) => `
      <tr>
        <td style="padding:16px 24px;border-bottom:1px solid #f0f0f0;">
          <p style="margin:0;font-weight:700;font-size:15px;color:${n.type === 'vaccine_overdue' ? '#ef4444' : '#7c3aed'}">
            ${n.title}
          </p>
          <p style="margin:6px 0 0;font-size:13px;color:#6b7280;line-height:1.5">
            ${n.message}
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
        
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#7c3aed 0%,#a855f7 100%);padding:32px 24px;text-align:center;">
            <p style="margin:0;font-size:28px;">🐾</p>
            <h1 style="margin:8px 0 0;color:#fff;font-size:22px;font-weight:800;">Odi.Pet Hatırlatması</h1>
            <p style="margin:6px 0 0;color:rgba(255,255,255,.8);font-size:14px;">Evcil dostunuzun sağlık takvimi</p>
          </td>
        </tr>

        <!-- Notification Items -->
        <table width="100%" cellpadding="0" cellspacing="0">
          ${items}
        </table>

        <!-- CTA -->
        <tr>
          <td style="padding:24px;text-align:center;">
            <a href="https://odi.pet/owner/dashboard"
               style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 32px;border-radius:12px;">
              Takvimi Aç →
            </a>
          </td>
        </tr>

        <!-- Footer -->
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

// ── Main Handler ────────────────────────────────────────────────
serve(async (_req: Request) => {
  console.log("[dispatch-notifications] Starting notification cycle…")

  try {
    // 1. Generate in-app notifications via DB function (Deprecated: generate_vaccine_notifications removed)
    // The new schedule_notifications and birthday_notifications cover these now.

    // 1b. Generate birthday notifications via DB function
    let bdayCount = 0
    const { data: bCount, error: bdayErr } = await supabase.rpc("generate_birthday_notifications")
    if (bdayErr) {
      console.error(`[dispatch-notifications] Birthday RPC error:`, bdayErr)
    } else {
      bdayCount = bCount ?? 0
      console.log(`[dispatch-notifications] Generated ${bdayCount} in-app birthday notifications`)
    }

    // 1c. Generate general schedule notifications via DB function
    let scheduleCount = 0
    const { data: sCount, error: scheduleErr } = await supabase.rpc("generate_schedule_notifications")
    if (scheduleErr) {
      console.error(`[dispatch-notifications] Schedule RPC error:`, scheduleErr)
    } else {
      scheduleCount = sCount ?? 0
      console.log(`[dispatch-notifications] Generated ${scheduleCount} in-app schedule notifications`)
    }

    // 1d. Quiet Hours Protection (22:00 - 08:00 Istanbul time)
    // Avoid sending general emails or push notifications during these hours to protect user's peace.
    const istanbulTime = new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" })
    const istanbulHour = new Date(istanbulTime).getHours()
    const isQuietHours = istanbulHour >= 22 || istanbulHour < 8
    
    let emailsSent = 0
    let pushesSent = 0
    const sentIds: string[] = []

    if (isQuietHours) {
      console.log(`[dispatch-notifications] Quiet hours active (Istanbul hour: ${istanbulHour}). Skipping general email/push dispatch.`)
    } else {

    // 2. Fetch unsent email notifications (created in last 24h, email not sent)
    const { data: unsent, error: fetchErr } = await supabase
      .from("notifications")
      .select(`
        id,
        profile_id,
        title,
        message,
        type,
        pet_id,
        profiles!notifications_profile_id_fkey (
          email
        )
      `)
      .eq("sent_email", false)
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order("created_at", { ascending: false })

    if (fetchErr) throw new Error(`Fetch error: ${fetchErr.message}`)

    // 3. Group by profile
    interface NotificationPayload {
      id: string;
      profile_id: string;
      title: string;
      message: string;
      type: string;
      pet_id: string | null;
      profiles: { email: string } | { email: string }[] | null;
    }
    
    const byProfile = new Map<string, { email: string; notifs: NotificationPayload[] }>()
    const typedUnsent = (unsent as unknown as NotificationPayload[]) ?? []
    
    for (const n of typedUnsent) {
      const email = Array.isArray(n.profiles) ? n.profiles[0]?.email : n.profiles?.email
      if (!email) continue
      if (!byProfile.has(n.profile_id)) {
        byProfile.set(n.profile_id, { email, notifs: [] })
      }
      byProfile.get(n.profile_id)!.notifs!.push(n)
    }

    // Fetch all push subscriptions for these profiles
    const profileIds = Array.from(byProfile.keys())
    const { data: pushSubs } = await supabase
      .from("push_subscriptions")
      .select("*")
      .in("profile_id", profileIds)

    interface PushSubscriptionRow {
      id: string;
      profile_id: string;
      endpoint: string;
      p256dh: string;
      auth_key: string;
    }
    const subsByProfile = new Map<string, PushSubscriptionRow[]>()
    for (const sub of (pushSubs as PushSubscriptionRow[]) ?? []) {
      if (!subsByProfile.has(sub.profile_id)) {
        subsByProfile.set(sub.profile_id, [])
      }
      subsByProfile.get(sub.profile_id)!.push(sub)
    }

    // emailsSent, pushesSent, sentIds are declared above to bypass quiet hours block scope

    // 4. Send notifications
    for (const [profileId, { email, notifs }] of byProfile) {
      if (!notifs || notifs.length === 0) continue

      const subject =
        notifs.length === 1
          ? `🐾 ${notifs[0].title}`
          : `🐾 ${notifs.length} yeni hatırlatma – Odi.Pet`

      // 4a. Send Email
      const sent = await sendEmail(email, subject, buildEmailHtml(notifs))
      if (sent) {
        emailsSent++
        sentIds.push(...notifs.map((n) => n.id))
      }

      // 4b. Send Web Push
      if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
        const userSubs = subsByProfile.get(profileId) ?? []
        for (const notif of notifs) {
          const deepLinkUrl = notif.pet_id 
            ? `/owner/pets/${notif.pet_id}#pet-tasks`
            : '/owner/notifications'

          const payload = JSON.stringify({
            title: notif.title,
            body: notif.message,
            icon: 'https://odi.pet/icon-192.png',
            badge: 'https://odi.pet/icon-192.png',
            url: `https://odi.pet${deepLinkUrl}`,
            tag: notif.id // unique tag to prevent duplicate alerts or group them
          })

          for (const sub of userSubs) {
            try {
              await webpush.sendNotification(
                {
                  endpoint: sub.endpoint,
                  keys: {
                    p256dh: sub.p256dh,
                    auth: sub.auth_key
                  }
                },
                payload,
                {
                  urgency: 'high',
                  TTL: 86400
                }
              )
              pushesSent++
            } catch (err: unknown) {
              // If subscription is invalid/expired, delete it
              const pushErr = err as { statusCode?: number }
              if (pushErr.statusCode === 410 || pushErr.statusCode === 404) {
                await supabase.from("push_subscriptions").delete().eq("id", sub.id)
              } else {
                console.error(`[dispatch-notifications] Web push error for ${profileId}:`, pushErr)
              }
            }
          }
        }
      }
    }
    }

    // 3b. Send push for notification_jobs
    const { data: pendingJobs } = await supabase
      .from("notification_jobs")
      .select("id, fire_at, plan_id, plans(user_id, pet_id, category, sub_type, repeat_rule, ends_at, status, notif_before, notif_unit, scheduled_at)")
      .eq("sent", false)
      .lte("fire_at", new Date().toISOString())

    if (pendingJobs && pendingJobs.length > 0) {
      const jobProfileIds = pendingJobs
        .map((j: any) => j.plans?.user_id)
        .filter(Boolean)

      const { data: jobPushSubs } = await supabase
        .from("push_subscriptions")
        .select("*")
        .in("profile_id", jobProfileIds)

      const jobSubsByProfile = new Map<string, any[]>()
      for (const sub of jobPushSubs ?? []) {
        if (!jobSubsByProfile.has(sub.profile_id)) jobSubsByProfile.set(sub.profile_id, [])
        jobSubsByProfile.get(sub.profile_id)!.push(sub)
      }

      const sentJobIds: string[] = []

      for (const job of pendingJobs as any[]) {
        const plan = job.plans
        if (!plan) continue
        const profileId = plan.user_id
        const userSubs = jobSubsByProfile.get(profileId) ?? []
        const deepLink = plan.pet_id ? `/owner/pets/${plan.pet_id}#pet-tasks` : "/owner/notifications"
        const title = `${plan.sub_type ?? plan.category} Hatırlatması ⏰`
        const body = `Planladığınız görevin zamanı geldi.`

        const payload = JSON.stringify({
          title: title,
          body: body,
          icon: 'https://odi.pet/icon-192.png',
          badge: 'https://odi.pet/icon-192.png',
          url: `https://odi.pet${deepLink}`,
          tag: job.id
        })

        for (const sub of userSubs) {
          try {
            await webpush.sendNotification(
              { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
              payload,
              {
                urgency: 'high',
                TTL: 86400
              }
            )
            pushesSent++
          } catch (err: any) {
            if (err.statusCode === 410 || err.statusCode === 404) {
              await supabase.from("push_subscriptions").delete().eq("id", sub.id)
            } else {
              console.error(`[dispatch-notifications] Job push error for ${profileId}:`, err)
            }
          }
        }

        // Insert in-app notification (bell icon) so it populates the in-app list
        const { error: inAppError } = await supabase
          .from("notifications")
          .insert({
            profile_id: profileId,
            pet_id: plan.pet_id,
            title: title,
            message: body,
            type: "general",
            sent_email: false
          });

        if (inAppError) {
          console.error(`[dispatch-notifications] In-app notification insert error for ${profileId}:`, inAppError);
        }

        // Auto-reschedule next occurrence for active repeating plans (daily/weekly/monthly/yearly)
        if (plan.repeat_rule && plan.status === 'active') {
          const currentFireAt = new Date(job.fire_at);
          let nextFireAtDate = new Date(currentFireAt);
          let hasValidInterval = false;

          if (plan.repeat_rule === 'daily') {
            nextFireAtDate.setDate(nextFireAtDate.getDate() + 1);
            hasValidInterval = true;
          } else if (plan.repeat_rule === 'weekly') {
            nextFireAtDate.setDate(nextFireAtDate.getDate() + 7);
            hasValidInterval = true;
          } else if (plan.repeat_rule === 'monthly') {
            nextFireAtDate.setMonth(nextFireAtDate.getMonth() + 1);
            hasValidInterval = true;
          } else if (plan.repeat_rule === 'yearly') {
            nextFireAtDate.setFullYear(nextFireAtDate.getFullYear() + 1);
            hasValidInterval = true;
          }

          if (hasValidInterval) {
            const nextFireAt = nextFireAtDate.toISOString();

            const notifBeforeMin = plan.notif_before ?? 0;
            const notifBeforeMs = plan.notif_unit === 'hour' 
              ? notifBeforeMin * 60 * 60 * 1000 
              : plan.notif_unit === 'day' 
              ? notifBeforeMin * 24 * 60 * 60 * 1000 
              : notifBeforeMin * 60 * 1000;
            
            const nextScheduledAtDate = new Date(nextFireAtDate.getTime() + notifBeforeMs);
            const isWithinEndsAt = !plan.ends_at || nextScheduledAtDate <= new Date(plan.ends_at);

            if (isWithinEndsAt) {
              const { data: existingJobs } = await supabase
                .from("notification_jobs")
                .select("id")
                .eq("plan_id", job.plan_id)
                .neq("id", job.id)
                .eq("sent", false);

              if (!existingJobs || existingJobs.length === 0) {
                await supabase
                  .from("notification_jobs")
                  .insert({
                    plan_id: job.plan_id,
                    fire_at: nextFireAt
                  });
              }
            }
          }
        }

        sentJobIds.push(job.id)
      }

      if (sentJobIds.length > 0) {
        await supabase
          .from("notification_jobs")
          .update({ sent: true })
          .in("id", sentJobIds)
      }
    }

    // 5. Mark as sent
    if (sentIds.length > 0) {
      await supabase
        .from("notifications")
        .update({ sent_email: true })
        .in("id", sentIds)
    }

    console.log(`[dispatch-notifications] Emails sent: ${emailsSent}, Web Pushes sent: ${pushesSent}`)

    return new Response(
      JSON.stringify({
        status: "success",
        in_app_notifications_created: bdayCount + scheduleCount,
        emails_sent: emailsSent,
        pushes_sent: pushesSent
      }),
      { headers: { "Content-Type": "application/json" } }
    )
  } catch (err) {
    console.error("[dispatch-notifications] Error:", err)
    return new Response(
      JSON.stringify({ status: "error", message: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
})
