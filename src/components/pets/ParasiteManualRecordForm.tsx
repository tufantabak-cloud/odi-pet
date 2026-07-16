import React, { useState, useEffect } from 'react';

interface Protocol {
  id: string;
  protocol_name: string;
  default_protection_duration_days: number;
  default_application_method: string;
  allowed_application_methods: string[];
}

export function ParasiteManualRecordForm({
  petId,
  protocols,
  onComplete,
  onCancel,
}: {
  petId: string;
  protocols: Protocol[];
  onComplete: () => void;
  onCancel: () => void;
}) {
  const [protocolId, setProtocolId] = useState('');
  const [applicationMethod, setApplicationMethod] = useState('');
  const [administeredAt, setAdministeredAt] = useState(new Date().toISOString().split('T')[0]);
  const [brandFreeText, setBrandFreeText] = useState('');
  const [productFreeText, setProductFreeText] = useState('');
  const [protectionDurationDays, setProtectionDurationDays] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [documentStoragePath, setDocumentStoragePath] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Auto-fill defaults when protocol is selected
  useEffect(() => {
    if (protocolId) {
      const selected = protocols.find(p => p.id === protocolId);
      if (selected) {
        setProtectionDurationDays(selected.default_protection_duration_days || 30);
        setApplicationMethod(selected.default_application_method || 'spot_on');
      }
    } else {
      setProtectionDurationDays('');
      setApplicationMethod('');
    }
  }, [protocolId, protocols]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return; // Prevent double click
    setLoading(true);
    setError('');

    try {
      const payload: any = {
        parasite_protocol_id: protocolId,
        administered_at: administeredAt,
        application_method: applicationMethod,
        brand_free_text: brandFreeText || null,
        product_free_text: productFreeText || null,
        protection_duration_days: protectionDurationDays ? Number(protectionDurationDays) : null,
        notes: notes || null,
        document_storage_path: documentStoragePath || null,
      };

      const res = await fetch(`/api/pets/${petId}/parasite-records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Uygulama kaydı oluşturulamadı.');
      }

      onComplete();
    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{
      background: 'var(--surface-1, #ffffff)',
      border: '1px solid var(--border, #e5e7eb)',
      borderRadius: 12,
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      width: '100%',
      maxWidth: '100%',
      boxSizing: 'border-box'
    }}>
      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Uygulama Kaydı Ekle</h3>
      
      {error && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fca5a5',
          borderRadius: 6,
          padding: 8,
          color: '#991b1b',
          fontSize: 12,
        }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label htmlFor="protocol-select" style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>Protokol Seçin</label>
        <select
          id="protocol-select"
          value={protocolId}
          onChange={e => setProtocolId(e.target.value)}
          required
          style={{ padding: 8, borderRadius: 6, border: '1px solid #ccc', fontSize: 13 }}
        >
          <option value="">-- Seçiniz --</option>
          {protocols.map(p => (
            <option key={p.id} value={p.id}>{p.protocol_name}</option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label htmlFor="method-select" style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>Uygulama Yöntemi</label>
        <select
          id="method-select"
          value={applicationMethod}
          onChange={e => setApplicationMethod(e.target.value)}
          required
          style={{ padding: 8, borderRadius: 6, border: '1px solid #ccc', fontSize: 13 }}
        >
          <option value="">-- Seçiniz --</option>
          <option value="oral">Oral (Tablet)</option>
          <option value="spot_on">Ense Damlası (Spot-on)</option>
          <option value="collar">Tasma</option>
          <option value="topical">Topikal</option>
          <option value="injection">Enjeksiyon</option>
        </select>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label htmlFor="date-input" style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>Uygulama Tarihi</label>
        <input
          id="date-input"
          type="date"
          value={administeredAt}
          onChange={e => setAdministeredAt(e.target.value)}
          required
          style={{ padding: 8, borderRadius: 6, border: '1px solid #ccc', fontSize: 13 }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label htmlFor="brand-input" style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>Marka (Serbest Metin)</label>
        <input
          id="brand-input"
          type="text"
          placeholder="Örn: Bravecto"
          value={brandFreeText}
          onChange={e => setBrandFreeText(e.target.value)}
          style={{ padding: 8, borderRadius: 6, border: '1px solid #ccc', fontSize: 13 }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label htmlFor="product-input" style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>Ürün Adı (Serbest Metin)</label>
        <input
          id="product-input"
          type="text"
          placeholder="Örn: Bravecto Large Dog"
          value={productFreeText}
          onChange={e => setProductFreeText(e.target.value)}
          style={{ padding: 8, borderRadius: 6, border: '1px solid #ccc', fontSize: 13 }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label htmlFor="duration-input" style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>Koruma Süresi (Gün)</label>
        <input
          id="duration-input"
          type="number"
          min="1"
          max="1095"
          placeholder="Örn: 30"
          value={protectionDurationDays}
          onChange={e => setProtectionDurationDays(e.target.value ? Number(e.target.value) : '')}
          style={{ padding: 8, borderRadius: 6, border: '1px solid #ccc', fontSize: 13 }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label htmlFor="document-path" style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>Belge Yolu (İsteğe Bağlı)</label>
        <input
          id="document-path"
          type="text"
          placeholder="userId/petId/filename.pdf"
          value={documentStoragePath}
          onChange={e => setDocumentStoragePath(e.target.value)}
          style={{ padding: 8, borderRadius: 6, border: '1px solid #ccc', fontSize: 13 }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label htmlFor="notes-input" style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>Notlar</label>
        <textarea
          id="notes-input"
          placeholder="Uygulama detayları, reaksiyonlar vb."
          value={notes}
          onChange={e => setNotes(e.target.value)}
          style={{ padding: 8, borderRadius: 6, border: '1px solid #ccc', fontSize: 13, minHeight: 60 }}
        />
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            flex: 1,
            padding: '10px 14px',
            borderRadius: 6,
            border: '1px solid #ccc',
            background: '#fff',
            cursor: 'pointer',
            fontSize: 13
          }}
        >
          Vazgeç
        </button>
        <button
          type="submit"
          disabled={loading}
          style={{
            flex: 1,
            padding: '10px 14px',
            borderRadius: 6,
            border: 'none',
            background: 'var(--primary, #534AB7)',
            color: '#fff',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: 13
          }}
        >
          {loading ? 'Ekleniyor...' : 'Kaydet'}
        </button>
      </div>
    </form>
  );
}
