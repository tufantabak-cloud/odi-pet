'use client'

import { useState, useEffect } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function HealthClient({ petId }: { petId: string }) {
  const supabase = createBrowserSupabaseClient()
  const router = useRouter()
  
  const [activeTab, setActiveTab] = useState<'vaccines' | 'diseases' | 'allergies' | 'medications' | 'payments'>('diseases')
  const [data, setData] = useState<any>({ health_schedules: [], vaccine_records: [], diseases: [], allergies: [], medications: [], payments: [] })
  const [loading, setLoading] = useState(true)

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'record' | 'plan'>('record')
  const [formType, setFormType] = useState('vaccine')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [repeatMode, setRepeatMode] = useState<'custom' | 'infinite'>('custom')
  const [customRepeatCount, setCustomRepeatCount] = useState<number>(2)
  
  // Available Vaccines
  const [vaccinesList, setVaccinesList] = useState<any[]>([])
  const [petData, setPetData] = useState<any>(null)
  const [showAllSchedules, setShowAllSchedules] = useState(false)
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null)
  const [preselectedVaccineId, setPreselectedVaccineId] = useState<string | null>(null)
  
  // Form States for Auto-calculation
  const [formAppliedDate, setFormAppliedDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [formVaccineId, setFormVaccineId] = useState<string>('')
  const [formNextDueDate, setFormNextDueDate] = useState<string>('')

  // Schedule sub-states
  const [scheduleType, setScheduleType] = useState('vaccine')
  const [recurrencePeriod, setRecurrencePeriod] = useState('none')

  const fetchData = async () => {
    setLoading(true)
    const [hsRes, vrRes, dRes, aRes, mRes, pRes, vListRes, petRes] = await Promise.all([
      supabase.from('health_schedules').select('*, vaccines(name)').eq('pet_id', petId).order('due_date', { ascending: true }),
      supabase.from('vaccine_records').select('*, vaccines(name)').eq('pet_id', petId).order('applied_date', { ascending: false }),
      supabase.from('health_diseases').select('*').eq('pet_id', petId).order('diagnosis_date', { ascending: true }),
      supabase.from('health_allergies').select('*').eq('pet_id', petId),
      supabase.from('health_medications').select('*').eq('pet_id', petId),
      supabase.from('payments').select('*').eq('pet_id', petId).order('payment_date', { ascending: false }),
      supabase.from('vaccines').select('*'),
      supabase.from('pets').select('species, vet_name, birth_date').eq('id', petId).single()
    ])
    
    setData({
      health_schedules: hsRes.data || [],
      vaccine_records: vrRes.data || [],
      diseases: dRes.data || [],
      allergies: aRes.data || [],
      medications: mRes.data || [],
      payments: pRes.data || []
    })
    
    // Sadece bu evcil hayvanın türüne ait aşıları listele
    const pData = petRes.data;
    console.log('Pet Data Fetch Result:', pData); // Hata ayıklama için
    setPetData(pData);
    const filteredVaccines = (vListRes.data || []).filter(v => v.species === pData?.species);
    setVaccinesList(filteredVaccines)
    
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [petId])

  // Auto-calculate next due date
  useEffect(() => {
    if (formVaccineId && formAppliedDate && modalMode === 'record') {
      const vaccine = vaccinesList.find(v => v.id === formVaccineId);
      if (vaccine && vaccine.dose_interval_days) {
        const nextDate = new Date(formAppliedDate);
        nextDate.setDate(nextDate.getDate() + vaccine.dose_interval_days);
        setFormNextDueDate(nextDate.toISOString().split('T')[0]);
      } else {
        setFormNextDueDate('');
      }
    }
  }, [formVaccineId, formAppliedDate, modalMode, vaccinesList])

  const calculateNextDate = (baseDate: Date, period: string, index: number) => {
    const next = new Date(baseDate);
    if (period === 'daily') next.setDate(next.getDate() + index);
    else if (period === 'weekly') next.setDate(next.getDate() + index * 7);
    else if (period === 'monthly') next.setMonth(next.getMonth() + index);
    else if (period === 'yearly') next.setFullYear(next.getFullYear() + index);
    return next;
  }

  const formatInterval = (days: number) => {
    if (!days) return '';
    if (days >= 365) return `(${Math.floor(days / 365)} Yıl)`;
    if (days >= 30) return `(${Math.floor(days / 30)} Ay)`;
    if (days >= 7) return `(${Math.floor(days / 7)} Hafta)`;
    return `(${days} Gün)`;
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    const fd = new FormData(e.currentTarget)
    
    try {
      if (modalMode === 'plan') {
        const pType = fd.get('plan_type') as string;
        const vId = pType === 'vaccine' ? fd.get('vaccine_id') : null;
        let vTitle = pType === 'vaccine' ? vaccinesList.find(v => v.id === vId)?.name : fd.get('title');
        if (!vTitle && pType === 'vaccine') vTitle = 'Aşı';

        const baseDateStr = fd.get('due_date') as string;
        const period = fd.get('recurrence_period') as string;
        
        let finalRepeatCount = 1;
        if (period !== 'none') {
          if (repeatMode === 'infinite') {
             finalRepeatCount = 6; // MAX 6 RULE FOR INFINITE
          } else {
             // If custom, respect it, but maybe hardcap at 6 or whatever. 
             // The prompt says "never create > 6 future tasks". So we cap custom at 6 as well.
             finalRepeatCount = Math.min(customRepeatCount || 2, 6);
          }
        }
        
        const baseDate = new Date(baseDateStr);
        
        // Create plan first
        const planRes = await supabase.from('health_plans').insert({
          pet_id: petId,
          frequency: period,
          dose_count: finalRepeatCount
        }).select('id').single();
        
        const planId = planRes.data?.id;

        const inserts = [];
        for (let i = 0; i < finalRepeatCount; i++) {
          const d = calculateNextDate(baseDate, period, i);
          inserts.push({
            pet_id: petId,
            plan_type: pType,
            vaccine_id: vId || null,
            title: vTitle,
            due_date: d.toISOString().split('T')[0],
            status: 'upcoming',
            plan_id: planId,
            source: 'manual'
          });
        }
        await supabase.from('health_schedules').insert(inserts)

      } else {
        if (formType === 'vaccine') {
        const scheduleId = fd.get('schedule_id') as string | null;
        const nextDueDate = fd.get('next_due_date') as string | null;
        
        const { error: vaccineInsertError } = await supabase.from('vaccine_records').insert({
          pet_id: petId,
          vaccine_id: fd.get('vaccine_id') || null,
          schedule_id: scheduleId ? scheduleId : null,
          applied_date: fd.get('applied_date'),
          next_due_date: nextDueDate || null,
          vet_name: fd.get('vet_name'),
          location: fd.get('location'),
          lot_number: fd.get('lot_number'),
          brand_name: fd.get('brand_name'),
          notes: fd.get('notes')
        })
        if (vaccineInsertError) throw vaccineInsertError;

        // Update existing schedule as done
        if (scheduleId) {
           await supabase.from('health_schedules').update({ status: 'done' }).eq('id', scheduleId);
        } else {
           // Otomatik senkronizasyon: Eğer bağımsız kayıt girildiyse, 
           // bu aşıya ait bekleyen tüm takvim planlarını "yapıldı" olarak işaretle
           const vId = fd.get('vaccine_id');
           if (vId) {
              await supabase.from('health_schedules')
                .update({ status: 'done' })
                .eq('pet_id', petId)
                .eq('vaccine_id', vId)
                .neq('status', 'done');
           }
        }
        
        // Care Score Bonus (+10 for vaccine completion)
        await supabase.rpc('adjust_care_score', { p_pet_id: petId, p_delta: 10 });

        // If nextDueDate is explicitly set, create a new branch/schedule
        if (nextDueDate) {
           await supabase.from('health_schedules').insert({
             pet_id: petId,
             plan_type: 'vaccine',
             vaccine_id: fd.get('vaccine_id') || null,
             title: selectedSchedule?.title || vaccinesList.find(v => v.id === fd.get('vaccine_id'))?.name || 'Aşı',
             due_date: nextDueDate,
             status: 'upcoming',
             source: 'manual_branch'
           });
        }
        
        // Eğer tutar girildiyse ödeme kaydı da oluştur
        const amountStr = fd.get('amount') as string;
        if (amountStr && parseFloat(amountStr) > 0) {
           await supabase.from('payments').insert({
              pet_id: petId,
              amount: parseFloat(amountStr),
              payment_type: (selectedSchedule?.vaccines?.name || selectedSchedule?.title || 'Aşı / Parazit İşlemi'),
              payment_date: fd.get('applied_date') || new Date().toISOString().split('T')[0],
           });
        }
      } else if (formType === 'disease') {
        await supabase.from('health_diseases').insert({
          pet_id: petId,
          disease_name: fd.get('disease_name'),
          diagnosis_date: fd.get('diagnosis_date'),
          treatment: fd.get('treatment')
        })
      } else if (formType === 'allergy') {
        await supabase.from('health_allergies').insert({
          pet_id: petId,
          trigger_name: fd.get('trigger_name'),
          symptoms: fd.get('symptoms'),
          treatment: fd.get('treatment')
        })
      } else if (formType === 'medication') {
        await supabase.from('health_medications').insert({
          pet_id: petId,
          medication_name: fd.get('medication_name'),
          dose: fd.get('dose'),
          usage_duration: fd.get('usage_duration')
        })
      } else if (formType === 'payment') {
        await supabase.from('payments').insert({
          pet_id: petId,
          amount: fd.get('amount'),
          payment_type: fd.get('payment_type'),
          payment_date: fd.get('payment_date'),
          notes: fd.get('notes')
        })
      }
      }
      setIsModalOpen(false)
      setSelectedSchedule(null)
      setPreselectedVaccineId(null)
      setFormVaccineId('')
      setFormNextDueDate('')
      await fetchData()
      router.refresh()
    } catch (err: any) {
      console.error('Kayıt Hatası Detayı:', err)
      const msg = err.message || JSON.stringify(err)
      const code = err.code || 'NO_CODE'
      const details = err.details || 'NO_DETAILS'
      alert(`Kayıt sırasında bir hata oluştu:\nMesaj: ${msg}\nKod: ${code}\nDetay: ${details}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const quickMarkDone = async (schedule: any) => {
    if (window.confirm(`'${schedule.title || schedule.vaccines?.name}' için takvimdeki planlanan tarih olan ${new Date(schedule.due_date).toLocaleDateString('tr-TR')} baz alınarak hızlı kayıt oluşturulacaktır.\n\nOnaylıyor musunuz?`)) {
      setIsSubmitting(true);
      try {
        if (schedule.plan_type === 'vaccine') {
          await supabase.from('vaccine_records').insert({
            pet_id: petId,
            vaccine_id: schedule.vaccine_id,
            schedule_id: schedule.id,
            applied_date: schedule.due_date
          });
          await supabase.rpc('adjust_care_score', { p_pet_id: petId, p_delta: 10 });
        } else {
          await supabase.from('health_schedules').update({ status: 'done' }).eq('id', schedule.id);
          await supabase.rpc('adjust_care_score', { p_pet_id: petId, p_delta: 5 });
        }
        
        // Trigger predictive risk recalculation in background
        fetch(`/api/predictive-risk/${petId}?force=true`).catch(console.error);

        fetchData();
      } finally {
        setIsSubmitting(false);
      }
    }
  }

  const markScheduleAsDone = (schedule: any) => {
    setSelectedSchedule(schedule);
    setFormVaccineId(schedule.vaccine_id || '');
    setFormAppliedDate(schedule.due_date);
    setModalMode('record');
    setFormType('vaccine');
    setIsModalOpen(true);
  }

  const postponeSchedule = async (schedule: any, days: number) => {
    setIsSubmitting(true);
    const newDate = new Date(schedule.due_date);
    newDate.setDate(newDate.getDate() + days);
    
    await supabase.from('health_schedules').update({ 
      due_date: newDate.toISOString().split('T')[0],
      postpone_count: (schedule.postpone_count || 0) + 1
    }).eq('id', schedule.id);
    
    // Care Score penalty for postponing
    await supabase.rpc('adjust_care_score', { p_pet_id: petId, p_delta: -5 });
    
    // Trigger predictive risk recalculation in background
    fetch(`/api/predictive-risk/${petId}?force=true`).catch(console.error);
    
    setIsModalOpen(false);
    setSelectedSchedule(null);
    fetchData();
    setIsSubmitting(false);
  }

  const cancelSchedule = async (schedule: any) => {
    if (schedule.plan_id) {
       const choice = window.confirm('Bu görev tekrarlayan bir planın parçası.\nSADECE BU görevi silmek için TAMAM (OK) tıklayın.\nTÜM GELECEK görevleri silmek için İPTAL (CANCEL) tıklayın.');
       if (choice) {
           await supabase.from('health_schedules').delete().eq('id', schedule.id);
       } else {
           if (window.confirm('Emin misiniz? Tüm gelecek kayıtlar silinecek.')) {
               await supabase.from('health_schedules').delete().eq('plan_id', schedule.plan_id).gte('due_date', schedule.due_date);
           } else {
               return; // İptal edildi
           }
       }
    } else {
       if (!window.confirm('Bu hatırlatmayı iptal etmek (silmek) istediğinize emin misiniz?')) return;
       await supabase.from('health_schedules').delete().eq('id', schedule.id);
    }
    
    setIsSubmitting(true);
    setIsModalOpen(false);
    setSelectedSchedule(null);
    fetchData();
    setIsSubmitting(false);
  }

  const renderVaccines = () => {
    const today = new Date();
    today.setHours(0,0,0,0);
    
    // Only show 'vaccine' plan_type in the Vaccine Tab
    const allVaccineSchedules = data.health_schedules.filter((s:any) => s.plan_type === 'vaccine' && s.status !== 'done');
    
    // Sadece 7 gün sonrasına kadar olanlar UPCOMING
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    const overdue = allVaccineSchedules.filter((s:any) => new Date(s.due_date) < today);
    const upcomingAll = allVaccineSchedules.filter((s:any) => new Date(s.due_date) >= today && new Date(s.due_date) <= nextWeek);
    const laterAll = allVaccineSchedules.filter((s:any) => new Date(s.due_date) > nextWeek);

    // Kısıtlamalar (TOTAL HARD LIMIT 15)
    // Overdue -> Unlimited (we can cap at 5 if we want, but prompt says unlimited)
    const upcoming = upcomingAll.slice(0, 5);
    const later = laterAll.slice(0, 5);

    const renderScheduleCard = (s: any) => {
      const due = new Date(s.due_date);
      const diffTime = due.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      let statusColor = 'border-l-success';
      let bgBadge = 'bg-success/10 text-success';
      let label = 'İleri Tarihli';
      
      if (diffDays < 0) {
        statusColor = 'border-l-error';
        bgBadge = 'bg-error/10 text-error';
        label = 'Gecikti';
      } else if (diffDays === 0) {
        statusColor = 'border-l-info';
        bgBadge = 'bg-info/10 text-info';
        label = 'Bugün';
      } else if (diffDays <= 7) {
        statusColor = 'border-l-warning';
        bgBadge = 'bg-warning/10 text-warning';
        label = 'Yaklaşıyor';
      }

      return (
        <div key={s.id} className={`card-base p-5 flex justify-between items-center bg-surface border-l-4 ${statusColor} ${s.postpone_count >= 4 ? 'ring-2 ring-error/50 bg-error/5' : ''}`}>
          <div>
            <div className="flex items-center gap-2">
               <h3 className="font-extrabold text-text-primary text-[16px]">{s.vaccines?.name || s.title || 'Aşı'}</h3>
               {s.postpone_count >= 2 && (
                 <span className="text-[10px] bg-error/10 text-error px-2 py-0.5 rounded font-bold" title="Bu görev sürekli erteleniyor">Sürekli Erteleniyor</span>
               )}
            </div>
            <p className="text-[13px] text-text-secondary mt-1">Planlanan: <span className="font-semibold">{new Date(s.due_date).toLocaleDateString('tr-TR')}</span></p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[11px] font-bold px-3 py-1 rounded-md ${bgBadge}`}>
              {label} {diffDays !== 0 ? `(${Math.abs(diffDays)} gün ${diffDays < 0 ? 'geçti' : 'kaldı'})` : ''}
            </span>
            <div className="flex flex-col sm:flex-row gap-1">
              <button onClick={() => quickMarkDone(s)} className="text-[11px] font-bold bg-success/10 text-success px-2 py-1 rounded hover:bg-success/20 transition-colors whitespace-nowrap">Hızlı Onay</button>
              <button onClick={() => markScheduleAsDone(s)} className="text-[11px] font-bold bg-primary/10 text-primary px-2 py-1 rounded hover:bg-primary/20 transition-colors whitespace-nowrap">Detaylı Gir</button>
            </div>
          </div>
        </div>
      );
    };

    const currentYear = new Date().getFullYear();
    const isVaccineVisible = (v: any) => {
      // (1. Doz) aşılar sadece Puppy DP yapıldıysa görünür (Köpekler için)
      if (v.name.includes('(1. Doz)') && petData?.species === 'Köpek') {
        const puppyDP = vaccinesList.find(vac => vac.name.includes('Puppy DP'));
        if (puppyDP) {
          const isPuppyDPDone = data.vaccine_records.some((r: any) => r.vaccine_id === puppyDP.id);
          if (!isPuppyDPDone) return false;
        }
      }

      // 2. Dozlar sadece 1. Doz yapıldıysa görünür
      if (v.name.includes('(2. Doz)')) {
        const dose1Name = v.name.replace('(2. Doz)', '(1. Doz)');
        const dose1 = vaccinesList.find(vac => vac.name === dose1Name);
        if (dose1) {
          const isDose1Done = data.vaccine_records.some((r: any) => r.vaccine_id === dose1.id);
          if (!isDose1Done) return false;
        }
      }
      
      // Yıllık Tekrarlar sadece (2. Doz) veya (1. Doz) (eğer tek dozluk seriyse) yapıldıysa görünür
      if (v.name.includes('(Yıllık Tekrar)')) {
        const dose2Name = v.name.replace('(Yıllık Tekrar)', '(2. Doz)');
        const dose2 = vaccinesList.find(vac => vac.name === dose2Name);
        if (dose2) {
          const isDose2Done = data.vaccine_records.some((r: any) => r.vaccine_id === dose2.id);
          if (!isDose2Done) return false;
        } else {
          // Eğer 2. doz yoksa (örneğin sadece 1 doz + yıllık), 1. doza bak
          const dose1Name = v.name.replace('(Yıllık Tekrar)', '(1. Doz)');
          const dose1 = vaccinesList.find(vac => vac.name === dose1Name);
          if (dose1) {
            const isDose1Done = data.vaccine_records.some((r: any) => r.vaccine_id === dose1.id);
            if (!isDose1Done) return false;
          }
        }
      }
      
      return true;
    };

    const coreVaccines = vaccinesList.filter(v => 
      v.is_core && 
      (!v.dose_interval_days || v.dose_interval_days < 365) &&
      isVaccineVisible(v)
    );
    const yearlyVaccines = vaccinesList.filter(v => 
      v.dose_interval_days >= 365 &&
      isVaccineVisible(v)
    );

    const renderChecklistItem = (v: any) => {
      const record = data.vaccine_records.find((r: any) => {
        const isSameVaccine = r.vaccine_id === v.id;
        if (!isSameVaccine) return false;
        
        // Eğer (2. Doz) ise veya periyodu 1 yıldan azsa (yavru serisi), ömür boyu yapıldı say
        const isCoreSeries = v.name.includes('(2. Doz)') || v.name.includes('(1. Doz)') || v.name.includes('Puppy DP') || (v.dose_interval_days < 365 && v.dose_interval_days !== null);
        
        if (isCoreSeries) return true;

        // Yıllık tekrarlar için sadece bu yıla bak
        if (v.dose_interval_days >= 365) {
          return new Date(r.applied_date).getFullYear() === currentYear;
        }
        
        return true;
      });
      
      const isDone = !!record;
      const nextSchedule = data.health_schedules.find((s: any) => 
        s.vaccine_id === v.id && 
        s.status !== 'done'
      );

      return (
        <div key={v.id} className={`flex items-center justify-between p-3 rounded-xl border ${isDone ? 'bg-success/5 border-success/20' : 'bg-warning/5 border-warning/20'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[12px] ${isDone ? 'bg-success text-white' : 'bg-warning/20 text-warning'}`}>
              {isDone ? '✓' : '!'}
            </div>
            <div>
              <p className={`text-[13px] font-bold ${isDone ? 'text-success' : 'text-text-primary'}`}>{v.name}</p>
              {isDone ? (
                <p className="text-[11px] text-success/70">Yapıldı: {new Date(record.applied_date).toLocaleDateString('tr-TR')}</p>
              ) : (
                <p className="text-[11px] text-warning flex flex-wrap gap-1 items-center">
                  <span>Bu yıl henüz yapılmadı!</span>
                  <span className="font-bold bg-warning/10 px-1.5 py-0.5 rounded text-[10px]">
                    • Son Tarih: {
                      nextSchedule 
                        ? new Date(nextSchedule.due_date).toLocaleDateString('tr-TR')
                        : v.recommended_age_start_days 
                          ? new Date(new Date(petData?.birth_date || new Date()).getTime() + (v.recommended_age_start_days * 24 * 60 * 60 * 1000)).toLocaleDateString('tr-TR')
                          : 'Planlanmadı'
                    }
                  </span>
                </p>
              )}
            </div>
          </div>
          {!isDone && (
            <button 
              onClick={() => { 
                if (nextSchedule) {
                  markScheduleAsDone(nextSchedule);
                } else {
                  setPreselectedVaccineId(v.id);
                  setFormVaccineId(v.id);
                  setFormAppliedDate(new Date().toISOString().split('T')[0]);
                  setFormType('vaccine'); 
                  setModalMode('record'); 
                  setIsModalOpen(true); 
                }
              }} 
              className="text-[11px] font-bold text-primary hover:underline px-3 py-1 bg-primary/5 rounded-lg"
            >
              Kaydet
            </button>
          )}
        </div>
      );
    };

    return (
      <div className="flex flex-col gap-8">
        {/* Yıllık Sağlık Kontrol Listesi */}
        <div className="card-base p-6 bg-surface border-2 border-primary/10 shadow-sm">
          <h3 className="text-[16px] font-black text-text-primary mb-4 flex items-center gap-2">
            🛡️ {currentYear} Yılı Sağlık Kontrol Listesi
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-[12px] font-black text-text-secondary uppercase tracking-widest mb-3 ml-1">📍 ZORUNLU AŞILAR</p>
              <div className="flex flex-col gap-2">
                {coreVaccines.map(renderChecklistItem)}
              </div>
            </div>
            <div>
              <p className="text-[12px] font-black text-text-secondary uppercase tracking-widest mb-3 ml-1">🔄 YILLIK TEKRARLAR</p>
              <div className="flex flex-col gap-2">
                {yearlyVaccines.map(renderChecklistItem)}
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-[18px] font-extrabold text-text-primary mb-4 flex items-center gap-2">
            📅 Aşı Takvimi
          </h3>
          
          {allVaccineSchedules.length === 0 ? <EmptyState msg="Planlanmış aşı takvimi bulunamadı."/> : (
            <div className="flex flex-col gap-6">
              {/* 1. Gecikmiş Aşılar */}
              {overdue.length > 0 && (
                <div className="flex flex-col gap-3">
                  <p className="text-[12px] font-black text-error uppercase tracking-wider ml-1">🔴 Gecikmiş İşlemler</p>
                  {overdue.map(renderScheduleCard)}
                </div>
              )}

              {/* 2. Yaklaşan Planlar (7 Gün) */}
              {upcoming.length > 0 && (
                <div className="flex flex-col gap-3">
                  <p className="text-[12px] font-black text-warning uppercase tracking-wider ml-1">📅 Yaklaşan (7 Gün)</p>
                  {upcoming.map(renderScheduleCard)}
                </div>
              )}

              {/* 3. Gelecek Planlar */}
              {later.length > 0 && (
                <div className="flex flex-col gap-3">
                  <p className="text-[12px] font-black text-text-secondary uppercase tracking-wider ml-1">🚀 Gelecek Planlar</p>
                  {later.map(renderScheduleCard)}
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          <h3 className="text-[18px] font-extrabold text-text-primary mb-4 flex items-center gap-2">
            ✅ Geçmiş Aşı Kayıtları
          </h3>
          {data.vaccine_records.length === 0 ? <p className="text-[14px] text-text-secondary">Henüz kayıtlı aşı geçmişi yok.</p> : (
            <div className="flex flex-col gap-3">
              {data.vaccine_records.map((r: any) => (
                <div key={r.id} className="card-base p-5 bg-surface border-border-main border flex justify-between items-center opacity-80">
                  <div>
                    <h3 className="font-extrabold text-text-primary text-[16px]">{r.vaccines?.name || 'Aşı'}</h3>
                    <p className="text-[13px] text-text-secondary mt-1">Uygulama: <span className="font-semibold">{new Date(r.applied_date).toLocaleDateString('tr-TR')}</span></p>
                    {r.vet_name && <p className="text-[12px] text-text-secondary mt-1">Veteriner: {r.vet_name}</p>}
                  </div>
                  {r.next_due_date && (
                     <div className="text-right">
                       <p className="text-[11px] font-semibold text-text-secondary">Sonraki Doz</p>
                       <p className="text-[14px] font-bold text-text-primary">{new Date(r.next_due_date).toLocaleDateString('tr-TR')}</p>
                     </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderOtherSchedules = (type: string) => {
    const schedules = data.health_schedules.filter((s:any) => s.plan_type === type && s.status !== 'done');
    if (schedules.length === 0) return null;
    return (
      <div className="mb-6 card-base p-5 bg-surface/50 border border-border-main">
         <h4 className="font-bold text-[14px] text-text-primary mb-3">Planlanmış Hatırlatmalar</h4>
         <div className="flex flex-col gap-2">
            {schedules.map((s:any) => (
               <div key={s.id} className="flex justify-between items-center bg-bg-main p-3 rounded-lg border border-border-main">
                  <div>
                     <p className="font-semibold text-[13px] text-text-primary">{s.title}</p>
                     <p className="text-[12px] text-text-secondary">Tarih: {new Date(s.due_date).toLocaleDateString('tr-TR')}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => quickMarkDone(s)} className="text-[11px] bg-success/10 text-success px-2 py-1 rounded-md font-bold">Hızlı Onay</button>
                    <button onClick={() => markScheduleAsDone(s)} className="text-[11px] bg-primary/10 text-primary px-2 py-1 rounded-md font-bold">Detaylı Gir</button>
                  </div>
               </div>
            ))}
         </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {[
            { id: 'vaccines', label: '💉 Aşı OS' },
            { id: 'diseases', label: 'Hastalıklar' },
            { id: 'allergies', label: 'Alerjiler' },
            { id: 'medications', label: 'İlaçlar' },
            { id: 'payments', label: 'Maliyet ve Ödeme' },
          ].map(t => (
            <button key={t.id} onClick={() => {
              if (t.id === 'vaccines') {
                router.push(`/owner/pets/${petId}/vaccines`)
              } else {
                setActiveTab(t.id as any)
              }
            }}
              className={`px-4 py-2 rounded-full text-[13px] font-bold shrink-0 transition-all ${activeTab === t.id ? 'bg-primary text-white shadow-md' : 'bg-surface border border-border-main text-text-secondary hover:border-primary/40'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary text-[13px] py-2 px-5 min-w-[120px] shrink-0 shadow-lg shadow-primary/30">
          + Kayıt Ekle
        </button>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center"><div className="w-8 h-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin"/></div>
      ) : (
        <div className="flex flex-col gap-4">


          {activeTab === 'diseases' && (
            <>
              {renderOtherSchedules('checkup')}
              {data.diseases.length === 0 ? <EmptyState msg="Kayıtlı hastalık bulunamadı."/> : data.diseases.map((d: any) => (
                <div key={d.id} className="card-base p-5 bg-surface border-l-4 border-l-error">
                  <div className="flex justify-between items-start">
                    <h3 className="font-extrabold text-text-primary text-[16px]">{d.disease_name}</h3>
                    <span className={`text-[11px] font-bold px-2 py-1 rounded-md ${d.is_resolved ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                      {d.is_resolved ? 'İyileşti' : 'Tedavi Aşamasında'}
                    </span>
                  </div>
                  <p className="text-[13px] text-text-secondary mt-1">Teşhis: {new Date(d.diagnosis_date).toLocaleDateString('tr-TR')}</p>
                  <div className="mt-3 p-3 bg-bg-main rounded-[12px] border border-border-main text-[13px]">
                    <strong className="text-text-primary">Tedavi: </strong> {d.treatment}
                  </div>
                </div>
              ))}
            </>
          )}

          {activeTab === 'allergies' && (
            data.allergies.length === 0 ? <EmptyState msg="Kayıtlı alerji bulunamadı."/> : data.allergies.map((a: any) => (
              <div key={a.id} className="card-base p-5 bg-surface border-l-4 border-l-warning">
                <h3 className="font-extrabold text-text-primary text-[16px]">Tetikleyici: {a.trigger_name}</h3>
                <p className="text-[13px] text-text-secondary mt-1">Semptomlar: {a.symptoms}</p>
                {a.treatment && <p className="text-[13px] text-text-secondary mt-1">Acil Müdahale: {a.treatment}</p>}
              </div>
            ))
          )}

          {activeTab === 'medications' && (
            <>
              {renderOtherSchedules('medication')}
              {data.medications.length === 0 ? <EmptyState msg="Kayıtlı ilaç bulunamadı."/> : data.medications.map((m: any) => (
                <div key={m.id} className="card-base p-5 bg-surface border-l-4 border-l-primary">
                  <div className="flex justify-between items-start">
                    <h3 className="font-extrabold text-text-primary text-[16px]">{m.medication_name}</h3>
                    <span className={`text-[11px] font-bold px-2 py-1 rounded-md ${m.is_active ? 'bg-success/10 text-success' : 'bg-border-main text-text-secondary'}`}>
                      {m.is_active ? 'Aktif Kullanım' : 'Bitti'}
                    </span>
                  </div>
                  <p className="text-[13px] text-text-secondary mt-1">Doz: {m.dose} • Süre: {m.usage_duration}</p>
                </div>
              ))}
            </>
          )}

          {activeTab === 'payments' && (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="card-base p-5 bg-success/10 border-success/20">
                  <p className="text-[13px] font-bold text-success">Toplam Harcama</p>
                  <p className="text-[24px] font-black text-text-primary mt-1">
                    {data.payments.reduce((acc: number, p: any) => acc + Number(p.amount), 0).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                  </p>
                </div>
                <div className="card-base p-5 bg-surface border-border-main flex flex-col justify-center items-center cursor-pointer hover:border-primary/40" onClick={() => { setFormType('payment'); setIsModalOpen(true); }}>
                  <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[18px] mb-2">+</span>
                  <p className="text-[13px] font-bold text-text-secondary">Yeni Ödeme Ekle</p>
                </div>
              </div>

              <div>
                <h3 className="text-[16px] font-extrabold text-text-primary mb-3">Ödeme Geçmişi</h3>
                {data.payments.length === 0 ? <EmptyState msg="Kayıtlı ödeme bulunamadı."/> : (
                  <div className="flex flex-col gap-2">
                    {data.payments.map((p: any) => (
                      <div key={p.id} className="card-base p-4 bg-surface border border-border-main flex justify-between items-center">
                        <div>
                          <p className="font-bold text-[14px] text-text-primary">{p.payment_type || 'Klinik Ödemesi'}</p>
                          <p className="text-[12px] text-text-secondary">{new Date(p.payment_date).toLocaleDateString('tr-TR')} {p.notes ? ` • ${p.notes}` : ''}</p>
                        </div>
                        <p className="font-black text-[15px] text-text-primary">{Number(p.amount).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !isSubmitting && setIsModalOpen(false)}>
          <div className="bg-surface w-full max-w-md rounded-[28px] shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-[20px] font-extrabold text-text-primary">
                {selectedSchedule ? 'Hatırlatmayı Tamamla' : 'Sağlık Merkezi İşlemleri'}
              </h2>
              <button disabled={isSubmitting} onClick={() => { 
                setIsModalOpen(false); 
                setSelectedSchedule(null); 
                setPreselectedVaccineId(null); 
                setFormVaccineId('');
                setFormNextDueDate('');
              }} className="w-8 h-8 rounded-full bg-bg-main flex items-center justify-center text-text-secondary hover:text-error transition-colors">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* MODE SWITCHER */}
              {!selectedSchedule && (
                <div className="flex bg-bg-main p-1 rounded-xl mb-2">
                  <button type="button" onClick={() => setModalMode('record')} className={`flex-1 py-2.5 text-[13px] font-bold rounded-lg transition-all ${modalMode === 'record' ? 'bg-surface shadow-sm text-primary' : 'text-text-secondary hover:text-text-primary'}`}>✅ Yapıldı Ekle</button>
                  <button type="button" onClick={() => setModalMode('plan')} className={`flex-1 py-2.5 text-[13px] font-bold rounded-lg transition-all ${modalMode === 'plan' ? 'bg-surface shadow-sm text-primary' : 'text-text-secondary hover:text-text-primary'}`}>📅 Yeni Plan Oluştur</button>
                </div>
              )}

              {selectedSchedule && (
                <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 mb-2">
                  <p className="text-[11px] font-bold text-primary uppercase tracking-wider mb-1">Tamamlanan Görev</p>
                  <p className="text-[15px] font-black text-text-primary">
                    {selectedSchedule.vaccines?.name || selectedSchedule.title}
                  </p>
                  <p className="text-[12px] text-text-secondary">Planlanan Tarih: {new Date(selectedSchedule.due_date).toLocaleDateString('tr-TR')}</p>
                </div>
              )}

              {modalMode === 'plan' ? (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-bold text-text-secondary">Planlanacak Süreç</label>
                    <select name="plan_type" required className="input-base" value={scheduleType} onChange={e => setScheduleType(e.target.value)}>
                      <option value="vaccine">Aşı / Parazit Takibi</option>
                      <option value="medication">İlaç Kullanımı</option>
                      <option value="checkup">Muayene / Kontrol</option>
                    </select>
                  </div>

                  {scheduleType === 'vaccine' ? (
                    <select name="vaccine_id" required className="input-base" aria-label="Aşı Seçimi" title="Aşı Seçimi">
                      <option value="">İşlem Seçin (Aşı, Parazit vs)...</option>
                      <optgroup label="ZORUNLU AŞILAR">
                        {vaccinesList.filter(v => v.is_core && (!v.dose_interval_days || v.dose_interval_days < 365)).map(v => (
                          <option key={v.id} value={v.id}>{v.name} {v.dose_interval_days ? formatInterval(v.dose_interval_days) : ''}</option>
                        ))}
                      </optgroup>
                      <optgroup label="YILLIK TEKRARLAR">
                        {vaccinesList.filter(v => v.dose_interval_days >= 365).map(v => (
                          <option key={v.id} value={v.id}>{v.name} {v.dose_interval_days ? formatInterval(v.dose_interval_days) : ''}</option>
                        ))}
                      </optgroup>
                      <optgroup label="PARAZİT VE DİĞER">
                        {vaccinesList.filter(v => !v.is_core && v.dose_interval_days < 365).map(v => (
                          <option key={v.id} value={v.id}>{v.name} {v.dose_interval_days ? formatInterval(v.dose_interval_days) : ''}</option>
                        ))}
                      </optgroup>
                    </select>
                  ) : (
                    <input name="title" required placeholder={scheduleType === 'medication' ? 'İlaç/Damla Adı' : 'Muayene Sebebi'} className="input-base"/>
                  )}

                  <div className="flex flex-col gap-1">
                    <label className="text-[12px] font-bold text-text-secondary ml-1">Planlama Başlangıç Tarihi</label>
                    <input name="due_date" type="date" required className="input-base"/>
                  </div>

                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-[12px] font-bold text-text-secondary ml-1">Takip Periyodu</label>
                      <select name="recurrence_period" className="input-base" value={recurrencePeriod} onChange={e => setRecurrencePeriod(e.target.value)}>
                        <option value="none">Tek Seferlik (Tekrar Etmez)</option>
                        <option value="daily">Günlük</option>
                        <option value="weekly">Haftalık</option>
                        <option value="monthly">Aylık</option>
                        <option value="yearly">Yıllık</option>
                      </select>
                    </div>
                    {recurrencePeriod !== 'none' && (
                      <div className="flex flex-col gap-1">
                        <label className="text-[12px] font-bold text-text-secondary ml-1">Bitiş / Doz Sınırı</label>
                        <div className="flex gap-2">
                          <select className="input-base px-2 text-[13px] flex-1" value={repeatMode} onChange={e => setRepeatMode(e.target.value as 'custom' | 'infinite')}>
                            <option value="custom">Sınırlı Doz</option>
                            <option value="infinite">Sürekli (Süresiz)</option>
                          </select>
                          {repeatMode === 'custom' && (
                            <input name="repeat_count" type="number" min="2" max="100" value={customRepeatCount} onChange={e => setCustomRepeatCount(parseInt(e.target.value))} required className="input-base w-24 px-2"/>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-3 bg-info/10 rounded-xl border border-info/20 text-info mt-1">
                    <p className="text-[12px] leading-relaxed">
                      <strong>İpucu:</strong> Geçmişte doğan bir hayvanınız varsa (Örn: 4 yaşında), başlangıç tarihini doğum tarihi olarak seçip uygun bir periyot girerek bugüne kadar olan tüm geçmiş planları tek seferde oluşturabilirsiniz.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  {!selectedSchedule && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[13px] font-bold text-text-secondary">Gerçekleşen İşlem Türü</label>
                      <select aria-label="Kayıt Türü Seçimi" title="Kayıt Türü Seçimi" value={formType} onChange={e => setFormType(e.target.value)} className="input-base" disabled={isSubmitting}>
                        <option value="vaccine">Gerçekleşen Aşı / Parazit Kaydı</option>
                        <option value="disease">Hastalık Kaydı</option>
                        <option value="allergy">Alerji Kaydı</option>
                        <option value="medication">İlaç Kaydı</option>
                        <option value="payment">Ödeme Kaydı</option>
                      </select>
                    </div>
                  )}

                  {formType === 'vaccine' && (
                    <>
                      {/* Temel Bilgiler */}
                      {!selectedSchedule ? (
                        <select 
                          name="vaccine_id" 
                          required 
                          className="input-base" 
                          aria-label="Aşı Seçimi" 
                          title="Aşı Seçimi" 
                          value={formVaccineId || preselectedVaccineId || ''} 
                          onChange={(e) => setFormVaccineId(e.target.value)}
                        >
                          <option value="">Aşı / Parazit İşlemi Seçin...</option>
                          <optgroup label="ZORUNLU AŞILAR">
                            {vaccinesList.filter(v => v.is_core && (!v.dose_interval_days || v.dose_interval_days < 365)).map(v => (
                              <option key={v.id} value={v.id}>{v.name} {v.dose_interval_days ? formatInterval(v.dose_interval_days) : ''}</option>
                            ))}
                          </optgroup>
                          <optgroup label="YILLIK TEKRARLAR">
                            {vaccinesList.filter(v => v.dose_interval_days >= 365).map(v => (
                              <option key={v.id} value={v.id}>{v.name} {v.dose_interval_days ? formatInterval(v.dose_interval_days) : ''}</option>
                            ))}
                          </optgroup>
                          <optgroup label="PARAZİT VE DİĞER">
                            {vaccinesList.filter(v => !v.is_core && v.dose_interval_days < 365).map(v => (
                              <option key={v.id} value={v.id}>{v.name} {v.dose_interval_days ? formatInterval(v.dose_interval_days) : ''}</option>
                            ))}
                          </optgroup>
                        </select>
                      ) : (
                        <input type="hidden" name="vaccine_id" value={selectedSchedule.vaccine_id || ''} />
                      )}
                      
                      {!selectedSchedule ? (
                        <select name="schedule_id" className="input-base" aria-label="Bağlı Takvim (Opsiyonel)" title="Bağlı Takvim (Opsiyonel)">
                          <option value="">-- Bağımsız Kayıt (Takvime Bağlama) --</option>
                          {data.health_schedules.filter((s:any)=>s.plan_type === 'vaccine' && s.status!=='done').map((s:any) => (
                            <option key={s.id} value={s.id}>Takvim: {s.title || s.vaccines?.name} - {new Date(s.due_date).toLocaleDateString('tr-TR')}</option>
                          ))}
                        </select>
                      ) : (
                        <input type="hidden" name="schedule_id" value={selectedSchedule.id} />
                      )}

                      {/* Tarih Bilgileri */}
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <label className="text-[12px] font-bold text-text-secondary ml-1 mb-1 block">Uygulama Tarihi *</label>
                          <input 
                            name="applied_date" 
                            type="date" 
                            required 
                            className="input-base" 
                            value={formAppliedDate} 
                            onChange={(e) => setFormAppliedDate(e.target.value)}
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-[12px] font-bold text-text-secondary ml-1 mb-1 block">Sonraki Doz / Tekrar</label>
                          {formVaccineId && !vaccinesList.find(v => v.id === formVaccineId)?.dose_interval_days ? (
                            <div className="bg-bg-main border border-dashed border-border-main rounded-[12px] p-2.5 flex items-center h-[46px]">
                              <p className="text-[11px] text-text-secondary italic">
                                • Bu işlem için tekrar gerekmemektedir.
                              </p>
                            </div>
                          ) : (
                            <input 
                              name="next_due_date" 
                              type="date" 
                              className="input-base" 
                              value={formNextDueDate}
                              onChange={(e) => setFormNextDueDate(e.target.value)}
                            />
                          )}
                        </div>
                      </div>

                      {/* Ürün / Marka Bilgileri */}
                      <div className="border border-border-main rounded-xl p-3 flex flex-col gap-3">
                        <p className="text-[11px] font-bold text-text-secondary uppercase tracking-wide">Ürün Detayları (İsteğe Bağlı)</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="flex flex-col">
                            <label className="text-[12px] font-bold text-text-secondary ml-1 mb-1 block">Marka / Ürün Adı</label>
                            <input name="brand_name" placeholder="Örn: Nobivac, Purevax..." className="input-base w-full"/>
                          </div>
                          <div className="flex flex-col">
                            <label className="text-[12px] font-bold text-text-secondary ml-1 mb-1 block">Seri / Lot No</label>
                            <input name="lot_number" placeholder="Lot numarası" className="input-base w-full"/>
                          </div>
                        </div>
                      </div>

                      {/* Uygulama Yeri */}
                      <div className="border border-border-main rounded-xl p-3 flex flex-col gap-3">
                        <div className="flex justify-between items-center">
                          <p className="text-[11px] font-bold text-text-secondary uppercase tracking-wide">Uygulama Yeri (İsteğe Bağlı)</p>
                          {petData?.vet_name && (
                            <button type="button" onClick={(e) => {
                               const form = (e.target as HTMLElement).closest('form');
                               if (form) {
                                 const input = form.elements.namedItem('vet_name') as HTMLInputElement;
                                 if (input) input.value = petData.vet_name;
                               }
                            }} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded font-bold hover:bg-primary/20 transition-colors">
                              Hızlı Ekle: {petData.vet_name}
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="flex flex-col">
                            <label className="text-[12px] font-bold text-text-secondary ml-1 mb-1 block">Veteriner / Klinik</label>
                            <input name="vet_name" placeholder="Örn: Pet Animal Kliniği..." className="input-base w-full"/>
                          </div>
                          <div className="flex flex-col">
                            <label className="text-[12px] font-bold text-text-secondary ml-1 mb-1 block">Şehir / İlçe</label>
                            <input name="location" placeholder="Örn: İstanbul, Kadıköy" className="input-base w-full"/>
                          </div>
                        </div>
                      </div>

                      {/* Notlar */}
                      <textarea name="notes" rows={2} placeholder="Ekstra notlar (Örn: Hafif reaksiyon gösterdi, açıkta bekletilmedi...)" className="input-base resize-none"/>

                      {/* Ücret */}
                      <div className="flex flex-col gap-1 mt-1">
                        <label className="text-[12px] font-bold text-text-secondary ml-1">İşlem Tutarı (₺) - İsteğe Bağlı</label>
                        <input name="amount" type="number" step="0.01" placeholder="Örn: 500" className="input-base w-full sm:w-1/2"/>
                      </div>
                    </>
                  )}

              {formType === 'disease' && (
                <>
                  <input name="disease_name" required placeholder="Hastalık / Teşhis Adı" className="input-base"/>
                  <input name="diagnosis_date" type="date" aria-label="Teşhis Tarihi" title="Teşhis Tarihi" required className="input-base"/>
                  <textarea name="treatment" required rows={3} placeholder="Uygulanan Tedavi..." className="input-base resize-none"/>
                </>
              )}

              {formType === 'allergy' && (
                <>
                  <input name="trigger_name" required placeholder="Tetikleyici (Örn: Tavuk, Polen)" className="input-base"/>
                  <input name="symptoms" required placeholder="Belirtiler (Örn: Kaşıntı, Kusma)" className="input-base"/>
                  <textarea name="treatment" rows={2} placeholder="Acil Müdahale Yöntemi" className="input-base resize-none"/>
                </>
              )}

              {formType === 'medication' && (
                <>
                  <input name="medication_name" required placeholder="İlaç Adı" className="input-base"/>
                  <input name="dose" required placeholder="Doz (Örn: Günde 2 kez yarım tablet)" className="input-base"/>
                  <input name="usage_duration" required placeholder="Kullanım Süresi (Örn: 2 Hafta)" className="input-base"/>
                </>
              )}

              {formType === 'payment' && (
                <>
                  <input name="amount" type="number" step="0.01" required placeholder="Tutar (₺)" className="input-base"/>
                  <input name="payment_type" required placeholder="Ödeme Tipi (Örn: Aşı, Muayene, İlaç)" className="input-base"/>
                  <input name="payment_date" type="date" required className="input-base"/>
                  <textarea name="notes" rows={2} placeholder="Notlar (Opsiyonel)" className="input-base resize-none"/>
                </>
              )}
                </>
              )}

              {selectedSchedule ? (
                <div className="flex flex-col gap-2 mt-4">
                  <button type="submit" disabled={isSubmitting} className="btn-primary w-full text-[14px] py-3 shadow-md">
                    {isSubmitting ? 'Kaydediliyor...' : '✅ Kaydet ve Tamamla'}
                  </button>
                  <div className="flex flex-col gap-2 mt-2">
                    <p className="text-[11px] font-bold text-text-secondary ml-1">⏳ Ertele Seçenekleri:</p>
                    <div className="grid grid-cols-3 gap-2">
                        <button type="button" disabled={isSubmitting} onClick={() => postponeSchedule(selectedSchedule, 3)} className="py-2 rounded-xl font-bold text-[12px] bg-warning/10 text-warning border border-warning/20 hover:bg-warning/20 transition-all">
                          +3 Gün
                        </button>
                        <button type="button" disabled={isSubmitting} onClick={() => postponeSchedule(selectedSchedule, 7)} className="py-2 rounded-xl font-bold text-[12px] bg-warning/10 text-warning border border-warning/20 hover:bg-warning/20 transition-all">
                          +7 Gün
                        </button>
                        <button type="button" disabled={isSubmitting} onClick={() => postponeSchedule(selectedSchedule, 14)} className="py-2 rounded-xl font-bold text-[12px] bg-warning/10 text-warning border border-warning/20 hover:bg-warning/20 transition-all">
                          +14 Gün
                        </button>
                    </div>
                  </div>
                  <button type="button" disabled={isSubmitting} onClick={() => cancelSchedule(selectedSchedule)} className="mt-2 w-full py-2.5 rounded-xl font-bold text-[13px] bg-error/10 text-error border border-error/20 hover:bg-error/20 transition-all">
                    🗑 İptal Et (Sil)
                  </button>
                </div>
              ) : (
                <button type="submit" disabled={isSubmitting} className="btn-primary mt-4 w-full text-[14px] py-3">
                  {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

const EmptyState = ({ msg }: { msg: string }) => (
  <div className="bg-bg-main border border-border-main rounded-[20px] p-10 text-center flex flex-col items-center">
    <div className="w-16 h-16 bg-surface border border-border-main rounded-2xl flex items-center justify-center text-[24px] mb-4 shadow-sm">📋</div>
    <p className="text-[14px] font-bold text-text-primary">{msg}</p>
    <p className="text-[13px] text-text-secondary mt-1">Sağ üstten "+" butonuna tıklayarak yeni kayıt ekleyebilirsiniz.</p>
  </div>
)
