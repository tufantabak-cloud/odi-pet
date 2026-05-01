import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { symptoms } = await req.json()

  const symptomStr = (symptoms ?? '').toLowerCase()

  let score = 10
  let severity = 'low'

  const critical = ['kan', 'kriz', 'nöbet', 'bayıl', 'soluk alma', 'nefes', 'bilinç', 'titreme']
  const medium   = ['kusma', 'ateş', 'ishal', 'iştahsız', 'halsiz', 'şişlik', 'yara', 'akıntı']

  if (critical.some(w => symptomStr.includes(w))) {
    score = 90; severity = 'critical'
  } else if (medium.some(w => symptomStr.includes(w))) {
    score = 50; severity = 'medium'
  }

  return NextResponse.json({
    score,
    severity,
    recommended_action: severity === 'critical'
      ? 'Acil veteriner müdahalesi gerekli!'
      : severity === 'medium'
      ? 'Veteriner muayenesi önerilir'
      : 'Gözlem altında tutun, gerekirse veterinere başvurun',
  })
}
