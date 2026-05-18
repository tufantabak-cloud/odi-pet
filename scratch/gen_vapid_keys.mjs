/**
 * Run once: node scratch/gen_vapid_keys.mjs
 * Paste the output into .env.local
 */
import { generateVAPIDKeys } from 'web-push'

const keys = generateVAPIDKeys()
console.log('\n=== VAPID Keys (copy to .env.local) ===\n')
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}`)
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`)
console.log('\n=== Also set in Supabase Dashboard → Edge Functions → Secrets ===')
console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`)
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`)
console.log(`RESEND_API_KEY=<your-resend-api-key>`)
