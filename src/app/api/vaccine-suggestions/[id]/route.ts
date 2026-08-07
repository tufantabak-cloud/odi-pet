import { NextRequest, NextResponse } from 'next/server'
import { PATCH as adminPatch } from '@/app/api/admin/vaccine-suggestions/[id]/route'

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  return adminPatch(req, context)
}
