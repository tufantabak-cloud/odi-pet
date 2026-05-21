import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf-8')
  const parsed = dotenv.parse(content)
  console.log("Keys in .env.local:", Object.keys(parsed))
} else {
  console.log(".env.local does not exist")
}
