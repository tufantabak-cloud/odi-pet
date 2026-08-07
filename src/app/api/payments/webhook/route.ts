import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json({ success: false, error: 'Legacy payments removed' }, { status: 410 })
}

