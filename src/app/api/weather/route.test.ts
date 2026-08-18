import { describe, it, expect } from 'vitest'
import { GET } from './route'

describe('GET /api/weather', () => {
  it('returns hasLocation=false and empty cityName when no lat/lon or city param is provided', async () => {
    const req = new Request('http://localhost/api/weather')
    const res = await GET(req)
    const json = await res.json()

    expect(json.success).toBe(true)
    expect(json.data.hasLocation).toBe(false)
    expect(json.data.cityName).toBe('')
  })

  it('returns hasLocation=true and matched city name when city param is provided', async () => {
    const req = new Request('http://localhost/api/weather?city=İzmir')
    const res = await GET(req)
    const json = await res.json()

    expect(json.success).toBe(true)
    expect(json.data.hasLocation).toBe(true)
    expect(json.data.cityName).toBe('İzmir')
  })

  it('returns hasLocation=true and nearest city name when lat/lon are provided', async () => {
    const req = new Request('http://localhost/api/weather?lat=39.9334&lon=32.8597')
    const res = await GET(req)
    const json = await res.json()

    expect(json.success).toBe(true)
    expect(json.data.hasLocation).toBe(true)
    expect(json.data.cityName).toBe('Ankara')
  })
})
