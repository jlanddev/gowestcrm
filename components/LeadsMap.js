'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

const PIPELINE_COLORS = {
  jv: '#6B7280',
  development: '#6B7280',
  listing: '#6B7280',
  capital: '#6B7280',
  dispo: '#6B7280',
};

const PIPELINE_NAMES = {
  jv: 'JV Development',
  development: 'Developments',
  listing: 'Listing Leads',
  capital: 'Capital Partners',
  dispo: 'Dispo Leads',
};

const STAGES = ['New', 'Contacted', 'Qualified', 'Negotiating', 'Under Contract', 'Closed', 'Lost'];

// Get satellite thumbnail URL for a lead
const getSatelliteThumbnail = (lat, lng, zoom = 15) => {
  if (!lat || !lng) return null;
  return `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/${lng},${lat},${zoom},0/120x80@2x?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`;
};

export default function LeadsMap({ leads = [], onSelectLead }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markersRef = useRef([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [hoveredLead, setHoveredLead] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [is3D, setIs3D] = useState(false);
  const [toolsExpanded, setToolsExpanded] = useState(false);
  const [showTopography, setShowTopography] = useState(false);
  const [showPower, setShowPower] = useState(false);
  const [showWetlands, setShowWetlands] = useState(false);
  const [showInfrastructure, setShowInfrastructure] = useState(false);
  const [drawMode, setDrawMode] = useState(false);
  const [filterPipeline, setFilterPipeline] = useState('all');
  const [filterStage, setFilterStage] = useState('all');

  // Initialize map
  useEffect(() => {
    if (map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      center: [-99.5, 31.5],
      zoom: 6,
      pitch: 0,
      attributionControl: false,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');

    map.current.on('load', () => {
      setMapLoaded(true);

      // Add terrain for 3D
      map.current.addSource('mapbox-dem', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512,
        maxzoom: 14
      });

      map.current.setTerrain({ source: 'mapbox-dem', exaggeration: 1.2 });

      // Hillshading
      map.current.addLayer({
        id: 'hillshading',
        type: 'hillshade',
        source: 'mapbox-dem',
        paint: {
          'hillshade-shadow-color': '#000000',
          'hillshade-illumination-direction': 315,
          'hillshade-exaggeration': 0.5
        }
      });

      // Sky layer for 3D
      map.current.addLayer({
        id: 'sky',
        type: 'sky',
        paint: {
          'sky-type': 'atmosphere',
          'sky-atmosphere-sun': [0.0, 90.0],
          'sky-atmosphere-sun-intensity': 15
        }
      });

      // Parcel source
      map.current.addSource('parcels', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      map.current.addLayer({
        id: 'parcel-fill',
        type: 'fill',
        source: 'parcels',
        paint: {
          'fill-color': '#964B00',
          'fill-opacity': 0.3,
        },
      });

      map.current.addLayer({
        id: 'parcel-outline',
        type: 'line',
        source: 'parcels',
        paint: {
          'line-color': '#964B00',
          'line-width': 2,
        },
      });
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Toggle 3D
  const toggle3D = () => {
    if (!map.current) return;
    const newIs3D = !is3D;
    setIs3D(newIs3D);
    map.current.easeTo({
      pitch: newIs3D ? 60 : 0,
      bearing: newIs3D ? -20 : 0,
      duration: 1000
    });
  };

  // Toggle topography
  const toggleTopography = () => {
    if (!map.current || !mapLoaded) return;
    const newShow = !showTopography;
    setShowTopography(newShow);

    if (newShow) {
      map.current.setTerrain({ source: 'mapbox-dem', exaggeration: 2.5 });
      map.current.setPaintProperty('hillshading', 'hillshade-exaggeration', 0.8);
    } else {
      map.current.setTerrain({ source: 'mapbox-dem', exaggeration: 1.2 });
      map.current.setPaintProperty('hillshading', 'hillshade-exaggeration', 0.5);
    }
  };

  // Filter leads
  const filteredLeads = leads.filter(lead => {
    if (filterPipeline !== 'all' && lead.pipeline !== filterPipeline) return false;
    if (filterStage !== 'all' && lead.stage !== filterStage) return false;
    return true;
  });

  // Add markers
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    const leadsWithCoords = filteredLeads.filter(lead => lead.lat && lead.lng);

    leadsWithCoords.forEach(lead => {
      const color = PIPELINE_COLORS[lead.pipeline] || '#666';

      const el = document.createElement('div');
      el.className = 'lead-marker';
      el.innerHTML = `
        <div class="marker-pin" style="
          width: 24px;
          height: 24px;
          background: ${color};
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 4px 12px rgba(0,0,0,0.4);
          cursor: pointer;
          transition: transform 0.2s;
        "></div>
      `;

      el.addEventListener('mouseenter', () => {
        el.querySelector('.marker-pin').style.transform = 'scale(1.3)';
      });
      el.addEventListener('mouseleave', () => {
        el.querySelector('.marker-pin').style.transform = 'scale(1)';
      });

      const marker = new mapboxgl.Marker(el)
        .setLngLat([lead.lng, lead.lat])
        .addTo(map.current);

      el.addEventListener('click', () => {
        setSelectedLead(lead);
        if (onSelectLead) onSelectLead(lead);

        map.current.flyTo({
          center: [lead.lng, lead.lat],
          zoom: 15,
          duration: 1000,
        });

        showParcelBoundary(lead);
      });

      markersRef.current.push(marker);
    });

    if (leadsWithCoords.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      leadsWithCoords.forEach(lead => bounds.extend([lead.lng, lead.lat]));
      map.current.fitBounds(bounds, { padding: 50, maxZoom: 12 });
    }
  }, [filteredLeads, mapLoaded, onSelectLead]);

  const showParcelBoundary = (lead) => {
    if (!map.current || !mapLoaded || !lead.lat || !lead.lng) return;

    let geometry;

    // Use actual boundary from KML if available
    if (lead.boundary) {
      try {
        const boundary = typeof lead.boundary === 'string' ? JSON.parse(lead.boundary) : lead.boundary;
        geometry = boundary;
      } catch (e) {
        console.error('Failed to parse boundary:', e);
      }
    }

    // Fall back to calculated square if no boundary
    if (!geometry) {
      const acreage = lead.acreage || 1;
      const sqMeters = acreage * 4046.86;
      const sideLength = Math.sqrt(sqMeters);
      const degreeOffset = sideLength / 111320;

      geometry = {
        type: 'Polygon',
        coordinates: [[
          [lead.lng - degreeOffset / 2, lead.lat - degreeOffset / 2],
          [lead.lng + degreeOffset / 2, lead.lat - degreeOffset / 2],
          [lead.lng + degreeOffset / 2, lead.lat + degreeOffset / 2],
          [lead.lng - degreeOffset / 2, lead.lat + degreeOffset / 2],
          [lead.lng - degreeOffset / 2, lead.lat - degreeOffset / 2],
        ]],
      };
    }

    const parcelGeoJson = {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        geometry,
      }],
    };

    const source = map.current.getSource('parcels');
    if (source) source.setData(parcelGeoJson);
  };

  const closeSidebar = () => {
    setSelectedLead(null);
    const source = map.current?.getSource('parcels');
    if (source) source.setData({ type: 'FeatureCollection', features: [] });
  };

  // Handle clicking a lead in sidebar
  const handleLeadClick = (lead) => {
    setSelectedLead(lead);
    if (onSelectLead) onSelectLead(lead);
    if (map.current && lead.lat && lead.lng) {
      map.current.flyTo({
        center: [lead.lng, lead.lat],
        zoom: 15,
        duration: 1000,
      });
      showParcelBoundary(lead);
    }
  };

  return (
    <div className="relative w-full h-full flex">
      {/* Leads Sidebar */}
      <div className={`h-full bg-slate-900 border-r border-slate-700/50 flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'w-0 overflow-hidden' : 'w-72'}`}>
        {/* Header */}
        <div className="p-4 border-b border-slate-700/50">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-semibold text-lg">
              {filteredLeads.length} {filteredLeads.length === 1 ? 'Lead' : 'Leads'}
            </h2>
            <button
              onClick={() => setSidebarCollapsed(true)}
              className="p-1 text-slate-400 hover:text-white transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Leads List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filteredLeads.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <p className="text-sm">No leads found</p>
            </div>
          ) : (
            filteredLeads.map(lead => (
              <div
                key={lead.id}
                onClick={() => handleLeadClick(lead)}
                onMouseEnter={() => setHoveredLead(lead.id)}
                onMouseLeave={() => setHoveredLead(null)}
                className={`bg-slate-800/50 rounded-lg overflow-hidden cursor-pointer transition border ${
                  selectedLead?.id === lead.id
                    ? 'border-rust ring-1 ring-rust'
                    : hoveredLead === lead.id
                      ? 'border-slate-600'
                      : 'border-transparent hover:border-slate-600'
                }`}
              >
                <div className="flex gap-3 p-2">
                  {/* Satellite Thumbnail */}
                  <div className="w-20 h-14 rounded overflow-hidden flex-shrink-0 bg-slate-700">
                    {lead.lat && lead.lng ? (
                      <img
                        src={getSatelliteThumbnail(lead.lat, lead.lng)}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => e.target.style.display = 'none'}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-500">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Lead Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium text-sm truncate">
                      {lead.name || 'Unknown Owner'}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5 truncate">
                      {lead.county ? `${lead.county} County, ${lead.state}` : `${lead.city || ''}, ${lead.state || ''}`}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5">
                      {lead.acreage > 0 && (
                        <span className="text-xs text-rust font-medium">{lead.acreage} ac</span>
                      )}
                      <span className="text-xs text-slate-500">{lead.stage}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Sidebar Toggle (when collapsed) */}
      {sidebarCollapsed && (
        <button
          onClick={() => setSidebarCollapsed(false)}
          className="absolute left-2 top-4 z-20 p-2 bg-slate-900/90 hover:bg-slate-800 text-white rounded-lg border border-slate-700/50 transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Map Container */}
      <div className="flex-1 relative">
        <div ref={mapContainer} className="w-full h-full" />

        {/* 3D Toggle */}
        <button
          onClick={toggle3D}
          className={`absolute top-4 left-4 z-10 px-4 py-2 rounded-lg font-medium shadow-lg transition-all ${
            is3D ? 'bg-rust text-white' : 'bg-white/95 text-gray-700 hover:bg-white border border-gray-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
            <span>{is3D ? '2D View' : '3D View'}</span>
          </div>
        </button>

        {/* Tools & Layers */}
        <button
          onClick={() => setToolsExpanded(!toolsExpanded)}
          className={`absolute top-16 left-4 z-10 px-4 py-2 rounded-lg font-medium shadow-lg transition-all ${
            toolsExpanded ? 'bg-rust text-white' : 'bg-white/95 text-gray-700 hover:bg-white border border-gray-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            <span>Tools</span>
            <svg className={`w-4 h-4 transition-transform ${toolsExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {/* Tools Menu */}
        {toolsExpanded && (
          <div className="absolute top-28 left-4 z-10 bg-white/95 rounded-xl shadow-xl border border-gray-200 p-2 min-w-[200px]">
            <ToolButton
              active={drawMode}
              onClick={() => setDrawMode(!drawMode)}
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>}
              label="Draw Lots"
            />
            <ToolButton
              active={showTopography}
              onClick={toggleTopography}
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>}
              label="Show Topography"
            />
            <ToolButton
              active={showPower}
              onClick={() => setShowPower(!showPower)}
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
              label="Power"
            />
            <ToolButton
              active={showInfrastructure}
              onClick={() => setShowInfrastructure(!showInfrastructure)}
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
              label="Infrastructure Districts"
            />
            <ToolButton
              active={false}
              onClick={() => {}}
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
              label="Lot Absorption"
              hasDropdown
            />
            <ToolButton
              active={false}
              onClick={() => {}}
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
              label="For Sale / Sold Comps"
            />
            <ToolButton
              active={false}
              onClick={() => {}}
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" /></svg>}
              label="Builder Lot Takes"
            />
            <ToolButton
              active={false}
              onClick={() => {}}
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>}
              label="Developments Map"
            />
            <ToolButton
              active={showWetlands}
              onClick={() => setShowWetlands(!showWetlands)}
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>}
              label="Wetlands / Floodplain"
            />
          </div>
        )}

        {/* Property Summary Sidebar */}
        {selectedLead && (
        <div className="absolute top-4 right-4 w-80 bg-gradient-to-b from-slate-900 to-slate-800 rounded-xl shadow-2xl border border-slate-700/50 z-20 overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-rust" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              <h3 className="text-white font-semibold">Property Summary</h3>
            </div>
            <button onClick={closeSidebar} className="text-slate-400 hover:text-white transition">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Details */}
          <div className="p-4 space-y-3 text-sm max-h-[calc(100vh-200px)] overflow-y-auto">
            {/* Pipeline Badge */}
            <div className="flex items-center gap-2 mb-4">
              <span
                className="px-3 py-1 rounded-full text-xs font-semibold text-white"
                style={{ backgroundColor: PIPELINE_COLORS[selectedLead.pipeline] || '#666' }}
              >
                {PIPELINE_NAMES[selectedLead.pipeline] || selectedLead.pipeline}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-700 text-white">
                {selectedLead.stage}
              </span>
            </div>

            {/* Owner */}
            <div className="py-2 border-b border-slate-700/30">
              <div className="text-slate-400 text-xs mb-1">Owner</div>
              <div className="text-white font-medium">{selectedLead.name || 'Unknown'}</div>
            </div>

            {/* Address */}
            <div className="py-2 border-b border-slate-700/30">
              <div className="text-slate-400 text-xs mb-1">Property Address</div>
              <div className="text-white font-medium">{selectedLead.address || 'N/A'}</div>
              <div className="text-slate-400 text-sm">{selectedLead.city}, {selectedLead.state}</div>
            </div>

            {/* County */}
            {selectedLead.county && (
              <div className="flex justify-between py-2 border-b border-slate-700/30">
                <span className="text-slate-400">County</span>
                <span className="text-white font-medium">{selectedLead.county}</span>
              </div>
            )}

            {/* Acreage */}
            {selectedLead.acreage > 0 && (
              <div className="flex justify-between py-2 border-b border-slate-700/30">
                <span className="text-slate-400">Acreage</span>
                <span className="text-white font-medium">{selectedLead.acreage} acres</span>
              </div>
            )}

            {/* Contact Info */}
            {(selectedLead.phone || selectedLead.email) && (
              <div className="pt-3 border-t border-slate-600">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-4 h-4 text-rust" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="text-rust font-semibold text-xs uppercase tracking-wide">Contact Info</span>
                </div>

                {selectedLead.phone && (
                  <div className="py-2 border-b border-slate-700/30">
                    <div className="text-slate-400 text-xs mb-1">Phone</div>
                    <a href={`tel:${selectedLead.phone}`} className="text-white font-medium hover:text-rust transition">
                      {selectedLead.phone}
                    </a>
                  </div>
                )}

                {selectedLead.email && (
                  <div className="py-2 border-b border-slate-700/30">
                    <div className="text-slate-400 text-xs mb-1">Email</div>
                    <a href={`mailto:${selectedLead.email}`} className="text-white font-medium hover:text-rust transition text-sm break-all">
                      {selectedLead.email}
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            {selectedLead.notes && (
              <div className="py-2">
                <div className="text-slate-400 text-xs mb-1">Notes</div>
                <div className="text-white text-sm">{selectedLead.notes}</div>
              </div>
            )}

            {/* Actions */}
            <div className="pt-4 flex gap-2">
              <button
                onClick={() => onSelectLead && onSelectLead(selectedLead)}
                className="flex-1 px-4 py-2 bg-rust hover:bg-rust/80 text-white rounded-lg font-medium text-sm transition"
              >
                View Details
              </button>
            </div>
          </div>
        </div>
      )}

        {/* Hide Mapbox branding */}
        <style jsx global>{`
          .mapboxgl-ctrl-bottom-left,
          .mapboxgl-ctrl-bottom-right,
          .mapboxgl-ctrl-attrib {
            display: none !important;
          }
          .mapboxgl-ctrl-group {
            background: rgba(24, 41, 74, 0.95) !important;
            border: 1px solid rgba(255,255,255,0.1) !important;
            border-radius: 8px !important;
          }
          .mapboxgl-ctrl-group button {
            background: transparent !important;
          }
          .mapboxgl-ctrl-group button:hover {
            background: rgba(255,255,255,0.1) !important;
          }
          .mapboxgl-ctrl-group button .mapboxgl-ctrl-icon {
            filter: invert(1);
          }
          .lead-marker {
            cursor: pointer;
          }
        `}</style>
      </div>
    </div>
  );
}

function ToolButton({ active, onClick, icon, label, hasDropdown }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
        active ? 'bg-rust text-white' : 'text-gray-700 hover:bg-gray-100'
      }`}
    >
      <div className="flex items-center gap-3">
        {icon}
        <span>{label}</span>
      </div>
      {hasDropdown && (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      )}
    </button>
  );
}
