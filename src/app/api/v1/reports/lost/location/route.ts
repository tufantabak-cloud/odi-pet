import { NextResponse } from 'next/server';

// TR Bounding Box
const TR_BOUNDS = {
  minLat: 35.8089,
  maxLat: 42.1081,
  minLng: 25.6638,
  maxLng: 44.8224
};

export async function POST(req: Request) {
  try {
    const { lat, lng, manualAddress } = await req.json();

    if (manualAddress) {
      return NextResponse.json({ message: 'Manual location saved', address: manualAddress, isManual: true });
    }

    if (lat === undefined || lng === undefined) {
      return NextResponse.json({ error: 'Latitude and longitude are required' }, { status: 400 });
    }

    // Validate TR Bounding Box
    if (lat < TR_BOUNDS.minLat || lat > TR_BOUNDS.maxLat || lng < TR_BOUNDS.minLng || lng > TR_BOUNDS.maxLng) {
      return NextResponse.json({ error: 'Location is outside of Turkey. Please use manual entry.' }, { status: 400 });
    }

    return NextResponse.json({ message: 'Location verified', lat, lng, isManual: false });

  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
