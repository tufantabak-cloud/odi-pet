'use client'

import React, { useState, useEffect } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'
import FormModal from '@/components/ui/FormModal'
import Input from '@/components/ui/primitives/Input'
import Button from '@/components/ui/primitives/Button'

// Available component_name values for the Component Registry
const AVAILABLE_COMPONENTS = [
  { value: 'SmartAddressPrompt', label: 'Acil Durum Adres İstenimi' },
  { value: 'SmartWeightPrompt', label: 'Kilo Kaydı İstemi' },
  { value: 'SmartFoodPrompt', label: 'Mama/Beslenme İstemi' },
  { value: 'SmartVaccineReminder', label: 'Aşı Hatırlatma Kartı' },
  { value: 'SmartBreedPrompt', label: 'Irk Bilgisi İstemi' },
  { value: 'PremiumUpgradeBanner', label: 'Premium Yükseltme Bannerı' },
  { value: 'SmartQuestionCard', label: 'Genel Akıllı Soru Kartı' },
] as const

const MUTATION_ACTIONS = [
  { value: '', label: '— Eylem Yok (Sadece Bilgilendirme) —' },
  { value: 'SAVE_ADDRESS', label: 'SAVE_ADDRESS — Adres / Konum Kaydet' },
  { value: 'SAVE_WEIGHT', label: 'SAVE_WEIGHT — Kilo Kaydet' },
  { value: 'SAVE_VACCINE', label: 'SAVE_VACCINE — Aşı Kaydet' },
  { value: 'SAVE_FOOD', label: 'SAVE_FOOD — Mama Kaydet' },
  { value: 'UPGRADE_PREMIUM', label: 'UPGRADE_PREMIUM — Premium Yükselt' },
  { value: 'REQUEST_PERMISSION_LOCATION', label: 'REQUEST_PERMISSION_LOCATION — Konum İzni' },
] as const

const DISPLAY_TYPES = [
  { value: 'modal', label: 'Modal' },
  { value: 'bottom_sheet', label: 'Bottom Sheet' },
  { value: 'inline_banner', label: 'Inline Banner' },
] as const

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Taslak' },
  { value: 'active', label: 'Aktif' },
  { value: 'paused', label: 'Duraklatılmış' },
  { value: 'completed', label: 'Tamamlandı' },
  { value: 'archived', label: 'Arşivlendi' },
] as const

const TRIGGER_EVENTS = [
  // Sayfa Yüklenmeleri & Gezinme
  { value: 'on_load', label: ' Sayfa Yüklendiğinde (Genel Otomatik)' },
  { value: 'view_dashboard', label: ' Sayfa: Anasayfa / Dashboard' },
  { value: 'view_pet_profile', label: ' Sayfa: Pet Profili / Detay' },
  { value: 'view_health_tab', label: ' Sekme: Sağlık Karnesi' },
  { value: 'view_nutrition_tab', label: ' Sekme: Beslenme Takibi' },
  { value: 'view_vaccines_tab', label: ' Sekme: Aşı Takvimi' },
  { value: 'view_vets_page', label: ' Sayfa: Veteriner Bul / Harita' },
  { value: 'view_community_page', label: ' Sayfa: Topluluk / Sosyal' },

  // Buton Tıklamaları & Kullanıcı Aksiyonları
  { value: 'click_emergency_button', label: ' Buton: Acil Durum Butonuna Basıldığında' },
  { value: 'click_fab_add', label: ' Buton: Ana Hızlı Ekle (+ FAB)' },
  { value: 'click_add_vaccine', label: ' Buton: Aşı Ekle' },
  { value: 'click_add_weight', label: ' Buton: Kilo Kaydı Ekle' },
  { value: 'click_add_food', label: ' Buton: Mama / Beslenme Ekle' },
  { value: 'click_add_note', label: ' Buton: Not / Günlük Ekle' },
  { value: 'click_book_appointment', label: ' Buton: Randevu Al' },
  { value: 'click_edit_profile', label: ' Buton: Profil Düzenle' },
  { value: 'click_share_pet', label: ' Buton: QR / Pet Paylaş' },

  // Süreç & Akış Tamamlanma Olayları
  { value: 'event_onboarding_completed', label: ' Olay: Onboarding Tamamlandı' },
  { value: 'event_pet_created', label: ' Olay: Yeni Pet Eklendi' },
  { value: 'event_vaccine_completed', label: ' Olay: Aşı İğnesi Yapıldı / Kaydedildi' },
  { value: 'event_health_card_downloaded', label: ' Olay: Sağlık Karnesi PDF İndirildi' },
  { value: 'event_ai_chat_ended', label: ' Olay: AI Veteriner Sohbeti Bitti' },
] as const

interface CampaignFormData {
  name: string
  description: string
  status: string
  base_priority: number
  target_tags: string
  start_date: string
  end_date: string
  // Prompt fields
  component_name: string
  mutation_action: string
  display_type: string
  cooldown_hours: number
  trigger_event: string
}

interface CampaignFormModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  editingCampaign?: any // Pass existing campaign data for editing
}

const defaultFormData: CampaignFormData = {
  name: '',
  description: '',
  status: 'draft',
  base_priority: 50,
  target_tags: '',
  start_date: new Date().toISOString().split('T')[0],
  end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  component_name: 'SmartWeightPrompt',
  mutation_action: 'SAVE_WEIGHT',
  display_type: 'modal',
  cooldown_hours: 24,
  trigger_event: 'on_load',
}

export default function CampaignFormModal({
  open,
  onClose,
  onSuccess,
  editingCampaign,
}: CampaignFormModalProps) {
  const [form, setForm] = useState<CampaignFormData>(defaultFormData)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createBrowserSupabaseClient()

  const isEditing = !!editingCampaign

  // Populate form when editing
  useEffect(() => {
    if (editingCampaign) {
      const prompt = editingCampaign.orchestrator_prompts?.[0]
      const rules = editingCampaign.target_segment_rules as { target_tags?: string[] } | null
      const cooldown = editingCampaign.cooldown_rules as { cooldown_hours?: number } | null

      setForm({
        name: editingCampaign.name || '',
        description: editingCampaign.description || '',
        status: editingCampaign.status || 'draft',
        base_priority: editingCampaign.base_priority ?? 50,
        target_tags: (rules?.target_tags || []).join(', '),
        start_date: editingCampaign.start_date?.split('T')[0] || defaultFormData.start_date,
        end_date: editingCampaign.end_date?.split('T')[0] || defaultFormData.end_date,
        component_name: prompt?.component_name || 'SmartWeightPrompt',
        mutation_action: prompt?.mutation_action || '',
        display_type: prompt?.display_type || 'modal',
        cooldown_hours: cooldown?.cooldown_hours ?? 24,
        trigger_event: editingCampaign.trigger_events?.[0] || 'on_load',
      })
    } else {
      setForm(defaultFormData)
    }
  }, [editingCampaign])

  const handleChange = (field: keyof CampaignFormData, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Validation
      if (!form.name.trim()) throw new Error('Kampanya adı gereklidir.')
      if (!form.component_name) throw new Error('Bir bileşen seçmelisiniz.')

      const targetTags = form.target_tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)

      const campaignPayload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        status: form.status,
        base_priority: form.base_priority,
        target_segment_rules: { target_tags: targetTags },
        trigger_events: [form.trigger_event],
        cooldown_rules: { cooldown_hours: form.cooldown_hours },
        start_date: new Date(form.start_date).toISOString(),
        end_date: new Date(form.end_date).toISOString(),
      }

      let campaignId: string

      if (isEditing) {
        // UPDATE campaign
        const { error: updateError } = await supabase
          .from('orchestrator_campaigns')
          .update(campaignPayload)
          .eq('id', editingCampaign.id)

        if (updateError) throw updateError
        campaignId = editingCampaign.id

        // UPDATE existing prompt
        const existingPrompt = editingCampaign.orchestrator_prompts?.[0]
        if (existingPrompt) {
          const { error: promptError } = await supabase
            .from('orchestrator_prompts')
            .update({
              component_name: form.component_name,
              mutation_action: form.mutation_action || null,
              display_type: form.display_type,
            })
            .eq('id', existingPrompt.id)

          if (promptError) throw promptError
        }
      } else {
        // INSERT campaign
        const { data: newCampaign, error: insertError } = await supabase
          .from('orchestrator_campaigns')
          .insert(campaignPayload)
          .select('id')
          .single()

        if (insertError) throw insertError
        campaignId = newCampaign.id

        // INSERT prompt
        const { error: promptError } = await supabase
          .from('orchestrator_prompts')
          .insert({
            campaign_id: campaignId,
            component_name: form.component_name,
            mutation_action: form.mutation_action || null,
            display_type: form.display_type,
          })

        if (promptError) throw promptError
      }

      onSuccess()
      onClose()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Bir hata oluştu.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <FormModal
      open={open}
      title={isEditing ? 'Kampanyayı Düzenle' : 'Yeni Kampanya Oluştur'}
      description={isEditing ? 'Mevcut kampanyayı güncelleyin.' : 'Kullanıcılara sunulacak yeni bir deneyim kampanyası tanımlayın.'}
      icon={isEditing ? '✏️' : '🎯'}
      iconBg="bg-purple-100"
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Campaign Name */}
        <Input
          label="Kampanya Adı *"
          placeholder="Örn: Kilo Takibi Hatırlatma"
          value={form.name}
          onChange={(e) => handleChange('name', e.target.value)}
          required
        />

        {/* Description */}
        <div>
          <label className="block text-[13px] font-semibold text-text-primary mb-2">Açıklama</label>
          <textarea
            className="w-full px-4 py-3 rounded-xl border border-border-main bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none"
            rows={2}
            placeholder="Kampanyanın amacı..."
            value={form.description}
            onChange={(e) => handleChange('description', e.target.value)}
          />
        </div>

        {/* Status & Priority Row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[13px] font-semibold text-text-primary mb-2">Durum</label>
            <select
              className="w-full px-4 py-3 rounded-xl border border-border-main bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              value={form.status}
              onChange={(e) => handleChange('status', e.target.value)}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <Input
            label="Öncelik (Skor)"
            type="number"
            min={0}
            max={100}
            value={String(form.base_priority)}
            onChange={(e) => handleChange('base_priority', parseInt(e.target.value) || 0)}
          />
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Başlangıç Tarihi"
            type="date"
            value={form.start_date}
            onChange={(e) => handleChange('start_date', e.target.value)}
          />
          <Input
            label="Bitiş Tarihi"
            type="date"
            value={form.end_date}
            onChange={(e) => handleChange('end_date', e.target.value)}
          />
        </div>

        {/* Divider — Prompt Config */}
        <div className="border-t border-border-main pt-4 mt-4">
          <p className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-3">Bileşen & Eylem Ayarları</p>
        </div>

        {/* Component Name */}
        <div>
          <label className="block text-[13px] font-semibold text-text-primary mb-2">Gösterilecek Bileşen *</label>
          <select
            className="w-full px-4 py-3 rounded-xl border border-border-main bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            value={form.component_name}
            onChange={(e) => handleChange('component_name', e.target.value)}
          >
            {AVAILABLE_COMPONENTS.map((c) => (
              <option key={c.value} value={c.value}>{c.label} ({c.value})</option>
            ))}
          </select>
        </div>

        {/* Mutation Action */}
        <div>
          <label className="block text-[13px] font-semibold text-text-primary mb-2">Mutation Action</label>
          <select
            className="w-full px-4 py-3 rounded-xl border border-border-main bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            value={form.mutation_action}
            onChange={(e) => handleChange('mutation_action', e.target.value)}
          >
            {MUTATION_ACTIONS.map((a) => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
        </div>

        {/* Display Type & Trigger */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[13px] font-semibold text-text-primary mb-2">Gösterim Tipi</label>
            <select
              className="w-full px-4 py-3 rounded-xl border border-border-main bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              value={form.display_type}
              onChange={(e) => handleChange('display_type', e.target.value)}
            >
              {DISPLAY_TYPES.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-text-primary mb-2">Tetiklenme (Trigger)</label>
            <select
              className="w-full px-4 py-3 rounded-xl border border-border-main bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              value={form.trigger_event}
              onChange={(e) => handleChange('trigger_event', e.target.value)}
            >
              {TRIGGER_EVENTS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Cooldown */}
        <div>
          <Input
            label="Bekleme Süresi (Saat)"
            type="number"
            min={0}
            value={String(form.cooldown_hours)}
            onChange={(e) => handleChange('cooldown_hours', parseInt(e.target.value) || 0)}
          />
        </div>

        {/* Target Tags */}
        <Input
          label="Hedef Segment Etiketleri"
          placeholder="puppy, no_weight_log, premium (virgülle ayırın)"
          value={form.target_tags}
          onChange={(e) => handleChange('target_tags', e.target.value)}
          helperText="Boş bırakılırsa tüm kullanıcıları hedefler."
        />

        {/* Error */}
        {error && (
          <div className="p-3 bg-danger-soft text-danger text-sm font-medium rounded-xl">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button variant="outline" type="button" onClick={onClose} fullWidth>
            İptal
          </Button>
          <Button variant="primary" type="submit" isLoading={loading} fullWidth>
            {isEditing ? 'Güncelle' : 'Oluştur'}
          </Button>
        </div>
      </form>
    </FormModal>
  )
}
