import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const res = await fetch('https://turkiyeapi.dev/api/v1/provinces', { next: { revalidate: 86400 } })
    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ status: 'ERROR', data: [] }, { status: 500 })
  }
}
