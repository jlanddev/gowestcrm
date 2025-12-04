'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Pipeline Categories
const PIPELINES = [
  { id: 'jv', name: 'JV Development', color: '#6B7280' },
  { id: 'development', name: 'Developments', color: '#6B7280' },
  { id: 'listing', name: 'Listings', color: '#6B7280' },
  { id: 'capital', name: 'Capital Partners', color: '#6B7280' },
  { id: 'dispo', name: 'Dispo', color: '#6B7280' },
];

const MARKETING_PIPELINES = [
  { id: 'google_ppc', name: 'Google PPC', color: '#6B7280' },
  { id: 'google_ppc_dispo', name: 'Google PPC Dispo', color: '#6B7280' },
  { id: 'facebook', name: 'Facebook', color: '#6B7280' },
  { id: 'facebook_dispo', name: 'Facebook Dispo', color: '#6B7280' },
];

const STAGES = ['New', 'Contacted', 'Qualified', 'Negotiating', 'Under Contract', 'Closed', 'Lost'];

export default function BackendPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeSection, setActiveSection] = useState('overview'); // overview, pipeline, marketing, import
  const [activePipeline, setActivePipeline] = useState('jv');
  const [activeMarketing, setActiveMarketing] = useState('google_ppc');
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/');
      return;
    }
    setUser(session.user);
    loadData();
  };

  const loadData = async () => {
    const [leadsRes, tasksRes, usersRes] = await Promise.all([
      supabase.from('leads').select('*').order('created_at', { ascending: false }),
      supabase.from('tasks').select('*').order('due_date', { ascending: true }),
      supabase.from('users').select('*'),
    ]);
    setLeads(leadsRes.data || []);
    setTasks(tasksRes.data || []);
    setUsers(usersRes.data || []);
    setLoading(false);
  };

  const deleteLead = async (leadId) => {
    if (confirm('Delete this lead?')) {
      await supabase.from('leads').delete().eq('id', leadId);
      loadData();
    }
  };

  const deleteSelectedLeads = async () => {
    if (selectedLeads.length === 0) return;
    if (confirm(`Delete ${selectedLeads.length} lead(s)?`)) {
      await supabase.from('leads').delete().in('id', selectedLeads);
      setSelectedLeads([]);
      loadData();
    }
  };

  const getLeadsByPipeline = (pipelineId) => {
    return leads.filter(l => l.pipeline === pipelineId);
  };

  const toggleLeadSelection = (leadId) => {
    setSelectedLeads(prev =>
      prev.includes(leadId) ? prev.filter(id => id !== leadId) : [...prev, leadId]
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex">
      {/* Left Sidebar */}
      <div className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-slate-700">
          <img src="/logo.svg" alt="GoWest" className="h-20 w-auto" />
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          <SidebarItem
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
            label="Overview"
            active={activeSection === 'overview'}
            onClick={() => setActiveSection('overview')}
          />
          <SidebarItem
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" /></svg>}
            label="Add Lead"
            active={activeSection === 'addlead'}
            onClick={() => setActiveSection('addlead')}
          />

          <div className="pt-4 pb-2">
            <div className="text-xs text-slate-500 uppercase tracking-wide px-3">Pipelines</div>
          </div>
          {PIPELINES.map(p => (
            <SidebarItem
              key={p.id}
              icon={<span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />}
              label={p.name}
              count={getLeadsByPipeline(p.id).length}
              active={activeSection === 'pipeline' && activePipeline === p.id}
              onClick={() => { setActiveSection('pipeline'); setActivePipeline(p.id); }}
            />
          ))}

          <div className="pt-4 pb-2">
            <div className="text-xs text-slate-500 uppercase tracking-wide px-3">Marketing Inbound</div>
          </div>
          {MARKETING_PIPELINES.map(p => (
            <SidebarItem
              key={p.id}
              icon={<span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />}
              label={p.name}
              count={getLeadsByPipeline(p.id).length}
              active={activeSection === 'marketing' && activeMarketing === p.id}
              onClick={() => { setActiveSection('marketing'); setActiveMarketing(p.id); }}
            />
          ))}

          <div className="pt-4 pb-2">
            <div className="text-xs text-slate-500 uppercase tracking-wide px-3">Tools</div>
          </div>
          <SidebarItem
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>}
            label="Import Leads"
            active={activeSection === 'import'}
            onClick={() => setActiveSection('import')}
          />
        </nav>

        {/* Back to Map */}
        <div className="p-3 border-t border-slate-700">
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full flex items-center gap-3 px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition"
          >
            <span>←</span>
            <span>Back to Map</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {activeSection === 'overview' && (
          <OverviewSection leads={leads} tasks={tasks} users={users} user={user} onTaskUpdate={loadData} />
        )}

        {activeSection === 'pipeline' && (
          <PipelineSection
            pipeline={PIPELINES.find(p => p.id === activePipeline)}
            leads={getLeadsByPipeline(activePipeline)}
            stages={STAGES}
            selectedLeads={selectedLeads}
            onToggleSelect={toggleLeadSelection}
            onDelete={deleteLead}
            onDeleteSelected={deleteSelectedLeads}
            onUpdate={loadData}
          />
        )}

        {activeSection === 'marketing' && (
          <PipelineSection
            pipeline={MARKETING_PIPELINES.find(p => p.id === activeMarketing)}
            leads={getLeadsByPipeline(activeMarketing)}
            stages={STAGES}
            selectedLeads={selectedLeads}
            onToggleSelect={toggleLeadSelection}
            onDelete={deleteLead}
            onDeleteSelected={deleteSelectedLeads}
            onUpdate={loadData}
          />
        )}

        {activeSection === 'import' && (
          <ImportSection onImport={loadData} />
        )}

        {activeSection === 'addlead' && (
          <AddLeadSection onSave={loadData} />
        )}
      </div>
    </div>
  );
}

function SidebarItem({ icon, label, count, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition ${
        active ? 'bg-rust text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="text-sm">{icon}</span>
        <span className="text-sm">{label}</span>
      </div>
      {count !== undefined && (
        <span className={`text-xs px-2 py-0.5 rounded ${active ? 'bg-white/20' : 'bg-slate-700'}`}>
          {count}
        </span>
      )}
    </button>
  );
}

function OverviewSection({ leads, tasks, users, user, onTaskUpdate }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();
    const days = [];
    for (let i = 0; i < startDayOfWeek; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
    return days;
  };

  const getTasksForDate = (date) => {
    if (!date) return [];
    const dateStr = date.toISOString().split('T')[0];
    return tasks.filter(task => task.due_date === dateStr);
  };

  const formatMonth = (date) => date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const isToday = (date) => date && date.toDateString() === new Date().toDateString();

  const days = getDaysInMonth(currentDate);
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Stats
  const stats = {
    totalLeads: leads.length,
    newLeads: leads.filter(l => l.stage === 'New').length,
    underContract: leads.filter(l => l.stage === 'Under Contract').length,
    closed: leads.filter(l => l.stage === 'Closed').length,
    upcomingTasks: tasks.filter(t => new Date(t.due_date) >= new Date()).length,
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-white mb-6">Overview</h1>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4 mb-8">
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <div className="text-3xl font-bold text-white">{stats.totalLeads}</div>
          <div className="text-sm text-slate-400">Total Leads</div>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <div className="text-3xl font-bold text-green-400">{stats.newLeads}</div>
          <div className="text-sm text-slate-400">New Leads</div>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <div className="text-3xl font-bold text-yellow-400">{stats.underContract}</div>
          <div className="text-sm text-slate-400">Under Contract</div>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <div className="text-3xl font-bold text-rust">{stats.closed}</div>
          <div className="text-sm text-slate-400">Closed</div>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <div className="text-3xl font-bold text-blue-400">{stats.upcomingTasks}</div>
          <div className="text-sm text-slate-400">Upcoming Tasks</div>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50">
        <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
          <button onClick={prevMonth} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition">
            ←
          </button>
          <h2 className="text-lg font-medium text-white">{formatMonth(currentDate)}</h2>
          <button onClick={nextMonth} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition">
            →
          </button>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map(day => (
              <div key={day} className="text-center text-xs text-slate-500 py-2">{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((date, i) => {
              const dayTasks = getTasksForDate(date);
              return (
                <div
                  key={i}
                  className={`min-h-[80px] p-2 rounded-lg ${
                    date ? 'bg-slate-900/50 hover:bg-slate-700/50 cursor-pointer' : ''
                  } ${isToday(date) ? 'ring-2 ring-rust' : ''}`}
                >
                  {date && (
                    <>
                      <div className={`text-sm ${isToday(date) ? 'text-rust font-bold' : 'text-slate-400'}`}>
                        {date.getDate()}
                      </div>
                      {dayTasks.slice(0, 2).map(task => (
                        <div key={task.id} className="mt-1 text-xs bg-rust/20 text-rust px-1 py-0.5 rounded truncate">
                          {task.title}
                        </div>
                      ))}
                      {dayTasks.length > 2 && (
                        <div className="mt-1 text-xs text-slate-500">+{dayTasks.length - 2} more</div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function PipelineSection({ pipeline, leads, stages, selectedLeads, onToggleSelect, onDelete, onDeleteSelected, onUpdate }) {
  const [viewMode, setViewMode] = useState('kanban'); // kanban or list

  const getLeadsByStage = (stage) => leads.filter(l => l.stage === stage);

  const selectAll = () => {
    if (selectedLeads.length === leads.length) {
      leads.forEach(l => onToggleSelect(l.id));
    } else {
      leads.forEach(l => {
        if (!selectedLeads.includes(l.id)) onToggleSelect(l.id);
      });
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-700 bg-slate-800/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: pipeline?.color }} />
            <h1 className="text-xl font-semibold text-white">{pipeline?.name}</h1>
            <span className="text-slate-400">({leads.length} leads)</span>
          </div>
          <div className="flex items-center gap-2">
            {selectedLeads.length > 0 && (
              <button
                onClick={onDeleteSelected}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm transition"
              >
                Delete ({selectedLeads.length})
              </button>
            )}
            <button
              onClick={() => setViewMode(viewMode === 'kanban' ? 'list' : 'kanban')}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition"
            >
              {viewMode === 'kanban' ? 'List View' : 'Kanban View'}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'kanban' ? (
        <div className="flex-1 overflow-x-auto p-4">
          <div className="flex gap-4 h-full min-w-max">
            {stages.map(stage => (
              <div key={stage} className="w-72 flex flex-col bg-slate-800/30 rounded-xl">
                <div className="p-3 border-b border-slate-700/50">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-white">{stage}</span>
                    <span className="text-xs bg-slate-700 px-2 py-0.5 rounded text-slate-300">
                      {getLeadsByStage(stage).length}
                    </span>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {getLeadsByStage(stage).map(lead => (
                    <LeadCard
                      key={lead.id}
                      lead={lead}
                      isSelected={selectedLeads.includes(lead.id)}
                      onToggleSelect={() => onToggleSelect(lead.id)}
                      onDelete={() => onDelete(lead.id)}
                      compact
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto p-4">
          <div className="mb-3">
            <label className="flex items-center gap-2 text-slate-400 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={selectedLeads.length === leads.length && leads.length > 0}
                onChange={selectAll}
                className="rounded border-slate-600 bg-slate-800 text-rust"
              />
              Select All ({leads.length})
            </label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {leads.map(lead => (
              <LeadCard
                key={lead.id}
                lead={lead}
                isSelected={selectedLeads.includes(lead.id)}
                onToggleSelect={() => onToggleSelect(lead.id)}
                onDelete={() => onDelete(lead.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LeadCard({ lead, isSelected, onToggleSelect, onDelete, compact }) {
  return (
    <div className={`bg-slate-800/50 rounded-lg border transition ${
      isSelected ? 'border-rust ring-1 ring-rust' : 'border-slate-700/50 hover:border-slate-600'
    } ${compact ? 'p-3' : 'p-4'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            className="mt-1 rounded border-slate-600 bg-slate-800 text-rust"
          />
          <div className="min-w-0">
            <div className="font-medium text-white truncate">{lead.name || 'Unknown'}</div>
            <div className="text-xs text-slate-400 truncate">{lead.address || lead.city || 'No location'}</div>
            {lead.acreage > 0 && (
              <div className="text-xs text-rust mt-1">{lead.acreage} acres</div>
            )}
          </div>
        </div>
        <button
          onClick={onDelete}
          className="p-1 text-slate-500 hover:text-red-400 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
      {!compact && (
        <div className="mt-3 pt-3 border-t border-slate-700/50 flex items-center gap-2 text-xs text-slate-400">
          {lead.phone && <span>{lead.phone}</span>}
          {lead.email && <span className="truncate">{lead.email}</span>}
        </div>
      )}
    </div>
  );
}

function AddLeadSection({ onSave }) {
  const [formData, setFormData] = useState({
    name: '', address: '', city: '', state: 'TX', county: '',
    acreage: '', phone: '', email: '', pipeline: 'listing', stage: 'New',
    lat: null, lng: null, boundary: null,
    parcel_number: '', contact_name: '', notes: '',
    has_home: false, is_listed: false,
    is_agent_lead: false, agent_name: '', agent_phone: '', agent_email: '',
  });
  const [kmlFileName, setKmlFileName] = useState('');
  const [saving, setSaving] = useState(false);

  const allPipelines = [...PIPELINES, ...MARKETING_PIPELINES];

  const parseKML = (kmlText) => {
    const parser = new DOMParser();
    const kml = parser.parseFromString(kmlText, 'text/xml');
    const coords = kml.querySelector('coordinates');
    if (coords) {
      const coordText = coords.textContent.trim();
      const points = coordText.split(/\s+/).map(p => {
        const [lng, lat] = p.split(',').map(Number);
        return [lng, lat];
      }).filter(p => !isNaN(p[0]) && !isNaN(p[1]));
      if (points.length > 0) {
        const centerLat = points.reduce((sum, p) => sum + p[1], 0) / points.length;
        const centerLng = points.reduce((sum, p) => sum + p[0], 0) / points.length;
        return {
          lat: centerLat,
          lng: centerLng,
          boundary: { type: 'Polygon', coordinates: [points.map(p => [p[0], p[1]])] }
        };
      }
    }
    return null;
  };

  const handleKMLUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setKmlFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = parseKML(event.target.result);
      if (result) {
        setFormData(prev => ({
          ...prev,
          lat: result.lat,
          lng: result.lng,
          boundary: JSON.stringify(result.boundary)
        }));
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name && !formData.address) {
      alert('Please enter owner name or property address');
      return;
    }
    setSaving(true);

    const leadData = {
      ...formData,
      acreage: formData.acreage ? parseFloat(formData.acreage) : null,
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('leads').insert([leadData]);
    if (error) {
      alert('Error: ' + error.message);
    } else {
      // Reset form
      setFormData({
        name: '', address: '', city: '', state: 'TX', county: '',
        acreage: '', phone: '', email: '', pipeline: 'listing', stage: 'New',
        lat: null, lng: null, boundary: null,
        parcel_number: '', contact_name: '', notes: '',
        has_home: false, is_listed: false,
        is_agent_lead: false, agent_name: '', agent_phone: '', agent_email: '',
      });
      setKmlFileName('');
      onSave();
      alert('Lead added successfully');
    }
    setSaving(false);
  };

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-semibold text-white mb-6">Add Lead</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Property Information */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
          <h2 className="text-lg font-medium text-white mb-4">Property Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-400 block mb-1">Owner Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                placeholder="John Smith"
              />
            </div>
            <div>
              <label className="text-sm text-slate-400 block mb-1">Property Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                placeholder="123 Main St"
              />
            </div>
            <div>
              <label className="text-sm text-slate-400 block mb-1">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({...formData, city: e.target.value})}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-slate-400 block mb-1">State</label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData({...formData, state: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-slate-400 block mb-1">County</label>
                <input
                  type="text"
                  value={formData.county}
                  onChange={(e) => setFormData({...formData, county: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-slate-400 block mb-1">Parcel #</label>
              <input
                type="text"
                value={formData.parcel_number}
                onChange={(e) => setFormData({...formData, parcel_number: e.target.value})}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="text-sm text-slate-400 block mb-1">Acreage</label>
              <input
                type="number"
                step="0.01"
                value={formData.acreage}
                onChange={(e) => setFormData({...formData, acreage: e.target.value})}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
              />
            </div>
            <div className="col-span-2 flex gap-6">
              <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.has_home}
                  onChange={(e) => setFormData({...formData, has_home: e.target.checked})}
                  className="rounded border-slate-600 bg-slate-800 text-rust"
                />
                Has Home
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_listed}
                  onChange={(e) => setFormData({...formData, is_listed: e.target.checked})}
                  className="rounded border-slate-600 bg-slate-800 text-rust"
                />
                Currently Listed
              </label>
            </div>
          </div>
        </div>

        {/* KML Upload */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
          <h2 className="text-lg font-medium text-white mb-4">Parcel Boundary (KML)</h2>
          <div>
            <input
              type="file"
              accept=".kml"
              onChange={handleKMLUpload}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-rust file:text-white file:cursor-pointer"
            />
            {kmlFileName && (
              <div className="mt-2 text-sm text-green-400">Loaded: {kmlFileName}</div>
            )}
            {formData.lat && formData.lng && (
              <div className="mt-2 text-xs text-slate-400">
                Coordinates: {formData.lat.toFixed(6)}, {formData.lng.toFixed(6)}
              </div>
            )}
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
          <h2 className="text-lg font-medium text-white mb-4">Contact Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-400 block mb-1">Contact Name</label>
              <input
                type="text"
                value={formData.contact_name}
                onChange={(e) => setFormData({...formData, contact_name: e.target.value})}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="text-sm text-slate-400 block mb-1">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
              />
            </div>
            <div className="col-span-2">
              <label className="text-sm text-slate-400 block mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
              />
            </div>
            <div className="col-span-2">
              <label className="text-sm text-slate-400 block mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white h-24"
              />
            </div>
          </div>
        </div>

        {/* Agent Lead */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
          <label className="flex items-center gap-3 mb-4 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.is_agent_lead}
              onChange={(e) => setFormData({...formData, is_agent_lead: e.target.checked})}
              className="rounded border-slate-600 bg-slate-800 text-rust w-5 h-5"
            />
            <span className="text-lg font-medium text-white">Agent Lead</span>
          </label>
          {formData.is_agent_lead && (
            <div className="grid grid-cols-3 gap-4 pt-2">
              <div>
                <label className="text-sm text-slate-400 block mb-1">Agent Name</label>
                <input
                  type="text"
                  value={formData.agent_name}
                  onChange={(e) => setFormData({...formData, agent_name: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-slate-400 block mb-1">Agent Phone</label>
                <input
                  type="tel"
                  value={formData.agent_phone}
                  onChange={(e) => setFormData({...formData, agent_phone: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-slate-400 block mb-1">Agent Email</label>
                <input
                  type="email"
                  value={formData.agent_email}
                  onChange={(e) => setFormData({...formData, agent_email: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>
            </div>
          )}
        </div>

        {/* Pipeline Assignment */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
          <h2 className="text-lg font-medium text-white mb-4">Pipeline Assignment</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-400 block mb-1">Pipeline</label>
              <select
                value={formData.pipeline}
                onChange={(e) => setFormData({...formData, pipeline: e.target.value})}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
              >
                <optgroup label="Pipelines">
                  {PIPELINES.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </optgroup>
                <optgroup label="Marketing Inbound">
                  {MARKETING_PIPELINES.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </optgroup>
              </select>
            </div>
            <div>
              <label className="text-sm text-slate-400 block mb-1">Stage</label>
              <select
                value={formData.stage}
                onChange={(e) => setFormData({...formData, stage: e.target.value})}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
              >
                {STAGES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 bg-rust hover:bg-rust/80 disabled:bg-slate-700 text-white rounded-lg font-medium transition"
        >
          {saving ? 'Saving...' : 'Add Lead'}
        </button>
      </form>
    </div>
  );
}

function ImportSection({ onImport }) {
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [targetPipeline, setTargetPipeline] = useState('listing');

  const allPipelines = [
    ...PIPELINES,
    ...MARKETING_PIPELINES,
  ];

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);

    const Papa = (await import('papaparse')).default;
    Papa.parse(file, {
      header: true,
      complete: async (results) => {
        const importedLeads = results.data
          .filter(row => row.name || row.address || row.owner_name || row.property_address)
          .map(row => ({
            name: row.name || row.owner_name || '',
            address: row.address || row.property_address || '',
            city: row.city || '',
            state: row.state || 'TX',
            county: row.county || '',
            acreage: parseFloat(row.acreage || row.acres || 0),
            phone: row.phone || '',
            email: row.email || '',
            pipeline: targetPipeline,
            stage: 'New',
            lat: parseFloat(row.lat || row.latitude || 0) || null,
            lng: parseFloat(row.lng || row.longitude || row.lon || 0) || null,
            created_at: new Date().toISOString(),
          }));

        if (importedLeads.length > 0) {
          const { error } = await supabase.from('leads').insert(importedLeads);
          if (!error) {
            alert(`Imported ${importedLeads.length} leads!`);
            setFile(null);
            onImport();
          } else {
            alert('Error: ' + error.message);
          }
        } else {
          alert('No valid leads found');
        }
        setImporting(false);
      }
    });
  };

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-semibold text-white mb-6">Import Leads</h1>

      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6 space-y-6">
        {/* Target Pipeline */}
        <div>
          <label className="text-sm text-slate-400 block mb-2">Import to Pipeline</label>
          <select
            value={targetPipeline}
            onChange={(e) => setTargetPipeline(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
          >
            <optgroup label="Pipelines">
              {PIPELINES.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </optgroup>
            <optgroup label="Marketing Inbound">
              {MARKETING_PIPELINES.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </optgroup>
          </select>
        </div>

        {/* File Upload */}
        <div>
          <label className="text-sm text-slate-400 block mb-2">CSV File</label>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setFile(e.target.files[0])}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-rust file:text-white file:cursor-pointer"
          />
        </div>

        <div className="text-xs text-slate-500">
          CSV columns: name, address, city, state, county, acreage, phone, email, lat, lng
        </div>

        <button
          onClick={handleImport}
          disabled={!file || importing}
          className="w-full py-3 bg-rust hover:bg-rust/80 disabled:bg-slate-700 text-white rounded-lg font-medium transition"
        >
          {importing ? 'Importing...' : 'Import Leads'}
        </button>
      </div>
    </div>
  );
}
