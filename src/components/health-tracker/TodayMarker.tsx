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
    }, 100);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <div ref={markerRef} className="flex flex-col items-center justify-center shrink-0 w-8 mx-1">
      <div className="w-1.5 h-1.5 rounded-full bg-primary mb-1"></div>
      <div className="w-0.5 h-full min-h-[40px] bg-gradient-to-b from-primary/50 to-transparent rounded-full"></div>
    </div>
  );
}
