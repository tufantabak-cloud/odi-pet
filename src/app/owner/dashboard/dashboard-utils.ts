import { DashboardPet, DashboardSchedule, DashboardFeedingLog, DashboardWeightLog } from './dashboard-queries'

export function getTimelineSchedules(upcomingSchedules: DashboardSchedule[], now: Date): DashboardSchedule[] {
  const in30 = new Date(now.getTime())
  in30.setDate(in30.getDate() + 30)
  
  const sevenDaysAgo = new Date(now.getTime())
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  
  return upcomingSchedules
    .filter((s) => {
      const due = new Date(s.due_date)
      return due >= sevenDaysAgo && due <= in30
    })
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
    .slice(0, 5)
}

export function getPetsWithStats(
  pets: DashboardPet[], 
  allFeedingLogs: DashboardFeedingLog[], 
  allWeightLogs: DashboardWeightLog[], 
  upcomingSchedules: DashboardSchedule[], 
  now: Date
) {
  return pets.map((pet) => {
    const feeding = allFeedingLogs.find((f) => f.pet_id === pet.id)
    let lastFeedingLabel = ''
    if (feeding) {
      const hrs = Math.floor((now.getTime() - new Date(feeding.created_at).getTime()) / 3600000)
      lastFeedingLabel = hrs < 1 ? 'Az önce beslendi' : hrs < 24 ? `${hrs} sa. önce` : `${Math.floor(hrs / 24)} g. önce`
    }
    const weight = allWeightLogs.find((w) => w.pet_id === pet.id)
    const weightLabel = weight?.weight_kg ? `${weight.weight_kg} kg` : ''
    const overdueCount = upcomingSchedules.filter(
      (s) => s.pet_id === pet.id && s.status !== 'done' && new Date(s.due_date) < now
    ).length
    let score = (pet.health_score as number | undefined) ?? 100
    if (overdueCount > 0) score = Math.max(0, score - overdueCount * 25)
    return { ...pet, lastFeedingLabel, weightLabel, overdueCount, score }
  })
}

export function getGreeting(now: Date): string {
  const hr = now.getHours()
  return hr < 12 ? 'Günaydın' : hr < 18 ? 'İyi Günler' : 'İyi Akşamlar'
}

export function getActiveCount(upcomingSchedules: DashboardSchedule[], now: Date): number {
  const todayEnd = new Date(now.getTime())
  todayEnd.setHours(23, 59, 59, 999)
  return upcomingSchedules.filter(
    (s) => s.status !== 'done' && new Date(s.due_date) <= todayEnd
  ).length
}
