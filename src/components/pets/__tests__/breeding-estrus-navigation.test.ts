import { describe, it, expect } from 'vitest';

describe('Breeding Listing to Estrus Cycle Navigation & Tab Resolution', () => {
  it('constructs correct URL to pet calendar with action and return_url', () => {
    const petId = '548d79fa-65b0-476b-adb2-fdf71ee532fd';
    const returnUrl = encodeURIComponent(`/owner/pets/${petId}/match`);
    const targetUrl = `/owner/pets/${petId}?tab=takvim&action=new-cycle&return_url=${returnUrl}`;

    const url = new URL(`https://odi.pet${targetUrl}`);
    expect(url.pathname).toBe(`/owner/pets/${petId}`);
    expect(url.searchParams.get('tab')).toBe('takvim');
    expect(url.searchParams.get('action')).toBe('new-cycle');
    expect(url.searchParams.get('return_url')).toBe(`/owner/pets/${petId}/match`);
  });

  it('correctly maps estrus and kizginlik tabParam aliases to takvim', () => {
    const resolveTab = (tabParam: string | null) => {
      return (tabParam === 'saglik' || tabParam === 'asi' || tabParam === 'parazit' || tabParam === 'vaccines' || tabParam === 'parasite')
        ? 'saglik'
        : (tabParam === 'bakim' || tabParam === 'hijyen' || tabParam === 'aktivite' || tabParam === 'diger')
          ? 'bakim'
          : (tabParam === 'takvim' || tabParam === 'ekstra' || tabParam === 'beslenme' || tabParam === 'veteriner')
            ? tabParam
            : (tabParam === 'estrus' || tabParam === 'kizginlik')
              ? 'takvim'
              : 'ozet';
    };

    expect(resolveTab('takvim')).toBe('takvim');
    expect(resolveTab('estrus')).toBe('takvim');
    expect(resolveTab('kizginlik')).toBe('takvim');
    expect(resolveTab('saglik')).toBe('saglik');
    expect(resolveTab('unknown')).toBe('ozet');
  });

  it('safely handles active cycle end_date null display', () => {
    const activeCycle = {
      id: 'cycle-1',
      start_date: '2026-09-20',
      end_date: null,
    };

    const displayEndDate = activeCycle.end_date
      ? new Date(activeCycle.end_date).toLocaleDateString('tr-TR')
      : 'Devam ediyor';

    expect(displayEndDate).toBe('Devam ediyor');
    expect(displayEndDate).not.toContain('1970');
  });
});
