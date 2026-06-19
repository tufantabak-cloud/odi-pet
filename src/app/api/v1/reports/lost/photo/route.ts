import { NextResponse } from 'next/server';

// Mock in-memory storage for failures (in production, use Redis)
const photoUploadFailures = new Map<string, number>();

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const photo = formData.get('photo') as File | null;
    const sessionId = formData.get('sessionId') as string;

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    const failures = photoUploadFailures.get(sessionId) || 0;

    if (!photo) {
      if (failures >= 2) {
        return NextResponse.json({ message: 'Skipping photo upload after 3 failures', skipped: true });
      }
      photoUploadFailures.set(sessionId, failures + 1);
      return NextResponse.json({ error: 'Photo is required' }, { status: 400 });
    }

    if (photo.size > 2 * 1024 * 1024) {
      if (failures >= 2) {
         return NextResponse.json({ message: 'Skipping photo upload after 3 failures', skipped: true });
      }
      photoUploadFailures.set(sessionId, failures + 1);
      return NextResponse.json({ error: 'File size exceeds 2MB limit' }, { status: 400 });
    }

    // Success (Mock saving)
    photoUploadFailures.delete(sessionId);
    return NextResponse.json({ message: 'Photo uploaded successfully', url: '/mock-url.jpg' });

  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
