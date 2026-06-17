export interface GuideStep {
  key: string;
  target: string;
  title: string;
  description: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  completionTrigger: string;
}

export const ONBOARDING_STEPS: GuideStep[] = [
  {
    key: 'onb_pet_profile',
    target: '#onb-pet-add', // UI element to highlight
    title: 'İlk Adım: Pet Ekle',
    description: 'Dostunu sisteme ekleyerek başla.',
    position: 'bottom',
    completionTrigger: 'api:POST:/api/pets'
  },
  {
    key: 'onb_first_plan',
    target: '#onb-plan-add',
    title: 'Plan Yap',
    description: 'İlk bakım veya beslenme planını oluştur.',
    position: 'bottom',
    completionTrigger: 'api:POST:/api/plans'
  },
  {
    key: 'onb_notification',
    target: '#onb-notifications',
    title: 'Bildirim İzni',
    description: 'Önemli aşı ve bakım hatırlatmaları için bildirimlere izin ver.',
    position: 'bottom',
    completionTrigger: 'action:notification_permission' // We will handle this in code manually
  },
  {
    key: 'onb_dashboard',
    target: '#onb-dashboard-card',
    title: 'Dashboard Keşfi',
    description: 'Detayları görmek için karta tıkla.',
    position: 'bottom',
    completionTrigger: 'click:dashboard-card'
  },
  {
    key: 'onb_scanner',
    target: '#onb-scanner-capture',
    title: 'Akıllı Tarama',
    description: 'Hemen bir fotoğraf çek ve analiz et.',
    position: 'bottom',
    completionTrigger: 'click:scanner-capture'
  },
  {
    key: 'onb_journal',
    target: '#onb-journal-add',
    title: 'Durum Kaydet',
    description: 'Dostunun bugünkü ruh halini veya durumunu günlüğe ekle.',
    position: 'bottom',
    completionTrigger: 'api:POST:/api/journal'
  },
  {
    key: 'onb_health_record',
    target: '#onb-health-record',
    title: 'Sağlık & Aşı Kaydı',
    description: 'Sağlık veya aşı kaydını buradan ekleyebilirsin.',
    position: 'bottom',
    completionTrigger: 'api:POST:/api/health-records' // We assume a POST to health-records here
  }
];
