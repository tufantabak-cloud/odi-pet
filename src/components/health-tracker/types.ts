export type TaskCategory = 'care' | 'health' | 'medication' | string;

export type ComputedStatus = 'done' | 'missed' | 'upcoming' | 'today' | 'future';

export interface PetCareTask {
  id: string;
  pet_id: string;
  title: string;
  category: TaskCategory;
  frequency_days: number;
  frequency_label?: string | null;
  created_at?: string;
}

export interface PetCareEvent {
  id: string;
  task_id: string;
  pet_id: string;
  scheduled_at: string;
  completed_at?: string | null;
  status: string;
  notes?: string | null;
  created_at?: string;
  pet_care_tasks?: PetCareTask; // Joined data
  vaccines?: any;
  /** Tekrarlayan plandan üretilmiş, DB'de karşılığı olmayan sanal occurrence */
  _is_virtual?: boolean;
  [key: string]: any;
}

export interface ComputedEvent extends PetCareEvent {
  computedStatus: ComputedStatus;
}

/** Her satır = 1 görev (task) ve onun tekrarlayan event'leri */
export interface TaskRow {
  task: PetCareTask;
  events: ComputedEvent[];
  /** Aşı kategorisinde alt grup etiketi (Zorunlu Aşılar / Opsiyonel Aşılar) */
  subGroupLabel?: string;
  /**
   * mapDbToUI çıktısındaki UI alt kategori etiketi (örn. "İlaç Kullanımı",
   * "Banyo"). Boş tarih hücresinden "plan yap" sayfasına deep-link
   * oluştururken wizard'ın ham subCategory id'sine çevrilir.
   */
  uiSubCategory?: string;
}

/**
 * Akış kartı — ComputedEvent'e ek olarak hangi görev/ürüne ait olduğunu taşır.
 * taskKey aynı ise (örn. aynı aşı adı, aynı parazit ürünü), koruma çubuğu
 * (coverage bar) bu iki event arasında çizilebilir; farklı taskKey'ler
 * arasında (örn. Kuduz Aşısı → Karma Aşı) çizilmez.
 */
export interface FlowEvent extends ComputedEvent {
  taskKey: string;
  taskTitle: string;
  /**
   * Sadece 'done' event'lerde: bu uygulamanın koruma süresi hâlâ geçerli mi?
   * Yalnızca Aşı/Parazit kategorilerinde hesaplanır (bkz. computeCoverage).
   */
  coverage?: {
    status: 'protected' | 'expiring' | 'expired';
    /** Koruma bitişine kalan gün (expired ise 0) */
    daysRemaining: number;
    /** Kalan koruma yüzdesi 0-100 (çubuk genişliği) */
    percent: number;
  };
}

/** Alt grup (örneğin: Zorunlu Aşılar, Opsiyonel Aşılar) */
export interface SubCategoryGroup {
  label: string;
  taskRows: TaskRow[];
  /** Tarih-grid timeline için: alt grup genelinde kronolojik düz akış */
  flowEvents?: FlowEvent[];
}

/** Kategori grubu — altında düz satırlar veya alt gruplar olabilir */
export interface CategoryGroup {
  category: TaskCategory;
  label: string;
  icon: string;
  taskRows: TaskRow[];
  /** Varsa alt gruplar (Aşı kategorisi için kullanılır) */
  subGroups?: SubCategoryGroup[];
  /** Tarih-grid timeline için: kategori genelinde kronolojik düz akış */
  flowEvents?: FlowEvent[];
}
