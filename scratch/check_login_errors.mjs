import { chromium } from '@playwright/test'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const EMAIL = process.env.TEST_EMAIL
const PASSWORD = process.env.TEST_PASSWORD

async function check() {
  console.log(`TEST_EMAIL: ${EMAIL}`)
  console.log("Launching browser...")
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  page.on('console', msg => {
    console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`)
  })

  page.on('pageerror', err => {
    console.error(`[BROWSER EXCEPTION]`, err)
  })

  console.log("Navigating to http://127.0.0.1:3000/login...")
  // Just standard goto like in E2E
  await page.goto('http://127.0.0.1:3000/login')

  console.log("Filling inputs immediately...")
  await page.fill('input[name="email"]', EMAIL)
  await page.fill('input[name="password"]', PASSWORD)

  console.log("Clicking submit immediately...")
  await page.click('button[type="submit"]')

  console.log("Waiting 5 seconds...")
  await new Promise(r => setTimeout(r, 5000))

  console.log(`Final URL: ${page.url()}`)
  await browser.close()
}

check()
