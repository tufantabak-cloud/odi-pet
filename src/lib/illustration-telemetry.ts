interface TelemetryRecord {
  illustrationId: string;
  screenPath: string;
  renderCount: number;
  lastRenderedAt: string;
}

const telemetryStore: Map<string, TelemetryRecord> = new Map();

export const trackIllustrationRender = (illustrationId: string, screenPath?: string) => {
  const currentPath = screenPath || (typeof window !== 'undefined' ? window.location.pathname : 'server');
  const key = `${illustrationId}:${currentPath}`;
  
  const existing = telemetryStore.get(key) || {
    illustrationId,
    screenPath: currentPath,
    renderCount: 0,
    lastRenderedAt: new Date().toISOString()
  };

  existing.renderCount += 1;
  existing.lastRenderedAt = new Date().toISOString();
  telemetryStore.set(key, existing);
};

export const getIllustrationTelemetryStats = () => {
  return Array.from(telemetryStore.values());
};
