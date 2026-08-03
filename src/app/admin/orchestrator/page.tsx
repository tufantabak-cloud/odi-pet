'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'
import PageHeader from '@/components/ui/primitives/PageHeader'
import GlassCard from '@/components/ui/primitives/GlassCard'
import Badge from '@/components/ui/primitives/Badge'
import Button from '@/components/ui/primitives/Button'
import CampaignFormModal from './CampaignFormModal'
import { Trash2, Pencil, Plus, BarChart3 } from 'lucide-react'

export default function OrchestratorAdminPage() {
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<any>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const supabase = createBrowserSupabaseClient()

  const fetchCampaigns = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('orchestrator_campaigns')
        .select(`
          *,
          orchestrator_prompts (
            id,
            component_name,
            mutation_action,
            display_type
          )
        `)
        .order('base_priority', { ascending: false })

      if (error) throw error
      setCampaigns(data || [])
    } catch (err) {
      console.error('Failed to load campaigns', err)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchCampaigns()
  }, [fetchCampaigns])

  const handleDelete = async (campaignId: string) => {
    if (!confirm('Bu kampanyayı silmek istediğinize emin misiniz?')) return
    setDeletingId(campaignId)
    try {
      // CASCADE will handle prompts deletion
      const { error } = await supabase
        .from('orchestrator_campaigns')
        .delete()
        .eq('id', campaignId)

      if (error) throw error
      await fetchCampaigns()
    } catch (err) {
      console.error('Delete failed', err)
    } finally {
      setDeletingId(null)
    }
  }

  const handleEdit = (campaign: any) => {
    setEditingCampaign(campaign)
    setFormOpen(true)
  }

  const handleCreate = () => {
    setEditingCampaign(null)
    setFormOpen(true)
  }

  const handleFormSuccess = () => {
    fetchCampaigns()
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge variant="success">{status.toUpperCase()}</Badge>
      case 'draft': return <Badge variant="primary">{status.toUpperCase()}</Badge>
      case 'paused': return <Badge variant="warning">{status.toUpperCase()}</Badge>
      case 'completed': return <Badge variant="success">TAMAMLANDI</Badge>
      case 'archived': return <Badge variant="warning">ARŞİV</Badge>
      default: return <Badge variant="primary">{status.toUpperCase()}</Badge>
    }
  }

  return (
    <div className="p-6 md:p-8 space-y-6 animate-in fade-in zoom-in-95 duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <PageHeader
            title="Deneyim Orkestratörü"
            showBack={false}
          />
          <p className="text-sm text-text-secondary px-4 -mt-1">
            Dinamik kullanıcı etkileşimlerini, kurallarını ve kampanyalarını yönetin.
          </p>
        </div>
        <Button variant="primary" size="md" leftIcon={<Plus size={18} />} onClick={handleCreate}>
          Yeni Kampanya
        </Button>
      </div>

      {/* Stats Row */}
      {!loading && campaigns.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <GlassCard className="p-4 text-center">
            <div className="text-2xl font-extrabold text-primary">{campaigns.length}</div>
            <div className="text-xs text-text-secondary font-medium mt-1">Toplam Kampanya</div>
          </GlassCard>
          <GlassCard className="p-4 text-center">
            <div className="text-2xl font-extrabold text-success">{campaigns.filter(c => c.status === 'active').length}</div>
            <div className="text-xs text-text-secondary font-medium mt-1">Aktif</div>
          </GlassCard>
          <GlassCard className="p-4 text-center">
            <div className="text-2xl font-extrabold text-text-secondary">{campaigns.filter(c => c.status === 'draft').length}</div>
            <div className="text-xs text-text-secondary font-medium mt-1">Taslak</div>
          </GlassCard>
          <GlassCard className="p-4 text-center">
            <div className="text-2xl font-extrabold text-warning">{campaigns.filter(c => c.status === 'paused').length}</div>
            <div className="text-xs text-text-secondary font-medium mt-1">Duraklatılmış</div>
          </GlassCard>
        </div>
      )}

      {/* Campaign List */}
      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="p-8 text-center text-text-secondary animate-pulse">
            Kampanyalar yükleniyor...
          </div>
        ) : campaigns.length === 0 ? (
          <GlassCard className="p-12 text-center flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 bg-bg-main rounded-full flex items-center justify-center text-3xl">🎛️</div>
            <div>
              <h3 className="text-lg font-bold text-text-primary">Henüz Kampanya Yok</h3>
              <p className="text-sm text-text-secondary max-w-md mx-auto mt-2">
                Kullanıcılarınıza anketler, formlar veya yönlendirmeler sunmak için ilk deneyim kampanyanızı oluşturun.
              </p>
            </div>
            <Button variant="outline" onClick={handleCreate}>Oluştur</Button>
          </GlassCard>
        ) : (
          campaigns.map((camp) => {
            const prompt = camp.orchestrator_prompts?.[0]
            return (
              <GlassCard
                key={camp.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:scale-[1.01] transition-transform duration-200"
              >
                {/* Left: Info */}
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-text-primary truncate">{camp.name}</h3>
                    {getStatusBadge(camp.status)}
                    <Badge variant="primary">v{camp.version}</Badge>
                  </div>
                  <p className="text-sm text-text-secondary line-clamp-1">
                    {camp.description || 'Açıklama bulunmuyor.'}
                  </p>

                  {prompt && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-text-secondary flex-wrap">
                      <span className="font-medium text-text-primary">Bileşen:</span>
                      <code className="px-1.5 py-0.5 bg-slate-100 rounded text-purple-600 font-mono text-[11px]">
                        {prompt.component_name}
                      </code>
                      <span className="text-slate-300">|</span>
                      <span className="font-medium text-text-primary">Gösterim:</span>
                      {prompt.display_type}
                      {prompt.mutation_action && (
                        <>
                          <span className="text-slate-300">|</span>
                          <span className="font-medium text-text-primary">Eylem:</span>
                          <code className="px-1.5 py-0.5 bg-green-50 rounded text-green-700 font-mono text-[11px]">
                            {prompt.mutation_action}
                          </code>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Right: Score & Actions */}
                <div className="flex items-center gap-3 sm:self-center shrink-0">
                  <div className="text-right mr-2">
                    <div className="text-xs text-text-secondary">Skor</div>
                    <div className="font-extrabold text-primary text-xl leading-tight">{camp.base_priority}</div>
                  </div>
                  <Button variant="outline" size="sm" leftIcon={<Pencil size={14} />} onClick={() => handleEdit(camp)}>
                    Düzenle
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    leftIcon={<Trash2 size={14} />}
                    isLoading={deletingId === camp.id}
                    onClick={() => handleDelete(camp.id)}
                  >
                    Sil
                  </Button>
                </div>
              </GlassCard>
            )
          })
        )}
      </div>

      {/* CRUD Modal */}
      <CampaignFormModal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditingCampaign(null) }}
        onSuccess={handleFormSuccess}
        editingCampaign={editingCampaign}
      />
    </div>
  )
}
