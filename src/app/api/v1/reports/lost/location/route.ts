import { NextResponse } from 'next/server';

import { getSessionUser } from '@/lib/auth/get-current-profile';
import { lostReportLocationSchema } from '@/lib/lost-reports/validation';

const responseHeaders = { 'Cache-Control': 'no-store' };

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'UNAUTHORIZED' },
      { status: 401, headers: responseHeaders }
    );
  }

  const body = await request.json().catch(() => null);
  const candidate: any = body?.manualAddress
    ? {
        isManual: true,
        address: body.manualAddress,
      }
    : {
        isManual: false,
        lat: body?.lat,
        lng: body?.lng,
        ...(body?.address ? { address: body.address } : {}),
      };

  // Perform reverse geocoding via Nominatim if lat/lng are provided and address isn't manually set
  if (!candidate.isManual && candidate.lat && candidate.lng && !candidate.address) {
    try {
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${candidate.lat}&lon=${candidate.lng}&accept-language=tr`,
        { headers: { 'User-Agent': 'OdiPetApp/1.0 (https://odi.pet)' } }
      );
      if (geoRes.ok) {
        const geoData = await geoRes.json();
        const addr = geoData.address || {};
        const city = addr.province || addr.city || addr.state || '';
        const district =
          addr.town ||
          addr.district ||
          addr.suburb ||
          addr.city_district ||
          addr.county ||
          '';

        let locationName = [district, city].filter(Boolean).join(', ');
        if (!locationName && geoData.display_name) {
          locationName = geoData.display_name.split(',').slice(0, 2).join(',');
        }
        if (locationName) {
          candidate.address = locationName;
        }
      }
    } catch (e) {
      console.warn('Reverse geocoding warning:', e);
    }
  }

  const parsed = lostReportLocationSchema.safeParse(candidate);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'INVALID_OR_OUTSIDE_TURKEY_LOCATION' },
      { status: 400, headers: responseHeaders }
    );
  }

  return NextResponse.json(
    { success: true, ...parsed.data },
    { headers: responseHeaders }
  );
}
