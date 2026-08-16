import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');

  if (!lat || !lon) {
    return NextResponse.json(
      { error: 'Latitude and longitude are required' },
      { status: 400 }
    );
  }

  // Varsayılan mevsimsel tahmini hazırlayalım (Ağustos ayı Türkiye için ortalama 31°C)
  const currentMonth = new Date().getMonth(); // 0-11
  let estimatedTemp = 24;
  if (currentMonth >= 5 && currentMonth <= 8) {
    estimatedTemp = 31; // Yaz ayları
  } else if (currentMonth >= 3 && currentMonth <= 11) {
    estimatedTemp = 22; // Bahar ayları
  } else {
    estimatedTemp = 14; // Kış ayları
  }

  const fallbackData = {
    temp: estimatedTemp,
    isDay: true,
    sunset: new Date().toISOString().split('T')[0] + 'T20:00:00',
    isFallback: true
  };

  try {
    const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&current=temperature_2m,is_day,weathercode&daily=sunrise,sunset&timezone=auto&forecast_days=1`;
    
    // 3 saniyelik zaman aşımı (AbortController)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(apiUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'OdiPetApp/1.0 (https://odi.pet)'
      },
      cache: 'no-store'
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return NextResponse.json({ success: true, data: fallbackData });
    }

    const data = await response.json();

    const currentTemp = data.current?.temperature_2m ?? estimatedTemp;
    const isDay = data.current?.is_day === 1;
    const sunsetTime = data.daily?.sunset?.[0] || fallbackData.sunset;

    return NextResponse.json({
      success: true,
      data: {
        temp: currentTemp,
        isDay: isDay,
        sunset: sunsetTime,
      }
    });

  } catch (error: any) {
    // Bağlantı zaman aşımına uğrarsa veya network hatası verirse çökme, mevsimsel tahmin dön!
    console.warn('Weather API connection fallback activated:', error?.message || error);
    return NextResponse.json({
      success: true,
      data: fallbackData
    });
  }
}
