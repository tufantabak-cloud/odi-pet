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
  Search,
  Check,
  X,
  Filter,
  UserCheck,
  UserPlus,
  Globe,
  Crown,
  ShieldCheck,
  Stethoscope,
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

type GrantMode =
  | 'target_all'
  | 'target_free'
  | 'target_active'
  | 'bulk_risk'
  | 'target_role'
  | 'target_picker'
  | 'single'
  | 'custom_bulk'

interface UserSearchResult {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  role: string | null
  premium_until: string | null
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

  // Promotion Grant State
  const [grantMode, setGrantMode] = useState<GrantMode>('bulk_risk')
  const [roleGroup, setRoleGroup] = useState<'owner' | 'vet' | 'admin'>('owner')
  const [singleUserId, setSingleUserId] = useState('')
  const [customUserIds, setCustomUserIds] = useState('')
  const [grantDays, setGrantDays] = useState(30)
  const [grantReason, setGrantReason] = useState('campaign')
  const [grantNote, setGrantNote] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // User Picker State (Interactive Multi-Select with Search)
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [userSearchResults, setUserSearchResults] = useState<UserSearchResult[]>([])
  const [loadingUserSearch, setLoadingUserSearch] = useState(false)
  const [selectedPickerUsers, setSelectedPickerUsers] = useState<
    Map<string, { name: string; email: string; role: string }>
  >(new Map())

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

  // Live User Search for Picker Mode
  useEffect(() => {
    if (grantMode !== 'target_picker') return

    let isMounted = true
    setLoadingUserSearch(true)

    const timer = setTimeout(() => {
      fetch(`/api/admin/users?search=${encodeURIComponent(userSearchQuery)}&page=1`)
        .then(res => res.json())
        .then(data => {
          if (isMounted && data?.users) {
            setUserSearchResults(data.users)
          }
        })
        .catch(console.error)
        .finally(() => {
          if (isMounted) setLoadingUserSearch(false)
        })
    }, 300)

    return () => {
      isMounted = false
      clearTimeout(timer)
    }
  }, [userSearchQuery, grantMode])

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

  const togglePickerUser = (user: UserSearchResult) => {
    setSelectedPickerUsers(prev => {
      const next = new Map(prev)
      if (next.has(user.id)) {
        next.delete(user.id)
      } else {
        const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'İsimsiz'
        const email = user.email || user.id
        next.set(user.id, { name, email, role: user.role || 'owner' })
      }
      return next
    })
  }

  const selectAllSearchResults = () => {
    setSelectedPickerUsers(prev => {
      const next = new Map(prev)
      userSearchResults.forEach(user => {
        const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'İsimsiz'
        const email = user.email || user.id
        next.set(user.id, { name, email, role: user.role || 'owner' })
      })
      return next
    })
  }

  const clearPickerSelection = () => {
    setSelectedPickerUsers(new Map())
  }

  const handleExecuteGrant = async () => {
    const payload: any = {
      days: grantDays,
      reason: grantReason,
      note: grantNote,
    }

    let targetSummaryLabel = ''

    if (grantMode === 'target_all') {
      payload.target_mode = 'all'
      targetSummaryLabel = 'Tüm Sistem Kullanıcıları (Hepsi)'
    } else if (grantMode === 'target_free') {
      payload.target_mode = 'free'
      targetSummaryLabel = 'Tüm Ücretsiz (Free) Kullanıcılar'
    } else if (grantMode === 'target_active') {
      payload.target_mode = 'active_premium'
      targetSummaryLabel = 'Tüm Aktif Pro Kullanıcıları'
    } else if (grantMode === 'bulk_risk') {
      payload.target_mode = 'churn_risk'
      targetSummaryLabel = `Churn Riski Taşıyanlar (${riskUsers.length} Kullanıcı)`
    } else if (grantMode === 'target_role') {
      payload.target_mode = `role_${roleGroup}`
      const roleMap = { owner: 'Evcil Hayvan Sahipleri', vet: 'Veteriner Hekimler', admin: 'Yöneticiler' }
      targetSummaryLabel = `Tüm ${roleMap[roleGroup]}`
    } else if (grantMode === 'target_picker') {
      const ids = Array.from(selectedPickerUsers.keys())
      if (ids.length === 0) {
        alert('Lütfen listeden en az 1 kullanıcı seçiniz.')
        return
      }
      payload.user_ids = ids
      targetSummaryLabel = `${ids.length} Seçilen Kullanıcı`
    } else if (grantMode === 'single') {
      if (!singleUserId.trim()) {
        alert('Lütfen geçerli bir Kullanıcı ID veya E-posta giriniz.')
        return
      }
      payload.user_ids = [singleUserId.trim()]
      targetSummaryLabel = `1 Kullanıcı (${singleUserId.trim()})`
    } else if (grantMode === 'custom_bulk') {
      const ids = customUserIds
        .split(/[\n,]+/)
        .map(id => id.trim())
        .filter(Boolean)
      if (ids.length === 0) {
        alert('Lütfen en az 1 kullanıcı ID/E-posta adresi giriniz.')
        return
      }
      payload.user_ids = ids
      targetSummaryLabel = `${ids.length} Manuel Kullanıcı`
    }

    if (
      !confirm(
        `"${targetSummaryLabel}" hedefine kişi başı +${grantDays} Gün hediye Pro kredi tanımlamak istediğinize emin misiniz?`
      )
    ) {
      return
    }

    setIsSending(true)
    try {
      const res = await fetch('/api/admin/memberships/credit-grant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'İşlem başarısız')

      setToastMessage(`✓ ${data.count} kullanıcıya toplam +${data.totalDays} Gün başarıyla tanımlandı!`)
      setTimeout(() => setToastMessage(null), 4000)

      if (grantMode === 'single') setSingleUserId('')
      if (grantMode === 'custom_bulk') setCustomUserIds('')
      if (grantMode === 'target_picker') setSelectedPickerUsers(new Map())
      setGrantNote('')
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsSending(false)
    }
  }

  const getTargetSummaryText = () => {
    if (grantMode === 'target_all') return 'Tüm Sistem Kullanıcıları (Toplu Gönderim)'
    if (grantMode === 'target_free') return 'Tüm Ücretsiz (Free) Kullanıcılar'
    if (grantMode === 'target_active') return 'Tüm Aktif Pro Kullanıcıları'
    if (grantMode === 'bulk_risk') return `Churn Riski Taşıyanlar (${riskUsers.length} Kullanıcı)`
    if (grantMode === 'target_role') {
      const roleMap = { owner: 'Evcil Hayvan Sahipleri', vet: 'Veteriner Hekimler', admin: 'Yöneticiler' }
      return `Tüm ${roleMap[roleGroup]} Rolündekiler`
    }
    if (grantMode === 'target_picker')
      return selectedPickerUsers.size > 0
        ? `${selectedPickerUsers.size} Seçilen Kullanıcı`
        : 'Henüz kullanıcı seçilmedi'
    if (grantMode === 'single')
      return singleUserId.trim() ? `1 Kullanıcı (${singleUserId.trim()})` : '0 Kullanıcı (ID/E-posta eksik)'
    if (grantMode === 'custom_bulk') {
      const count = customUserIds.split(/[\n,]+/).map(i => i.trim()).filter(Boolean).length
      return count > 0 ? `${count} Kullanıcı (Manuel Liste)` : '0 Kullanıcı (Liste boş)'
    }
    return 'Seçim Yapılmadı'
  }

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
              <span className="text-2xs font-extrabold text-primary block text-center mt-1">
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
              <span className="text-2xs font-extrabold text-amber-600 block text-center mt-1">
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
              <span className="text-2xs font-extrabold text-amber-600 block text-center mt-1">
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
              <span className="text-2xs font-extrabold text-amber-600 block text-center mt-1">
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
              <span className="text-2xs font-black text-amber-700 block text-center mt-1">
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
            Tüm kullanıcılara, belirli gruplara veya seçeceğiniz kişilere anında hediye Pro gün kredisi yükleyin.
          </p>
        </div>

        {/* Gönderim Modu & Hedef Kitle Seçimi (Kategorize Edilmiş Butonlar) */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-slate-700 block">Hedef Kitle & Gönderim Tipi Seçimi</label>

          {/* Toplu Gruplar */}
          <div className="space-y-1.5">
            <span className="text-2xs font-extrabold text-slate-400 uppercase tracking-widest block">
              1. Toplu Kitle Grupları
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              <button
                type="button"
                onClick={() => setGrantMode('target_all')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
                  grantMode === 'target_all'
                    ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Globe className="w-4 h-4" />
                <span>Tüm Kullanıcılar (Hepsi)</span>
              </button>

              <button
                type="button"
                onClick={() => setGrantMode('target_free')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
                  grantMode === 'target_free'
                    ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Ücretsiz (Free) Üyeler</span>
              </button>

              <button
                type="button"
                onClick={() => setGrantMode('target_active')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
                  grantMode === 'target_active'
                    ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Crown className="w-4 h-4" />
                <span>Aktif Pro Kullanıcılar</span>
              </button>

              <button
                type="button"
                onClick={() => setGrantMode('bulk_risk')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
                  grantMode === 'bulk_risk'
                    ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <AlertTriangle className="w-4 h-4" />
                <span>Churn Riski ({riskUsers.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setGrantMode('target_role')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
                  grantMode === 'target_role'
                    ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Filter className="w-4 h-4" />
                <span>Rol Bazlı Gruplama</span>
              </button>
            </div>
          </div>

          {/* Seçmeli & Tekil İşlemler */}
          <div className="space-y-1.5 pt-1">
            <span className="text-2xs font-extrabold text-slate-400 uppercase tracking-widest block">
              2. Özel Seçim ve Tekil Gönderimler
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setGrantMode('target_picker')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
                  grantMode === 'target_picker'
                    ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <UserCheck className="w-4 h-4" />
                <span>İnteraktif Kullanıcı Seçici ({selectedPickerUsers.size})</span>
              </button>

              <button
                type="button"
                onClick={() => setGrantMode('single')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
                  grantMode === 'single'
                    ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <User className="w-4 h-4" />
                <span>Tek Kullanıcı (ID / E-posta)</span>
              </button>

              <button
                type="button"
                onClick={() => setGrantMode('custom_bulk')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
                  grantMode === 'custom_bulk'
                    ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <UserPlus className="w-4 h-4" />
                <span>Özel Manuel Liste</span>
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Inputs Based on Grant Mode */}
        {grantMode === 'target_role' && (
          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-3">
            <label className="text-xs font-bold text-amber-900 block">Hedef Rol Grubunu Seçin</label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setRoleGroup('owner')}
                className={`py-2 px-4 rounded-xl text-xs font-extrabold flex items-center gap-2 border transition-all ${
                  roleGroup === 'owner' ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-slate-700 border-slate-200'
                }`}
              >
                <PawPrint className="w-3.5 h-3.5" />
                <span>Evcil Hayvan Sahipleri (Owner)</span>
              </button>

              <button
                type="button"
                onClick={() => setRoleGroup('vet')}
                className={`py-2 px-4 rounded-xl text-xs font-extrabold flex items-center gap-2 border transition-all ${
                  roleGroup === 'vet' ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-slate-700 border-slate-200'
                }`}
              >
                <Stethoscope className="w-3.5 h-3.5" />
                <span>Veteriner Hekimler (Vet)</span>
              </button>

              <button
                type="button"
                onClick={() => setRoleGroup('admin')}
                className={`py-2 px-4 rounded-xl text-xs font-extrabold flex items-center gap-2 border transition-all ${
                  roleGroup === 'admin' ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-slate-700 border-slate-200'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Yöneticiler (Admin / Founder)</span>
              </button>
            </div>
          </div>
        )}

        {/* İnteraktif Kullanıcı Seçici (Live User Picker UI) */}
        {grantMode === 'target_picker' && (
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="İsim, soyisim veya e-posta ile canlı arayın..."
                  value={userSearchQuery}
                  onChange={e => setUserSearchQuery(e.target.value)}
                  className="input-base w-full py-2 pl-9 pr-3 text-xs rounded-xl"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={selectAllSearchResults}
                  disabled={userSearchResults.length === 0}
                  className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                >
                  Sonuçlardaki Tümünü Seç
                </button>
                <button
                  type="button"
                  onClick={clearPickerSelection}
                  disabled={selectedPickerUsers.size === 0}
                  className="px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                >
                  Seçimi Temizle
                </button>
              </div>
            </div>

            {/* Arama Sonuçları Listesi */}
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {loadingUserSearch ? (
                <div className="p-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                  <RotateCw className="w-4 h-4 animate-spin text-amber-500" />
                  <span>Kullanıcılar aranıyor...</span>
                </div>
              ) : userSearchResults.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  {userSearchQuery ? 'Arama kriterine uygun kullanıcı bulunamadı.' : 'Arama yapmak için yukarıya isim veya e-posta yazın.'}
                </div>
              ) : (
                userSearchResults.map(u => {
                  const fullName = [u.first_name, u.last_name].filter(Boolean).join(' ') || 'İsimsiz'
                  const isChecked = selectedPickerUsers.has(u.id)
                  return (
                    <div
                      key={u.id}
                      onClick={() => togglePickerUser(u)}
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-amber-50/80 border-amber-300'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="w-4 h-4 rounded text-amber-500 accent-amber-500 cursor-pointer"
                        />
                        <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 text-xs font-extrabold flex items-center justify-center shrink-0">
                          {(fullName[0] || u.email?.[0] || '?').toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-slate-900 block truncate">{fullName}</span>
                          <span className="text-2xs text-slate-500 block truncate">{u.email || u.id}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-2xs font-extrabold uppercase">
                          {u.role || 'owner'}
                        </span>
                        {u.premium_until && new Date(u.premium_until) > new Date() ? (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 text-2xs font-extrabold">
                            PRO
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-2xs font-bold">
                            FREE
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Seçilen Kullanıcı Çipleri / Etiketleri */}
            {selectedPickerUsers.size > 0 && (
              <div className="pt-2 border-t border-slate-200 space-y-2">
                <span className="text-xs font-bold text-slate-700 block">
                  Seçilen Kullanıcılar ({selectedPickerUsers.size} Kişi):
                </span>
                <div className="flex items-center gap-2 flex-wrap max-h-28 overflow-y-auto">
                  {Array.from(selectedPickerUsers.entries()).map(([id, info]) => (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-amber-300 text-xs font-bold text-slate-800 shadow-2xs"
                    >
                      <span>{info.name}</span>
                      <span className="text-2xs text-slate-400">({info.email})</span>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation()
                          setSelectedPickerUsers(prev => {
                            const next = new Map(prev)
                            next.delete(id)
                            return next
                          })
                        }}
                        className="text-slate-400 hover:text-rose-600 ml-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {grantMode === 'single' && (
          <div className="space-y-2 max-w-md">
            <label className="text-xs font-bold text-slate-700">Hedef Kullanıcı E-postası veya UUID</label>
            <input
              type="text"
              placeholder="Örn: tufan.tabak@gmail.com veya UUID"
              value={singleUserId}
              onChange={e => setSingleUserId(e.target.value)}
              className="input-base w-full py-2 px-3 text-xs rounded-xl font-mono"
            />
          </div>
        )}

        {grantMode === 'custom_bulk' && (
          <div className="space-y-2 max-w-lg">
            <label className="text-xs font-bold text-slate-700">
              Kullanıcı E-Posta veya ID Listesi (Virgül veya Yeni Satır ile Ayrılmış)
            </label>
            <textarea
              rows={4}
              placeholder="kullanici1@gmail.com&#10;kullanici2@gmail.com&#10;e6d2664a-2b26-45bb-83f6-ba25f44a0f4a"
              value={customUserIds}
              onChange={e => setCustomUserIds(e.target.value)}
              className="input-base w-full p-3 text-xs rounded-xl font-mono"
            />
          </div>
        )}

        {/* Gün Sayısı Seçimi */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 block">Gönderilecek Pro Kredi Gün Sayısı</label>
          <div className="flex items-center gap-2 flex-wrap">
            {[7, 15, 30, 60, 90, 180, 365, 36500].map(d => (
              <button
                key={d}
                type="button"
                onClick={() => setGrantDays(d)}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold border transition-all ${
                  grantDays === d
                    ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {d === 36500 ? '♾️ Sonsuz (Ömür Boyu)' : `+${d} Gün ${d === 30 ? '(1 Ay)' : d === 90 ? '(3 Ay)' : d === 365 ? '(1 Yıl)' : ''}`}
              </button>
            ))}
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="1"
                max="36500"
                value={grantDays}
                onChange={e => setGrantDays(Number(e.target.value))}
                className="input-base w-24 py-1.5 px-3 text-xs font-extrabold rounded-xl"
              />
              <span className="text-xs font-bold text-slate-500">Özel Gün</span>
            </div>
          </div>
        </div>

        {/* Gerekçe & Not */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
          <div className="space-y-1">
            <label className="text-2xs font-bold text-slate-500 uppercase block">Gerekçe / Nedeni</label>
            <select
              value={grantReason}
              onChange={e => setGrantReason(e.target.value)}
              className="input-base w-full py-2 px-3 text-xs font-bold rounded-xl"
            >
              <option value="campaign">🎁 Promosyon Kampanyası</option>
              <option value="admin_grant">👑 Özel Admin Hediyesi</option>
              <option value="welcome_gift">🚀 Onboarding & Hoş Geldin Jesti</option>
              <option value="milestone">🏆 Kilometre Taşı / Sadakat Ödülü</option>
              <option value="support_apology">🛠️ Sistem Özrü / Destek Telafisi</option>
              <option value="seasonal_campaign">📢 Sezon / Özel Gün Kampanyası</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-2xs font-bold text-slate-500 uppercase block">Özel Not (Opsiyonel)</label>
            <input
              type="text"
              placeholder="Örn: 2026 Ağustos Özel Promosyonu"
              value={grantNote}
              onChange={e => setGrantNote(e.target.value)}
              className="input-base w-full py-2 px-3 text-xs rounded-xl"
            />
          </div>
        </div>

        {/* Action Button & Summary Banner */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-4">
          <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-xs text-slate-700">
            <span className="font-bold text-amber-900 block mb-0.5">Gönderim Özeti:</span>
            <span>Hedef: </span>
            <span className="font-extrabold text-slate-900">{getTargetSummaryText()}</span>
            <span> • Kişi Başı: </span>
            <span className="font-extrabold text-amber-600">+{grantDays} Gün Pro Kredi</span>
          </div>

          <button
            type="button"
            onClick={handleExecuteGrant}
            disabled={isSending}
            className="btn-primary py-3.5 px-7 text-xs font-extrabold rounded-2xl flex items-center gap-2.5 active:scale-[0.98] disabled:opacity-50 shadow-md"
          >
            {isSending ? <RotateCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span>Promosyon Kredilerini Tanımla</span>
          </button>
        </div>
      </div>
    </div>
  )
}
