'use client';

import React, { useState } from 'react';
import { X, Scale, Utensils, Award, Sparkles } from 'lucide-react';

export type TaskModalType =
  | 'WEIGHT_MODAL'
  | 'DAILY_MEALS_MODAL'
  | 'FOOD_AMOUNT_MODAL'
  | 'NUTRITION_TYPE_MODAL'
  | null;

interface PetTaskModalsProps {
  petId: string;
  petName: string;
  activeModal: TaskModalType;
  onClose: () => void;
  onSuccess: () => void;
}

export function PetTaskModals({
  petId,
  petName,
  activeModal,
  onClose,
  onSuccess,
}: PetTaskModalsProps) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [weightKg, setWeightKg] = useState<string>('');
  const [measuredAt, setMeasuredAt] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const [mealsPerDay, setMealsPerDay] = useState<number>(2);

  const [dailyGrams, setDailyGrams] = useState<string>('');

  const [foodType, setFoodType] = useState<string>('Kuru mama');

  if (!activeModal) return null;

  // 1. Kilo Kaydı
  const handleWeightSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericWeight = parseFloat(weightKg.replace(',', '.'));
    if (isNaN(numericWeight) || numericWeight <= 0) {
      setErrorMsg('Lütfen geçerli bir kilo değeri girin.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/pets/${petId}/measurements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          measurement_type: 'weight',
          value: numericWeight,
          unit: 'kg',
          measured_at: new Date(measuredAt).toISOString(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Kilo kaydı oluşturulamadı.');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Öğün Sayısı Kaydı
  const handleMealsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/pets/${petId}/nutrition/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meals_per_day: mealsPerDay,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Öğün sayısı kaydedilemedi.');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Mama Miktarı (Gram) Kaydı
  const handleAmountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const grams = parseInt(dailyGrams, 10);
    if (isNaN(grams) || grams <= 0) {
      setErrorMsg('Lütfen geçerli bir gramaj girin (ör: 120).');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/pets/${petId}/nutrition/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          daily_grams: grams,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Mama miktarı kaydedilemedi.');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  // 4. Beslenme Tipi Kaydı
  const handleFoodTypeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foodType) {
      setErrorMsg('Lütfen bir beslenme tipi seçin.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/pets/${petId}/nutrition/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          food_type: foodType,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Beslenme tipi kaydedilemedi.');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const FOOD_TYPE_OPTIONS = [
    'Kuru mama',
    'Yaş mama',
    'Karma (Kuru & Yaş)',
    'Ev yapımı',
    'Veteriner diyeti',
    'Çiğ beslenme',
    'Diğer',
  ];

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden border border-[#E2E0FA] transition-all transform animate-in slide-in-from-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 px-5 border-b border-[#F0EEFC] bg-gradient-to-r from-[#F7F6FF] to-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#EEEDFE] text-[#534AB7] flex items-center justify-center font-bold">
              {activeModal === 'WEIGHT_MODAL' && <Scale size={18} />}
              {activeModal === 'DAILY_MEALS_MODAL' && <Utensils size={18} />}
              {activeModal === 'FOOD_AMOUNT_MODAL' && <Award size={18} />}
              {activeModal === 'NUTRITION_TYPE_MODAL' && <Sparkles size={18} />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#26215C] leading-tight">
                {activeModal === 'WEIGHT_MODAL' && `${petName} için Kilo Bilgisi`}
                {activeModal === 'DAILY_MEALS_MODAL' && `${petName} için Günlük Öğün`}
                {activeModal === 'FOOD_AMOUNT_MODAL' && `${petName} için Mama Miktarı`}
                {activeModal === 'NUTRITION_TYPE_MODAL' && `${petName} için Beslenme Tipi`}
              </h3>
              <p className="text-[11px] text-[#6F6B99] font-medium">Profilini güçlendir</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#908CB5] hover:bg-[#F3F2FD] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 max-h-[80vh] overflow-y-auto">
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-600">
              {errorMsg}
            </div>
          )}

          {/* 1. KİLO MODALI */}
          {activeModal === 'WEIGHT_MODAL' && (
            <form onSubmit={handleWeightSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#26215C] mb-1.5">
                  Güncel Kilo (kg) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.05"
                  min="0.1"
                  max="150"
                  required
                  placeholder="Örn: 4.5"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-[#DCD9F5] focus:border-[#534AB7] focus:ring-2 focus:ring-[#534AB7]/20 outline-none text-sm font-semibold text-[#26215C]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#26215C] mb-1.5">
                  Ölçüm Tarihi
                </label>
                <input
                  type="date"
                  value={measuredAt}
                  onChange={(e) => setMeasuredAt(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-[#DCD9F5] focus:border-[#534AB7] focus:ring-2 focus:ring-[#534AB7]/20 outline-none text-sm font-semibold text-[#26215C]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="py-2.5 px-4 rounded-xl border border-[#DCD9F5] text-xs font-bold text-[#6F6B99] hover:bg-gray-50 transition-colors"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="py-2.5 px-5 rounded-xl bg-[#534AB7] hover:bg-[#443C9E] text-white text-xs font-bold transition-all disabled:opacity-50"
                >
                  {loading ? 'Kaydediliyor...' : 'Kilo Kaydet'}
                </button>
              </div>
            </form>
          )}

          {/* 2. ÖĞÜN SAYISI MODALI */}
          {activeModal === 'DAILY_MEALS_MODAL' && (
            <form onSubmit={handleMealsSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#26215C] mb-2">
                  Günlük Öğün Sayısı
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setMealsPerDay(num)}
                      className={`h-11 rounded-xl text-sm font-bold border transition-all ${
                        mealsPerDay === num
                          ? 'bg-[#534AB7] text-white border-[#534AB7] shadow-sm scale-[1.02]'
                          : 'bg-white text-[#26215C] border-[#DCD9F5] hover:border-[#534AB7]/50'
                      }`}
                    >
                      {num} Öğün
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="py-2.5 px-4 rounded-xl border border-[#DCD9F5] text-xs font-bold text-[#6F6B99] hover:bg-gray-50 transition-colors"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="py-2.5 px-5 rounded-xl bg-[#534AB7] hover:bg-[#443C9E] text-white text-xs font-bold transition-all disabled:opacity-50"
                >
                  {loading ? 'Kaydediliyor...' : 'Öğün Kaydet'}
                </button>
              </div>
            </form>
          )}

          {/* 3. MAMA MİKTARI (GRAM) MODALI */}
          {activeModal === 'FOOD_AMOUNT_MODAL' && (
            <form onSubmit={handleAmountSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#26215C] mb-1.5">
                  Günlük Toplam Mama Miktarı (Gram) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="5000"
                    required
                    placeholder="Örn: 150"
                    value={dailyGrams}
                    onChange={(e) => setDailyGrams(e.target.value)}
                    className="w-full h-11 px-3.5 pr-14 rounded-xl border border-[#DCD9F5] focus:border-[#534AB7] focus:ring-2 focus:ring-[#534AB7]/20 outline-none text-sm font-semibold text-[#26215C]"
                  />
                  <span className="absolute right-3.5 top-3 text-xs font-bold text-[#6F6B99]">
                    gram (g)
                  </span>
                </div>
                <p className="text-[11px] text-[#6F6B99] mt-1.5 font-medium">
                  Bir günde tükettiği toplam mama gramajını girin.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="py-2.5 px-4 rounded-xl border border-[#DCD9F5] text-xs font-bold text-[#6F6B99] hover:bg-gray-50 transition-colors"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="py-2.5 px-5 rounded-xl bg-[#534AB7] hover:bg-[#443C9E] text-white text-xs font-bold transition-all disabled:opacity-50"
                >
                  {loading ? 'Kaydediliyor...' : 'Miktar Kaydet'}
                </button>
              </div>
            </form>
          )}

          {/* 4. BESLENME TİPİ MODALI */}
          {activeModal === 'NUTRITION_TYPE_MODAL' && (
            <form onSubmit={handleFoodTypeSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#26215C] mb-2">
                  Beslenme Tipi Seçin
                </label>
                <div className="space-y-2">
                  {FOOD_TYPE_OPTIONS.map((option) => (
                    <label
                      key={option}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                        foodType === option
                          ? 'border-[#534AB7] bg-[#EEEDFE]/30 font-bold text-[#26215C]'
                          : 'border-[#DCD9F5] hover:border-[#534AB7]/50 text-[#6F6B99]'
                      }`}
                    >
                      <span className="text-xs font-semibold">{option}</span>
                      <input
                        type="radio"
                        name="foodType"
                        value={option}
                        checked={foodType === option}
                        onChange={() => setFoodType(option)}
                        className="w-4 h-4 text-[#534AB7] accent-[#534AB7]"
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="py-2.5 px-4 rounded-xl border border-[#DCD9F5] text-xs font-bold text-[#6F6B99] hover:bg-gray-50 transition-colors"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="py-2.5 px-5 rounded-xl bg-[#534AB7] hover:bg-[#443C9E] text-white text-xs font-bold transition-all disabled:opacity-50"
                >
                  {loading ? 'Kaydediliyor...' : 'Tipi Kaydet'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
