
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://soautcxgiqhxiaxrubxv.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvYXV0Y3hnaXFoeGlheHJ1Ynh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2NzA1MTgsImV4cCI6MjA5MjI0NjUxOH0.8EZsh9ie8MK5TZ1ne0wahZiDtJBv6yvNNaqEauGyOts'
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkTemplates() {
  const { data, error } = await supabase.from('vaccine_templates').select('vaccine_name, profile_id, is_active').limit(50)
  if (error) {
    console.error('Error:', error.message)
    return
  }
  console.log('Templates found:', data.length)
  data.forEach(t => {
    console.log(`- ${t.vaccine_name} (Profile: ${t.profile_id}, Active: ${t.is_active})`)
  })
}

checkTemplates()
