import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');

  if (!lat || !lng) {
    return NextResponse.json({ success: false, name: null });
  }

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=tr`,
      {
        headers: {
          'User-Agent': 'OdiPetApp/1.0 (https://odi.pet)',
        },
      }
    );

    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};

      const city = addr.province || addr.city || addr.state || addr.region || '';
      const district =
        addr.town ||
        addr.district ||
        addr.suburb ||
        addr.city_district ||
        addr.county ||
        addr.village ||
        '';

      const locationName = [district, city].filter(Boolean).join(', ');
      if (locationName) {
        return NextResponse.json({ success: true, name: locationName });
      }

      if (data.display_name) {
        const parts = data.display_name.split(',').map((s: string) => s.trim());
        const shortName = parts.slice(0, 2).join(', ');
        return NextResponse.json({ success: true, name: shortName });
      }
    }
  } catch (err) {
    console.error('Server reverse geocode error:', err);
  }

  return NextResponse.json({ success: false, name: null });
}
