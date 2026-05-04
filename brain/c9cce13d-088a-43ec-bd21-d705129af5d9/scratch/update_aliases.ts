
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function updateAliases() {
  const updates = [
    { code: 'DHPPi_L', species: 'dog', aliases: ['DHPPi', 'L', 'L4', 'Nobivac DHPPi', 'Eurican 7', 'Karma'] },
    { code: 'RABIES_DOG', species: 'dog', aliases: ['R', 'Rabies', 'Nobivac Rabies', 'Defensor', 'Kuduz'] },
    { code: 'KENNEL_COUGH', species: 'dog', aliases: ['Bp', 'Pi2', 'KC', 'Kennel Cough', 'Nobivac KC', 'Bronchi-Shield'] },
    { code: 'LYME', species: 'dog', aliases: ['Lyme', 'Borrelia', 'Lymevax'] },
    { code: 'FVRCP', species: 'cat', aliases: ['FVRCP', 'RCP', 'Tricat', 'Felocell', 'Karma'] },
    { code: 'FELV', species: 'cat', aliases: ['FeLV', 'Leukemia', 'Leukocell', 'Lösemi'] },
    { code: 'RABIES_CAT', species: 'cat', aliases: ['R', 'Rabies', 'Kuduz'] }
  ]

  for (const item of updates) {
    const { error } = await supabase
      .from('vaccine_templates')
      .update({ aliases: item.aliases })
      .eq('vaccine_code', item.code)
      .eq('species', item.species)
    
    if (error) console.error(`Error updating ${item.code}:`, error)
    else console.log(`Updated aliases for ${item.code} (${item.species})`)
  }
}

updateAliases()
