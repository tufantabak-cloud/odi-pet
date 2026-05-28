export interface CameraProvider {
  /**
   * Cihaza veya cloud servisine bağlantıyı başlatır.
   * OAuth tabanlı sistemlerde token değişimi vb. süreçleri yönetebilir.
   */
  connect(): Promise<void>;

  /**
   * Kameradan gelen anlık video akış URL'sini döndürür.
   * Güvenlik nedeniyle frontend'e direkt RTSP expose edilmemeli, backend proxy URL'si dönmelidir.
   */
  getStreamUrl(): Promise<string>;

  /**
   * Cihazla olan bağlantıyı sonlandırır.
   */
  disconnect(): Promise<void>;

  /**
   * Kameranın anlık durumunu döndürür.
   */
  getStatus(): Promise<'online' | 'offline' | 'connecting' | 'error'>;
}

export interface CameraBrandConfig {
  id: string;
  name: string;
  requiresOAuth: boolean;
  requiresRtspUrl: boolean;
}

export const SUPPORTED_CAMERA_BRANDS: CameraBrandConfig[] = [
  { id: 'odipet', name: 'Odi.Pet Akıllı Kamera', requiresOAuth: false, requiresRtspUrl: false },
  { id: 'xiaomi', name: 'Xiaomi (Mi Home)', requiresOAuth: true, requiresRtspUrl: false },
  { id: 'tplink', name: 'TP-Link Tapo', requiresOAuth: true, requiresRtspUrl: false },
  { id: 'rtsp', name: 'Diğer (RTSP / ONVIF)', requiresOAuth: false, requiresRtspUrl: true }
];
