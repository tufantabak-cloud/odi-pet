'use client';
import React, { useState, useEffect } from 'react';

export const OTPVerification = ({ onNext }: { onNext: () => void }) => {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [countdown, setCountdown] = useState(180); // 3 mins
  const [error, setError] = useState('');

  useEffect(() => {
    let timer: any;
    if (step === 'code' && countdown > 0) {
      timer = setInterval(() => setCountdown(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  const handleSend = async () => {
    setError('');
    try {
      const res = await fetch('/api/v1/reports/lost/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, action: 'send' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStep('code');
      setCountdown(180);
    } catch (err: any) {
      setError(err.message || 'Hata oluştu');
    }
  };

  const handleVerify = async () => {
    setError('');
    try {
      const res = await fetch('/api/v1/reports/lost/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code, action: 'verify' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onNext();
    } catch (err: any) {
      setError(err.message || 'Kod hatalı');
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-bold">İletişim Doğrulaması</h2>
      
      {step === 'phone' ? (
        <div className="flex flex-col gap-2">
          <input type="tel" placeholder="Telefon (5XX XXX XX XX)" className="border p-2 rounded" value={phone} onChange={e => setPhone(e.target.value)} />
          <button onClick={handleSend} className="bg-black text-white p-2 rounded font-medium mt-2">Doğrulama Kodu Gönder</button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-sm">Kodu giriniz (Kalan süre: {formatTime(countdown)})</p>
          <input type="text" placeholder="6 Haneli Kod" className="border p-2 rounded text-center tracking-widest text-lg" maxLength={6} value={code} onChange={e => setCode(e.target.value)} />
          <button onClick={handleVerify} disabled={countdown === 0} className="bg-black text-white p-2 rounded font-medium mt-2 disabled:opacity-50">Doğrula ve Devam Et</button>
          {countdown === 0 && <button onClick={handleSend} className="text-blue-500 text-sm">Kodu Tekrar Gönder</button>}
        </div>
      )}
      {error && <div className="text-red-500 text-sm">{error}</div>}
    </div>
  );
};
