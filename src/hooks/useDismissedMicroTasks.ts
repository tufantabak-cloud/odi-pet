'use client';

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'odi_dismissed_micro_tasks';
const DEFAULT_SNOOZE_HOURS = 24;

interface DismissedEntry {
  dismissedAt: string;
  snoozeUntil: string;
}

type DismissedMap = Record<string, DismissedEntry>;

function makeKey(petId: string, taskId: string): string {
  return `${petId}:${taskId}`;
}

function loadMap(): DismissedMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveMap(map: DismissedMap) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {}
}

export function useDismissedMicroTasks() {
  const [map, setMap] = useState<DismissedMap>({});

  useEffect(() => {
    setMap(loadMap());
  }, []);

  const isDismissed = useCallback(
    (petId: string, taskId: string): boolean => {
      const entry = map[makeKey(petId, taskId)];
      if (!entry) return false;
      return new Date(entry.snoozeUntil).getTime() > Date.now();
    },
    [map]
  );

  const dismissTask = useCallback(
    (petId: string, taskId: string, snoozeHours: number = DEFAULT_SNOOZE_HOURS) => {
      const now = new Date();
      const snoozeUntil = new Date(now.getTime() + snoozeHours * 60 * 60 * 1000);
      setMap(prev => {
        const next: DismissedMap = {
          ...prev,
          [makeKey(petId, taskId)]: {
            dismissedAt: now.toISOString(),
            snoozeUntil: snoozeUntil.toISOString(),
          },
        };
        saveMap(next);
        return next;
      });
    },
    []
  );

  const clearDismissedTask = useCallback((petId: string, taskId: string) => {
    setMap(prev => {
      const next = { ...prev };
      delete next[makeKey(petId, taskId)];
      saveMap(next);
      return next;
    });
  }, []);

  const filterVisibleTasks = useCallback(
    <T extends { id: string }>(petId: string, tasks: T[]): T[] =>
      tasks.filter(t => !isDismissed(petId, t.id)),
    [isDismissed]
  );

  return { isDismissed, dismissTask, clearDismissedTask, filterVisibleTasks };
}
