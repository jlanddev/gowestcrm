'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/lib/supabase';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

const STATUS_OPTIONS = ['New', 'Spoke With', 'Site Visit', 'Proposal Made', 'Under Contract', 'Closed'];

const PIPELINE_COLORS = {
  jv: '#1e3a5f',
  development: '#1e3a5f',
  listing: '#1e3a5f',
  capital: '#1e3a5f',
  dispo: '#1e3a5f',
};

const PIPELINE_NAMES = {
  jv: 'JV Development',
  development: 'Developments',
  listing: 'Listing Leads',
  capital: 'Capital Partners',
  dispo: 'Dispo Leads',
};

const STAGES = ['New', 'Contacted', 'Qualified', 'Negotiating', 'Under Contract', 'Closed', 'Lost'];

// Get satellite thumbnail URL with parcel boundary overlay
const getSatelliteThumbnail = (lat, lng, boundary = null) => {
  if (!lat || !lng) return null;

  // If boundary exists, use GeoJSON overlay
  if (boundary) {
    try {
      const geom = typeof boundary === 'string' ? JSON.parse(boundary) : boundary;
      const geojson = {
        type: 'Feature',
        properties: { stroke: '#FF0000', 'stroke-width': 3, 'stroke-opacity': 1, fill: '#FF0000', 'fill-opacity': 0.2 },
        geometry: geom
      };
      const encodedGeojson = encodeURIComponent(JSON.stringify(geojson));
      return `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/geojson(${encodedGeojson})/auto/80x60@2x?padding=10&logo=false&attribution=false&access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`;
    } catch (e) {}
  }

  return `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/${lng},${lat},15,0/80x60@2x?padding=10&logo=false&attribution=false&access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`;
};

export default function LeadsMap({ leads = [], onSelectLead, onGoToBackend, onLeadUpdate, users = [], currentUser }) {
  const mapContainer = useRef(null);
  const [showScheduleModal, setShowScheduleModal] = useState(null); // holds lead id
  const [scheduleType, setScheduleType] = useState('call'); // call, site_visit, task
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [scheduleAssignee, setScheduleAssignee] = useState('');
  const [scheduleDescription, setScheduleDescription] = useState('');
  const [showLeadDetails, setShowLeadDetails] = useState(null); // holds lead object
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
  const [leadTasks, setLeadTasks] = useState({}); // { leadId: taskCount }

  // Fetch upcoming tasks for all leads
  useEffect(() => {
    const fetchUpcomingTasks = async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('tasks')
        .select('lead_id')
        .gte('due_date', today)
        .eq('status', 'pending');

      if (!error && data) {
        const counts = {};
        data.forEach(task => {
          if (task.lead_id) {
            counts[task.lead_id] = (counts[task.lead_id] || 0) + 1;
          }
        });
        setLeadTasks(counts);
      }
    };

    fetchUpcomingTasks();
  }, [leads]);

  // Update lead stage in database
  const updateLeadStage = async (leadId, newStage, e) => {
    e.stopPropagation();
    const { error } = await supabase
      .from('leads')
      .update({ stage: newStage })
      .eq('id', leadId);

    if (!error && onLeadUpdate) {
      onLeadUpdate();
    }
  };

  // Schedule task/call/site visit
  const handleSchedule = async (e) => {
    e.preventDefault();
    if (!scheduleDate || !showScheduleModal) return;

    const lead = leads.find(l => l.id === showScheduleModal);
    const assignee = scheduleAssignee || currentUser?.id || null;

    const taskData = {
      title: `${scheduleType === 'call' ? 'Call' : scheduleType === 'site_visit' ? 'Site Visit' : 'Task'}: ${lead?.name || 'Lead'}`,
      description: scheduleDescription || `${scheduleType} for ${lead?.name}`,
      due_date: `${scheduleDate}${scheduleTime ? 'T' + scheduleTime : 'T09:00'}:00`,
      lead_id: showScheduleModal,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    // Only add assigned_to if we have a valid value
    if (assignee) {
      taskData.assigned_to = assignee;
    }

    const { error } = await supabase.from('tasks').insert([taskData]);

    if (error) {
      console.error('Error scheduling task:', error);
      alert('Error scheduling: ' + error.message);
    } else {
      // Update local task count immediately
      setLeadTasks(prev => ({
        ...prev,
        [showScheduleModal]: (prev[showScheduleModal] || 0) + 1
      }));
      setShowScheduleModal(null);
      setScheduleDate('');
      setScheduleTime('');
      setScheduleDescription('');
      setScheduleAssignee('');
      if (onLeadUpdate) onLeadUpdate();
    }
  };

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
          'fill-color': '#FF0000',
          'fill-opacity': 0.15,
        },
      });

      map.current.addLayer({
        id: 'parcel-outline',
        type: 'line',
        source: 'parcels',
        paint: {
          'line-color': '#FF0000',
          'line-width': 4,
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

  // Calculate centroid from boundary polygon
  const getCentroid = (boundary) => {
    try {
      const coords = typeof boundary === 'string' ? JSON.parse(boundary) : boundary;
      if (coords?.coordinates?.[0]) {
        const ring = coords.coordinates[0];
        let sumLng = 0, sumLat = 0;
        ring.forEach(coord => {
          sumLng += coord[0];
          sumLat += coord[1];
        });
        return { lng: sumLng / ring.length, lat: sumLat / ring.length };
      }
    } catch (e) {}
    return null;
  };

  // Convert boundary to SVG points for thumbnail
  const getBoundarySvgPoints = (boundary) => {
    try {
      const coords = typeof boundary === 'string' ? JSON.parse(boundary) : boundary;
      if (coords?.coordinates?.[0]) {
        const ring = coords.coordinates[0];
        // Find bounds
        let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
        ring.forEach(([lng, lat]) => {
          minLng = Math.min(minLng, lng);
          maxLng = Math.max(maxLng, lng);
          minLat = Math.min(minLat, lat);
          maxLat = Math.max(maxLat, lat);
        });
        // Normalize to SVG viewBox (100x70 with padding)
        const padding = 5;
        const width = 90;
        const height = 60;
        const lngRange = maxLng - minLng || 1;
        const latRange = maxLat - minLat || 1;
        const points = ring.map(([lng, lat]) => {
          const x = padding + ((lng - minLng) / lngRange) * width;
          const y = padding + ((maxLat - lat) / latRange) * height; // Flip Y
          return `${x},${y}`;
        }).join(' ');
        return points;
      }
    } catch (e) {}
    return null;
  };

  // Add markers
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    const leadsWithCoords = filteredLeads.filter(lead => lead.lat && lead.lng);

    leadsWithCoords.forEach(lead => {
      // Use centroid from boundary if available, otherwise use lat/lng
      let markerLat = lead.lat;
      let markerLng = lead.lng;
      if (lead.boundary) {
        const centroid = getCentroid(lead.boundary);
        if (centroid) {
          markerLat = centroid.lat;
          markerLng = centroid.lng;
        }
      }

      const el = document.createElement('div');
      el.className = 'lead-marker';
      el.innerHTML = `
        <div style="
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
        ">
          <div class="marker-pin" style="
            background: #1e3a5f;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            border: 4px solid rgba(255,255,255,0.95);
            box-shadow: 0 6px 16px rgba(0,0,0,0.5), 0 0 0 6px rgba(30, 58, 95, 0.3);
            animation: sonarPulse 2.5s ease-out infinite;
          "></div>
        </div>
      `;

      el.addEventListener('mouseenter', () => {
        el.querySelector('.marker-pin').style.transform = 'scale(1.3)';
      });
      el.addEventListener('mouseleave', () => {
        el.querySelector('.marker-pin').style.transform = 'scale(1)';
      });

      const marker = new mapboxgl.Marker(el)
        .setLngLat([markerLng, markerLat])
        .addTo(map.current);

      el.addEventListener('click', () => {
        setSelectedLead(lead);
        if (onSelectLead) onSelectLead(lead);

        map.current.flyTo({
          center: [markerLng, markerLat],
          zoom: 15,
          duration: 1000,
        });

        showParcelBoundary(lead);
      });

      markersRef.current.push(marker);
    });

    // Load ALL parcel boundaries on map load
    const loadParcels = () => {
      const parcelFeatures = filteredLeads
        .filter(lead => lead.boundary)
        .map(lead => {
          try {
            const geometry = typeof lead.boundary === 'string' ? JSON.parse(lead.boundary) : lead.boundary;
            return {
              type: 'Feature',
              properties: { leadId: lead.id },
              geometry
            };
          } catch (e) {
            return null;
          }
        })
        .filter(f => f !== null);

      const source = map.current.getSource('parcels');
      if (source) {
        source.setData({
          type: 'FeatureCollection',
          features: parcelFeatures
        });
      } else {
        // Retry after map loads
        setTimeout(loadParcels, 500);
      }
    };
    loadParcels();

    if (leadsWithCoords.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      leadsWithCoords.forEach(lead => bounds.extend([lead.lng, lead.lat]));
      map.current.fitBounds(bounds, { padding: 50, maxZoom: 12 });
    }
  }, [filteredLeads, mapLoaded]);

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
      <div className={`h-full bg-navy flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'w-0 overflow-hidden' : 'w-80'}`}>
        {/* Header */}
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-white text-xl font-semibold">
              {filteredLeads.length} Active Leads
            </h1>
            <button onClick={() => setSidebarCollapsed(true)} className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          </div>
          <div className="text-white/40 text-sm">Go West</div>
          <button
            onClick={onGoToBackend}
            className="mt-3 w-full px-4 py-2 bg-rust hover:bg-rust/80 text-white text-sm font-medium rounded-lg transition"
          >
            Backend
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 p-4">
          <div className="bg-white/5 rounded-lg p-3">
            <div className="text-white/40 text-xs">New Leads</div>
            <div className="text-white text-xl font-semibold">{filteredLeads.filter(l => l.stage === 'New').length}</div>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <div className="text-white/40 text-xs">Offers Out</div>
            <div className="text-white text-xl font-semibold">{filteredLeads.filter(l => l.stage === 'Negotiating').length}</div>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <div className="text-white/40 text-xs">Contracts</div>
            <div className="text-white text-xl font-semibold">{filteredLeads.filter(l => l.stage === 'Under Contract').length}</div>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <div className="text-white/40 text-xs">Closed</div>
            <div className="text-white text-xl font-semibold">{filteredLeads.filter(l => l.stage === 'Closed').length}</div>
          </div>
        </div>

        {/* Pipeline Filter Tabs - Scrollable */}
        <div className="border-b border-white/10 overflow-x-auto">
          <div className="flex px-4 gap-1 min-w-max">
            <button
              onClick={() => setFilterPipeline('all')}
              className={`px-3 py-2 text-sm whitespace-nowrap rounded-t-lg transition ${
                filterPipeline === 'all' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterPipeline('jv')}
              className={`px-3 py-2 text-sm whitespace-nowrap rounded-t-lg transition ${
                filterPipeline === 'jv' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white'
              }`}
            >
              JV Development
            </button>
            <button
              onClick={() => setFilterPipeline('development')}
              className={`px-3 py-2 text-sm whitespace-nowrap rounded-t-lg transition ${
                filterPipeline === 'development' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white'
              }`}
            >
              Developments
            </button>
            <button
              onClick={() => setFilterPipeline('listing')}
              className={`px-3 py-2 text-sm whitespace-nowrap rounded-t-lg transition ${
                filterPipeline === 'listing' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white'
              }`}
            >
              Listings
            </button>
            <button
              onClick={() => setFilterPipeline('dispo')}
              className={`px-3 py-2 text-sm whitespace-nowrap rounded-t-lg transition ${
                filterPipeline === 'dispo' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white'
              }`}
            >
              Dispo
            </button>
          </div>
        </div>

        {/* Leads List */}
        <div className="flex-1 overflow-y-auto">
          {filteredLeads.length === 0 ? (
            <div className="text-center py-12 text-white/40">
              <p>No leads found</p>
            </div>
          ) : (
            filteredLeads.map(lead => (
              <div
                key={lead.id}
                onClick={() => handleLeadClick(lead)}
                className={`border-b border-white/10 cursor-pointer transition-all ${
                  selectedLead?.id === lead.id ? 'bg-white/10' : 'hover:bg-white/5'
                }`}
              >
                <div className="flex p-4 gap-3">
                  {/* Lead Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium">
                      {lead.name || 'Unknown Owner'}
                    </div>
                    {(lead.county || lead.city || lead.address) && (
                      <div className="text-white/40 text-sm mt-1">
                        {lead.county ? `${lead.county} County, ${lead.state || 'TX'}` : (lead.city ? `${lead.city}, ${lead.state || 'TX'}` : lead.address)}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      {lead.acreage > 0 && (
                        <span className="text-rust text-sm font-medium">{lead.acreage} ac</span>
                      )}
                      <div className="relative">
                        <select
                          value={lead.stage}
                          onChange={(e) => updateLeadStage(lead.id, e.target.value, e)}
                          onClick={(e) => e.stopPropagation()}
                          className="appearance-none bg-gradient-to-r from-slate-700 to-slate-600 text-white text-xs font-medium pl-3 pr-7 py-1.5 rounded-full border border-slate-500/50 shadow-sm cursor-pointer hover:from-slate-600 hover:to-slate-500 transition-all focus:outline-none focus:ring-2 focus:ring-rust/50"
                        >
                          {STATUS_OPTIONS.map(status => (
                            <option key={status} value={status} className="bg-slate-800">{status}</option>
                          ))}
                        </select>
                        <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/60 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                      {/* Calendar/Schedule Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowScheduleModal(lead.id);
                        }}
                        className="p-1.5 rounded-full bg-slate-700 hover:bg-rust transition-colors relative"
                        title="Schedule"
                      >
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {/* Red notification badge for upcoming appointments */}
                        {leadTasks[lead.id] > 0 && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-md">
                            {leadTasks[lead.id]}
                          </span>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Parcel Thumbnail with satellite + boundary overlay */}
                  <div className="w-20 h-14 rounded overflow-hidden flex-shrink-0 bg-slate-900 border border-slate-700">
                    {lead.lat && lead.lng ? (
                      <img
                        src={getSatelliteThumbnail(lead.lat, lead.lng, lead.boundary)}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => e.target.style.display = 'none'}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        </svg>
                      </div>
                    )}
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

            {/* Parcel ID */}
            {selectedLead.parcel_number && (
              <div className="py-2 border-b border-slate-700/30">
                <div className="text-slate-400 text-xs mb-1">Parcel ID</div>
                <div className="text-white font-medium">{selectedLead.parcel_number}</div>
              </div>
            )}

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

        {/* Schedule Modal */}
        {showScheduleModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowScheduleModal(null)}>
            <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-md border border-slate-700" onClick={e => e.stopPropagation()}>
              <div className="p-5 border-b border-slate-700 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Schedule Action</h3>
                <button onClick={() => setShowScheduleModal(null)} className="text-slate-400 hover:text-white">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form onSubmit={handleSchedule} className="p-5 space-y-4">
                {/* Action Type */}
                <div className="flex gap-2">
                  {[{id: 'call', label: 'Call', icon: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z'},
                    {id: 'site_visit', label: 'Site Visit', icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z'},
                    {id: 'task', label: 'Task', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4'}
                  ].map(type => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setScheduleType(type.id)}
                      className={`flex-1 py-3 px-3 rounded-lg flex flex-col items-center gap-2 transition ${
                        scheduleType === type.id ? 'bg-rust text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={type.icon} />
                      </svg>
                      <span className="text-xs font-medium">{type.label}</span>
                    </button>
                  ))}
                </div>

                {/* Date & Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-slate-400 block mb-1">Date</label>
                    <input
                      type="date"
                      value={scheduleDate}
                      onChange={e => setScheduleDate(e.target.value)}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-rust"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-400 block mb-1">Time</label>
                    <input
                      type="time"
                      value={scheduleTime}
                      onChange={e => setScheduleTime(e.target.value)}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-rust"
                    />
                  </div>
                </div>

                {/* Assign To */}
                <div>
                  <label className="text-sm text-slate-400 block mb-1">Assign To</label>
                  <select
                    value={scheduleAssignee}
                    onChange={e => setScheduleAssignee(e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-rust"
                  >
                    <option value="">Myself</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>{user.full_name || user.email}</option>
                    ))}
                  </select>
                </div>

                {/* Description */}
                {scheduleType === 'task' && (
                  <div>
                    <label className="text-sm text-slate-400 block mb-1">Description</label>
                    <textarea
                      value={scheduleDescription}
                      onChange={e => setScheduleDescription(e.target.value)}
                      rows={3}
                      placeholder="Describe the task..."
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-rust resize-none"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-rust hover:bg-rust/80 text-white py-3 rounded-lg font-medium transition"
                >
                  Schedule {scheduleType === 'call' ? 'Call' : scheduleType === 'site_visit' ? 'Site Visit' : 'Task'}
                </button>
              </form>
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
            position: relative;
          }
          @keyframes sonarPulse {
            0% {
              box-shadow:
                0 6px 16px rgba(0,0,0,0.5),
                0 0 0 6px rgba(30, 58, 95, 0.4),
                0 0 0 0 rgba(30, 58, 95, 0.8);
            }
            50% {
              box-shadow:
                0 6px 16px rgba(0,0,0,0.5),
                0 0 0 6px rgba(30, 58, 95, 0.3),
                0 0 0 40px rgba(30, 58, 95, 0);
            }
            100% {
              box-shadow:
                0 6px 16px rgba(0,0,0,0.5),
                0 0 0 6px rgba(30, 58, 95, 0.4),
                0 0 0 50px rgba(30, 58, 95, 0);
            }
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
