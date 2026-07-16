'use client';
import { useState } from 'react';
import { useEstrusDetails, EstrusObservation, ReproductiveTest } from './useEstrusDetails';
import { EstrusObservationForm, getSymptomLabel } from './EstrusObservationForm';
import { ReproductiveTestForm } from './ReproductiveTestForm';
import { Modal } from '@/components/ui/Modal';
import { Icon } from '@/components/ui/Icon';

export function EstrusCycleDetails({ 
  petId, 
  petSpecies, 
  cycleId, 
  startDate, 
  endDate,
  legacySymptoms,
  onDataChanged
}: { 
  petId: string, 
  petSpecies: string, 
  cycleId: string, 
  startDate: string, 
  endDate: string | null,
  legacySymptoms?: string[],
  onDataChanged?: () => void
}) {
  const { observations, tests, loading, addObservation, updateObservation, deleteObservation, addTest, updateTest, deleteTest } = useEstrusDetails(petId, cycleId);
  
  const [activeModal, setActiveModal] = useState<'observation' | 'test' | null>(null);
  const [activeEditData, setActiveEditData] = useState<any>(null);

  const openObservationModal = (data: any = null) => {
    setActiveEditData(data);
    setActiveModal('observation');
  };

  const openTestModal = (data: any = null) => {
    setActiveEditData(data);
    setActiveModal('test');
  };

  const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
      case 'unverified':
        return <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-[10px] font-bold">Kullanıcı Girişi</span>;
      case 'document_attached':
        return <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 text-[10px] font-bold">Belge Eklendi</span>;
      case 'verified':
        return <span className="px-2 py-0.5 rounded-md bg-green-100 text-green-700 text-[10px] font-bold">Doğrulandı</span>;
      case 'rejected':
        return <span className="px-2 py-0.5 rounded-md bg-red-100 text-red-700 text-[10px] font-bold">Reddedildi</span>;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col gap-4 mt-2 border-t border-border-main pt-4">
      <div className="flex flex-wrap gap-2 mb-2">
        <button 
          onClick={() => openObservationModal()}
          className="flex items-center justify-center gap-2 px-3 py-2 bg-primary/10 text-primary rounded-xl text-[13px] font-bold hover:bg-primary/20 transition-all flex-1 min-w-[140px] h-[44px]"
        >
          <Icon name="activity" size={16} />
          Belirti Ekle
        </button>
        <button 
          onClick={() => openTestModal()}
          className="flex items-center justify-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[13px] font-bold hover:bg-indigo-100 transition-all flex-1 min-w-[140px] h-[44px]"
        >
          <Icon name="thermometer" size={16} />
          Test Sonucu Ekle
        </button>
      </div>

      {loading ? (
        <div className="text-center py-4 text-text-secondary text-[13px]">Yükleniyor...</div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Legacy Symptoms */}
          {legacySymptoms && legacySymptoms.length > 0 && (
            <div className="flex flex-col gap-2">
              <h4 className="text-[12px] font-bold text-text-secondary uppercase tracking-wider">Eski Kayıtlar</h4>
              <div className="flex flex-col gap-2">
                {legacySymptoms.map((sym, i) => (
                  <div key={i} className="flex flex-col p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <span className="text-[13px] font-bold text-gray-700">{getSymptomLabel(sym, petSpecies)}</span>
                    <span className="text-[11px] text-gray-500">Eski kayıt — tarih ve şiddet bilgisi bulunmuyor</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tests */}
          {tests.length > 0 && (
            <div className="flex flex-col gap-2">
              <h4 className="text-[12px] font-bold text-text-secondary uppercase tracking-wider">Test Sonuçları</h4>
              <div className="flex flex-col gap-2">
                {tests.map(test => (
                  <div key={test.id} className="flex flex-col p-3 rounded-xl bg-white border border-border-main shadow-sm relative group">
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[13px] font-bold text-text-primary">
                          {test.test_type === 'progesterone' ? 'Progesteron' : 'Vajinal Sitoloji'}
                        </span>
                        <StatusBadge status={test.verification_status} />
                      </div>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => openTestModal(test)}
                          className="text-text-secondary hover:text-primary transition-colors p-1"
                          title="Düzenle"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                        <button 
                          onClick={async () => {
                            await deleteTest(test.id);
                            if (onDataChanged) onDataChanged();
                          }}
                          className="text-text-secondary hover:text-error transition-colors p-1"
                          title="Sil"
                        >
                          <Icon name="trash-2" size={14} />
                        </button>
                      </div>
                    </div>
                    <span className="text-[11px] text-text-secondary mb-2">
                      {new Date(test.sampled_at).toLocaleString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    
                    {test.test_type === 'progesterone' && (
                      <div className="text-[14px] font-bold text-indigo-700">
                        {test.progesterone_value} <span className="text-[12px] font-normal">{test.progesterone_unit}</span>
                      </div>
                    )}
                    
                    {test.test_type === 'vaginal_cytology' && (
                      <div className="flex flex-col gap-1">
                        {test.cytology_superficial_percent !== null && (
                          <div className="text-[13px] font-bold text-indigo-700">
                            %{test.cytology_superficial_percent} Yüzeysel Hücre
                          </div>
                        )}
                        {test.cytology_result && (
                          <div className="text-[12px] text-text-secondary">{test.cytology_result}</div>
                        )}
                      </div>
                    )}

                    {(test.clinic_name || test.veterinarian_name) && (
                      <div className="mt-2 pt-2 border-t border-gray-100 flex items-center gap-1 text-[11px] text-text-secondary">
                        <Icon name="map-pin" size={12} />
                        <span className="truncate">{test.clinic_name} {test.veterinarian_name && `(${test.veterinarian_name})`}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Observations */}
          {observations.length > 0 && (
            <div className="flex flex-col gap-2">
              <h4 className="text-[12px] font-bold text-text-secondary uppercase tracking-wider">Günlük Gözlemler</h4>
              <div className="flex flex-col gap-2">
                {observations.map(obs => (
                  <div key={obs.id} className="flex flex-col p-3 rounded-xl bg-white border border-border-main shadow-sm">
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex flex-col">
                        <span className="text-[13px] font-bold text-text-primary">
                          {getSymptomLabel(obs.symptom_code, petSpecies)}
                        </span>
                        <span className="text-[11px] text-text-secondary">
                          {new Date(obs.observation_date).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          obs.severity === 3 ? 'bg-red-100 text-red-700' : 
                          obs.severity === 2 ? 'bg-orange-100 text-orange-700' : 
                          'bg-green-100 text-green-700'
                        }`}>
                          Seviye {obs.severity}
                        </span>
                        <button 
                          onClick={() => openObservationModal(obs)}
                          className="text-text-secondary hover:text-primary transition-colors p-1"
                          title="Düzenle"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                        <button 
                          onClick={async () => {
                            await deleteObservation(obs.id);
                            if (onDataChanged) onDataChanged();
                          }}
                          className="text-text-secondary hover:text-error transition-colors p-1"
                          title="Sil"
                        >
                          <Icon name="trash-2" size={14} />
                        </button>
                      </div>
                    </div>
                    {obs.notes && (
                      <div className="mt-2 text-[12px] text-text-secondary bg-bg-main p-2 rounded-lg">
                        {obs.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <Modal 
        isOpen={activeModal === 'observation'} 
        onClose={() => setActiveModal(null)}
        title={activeEditData ? "Belirti Düzenle" : "Belirti Ekle"}
      >
        <EstrusObservationForm
          petSpecies={petSpecies}
          cycleStartDate={startDate}
          cycleEndDate={endDate}
          initialData={activeEditData}
          onSave={async (data) => {
            if (activeEditData) {
              await updateObservation(activeEditData.id, data);
            } else {
              await addObservation(data);
            }
            setActiveModal(null);
            if (onDataChanged) onDataChanged();
          }}
          onCancel={() => setActiveModal(null)}
        />
      </Modal>

      <Modal 
        isOpen={activeModal === 'test'} 
        onClose={() => setActiveModal(null)}
        title={activeEditData ? "Test Sonucu Düzenle" : "Test Sonucu Ekle"}
      >
        <ReproductiveTestForm
          cycleStartDate={startDate}
          cycleEndDate={endDate}
          initialData={activeEditData}
          onSave={async (data) => {
            if (activeEditData) {
              await updateTest(activeEditData.id, data);
            } else {
              await addTest(data);
            }
            setActiveModal(null);
            if (onDataChanged) onDataChanged();
          }}
          onCancel={() => setActiveModal(null)}
        />
      </Modal>
    </div>
  );
}
