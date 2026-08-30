import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')?.trim()

    if (!code || code.length !== 5 || !/^\d{5}$/.test(code)) {
      return NextResponse.json({ error: 'Geçersiz 5 haneli posta kodu' }, { status: 400 })
    }

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(code)}&country=Turkey&format=jsonv2&addressdetails=1&accept-language=tr`,
      {
        headers: {
          'User-Agent': 'OdiPetApp/1.0 (support@odi.pet)'
        }
      }
    )

    if (!response.ok) {
      return NextResponse.json({ error: 'Posta kodu servisi yanıt vermedi' }, { status: 502 })
    }

    const results = await response.json()

    if (Array.isArray(results) && results.length > 0) {
      const addr = results[0].address || {}

      const city = addr.province || addr.city || addr.state || addr.region || ''
      const district = addr.town || addr.district || addr.county || addr.borough || addr.city_district || (addr.suburb && addr.city ? addr.suburb : '')
      const neighborhood = addr.suburb || addr.neighbourhood || addr.quarter || addr.village || addr.residential || ''

      return NextResponse.json({
        success: true,
        city,
        district,
        neighborhood,
        full_address: results[0].display_name
      })
    }

    return NextResponse.json({ success: false, message: 'Adres bulunamadı' }, { status: 404 })
  } catch (error) {
    console.error('[Postcode Location API Error]', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
