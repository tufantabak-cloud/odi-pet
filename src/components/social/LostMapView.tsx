'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix missing marker icons due to next.js / webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/vendor/leaflet/marker-icon-2x.png',
  iconUrl: '/vendor/leaflet/marker-icon.png',
  shadowUrl: '/vendor/leaflet/marker-shadow.png',
})

const customMarkerIcon = new L.Icon({
  iconUrl: '/vendor/leaflet/lost-pet-marker.svg',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

interface LostMapViewProps {
  reports: any[]
}

export default function LostMapView({ reports }: LostMapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)

  useEffect(() => {
    if (!mapRef.current) return

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current).setView([39.92077, 32.85411], 6) // Center of Turkey
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(mapInstanceRef.current)
    }

    const map = mapInstanceRef.current

    // Clear existing markers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        map.removeLayer(layer)
      }
    })

    const bounds = L.latLngBounds([])
    let hasMarkers = false

    reports.forEach(report => {
      if (report.latitude && report.longitude) {
        const marker = L.marker([report.latitude, report.longitude], { icon: customMarkerIcon }).addTo(map)
        hasMarkers = true
        
        const petName = report.pet?.name || 'Bilinmiyor'
        const phone = report.contact_phone || 'Belirtilmemiş'
        const location = report.last_seen_location || 'Belirtilmemiş'
        
        marker.bindPopup(`
          <div style="font-family: inherit;">
            <h3 style="font-weight: bold; margin-bottom: 4px; font-size: 14px; color: #EF4444;">🚨 ${petName}</h3>
            <p style="margin: 0 0 4px 0; font-size: 12px; color: #64748B;">📍 ${location}</p>
            <p style="margin: 0; font-size: 13px; font-weight: bold; color: #0F172A;">📞 <a href="tel:${phone}" style="color: inherit; text-decoration: none;">${phone}</a></p>
          </div>
        `)
        bounds.extend([report.latitude, report.longitude])
      }
    })

    if (hasMarkers && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 })
    }

    // Don't destroy the map on unmount so it can be re-rendered quickly if toggled, 
    // but in strict mode or component removal we might want to cleanup
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [reports])

  return (
    <div className="w-full h-[500px] rounded-2xl overflow-hidden border border-border-main shadow-sm relative z-0">
      <div ref={mapRef} className="w-full h-full" />
    </div>
  )
}
