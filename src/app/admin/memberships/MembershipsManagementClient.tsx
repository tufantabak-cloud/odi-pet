'use client'

import { useState, useEffect } from 'react'
import {
  Gift,
  Send,
  Users,
  User,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Sparkles,
  Award,
  PawPrint,
} from 'lucide-react'

interface SettingsState {
  welcome_credit_days: number
  per_pet_credit_days: number
  referee_welcome_days: number
  referral_tier_1_days: number
  referral_tier_2_bonus: number
  referral_tier_3_bonus: number
  referral_tier_4_bonus: number
  referral_tier_5_bonus: number
  monthly_invite_cap: number
}

interface RiskUser {
  id: string
  first_name: string | null
  last_name: string | null
  premium_until: string | null
  premium_tier: string | null
}

interface Props {
  riskUsers: RiskUser[]
}

export default function MembershipsManagementClient({ riskUsers }: Props) {
  // Settings State
  const [settings, setSettings] = useState<SettingsState>({
    welcome_credit_days: 90,
    per_pet_credit_days: 90,
    referee_welcome_days: 30,
    referral_tier_1_days: 30,
    referral_tier_2_bonus: 30,
    referral_tier_3_bonus: 60,
    referral_tier_4_bonus: 120,
    referral_tier_5_bonus: 300,
    monthly_invite_cap: 10,
  })
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsSuccess, setSettingsSuccess] = useState(false)

  // Single / Bulk Grant State
  const [grantMode, setGrantMode] = useState<'bulk_risk' | 'single' | 'custom_bulk'>('bulk_risk')
  const [singleUserId, setSingleUserId] = useState('')
  const [customUserIds, setCustomUserIds] = useState('')
  const [grantDays, setGrantDays] = useState(30)
  const [grantReason, setGrantReason] = useState('campaign')
  const [grantNote, setGrantNote] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/memberships/settings')
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) {
          setSettings(data)
        }
      })
      .catch(console.error)
  }, [])

  const handleSaveSettings = async () => {
    setSavingSettings(true)
    try {
      const res = await fetch('/api/admin/memberships/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (res.ok) {
        setSettingsSuccess(true)
        setTimeout(() => setSettingsSuccess(false), 3000)
      } else {
        alert('Ayarlar kaydedilemedi.')
      }
    } finally {
      setSavingSettings(false)
    }
  }

  const handleExecuteGrant = async () => {
    let targetIds: string[] = []

    if (grantMode === 'bulk_risk') {
      targetIds = riskUsers.map(u => u.id)
    } else if (grantMode === 'single') {
      if (!singleUserId.trim()) {
        alert('Lütfen geçerli bir Kullanıcı ID giriniz.')
        return
      }
      targetIds = [singleUserId.trim()]
    } else if (grantMode === 'custom_bulk') {
      targetIds = customUserIds
        .split(/[\n,]+/)
        .map(id => id.trim())
        .filter(Boolean)
    }

    if (targetIds.length === 0) {
      alert('Hedef kullanıcı bulunamadı.')
      return
    }

    if (!confirm(`${targetIds.length} kullanıcıya +${grantDays} gün hediye kredi yüklemek istediğinize emin misiniz?`)) {
      return
    }

    setIsSending(true)
    try {
      const res = await fetch('/api/admin/memberships/credit-grant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_ids: targetIds,
          days: grantDays,
          reason: grantReason,
          note: grantNote,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'İşlem başarısız')

      setToastMessage(`✓ ${data.count} kullanıcıya toplam +${data.totalDays} Gün başarıyla tanımlandı!`)
      setTimeout(() => setToastMessage(null), 4000)

      if (grantMode === 'single') setSingleUserId('')
      if (grantMode === 'custom_bulk') setCustomUserIds('')
      setGrantNote('')
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsSending(false)
    }
  }

  const getTargetCount = () => {
    if (grantMode === 'bulk_risk') return riskUsers.length
    if (grantMode === 'single') return singleUserId.trim() ? 1 : 0
    if (grantMode === 'custom_bulk') {
      return customUserIds.split(/[\n,]+/).map(i => i.trim()).filter(Boolean).length
    }
    return 0
  }

  const targetCount = getTargetCount()

  return (
    <div className="space-y-8">
      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl bg-emerald-600 text-white font-bold text-xs shadow-xl animate-fadeIn">
          {toastMessage}
        </div>
      )}

      {/* 1. Dinamik Davet, Pet & Hoş Geldin Kredi Ayarları */}
      <div className="card-base p-6 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="space-y-0.5">
            <span className="text-2xs font-extrabold text-primary uppercase tracking-wider">
              Dinamik Üyelik & Davet Kuralları
            </span>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-primary" />
              Kayıt, Pet Ekleme & Kademeli Davet Kredileri
            </h2>
          </div>

          <button
            onClick={handleSaveSettings}
            disabled={savingSettings}
            className="btn-primary py-2.5 px-5 text-xs font-bold rounded-2xl flex items-center gap-2 active:scale-[0.98] disabled:opacity-50"
          >
            {savingSettings ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            {settingsSuccess ? 'Ayarlar Kaydedildi ✓' : 'Tüm Ayarları Kaydet'}
          </button>
        </div>

        {/* Basic Rules Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-200/60 space-y-1">
            <label className="text-2xs font-bold text-purple-800 uppercase flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              Hoş Geldin Kredisi (Kayıtta)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="365"
                value={settings.welcome_credit_days}
                onChange={e => setSettings(s => ({ ...s, welcome_credit_days: Number(e.target.value) }))}
                className="input-base w-full py-2 px-3 text-sm font-black text-slate-900 rounded-xl"
              />
              <span className="text-xs font-bold text-slate-600">Gün</span>
            </div>
            <p className="text-2xs text-slate-500">Kullanıcı kaydolduğu an verilen karşılama süresi.</p>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/60 space-y-1">
            <label className="text-2xs font-bold text-amber-800 uppercase flex items-center gap-1">
              <PawPrint className="w-3.5 h-3.5 text-amber-600" />
              Her Bir Pet İçin İlave Kredi
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="365"
                value={settings.per_pet_credit_days}
                onChange={e => setSettings(s => ({ ...s, per_pet_credit_days: Number(e.target.value) }))}
                className="input-base w-full py-2 px-3 text-sm font-black text-slate-900 rounded-xl"
              />
              <span className="text-xs font-bold text-slate-600">Gün</span>
            </div>
            <p className="text-2xs text-slate-500">Eklenen her yeni evcil hayvan için verilen bonus.</p>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200/60 space-y-1">
            <label className="text-2xs font-bold text-emerald-800 uppercase flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-emerald-600" />
              Davet Edilene Verilen Kredi
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="365"
                value={settings.referee_welcome_days}
                onChange={e => setSettings(s => ({ ...s, referee_welcome_days: Number(e.target.value) }))}
                className="input-base w-full py-2 px-3 text-sm font-black text-slate-900 rounded-xl"
              />
              <span className="text-xs font-bold text-slate-600">Gün</span>
            </div>
            <p className="text-2xs text-slate-500">Davet koduyla kaydolan yeni üyenin alacağı süre.</p>
          </div>
        </div>

        {/* Progressive Tiered Referral Milestone Section */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <div className="space-y-0.5">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              Kademeli Nitelikli Davet Bonusu (Davet Eden İçin)
            </h3>
            <p className="text-xs text-slate-500">
              Davet edilen yeni kullanıcı nitelikli şartları sağladığında davet edenin kazanacağı toplam Pro gün sayısı.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Tier 1 */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-2xs font-bold text-slate-600 block">1. Yeni Üye</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0"
                  max="365"
                  value={settings.referral_tier_1_days}
                  onChange={e => setSettings(s => ({ ...s, referral_tier_1_days: Number(e.target.value) }))}
                  className="input-base w-full py-1.5 px-2 text-xs font-extrabold text-slate-900 rounded-lg text-center"
                />
                <span className="text-2xs font-bold text-slate-500">Gün</span>
              </div>
              <span className="text-3xs font-extrabold text-primary block text-center mt-1">
                Toplam: +{settings.referral_tier_1_days} Gün
              </span>
            </div>

            {/* Tier 2 */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-2xs font-bold text-slate-600 block">2. Yeni Üye (Bonus)</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0"
                  max="365"
                  value={settings.referral_tier_2_bonus}
                  onChange={e => setSettings(s => ({ ...s, referral_tier_2_bonus: Number(e.target.value) }))}
                  className="input-base w-full py-1.5 px-2 text-xs font-extrabold text-slate-900 rounded-lg text-center"
                />
                <span className="text-2xs font-bold text-slate-500">Bonus</span>
              </div>
              <span className="text-3xs font-extrabold text-amber-600 block text-center mt-1">
                Toplam: +{settings.referral_tier_1_days + settings.referral_tier_2_bonus} Gün
              </span>
            </div>

            {/* Tier 3 */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-2xs font-bold text-slate-600 block">3. Yeni Üye (Bonus)</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0"
                  max="365"
                  value={settings.referral_tier_3_bonus}
                  onChange={e => setSettings(s => ({ ...s, referral_tier_3_bonus: Number(e.target.value) }))}
                  className="input-base w-full py-1.5 px-2 text-xs font-extrabold text-slate-900 rounded-lg text-center"
                />
                <span className="text-2xs font-bold text-slate-500">Bonus</span>
              </div>
              <span className="text-3xs font-extrabold text-amber-600 block text-center mt-1">
                Toplam: +{settings.referral_tier_1_days + settings.referral_tier_3_bonus} Gün
              </span>
            </div>

            {/* Tier 4 */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-2xs font-bold text-slate-600 block">4. Yeni Üye (Bonus)</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0"
                  max="365"
                  value={settings.referral_tier_4_bonus}
                  onChange={e => setSettings(s => ({ ...s, referral_tier_4_bonus: Number(e.target.value) }))}
                  className="input-base w-full py-1.5 px-2 text-xs font-extrabold text-slate-900 rounded-lg text-center"
                />
                <span className="text-2xs font-bold text-slate-500">Bonus</span>
              </div>
              <span className="text-3xs font-extrabold text-amber-600 block text-center mt-1">
                Toplam: +{settings.referral_tier_1_days + settings.referral_tier_4_bonus} Gün
              </span>
            </div>

            {/* Tier 5 */}
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-300 space-y-1">
              <span className="text-2xs font-black text-amber-800 block">5. Yeni Üye (Süper Bonus)</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0"
                  max="365"
                  value={settings.referral_tier_5_bonus}
                  onChange={e => setSettings(s => ({ ...s, referral_tier_5_bonus: Number(e.target.value) }))}
                  className="input-base w-full py-1.5 px-2 text-xs font-black text-amber-900 rounded-lg text-center border-amber-300"
                />
                <span className="text-2xs font-bold text-amber-800">Bonus</span>
              </div>
              <span className="text-3xs font-black text-amber-700 block text-center mt-1">
                Toplam: +{settings.referral_tier_1_days + settings.referral_tier_5_bonus} Gün 👑
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Tekil ve Toplu Promosyon Gün Gönderme Aracı */}
      <div className="card-base p-6 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-6">
        <div className="space-y-1">
          <span className="text-2xs font-extrabold text-amber-600 uppercase tracking-wider">
            Promosyon Yönetimi
          </span>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Gift className="w-5 h-5 text-amber-500" />
            Tekil ve Toplu Promosyon Gün Gönder
          </h2>
          <p className="text-xs text-slate-500">
            İstediğiniz kullanıcıya veya toplu gruplara anında hediye Pro gün kredisi yükleyin.
          </p>
        </div>

        {/* Gönderim Modu Seçimi */}
        <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-2xl max-w-md">
          <button
            onClick={() => setGrantMode('bulk_risk')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
              grantMode === 'bulk_risk' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Churn Risk Grubu ({riskUsers.length})
          </button>
          <button
            onClick={() => setGrantMode('single')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
              grantMode === 'single' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tek Kullanıcı
          </button>
          <button
            onClick={() => setGrantMode('custom_bulk')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
              grantMode === 'custom_bulk' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Toplu Liste
          </button>
        </div>

        {/* Dynamic Target Input */}
        {grantMode === 'single' && (
          <div className="space-y-2 max-w-md">
            <label className="text-xs font-bold text-slate-700">Hedef Kullanıcı ID / UUID</label>
            <input
              type="text"
              placeholder="Örn: e6d2664a-2b26-45bb-83f6-ba25f44a0f4a"
              value={singleUserId}
              onChange={e => setSingleUserId(e.target.value)}
              className="input-base w-full py-2 px-3 text-xs rounded-xl font-mono"
            />
          </div>
        )}

        {grantMode === 'custom_bulk' && (
          <div className="space-y-2 max-w-lg">
            <label className="text-xs font-bold text-slate-700">Kullanıcı ID Listesi (Virgül veya Yeni Satır ile Ayrılmış)</label>
            <textarea
              rows={3}
              placeholder="id_1, id_2, id_3..."
              value={customUserIds}
              onChange={e => setCustomUserIds(e.target.value)}
              className="input-base w-full p-3 text-xs rounded-xl font-mono"
            />
          </div>
        )}

        {/* Gün Sayısı Seçimi */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700">Gönderilecek Gün Sayısı</label>
          <div className="flex items-center gap-2 flex-wrap">
            {[15, 30, 60, 90, 180, 300, 330].map(d => (
              <button
                key={d}
                onClick={() => setGrantDays(d)}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold border transition-all ${
                  grantDays === d
                    ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                +{d} Gün
              </button>
            ))}
            <input
              type="number"
              min="1"
              max="365"
              value={grantDays}
              onChange={e => setGrantDays(Number(e.target.value))}
              className="input-base w-24 py-1.5 px-3 text-xs font-extrabold rounded-xl"
            />
          </div>
        </div>

        {/* Gerekçe & Not */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
          <div className="space-y-1">
            <label className="text-2xs font-bold text-slate-500 uppercase">Gerekçe / Nedeni</label>
            <select
              value={grantReason}
              onChange={e => setGrantReason(e.target.value)}
              className="input-base w-full py-2 px-3 text-xs font-bold rounded-xl"
            >
              <option value="campaign">Promosyon Kampanyası</option>
              <option value="admin_grant">Özel Admin Hediyesi</option>
              <option value="milestone">Kilometre Taşı Ödülü</option>
              <option value="support_apology">Sistem Özrü / Destek Telafisi</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-2xs font-bold text-slate-500 uppercase">Özel Not (Opsiyonel)</label>
            <input
              type="text"
              placeholder="Örn: 2026 Ağustos Özel Kampanyası"
              value={grantNote}
              onChange={e => setGrantNote(e.target.value)}
              className="input-base w-full py-2 px-3 text-xs rounded-xl"
            />
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between flex-wrap gap-4">
          <div className="text-xs text-slate-600 font-medium">
            Önizleme: <span className="font-bold text-slate-900">{targetCount} Kullanıcıya</span> kişi başı <span className="font-bold text-amber-600">+{grantDays} Gün</span> (Toplam <span className="font-extrabold text-slate-900">{targetCount * grantDays} Gün</span>)
          </div>

          <button
            onClick={handleExecuteGrant}
            disabled={isSending || targetCount === 0}
            className="btn-primary py-3 px-6 text-xs font-extrabold rounded-2xl flex items-center gap-2 active:scale-[0.98] disabled:opacity-50"
          >
            {isSending ? <RotateCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {targetCount} Kullanıcıya Gün Gönder
          </button>
        </div>
      </div>
    </div>
  )
}
