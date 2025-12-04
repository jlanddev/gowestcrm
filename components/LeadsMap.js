'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

const PIPELINE_COLORS = {
  jv: '#8B5CF6',      // purple
  development: '#3B82F6', // blue
  listing: '#22C55E',  // green
  capital: '#EAB308',  // yellow
  dispo: '#EF4444',    // red
};

export default function LeadsMap({ leads = [], onSelectLead }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markers = useRef([]);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-98.5, 31.0], // Center on Texas
      zoom: 6,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    map.current.on('load', () => {
      setMapLoaded(true);
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Update markers when leads change
  useEffect(() => {
    if (!mapLoaded || !map.current) return;

    // Clear existing markers
    markers.current.forEach(m => m.remove());
    markers.current = [];

    // Add markers for leads with coordinates
    const leadsWithCoords = leads.filter(l => l.lat && l.lng);

    leadsWithCoords.forEach(lead => {
      const color = PIPELINE_COLORS[lead.pipeline] || '#6B7280';

      // Create marker element
      const el = document.createElement('div');
      el.className = 'lead-marker';
      el.style.width = '24px';
      el.style.height = '24px';
      el.style.backgroundColor = color;
      el.style.borderRadius = '50%';
      el.style.border = '3px solid white';
      el.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
      el.style.cursor = 'pointer';

      // Create popup
      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
        <div style="padding: 8px;">
          <strong>${lead.name || 'Unknown'}</strong>
          <p style="margin: 4px 0; font-size: 12px; color: #666;">${lead.address || ''}</p>
          ${lead.acreage ? `<p style="margin: 0; font-size: 11px; color: #888;">${lead.acreage} acres</p>` : ''}
        </div>
      `);

      const marker = new mapboxgl.Marker(el)
        .setLngLat([lead.lng, lead.lat])
        .setPopup(popup)
        .addTo(map.current);

      el.addEventListener('click', () => {
        if (onSelectLead) onSelectLead(lead);
      });

      markers.current.push(marker);
    });

    // Fit bounds if we have leads
    if (leadsWithCoords.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      leadsWithCoords.forEach(l => bounds.extend([l.lng, l.lat]));
      map.current.fitBounds(bounds, { padding: 50, maxZoom: 12 });
    }
  }, [leads, mapLoaded, onSelectLead]);

  return (
    <div className="relative w-full h-full min-h-[500px]">
      <div ref={mapContainer} className="absolute inset-0" />

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 text-sm">
        <div className="font-semibold mb-2 text-gray-700">Pipeline</div>
        {Object.entries(PIPELINE_COLORS).map(([key, color]) => (
          <div key={key} className="flex items-center gap-2 mb-1">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="capitalize text-gray-600">{key}</span>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg px-4 py-2 text-sm">
        <span className="font-semibold text-gray-700">
          {leads.filter(l => l.lat && l.lng).length}
        </span>
        <span className="text-gray-500"> of {leads.length} leads mapped</span>
      </div>
    </div>
  );
}
