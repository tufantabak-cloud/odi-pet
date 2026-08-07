import React, { useState } from 'react';
import { MapPin, Camera, Phone, CheckCircle, AlertCircle } from 'lucide-react';
import { OfficialRegistrationModal } from './OfficialRegistrationModal';

export const PublishSummary = ({
  sessionId,
  payload,
  selectedPet,
  onPublish,
}: {
  sessionId: string;
  payload: any;
  selectedPet?: any;
  onPublish: (reportId: string) => void;
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);

  const getErrorMessage = (code: string) => {
    switch (code) {
      case 'ACTIVE_LOST_REPORT_EXISTS':
        return 'Bu pet için zaten aktif bir kayıp ihbarı bulunmaktadır.';
      case 'PHONE_VERIFICATION_REQUIRED':
        return 'Lütfen önceki adımda telefon numaranızı doğrulayın.';
      case 'INVALID_LOST_REPORT_DATA':
        return 'Eksik veya geçersiz ilan bilgileri. Lütfen adımları kontrol edin.';
      default:
        return 'İlan oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.';
    }
  };

  const handlePublish = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/v1/reports/lost/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, payload, action: 'publish' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'LOST_REPORT_CREATE_FAILED');
      }
      setShowModal(false);
      onPublish(data.reportId);
    } catch (err: any) {
      setError(getErrorMessage(err.message));
    } finally {
      setLoading(false);
    }
  };

  const locationDisplay =
    payload.location?.address ||
    (payload.location?.isManual
      ? payload.location.address
      : 'İl / İlçe Belirtilmedi');

  const photoDisplay = payload.photo?.skipped
    ? 'Fotoğrafsız (Atlandı)'
    : payload.photo?.photoUrl
    ? 'Fotoğraf Seçildi'
    : 'Fotoğrafsız';

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Özet ve Yayınla</h2>
        <p className="text-sm text-slate-500 mt-1">
          Kayıp ihbarı bilgilerini kontrol edin ve onaylayarak yayınlayın.
        </p>
      </div>

      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col gap-3">
        <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase border-b border-slate-200 pb-2">
          İlan Özeti
        </h3>

        <div className="flex items-start gap-2.5">
          <MapPin className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <span className="font-semibold text-slate-800">Kayıp Konumu:</span>{' '}
            <span className="text-slate-600 font-medium">{locationDisplay}</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Camera className="w-4 h-4 text-purple-600 shrink-0" />
          <div className="text-sm">
            <span className="font-semibold text-slate-800">Görsel:</span>{' '}
            <span className="text-slate-600 font-medium">{photoDisplay}</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Phone className="w-4 h-4 text-purple-600 shrink-0" />
          <div className="text-sm">
            <span className="font-semibold text-slate-800">İletişim Numarası:</span>{' '}
            <span className="text-emerald-600 font-semibold inline-flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" /> Doğrulandı ({payload.contactPhone || 'Doğrulandı'})
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-600 text-xs font-semibold bg-red-50 p-3 rounded-xl border border-red-100">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <button
        onClick={() => setShowModal(true)}
        disabled={loading}
        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 mt-2"
      >
        {loading ? 'Yayınlanıyor...' : 'Kayıp İlanını Yayınla'}
      </button>

      {showModal && (
        <OfficialRegistrationModal
          pet={selectedPet}
          onClose={() => setShowModal(false)}
          onSuccess={handlePublish}
        />
      )}
    </div>
  );
};
