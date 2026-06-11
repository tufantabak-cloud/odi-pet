import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  const city = searchParams.get('city');
  const district = searchParams.get('district');

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'Google Maps API key is not configured.' }, { status: 500 });
  }

  try {
    let googleApiUrl = '';
    
    // Konum bazlı arama (Yakınımdaki Klinikler)
    if (lat && lng) {
      // Nearby Search API
      googleApiUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=50000&type=veterinary_care&keyword=veteriner&key=${apiKey}`;
    } 
    // Şehir ve İlçe bazlı arama (Manuel Arama)
    else if (city) {
      // Text Search API
      const query = encodeURIComponent(`Veteriner Kliniği ${district ? district + ' ' : ''}${city}`);
      googleApiUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&type=veterinary_care&key=${apiKey}`;
    } else {
      return NextResponse.json({ error: 'Arama kriterleri (konum veya şehir) eksik.' }, { status: 400 });
    }

    const response = await fetch(googleApiUrl);
    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Google API Error:', data);
      return NextResponse.json({ error: 'Google API isteğinde bir hata oluştu.' }, { status: 500 });
    }

    interface GooglePlaceResult {
      place_id: string;
      name: string;
      vicinity?: string;
      formatted_address?: string;
      geometry?: { location?: { lat: number, lng: number } };
      rating?: number;
      user_ratings_total?: number;
      opening_hours?: { open_now: boolean };
      photos?: { photo_reference: string }[];
      types?: string[];
    }

    const clinics = data.results.map((place: GooglePlaceResult) => ({
      id: place.place_id,
      name: place.name,
      address: place.vicinity || place.formatted_address || '',
      city: city || '', // Tahmini, place_details ile kesinleştirilebilir
      district: district || '',
      latitude: place.geometry?.location?.lat || 0,
      longitude: place.geometry?.location?.lng || 0,
      rating: place.rating || null,
      user_ratings_total: place.user_ratings_total || 0,
      open_now: place.opening_hours?.open_now ?? null,
      photo_reference: place.photos?.[0]?.photo_reference || null,
      dist_km: 0, // Frontend'de kullanıcının konumuyla hesaplanacak
      is_verified: true, // Google'dan geldiği için varsayılan
      tags: place.types ? place.types.filter((t: string) => t !== 'veterinary_care' && t !== 'point_of_interest' && t !== 'establishment') : []
    }));

    return NextResponse.json({ clinics });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'İşlem sırasında bir hata oluştu.' }, { status: 500 });
  }
}

