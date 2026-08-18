import { NextResponse } from 'next/server';
import { TURKIYE_ILLER } from '@/lib/utils/turkiyeIller';

export const dynamic = 'force-dynamic';

const TOURIST_DISTRICTS: Record<string, { lat: number; lon: number; name: string }> = {
  bodrum: { lat: 37.0344, lon: 27.4305, name: 'Bodrum' },
  cesme: { lat: 38.3236, lon: 26.3042, name: 'Çeşme' },
  fethiye: { lat: 36.6217, lon: 29.1164, name: 'Fethiye' },
  marmaris: { lat: 36.8550, lon: 28.2742, name: 'Marmaris' },
  alanya: { lat: 36.5438, lon: 31.9998, name: 'Alanya' },
  kusadasi: { lat: 37.8579, lon: 27.2610, name: 'Kuşadası' },
};

function normalizeTurkish(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .trim();
}

function findLocationByName(cityName: string) {
  const normalized = normalizeTurkish(cityName);
  if (TOURIST_DISTRICTS[normalized]) return TOURIST_DISTRICTS[normalized];

  const cityKey = Object.keys(TURKIYE_ILLER).find(k => normalizeTurkish(k) === normalized);
  if (cityKey) {
    return {
      lat: TURKIYE_ILLER[cityKey].lat,
      lon: TURKIYE_ILLER[cityKey].lon,
      name: TURKIYE_ILLER[cityKey].label
    };
  }
  return null;
}

function findNearestCity(lat: number, lon: number): string {
  let closestCity = 'İstanbul';
  let minDistance = Infinity;

  for (const key of Object.keys(TOURIST_DISTRICTS)) {
    const city = TOURIST_DISTRICTS[key];
    const dLat = city.lat - lat;
    const dLon = city.lon - lon;
    const dist = dLat * dLat + dLon * dLon;
    if (dist < minDistance) {
      minDistance = dist;
      closestCity = city.name;
    }
  }

  for (const key of Object.keys(TURKIYE_ILLER)) {
    const city = TURKIYE_ILLER[key];
    const dLat = city.lat - lat;
    const dLon = city.lon - lon;
    const dist = dLat * dLat + dLon * dLon;
    if (dist < minDistance) {
      minDistance = dist;
      closestCity = city.label;
    }
  }

  return closestCity;
}

function getWeatherDetails(code: number, isDay: boolean = true) {
  switch (code) {
    case 0:
      return { description: isDay ? 'Güneşli' : 'Açık', icon: 'sun' };
    case 1:
      return { description: isDay ? 'Çoğunlukla Açık' : 'Açık', icon: 'sun' };
    case 2:
      return { description: 'Az bulutlu', icon: 'cloud-sun' };
    case 3:
      return { description: 'Parçalı bulutlu', icon: 'cloud' };
    case 45:
    case 48:
      return { description: 'Sisli', icon: 'fog' };
    case 51:
    case 53:
    case 55:
      return { description: 'Çiseleyen yağmur', icon: 'drizzle' };
    case 61:
    case 63:
    case 65:
      return { description: 'Yağmurlu', icon: 'rain' };
    case 71:
    case 73:
    case 75:
    case 77:
      return { description: 'Karlı', icon: 'snow' };
    case 80:
    case 81:
    case 82:
      return { description: 'Sağanak yağış', icon: 'heavy-rain' };
    case 85:
    case 86:
      return { description: 'Kar sağanağı', icon: 'snow' };
    case 95:
    case 96:
    case 99:
      return { description: 'Gök gürültülü fırtına', icon: 'thunder' };
    default:
      return { description: 'Az bulutlu', icon: 'cloud-sun' };
  }
}

function getUvLevel(uv: number): { text: string; status: 'low' | 'moderate' | 'high' | 'very-high' } {
  if (uv <= 3) return { text: 'Düşük', status: 'low' };
  if (uv <= 5) return { text: 'Orta', status: 'moderate' };
  if (uv <= 7) return { text: 'Yüksek', status: 'high' };
  return { text: 'Çok Yüksek', status: 'very-high' };
}

function getHumidityLevel(humidity: number): { text: string; status: 'ideal' | 'dry' | 'humid' } {
  if (humidity < 30) return { text: 'Kuru', status: 'dry' };
  if (humidity <= 65) return { text: 'İdeal', status: 'ideal' };
  return { text: 'Nemli', status: 'humid' };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  let lat = searchParams.get('lat');
  let lon = searchParams.get('lon');
  const cityParam = searchParams.get('city');

  let hasLocation = false;
  let resolvedCityName = '';

  // 1. Şehir parametresi verilmişse eşleştir
  if (cityParam) {
    hasLocation = true;
    const foundLocation = findLocationByName(cityParam);
    if (foundLocation) {
      lat = String(foundLocation.lat);
      lon = String(foundLocation.lon);
      resolvedCityName = foundLocation.name;
    } else {
      // Şehir ismini direkt kullan (Fallback)
      resolvedCityName = cityParam;
    }
  } else if (lat && lon) {
    hasLocation = true;
    // Koordinatlardan en yakın ili bul
    resolvedCityName = findNearestCity(parseFloat(lat), parseFloat(lon));
  } else {
    // 2. Varsayılan koordinat (Genel hava durumu için İstanbul koordinatları kullanılır ama şehir adı atanmaz)
    lat = '41.0082';
    lon = '28.9784';
    resolvedCityName = '';
    hasLocation = false;
  }

  const currentMonth = new Date().getMonth();
  let estimatedTemp = 24;
  if (currentMonth >= 5 && currentMonth <= 8) {
    estimatedTemp = 27;
  } else if (currentMonth >= 3 && currentMonth <= 11) {
    estimatedTemp = 21;
  } else {
    estimatedTemp = 13;
  }

  const fallbackData = {
    temp: estimatedTemp,
    feelsLike: estimatedTemp,
    humidity: 55,
    humidityLevelText: 'İdeal',
    uvIndex: 3,
    uvLevelText: 'Düşük',
    weatherCode: 2,
    weatherDescription: 'Az bulutlu',
    weatherIconType: 'cloud-sun',
    cityName: resolvedCityName,
    hasLocation,
    isDay: true,
    sunset: new Date().toISOString().split('T')[0] + 'T20:00:00',
    sunrise: new Date().toISOString().split('T')[0] + 'T06:15:00',
    asphaltTemp: Math.round(estimatedTemp * 1.4),
    recommendation: {
      headline: 'Bugün yürüyüş için harika bir gün! ⛅',
      subtext: 'Hava koşulları ve asfalt sıcaklığı patiler için ideal seviyede.',
      walkStatus: 'ideal',
    },
    hourlyForecast: [] as any[],
    isFallback: true,
  };

  try {
    const validLat = lat || '41.0082';
    const validLon = lon || '28.9784';
    const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(
      validLat
    )}&longitude=${encodeURIComponent(
      validLon
    )}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,uv_index&hourly=temperature_2m,uv_index,weather_code,relative_humidity_2m&daily=sunrise,sunset,uv_index_max,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const response = await fetch(apiUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'OdiPetApp/1.0 (https://odi.pet)',
      },
      cache: 'no-store',
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return NextResponse.json({ success: true, data: fallbackData });
    }

    const data = await response.json();

    const currentTemp = Math.round(data.current?.temperature_2m ?? estimatedTemp);
    const feelsLike = Math.round(data.current?.apparent_temperature ?? currentTemp);
    const humidity = Math.round(data.current?.relative_humidity_2m ?? 55);
    const uvRaw = data.current?.uv_index ?? 3;
    const uvIndex = Math.round(uvRaw);
    const weatherCode = data.current?.weather_code ?? 2;
    const isDay = data.current?.is_day === 1;
    const sunsetTime = data.daily?.sunset?.[0] || fallbackData.sunset;
    const sunriseTime = data.daily?.sunrise?.[0] || fallbackData.sunrise;

    const weatherInfo = getWeatherDetails(weatherCode, isDay);
    const uvInfo = getUvLevel(uvRaw);
    const humidityInfo = getHumidityLevel(humidity);

    // Asfalt Sıcaklığı hesabı
    const asphaltTemp = !isDay ? currentTemp + 2 : Math.round(currentTemp * 1.5);

    // Yürüyüş tavsiyesi
    let walkStatus: 'ideal' | 'caution' | 'danger' | 'rainy' | 'cool' = 'ideal';
    let headline = 'Bugün yürüyüş için harika bir gün! ⛅';
    let subtext = 'Hava koşulları ve asfalt sıcaklığı patiler için ideal seviyede.';

    if (weatherCode >= 51 && weatherCode <= 82) {
      walkStatus = 'rainy';
      headline = 'Dışarısı yağışlı, kısa yürüyüşler önerilir 🌧️';
      subtext = 'Patilerin ıslanmaması ve üşütmemesi için dikkat edin.';
    } else if (!isDay) {
      walkStatus = 'cool';
      headline = 'Akşam serinliği, sakin bir yürüyüş zamanı! 🌙';
      subtext = 'Güneş battı, asfalt tamamen soğudu. Yürüyüş için çok rahat.';
    } else if (currentTemp >= 30 || asphaltTemp >= 45) {
      walkStatus = 'danger';
      headline = 'Asfalt çok sıcak! Patileri koruyun ⚠️';
      subtext = `Dışarısı ${currentTemp}°C, asfalt ${asphaltTemp}°C. Çim alanları seçin veya akşamı bekleyin.`;
    } else if (currentTemp >= 26 || asphaltTemp >= 38) {
      walkStatus = 'caution';
      headline = 'Ilık bir hava, gölgeli rotaları tercih edin 🐾';
      subtext = 'Güneşin dik geldiği yerlerde asfalt ısınabilir, dikkatli olun.';
    } else {
      walkStatus = 'ideal';
      headline = 'Bugün yürüyüş için harika bir gün! ⛅';
      subtext = 'Hava koşulları ve asfalt sıcaklığı patiler için ideal seviyede.';
    }

    // Saatlik tahmin (Sonraki 6 saat)
    const currentHourIndex = new Date().getHours();
    const hourlyForecast = (data.hourly?.time || [])
      .slice(currentHourIndex, currentHourIndex + 6)
      .map((timeStr: string, idx: number) => {
        const hIndex = currentHourIndex + idx;
        const hourTime = timeStr.split('T')[1]?.slice(0, 5) || `${hIndex}:00`;
        return {
          time: hourTime,
          temp: Math.round(data.hourly?.temperature_2m?.[hIndex] ?? currentTemp),
          uv: Math.round(data.hourly?.uv_index?.[hIndex] ?? 0),
          weatherCode: data.hourly?.weather_code?.[hIndex] ?? weatherCode,
          humidity: Math.round(data.hourly?.relative_humidity_2m?.[hIndex] ?? humidity),
        };
      });

    return NextResponse.json({
      success: true,
      data: {
        temp: currentTemp,
        feelsLike,
        humidity,
        humidityLevelText: humidityInfo.text,
        uvIndex,
        uvLevelText: uvInfo.text,
        weatherCode,
        weatherDescription: weatherInfo.description,
        weatherIconType: weatherInfo.icon,
        cityName: resolvedCityName,
        hasLocation,
        isDay,
        sunset: sunsetTime,
        sunrise: sunriseTime,
        asphaltTemp,
        recommendation: {
          headline,
          subtext,
          walkStatus,
        },
        hourlyForecast,
      },
    });
  } catch (error: any) {
    console.warn('Weather API connection fallback activated:', error?.message || error);
    return NextResponse.json({
      success: true,
      data: fallbackData,
    });
  }
}
