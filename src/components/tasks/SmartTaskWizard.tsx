'use client';

import React, { useState, useEffect } from 'react';
import CategoryGrid from './CategoryGrid';
import SubCategoryChips from './SubCategoryChips';
import TaskFormAdvanced, { TaskFormData } from './TaskFormAdvanced';
import VaccineSelectorSheet, { VaccineOption } from './VaccineSelectorSheet';
import { TaskCategory, TASK_CATEGORIES, getSmartDefault } from '@/lib/tasks/taskDefaults';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

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

/** Sub-categories that require a 3rd-level item picker before scheduling */
const SUB_CATEGORIES_WITH_PICKER: Record<string, 'vaccine'> = {
  'Aşı': 'vaccine',
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
    supabase.from('pets').select('species').eq('id', petId).single().then(({ data }) => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subCategory]);

  // ── Vaccine picker handler ────────────────────────────────────────
  const handleVaccineSelect = (vaccine: VaccineOption) => {
    setSelectedVaccine(vaccine);
    setEditTitle(vaccine.name); // aşı seçilince başlık otomatik güncellenir
    setShowVaccinePicker(false);
    setAdvancedOpen(true);
  };

  // ── Computed helpers ──────────────────────────────────────────────
  const needsVaccinePicker = subCategory !== null && SUB_CATEGORIES_WITH_PICKER[subCategory] === 'vaccine';
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
        const metadata = {
          ...formData.metadata,
          ...(selectedVaccine
            ? { vaccine_code: selectedVaccine.code, vaccine_name: selectedVaccine.name }
            : {}),
        };

        const { data: updatedSchedule, error: updateError } = await supabase
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
          .select('*, vaccines(name)')
          .single();

        if (updateError) throw updateError;
        onDone(updatedSchedule);
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
        let dStr = getNextDate(formData.date, formData.frequency, formData.interval, i);
        
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
        .select('*, vaccines(name)');

      if (scheduleError) throw scheduleError;

      const newSchedule = insertedSchedules[0];

      // Eğer seçilen işlem bir Aşı ise, geçmiş onay verilirse (done olanlar için) vaccine_records tablosuna da ekle
      if (isPastDate && selectedVaccine) {
        const doneInserts = insertedSchedules.filter((s: any) => s.status === 'done');
        for (const s of doneInserts) {
           const { error: vrError } = await supabase
            .from('vaccine_records')
            .insert({
              pet_id: petId,
              vaccine_id: selectedVaccine.id,
              schedule_id: s.id,
              applied_date: s.due_date
            });
           if (vrError) console.error('Aşı kaydı oluşturulurken hata:', vrError);
        }
      }

      onDone(newSchedule);
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

  // ── Kategorinin Türkçe label'ini bul ─────────────────────────────
  const categoryLabel = category
    ? (TASK_CATEGORIES.find(c => c.id === category)?.label ?? category)
    : null;

  const todayStrUI = new Date().toISOString().split('T')[0];
  const isPastDateUI = formData.date <= todayStrUI;

  return (
    <div className="fixed inset-0 z-[10005] bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 pb-12 sm:pb-4" onClick={onClose}>
      <div
        className="bg-surface w-full max-w-md max-h-[84vh] sm:max-h-[88vh] overflow-y-auto overflow-x-hidden rounded-[28px] p-6 pb-8 shadow-2xl animate-scaleIn flex flex-col gap-2 scrollbar-none"
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

        {/* ── 3a. Vaccine Picker (3rd level) ───────────────────── */}
        {showVaccinePicker && subCategory && SUB_CATEGORIES_WITH_PICKER[subCategory] === 'vaccine' && (
          <VaccineSelectorSheet
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
            className="flex items-center justify-between px-4 py-3 rounded-xl border-2 border-primary bg-primary/5 w-full mt-2 group animate-fadeInUp"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-primary text-[16px]">💉</span>
              <div className="min-w-0">
                <p className="text-[12px] font-black text-primary uppercase tracking-wider">Aşı</p>
                <p className="text-[14px] font-bold text-text-primary truncate">{selectedVaccine.name}</p>
              </div>
            </div>
            <span className="text-[11px] font-bold text-text-secondary group-hover:text-primary transition-colors shrink-0 ml-2">Değiştir →</span>
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
                Tarih geçmişe ait. Onaylarsanız görev tamamlanmış sayılır ve gelecek periyot planlanır. Seçilmezse "Planlandı" olarak bekler.
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
    </div>
  );
}
