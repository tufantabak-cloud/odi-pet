"use client"

import React, { useState } from 'react'

interface AllergyManagerProps {
  petId: string
  initialAllergies: any[]
}

export default function AllergyManager({ petId, initialAllergies }: AllergyManagerProps) {
  const [allergies, setAllergies] = useState(initialAllergies || [])
  const [isAdding, setIsAdding] = useState(false)
  const [loading, setLoading] = useState(false)
  
  // Form State
  const [triggerName, setTriggerName] = useState('')
  const [symptoms, setSymptoms] = useState('')
  const [treatment, setTreatment] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!triggerName.trim()) {
      setError("Alerji adı (tetikleyici) zorunludur.")
      return
    }
    
    setLoading(true)
    setError(null)
    
    try {
      const res = await fetch(`/api/pets/${petId}/allergies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          trigger_name: triggerName.trim(), 
          symptoms: symptoms.trim(), 
          treatment: treatment.trim() 
        })
      })
      const data = await res.json()
      
      if (!res.ok) throw new Error(data.error || "Bir hata oluştu")
      
      setAllergies([data.allergy, ...allergies])
      setIsAdding(false)
      setTriggerName('')
      setSymptoms('')
      setTreatment('')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Bu alerjiyi silmek istediğinize emin misiniz?")) return
    
    try {
      const res = await fetch(`/api/pets/${petId}/allergies`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allergy_id: id })
      })
      
      if (!res.ok) throw new Error("Silinirken hata oluştu")
      
      setAllergies(allergies.filter((a: any) => a.id !== id))
    } catch (err: any) {
      alert(err.message)
    }
  }

  // Eğer alerji yoksa liste gizlenir, sadece sihirbazdan eklenebilir veya + butonu bırakılabilir.
  // Kullanıcı UX talebi: SADECE petin gerçekten bir alerjisi varsa görünsün.
  if (allergies.length === 0) {
    return null;
  }

  return (
    <div className="card-base p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[13px] font-black text-text-secondary uppercase tracking-widest">Alerjiler</h3>
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="text-[18px] font-black text-primary w-8 h-8 rounded-full bg-primary-soft flex items-center justify-center hover:bg-primary hover:text-white transition-colors"
          >
            +
          </button>
        )}
      </div>

      {isAdding && (
        <div className="mb-5 p-4 bg-slate-50 rounded-card border border-border-main animate-fadeInUp">
          <h4 className="text-[14px] font-black text-text-primary mb-3">Yeni Alerji Ekle</h4>
          <form onSubmit={handleAdd} className="flex flex-col gap-3">
            <div>
              <label className="text-[11px] font-bold text-text-secondary ml-1">Alerji (Tetikleyici) *</label>
              <input 
                type="text"
                value={triggerName}
                onChange={(e) => setTriggerName(e.target.value)}
                placeholder="Örn: Tavuk, Toz, Polen"
                className="input-base w-full mt-1"
                required
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-text-secondary ml-1">Semptomlar</label>
              <input 
                type="text"
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                placeholder="Örn: Kaşıntı, Kızarıklık"
                className="input-base w-full mt-1"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-text-secondary ml-1">Tedavi / Notlar</label>
              <input 
                type="text"
                value={treatment}
                onChange={(e) => setTreatment(e.target.value)}
                placeholder="Alınması gereken önlemler..."
                className="input-base w-full mt-1"
              />
            </div>
            
            {error && <p className="text-[12px] text-red-500 font-medium px-1">{error}</p>}
            
            <div className="flex gap-2 mt-2">
              <button 
                type="button" 
                onClick={() => setIsAdding(false)}
                className="btn-secondary flex-1 py-2.5 text-[13px]"
              >İptal</button>
              <button 
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 btn-primary text-[13px]"
              >{loading ? 'Ekleniyor...' : 'Ekle'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {allergies.map((a: any) => (
          <div key={a.id} className="p-3.5 rounded-card bg-red-50 border border-red-100 flex items-start justify-between group relative">
            <div>
              <h4 className="text-[14px] font-black text-red-700">{a.trigger_name}</h4>
              {a.symptoms && <p className="text-[12px] text-red-600/80 font-medium mt-1"><span className="font-bold opacity-70">Belirti:</span> {a.symptoms}</p>}
              {a.treatment && <p className="text-[12px] text-red-600/80 font-medium mt-0.5"><span className="font-bold opacity-70">Tedavi/Not:</span> {a.treatment}</p>}
            </div>
            <button 
              onClick={() => handleDelete(a.id)}
              className="w-8 h-8 rounded-full bg-white text-red-500 shadow-sm flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors"
              title="Sil"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
