import { CategoryGroup, TaskRow, ComputedEvent } from '../types';
import { VaccineTemplateMap, getTemplateRecurrenceDays } from './vaccine-templates';
import { DB_CATEGORY_TO_UI, mapDbToUI } from './normalize-events';
import { buildFlowEvents, computeCoverage } from './coverage';

/**
 * Hesaplanmış event listesini kategori gruplarına (ve Aşı için alt gruplara)
 * dönüştürür; her grup için kronolojik düz akış ve koruma bilgisi üretir.
 */
export function buildCategoryGroups(
  events: ComputedEvent[],
  vaccineTemplateMap: VaccineTemplateMap,
): CategoryGroup[] {
  const taskMap = new Map<string, TaskRow>();

  events.forEach(event => {
    const task = event.pet_care_tasks;
    if (!task) return;

    // vaccines join'dan gelen alanlar (vaccines.code = vaccineCatalog kodu)
    const vaccineCode = (event.vaccines as any)?.code ?? null;
    const isCoreFlag  = (event.vaccines as any)?.is_core ?? null;

    const mapped = mapDbToUI(
      task.category,
      event.sub_category || null,
      task.title,
      vaccineTemplateMap,  // ← vaccine_protocols tek kaynak
      vaccineCode,
      isCoreFlag,
    );

    // Veteriner ve Diğer dahil olmayacak
    if (mapped.category === 'Veteriner' || mapped.category === 'Diger') return;

    // Aşı → 3 seviye (category::subCategory::vaccineName) → aşı ismi ayrı satır
    // İlaç Kullanımı → 3 seviye (category::subCategory::medicationName) → ilaç ismi ayrı satır
    // Parazit → 2 seviye (category::subCategory) → alt başlık tek bir satır
    // Diğer → 2 seviye (category::subCategory)
    const isVaccine = mapped.category === 'Asi';
    const isMedication = mapped.subCategory === 'İlaç Kullanımı';
    const productName = task.title || event.sub_category || 'Aşı';

    const groupKey = (isVaccine || isMedication)
      ? `${mapped.category}::${mapped.subCategory}::${productName}`
      : `${mapped.category}::${mapped.subCategory}`;

    if (!taskMap.has(groupKey)) {
      // Frekans gün sayısını vaccine_protocols'tan al
      const templateRecurrenceDays = getTemplateRecurrenceDays(
        vaccineTemplateMap,
        vaccineCode,
        productName,
      );
      taskMap.set(groupKey, {
        task: {
          ...task,
          title: (isVaccine || isMedication) ? productName : mapped.subCategory,
          category: mapped.category,
          frequency_days: templateRecurrenceDays ?? task.frequency_days ?? 0,
          frequency_label: isVaccine ? mapped.subCategory : (task.frequency_label || null),
        },
        events: [],
        subGroupLabel: isVaccine ? mapped.subCategory : undefined,
        uiSubCategory: mapped.subCategory,
      });
    }
    taskMap.get(groupKey)!.events.push(event);
  });

  // Kategoriye göre grupla
  const catMap = new Map<string, CategoryGroup>();
  taskMap.forEach(taskRow => {
    const cat = taskRow.task.category || 'Diger';
    const meta = DB_CATEGORY_TO_UI[cat];
    if (!meta) return;

    if (!catMap.has(cat)) {
      catMap.set(cat, { category: cat, label: meta.label, icon: meta.icon, taskRows: [], subGroups: [] });
    }
    catMap.get(cat)!.taskRows.push(taskRow);
  });

  // Aşı kategorisi → Zorunlu / Opsiyonel alt grupları (subGroups)
  // Parazit kategorisi → düz taskRows (alt başlık = satır başlığı)
  const VACCINE_SUB_GROUP_ORDER = ['Zorunlu Aşılar', 'Opsiyonel Aşılar', 'İç Parazit', 'Dış Parazit', 'Parazit Tasması', 'Parazit Uygulamaları', 'Diğer Aşılar'];

  catMap.forEach(group => {
    if (group.category === 'Asi') {
      const subGroupMap = new Map<string, TaskRow[]>();
      group.taskRows.forEach(row => {
        const label = row.subGroupLabel || 'Opsiyonel Aşılar';
        if (!subGroupMap.has(label)) subGroupMap.set(label, []);
        subGroupMap.get(label)!.push(row);
      });
      group.subGroups = VACCINE_SUB_GROUP_ORDER
        .filter(l => subGroupMap.has(l))
        .map(l => ({ label: l, taskRows: subGroupMap.get(l)! }));
      // leftover groups (eğer varsa)
      Array.from(subGroupMap.keys())
        .filter(l => !VACCINE_SUB_GROUP_ORDER.includes(l))
        .forEach(l => group.subGroups!.push({ label: l, taskRows: subGroupMap.get(l)! }));
    }
    // Parazit için subGroups boş kalır, taskRows düz sıralanır
    if (group.category === 'Parazit') {
      const PARASITE_ORDER = ['İç Parazit Uygulaması', 'Dış Parazit Uygulaması', 'Kombine Parazit Uygulaması', 'Parazit Tasması'];
      group.taskRows.sort((a, b) => {
        const ai = PARASITE_ORDER.indexOf(a.task.title);
        const bi = PARASITE_ORDER.indexOf(b.task.title);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      });
      group.subGroups = []; // subGroups yok → HealthTracker düz liste render eder
    }
    
    // Beslenme kategorisinde Mama Stok Takibi en altta olsun
    if (group.category === 'Beslenme') {
      group.taskRows.sort((a, b) => {
        if (a.task.title === 'Mama Stok Takibi') return 1;
        if (b.task.title === 'Mama Stok Takibi') return -1;
        return 0;
      });
    }

    // Tarih-grid timeline: kategori genelinde kronolojik düz akış
    group.flowEvents = buildFlowEvents(group.taskRows);
    // Alt grubu olan kategorilerde (Aşı) her alt grup kendi akışını da alır
    group.subGroups?.forEach(sub => {
      sub.flowEvents = buildFlowEvents(sub.taskRows);
    });

    // Koruma çubuğu ve son geçerlilik tarihi: Aşı, Parazit, Beslenme veya periyot içeren görevler için hesaplanır
    if (group.category === 'Asi' || group.category === 'Parazit' || group.category === 'Beslenme' || group.flowEvents.some(e => (e.pet_care_tasks?.frequency_days || (e as any).frequency_days || 0) > 0)) {
      if (group.flowEvents) computeCoverage(group.flowEvents);
      group.subGroups?.forEach(sub => {
        if (sub.flowEvents) computeCoverage(sub.flowEvents);
      });
    }
  });

  // Sabit sıralama
  return Array.from(catMap.values()).sort((a, b) => {
    const ma = DB_CATEGORY_TO_UI[a.category];
    const mb = DB_CATEGORY_TO_UI[b.category];
    return (ma?.order ?? 99) - (mb?.order ?? 99);
  });
}
