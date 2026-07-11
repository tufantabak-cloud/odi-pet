'use client';

import React, { useState, useEffect } from 'react';
import CategoryGrid from './CategoryGrid';
import SubCategoryChips from './SubCategoryChips';
import TaskFormAdvanced, { TaskFormData } from './TaskFormAdvanced';
import VaccineSelectorSheet, { VaccineOption } from './VaccineSelectorSheet';
import { TaskCategory, TASK_CATEGORIES, getSmartDefault } from '@/lib/tasks/taskDefaults';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { SmartScanner } from '@/components/ui/SmartScanner';
import { getPlanDisplayTitle } from '@/lib/plans/utils';

interface SmartTaskWizardProps {
  petId: string;
  petSpecies?: string | null;
  taskToEdit?: any;
  /** Wizard açıldığında varsayılan seçili kategori */
  initialCategory?: TaskCategory | null;
  /** Geçmişe yönelik tarih seçimine izin verir (aşı, tedavi geçmişi) */
  allowPastDate?: boolean;
  onClose: () => void;
  onDone: (newTask?: any) => void;
}

const SUB_CATEGORIES_WITH_PICKER: Record<string, 'vaccine' | 'parasite'> = {
  'Aşı': 'vaccine',
  'İç Parazit': 'parasite',
  'Dış Parazit': 'parasite',
  'Parazit Tasması': 'parasite',
  'Birleşik Parazit': 'parasite'
};

/**
 * taskToEdit verisinden geçerli bir TaskCategory çıkarır.
 * DB'de 'Medikal', 'Saglik', 'Bakım' vb. saklanır.
 */
function resolveCategoryFromTask(task: any): TaskCategory | null {
  if (!task?.category) return null;
  let category = task.category === 'Temizlik' ? 'Hijyen' : task.category;
  // Tuvalet eğitimi görevleri artık Aktiviteler altında
  const toiletTrainingSubs = ['Kedi Tuvalet', 'Köpek Tuvalet'];
  if (category === 'Hijyen' && toiletTrainingSubs.includes(task.sub_category)) {
    category = 'Aktiviteler';
  }
  const validIds = TASK_CATEGORIES.map(c => c.id);
  return validIds.includes(category) ? category as TaskCategory : null;
}

export default function SmartTaskWizard({ petId, petSpecies, taskToEdit, initialCategory = null, allowPastDate = true, onClose, onDone }: SmartTaskWizardProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showScanner, setShowScanner] = useState(false);

  // ── State 1: Category ─────────────────────────────────────────────
  const [category, setCategory] = useState<TaskCategory | null>(() =>
    resolveCategoryFromTask(taskToEdit) ?? initialCategory ?? null
  );

  // ── State 2: Sub Category ─────────────────────────────────────────
  const [subCategory, setSubCategory] = useState<string | null>(() =>
    taskToEdit?.sub_category ?? null
  );
  const [customText, setCustomText] = useState<string>(() =>
    // "Diğer" kategorisinde görev başlığı customText olarak başlar
    (taskToEdit?.category === 'Diger' || taskToEdit?.sub_category === 'Diğer')
      ? (taskToEdit?.title || '')
      : ''
  );

  // ── State 2b: Düzenlenebilir başlık (edit modunda) ────────────────
  const [editTitle, setEditTitle] = useState<string>(() =>
    taskToEdit?.title || taskToEdit?.vaccines?.name || ''
  );

  // ── State 3: 3rd-level picker (only when sub-category needs it) ───
  const [selectedVaccine, setSelectedVaccine] = useState<VaccineOption | null>(null);
  const [showVaccinePicker, setShowVaccinePicker] = useState(false);

  // ── State 4: Form Data ────────────────────────────────────────────
  const [formData, setFormData] = useState<TaskFormData>(() => ({
    date: taskToEdit?.due_date
      ? taskToEdit.due_date.split('T')[0]
      : new Date().toISOString().split('T')[0],
    time: taskToEdit?.due_time || '12:00',
    // frequency: notification_rule'dan değil plan_id ilişkisinden gelir.
    // Şimdilik notification_rule'daki frequency'yi de kontrol ederiz.
    frequency: taskToEdit?.plan?.frequency || taskToEdit?.notification_rule?.frequency || 'once',
    interval: taskToEdit?.plan?.interval || 1,
    endCondition: taskToEdit?.plan?.end_condition || 'never',
    endDate: taskToEdit?.plan?.end_date || undefined,
    endOccurrences: taskToEdit?.plan?.end_occurrences || undefined,
    notificationEnabled: taskToEdit?.notification_rule?.enabled ?? true,
    notificationMinutes: taskToEdit?.notification_rule?.minutes_before ?? 0,
    notes: taskToEdit?.notes || '',
    metadata: taskToEdit?.metadata || {}
  }));

  const [advancedOpen, setAdvancedOpen] = useState<boolean>(() => !!taskToEdit);
  const [markAsDone, setMarkAsDone] = useState<boolean>(false);

  // ── Fetch pet species if not provided ────────────────────────────
  const [resolvedSpecies, setResolvedSpecies] = useState<string | null>(petSpecies ?? null);
  useEffect(() => {
    if (petSpecies !== undefined) return;
    const supabase = createBrowserSupabaseClient();
    supabase.from('pets').select('species').eq('id', petId).single().then(({ data }: any) => {
      if (data?.species) setResolvedSpecies(data.species);
    });
  }, [petId, petSpecies]);

  // ── Smart Defaults on sub-category change ─────────────────────────
  // Edit modunda da çalışır — kullanıcı alt kategoriyi değiştirince yeni defaults yüklenir
  useEffect(() => {
    if (!subCategory) return;
    if (subCategory !== 'Diğer') {
      const defaults = getSmartDefault(subCategory);
      setFormData(prev => ({
        ...prev,
        frequency: defaults.frequency,
        interval: defaults.interval,
        notificationMinutes: defaults.notification_minutes,
        notificationEnabled: true,
      }));

      if (SUB_CATEGORIES_WITH_PICKER[subCategory]) {
        setShowVaccinePicker(true);
        setSelectedVaccine(null);
        setAdvancedOpen(false);
      } else {
        setShowVaccinePicker(false);
        setSelectedVaccine(null);
        setAdvancedOpen(true);
      }
    } else {
      setFormData(prev => ({
        ...prev,
        frequency: 'once',
        interval: 1,
        notificationEnabled: false
      }));
      setShowVaccinePicker(false);
      setSelectedVaccine(null);
      setAdvancedOpen(true);
    }
     
  }, [subCategory]);

  const handleVaccineSelect = (vaccine: VaccineOption) => {
    setSelectedVaccine(vaccine);
    setEditTitle(vaccine.name); // aşı seçilince başlık otomatik güncellenir
    setShowVaccinePicker(false);
    
    if (vaccine.isParasite && vaccine.protection_duration_days) {
      setFormData(prev => {
        const d = new Date(prev.date);
        d.setDate(d.getDate() + (vaccine.protection_duration_days || 0));
        return {
          ...prev,
          frequency: 'once',
          interval: 1,
          date: d.toISOString().split('T')[0]
        };
      });
    }

    setAdvancedOpen(true);
  };

  // ── Computed helpers ──────────────────────────────────────────────
  const needsVaccinePicker = subCategory !== null && !!SUB_CATEGORIES_WITH_PICKER[subCategory];
  const pickerSatisfied = !needsVaccinePicker || selectedVaccine !== null;

  // Edit modunda kategori değişince alt kategori sıfırlanır
  const handleCategorySelect = (cat: TaskCategory) => {
    setCategory(cat);
    setSubCategory(null);
    setCustomText('');
    setSelectedVaccine(null);
    setShowVaccinePicker(false);
    setAdvancedOpen(false);
    setEditTitle('');
  };

  // ── Determine final title ─────────────────────────────────────────
  const computeTitle = (): string => {
    if (taskToEdit) {
      // Edit modunda: kullanıcı başlığı doğrudan düzenleyebilir
      if (editTitle.trim()) return editTitle.trim();
      // fallback: aşı seçildiyse vaccine adı
      if (selectedVaccine) return selectedVaccine.name;
      return taskToEdit.title || taskToEdit.vaccines?.name || 'Bakım Planı';
    }
    // Yeni görev
    if (selectedVaccine) return selectedVaccine.name;
    if (category === 'Diger' || subCategory === 'Diğer') return customText;
    return subCategory || '';
  };

  // ── Save handler ──────────────────────────────────────────────────
  const handleSave = async () => {
    // Validation
    if (!category) {
      setError('Lütfen bir kategori seçin.');
      return;
    }
    if (!subCategory && category !== 'Diger') {
      setError('Lütfen bir alt kategori seçin.');
      return;
    }
    if (needsVaccinePicker && !selectedVaccine) {
      setError('Lütfen bir aşı seçin.');
      return;
    }

    const finalTitle = computeTitle();
    if (!finalTitle) {
      setError('Lütfen görev adını girin.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const supabase = createBrowserSupabaseClient();
      const todayStr = new Date().toISOString().split('T')[0];
      const isPastDate = (formData.date <= todayStr) && markAsDone;

      const metadata = {
        ...formData.metadata,
        ...(selectedVaccine
          ? { vaccine_code: selectedVaccine.code, vaccine_name: selectedVaccine.name }
          : {}),
      };

      // ── MÜKERRER KAYIT KONTROLÜ (Sadece Yeni Kayıt İçin) ────────
      if (!taskToEdit) {
        let duplicateQuery = supabase
          .from('health_schedules')
          .select('id, due_date, status')
          .eq('pet_id', petId)
          .eq('category', category)
          .eq('title', finalTitle);

        if (subCategory) {
          duplicateQuery = duplicateQuery.eq('sub_category', subCategory);
        }

        // Ya seçilen tarihte zaten bir kayıt varsa, ya da halihazırda 'upcoming' (gelecek planlı) bir kayıt varsa engelle
        duplicateQuery = duplicateQuery.or(`due_date.eq.${formData.date},status.eq.upcoming`);

        const { data: existingTasks, error: checkError } = await duplicateQuery.limit(1);

        if (checkError) throw checkError;

        if (existingTasks && existingTasks.length > 0) {
          const isSameDate = existingTasks[0].due_date === formData.date;
          if (isSameDate) {
            setError('Bu tarihte aynı görev için zaten bir kayıt mevcut. Lütfen mevcut kaydı düzenleyin.');
          } else {
            setError('Bu görev için halihazırda planlanmış ileri tarihli (aktif) bir kayıt mevcut. Lütfen yeni kayıt açmak yerine mevcut planlamayı düzenleyin.');
          }
          setLoading(false);
          return;
        }
      }

      // ── EDIT MODE ────────────────────────────────────────────────
      if (taskToEdit) {
        // Eğer bu plans tablosundan gelen bir plan kaydı ise
        if (taskToEdit.id.toString().startsWith('plan_')) {
          const realPlanId = taskToEdit.id.replace('plan_', '');
          
          const PLAN_CAT_MAP_REV: Record<string, string> = {
            'Saglik': 'saglik',
            'Medikal': 'asi',
            'Bakım': 'bakim',
            'Beslenme': 'beslenme',
            'Hijyen': 'hijyen',
            'Aktiviteler': 'aktivite',
          };
          let planCategory = PLAN_CAT_MAP_REV[category] || category.toLowerCase();
          if (planCategory === 'asi' && subCategory && (subCategory.includes('Parazit') || subCategory.includes('Tasma') || subCategory.includes('Birleşik'))) {
            planCategory = 'parazit';
          }

          const scheduledAtISO = `${formData.date}T${formData.time}:00+03:00`;

          let notifBefore = formData.notificationMinutes;
          let notifUnit = 'minute';
          if (formData.notificationEnabled) {
            if (notifBefore === 0) {
              notifBefore = 0;
              notifUnit = 'minute';
            } else if (notifBefore % 10080 === 0) {
              notifBefore = notifBefore / 10080;
              notifUnit = 'day';
            } else if (notifBefore % 1440 === 0) {
              notifBefore = notifBefore / 1440;
              notifUnit = 'day';
            } else if (notifBefore % 60 === 0) {
              notifBefore = notifBefore / 60;
              notifUnit = 'hour';
            }
          } else {
            notifBefore = 0;
            notifUnit = 'minute';
          }

          const { data: updatedPlan, error: planUpdateError } = await supabase
            .from('plans')
            .update({
              category: planCategory,
              sub_type: subCategory,
              scheduled_at: scheduledAtISO,
              repeat_rule: formData.frequency === 'once' ? null : formData.frequency,
              ends_at: (formData.frequency !== 'once' && formData.endCondition === 'date' && formData.endDate) ? formData.endDate : null,
              notif_before: notifBefore,
              notif_unit: notifUnit,
              note: formData.notes,
              extra_data: {
                ...metadata,
                interval: formData.interval,
                endCondition: formData.endCondition,
                endOccurrences: formData.endOccurrences,
              },
              updated_at: new Date().toISOString(),
            })
            .eq('id', realPlanId)
            .select()
            .single();

          if (planUpdateError) throw planUpdateError;

          if (formData.notificationEnabled) {
            const fireAtDate = new Date(scheduledAtISO);
            if (notifUnit === 'minute') {
              fireAtDate.setMinutes(fireAtDate.getMinutes() - notifBefore);
            } else if (notifUnit === 'hour') {
              fireAtDate.setHours(fireAtDate.getHours() - notifBefore);
            } else if (notifUnit === 'day') {
              fireAtDate.setDate(fireAtDate.getDate() - notifBefore);
            }
            const fireAtISO = fireAtDate.toISOString();

            const { data: existingJobs } = await supabase
              .from('notification_jobs')
              .select('id')
              .eq('plan_id', realPlanId)
              .eq('sent', false)
              .limit(1);

            if (existingJobs && existingJobs.length > 0) {
              await supabase
                .from('notification_jobs')
                .update({ fire_at: fireAtISO })
                .eq('id', existingJobs[0].id);
            } else {
              await supabase
                .from('notification_jobs')
                .insert({
                  plan_id: realPlanId,
                  fire_at: fireAtISO,
                  sent: false
                });
            }
          } else {
            await supabase
              .from('notification_jobs')
              .delete()
              .eq('plan_id', realPlanId)
              .eq('sent', false);
          }

          const returnSchedule = {
            id: `plan_${updatedPlan.id}`,
            _plan_id: updatedPlan.id,
            _source: 'plans',
            pet_id: updatedPlan.pet_id,
            title: getPlanDisplayTitle(updatedPlan),
            due_date: formData.date,
            due_time: formData.time + ':00',
            status: updatedPlan.status === 'completed' ? 'done' : updatedPlan.status === 'cancelled' ? 'done' : 'upcoming',
            category: category,
            sub_category: updatedPlan.sub_type,
            plan_type: updatedPlan.repeat_rule || 'once',
            notes: updatedPlan.note,
            vaccines: updatedPlan.extra_data?.vaccine ? { name: updatedPlan.extra_data.vaccine.name } : null,
            repeat_rule: updatedPlan.repeat_rule,
            extra_data: updatedPlan.extra_data,
            created_at: updatedPlan.created_at,
            updated_at: updatedPlan.updated_at,
          };

          onDone(returnSchedule);
          return;
        }
        // 1) health_plans güncelle (frekans değiştiyse)
        if (taskToEdit.plan_id) {
          if (formData.frequency === 'once') {
            // Tekrar kaldırıldı → plan'ı sil, schedule'dan plan_id bağını kes
            await supabase.from('health_plans').delete().eq('id', taskToEdit.plan_id);
            await supabase.from('health_schedules')
              .update({ plan_id: null })
              .eq('plan_id', taskToEdit.plan_id);
          } else {
            await supabase.from('health_plans').update({
              frequency: formData.frequency,
              interval: formData.interval,
              end_condition: formData.endCondition,
              end_date: formData.endDate || null,
              end_occurrences: formData.endOccurrences || null,
            }).eq('id', taskToEdit.plan_id);
          }
        } else if (formData.frequency !== 'once') {
          // Daha önce tekrar yoktu, şimdi eklendi → yeni plan oluştur
          const { data: newPlan, error: planErr } = await supabase
            .from('health_plans')
            .insert({
              pet_id: petId,
              frequency: formData.frequency,
              interval: formData.interval,
              end_condition: formData.endCondition,
              end_date: formData.endDate || null,
              end_occurrences: formData.endOccurrences || null,
            })
            .select('id')
            .single();
          if (planErr) throw planErr;
          // schedule'u yeni plan'a bağla
          await supabase.from('health_schedules')
            .update({ plan_id: newPlan.id })
            .eq('id', taskToEdit.id);
        }

        // 2) health_schedule'u güncelle — tüm alanlar dahil

        const { data: updatedSchedules, error: updateError } = await supabase
          .from('health_schedules')
          .update({
            title: finalTitle,
            category: category,
            sub_category: subCategory,
            plan_type: category === 'Medikal' || category === 'Veteriner' ? 'checkup' : 'other',
            due_date: formData.date,
            due_time: formData.time,
            status: isPastDate ? 'done' : 'upcoming',
            notes: formData.notes,
            metadata,
            notification_rule: {
              enabled: formData.notificationEnabled,
              minutes_before: formData.notificationMinutes,
              frequency: formData.frequency,
            },
          })
          .eq('id', taskToEdit.id)
          .select('*');

        if (updateError) throw updateError;
        
        const updatedSchedule = updatedSchedules && updatedSchedules.length > 0 
          ? updatedSchedules[0] 
          : null;
          
        onDone(updatedSchedule || taskToEdit);
        return;
      }

      // ── CREATE MODE ──────────────────────────────────────────────
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Oturum bulunamadı.');

      let planId = null;
      if (formData.frequency !== 'once') {
        const { data: plan, error: planError } = await supabase
          .from('health_plans')
          .insert({
            pet_id: petId,
            frequency: formData.frequency,
            interval: formData.interval,
            end_condition: formData.endCondition,
            end_date: formData.endDate || null,
            end_occurrences: formData.endOccurrences || null,
          })
          .select('id')
          .single();
        if (planError) throw planError;
        planId = plan.id;
      }

      const getNextDate = (baseDateStr: string, frequency: string, interval: number, index: number) => {
        if (index === 0) return baseDateStr;
        const d = new Date(baseDateStr);
        if (frequency === 'daily') d.setDate(d.getDate() + (interval * index));
        if (frequency === 'weekly') d.setDate(d.getDate() + (interval * 7 * index));
        if (frequency === 'monthly') d.setMonth(d.getMonth() + (interval * index));
        if (frequency === 'yearly') d.setFullYear(d.getFullYear() + (interval * index));
        return d.toISOString().split('T')[0];
      };

      let finalRepeatCount = 1;
      if (formData.frequency !== 'once') {
        if (formData.endCondition === 'occurrences' && formData.endOccurrences) {
          finalRepeatCount = Math.min(formData.endOccurrences, 6);
        } else {
          finalRepeatCount = 6; // Max 6 occurrences logic
        }
      }

      const inserts = [];
      for (let i = 0; i < finalRepeatCount; i++) {
        const dStr = getNextDate(formData.date, formData.frequency, formData.interval, i);
        
        // Eğer bitiş tarihi seçiliyse ve aştıysa döngüyü kır
        if (formData.endCondition === 'date' && formData.endDate && dStr > formData.endDate) {
          break;
        }

        // Geçmiş tarihli onay durumu
        let status = 'upcoming';
        if (isPastDate) {
           if (dStr <= todayStr && markAsDone) {
             status = 'done';
           } else {
             status = 'upcoming';
           }
        }

        inserts.push({
          pet_id: petId,
          plan_type: category === 'Medikal' || category === 'Veteriner' ? 'checkup' : 'other',
          category: category,
          sub_category: subCategory,
          title: finalTitle,
          due_date: dStr,
          due_time: formData.time,
          status: status,
          plan_id: planId,
          notification_rule: {
            enabled: formData.notificationEnabled,
            minutes_before: formData.notificationMinutes,
            frequency: formData.frequency,
          },
          notes: formData.notes,
          metadata,
          assigned_by: user.id,
          assigned_to: user.id
        });
      }

      const { data: insertedSchedules, error: scheduleError } = await supabase
        .from('health_schedules')
        .insert(inserts)
        .select('*');

      if (scheduleError) throw scheduleError;

      const newSchedule = insertedSchedules[0];

      // Eğer seçilen işlem bir Aşı ise, geçmiş onay verilirse (done olanlar için) vaccine_records_v2 tablosuna da ekle
      if (isPastDate && selectedVaccine) {
        // vaccine_name'e marka adı değil protokol adı yazılmalı — marka bilgisi brand_id'de tutulur.
        // Fallback marka adına DEĞİL, vaccine_code'a düşer (protokol bulunamazsa bile marka adı sızmasın).
        const { data: protocol } = await supabase
          .from('vaccine_protocols')
          .select('protocol_name')
          .eq('vaccine_code', selectedVaccine.code)
          .eq('is_active', true)
          .maybeSingle();
        const protocolName = protocol?.protocol_name ?? selectedVaccine.code;

        const doneInserts = insertedSchedules.filter((s: any) => s.status === 'done');
        for (const s of doneInserts) {
           const { error: vrError } = await supabase
            .from('vaccine_records_v2')
            .insert({
              pet_id: petId,
              vaccine_code: selectedVaccine.code,
              vaccine_name: protocolName,
              brand_id: selectedVaccine.brandId ?? null,
              administered_at: s.due_date,
              status: 'completed',
              confidence_level: 'verified',
              source: 'user_quick_marked'
            });
           if (vrError) console.error('Aşı kaydı oluşturulurken hata:', vrError);
        }
      }

      onDone(insertedSchedules);
    } catch (err: any) {
      setError(err.message || 'Görev kaydedilirken bir hata oluştu.');
      setLoading(false);
    }
  };

  // ── Save button disabled logic ────────────────────────────────────
  const isSaveDisabled =
    loading ||
    !category ||
    (!subCategory && category !== 'Diger') ||
    (needsVaccinePicker && !selectedVaccine && !showVaccinePicker) ||
    (!computeTitle() && category !== 'Diger');


  const todayStrUI = new Date().toISOString().split('T')[0];
  const isPastDateUI = formData.date <= todayStrUI;

  return (
    <div className="fixed inset-0 z-[10005] bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 pb-12 sm:pb-4" onClick={onClose}>
      <div
        className="bg-surface w-full max-w-md max-h-[84vh] sm:max-h-[88vh] overflow-y-auto overflow-x-hidden rounded-modal p-6 pb-8 shadow-2xl animate-scaleIn flex flex-col gap-2 scrollbar-none"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[18px] font-black text-text-primary">
            {taskToEdit ? 'Görevi Düzenle' : 'Yeni Görev Planla'}
          </h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-bg-main text-text-secondary hover:text-text-primary">✕</button>
        </div>

        {!taskToEdit && (
          <p className="text-[13px] text-text-secondary mb-2 leading-relaxed">
            Odi.Pet Akıllı Asistan sizin için en uygun tekrarları ve hatırlatıcıları otomatik ayarlar.
          </p>
        )}

        {/* ── 1. Category Selection (sadece genel Yeni Görev için) ──── */}
        {!initialCategory && !taskToEdit && (
          <div className="mb-2">
            <CategoryGrid
              selectedCategory={category}
              onSelect={handleCategorySelect}
            />
          </div>
        )}

        {/* ── 2. Sub Category Selection ────────────────────────── */}
        {category && !taskToEdit && (
          <SubCategoryChips
            category={category}
            petSpecies={resolvedSpecies}
            selectedSubCategory={subCategory}
            onSelect={(sub) => setSubCategory(sub)}
            customText={customText}
            onCustomTextChange={setCustomText}
          />
        )}

        {/* ── 2b. Premium Smart Scanner Banner (Beslenme Özel) ── */}
        {!taskToEdit && (subCategory === 'Mama Siparişi' || subCategory === 'Diyet Değişimi') && !showVaccinePicker && (
          <div 
            onClick={() => setShowScanner(true)}
            className="card-base p-4 bg-gradient-to-r from-primary to-indigo-600 text-white relative overflow-hidden group cursor-pointer shadow-md mb-2 animate-fadeInUp mt-2 shrink-0"
          >
            <div className="absolute right-[-10px] bottom-[-20px] text-[70px] opacity-20 group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-500">📸</div>
            <div className="flex flex-col gap-1 relative z-10">
              <div className="flex items-center gap-2">
                <span className="bg-white/20 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider backdrop-blur-sm">Odi Premium</span>
                <h3 className="font-extrabold text-[15px] leading-tight">Akıllı Tarama ile Hızlı Planla</h3>
              </div>
              <p className="text-[11px] text-white/90 font-medium max-w-[85%] leading-relaxed">
                Mama paketini okutun, hem stoğu hem de bitiş tarihine göre planlamayı Odi Asistan halletsin.
              </p>
            </div>
          </div>
        )}

        {/* ── 2b. Başlık düzenleme (edit modunda, alt kategori seçilince) ── */}
        {taskToEdit && subCategory && subCategory !== 'Diğer' && !showVaccinePicker && (
          <div className="flex flex-col gap-1.5 mt-3 animate-fadeInUp">
            <label className="text-[12px] font-black text-text-secondary uppercase tracking-wider">
              Görev Başlığı
            </label>
            <input
              type="text"
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              placeholder={subCategory || 'Görev adı...'}
              className="input-base py-3 text-[14px]"
            />
          </div>
        )}

        {/* ── 3. Karneyi Tara (Sadece Aşı uygulamasında, seçim yapılmadan önce) ── */}
        {subCategory === 'Aşı' && !selectedVaccine && !showVaccinePicker && !showScanner && (
          <button type="button" onClick={() => setShowScanner(true)}
            className="flex items-center justify-center gap-2 px-4 py-3 mt-2 w-full text-[13px] font-bold text-primary bg-primary/5 border border-primary/20 rounded-xl hover:bg-primary/10 transition-all animate-fadeInUp">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
            Karneyi Tara
          </button>
        )}

        {showScanner && (
          <SmartScanner
            petId={petId}
            onClose={() => setShowScanner(false)}
            onResult={(data: any) => {
              if (data?.parsed?.title || data?.parsed?.vaccine_name) {
                setEditTitle(data.parsed.title || data.parsed.vaccine_name)
                setAdvancedOpen(true)
                if (data.parsed.date) {
                  setFormData(prev => ({
                    ...prev,
                    date: data.parsed.date
                  }))
                }
              }
              setShowScanner(false)
            }}
          />
        )}

        {showVaccinePicker && subCategory && SUB_CATEGORIES_WITH_PICKER[subCategory] && (
          <VaccineSelectorSheet
            pickerType={SUB_CATEGORIES_WITH_PICKER[subCategory]}
            subCategory={subCategory}
            species={resolvedSpecies}
            selectedVaccineCode={selectedVaccine?.code ?? null}
            onSelect={handleVaccineSelect}
            onBack={() => {
              setShowVaccinePicker(false);
              setSubCategory(null);
              setSelectedVaccine(null);
              setAdvancedOpen(false);
            }}
          />
        )}

        {/* ── 3b. Selected vaccine badge — tap to re-open picker ─ */}
        {selectedVaccine && !showVaccinePicker && (
          <button
            type="button"
            onClick={() => setShowVaccinePicker(true)}
            className="flex items-center justify-between px-4 py-3 rounded-xl border-2 border-primary/30 bg-primary/5 w-full text-left group transition-all hover:border-primary mt-2 animate-fadeInUp"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-primary text-[16px]">
                {selectedVaccine.isParasite ? '🛡️' : '💉'}
              </span>
              <div className="min-w-0">
                <p className="text-[12px] font-black text-primary uppercase tracking-wider">
                  {selectedVaccine.isParasite ? 'Ürün' : 'Aşı'}
                </p>
                <p className="text-[14px] font-bold text-text-primary truncate">
                  {selectedVaccine.name}
                </p>
              </div>
            </div>
            <span className="text-[11px] font-bold text-text-secondary group-hover:text-primary transition-colors shrink-0 ml-2">
              Değiştir →
            </span>
          </button>
        )}

        {/* ── 4. Advanced Settings ──────────────────────────────── */}
        {(pickerSatisfied && (subCategory || (category === 'Diger' && customText.length > 0))) && !showVaccinePicker && (
          <TaskFormAdvanced
            category={category!}
            formData={formData}
            onChange={(d) => setFormData(prev => ({ ...prev, ...d }))}
            isOpen={advancedOpen}
            onToggle={() => setAdvancedOpen(!advancedOpen)}
            allowPastDate={allowPastDate}
          />
        )}

        {error && <p className="text-[12px] text-error font-bold p-3 bg-error/10 rounded-xl text-center mt-2">{error}</p>}

        {/* Geçmiş Tarih Uyarı & Onay Kutusu */}
        {isPastDateUI && !taskToEdit && !showVaccinePicker && category && advancedOpen && (
          <label className="mt-4 p-4 bg-primary-soft border border-primary/20 rounded-xl flex items-start gap-3 cursor-pointer group hover:bg-primary-soft/80 transition-colors animate-fadeInUp">
            <div className="relative flex items-center mt-0.5 shrink-0">
              <input 
                type="checkbox" 
                checked={markAsDone}
                onChange={(e) => setMarkAsDone(e.target.checked)}
                className="peer appearance-none w-5 h-5 border-2 border-primary/30 rounded bg-white checked:bg-primary checked:border-primary transition-all cursor-pointer"
              />
              <svg className="absolute inset-0 w-5 h-5 text-white p-0.5 pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div>
              <p className="text-[13px] font-extrabold text-primary mb-0.5">
                Bu işlem uygulandı (Tamamlandı)
              </p>
              <p className="text-[11px] text-text-secondary leading-relaxed">
                Tarih geçmişe ait. Onaylarsanız görev tamamlanmış sayılır ve gelecek periyot planlanır. Seçilmezse &quot;Planlandı&quot; olarak bekler.
              </p>
            </div>
          </label>
        )}

        {/* ── Actions ───────────────────────────────────────────── */}
        <div className="flex gap-3 pt-6 mt-auto">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3.5 rounded-xl border-2 border-border-main text-text-secondary font-bold text-[14px] hover:bg-bg-main transition-colors"
          >
            İptal
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaveDisabled}
            className="flex-[2] btn-primary py-3.5 disabled:opacity-50 shadow-sm text-[14px]"
          >
            {loading 
              ? 'Kaydediliyor...' 
              : taskToEdit 
                ? 'Değişiklikleri Kaydet ✓' 
                : ((isPastDateUI && markAsDone) ? 'Uygulandı Onayı ✓' : 'Görev Planla ✓')}
          </button>
        </div>
      </div>
      {showScanner && (
        <SmartScanner 
          petId={petId} 
          onClose={() => setShowScanner(false)} 
          onSave={() => {
            setShowScanner(false);
            onDone(); // Tarama başarılıysa sihirbazı tamamla (arkaplanda RPC ile schedule zaten eklendi)
          }} 
        />
      )}
    </div>
  );
}
