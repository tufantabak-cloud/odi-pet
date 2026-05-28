import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const placeId = searchParams.get('placeId');

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'Google Maps API key is not configured.' }, { status: 500 });
  }

  if (!placeId) {
    return NextResponse.json({ error: 'placeId parameter is missing.' }, { status: 400 });
  }

  try {
    const googleApiUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=formatted_phone_number,opening_hours,international_phone_number&key=${apiKey}&language=tr`;
    
    const response = await fetch(googleApiUrl);
    const data = await response.json();

    if (data.status !== 'OK') {
      console.error('Google Place Details API Error:', data);
      return NextResponse.json({ error: 'Google API isteğinde bir hata oluştu.' }, { status: 500 });
    }

    const result = data.result || {};
    const details = {
      phone: result.formatted_phone_number || result.international_phone_number || '',
      weekday_text: result.opening_hours?.weekday_text || null,
      open_now: result.opening_hours?.open_now ?? null,
    };

    return NextResponse.json({ details });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'İşlem sırasında bir hata oluştu.' }, { status: 500 });
  }
}
