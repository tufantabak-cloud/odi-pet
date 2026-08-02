'use client'

import { useState, useEffect } from 'react'
import { getIcon, ICON_MAP } from '@/lib/navigation/iconMap'
import { Compass, Smartphone, Zap, Menu, FileText, Lock, CheckCircle2, Plus } from 'lucide-react'

type NavItem = {
  id: string
  label: string
  icon: string
  href: string
  slot: 'bottom_nav' | 'action_menu' | 'menu_drawer'
  order_index: number
  is_active: boolean
  match_type: 'exact' | 'startsWith'
}

type NavPage = {
  id: string
  label: string
  href: string
  icon: string
  is_locked: boolean
}

export default function AdminNavigationPage() {
  const [activeTab, setActiveTab] = useState<'bottom' | 'actions' | 'drawer' | 'pages'>('bottom')
  
  const [items, setItems] = useState<NavItem[]>([])
  const [pages, setPages] = useState<NavPage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  const [toastMessage, setToastMessage] = useState('')
  const [showToast, setShowToast] = useState(false)
  
  const [isSaving, setIsSaving] = useState(false)

  // Modals / forms state
  const [newPageForm, setNewPageForm] = useState({ label: '', href: '', icon: 'ti-home' })
  const [showPagePickerForSlot, setShowPagePickerForSlot] = useState<{slot: string, editingItemId?: string} | null>(null)

  const fetchNavData = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/admin/navigation?t=${Date.now()}`, { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setItems(data.items || [])
        setPages(data.pages || [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchNavData()
  }, [])

  const triggerToast = (msg: string) => {
    setToastMessage(msg)
    setShowToast(true)
    setTimeout(() => setShowToast(false), 3000)
  }

  const handleBulkOrderSave = async (slot: string) => {
    setIsSaving(true)
    const slotItems = items.filter(i => i.slot === slot).sort((a, b) => a.order_index - b.order_index)
    // Re-index to ensure sequential
    const updated = slotItems.map((item, index) => ({ id: item.id, order_index: index }))
    
    try {
      const res = await fetch('/api/admin/navigation/bulk', { // wait, I didn't create a bulk route, I created it in [id]!
        // Actually, the prompt said: "Toplu sıralama için: body'de items: [{id, order_index}] dizisi gelirse hepsini güncelle" in /api/admin/navigation/[id]/route.ts
        // I can just pass any ID since the PATCH logic checks for `body.items` first.
      })
    } catch(e){}
  }
  
  const saveBulkOrder = async (updatedItems: NavItem[]) => {
    setIsSaving(true)
    try {
      const payload = updatedItems.map((it, idx) => ({ id: it.id, order_index: idx }))
      // I can send to /api/admin/navigation/bulk-order which I will use any ID for since I put bulk update in [id]
      const res = await fetch('/api/admin/navigation/bulk-update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: payload })
      })
      if (res.ok) {
        triggerToast('Sıralama kaydedildi!')
        fetchNavData()
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsSaving(false)
    }
  }

  const moveItem = (slot: string, index: number, direction: 'up' | 'down') => {
    const slotItems = [...items].filter(i => i.slot === slot).sort((a, b) => a.order_index - b.order_index)
    if (direction === 'up' && index > 0) {
      const temp = slotItems[index]
      slotItems[index] = slotItems[index - 1]
      slotItems[index - 1] = temp
    } else if (direction === 'down' && index < slotItems.length - 1) {
      const temp = slotItems[index]
      slotItems[index] = slotItems[index + 1]
      slotItems[index + 1] = temp
    }
    
    saveBulkOrder(slotItems)
  }

  const deleteItem = async (id: string) => {
    if (!confirm('Bu öğeyi silmek istediğinize emin misiniz?')) return
    setIsSaving(true)
    try {
      const res = await fetch(`/api/admin/navigation/${id}`, { method: 'DELETE' })
      if (res.ok) {
        triggerToast('Öğe silindi.')
        fetchNavData()
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsSaving(false)
    }
  }

  const toggleActive = async (item: NavItem) => {
    setIsSaving(true)
    try {
      const res = await fetch(`/api/admin/navigation/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !item.is_active })
      })
      if (res.ok) {
        triggerToast('Durum güncellendi.')
        fetchNavData()
      } else {
        const err = await res.json()
        triggerToast(`Hata: ${err.error || 'Güncellenemedi'}`)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsSaving(false)
    }
  }

  const addOrUpdateItemFromPage = async (page: NavPage, slot: string, itemIdToUpdate?: string) => {
    setIsSaving(true)
    setShowPagePickerForSlot(null)
    
    try {
      if (itemIdToUpdate) {
        // Update existing item
        const res = await fetch(`/api/admin/navigation/${itemIdToUpdate}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ label: page.label, icon: page.icon, href: page.href })
        })
        if (res.ok) triggerToast('Öğe güncellendi.')
      } else {
        // Add new item
        const slotItems = items.filter(i => i.slot === slot)
        const res = await fetch('/api/admin/navigation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            label: page.label,
            icon: page.icon,
            href: page.href,
            slot: slot,
            order_index: slotItems.length
          })
        })
        if (res.ok) triggerToast('Yeni öğe eklendi.')
      }
      fetchNavData()
    } catch (e) {
      console.error(e)
    } finally {
      setIsSaving(false)
    }
  }

  const createPage = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      const res = await fetch('/api/admin/navigation/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPageForm)
      })
      if (res.ok) {
        triggerToast('Yeni sayfa havuzuna eklendi.')
        setNewPageForm({ label: '', href: '', icon: 'ti-home' })
        fetchNavData()
      } else {
        const err = await res.json()
        triggerToast(`Hata: ${err.error || 'Sayfa eklenemedi'}`)
      }
    } catch (e) {
      console.error(e)
      triggerToast('Bir hata oluştu.')
    } finally {
      setIsSaving(false)
    }
  }

  const deletePage = async (id: string) => {
    if (!confirm('Bu sayfayı havuzdan silmek istediğinize emin misiniz? (Bağlı navigasyon bağlantıları da silinebilir veya etkilenebilir)')) return
    setIsSaving(true)
    try {
      const res = await fetch(`/api/admin/navigation/pages/${id}`, { method: 'DELETE' })
      if (res.ok) {
        triggerToast('Sayfa havuzdan silindi.')
        fetchNavData()
      } else {
        const err = await res.json()
        triggerToast(`Hata: ${err.error || 'Sayfa silinemedi'}`)
      }
    } catch (e) {
      console.error(e)
      triggerToast('Bir hata oluştu.')
    } finally {
      setIsSaving(false)
    }
  }

  const updatePageField = async (id: string, field: 'label' | 'href', value: string) => {
    setIsSaving(true)
    try {
      const res = await fetch(`/api/admin/navigation/pages/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value })
      })
      if (res.ok) {
        triggerToast('Sayfa güncellendi.')
        fetchNavData()
      } else {
        const err = await res.json()
        triggerToast(`Hata: ${err.error || 'Güncellenemedi'}`)
      }
    } catch (e) {
      console.error(e)
      triggerToast('Bir hata oluştu.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur()
    }
  }

  const renderSlotTab = (slot: 'bottom_nav' | 'action_menu' | 'menu_drawer', title: string, maxItems: number) => {
    const slotItems = items.filter(i => i.slot === slot).sort((a, b) => a.order_index - b.order_index)

    return (
      <div className="card-base p-6 space-y-4">
        <div className="flex justify-between items-center mb-4 border-b border-border-main pb-4">
          <h2 className="text-[18px] font-black text-text-primary">{title}</h2>
          <span className="text-[12px] font-bold text-text-secondary bg-bg-main px-3 py-1 rounded-lg">
            {slotItems.length} / {maxItems} Öğeler
          </span>
        </div>

        {slot === 'bottom_nav' && (
          <div className="p-3 mb-2 bg-amber-50 text-amber-800 text-[12px] font-semibold rounded-lg border border-amber-200">
            Kural: Maksimum 4 öğe listelenebilir. Ortadaki (+) aksiyon butonu her zaman sabittir ve burada listelenmez.
          </div>
        )}

        <div className="space-y-3">
          {slotItems.map((item, idx) => (
            <div key={item.id} className={`flex items-center justify-between p-4 rounded-xl border border-border-main ${item.is_active ? 'bg-white' : 'bg-gray-50 opacity-70'}`}>
              <div className="flex items-center gap-4">
                <div className="text-text-secondary flex items-center justify-center p-2 bg-bg-main rounded-lg">
                  {getIcon(item.icon, 20)}
                </div>
                <div>
                  <h3 className="text-[14px] font-bold text-text-primary">{item.label}</h3>
                  <p className="text-[11px] text-text-secondary font-mono">{item.href}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1 mr-4">
                  <button onClick={() => moveItem(slot, idx, 'up')} disabled={idx === 0 || isSaving} className="text-text-secondary hover:text-primary disabled:opacity-30">
                    ▲
                  </button>
                  <button onClick={() => moveItem(slot, idx, 'down')} disabled={idx === slotItems.length - 1 || isSaving} className="text-text-secondary hover:text-primary disabled:opacity-30">
                    ▼
                  </button>
                </div>
                
                <button onClick={() => toggleActive(item)} className="px-3 py-1.5 bg-bg-main rounded-lg text-[12px] font-bold">
                  {item.is_active ? 'Gizle' : 'Göster'}
                </button>

                {slot === 'bottom_nav' ? (
                  <button onClick={() => setShowPagePickerForSlot({ slot, editingItemId: item.id })} className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[12px] font-bold">
                    Değiştir
                  </button>
                ) : (
                  <button onClick={() => deleteItem(item.id)} className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-[12px] font-bold">
                    Sil
                  </button>
                )}
              </div>
            </div>
          ))}
          {slotItems.length === 0 && (
            <div className="text-center p-6 text-[13px] text-text-secondary">Henüz öğe eklenmemiş.</div>
          )}
        </div>

        {slotItems.length < maxItems && slot !== 'bottom_nav' && (
          <button 
            onClick={() => setShowPagePickerForSlot({ slot })}
            className="w-full mt-4 py-3 border-2 border-dashed border-border-main rounded-xl text-[13px] font-bold text-text-secondary hover:border-primary hover:text-primary transition-all"
          >
            + Yeni Öğe Ekle (Sayfa Havuzundan)
          </button>
        )}
      </div>
    )
  }

  const renderPagesTab = () => {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card-base p-6">
          <h2 className="text-[18px] font-black text-text-primary mb-6">Mevcut Sayfa Havuzu</h2>
          <div className="space-y-3">
            {pages.map(page => (
              <div key={page.id} className="flex items-center justify-between p-4 rounded-xl border border-border-main bg-white">
                <div className="flex items-center gap-4">
                  <div className="text-text-secondary flex items-center justify-center p-2 bg-bg-main rounded-lg">
                    {getIcon(page.icon, 20)}
                  </div>
                  <div>
                    <input 
                      type="text" 
                      defaultValue={page.label} 
                      onKeyDown={handleKeyDown}
                      onBlur={(e) => {
                        if (e.target.value !== page.label) {
                          updatePageField(page.id, 'label', e.target.value)
                        }
                      }}
                      className="text-[14px] font-bold text-text-primary border-none bg-transparent outline-none focus:ring-2 focus:ring-primary rounded px-1 -ml-1" 
                    />
                    <input 
                      type="text" 
                      defaultValue={page.href} 
                      onKeyDown={handleKeyDown}
                      onBlur={(e) => {
                        if (e.target.value !== page.href) {
                          updatePageField(page.id, 'href', e.target.value)
                        }
                      }}
                      className="text-[11px] text-text-secondary font-mono border-none bg-transparent outline-none focus:ring-2 focus:ring-primary rounded px-1 -ml-1 w-full mt-1" 
                    />
                  </div>
                </div>
                <div className="flex items-center">
                  {page.is_locked ? (
                    <span className="text-[20px] text-text-secondary mr-2" title="Sistem sayfası, silinemez">🔒</span>
                  ) : (
                    <button 
                      onClick={() => deletePage(page.id)} 
                      disabled={isSaving}
                      className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-[12px] font-bold disabled:opacity-50"
                    >
                      Sil
                    </button>
                  )}
                </div>
              </div>
            ))}
            {pages.length === 0 && (
              <div className="text-center p-6 text-[13px] text-text-secondary">Sayfa havuzunda öğe yok.</div>
            )}
          </div>
        </div>
        
        <div className="card-base p-6 h-fit">
          <h2 className="text-[16px] font-black text-text-primary mb-4">Yeni Sayfa Oluştur</h2>
          <form onSubmit={createPage} className="space-y-4">
            <div>
              <label className="block text-[12px] font-bold text-text-secondary mb-1">Sayfa Adı</label>
              <input required value={newPageForm.label} onChange={e => setNewPageForm({...newPageForm, label: e.target.value})} type="text" className="w-full p-2.5 rounded-lg border border-border-main text-[13px]" placeholder="Örn: Galeri" />
            </div>
            <div>
              <label className="block text-[12px] font-bold text-text-secondary mb-1">Hedef URL (Href)</label>
              <input required value={newPageForm.href} onChange={e => setNewPageForm({...newPageForm, href: e.target.value})} type="text" className="w-full p-2.5 rounded-lg border border-border-main text-[13px] font-mono" placeholder="/owner/gallery" />
            </div>
            <div>
              <label className="block text-[12px] font-bold text-text-secondary mb-1">İkon (Anahtar)</label>
              <select value={newPageForm.icon} onChange={e => setNewPageForm({...newPageForm, icon: e.target.value})} className="w-full p-2.5 rounded-lg border border-border-main text-[13px]">
                {Object.keys(ICON_MAP).map(key => (
                  <option key={key} value={key}>{key}</option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn-primary w-full py-2.5 flex items-center justify-center gap-2">
              <span className="text-[14px]">Ekle</span>
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fadeInUp">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-text-primary tracking-tight flex items-center gap-2.5">
            <Compass className="w-7 h-7 text-purple-600 shrink-0" />
            <span>Navigasyon Yönetimi</span>
          </h1>
          <p className="text-xs text-text-secondary mt-1">Uygulamanın alt menüsünü ve aksiyon menülerini yönetin.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border-main gap-2 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab('bottom')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap active:scale-[0.98] ${
            activeTab === 'bottom' ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          <Smartphone className="w-4 h-4 shrink-0" />
          <span>Alt Navigasyon (Bottom Nav)</span>
        </button>
        <button
          onClick={() => setActiveTab('actions')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap active:scale-[0.98] ${
            activeTab === 'actions' ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          <Zap className="w-4 h-4 shrink-0" />
          <span>+ Hızlı Aksiyonlar</span>
        </button>
        <button
          onClick={() => setActiveTab('drawer')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap active:scale-[0.98] ${
            activeTab === 'drawer' ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          <Menu className="w-4 h-4 shrink-0" />
          <span>Menü Çekmecesi (Drawer)</span>
        </button>
        <button
          onClick={() => setActiveTab('pages')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap active:scale-[0.98] ${
            activeTab === 'pages' ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          <FileText className="w-4 h-4 shrink-0" />
          <span>Sayfa Havuzu</span>
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="py-20 flex justify-center"><div className="w-8 h-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div></div>
      ) : (
        <div className="stagger-children">
          {activeTab === 'bottom' && renderSlotTab('bottom_nav', 'Bottom Navigation', 4)}
          {activeTab === 'actions' && renderSlotTab('action_menu', 'Ortadaki + Aksiyon Menüsü', 6)}
          {activeTab === 'drawer' && renderSlotTab('menu_drawer', 'Yan/Çekmece Menü', 15)}
          {activeTab === 'pages' && renderPagesTab()}
        </div>
      )}

      {/* Page Picker Modal */}
      {showPagePickerForSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-surface rounded-3xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[80vh] border border-border-main">
            <div className="p-5 border-b border-border-main flex justify-between items-center">
              <h3 className="font-black text-base text-text-primary">Sayfa Seç</h3>
              <button onClick={() => setShowPagePickerForSlot(null)} className="text-text-secondary hover:text-text-primary text-xl leading-none">&times;</button>
            </div>
            <div className="p-5 overflow-y-auto flex-1 space-y-2">
              {pages.map(page => (
                <button
                  key={page.id}
                  onClick={() => addOrUpdateItemFromPage(page, showPagePickerForSlot.slot, showPagePickerForSlot.editingItemId)}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl border border-border-main hover:border-primary hover:bg-primary/5 transition-all text-left active:scale-[0.98]"
                >
                  <div className="text-primary flex items-center justify-center p-2 bg-primary/10 rounded-xl">
                    {getIcon(page.icon, 20)}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-text-primary">{page.label}</h4>
                    <p className="text-2xs text-text-secondary font-mono mt-0.5">{page.href}</p>
                  </div>
                </button>
              ))}
              {pages.length === 0 && <p className="text-xs text-center text-text-secondary">Seçilebilecek sayfa yok.</p>}
            </div>
          </div>
        </div>
      )}

      {/* Floating Success Toast */}
      {showToast && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-medium flex items-center gap-3 border border-border-main animate-scaleIn z-[9999]">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}
    </div>
  )
}
