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
serve(async (_req) => {
  console.log("[dispatch-notifications] Starting notification cycle…")

  try {
    // 1. Generate in-app notifications via DB function
    const { data: count, error: fnErr } = await supabase.rpc("generate_vaccine_notifications")
    if (fnErr) throw new Error(`RPC error: ${fnErr.message}`)
    console.log(`[dispatch-notifications] Generated ${count} in-app notifications`)

    // 1b. Generate birthday notifications via DB function
    let bdayCount = 0
    const { data: bCount, error: bdayErr } = await supabase.rpc("generate_birthday_notifications")
    if (bdayErr) {
      console.error(`[dispatch-notifications] Birthday RPC error:`, bdayErr)
    } else {
      bdayCount = bCount ?? 0
      console.log(`[dispatch-notifications] Generated ${bdayCount} in-app birthday notifications`)
    }

    // 2. Fetch unsent email notifications (created in last 24h, email not sent)
    const { data: unsent, error: fetchErr } = await supabase
      .from("notifications")
      .select(`
        id,
        profile_id,
        title,
        message,
        type,
        profiles!notifications_profile_id_fkey (
          email:auth_email
        )
      `)
      .eq("sent_email", false)
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order("created_at", { ascending: false })

    if (fetchErr) throw new Error(`Fetch error: ${fetchErr.message}`)

    // 3. Group by profile
    const byProfile = new Map<string, { email: string; notifs: typeof unsent }>()
    for (const n of unsent ?? []) {
      const email = (n as any).profiles?.email
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

    const subsByProfile = new Map<string, any[]>()
    for (const sub of pushSubs ?? []) {
      if (!subsByProfile.has(sub.profile_id)) {
        subsByProfile.set(sub.profile_id, [])
      }
      subsByProfile.get(sub.profile_id)!.push(sub)
    }

    let emailsSent = 0
    let pushesSent = 0
    const sentIds: string[] = []

    // 4. Send notifications
    for (const [profileId, { email, notifs }] of byProfile) {
      if (!notifs || notifs.length === 0) continue

      const subject =
        notifs.length === 1
          ? `🐾 ${notifs[0].title}`
          : `🐾 ${notifs.length} yeni hatırlatma – Odi.Pet`

      // 4a. Send Email
      const sent = await sendEmail(email, subject, buildEmailHtml(notifs as any))
      if (sent) {
        emailsSent++
        sentIds.push(...notifs.map((n) => n.id))
      }

      // 4b. Send Web Push
      if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
        const userSubs = subsByProfile.get(profileId) ?? []
        for (const notif of notifs) {
          const payload = JSON.stringify({
            title: notif.title,
            body: notif.message,
            icon: '/logo.jpg',
            badge: '/logo.jpg',
            url: '/owner/notifications'
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
                payload
              )
              pushesSent++
            } catch (err: any) {
              // If subscription is invalid/expired, delete it
              if (err.statusCode === 410 || err.statusCode === 404) {
                await supabase.from("push_subscriptions").delete().eq("id", sub.id)
              } else {
                console.error(`[dispatch-notifications] Web push error for ${profileId}:`, err)
              }
            }
          }
        }
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
        in_app_notifications_created: (count ?? 0) + bdayCount,
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
