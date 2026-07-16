import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

export async function PATCH() {
  return NextResponse.json({ error: '410 Gone - Endpoint deprecated.' }, { status: 410 })
}
export async function DELETE() {
  return NextResponse.json({ error: '410 Gone - Endpoint deprecated.' }, { status: 410 })
}
