import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('Calendar Route and Dashboard Link Verification', () => {
  it('DashboardClient.tsx should point "Takvime Git" to /owner/takvim and not /owner/calendar', () => {
    const dashboardClientPath = path.join(process.cwd(), 'src/app/owner/dashboard/DashboardClient.tsx')
    const content = fs.readFileSync(dashboardClientPath, 'utf8')

    expect(content).not.toContain('href="/owner/calendar"')
    expect(content).toContain('href="/owner/takvim"')
  })

  it('next.config.ts should define redirects from /owner/calendar and /calendar to /owner/takvim', () => {
    const nextConfigPath = path.join(process.cwd(), 'next.config.ts')
    const content = fs.readFileSync(nextConfigPath, 'utf8')

    expect(content).toContain("source: '/owner/calendar'")
    expect(content).toContain("source: '/owner/calendar/:path*'")
    expect(content).toContain("source: '/calendar'")
    expect(content).toContain("destination: '/owner/takvim'")
  })
})
