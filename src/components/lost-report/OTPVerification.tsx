'use client';

import React, { useState, useEffect } from 'react';
import { Phone, CheckCircle2, AlertTriangle, Edit2, Send } from 'lucide-react';

interface OTPVerificationProps {
  userPhone?: string;
  isPhoneConfirmed?: boolean;
  onNext: (phone: string) => void;
}

export const OTPVerification = ({
  userPhone,
  isPhoneConfirmed = false,
  onNext,
}: OTPVerificationProps) => {
  const [phone, setPhone] = useState(userPhone || '');
  const [editingPhone, setEditingPhone] = useState(!userPhone);
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [countdown, setCountdown] = useState(180); // 3 mins
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 'code' && countdown > 0) {
      timer = setInterval(() => setCountdown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  const handleSend = async () => {
    if (!phone || phone.trim().length < 10) {
      setError('Lütfen geçerli bir telefon numarası girin (Örn: 5XX XXX XX XX).');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/v1/reports/lost/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, action: 'send' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Doğrulama kodu gönderilemedi.');
      if (data.alreadyVerified) {
        onNext(data.phone);
        return;
      }
      setStep('code');
      setCountdown(180);
    } catch (err: any) {
      setError(err.message || 'Hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!code || code.length < 6) {
      setError('Lütfen 6 haneli doğrulama kodunu girin.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/v1/reports/lost/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code, action: 'verify' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Kod geçersiz.');
      onNext(data.phone);
    } catch (err: any) {
      setError(err.message || 'Kod hatalı.');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900">İletişim Doğrulaması</h2>
        <p className="text-sm text-slate-500 mt-1">
          Kayıp ilanın ile iletişim kurmak isteyenlerin sana ulaşabilmesi için telefon numaranız.
        </p>
      </div>

      {step === 'phone' ? (
        !editingPhone && userPhone ? (
          /* Pre-filled Registered Phone Card */
          <div className="flex flex-col gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-medium">Kayıtlı İletişim Numarası</div>
                  <div className="text-base font-bold text-slate-900">{userPhone}</div>
                </div>
              </div>
              {isPhoneConfirmed ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Doğrulanmış
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full">
                  <AlertTriangle className="w-3.5 h-3.5" /> Doğrulanmamış
                </span>
              )}
            </div>

            {isPhoneConfirmed ? (
              <button
                onClick={() => onNext(userPhone)}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 rounded-xl transition-all active:scale-[0.98] shadow-sm mt-1"
              >
                Devam Et (Bu Numarayı Kullan)
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={loading}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-xl transition-all active:scale-[0.98] shadow-sm disabled:opacity-50 mt-1 flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                {loading ? 'Kod Gönderiliyor...' : 'Doğrulama Kodu Gönder'}
              </button>
            )}

            <button
              type="button"
              onClick={() => setEditingPhone(true)}
              className="inline-flex items-center justify-center gap-1 text-xs text-purple-600 font-semibold hover:underline mt-1"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Farklı bir numara kullanmak istiyorum
            </button>
          </div>
        ) : (
          /* Phone Input Form */
          <div className="flex flex-col gap-3">
            <label className="text-xs font-semibold text-slate-700">
              İletişim Telefon Numarası
            </label>
            <input
              type="tel"
              placeholder="5XX XXX XX XX"
              className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none font-mono"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />

            <button
              onClick={handleSend}
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 rounded-xl transition-all active:scale-[0.98] shadow-sm disabled:opacity-50 mt-1"
            >
              {loading ? 'Kod Gönderiliyor...' : 'Doğrulama Kodu Gönder'}
            </button>

            {userPhone && (
              <button
                type="button"
                onClick={() => {
                  setPhone(userPhone);
                  setEditingPhone(false);
                }}
                className="text-xs text-purple-600 font-semibold hover:underline text-center mt-1"
              >
                Kayıtlı numarama dön ({userPhone})
              </button>
            )}
          </div>
        )
      ) : (
        /* OTP 6-Digit Code Input */
        <div className="flex flex-col gap-3">
          <div className="text-sm text-slate-600 bg-purple-50 p-3 rounded-xl border border-purple-100">
            <span className="font-semibold text-purple-900">{phone}</span> numarasına gönderilen 6 haneli doğrulama kodunu giriniz.
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Kalan Süre:</span>
            <span className="font-mono text-purple-700 font-bold">{formatTime(countdown)}</span>
          </div>

          <input
            type="text"
            placeholder="6 Haneli Kod"
            className="w-full border border-slate-300 rounded-xl p-3 text-center tracking-widest text-xl font-bold font-mono focus:ring-2 focus:ring-purple-500 focus:outline-none"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />

          <button
            onClick={handleVerify}
            disabled={loading || countdown === 0}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 rounded-xl transition-all active:scale-[0.98] shadow-sm disabled:opacity-50 mt-1"
          >
            {loading ? 'Doğrulanıyor...' : 'Doğrula ve Devam Et'}
          </button>

          {countdown === 0 && (
            <button
              onClick={handleSend}
              disabled={loading}
              className="text-xs text-purple-600 font-semibold hover:underline text-center mt-1"
            >
              Kodu Tekrar Gönder
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="text-red-500 text-xs font-medium bg-red-50 p-2.5 rounded-xl border border-red-100">
          {error}
        </div>
      )}
    </div>
  );
};
