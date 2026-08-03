'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'
import {
  CheckCircle2,
  AlertCircle,
  User,
  Phone,
  MapPin,
  Heart,
  ShieldAlert,
  Stethoscope,
  Bell,
  Sparkles,
  Save,
  X,
  Palette,
  FileText,
  Building2,
  Mail,
} from 'lucide-react'

const AVATAR_COLORS = [
  { id: 'purple', name: 'Odi Moru', bg: 'bg-primary', ring: 'ring-primary' },
  { id: 'teal', name: 'Turkuaz', bg: 'bg-teal-500', ring: 'ring-teal-500' },
  { id: 'amber', name: 'Sıcak Turuncu', bg: 'bg-amber-500', ring: 'ring-amber-500' },
  { id: 'sky', name: 'Gök Mavisi', bg: 'bg-sky-500', ring: 'ring-sky-500' },
  { id: 'rose', name: 'Gül Pembe', bg: 'bg-rose-500', ring: 'ring-rose-500' },
]

export default function EditProfileForm({
  profile,
  user,
  petEmergencyPhone,
  petEmergencyName,
  petEmergencyRelation,
  petEmergency2Phone,
  petEmergency2Name,
  petEmergency2Relation,
}: {
  profile: any
  user?: any
  petEmergencyPhone?: string
  petEmergencyName?: string
  petEmergencyRelation?: string
  petEmergency2Phone?: string
  petEmergency2Name?: string
  petEmergency2Relation?: string
}) {
  const router = useRouter()
  const supabase = createBrowserSupabaseClient()

  // Ad & Soyad ayrıştırma: eğer last_name boşsa ve first_name tam ad içeriyorsa ("Tufan TABAK" gibi)
  const rawFirstName = (profile?.first_name || '').trim()
  const rawLastName = (profile?.last_name || '').trim()

  let parsedFirstName = rawFirstName
  let parsedLastName = rawLastName

  if (!parsedLastName && rawFirstName.includes(' ')) {
    const parts = rawFirstName.split(/\s+/)
    parsedFirstName = parts.slice(0, -1).join(' ')
    parsedLastName = parts[parts.length - 1]
  }

  // Telefon kaynağı sırası: profile.phone -> user.phone -> user.user_metadata.phone -> profile.emergency_contact_phone -> petEmergencyPhone
  const initialPhone =
    profile?.phone ||
    user?.phone ||
    user?.user_metadata?.phone ||
    profile?.emergency_contact_phone ||
    petEmergencyPhone ||
    ''

  const initialEmergencyName =
    profile?.emergency_contact_name ||
    petEmergencyName ||
    ''

  const initialEmergencyPhone =
    profile?.emergency_contact_phone ||
    petEmergencyPhone ||
    ''

  const initialEmergencyRelation =
    profile?.emergency_contact_relation ||
    (petEmergencyRelation === 'Sahibi' ? 'Eş' : petEmergencyRelation) ||
    ''

  // 2. Acil İletişim Kişisi değerleri
  const initialEmergency2Name =
    profile?.emergency_contact2_name ||
    petEmergency2Name ||
    ''

  const initialEmergency2Phone =
    profile?.emergency_contact2_phone ||
    petEmergency2Phone ||
    ''

  const initialEmergency2Relation =
    profile?.emergency_contact2_relation ||
    petEmergency2Relation ||
    ''

  // Oturum E-postası
  const email = user?.email || profile?.email || ''

  // State management for rich profile fields
  const [firstName, setFirstName] = useState(parsedFirstName)
  const [lastName, setLastName] = useState(parsedLastName)
  const [phone, setPhone] = useState(initialPhone)
  const [avatarColor, setAvatarColor] = useState(profile?.avatar_color || 'purple')

  const [city, setCity] = useState(profile?.city || '')
  const [district, setDistrict] = useState(profile?.district || '')
  const [neighborhood, setNeighborhood] = useState(profile?.neighborhood || '')
  const [bio, setBio] = useState(profile?.bio || '')

  const [emergencyName, setEmergencyName] = useState(initialEmergencyName)
  const [emergencyPhone, setEmergencyPhone] = useState(initialEmergencyPhone)
  const [emergencyRelation, setEmergencyRelation] = useState(initialEmergencyRelation)

  const [emergency2Name, setEmergency2Name] = useState(initialEmergency2Name)
  const [emergency2Phone, setEmergency2Phone] = useState(initialEmergency2Phone)
  const [emergency2Relation, setEmergency2Relation] = useState(initialEmergency2Relation)

  const [vetName, setVetName] = useState(profile?.preferred_vet_name || '')
  const [vetPhone, setVetPhone] = useState(profile?.preferred_vet_phone || '')

  const [notifyEmail, setNotifyEmail] = useState(profile?.notify_email ?? true)
  const [notifySms, setNotifySms] = useState(profile?.notify_sms ?? true)
  const [notifyPush, setNotifyPush] = useState(profile?.notify_push ?? true)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successToast, setSuccessToast] = useState(false)

  const handleCopyOwnerPhone = () => {
    if (phone) {
      setEmergencyPhone(phone)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    // Acil durum numarası girildiğinde, temel kimlik telefon bilgisi boşsa ikisini de eşle
    const resolvedPhone = phone || (emergencyPhone ? emergencyPhone : (emergency2Phone ? emergency2Phone : null))

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          first_name: firstName,
          last_name: lastName,
          email: email || null,
          phone: resolvedPhone,
          avatar_color: avatarColor,
          city: city || null,
          district: district || null,
          neighborhood: neighborhood || null,
          bio: bio || null,
          emergency_contact_name: emergencyName || null,
          emergency_contact_phone: emergencyPhone || null,
          emergency_contact_relation: emergencyRelation || null,
          emergency_contact2_name: emergency2Name || null,
          emergency_contact2_phone: emergency2Phone || null,
          emergency_contact2_relation: emergency2Relation || null,
          preferred_vet_name: vetName || null,
          preferred_vet_phone: vetPhone || null,
          notify_email: notifyEmail,
          notify_sms: notifySms,
          notify_push: notifyPush,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id)

      if (updateError) throw updateError

      setSuccessToast(true)
      router.refresh()
      setTimeout(() => {
        setSuccessToast(false)
        router.push('/owner/profile')
      }, 1500)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Profil güncellenirken bir hata oluştu.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Toast & Error Alerts */}
      {successToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-emerald-600 text-white text-sm font-bold shadow-2xl animate-scaleIn border border-emerald-500/30"
        >
          <CheckCircle2 className="w-5 h-5 shrink-0 text-white" />
          <span>Profil bilgileriniz başarıyla güncellendi!</span>
        </div>
      )}

      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="p-4 rounded-2xl bg-rose-50 text-rose-700 text-xs font-semibold border border-rose-200 flex items-center gap-3 shadow-sm"
        >
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* SECTION 1: Kişisel Bilgiler & Profil Teması */}
      <section className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] flex flex-col gap-5">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
          <div className="w-10 h-10 rounded-2xl bg-purple-50 text-primary flex items-center justify-center shrink-0">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-text-primary">Temel Kimlik Bilgileri</h2>
            <p className="text-xs text-text-secondary font-medium">Ad, soyad ve profil görünüm tercihiniz</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-text-secondary ml-1">Adınız *</label>
            <input
              type="text"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              required
              className="input-base rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              placeholder="Adınız"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-text-secondary ml-1">Soyadınız *</label>
            <input
              type="text"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              required
              className="input-base rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              placeholder="Soyadınız"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between ml-1">
            <label className="text-xs font-bold text-text-secondary flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-text-secondary" />
              E-posta Adresi
            </label>
            <span className="text-3xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
              🔒 Oturum Hesabı
            </span>
          </div>
          <input
            type="email"
            value={email}
            readOnly
            disabled
            className="input-base rounded-2xl border border-slate-200 px-4 py-3 text-sm bg-slate-50/80 text-slate-700 cursor-not-allowed font-medium select-all"
            placeholder="E-posta adresiniz"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-text-secondary ml-1 flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-text-secondary" />
            Telefon Numarası
          </label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            className="input-base rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            placeholder="0555 555 5555"
          />
          {!phone && (
            <p className="text-3xs font-medium text-amber-700 bg-amber-50 px-3 py-1 rounded-xl border border-amber-200/60 w-fit ml-1 mt-0.5">
              💡 Veritabanınızda henüz kayıtlı bir telefon numarası bulunmuyor. Numaranızı yazıp <strong>"Değişiklikleri Kaydet"</strong> butonuna bastığınızda profilde saklanacaktır.
            </p>
          )}
        </div>

        {/* Profil Avatar Renk Teması */}
        <div className="flex flex-col gap-2 pt-1">
          <label className="text-xs font-bold text-text-secondary ml-1 flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-text-secondary" />
            Profil Kartı Renk Teması
          </label>
          <div className="flex items-center gap-3 pt-1">
            {AVATAR_COLORS.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => setAvatarColor(c.id)}
                className={`w-9 h-9 rounded-full ${c.bg} flex items-center justify-center transition-transform active:scale-95 ${
                  avatarColor === c.id ? `ring-4 ring-offset-2 ${c.ring} scale-110` : 'opacity-80 hover:opacity-100'
                }`}
                title={c.name}
              >
                {avatarColor === c.id && <CheckCircle2 className="w-5 h-5 text-white" />}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 2: Konum & Ebeveyn Biyografisi */}
      <section className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] flex flex-col gap-5">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
          <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-text-primary">Konum & Ebeveyn Profili</h2>
            <p className="text-xs text-text-secondary font-medium">Yakındaki veteriner aramaları ve profil özetiniz</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-text-secondary ml-1">Şehir (İl)</label>
            <input
              type="text"
              value={city}
              onChange={e => setCity(e.target.value)}
              className="input-base rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
              placeholder="Örn: İstanbul"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-text-secondary ml-1">İlçe</label>
            <input
              type="text"
              value={district}
              onChange={e => setDistrict(e.target.value)}
              className="input-base rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
              placeholder="Örn: Kadıköy"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-text-secondary ml-1">Mahalle</label>
            <input
              type="text"
              value={neighborhood}
              onChange={e => setNeighborhood(e.target.value)}
              className="input-base rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
              placeholder="Örn: Caferağa Mah."
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-text-secondary ml-1 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-text-secondary" />
            Ebeveyn Biyografisi / Notlar
          </label>
          <textarea
            rows={3}
            value={bio}
            onChange={e => setBio(e.target.value)}
            className="input-base rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all resize-none"
            placeholder="Evcil hayvanlarınız veya bakım alışkanlıklarınız hakkında kısa bir bilgi girin..."
          />
        </div>
      </section>

      {/* SECTION 3: Acil Durum İletişim Rehberi */}
      <section className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] flex flex-col gap-6">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
          <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-text-primary">Acil Durum İletişim Rehberi</h2>
            <p className="text-xs text-text-secondary font-medium">Size ulaşılamayan acil durumlarda sırasıyla aranacak 1. ve 2. yakınlarınız</p>
          </div>
        </div>

        {/* KİŞİ 1 (BİRİNCİL) */}
        <div className="p-4 rounded-2xl bg-rose-50/40 border border-rose-100/80 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-extrabold text-rose-700 uppercase tracking-widest">Kişi 1 (Birincil Acil İletişim) *</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-text-secondary ml-1">Acil Kişisi 1 Adı Soyadı</label>
              <input
                type="text"
                value={emergencyName}
                onChange={e => setEmergencyName(e.target.value)}
                className="input-base rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 outline-none transition-all bg-white"
                placeholder="Örn: Tufan tabak"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between ml-1">
                <label className="text-xs font-bold text-text-secondary">Acil İletişim Telefonu</label>
                {phone && (
                  <button
                    type="button"
                    onClick={handleCopyOwnerPhone}
                    className="text-3xs font-bold text-rose-600 hover:underline bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100 transition-colors"
                  >
                    Kendi Telefonumu Kullan
                  </button>
                )}
              </div>
              <input
                type="tel"
                value={emergencyPhone}
                onChange={e => {
                  const val = e.target.value
                  setEmergencyPhone(val)
                  if (!phone && val) {
                    setPhone(val)
                  }
                }}
                className="input-base rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 outline-none transition-all bg-white"
                placeholder="0542 369 47 18"
              />
              <p className="text-3xs font-medium text-slate-500 ml-1">
                💡 Acil iletişim numarası kaydedildiğinde, Temel Kimlik Bilgilerindeki telefon kaydı olarak da otomatik kabul edilip eşlenir.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-text-secondary ml-1">Yakınlık Derecesi / Rolü</label>
            <select
              value={emergencyRelation}
              onChange={e => setEmergencyRelation(e.target.value)}
              className="input-base rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 outline-none transition-all bg-white"
            >
              <option value="">Seçiniz</option>
              <option value="Sahibi">Sahibi</option>
              <option value="Eş">Eş</option>
              <option value="Anne / Baba">Anne / Baba</option>
              <option value="Kardeş">Kardeş</option>
              <option value="Komşu / Bakıcı">Komşu / Bakıcı</option>
              <option value="Arkadaş">Arkadaş</option>
              <option value="Diğer">Diğer</option>
            </select>
          </div>
        </div>

        {/* KİŞİ 2 (İKİNCİL) */}
        <div className="p-4 rounded-2xl bg-amber-50/40 border border-amber-100/80 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-extrabold text-amber-800 uppercase tracking-widest">Kişi 2 (İkincil Acil İletişim)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-text-secondary ml-1">Acil Kişisi 2 Adı Soyadı</label>
              <input
                type="text"
                value={emergency2Name}
                onChange={e => setEmergency2Name(e.target.value)}
                className="input-base rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all bg-white"
                placeholder="Örn: Ayşe Yılmaz"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-text-secondary ml-1">Acil İletişim Telefonu 2</label>
              <input
                type="tel"
                value={emergency2Phone}
                onChange={e => setEmergency2Phone(e.target.value)}
                className="input-base rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all bg-white"
                placeholder="0532 000 00 00"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-text-secondary ml-1">Yakınlık Derecesi / Rolü</label>
            <select
              value={emergency2Relation}
              onChange={e => setEmergency2Relation(e.target.value)}
              className="input-base rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all bg-white"
            >
              <option value="">Seçiniz</option>
              <option value="Eş">Eş</option>
              <option value="Anne / Baba">Anne / Baba</option>
              <option value="Kardeş">Kardeş</option>
              <option value="Komşu / Bakıcı">Komşu / Bakıcı</option>
              <option value="Arkadaş">Arkadaş</option>
              <option value="Veteriner Hekim">Veteriner Hekim</option>
              <option value="Diğer">Diğer</option>
            </select>
          </div>
        </div>
      </section>

      {/* SECTION 4: Tercih Edilen Veteriner Kliniği */}
      <section className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] flex flex-col gap-5">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-text-primary">Tercih Edilen Veteriner</h2>
            <p className="text-xs text-text-secondary font-medium">Sağlık takipleri için kayıtlı klinik bilginiz</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-text-secondary ml-1">Klinik / Hekim Adı</label>
            <input
              type="text"
              value={vetName}
              onChange={e => setVetName(e.target.value)}
              className="input-base rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
              placeholder="Örn: VetCare Pati Kliniği"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-text-secondary ml-1">Klinik Telefon Numarası</label>
            <input
              type="tel"
              value={vetPhone}
              onChange={e => setVetPhone(e.target.value)}
              className="input-base rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
              placeholder="0212 000 0000"
            />
          </div>
        </div>
      </section>

      {/* SECTION 5: İletişim & Bildirim Tercihleri */}
      <section className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] flex flex-col gap-5">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-text-primary">Bildirim Tercihleri</h2>
            <p className="text-xs text-text-secondary font-medium">Aşı ve sağlık hatırlatmalarının ulaşacağı kanallar</p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-100 cursor-pointer hover:bg-slate-100/80 transition-colors">
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-text-primary">E-posta Bültenleri & Raporlar</span>
              <span className="text-xs text-text-secondary">Haftalık sağlık özetleri ve aşı takvim güncellemesi</span>
            </div>
            <input
              type="checkbox"
              checked={notifyEmail}
              onChange={e => setNotifyEmail(e.target.checked)}
              className="w-5 h-5 rounded-md text-primary focus:ring-primary accent-primary cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-100 cursor-pointer hover:bg-slate-100/80 transition-colors">
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-text-primary">SMS Hatırlatmaları</span>
              <span className="text-xs text-text-secondary">Günü yaklaşan veya geciken kritik aşı bildirimleri</span>
            </div>
            <input
              type="checkbox"
              checked={notifySms}
              onChange={e => setNotifySms(e.target.checked)}
              className="w-5 h-5 rounded-md text-primary focus:ring-primary accent-primary cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-100 cursor-pointer hover:bg-slate-100/80 transition-colors">
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-text-primary">Mobil Anlık Bildirimler (Push)</span>
              <span className="text-xs text-text-secondary">Uygulama içi ve cihaz anlık bildirimleri</span>
            </div>
            <input
              type="checkbox"
              checked={notifyPush}
              onChange={e => setNotifyPush(e.target.checked)}
              className="w-5 h-5 rounded-md text-primary focus:ring-primary accent-primary cursor-pointer"
            />
          </label>
        </div>
      </section>

      {/* SECTION 6: Action Buttons */}
      <div className="flex items-center gap-3 pt-2 pb-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="btn-secondary flex-1 min-h-[52px] rounded-2xl flex items-center justify-center gap-2 text-sm font-bold active:scale-[0.98] transition-transform"
          disabled={isSubmitting}
        >
          <X className="w-4 h-4" />
          İptal
        </button>
        <button
          type="submit"
          className="btn-primary flex-1 min-h-[52px] rounded-2xl flex items-center justify-center gap-2 text-sm font-bold active:scale-[0.98] transition-transform shadow-md"
          disabled={isSubmitting}
        >
          <Save className="w-4 h-4" />
          {isSubmitting ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
        </button>
      </div>
    </form>
  )
}
