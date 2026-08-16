'use client';

import React, { useState } from 'react';
import { 
  Stethoscope, 
  MapPin, 
  Phone, 
  Mail, 
  ChevronDown, 
  ChevronUp, 
  Plus, 
  Check, 
  Clock, 
  X, 
  ExternalLink, 
  Calendar, 
  Landmark, 
  Receipt, 
  Share2, 
  MoreVertical,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Activity,
  Pill,
  QrCode,
  Sparkles,
  Zap,
  FileCheck,
  Syringe,
  Scissors,
  Copy,
  CheckCircle2,
  Home,
  Building2,
  Filter,
  Download
} from 'lucide-react';

// ── Tip Tanımlamaları ──
interface VetClinic {
  id: string;
  name: string;
  doctorName?: string;
  address?: string;
  isPrimary?: boolean;
  specialtyTag?: string;
  startDate: string;
  statusText: string;
  phone?: string;
  email?: string;
  notes?: string;
  isPast?: boolean;
}

interface ClinicalProcess {
  id: string;
  title: string;
  badge: 'Randevu' | 'Kontrol' | 'Sevk' | 'Tedavi' | 'Operasyon' | 'Lab & Tetkik';
  status: 'overdue' | 'upcoming' | 'completed';
  timeText: string; // "9 gün önce", "12 gün sonra"
  clinicName: string;
  doctorOrDept?: string;
  notes?: string;
  linkText?: string;
  syncedCategory?: 'Aşı' | 'Parazit' | 'İlaç' | 'Belge Kasası' | 'Ameliyat' | 'Bütçe';
  administrationPlace: 'home' | 'veterinary_clinic' | 'mobile_vet' | 'agriculture_directorate';
  appliedBy?: string;
}

interface LabResult {
  id: string;
  testName: string;
  testType: 'Kan Tahlili' | 'Röntgen / X-Ray' | 'Ultrason' | 'İdrar / Gaita' | 'Patoloji';
  date: string;
  clinicName: string;
  status: 'normal' | 'abnormal' | 'pending';
  statusText: string;
  summaryText: string;
  hasDocument?: boolean;
  documentName?: string;
}

interface Prescription {
  id: string;
  medicationName: string;
  dosage: string;
  duration: string; // "7 gün"
  doctorName: string;
  clinicName: string;
  linkedDiagnosis: string;
  startDate: string;
  status: 'active' | 'completed';
}

interface SurgeryRecord {
  id: string;
  procedureName: string;
  date: string;
  clinicName: string;
  surgeonName: string;
  anesthesiaType: string;
  postOpNotes: string;
  followUpDate?: string;
}

interface VisitRecord {
  id: string;
  date: string;
  clinicName: string;
  service: string;
  cost: number;
}

interface VeterinerTabProps {
  petId: string;
  petName: string;
  petMicrochipNo?: string;
  petSpecies?: string;
  petBreed?: string;
}

export default function VeterinerTab({ 
  petId, 
  petName, 
  petMicrochipNo,
  petSpecies = 'Köpek',
  petBreed = 'Poodle (Kaniş)'
}: VeterinerTabProps) {
  const safeMicrochip = (petMicrochipNo && petMicrochipNo.trim()) ? petMicrochipNo : '900215004928172';

  // ── Akordeon Bölüm Durumları ──
  const [openVetsSection, setOpenVetsSection] = useState(true);
  const [openProcessesSection, setOpenProcessesSection] = useState(true);
  const [openLabSection, setOpenLabSection] = useState(true);
  const [openPrescriptionsSection, setOpenPrescriptionsSection] = useState(true);
  const [openSurgerySection, setOpenSurgerySection] = useState(false);
  const [openVisitsSection, setOpenVisitsSection] = useState(false);
  const [openOfficialSection, setOpenOfficialSection] = useState(false);

  const [showPastVets, setShowPastVets] = useState(false);
  const [copiedChip, setCopiedChip] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [selectedClinicFilter, setSelectedClinicFilter] = useState<string | null>(null);

  // ── Mock State Verileri ──
  const [vets, setVets] = useState<VetClinic[]>([
    {
      id: 'vet-1',
      name: 'Kadıköy Pet Klinik',
      doctorName: 'Dr. Elif Kaya',
      address: 'Caferağa Mh., Kadıköy',
      isPrimary: true,
      startDate: '13 Ekim 2025',
      statusText: '13 Ekim 2025 — devam ediyor',
      phone: '+90 216 345 67 89',
      email: 'info@kadikoypet.com',
      isPast: false
    },
    {
      id: 'vet-2',
      name: 'Anadolu Hayvan Hastanesi',
      doctorName: 'Dr. Sinem Ak',
      specialtyTag: 'Dermatoloji',
      isPrimary: false,
      startDate: '13 Mayıs 2026',
      statusText: '13 Mayıs 2026 — devam ediyor',
      phone: '+90 216 999 00 11',
      notes: 'Cilt takibi için ikinci görüş',
      isPast: false
    },
    {
      id: 'vet-3',
      name: 'Moda Veteriner Polikliniği',
      doctorName: 'Dr. Ahmet Yılmaz',
      address: 'Moda Cd., Kadıköy',
      isPrimary: false,
      startDate: '2023 - 2025',
      statusText: 'Eski klinik kaydı',
      isPast: true
    }
  ]);

  const [processes, setProcesses] = useState<ClinicalProcess[]>([
    {
      id: 'proc-rabies',
      title: 'Yasal Kuduz Aşısı (Zorunlu Tescil)',
      badge: 'Randevu',
      status: 'upcoming',
      timeText: '18 gün sonra',
      clinicName: 'Kadıköy İlçe Tarım ve Orman Müdürlüğü',
      doctorOrDept: 'Resmi Veteriner Hekim Tescili',
      notes: 'Yasal zorunlu yıllık kuduz aşısı ve PETVET pasaport güncellemesi',
      syncedCategory: 'Aşı',
      administrationPlace: 'agriculture_directorate',
      appliedBy: 'Tarım ve Orman Bakanlığı (PETVET)'
    },
    {
      id: 'proc-1',
      title: 'Diş taşı temizliği',
      badge: 'Randevu',
      status: 'overdue',
      timeText: '9 gün önce',
      clinicName: 'Kadıköy Pet Klinik',
      doctorOrDept: 'Dr. Elif Kaya',
      notes: 'Randevuya gidilmedi',
      syncedCategory: 'Aşı',
      administrationPlace: 'veterinary_clinic',
      appliedBy: 'Dr. Elif Kaya (Klinikte)'
    },
    {
      id: 'proc-2',
      title: 'Cilt kontrolü',
      badge: 'Kontrol',
      status: 'upcoming',
      timeText: '12 gün sonra',
      clinicName: 'Anadolu Hayvan Hastanesi',
      doctorOrDept: 'Dermatoloji — Dr. Sinem Ak',
      syncedCategory: 'Belge Kasası',
      administrationPlace: 'veterinary_clinic',
      appliedBy: 'Dr. Sinem Ak (Klinikte)'
    },
    {
      id: 'proc-3',
      title: 'Rutin İç-Dış Parazit Damlası',
      badge: 'Tedavi',
      status: 'upcoming',
      timeText: '5 gün sonra',
      clinicName: 'Evde (Hasta Sahibi)',
      notes: 'Ense damlası hasta sahibi tarafından evde uygulanacak',
      syncedCategory: 'Parazit',
      administrationPlace: 'home',
      appliedBy: 'Hasta Sahibi (Evde)'
    },
    {
      id: 'proc-4',
      title: 'Yıllık genel muayene',
      badge: 'Randevu',
      status: 'upcoming',
      timeText: '26 gün sonra',
      clinicName: 'Kadıköy Pet Klinik',
      syncedCategory: 'Bütçe',
      administrationPlace: 'veterinary_clinic',
      appliedBy: 'Dr. Elif Kaya (Klinikte)'
    },
    {
      id: 'proc-5',
      title: 'Dermatoloji sevki',
      badge: 'Sevk',
      status: 'completed',
      timeText: '92 gün önce',
      clinicName: 'Kadıköy Pet Klinik',
      notes: "Anadolu Hayvan Hastanesi'ne yönlendirildi",
      linkText: 'Anadolu Hayvan Hastanesi (Dermatoloji)',
      syncedCategory: 'Belge Kasası',
      administrationPlace: 'veterinary_clinic',
      appliedBy: 'Dr. Elif Kaya (Klinikte)'
    }
  ]);

  const [labResults] = useState<LabResult[]>([
    {
      id: 'lab-1',
      testName: 'Tam Kan Sayımı (Hemogram) & Biyokimya',
      testType: 'Kan Tahlili',
      date: '14 Mayıs 2026',
      clinicName: 'Anadolu Hayvan Hastanesi',
      status: 'normal',
      statusText: '✓ Tüm parametreler normal değerlerde',
      summaryText: 'ALT: 32 U/L, Kreatinin: 0.9 mg/dL, WBC: 8.5 x10^3/uL',
      hasDocument: true,
      documentName: 'Hemogram_Raporu_14052026.pdf'
    },
    {
      id: 'lab-2',
      testName: 'Deri Kazıntı & Alerji Panel İncelemesi',
      testType: 'Patoloji',
      date: '13 Mayıs 2026',
      clinicName: 'Anadolu Hayvan Hastanesi',
      status: 'abnormal',
      statusText: '⚠️ Hafif çevresel alerji bulgusu',
      summaryText: 'Mantar ve parazit negatif, atopik dermatit ile uyumlu hücresel reaksiyon.',
      hasDocument: true,
      documentName: 'Alerji_Panel_Sonuc.pdf'
    }
  ]);

  const [prescriptions] = useState<Prescription[]>([
    {
      id: 'rx-1',
      medicationName: 'Dermacure Kortizonlu Krem & Şampuan',
      dosage: 'Günde 2 kez haricen uygulama',
      duration: '14 gün',
      doctorName: 'Dr. Sinem Ak',
      clinicName: 'Anadolu Hayvan Hastanesi',
      linkedDiagnosis: 'Atopik Dermatit / Deri Alerjisi',
      startDate: '14 Mayıs 2026',
      status: 'active'
    },
    {
      id: 'rx-2',
      medicationName: 'Amoksisilin Antibiyotik Damla',
      dosage: 'Günde 1 kez 5 damla',
      duration: '7 gün',
      doctorName: 'Dr. Elif Kaya',
      clinicName: 'Kadıköy Pet Klinik',
      linkedDiagnosis: 'Hafif Kulak Enfeksiyonu',
      startDate: '10 Ekim 2025',
      status: 'completed'
    }
  ]);

  const [surgeries] = useState<SurgeryRecord[]>([
    {
      id: 'surg-1',
      procedureName: 'Kısırlaştırma Operasyonu (Orşiektomi)',
      date: '15 Kasım 2024',
      clinicName: 'Kadıköy Pet Klinik',
      surgeonName: 'Dr. Elif Kaya',
      anesthesiaType: 'İnhalasyon Anestezisi (İsoflurane)',
      postOpNotes: 'Operasyon sorunsuz tamamlandı. Dikişler 10 gün sonra alındı. Yakalık kullanımı tamamlandı.',
      followUpDate: '25 Kasım 2024 (Dikiş Alma)'
    }
  ]);

  const visits: VisitRecord[] = [
    { id: 'v-1', date: '14 Mayıs 2026', clinicName: 'Anadolu Hayvan Hastanesi', service: 'Dermatoloji Muayenesi & Krem', cost: 650 },
    { id: 'v-2', date: '13 Ekim 2025', clinicName: 'Kadıköy Pet Klinik', service: 'Genel Kontrol & Karma Aşı', cost: 450 },
    { id: 'v-3', date: '04 Haziran 2025', clinicName: 'Moda Veteriner', service: 'Rutin İç-Dış Parazit Bakımı', cost: 300 },
  ];

  // Modallar
  const [showAddVetModal, setShowAddVetModal] = useState(false);
  const [showAddProcessModal, setShowAddProcessModal] = useState(false);

  // Form State - Yeni Veteriner
  const [newVetName, setNewVetName] = useState('');
  const [newVetDoctor, setNewVetDoctor] = useState('');
  const [newVetAddress, setNewVetAddress] = useState('');
  const [newVetPhone, setNewVetPhone] = useState('');
  const [newVetSpecialty, setNewVetSpecialty] = useState('');

  // Form State - Yeni Süreç
  const [newProcTitle, setNewProcTitle] = useState('');
  const [newProcBadge, setNewProcBadge] = useState<'Randevu' | 'Kontrol' | 'Sevk' | 'Tedavi' | 'Operasyon' | 'Lab & Tetkik'>('Randevu');
  const [newProcPlace, setNewProcPlace] = useState<'home' | 'veterinary_clinic' | 'agriculture_directorate'>('veterinary_clinic');
  const [newProcClinic, setNewProcClinic] = useState('Kadıköy Pet Klinik');
  const [newProcDays, setNewProcDays] = useState('7');

  // Handlers
  const handleMarkProcessDone = (id: string) => {
    setProcesses(prev => prev.map(p => p.id === id ? { ...p, status: 'completed', timeText: 'Tamamlandı' } : p));
  };

  const handleSnoozeProcess = (id: string) => {
    setProcesses(prev => prev.map(p => p.id === id ? { ...p, status: 'upcoming', timeText: '7 gün ertelendi' } : p));
  };

  const handleDeleteProcess = (id: string) => {
    setProcesses(prev => prev.filter(p => p.id !== id));
  };

  const handleCopyChip = () => {
    navigator.clipboard.writeText(safeMicrochip);
    setCopiedChip(true);
    setTimeout(() => setCopiedChip(false), 2000);
  };

  const handleAddVetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVetName.trim()) return;
    const newEntry: VetClinic = {
      id: `vet-${Date.now()}`,
      name: newVetName.trim(),
      doctorName: newVetDoctor.trim() || undefined,
      address: newVetAddress.trim() || undefined,
      phone: newVetPhone.trim() || undefined,
      specialtyTag: newVetSpecialty.trim() || undefined,
      startDate: 'Bugün',
      statusText: 'Bugün başladı',
      isPrimary: vets.length === 0,
      isPast: false
    };
    setVets(prev => [newEntry, ...prev]);
    setShowAddVetModal(false);
    setNewVetName('');
    setNewVetDoctor('');
    setNewVetAddress('');
    setNewVetPhone('');
    setNewVetSpecialty('');
  };

  const handleAddProcessSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProcTitle.trim()) return;
    const isHome = newProcPlace === 'home';
    const isOfficial = newProcPlace === 'agriculture_directorate';

    let clinicNameDisplay = newProcClinic;
    let appliedByDisplay = `${newProcClinic} (Klinikte)`;
    let syncCat: 'Aşı' | 'Parazit' | 'İlaç' | 'Belge Kasası' | 'Ameliyat' | 'Bütçe' = 'Belge Kasası';

    if (isHome) {
      clinicNameDisplay = 'Evde (Hasta Sahibi)';
      appliedByDisplay = 'Hasta Sahibi (Evde)';
      syncCat = 'Parazit';
    } else if (isOfficial) {
      clinicNameDisplay = 'Kadıköy İlçe Tarım ve Orman Müdürlüğü (PETVET)';
      appliedByDisplay = 'Tarım ve Orman Bakanlığı (Resmi Vet)';
      syncCat = 'Aşı';
    }

    const newProc: ClinicalProcess = {
      id: `proc-${Date.now()}`,
      title: newProcTitle.trim(),
      badge: newProcBadge,
      status: 'upcoming',
      timeText: `${newProcDays} gün sonra`,
      clinicName: clinicNameDisplay,
      administrationPlace: newProcPlace,
      appliedBy: appliedByDisplay,
      syncedCategory: syncCat
    };
    setProcesses(prev => [newProc, ...prev]);
    setShowAddProcessModal(false);
    setNewProcTitle('');
  };

  const activeVets = vets.filter(v => !v.isPast);
  const pastVets = vets.filter(v => v.isPast);

  // Klinik filtresine göre süreçleri süzme
  const filteredProcesses = selectedClinicFilter
    ? processes.filter(p => p.clinicName === selectedClinicFilter || p.administrationPlace === 'home' || p.administrationPlace === 'agriculture_directorate')
    : processes;

  const overdueProcesses = filteredProcesses.filter(p => p.status === 'overdue');
  const upcomingProcesses = filteredProcesses.filter(p => p.status === 'upcoming');
  const completedProcesses = filteredProcesses.filter(p => p.status === 'completed');

  const totalSpent = visits.reduce((acc, curr) => acc + curr.cost, 0);

  return (
    <div className="flex flex-col gap-4 w-full max-w-4xl mx-auto pb-12">

      {/* ─────────────────────────────────────────────────────────────
          BÖLÜM 0: DİJİTAL VETERİNER PASAPORTU & KİMLİK KARTI (QR & SENKRON)
      ─────────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-[#1E1B4B] via-[#2E2A72] to-[#4338CA] rounded-3xl p-5 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-48 bg-white/5 skew-x-12 pointer-events-none" />
        <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center font-bold text-amber-300 shadow-inner">
              <Stethoscope size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black tracking-widest text-amber-300 uppercase">DİJİTAL VET PASAPORTU</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                  <CheckCircle2 size={12} /> Senkronize
                </span>
              </div>
              <h1 className="text-lg font-black text-white mt-0.5">{petName} • Klinik Kimlik Kartı</h1>
              <p className="text-xs text-indigo-200 font-medium">
                {petSpecies} • {petBreed}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyChip}
              className="px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-all active:scale-[0.97] flex items-center gap-1.5 border border-white/20 cursor-pointer"
            >
              {copiedChip ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span className="font-mono">{safeMicrochip.slice(0, 8)}...</span>
            </button>
            <button
              onClick={() => setShowQrModal(true)}
              className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-extrabold transition-all active:scale-[0.97] shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <QrCode size={16} /> Klinik QR Göster
            </button>
          </div>
        </div>
      </div>


      {/* ─────────────────────────────────────────────────────────────
          BÖLÜM 1: VETERİNERLER (KLİNİK VE HEKİM YÖNETİMİ)
      ─────────────────────────────────────────────────────────────── */}
      <div className="bg-surface rounded-card border border-border-main/60 shadow-soft overflow-hidden">
        <div 
          onClick={() => setOpenVetsSection(!openVetsSection)}
          className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50/60 transition-colors border-b border-border-main/40"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Stethoscope size={20} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-text-primary leading-tight">Veterinerler</h2>
              <p className="text-xs font-semibold text-text-secondary">
                {activeVets.length} aktif • {pastVets.length} geçmiş
              </p>
            </div>
          </div>
          <button className="p-1 text-text-secondary hover:text-text-primary">
            {openVetsSection ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>

        {openVetsSection && (
          <div className="p-4 flex flex-col gap-3 bg-slate-50/40">
            {/* Filtre Bilgisi Uyarısı */}
            {selectedClinicFilter && (
              <div className="bg-indigo-50 border border-indigo-200/80 rounded-2xl p-3 flex items-center justify-between text-xs font-bold text-indigo-900">
                <span className="flex items-center gap-1.5">
                  <Filter size={14} className="text-indigo-600" /> Şuna göre filtrelendi: <strong>{selectedClinicFilter}</strong>
                </span>
                <button
                  onClick={() => setSelectedClinicFilter(null)}
                  className="text-xs font-extrabold text-indigo-600 hover:underline cursor-pointer"
                >
                  Tümünü Göster
                </button>
              </div>
            )}

            {activeVets.map(vet => {
              const isSelected = selectedClinicFilter === vet.name;
              return (
                <div 
                  key={vet.id} 
                  className={`bg-white rounded-2xl p-4 border transition-all shadow-xs flex flex-col gap-2 relative ${
                    isSelected ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-200/80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-extrabold text-slate-800">{vet.name}</h3>
                      {vet.isPrimary && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center gap-1">
                          <span>✩</span> Birincil
                        </span>
                      )}
                      {vet.specialtyTag && (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-200/80">
                          {vet.specialtyTag}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => setSelectedClinicFilter(isSelected ? null : vet.name)}
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                          isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600'
                        }`}
                      >
                        {isSelected ? 'Filtre Aktif' : 'Süreçlerini Süz'}
                      </button>
                      <button className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer">
                        <MoreVertical size={16} />
                      </button>
                    </div>
                  </div>

                  {vet.doctorName && (
                    <p className="text-xs font-semibold text-slate-600">{vet.doctorName}</p>
                  )}
                  {vet.address && (
                    <p className="text-xs font-medium text-slate-500 flex items-center gap-1">
                      <MapPin size={13} className="text-slate-400" /> {vet.address}
                    </p>
                  )}
                  <p className="text-[11px] font-medium text-slate-400">
                    {vet.statusText}
                  </p>

                  {vet.notes && (
                    <p className="text-xs italic text-slate-500 bg-slate-50 p-2 rounded-xl border border-slate-100 mt-0.5">
                      "{vet.notes}"
                    </p>
                  )}

                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100">
                    {vet.phone && (
                      <a 
                        href={`tel:${vet.phone}`}
                        className="flex-1 py-2 px-3 rounded-xl bg-emerald-50/80 hover:bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
                      >
                        <Phone size={14} /> Ara
                      </a>
                    )}
                    {vet.email && (
                      <a 
                        href={`mailto:${vet.email}`}
                        className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
                      >
                        <Mail size={14} /> E-posta
                      </a>
                    )}
                  </div>
                </div>
              );
            })}

            {pastVets.length > 0 && (
              <div className="mt-1">
                <button 
                  onClick={() => setShowPastVets(!showPastVets)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-700 flex items-center gap-1.5 px-1 py-1 cursor-pointer"
                >
                  <Clock size={14} /> Geçmiş veterinerler ({pastVets.length}) {showPastVets ? 'gizle' : 'göster'}
                </button>

                {showPastVets && (
                  <div className="flex flex-col gap-2 mt-2 pl-2 border-l-2 border-slate-200">
                    {pastVets.map(pv => (
                      <div key={pv.id} className="bg-white p-3 rounded-xl border border-slate-200 text-xs flex flex-col gap-1 opacity-80">
                        <span className="font-bold text-slate-700">{pv.name}</span>
                        {pv.doctorName && <span className="text-slate-500">{pv.doctorName}</span>}
                        <span className="text-[11px] text-slate-400">{pv.statusText}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button
              onClick={() => setShowAddVetModal(true)}
              className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-300 hover:border-emerald-500 text-slate-600 hover:text-emerald-600 font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] mt-1 bg-white cursor-pointer"
            >
              <Plus size={16} /> Veteriner ekle
            </button>
          </div>
        )}
      </div>


      {/* ─────────────────────────────────────────────────────────────
          BÖLÜM 2: SÜREÇLER & DİĞER MODÜLLERLE SENKRONİZASYON (EVDE / KLİNİKTE / TARIM BKN PETVET)
      ─────────────────────────────────────────────────────────────── */}
      <div className="bg-surface rounded-card border border-border-main/60 shadow-soft overflow-hidden">
        <div 
          onClick={() => setOpenProcessesSection(!openProcessesSection)}
          className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50/60 transition-colors border-b border-border-main/40"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Share2 size={20} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-text-primary leading-tight flex items-center gap-2">
                Süreçler & Klinik Takip
                {overdueProcesses.length > 0 && (
                  <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[11px] font-bold flex items-center justify-center shadow-xs">
                    {overdueProcesses.length}
                  </span>
                )}
              </h2>
              <p className="text-xs font-semibold text-text-secondary">
                {overdueProcesses.length} kaçırılan • {upcomingProcesses.length} planlı • Evde / Klinikte / Tarım Bkn. PETVET
              </p>
            </div>
          </div>
          <button className="p-1 text-text-secondary hover:text-text-primary">
            {openProcessesSection ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>

        {openProcessesSection && (
          <div className="p-4 flex flex-col gap-4 bg-slate-50/40">

            {/* KAÇIRILDI GRUBU */}
            {overdueProcesses.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-rose-600">KAÇIRILDI</span>
                {overdueProcesses.map(proc => (
                  <div key={proc.id} className="bg-rose-50/60 rounded-2xl p-4 border border-rose-200/80 flex flex-col gap-2 shadow-2xs">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-extrabold text-slate-800">{proc.title}</h4>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-white text-slate-600 border border-slate-200">
                          {proc.badge}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700 flex items-center gap-1">
                          ⚠️ Kaçırıldı
                        </span>
                      </div>

                      {/* Evde vs Klinikte vs Tarım Bkn Rozeti */}
                      <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1 border ${
                        proc.administrationPlace === 'home'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : proc.administrationPlace === 'agriculture_directorate'
                            ? 'bg-sky-50 text-sky-700 border-sky-200'
                            : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      }`}>
                        {proc.administrationPlace === 'home' && <Home size={12} />}
                        {proc.administrationPlace === 'agriculture_directorate' && <Landmark size={12} />}
                        {proc.administrationPlace === 'veterinary_clinic' && <Building2 size={12} />}

                        {proc.administrationPlace === 'home' && 'Evde Uygulama'}
                        {proc.administrationPlace === 'agriculture_directorate' && 'Tarım Bkn. / PETVET'}
                        {proc.administrationPlace === 'veterinary_clinic' && proc.clinicName}
                      </span>
                    </div>

                    <p className="text-xs font-medium text-slate-600">
                      {proc.notes || 'Randevuya gidilmedi'} • {proc.timeText} • Uygulayan: {proc.appliedBy || proc.clinicName}
                    </p>

                    <div className="flex items-center gap-2 mt-1">
                      <button
                        onClick={() => handleMarkProcessDone(proc.id)}
                        className="flex-1 py-2 px-3 rounded-xl bg-emerald-100/80 hover:bg-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-center gap-1 transition-all active:scale-[0.98] cursor-pointer"
                      >
                        <Check size={14} /> Yapıldı
                      </button>
                      <button
                        onClick={() => handleSnoozeProcess(proc.id)}
                        className="flex-1 py-2 px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold flex items-center justify-center gap-1 transition-all active:scale-[0.98] cursor-pointer"
                      >
                        <Clock size={14} /> Ertele
                      </button>
                      <button
                        onClick={() => handleDeleteProcess(proc.id)}
                        className="py-2 px-3 rounded-xl bg-white hover:bg-rose-100 text-slate-500 hover:text-rose-600 border border-slate-200 text-xs font-bold transition-all active:scale-[0.98] cursor-pointer"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* YAKLAŞAN GRUBU */}
            {upcomingProcesses.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">YAKLAŞAN</span>
                {upcomingProcesses.map(proc => (
                  <div key={proc.id} className="bg-white rounded-2xl p-4 border border-slate-200/80 flex flex-col gap-2 shadow-xs">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-extrabold text-slate-800">{proc.title}</h4>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600">
                          {proc.badge}
                        </span>
                      </div>

                      {/* Evde vs Klinikte vs Tarım Bkn Rozeti */}
                      <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1 border ${
                        proc.administrationPlace === 'home'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : proc.administrationPlace === 'agriculture_directorate'
                            ? 'bg-sky-50 text-sky-700 border-sky-200'
                            : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      }`}>
                        {proc.administrationPlace === 'home' && <Home size={12} />}
                        {proc.administrationPlace === 'agriculture_directorate' && <Landmark size={12} />}
                        {proc.administrationPlace === 'veterinary_clinic' && <Building2 size={12} />}

                        {proc.administrationPlace === 'home' && 'Evde (Hasta Sahibi)'}
                        {proc.administrationPlace === 'agriculture_directorate' && 'Tarım Bkn. PETVET'}
                        {proc.administrationPlace === 'veterinary_clinic' && proc.clinicName}
                      </span>
                    </div>

                    <p className="text-xs font-medium text-slate-600">
                      {proc.doctorOrDept ? `${proc.doctorOrDept} • ` : ''}{proc.timeText} • {proc.appliedBy || proc.clinicName}
                    </p>

                    <div className="flex items-center gap-2 mt-1">
                      <button
                        onClick={() => handleMarkProcessDone(proc.id)}
                        className="flex-1 py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center gap-1 transition-all active:scale-[0.98] cursor-pointer"
                      >
                        <Check size={14} /> Yapıldı
                      </button>
                      <button
                        onClick={() => handleSnoozeProcess(proc.id)}
                        className="flex-1 py-2 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold flex items-center justify-center gap-1 transition-all active:scale-[0.98] cursor-pointer"
                      >
                        <Clock size={14} /> Ertele
                      </button>
                      <button
                        onClick={() => handleDeleteProcess(proc.id)}
                        className="py-2 px-3 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 text-xs font-bold transition-all active:scale-[0.98] cursor-pointer"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* GEÇMİŞ GRUBU */}
            {completedProcesses.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">GEÇMİŞ</span>
                {completedProcesses.map(proc => (
                  <div key={proc.id} className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/60 flex flex-col gap-1.5 opacity-90">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-slate-400">↗</span>
                        <h4 className="text-xs font-bold text-slate-700">{proc.title}</h4>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-slate-500 border border-slate-200">
                          {proc.badge}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Tamam
                        </span>
                      </div>

                      <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                        {proc.administrationPlace === 'home' && <Home size={10} />}
                        {proc.administrationPlace === 'agriculture_directorate' && <Landmark size={10} />}
                        {proc.administrationPlace === 'veterinary_clinic' && <Building2 size={10} />}

                        {proc.administrationPlace === 'home' && 'Evde Uygulandı'}
                        {proc.administrationPlace === 'agriculture_directorate' && 'Tarım Bkn. PETVET'}
                        {proc.administrationPlace === 'veterinary_clinic' && proc.clinicName}
                      </span>
                    </div>

                    <p className="text-[11px] font-medium text-slate-500">
                      {proc.notes ? `${proc.notes} • ` : ''}{proc.timeText} • {proc.clinicName}
                    </p>

                    {proc.linkText && (
                      <a href="#" onClick={e => e.preventDefault()} className="text-[11px] font-bold text-indigo-600 hover:underline flex items-center gap-1 mt-0.5">
                        <ExternalLink size={12} /> {proc.linkText}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setShowAddProcessModal(true)}
              className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-300 hover:border-indigo-500 text-slate-600 hover:text-indigo-600 font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] mt-1 bg-white cursor-pointer"
            >
              <Plus size={16} /> Süreç ekle
            </button>
          </div>
        )}
      </div>


      {/* ─────────────────────────────────────────────────────────────
          BÖLÜM 3: LABORATUVAR & TETKİK / KAN TAHLİLİ SONUÇLARI
      ─────────────────────────────────────────────────────────────── */}
      <div className="bg-surface rounded-card border border-border-main/60 shadow-soft overflow-hidden">
        <div 
          onClick={() => setOpenLabSection(!openLabSection)}
          className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50/60 transition-colors border-b border-border-main/40"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center font-bold">
              <Activity size={20} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-text-primary leading-tight">Laboratuvar & Tetkik Sonuçları</h2>
              <p className="text-xs font-semibold text-text-secondary">
                {labResults.length} kayıt • Dijital Belge Kasası senkronize
              </p>
            </div>
          </div>
          <button className="p-1 text-text-secondary hover:text-text-primary">
            {openLabSection ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>

        {openLabSection && (
          <div className="p-4 flex flex-col gap-3 bg-slate-50/40">
            {labResults.map(lab => (
              <div key={lab.id} className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xs font-extrabold text-slate-800">{lab.testName}</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-50 text-cyan-700 border border-cyan-200">
                      {lab.testType}
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    lab.status === 'normal' 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {lab.statusText}
                  </span>
                </div>

                <p className="text-[11px] text-slate-600 font-medium">{lab.summaryText}</p>
                <p className="text-[10px] text-slate-400">{lab.date} • {lab.clinicName}</p>

                {lab.hasDocument && (
                  <div className="mt-1 pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                      <FileText size={14} className="text-cyan-600" /> {lab.documentName}
                    </span>
                    <button className="text-[11px] font-bold text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer">
                      <Download size={12} /> İndir / İncele
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>


      {/* ─────────────────────────────────────────────────────────────
          BÖLÜM 4: REÇETELER & İLAÇ PROTOKOLLERİ
      ─────────────────────────────────────────────────────────────── */}
      <div className="bg-surface rounded-card border border-border-main/60 shadow-soft overflow-hidden">
        <div 
          onClick={() => setOpenPrescriptionsSection(!openPrescriptionsSection)}
          className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50/60 transition-colors border-b border-border-main/40"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
              <Pill size={20} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-text-primary leading-tight">Reçeteler & İlaç Protokolleri</h2>
              <p className="text-xs font-semibold text-text-secondary">
                {prescriptions.filter(r => r.status === 'active').length} aktif reçete • Sağlık İlaç Modülü senkronize
              </p>
            </div>
          </div>
          <button className="p-1 text-text-secondary hover:text-text-primary">
            {openPrescriptionsSection ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>

        {openPrescriptionsSection && (
          <div className="p-4 flex flex-col gap-3 bg-slate-50/40">
            {prescriptions.map(rx => (
              <div key={rx.id} className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xs font-extrabold text-slate-800">{rx.medicationName}</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                      {rx.duration}
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    rx.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    {rx.status === 'active' ? '● Aktif Kullanım' : '✓ Tamamlandı'}
                  </span>
                </div>

                <p className="text-xs font-medium text-slate-600">Dozaj: {rx.dosage}</p>
                <p className="text-[11px] text-slate-500">Teşhis: {rx.linkedDiagnosis} • Yazan: {rx.doctorName} ({rx.clinicName})</p>
              </div>
            ))}
          </div>
        )}
      </div>


      {/* ─────────────────────────────────────────────────────────────
          BÖLÜM 5: OPERASYON & CERRAHİ GEÇMİŞİ
      ─────────────────────────────────────────────────────────────── */}
      <div className="bg-surface rounded-card border border-border-main/60 shadow-soft overflow-hidden">
        <div 
          onClick={() => setOpenSurgerySection(!openSurgerySection)}
          className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50/60 transition-colors border-b border-border-main/40"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <Scissors size={20} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-text-primary leading-tight">Operasyon & Cerrahi Geçmişi</h2>
              <p className="text-xs font-semibold text-text-secondary">
                {surgeries.length} ameliyat kaydı • PETVET Pasaport senkronize
              </p>
            </div>
          </div>
          <button className="p-1 text-text-secondary hover:text-text-primary">
            {openSurgerySection ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>

        {openSurgerySection && (
          <div className="p-4 flex flex-col gap-3 bg-slate-50/40">
            {surgeries.map(surg => (
              <div key={surg.id} className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-extrabold text-slate-800">{surg.procedureName}</h3>
                  <span className="text-[10px] font-bold text-slate-500">{surg.date}</span>
                </div>
                <p className="text-xs text-slate-600 font-medium">Cerrah: {surg.surgeonName} • Klinik: {surg.clinicName}</p>
                <p className="text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded-xl border border-slate-100">"{surg.postOpNotes}"</p>
              </div>
            ))}
          </div>
        )}
      </div>


      {/* ─────────────────────────────────────────────────────────────
          BÖLÜM 6: ZİYARET GEÇMİŞİ & BÜTÇE SENKRONU
      ─────────────────────────────────────────────────────────────── */}
      <div className="bg-surface rounded-card border border-border-main/60 shadow-soft overflow-hidden">
        <div 
          onClick={() => setOpenVisitsSection(!openVisitsSection)}
          className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50/60 transition-colors border-b border-border-main/40"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Receipt size={20} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-text-primary leading-tight">Ziyaret Geçmişi & Klinik Harcamalar</h2>
              <p className="text-xs font-semibold text-text-secondary">
                {visits.length} ziyaret • Toplam ₺{totalSpent.toLocaleString('tr-TR')} bütçelendi
              </p>
            </div>
          </div>
          <button className="p-1 text-text-secondary hover:text-text-primary">
            {openVisitsSection ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>

        {openVisitsSection && (
          <div className="p-4 flex flex-col gap-2.5 bg-slate-50/40 divide-y divide-slate-200/60">
            {visits.map(v => (
              <div key={v.id} className="pt-2.5 first:pt-0 flex items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-extrabold text-slate-800">{v.clinicName}</h4>
                  <p className="text-[11px] font-medium text-slate-500">{v.service} • {v.date}</p>
                </div>
                <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200/80">
                  ₺{v.cost.toLocaleString('tr-TR')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>


      {/* ─────────────────────────────────────────────────────────────
          BÖLÜM 7: RESMİ KURUM KAYDI (PETVET & TESCİL)
      ─────────────────────────────────────────────────────────────── */}
      <div className="bg-surface rounded-card border border-border-main/60 shadow-soft overflow-hidden">
        <div 
          onClick={() => setOpenOfficialSection(!openOfficialSection)}
          className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50/60 transition-colors border-b border-border-main/40"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
              <Landmark size={20} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-text-primary leading-tight flex items-center gap-2">
                Resmi kurum kaydı (PETVET)
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                  1 geçmiş
                </span>
              </h2>
              <p className="text-xs font-semibold text-text-secondary">
                Kadıköy / İstanbul
              </p>
            </div>
          </div>
          <button className="p-1 text-text-secondary hover:text-text-primary">
            {openOfficialSection ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>

        {openOfficialSection && (
          <div className="p-4 flex flex-col gap-3 bg-slate-50/40">
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 flex flex-col gap-2.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck size={16} className="text-emerald-600" /> Tarım ve Orman Bakanlığı PETVET Tescili
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  ✓ Tescilli
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Mikroçip Tescil No</span>
                  <span className="font-mono font-bold text-slate-700">{safeMicrochip}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Kayıtlı İl / İlçe</span>
                  <span className="font-bold text-slate-700">Kadıköy / İstanbul</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Pasaport Tescil Kodu</span>
                  <span className="font-mono font-bold text-slate-700">TR-34-KDK-84920</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Yetkili Kurum</span>
                  <span className="font-bold text-slate-700">Kadıköy İlçe Tarım ve Orman Müdürlüğü</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>


      {/* ─────────────────────────────────────────────────────────────
          MODALLAR: VETERİNER EKLE, SÜREÇ EKLE (KLİNİKTE / TARIM BKN / EVDE), QR MODAL
      ─────────────────────────────────────────────────────────────── */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm border border-slate-200 shadow-2xl flex flex-col items-center text-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <QrCode size={28} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-800">{petName} • Klinik Barkodu</h3>
              <p className="text-xs text-slate-500 mt-0.5">Klinik bankosunda taratılacak dijital kimlik kodu</p>
            </div>
            <div className="p-4 bg-slate-100 rounded-2xl border border-slate-200 flex items-center justify-center">
              <div className="w-40 h-40 bg-slate-900 rounded-xl flex items-center justify-center text-white font-mono text-xs text-center p-2">
                [ DİJİTAL VET QR KODU ]
              </div>
            </div>
            <p className="font-mono text-xs font-bold text-slate-700">Çip: {safeMicrochip}</p>
            <button
              onClick={() => setShowQrModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 cursor-pointer"
            >
              Kapat
            </button>
          </div>
        </div>
      )}

      {showAddVetModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 w-full max-w-md border border-slate-200 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                <Stethoscope size={18} className="text-emerald-600" /> Yeni Veteriner Ekle
              </h3>
              <button onClick={() => setShowAddVetModal(false)} className="p-1 rounded-full text-slate-400 hover:bg-slate-100 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddVetSubmit} className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Klinik / Hastane Adı *</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Kadıköy Pet Klinik"
                  value={newVetName}
                  onChange={e => setNewVetName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Veteriner Hekim Adı</label>
                <input
                  type="text"
                  placeholder="Örn: Dr. Elif Kaya"
                  value={newVetDoctor}
                  onChange={e => setNewVetDoctor(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Uzmanlık / Etiket</label>
                  <input
                    type="text"
                    placeholder="Örn: Dermatoloji"
                    value={newVetSpecialty}
                    onChange={e => setNewVetSpecialty(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Telefon</label>
                  <input
                    type="text"
                    placeholder="0216..."
                    value={newVetPhone}
                    onChange={e => setNewVetPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Adres / Semt</label>
                <input
                  type="text"
                  placeholder="Örn: Caferağa Mh., Kadıköy"
                  value={newVetAddress}
                  onChange={e => setNewVetAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddVetModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SÜREÇ EKLE (KLİNİKTE / TARIM BKN PETVET / EVDE 3'LÜ SEÇİMLİ) */}
      {showAddProcessModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 w-full max-w-md border border-slate-200 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                <Share2 size={18} className="text-indigo-600" /> Yeni Klinik Süreç Ekle
              </h3>
              <button onClick={() => setShowAddProcessModal(false)} className="p-1 rounded-full text-slate-400 hover:bg-slate-100 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddProcessSubmit} className="flex flex-col gap-3">
              {/* Uygulama Yeri Anahtarı (3'lü Segmented Toggle) */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Uygulama Yeri ve Yasal Kanal</label>
                <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-2xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setNewProcPlace('veterinary_clinic')}
                    className={`py-2 px-1.5 rounded-xl text-[11px] font-extrabold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      newProcPlace === 'veterinary_clinic' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Building2 size={13} /> Klinikte
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewProcPlace('agriculture_directorate')}
                    className={`py-2 px-1.5 rounded-xl text-[11px] font-extrabold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      newProcPlace === 'agriculture_directorate' ? 'bg-white text-sky-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Landmark size={13} /> Tarım Bkn.
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewProcPlace('home')}
                    className={`py-2 px-1.5 rounded-xl text-[11px] font-extrabold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      newProcPlace === 'home' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Home size={13} /> Evde
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Süreç / Randevu Adı *</label>
                <input
                  type="text"
                  required
                  placeholder={
                    newProcPlace === 'agriculture_directorate'
                      ? 'Örn: Yasal Kuduz Aşısı (Zorunlu Tescil)'
                      : newProcPlace === 'home'
                        ? 'Örn: Ense Parazit Damlası'
                        : 'Örn: Diş taşı temizliği, Cilt kontrolü'
                  }
                  value={newProcTitle}
                  onChange={e => setNewProcTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Tür</label>
                  <select
                    value={newProcBadge}
                    onChange={e => setNewProcBadge(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-hidden focus:border-indigo-500 bg-white"
                  >
                    <option value="Randevu">Randevu</option>
                    <option value="Kontrol">Kontrol</option>
                    <option value="Sevk">Sevk</option>
                    <option value="Tedavi">Tedavi</option>
                    <option value="Operasyon">Operasyon</option>
                    <option value="Lab & Tetkik">Lab & Tetkik</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Zaman (Gün sonra)</label>
                  <input
                    type="number"
                    min="1"
                    value={newProcDays}
                    onChange={e => setNewProcDays(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>

              {newProcPlace === 'veterinary_clinic' && (
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Uygulanacak Veteriner Kliniği</label>
                  <select
                    value={newProcClinic}
                    onChange={e => setNewProcClinic(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-hidden focus:border-indigo-500 bg-white"
                  >
                    {activeVets.map(v => (
                      <option key={v.id} value={v.name}>{v.name} ({v.doctorName || 'Klinik'})</option>
                    ))}
                  </select>
                </div>
              )}

              {newProcPlace === 'agriculture_directorate' && (
                <div className="bg-sky-50 border border-sky-200/80 rounded-2xl p-3 text-xs text-sky-900">
                  <span className="font-bold flex items-center gap-1 mb-0.5">
                    <ShieldCheck size={14} className="text-sky-600" /> Tarım ve Orman Bakanlığı PETVET Tescili
                  </span>
                  Yasal zorunlu Kuduz Aşısı ve Mikroçip tescil kayıtları resmi İl/İlçe Tarım Müdürlüğü kanalıyla işlenir.
                </div>
              )}

              <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddProcessModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
