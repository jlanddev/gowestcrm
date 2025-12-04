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
  { id: 'jv', name: 'JV Development', color: '#8B5CF6' },
  { id: 'development', name: 'Developments', color: '#3B82F6' },
  { id: 'listing', name: 'Listings', color: '#22C55E' },
  { id: 'dispo', name: 'Dispo', color: '#EF4444' },
];

const MARKETING_PIPELINES = [
  { id: 'google_ppc', name: 'Google PPC', color: '#F59E0B' },
  { id: 'google_ppc_dispo', name: 'Google PPC Dispo', color: '#D97706' },
  { id: 'facebook', name: 'Facebook', color: '#3B82F6' },
  { id: 'facebook_dispo', name: 'Facebook Dispo', color: '#2563EB' },
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
        <div className="p-4 border-b border-slate-700">
          <img src="/logo.svg" alt="GoWest" className="h-10" />
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          <SidebarItem
            icon="📊"
            label="Overview"
            active={activeSection === 'overview'}
            onClick={() => setActiveSection('overview')}
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
            icon="📥"
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
