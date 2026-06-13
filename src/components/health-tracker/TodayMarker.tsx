import React, { useEffect, useRef } from 'react';

export function TodayMarker() {
  const markerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // We add a tiny delay to ensure layout is complete and siblings are rendered
    const timeout = setTimeout(() => {
      if (markerRef.current) {
        const marker = markerRef.current;
        const container = marker.parentElement;
        if (container) {
          const scrollPosition = marker.offsetLeft - container.clientWidth / 2 + marker.clientWidth / 2;
          container.scrollTo({ left: scrollPosition, behavior: 'smooth' });
        }
      }
    }, 250);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <div ref={markerRef} className="flex flex-col items-center justify-center shrink-0 w-4">
      <div className="w-0.5 h-[40px] bg-[#664c28] rounded-full"></div>
    </div>
  );
}
