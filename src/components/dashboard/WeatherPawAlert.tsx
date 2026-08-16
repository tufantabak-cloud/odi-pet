'use client';

import { useState, useEffect } from 'react';
import { MapPin, ThermometerSun, AlertTriangle, Info, X } from 'lucide-react';

interface WeatherData {
  temp: number;
  isDay: boolean;
  sunset: string; // ISO string
}

interface WeatherPawAlertProps {
  activePet: {
    id: string;
    name: string;
    species?: string;
  };
}

export default function WeatherPawAlert({ activePet }: WeatherPawAlertProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [permissionState, setPermissionState] = useState<PermissionState | 'unknown'>('unknown');
  const [dismissed, setDismissed] = useState(false);

  const petSpecies = activePet?.species?.toLowerCase() || '';
  const normalizedSpecies = petSpecies.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const isDog = normalizedSpecies === 'kopek' || normalizedSpecies === 'dog' || petSpecies.includes('kopek') || petSpecies.includes('dog');

  useEffect(() => {
    if (!isDog || dismissed) return;

    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' }).then(result => {
        setPermissionState(result.state);
        result.onchange = () => setPermissionState(result.state);
        
        if (result.state === 'granted') {
          fetchWeather();
        }
      }).catch(() => {
        setPermissionState('unknown');
      });
    } else {
      const cached = sessionStorage.getItem('odi_weather_data');
      if (cached) {
        setWeather(JSON.parse(cached).data);
      }
    }
  }, [isDog, dismissed]);

  const fetchWeather = () => {
    if (loading) return;
    setLoading(true);

    const cached = sessionStorage.getItem('odi_weather_data');
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < 30 * 60 * 1000) {
        setWeather(data);
        setLoading(false);
        return;
      }
    }

    if (!navigator.geolocation) {
      setPermissionState('denied');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        setPermissionState('granted');
        try {
          const res = await fetch(`/api/weather?lat=${position.coords.latitude}&lon=${position.coords.longitude}`);
          if (res.ok) {
            const json = await res.json();
            if (json.success && json.data) {
              setWeather(json.data);
              sessionStorage.setItem('odi_weather_data', JSON.stringify({
                data: json.data,
                timestamp: Date.now()
              }));
            }
          }
        } catch (error) {
          console.error('Weather fetch error', error);
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        console.warn('Geolocation error:', error);
        setPermissionState('denied');
        setLoading(false);
      },
      { timeout: 5000 }
    );
  };

  if (!isDog || dismissed) return null;

  // İzin reddedildiyse bilgilendir
  if (permissionState === 'denied') {
    return (
      <div className="relative flex items-center justify-between p-4 rounded-[24px] border border-slate-100 bg-white shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] mb-2">
        <button 
          onClick={() => setDismissed(true)}
          className="absolute top-3 right-3 p-1 rounded-full hover:bg-black/5 text-slate-400 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-3 pr-6">
          <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0">
            <MapPin className="w-5 h-5 text-slate-400 stroke-[2]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary">Pati Sıcaklık Uyarısı</p>
            <p className="text-2xs text-text-secondary mt-0.5">Konum izni kapalı olduğu için canlı hava durumu alınamadı.</p>
          </div>
        </div>
      </div>
    );
  }

  // İzin henüz istenmediyse (Prompt UI)
  if ((permissionState === 'prompt' || permissionState === 'unknown') && !weather && !loading) {
    return (
      <div className="flex items-center justify-between p-4 rounded-[24px] border border-slate-100 bg-white shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] mb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-orange-50 flex items-center justify-center shrink-0">
            <ThermometerSun className="w-5 h-5 text-orange-500 stroke-[2]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary">Pati Sıcaklık Uyarısı</p>
            <p className="text-2xs text-text-secondary mt-0.5">Asfalt sıcaklığı riskini hesaplamak için konum izni verin.</p>
          </div>
        </div>
        <button 
          onClick={fetchWeather}
          className="text-xs font-semibold text-white bg-primary px-3 py-1.5 rounded-xl active:scale-[0.98] transition-transform shrink-0"
        >
          İzin Ver
        </button>
      </div>
    );
  }

  // Yükleniyor durumu
  if (loading && !weather) {
    return (
      <div className="p-4 rounded-[24px] border border-slate-100 bg-white shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] mb-2 flex animate-pulse gap-3">
         <div className="w-10 h-10 rounded-2xl bg-slate-100 shrink-0" />
         <div className="flex-1 space-y-2 py-1">
           <div className="h-4 bg-slate-100 rounded w-1/3" />
           <div className="h-3 bg-slate-100 rounded w-2/3" />
         </div>
      </div>
    );
  }

  if (!weather) return null;

  // ── Gündüz / Gece Tespiti ──
  // API'den gelen isDay + sunset saati birlikte değerlendirilir.
  let sunsetStr = '19:00';
  let isPastSunset = false;
  if (weather.sunset) {
    try {
      const sunsetDate = new Date(weather.sunset);
      sunsetStr = sunsetDate.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
      isPastSunset = new Date() > sunsetDate;
    } catch {
      sunsetStr = '19:00';
      isPastSunset = new Date().getHours() >= 19;
    }
  } else {
    isPastSunset = new Date().getHours() >= 19;
  }

  // isDay: API'den gelen değer öncelikli, fallback olarak sunset kontrolü
  const isNight = weather.isDay === false || isPastSunset;

  // ── Asfalt Sıcaklığı ──
  // Gündüz güneş altında: hava × 1.6 (ampirik katsayı)
  // Gece: güneş yok, asfalt soğur → hava sıcaklığına yakın (hava + 2-3°C fark)
  const asphaltTemp = isNight
    ? Math.round(weather.temp + 2)
    : Math.round(weather.temp * 1.6);

  // ── Risk Seviyeleri ──
  // Gece vakti asfalt tehlikeli seviyeye çıkamaz (güneş yok), 
  // bu yüzden gece isCaution/isDanger hesaplamalarında asfalt bazlı düşünülür.
  const isDanger = !isNight && weather.temp >= 30;
  const isCaution = !isNight && weather.temp >= 25 && weather.temp < 30;
  const isSafe = isNight || weather.temp < 25;

  // ── Gece Modu: Serin / güvenli mesaj ──
  if (isNight) {
    return (
      <div className="relative flex items-start gap-3 p-4 rounded-[24px] border bg-emerald-50 border-emerald-100 mb-2 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] transition-all">
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-3 right-3 p-1 rounded-full hover:bg-black/5 text-slate-400 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 bg-emerald-100 text-emerald-600">
          <ThermometerSun className="w-5 h-5 stroke-[2]" />
        </div>
        <div className="pr-5">
          <h3 className="text-sm font-semibold text-emerald-800">Pati Sıcaklık Uyarısı</h3>
          <p className="text-xs mt-1 leading-relaxed text-emerald-700">
            Dışarısı <strong>{Math.round(weather.temp)}°C</strong>.{' '}
            {weather.temp >= 25
              ? 'Güneş battı, asfalt soğuyor. Şu an yürüyüş için uygun zaman!'
              : 'Harika bir hava! Patiler güvende, yürüyüş için ideal zaman.'}
          </p>
        </div>
      </div>
    );
  }

  // ── Gündüz Modu ──
  const bgStyle = isDanger ? 'bg-rose-50 border-rose-100' : isCaution ? 'bg-amber-50 border-amber-100' : 'bg-emerald-50 border-emerald-100';
  const iconStyle = isDanger ? 'bg-rose-100 text-rose-600' : isCaution ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600';
  const textTitleStyle = isDanger ? 'text-rose-800' : isCaution ? 'text-amber-800' : 'text-emerald-800';
  const textDescStyle = isDanger ? 'text-rose-600' : isCaution ? 'text-amber-700' : 'text-emerald-700';

  return (
    <div className={`relative flex items-start gap-3 p-4 rounded-[24px] border ${bgStyle} mb-2 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] transition-all`}>
      <button 
        onClick={() => setDismissed(true)}
        className="absolute top-3 right-3 p-1 rounded-full hover:bg-black/5 text-slate-400 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>

      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${iconStyle}`}>
        {isDanger ? <AlertTriangle className="w-5 h-5 stroke-[2]" /> : isCaution ? <AlertTriangle className="w-5 h-5 stroke-[2]" /> : <ThermometerSun className="w-5 h-5 stroke-[2]" />}
      </div>
      <div className="pr-5">
        <h3 className={`text-sm font-semibold ${textTitleStyle}`}>Pati Sıcaklık Uyarısı</h3>
        <p className={`text-xs mt-1 leading-relaxed ${textDescStyle}`}>
          {isSafe ? (
            <>Dışarısı <strong>{Math.round(weather.temp)}°C</strong>. Harika bir hava! Patiler güvende, yürüyüş için ideal zaman.</>
          ) : (
            <>Dışarısı <strong>{Math.round(weather.temp)}°C</strong>, asfalt sıcaklığı yaklaşık <strong>{asphaltTemp}°C</strong>'yi bulabilir. Yürüyüş için {isDanger ? 'patileri koruyan patik giydirin' : 'mümkünse çim alanları tercih edin'} ya da <strong>{sunsetStr}</strong> sonrasını bekleyin.</>
          )}
        </p>
      </div>
    </div>
  );
}
