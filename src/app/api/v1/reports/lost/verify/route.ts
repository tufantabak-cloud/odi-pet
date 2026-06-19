import { NextResponse } from 'next/server';

// Mock DB for OTP requests
const otpStore = new Map<string, { code: string, expiresAt: number, lockUntil?: number, attempts: number }>();

export async function POST(req: Request) {
  try {
    const { phone, code, action } = await req.json();

    if (action === 'send') {
      const existing = otpStore.get(phone);
      if (existing && existing.lockUntil && existing.lockUntil > Date.now()) {
        const remainingMinutes = Math.ceil((existing.lockUntil - Date.now()) / 60000);
        return NextResponse.json({ error: `Locked. Try again in ${remainingMinutes} minutes.` }, { status: 429 });
      }

      // Generate 6 digit mock OTP
      const mockCode = Math.floor(100000 + Math.random() * 900000).toString();
      otpStore.set(phone, {
        code: mockCode,
        expiresAt: Date.now() + 3 * 60000, // 3 minutes validity
        attempts: (existing?.attempts || 0) + 1
      });

      console.log(`[MOCK SMS SERVICE] Sending OTP to ${phone}: ${mockCode}`);
      return NextResponse.json({ message: 'OTP sent successfully' });
    }

    if (action === 'verify') {
      const record = otpStore.get(phone);
      
      if (!record) {
        return NextResponse.json({ error: 'No OTP requested for this number' }, { status: 400 });
      }

      if (record.lockUntil && record.lockUntil > Date.now()) {
        return NextResponse.json({ error: 'Too many attempts. Account locked for 15 minutes.' }, { status: 429 });
      }

      if (Date.now() > record.expiresAt) {
        return NextResponse.json({ error: 'OTP expired' }, { status: 400 });
      }

      if (record.code !== code) {
        if (record.attempts >= 3) {
           otpStore.set(phone, { ...record, lockUntil: Date.now() + 15 * 60000 }); // 15 mins lock
           return NextResponse.json({ error: 'Too many failed attempts. Locked for 15 minutes.' }, { status: 429 });
        }
        otpStore.set(phone, { ...record, attempts: record.attempts + 1 });
        return NextResponse.json({ error: 'Invalid OTP' }, { status: 400 });
      }

      otpStore.delete(phone);
      return NextResponse.json({ message: 'Phone verified successfully' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
