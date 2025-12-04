'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';

const LeadsMap = dynamic(() => import('@/components/LeadsMap'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-gray-900 animate-pulse" />
});

// Land pipelines for map view (excludes Capital Partners which is backend-only)
const PIPELINES = [
  { id: 'jv', name: 'JV Development', color: '#8B5CF6' },
  { id: 'development', name: 'Developments', color: '#3B82F6' },
  { id: 'listing', name: 'Listing Leads', color: '#22C55E' },
  { id: 'dispo', name: 'Dispo Leads', color: '#EF4444' },
];

const STAGES = ['New', 'Contacted', 'Qualified', 'Negotiating', 'Under Contract', 'Closed', 'Lost'];

// SVG Icons
const Icons = {
  map: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
    </svg>
  ),
  pipeline: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
    </svg>
  ),
  leads: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  settings: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  calendar: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  tasks: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  ),
  upload: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  ),
  plus: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
    </svg>
  ),
  close: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  logout: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  ),
  grid: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  ),
  chevronLeft: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
    </svg>
  ),
  chevronRight: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
    </svg>
  ),
  user: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  trash: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  check: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  location: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
};

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('map');
  const [showBackend, setShowBackend] = useState(false);
  const [backendView, setBackendView] = useState('calendar');
  const [activePipeline, setActivePipeline] = useState('all');
  const [leads, setLeads] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
    loadData();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/');
      return;
    }
    setUser(session.user);
    setLoading(false);
  };

  const loadData = async () => {
    const { data: leadsData } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });
    setLeads(leadsData || []);

    const { data: usersData } = await supabase.from('users').select('*');
    setUsers(usersData || []);

    const { data: tasksData } = await supabase
      .from('tasks')
      .select('*')
      .order('due_date', { ascending: true });
    setTasks(tasksData || []);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const updateLeadStage = async (leadId, newStage) => {
    await supabase.from('leads').update({ stage: newStage }).eq('id', leadId);
    loadData();
  };

  const updateLeadPipeline = async (leadId, newPipeline) => {
    await supabase.from('leads').update({ pipeline: newPipeline }).eq('id', leadId);
    loadData();
  };

  const deleteLead = async (leadId) => {
    if (confirm('Are you sure you want to delete this lead?')) {
      await supabase.from('leads').delete().eq('id', leadId);
      setSelectedLead(null);
      loadData();
    }
  };

  const filteredLeads = activePipeline === 'all'
    ? leads
    : leads.filter(l => l.pipeline === activePipeline);

  if (loading) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-navy flex overflow-hidden">
      {/* Sidebar - hide on map view */}
      {(activeView !== 'map' || showBackend) && (
      <div className={`bg-navy border-r border-white/10 flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-64'}`}>
        {/* Logo */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          {!sidebarCollapsed && (
            <img src="/logo.svg" alt="GoWest" className="h-14 w-auto" />
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition"
          >
            {sidebarCollapsed ? Icons.chevronRight : Icons.chevronLeft}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          <NavItem
            icon={Icons.map}
            label="Map"
            active={activeView === 'map' && !showBackend}
            collapsed={sidebarCollapsed}
            onClick={() => { setActiveView('map'); setShowBackend(false); }}
          />
          <NavItem
            icon={Icons.pipeline}
            label="Pipelines"
            active={activeView === 'pipelines' && !showBackend}
            collapsed={sidebarCollapsed}
            onClick={() => { setActiveView('pipelines'); setShowBackend(false); }}
          />
          <NavItem
            icon={Icons.leads}
            label="All Leads"
            active={activeView === 'leads' && !showBackend}
            collapsed={sidebarCollapsed}
            onClick={() => { setActiveView('leads'); setShowBackend(false); }}
          />

          <div className="pt-4 mt-4 border-t border-white/10">
            <NavItem
              icon={Icons.grid}
              label="Backend"
              active={false}
              collapsed={sidebarCollapsed}
              onClick={() => router.push('/backend')}
            />
            <NavItem
              icon={Icons.calendar}
              label="Calendar"
              active={showBackend && backendView === 'calendar'}
              collapsed={sidebarCollapsed}
              onClick={() => { setShowBackend(true); setBackendView('calendar'); }}
            />
            <NavItem
              icon={Icons.tasks}
              label="Tasks"
              active={showBackend && backendView === 'tasks'}
              collapsed={sidebarCollapsed}
              onClick={() => { setShowBackend(true); setBackendView('tasks'); }}
            />
          </div>
        </nav>

        {/* User */}
        <div className="p-3 border-t border-white/10">
          <NavItem
            icon={Icons.logout}
            label="Sign Out"
            collapsed={sidebarCollapsed}
            onClick={handleSignOut}
          />
        </div>
      </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header - only show when not on map view */}
        {(activeView !== 'map' || showBackend) && (
          <header className="bg-white/5 backdrop-blur border-b border-white/10 px-6 py-3 flex justify-between items-center">
            <div className="flex items-center gap-4">
              {activeView !== 'map' && !showBackend && (
                <h1 className="text-xl font-medium text-white tracking-wide">
                  {activeView === 'pipelines' ? 'Pipelines' : 'All Leads'}
                </h1>
              )}
              {showBackend && (
                <h1 className="text-xl font-medium text-white tracking-wide">
                  {backendView === 'calendar' ? 'Calendar' : backendView === 'tasks' ? 'Tasks' : 'Backend'}
                </h1>
              )}
              <span className="text-white/40 text-sm">{leads.length} {leads.length === 1 ? 'lead' : 'leads'}</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowAddLeadModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-rust hover:bg-rust/80 text-white rounded-lg text-sm transition"
              >
                {Icons.plus}
                <span>Add Lead</span>
              </button>
            </div>
          </header>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          {!showBackend && activeView === 'map' && (
            <LeadsMap
              leads={leads}
              onSelectLead={setSelectedLead}
              pipelines={PIPELINES}
              onGoToBackend={() => router.push('/backend')}
              onLeadUpdate={loadData}
            />
          )}

          {!showBackend && activeView === 'pipelines' && (
            <div className="h-full overflow-auto p-6 bg-gray-900">
              {/* Pipeline Tabs */}
              <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                <button
                  onClick={() => setActivePipeline('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                    activePipeline === 'all'
                      ? 'bg-white text-navy'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  All ({leads.length})
                </button>
                {PIPELINES.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setActivePipeline(p.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition flex items-center gap-2 ${
                      activePipeline === p.id
                        ? 'bg-white text-navy'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                    {p.name} ({leads.filter(l => l.pipeline === p.id).length})
                  </button>
                ))}
              </div>

              {/* Kanban Board */}
              <div className="flex gap-4 overflow-x-auto pb-4">
                {STAGES.map(stage => (
                  <div key={stage} className="flex-shrink-0 w-72">
                    <div className="bg-white/10 rounded-t-lg px-4 py-3 font-medium text-white flex justify-between items-center">
                      <span>{stage}</span>
                      <span className="text-white/60 text-sm">{filteredLeads.filter(l => l.stage === stage).length}</span>
                    </div>
                    <div className="bg-white/5 rounded-b-lg p-2 min-h-[500px] space-y-2">
                      {filteredLeads.filter(l => l.stage === stage).map(lead => (
                        <div
                          key={lead.id}
                          onClick={() => setSelectedLead(lead)}
                          className="bg-white rounded-lg p-3 cursor-pointer hover:shadow-lg transition group"
                        >
                          <div className="font-medium text-gray-900 truncate">{lead.name || 'Unknown'}</div>
                          <div className="text-sm text-gray-500 truncate">{lead.address}</div>
                          {lead.acreage > 0 && (
                            <div className="text-xs text-gray-400 mt-1">{lead.acreage} acres</div>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <span
                              className="text-xs px-2 py-0.5 rounded text-white"
                              style={{ backgroundColor: PIPELINES.find(p => p.id === lead.pipeline)?.color || '#666' }}
                            >
                              {PIPELINES.find(p => p.id === lead.pipeline)?.name || lead.pipeline}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!showBackend && activeView === 'leads' && (
            <LeadsTable leads={leads} onSelectLead={setSelectedLead} pipelines={PIPELINES} />
          )}

          {showBackend && backendView === 'calendar' && (
            <CalendarView
              tasks={tasks}
              users={users}
              leads={leads}
              currentUser={user}
              onTaskCreate={loadData}
            />
          )}

          {showBackend && backendView === 'tasks' && (
            <TasksView
              tasks={tasks}
              users={users}
              leads={leads}
              currentUser={user}
              onTaskUpdate={loadData}
            />
          )}
        </div>
      </div>

      {/* Lead Detail Slide-out - only show when NOT in map view */}
      {selectedLead && activeView !== 'map' && (
        <LeadDetailPanel
          lead={selectedLead}
          pipelines={PIPELINES}
          stages={STAGES}
          onClose={() => setSelectedLead(null)}
          onUpdatePipeline={updateLeadPipeline}
          onUpdateStage={updateLeadStage}
          onDelete={deleteLead}
        />
      )}

      {/* Add Lead Modal */}
      {showAddLeadModal && (
        <AddLeadModal
          pipelines={PIPELINES}
          stages={STAGES}
          onClose={() => setShowAddLeadModal(false)}
          onSave={() => { loadData(); setShowAddLeadModal(false); }}
        />
      )}
    </div>
  );
}

function NavItem({ icon, label, active, collapsed, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition ${
        active
          ? 'bg-rust text-white'
          : 'text-white/60 hover:text-white hover:bg-white/10'
      }`}
      title={collapsed ? label : undefined}
    >
      {icon}
      {!collapsed && <span className="text-sm font-medium">{label}</span>}
    </button>
  );
}

function Modal({ children, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-navy border border-white/20 rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function LeadsTable({ leads, onSelectLead, pipelines }) {
  return (
    <div className="h-full overflow-auto bg-gray-900 p-6">
      <div className="bg-white/5 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left p-4 text-white/60 text-sm font-medium">Name</th>
              <th className="text-left p-4 text-white/60 text-sm font-medium">Address</th>
              <th className="text-left p-4 text-white/60 text-sm font-medium">Acreage</th>
              <th className="text-left p-4 text-white/60 text-sm font-medium">Pipeline</th>
              <th className="text-left p-4 text-white/60 text-sm font-medium">Stage</th>
            </tr>
          </thead>
          <tbody>
            {leads.map(lead => (
              <tr
                key={lead.id}
                onClick={() => onSelectLead(lead)}
                className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition"
              >
                <td className="p-4 text-white">{lead.name || 'Unknown'}</td>
                <td className="p-4 text-white/70">{lead.address}, {lead.city}</td>
                <td className="p-4 text-white/70">{lead.acreage || '-'}</td>
                <td className="p-4">
                  <span
                    className="text-xs px-2 py-1 rounded text-white"
                    style={{ backgroundColor: pipelines.find(p => p.id === lead.pipeline)?.color || '#666' }}
                  >
                    {pipelines.find(p => p.id === lead.pipeline)?.name || lead.pipeline}
                  </span>
                </td>
                <td className="p-4 text-white/70">{lead.stage}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LeadDetailPanel({ lead, pipelines, stages, onClose, onUpdatePipeline, onUpdateStage, onDelete }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose}>
      <div
        className="absolute right-0 top-0 bottom-0 w-96 bg-navy border-l border-white/20 shadow-xl overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-xl font-semibold text-white">{lead.name || 'Lead Details'}</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onDelete(lead.id)}
                className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition"
                title="Delete Lead"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
              <button onClick={onClose} className="text-white/40 hover:text-white transition">
                {Icons.close}
              </button>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <label className="text-sm text-white/40 block mb-1">Address</label>
              <p className="text-white">{lead.address}</p>
              <p className="text-white/60 text-sm">{lead.city}, {lead.state}</p>
            </div>

            {lead.acreage > 0 && (
              <div>
                <label className="text-sm text-white/40 block mb-1">Acreage</label>
                <p className="text-white">{lead.acreage} acres</p>
              </div>
            )}

            {lead.phone && (
              <div>
                <label className="text-sm text-white/40 block mb-1">Phone</label>
                <p className="text-white">{lead.phone}</p>
              </div>
            )}

            {lead.email && (
              <div>
                <label className="text-sm text-white/40 block mb-1">Email</label>
                <p className="text-white">{lead.email}</p>
              </div>
            )}

            <div>
              <label className="text-sm text-white/40 block mb-2">Pipeline</label>
              <select
                value={lead.pipeline}
                onChange={(e) => onUpdatePipeline(lead.id, e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
              >
                {pipelines.map(p => (
                  <option key={p.id} value={p.id} className="bg-navy">{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm text-white/40 block mb-2">Stage</label>
              <select
                value={lead.stage}
                onChange={(e) => onUpdateStage(lead.id, e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
              >
                {stages.map(s => (
                  <option key={s} value={s} className="bg-navy">{s}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddLeadModal({ pipelines, stages, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: '', address: '', city: '', state: 'TX', county: '',
    acreage: '', phone: '', email: '', pipeline: 'listing', stage: 'New',
    lat: null, lng: null, boundary: null,
    parcel_number: '', contact_name: '', notes: '',
    has_home: false, is_listed: false,
    is_agent_lead: false, agent_name: '', agent_phone: '', agent_email: '',
  });
  const [kmlFileName, setKmlFileName] = useState('');

  const parseKML = (kmlText) => {
    const parser = new DOMParser();
    const kml = parser.parseFromString(kmlText, 'text/xml');

    // Try to find coordinates in Polygon or LineString
    const coordsElement = kml.querySelector('coordinates');
    if (!coordsElement) return null;

    const coordsText = coordsElement.textContent.trim();
    const coords = coordsText.split(/\s+/).map(coord => {
      const [lng, lat] = coord.split(',').map(Number);
      return [lng, lat];
    }).filter(c => !isNaN(c[0]) && !isNaN(c[1]));

    if (coords.length === 0) return null;

    // Calculate center point
    const lats = coords.map(c => c[1]);
    const lngs = coords.map(c => c[0]);
    const centerLat = lats.reduce((a, b) => a + b, 0) / lats.length;
    const centerLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;

    // Create GeoJSON polygon
    const boundary = {
      type: 'Polygon',
      coordinates: [coords]
    };

    // Try to get name from KML
    const nameEl = kml.querySelector('name');
    const name = nameEl ? nameEl.textContent : '';

    return { lat: centerLat, lng: centerLng, boundary, name };
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
          boundary: result.boundary,
          name: prev.name || result.name,
        }));
      } else {
        alert('Could not parse KML file. Make sure it contains polygon coordinates.');
      }
    };
    reader.readAsText(file);
  };

  const [validationError, setValidationError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');

    // Validation - require at least name OR address
    if (!formData.name?.trim() && !formData.address?.trim()) {
      setValidationError('Please enter at least a name or address for the lead.');
      return;
    }

    // Insert the lead
    const { error } = await supabase.from('leads').insert([{
      ...formData,
      acreage: parseFloat(formData.acreage) || 0,
      boundary: formData.boundary ? JSON.stringify(formData.boundary) : null,
      created_at: new Date().toISOString(),
    }]);

    // If agent lead, also add agent to agent pipeline
    if (!error && formData.is_agent_lead && formData.agent_name) {
      await supabase.from('leads').insert([{
        name: formData.agent_name,
        phone: formData.agent_phone,
        email: formData.agent_email,
        pipeline: 'capital', // Agent pipeline
        stage: 'New',
        notes: `Agent for lead: ${formData.name || formData.address}`,
        created_at: new Date().toISOString(),
      }]);
    }

    if (!error) onSave();
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-navy border border-white/20 rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-semibold text-white mb-6">Add New Lead</h2>
        {validationError && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
            {validationError}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* KML Upload */}
          <div className="col-span-2 mb-4">
            <label className="text-sm text-white/60 block mb-2">Import Parcel (KML)</label>
            <div className="relative">
              <input
                type="file"
                accept=".kml,.kmz"
                onChange={handleKMLUpload}
                className="hidden"
                id="kml-upload"
              />
              <label
                htmlFor="kml-upload"
                className={`flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed rounded-lg cursor-pointer transition ${
                  kmlFileName
                    ? 'border-rust bg-rust/10 text-rust'
                    : 'border-white/20 hover:border-rust text-white/40 hover:text-rust'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                {kmlFileName ? kmlFileName : 'Upload KML File'}
              </label>
            </div>
            {formData.lat && formData.lng && (
              <div className="mt-2 text-xs text-green-400 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Parcel loaded: {formData.lat.toFixed(4)}, {formData.lng.toFixed(4)}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Property Info Section */}
            <div className="col-span-2 text-xs text-rust font-semibold uppercase tracking-wide pt-2">Property Info</div>
            <div className="col-span-2">
              <label className="text-sm text-white/60 block mb-1">Owner Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/30"
                placeholder="Property Owner"
              />
            </div>
            <div className="col-span-2">
              <label className="text-sm text-white/60 block mb-1">Property Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={e => setFormData({...formData, address: e.target.value})}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/30"
                placeholder="123 Main St"
              />
            </div>
            <div>
              <label className="text-sm text-white/60 block mb-1">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={e => setFormData({...formData, city: e.target.value})}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/30"
              />
            </div>
            <div>
              <label className="text-sm text-white/60 block mb-1">State</label>
              <input
                type="text"
                value={formData.state}
                onChange={e => setFormData({...formData, state: e.target.value})}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/30"
              />
            </div>
            <div>
              <label className="text-sm text-white/60 block mb-1">County</label>
              <input
                type="text"
                value={formData.county}
                onChange={e => setFormData({...formData, county: e.target.value})}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/30"
              />
            </div>
            <div>
              <label className="text-sm text-white/60 block mb-1">Parcel #</label>
              <input
                type="text"
                value={formData.parcel_number}
                onChange={e => setFormData({...formData, parcel_number: e.target.value})}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/30"
              />
            </div>
            <div>
              <label className="text-sm text-white/60 block mb-1">Acreage</label>
              <input
                type="number"
                value={formData.acreage}
                onChange={e => setFormData({...formData, acreage: e.target.value})}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/30"
              />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.has_home}
                  onChange={e => setFormData({...formData, has_home: e.target.checked})}
                  className="rounded border-white/20 bg-white/10 text-rust focus:ring-rust"
                />
                <span className="text-sm text-white/60">Has Home</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_listed}
                  onChange={e => setFormData({...formData, is_listed: e.target.checked})}
                  className="rounded border-white/20 bg-white/10 text-rust focus:ring-rust"
                />
                <span className="text-sm text-white/60">Listed</span>
              </label>
            </div>

            {/* Contact Info Section */}
            <div className="col-span-2 text-xs text-rust font-semibold uppercase tracking-wide pt-4 border-t border-white/10 mt-2">Contact Info</div>
            <div className="col-span-2">
              <label className="text-sm text-white/60 block mb-1">Contact Name</label>
              <input
                type="text"
                value={formData.contact_name}
                onChange={e => setFormData({...formData, contact_name: e.target.value})}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/30"
                placeholder="If different from owner"
              />
            </div>
            <div>
              <label className="text-sm text-white/60 block mb-1">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/30"
              />
            </div>
            <div>
              <label className="text-sm text-white/60 block mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/30"
              />
            </div>
            <div className="col-span-2">
              <label className="text-sm text-white/60 block mb-1">Notes / Issue Description</label>
              <textarea
                value={formData.notes}
                onChange={e => setFormData({...formData, notes: e.target.value})}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/30 h-20 resize-none"
                placeholder="Add any notes..."
              />
            </div>

            {/* Agent Lead Section */}
            <div className="col-span-2 pt-4 border-t border-white/10 mt-2">
              <label className="flex items-center gap-3 cursor-pointer p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <input
                  type="checkbox"
                  checked={formData.is_agent_lead}
                  onChange={e => setFormData({...formData, is_agent_lead: e.target.checked})}
                  className="rounded border-yellow-500/50 bg-white/10 text-yellow-500 focus:ring-yellow-500"
                />
                <div>
                  <span className="text-sm text-yellow-400 font-medium">Agent Lead</span>
                  <p className="text-xs text-white/40">Check if this lead came from an agent</p>
                </div>
              </label>
            </div>
            {formData.is_agent_lead && (
              <>
                <div className="col-span-2">
                  <label className="text-sm text-white/60 block mb-1">Agent Name</label>
                  <input
                    type="text"
                    value={formData.agent_name}
                    onChange={e => setFormData({...formData, agent_name: e.target.value})}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/30"
                    placeholder="Agent's full name"
                  />
                </div>
                <div>
                  <label className="text-sm text-white/60 block mb-1">Agent Phone</label>
                  <input
                    type="tel"
                    value={formData.agent_phone}
                    onChange={e => setFormData({...formData, agent_phone: e.target.value})}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/30"
                  />
                </div>
                <div>
                  <label className="text-sm text-white/60 block mb-1">Agent Email</label>
                  <input
                    type="email"
                    value={formData.agent_email}
                    onChange={e => setFormData({...formData, agent_email: e.target.value})}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/30"
                  />
                </div>
              </>
            )}

            {/* Pipeline & Stage Section */}
            <div className="col-span-2 text-xs text-rust font-semibold uppercase tracking-wide pt-4 border-t border-white/10 mt-2">Pipeline</div>
            <div>
              <label className="text-sm text-white/60 block mb-1">Pipeline</label>
              <select
                value={formData.pipeline}
                onChange={e => setFormData({...formData, pipeline: e.target.value})}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
              >
                {pipelines.map(p => (
                  <option key={p.id} value={p.id} className="bg-navy">{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-white/60 block mb-1">Stage</label>
              <select
                value={formData.stage}
                onChange={e => setFormData({...formData, stage: e.target.value})}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
              >
                {stages.map(s => (
                  <option key={s} value={s} className="bg-navy">{s}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-white/60 hover:text-white transition">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 bg-rust hover:bg-rust/80 text-white rounded-lg transition">
              Add Lead
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CalendarView({ tasks, users, leads, currentUser, onTaskCreate }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);

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

  const handleDayClick = (date) => {
    if (date) {
      setSelectedDate(date);
      setShowTaskModal(true);
    }
  };

  const days = getDaysInMonth(currentDate);
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="h-full overflow-auto bg-gray-900 p-6">
      <div className="bg-white/5 rounded-xl border border-white/10">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-4">
            <button onClick={prevMonth} className="p-2 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition">
              {Icons.chevronLeft}
            </button>
            <h2 className="text-lg font-medium text-white">{formatMonth(currentDate)}</h2>
            <button onClick={nextMonth} className="p-2 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition">
              {Icons.chevronRight}
            </button>
          </div>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-4 py-2 text-sm bg-white/10 hover:bg-white/20 text-white rounded-lg transition"
          >
            Today
          </button>
        </div>

        <div className="grid grid-cols-7 border-b border-white/10">
          {weekDays.map(day => (
            <div key={day} className="p-3 text-center text-sm font-medium text-white/40">{day}</div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {days.map((date, index) => {
            const dayTasks = getTasksForDate(date);
            return (
              <div
                key={index}
                onClick={() => handleDayClick(date)}
                className={`min-h-[100px] border-b border-r border-white/5 p-2 cursor-pointer hover:bg-white/5 transition ${
                  !date ? 'bg-white/[0.02]' : ''
                } ${isToday(date) ? 'bg-rust/20' : ''}`}
              >
                {date && (
                  <>
                    <div className={`text-sm font-medium mb-1 ${isToday(date) ? 'text-rust' : 'text-white/70'}`}>
                      {date.getDate()}
                    </div>
                    <div className="space-y-1">
                      {dayTasks.slice(0, 2).map(task => (
                        <div
                          key={task.id}
                          className={`text-xs p-1 rounded truncate ${
                            task.completed ? 'bg-white/5 text-white/30 line-through' : 'bg-rust/20 text-rust'
                          }`}
                        >
                          {task.title}
                        </div>
                      ))}
                      {dayTasks.length > 2 && (
                        <div className="text-xs text-white/30">+{dayTasks.length - 2} more</div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {showTaskModal && (
        <TaskModal
          date={selectedDate}
          users={users}
          leads={leads}
          currentUser={currentUser}
          tasks={getTasksForDate(selectedDate)}
          onClose={() => setShowTaskModal(false)}
          onSave={onTaskCreate}
        />
      )}
    </div>
  );
}

function TaskModal({ date, users, leads, currentUser, tasks, onClose, onSave }) {
  const [showNewTask, setShowNewTask] = useState(false);
  const [formData, setFormData] = useState({
    title: '', description: '',
    due_date: date?.toISOString().split('T')[0] || '',
    assigned_to: '', lead_id: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('tasks').insert([{
      ...formData,
      assigned_by: currentUser?.id,
      completed: false,
      created_at: new Date().toISOString(),
    }]);
    if (!error) {
      onSave();
      setShowNewTask(false);
      setFormData({ title: '', description: '', due_date: date?.toISOString().split('T')[0] || '', assigned_to: '', lead_id: '' });
    }
  };

  const toggleTaskComplete = async (taskId, currentStatus) => {
    await supabase.from('tasks').update({ completed: !currentStatus }).eq('id', taskId);
    onSave();
  };

  const deleteTask = async (taskId) => {
    if (confirm('Delete this task?')) {
      await supabase.from('tasks').delete().eq('id', taskId);
      onSave();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-navy border border-white/20 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-white/10">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-medium text-white">
              {date?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </h2>
            <button onClick={onClose} className="text-white/40 hover:text-white transition">{Icons.close}</button>
          </div>
        </div>

        <div className="p-6">
          {tasks.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-white/40 mb-3">Tasks</h3>
              <div className="space-y-2">
                {tasks.map(task => (
                  <div key={task.id} className="flex items-start gap-3 p-3 bg-white/5 rounded-lg group">
                    <button
                      onClick={() => toggleTaskComplete(task.id, task.completed)}
                      className={`w-5 h-5 rounded border flex items-center justify-center mt-0.5 transition ${
                        task.completed ? 'bg-rust border-rust' : 'border-white/30 hover:border-rust'
                      }`}
                    >
                      {task.completed && Icons.check}
                    </button>
                    <div className="flex-1">
                      <div className={`font-medium ${task.completed ? 'line-through text-white/30' : 'text-white'}`}>
                        {task.title}
                      </div>
                      {task.assigned_to && (
                        <div className="text-xs text-rust mt-1">
                          {users.find(u => u.id === task.assigned_to)?.name || 'Assigned'}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400 transition"
                    >
                      {Icons.trash}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {showNewTask ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm text-white/60 block mb-1">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
                  required
                />
              </div>
              <div>
                <label className="text-sm text-white/60 block mb-1">Assign To</label>
                <select
                  value={formData.assigned_to}
                  onChange={e => setFormData({...formData, assigned_to: e.target.value})}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
                >
                  <option value="" className="bg-navy">Unassigned</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id} className="bg-navy">{user.name || user.email}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-white/60 block mb-1">Link to Lead</label>
                <select
                  value={formData.lead_id}
                  onChange={e => setFormData({...formData, lead_id: e.target.value})}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
                >
                  <option value="" className="bg-navy">No lead linked</option>
                  {leads.map(lead => (
                    <option key={lead.id} value={lead.id} className="bg-navy">{lead.name || lead.address}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowNewTask(false)} className="px-4 py-2 text-white/60">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-rust text-white rounded-lg">Create</button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowNewTask(true)}
              className="w-full py-3 border border-dashed border-white/20 rounded-lg text-white/40 hover:border-rust hover:text-rust transition flex items-center justify-center gap-2"
            >
              {Icons.plus} Add Task
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function TasksView({ tasks, users, leads, currentUser, onTaskUpdate }) {
  const [filter, setFilter] = useState('all');
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);

  const filteredTasks = tasks.filter(task => {
    if (filter === 'all') return true;
    if (filter === 'mine') return task.assigned_to === currentUser?.id;
    if (filter === 'pending') return !task.completed;
    if (filter === 'completed') return task.completed;
    return true;
  });

  const toggleTaskComplete = async (taskId, currentStatus) => {
    await supabase.from('tasks').update({ completed: !currentStatus }).eq('id', taskId);
    onTaskUpdate();
  };

  const deleteTask = async (taskId) => {
    if (confirm('Delete this task?')) {
      await supabase.from('tasks').delete().eq('id', taskId);
      onTaskUpdate();
    }
  };

  const groupedTasks = filteredTasks.reduce((acc, task) => {
    const date = task.due_date || 'No Due Date';
    if (!acc[date]) acc[date] = [];
    acc[date].push(task);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedTasks).sort((a, b) => {
    if (a === 'No Due Date') return 1;
    if (b === 'No Due Date') return -1;
    return new Date(a) - new Date(b);
  });

  const formatDateHeader = (dateStr) => {
    if (dateStr === 'No Due Date') return dateStr;
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    if (date.toDateString() === today.toDateString()) return 'Today';
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const isOverdue = (dateStr) => {
    if (dateStr === 'No Due Date') return false;
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  return (
    <div className="h-full overflow-auto bg-gray-900 p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-2">
          {['all', 'mine', 'pending', 'completed'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === f ? 'bg-white text-navy' : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowNewTaskModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-rust hover:bg-rust/80 text-white rounded-lg text-sm transition"
        >
          {Icons.plus} New Task
        </button>
      </div>

      {filteredTasks.length === 0 ? (
        <div className="bg-white/5 rounded-xl p-12 text-center border border-white/10">
          <div className="text-white/20 mb-4">{Icons.tasks}</div>
          <h3 className="text-lg font-medium text-white mb-2">No tasks found</h3>
          <p className="text-white/40">Create a new task to get started.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedDates.map(dateStr => (
            <div key={dateStr}>
              <h3 className={`text-sm font-medium mb-3 ${isOverdue(dateStr) ? 'text-red-400' : 'text-white/40'}`}>
                {formatDateHeader(dateStr)}
                {isOverdue(dateStr) && ' - Overdue'}
              </h3>
              <div className="space-y-2">
                {groupedTasks[dateStr].map(task => (
                  <div
                    key={task.id}
                    className={`bg-white/5 rounded-lg p-4 flex items-start gap-4 group border border-white/10 ${
                      isOverdue(task.due_date) && !task.completed ? 'border-l-2 border-l-red-400' : ''
                    }`}
                  >
                    <button
                      onClick={() => toggleTaskComplete(task.id, task.completed)}
                      className={`w-5 h-5 rounded border flex items-center justify-center mt-0.5 transition ${
                        task.completed ? 'bg-rust border-rust' : 'border-white/30 hover:border-rust'
                      }`}
                    >
                      {task.completed && Icons.check}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className={`font-medium ${task.completed ? 'line-through text-white/30' : 'text-white'}`}>
                        {task.title}
                      </div>
                      {task.description && (
                        <div className="text-sm text-white/40 mt-1">{task.description}</div>
                      )}
                      <div className="flex flex-wrap gap-2 mt-2">
                        {task.assigned_to && (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-rust/20 text-rust rounded">
                            {Icons.user}
                            {users.find(u => u.id === task.assigned_to)?.name || 'Unknown'}
                          </span>
                        )}
                        {task.lead_id && (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-white/10 text-white/60 rounded">
                            {Icons.location}
                            {leads.find(l => l.id === task.lead_id)?.name || 'Lead'}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400 transition"
                    >
                      {Icons.trash}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showNewTaskModal && (
        <NewTaskModal
          users={users}
          leads={leads}
          currentUser={currentUser}
          onClose={() => setShowNewTaskModal(false)}
          onSave={onTaskUpdate}
        />
      )}
    </div>
  );
}

function NewTaskModal({ users, leads, currentUser, onClose, onSave }) {
  const [formData, setFormData] = useState({
    title: '', description: '', due_date: '', assigned_to: '', lead_id: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('tasks').insert([{
      ...formData,
      due_date: formData.due_date || null,
      assigned_to: formData.assigned_to || null,
      lead_id: formData.lead_id || null,
      assigned_by: currentUser?.id,
      completed: false,
      created_at: new Date().toISOString(),
    }]);
    if (!error) {
      onSave();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-navy border border-white/20 rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-medium text-white mb-6">Create Task</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-white/60 block mb-1">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
              required
            />
          </div>
          <div>
            <label className="text-sm text-white/60 block mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
              rows={2}
            />
          </div>
          <div>
            <label className="text-sm text-white/60 block mb-1">Due Date</label>
            <input
              type="date"
              value={formData.due_date}
              onChange={e => setFormData({...formData, due_date: e.target.value})}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="text-sm text-white/60 block mb-1">Assign To</label>
            <select
              value={formData.assigned_to}
              onChange={e => setFormData({...formData, assigned_to: e.target.value})}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
            >
              <option value="" className="bg-navy">Unassigned</option>
              {users.map(user => (
                <option key={user.id} value={user.id} className="bg-navy">{user.name || user.email}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-white/60 block mb-1">Link to Lead</label>
            <select
              value={formData.lead_id}
              onChange={e => setFormData({...formData, lead_id: e.target.value})}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
            >
              <option value="" className="bg-navy">No lead linked</option>
              {leads.map(lead => (
                <option key={lead.id} value={lead.id} className="bg-navy">{lead.name || lead.address}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-white/60">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-rust text-white rounded-lg">Create</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function BackendView({ leads, users, pipelines, currentUser, onLeadUpdate }) {
  const [activeTab, setActiveTab] = useState('all');
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [showPushModal, setShowPushModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Filter leads based on active tab
  const getFilteredLeads = () => {
    switch (activeTab) {
      case 'new':
        return leads.filter(l => l.stage === 'New');
      case 'qualified':
        return leads.filter(l => l.stage === 'Qualified' || l.stage === 'Contacted');
      case 'unassigned':
        return leads.filter(l => !l.assigned_to);
      case 'large':
        return leads.filter(l => l.acreage >= 50);
      default:
        return leads;
    }
  };

  const filteredLeads = getFilteredLeads();

  // Calculate stats
  const stats = {
    total: leads.length,
    new: leads.filter(l => l.stage === 'New').length,
    qualified: leads.filter(l => l.stage === 'Qualified' || l.stage === 'Contacted').length,
    large: leads.filter(l => l.acreage >= 50).length,
    recent: leads.filter(l => {
      const created = new Date(l.created_at);
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return created > dayAgo;
    }).length,
  };

  const toggleLeadSelection = (leadId) => {
    setSelectedLeads(prev =>
      prev.includes(leadId)
        ? prev.filter(id => id !== leadId)
        : [...prev, leadId]
    );
  };

  const selectAll = () => {
    if (selectedLeads.length === filteredLeads.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(filteredLeads.map(l => l.id));
    }
  };

  const tabs = [
    { id: 'all', label: 'All Leads', count: leads.length },
    { id: 'new', label: 'New Inflow', count: stats.new },
    { id: 'qualified', label: 'Qualified', count: stats.qualified },
    { id: 'unassigned', label: 'Unassigned', count: leads.filter(l => !l.assigned_to).length },
    { id: 'large', label: '50+ Acres', count: stats.large },
  ];

  return (
    <div className="h-full overflow-auto bg-gray-900">
      {/* Header with tabs */}
      <div className="bg-slate-800/50 border-b border-slate-700/50 px-6 py-3">
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  activeTab === tab.id
                    ? 'bg-rust text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {selectedLeads.length > 0 && (
              <button
                onClick={() => setShowPushModal(true)}
                className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-medium transition flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                Push {selectedLeads.length} Lead{selectedLeads.length > 1 ? 's' : ''}
              </button>
            )}
            <button
              onClick={() => setShowImportModal(true)}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Import
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex gap-4">
          <div className="bg-slate-900/50 rounded-lg px-4 py-2 border border-slate-700/50">
            <div className="text-2xl font-bold text-white">{stats.new}</div>
            <div className="text-xs text-slate-400 uppercase tracking-wide">New Leads</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg px-4 py-2 border border-slate-700/50">
            <div className="text-2xl font-bold text-rust">{stats.qualified}</div>
            <div className="text-xs text-slate-400 uppercase tracking-wide">Qualified</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg px-4 py-2 border border-slate-700/50">
            <div className="text-2xl font-bold text-white">{stats.large}</div>
            <div className="text-xs text-slate-400 uppercase tracking-wide">50+ Acres</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg px-4 py-2 border border-slate-700/50">
            <div className="text-2xl font-bold text-green-400">{stats.recent}</div>
            <div className="text-xs text-slate-400 uppercase tracking-wide">Last 24 Hours</div>
          </div>
        </div>
      </div>

      {/* Leads Grid */}
      <div className="p-6">
        {/* Select All */}
        <div className="flex items-center justify-between mb-4">
          <label className="flex items-center gap-2 text-slate-400 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={selectedLeads.length === filteredLeads.length && filteredLeads.length > 0}
              onChange={selectAll}
              className="rounded border-slate-600 bg-slate-800 text-rust focus:ring-rust"
            />
            Select All ({filteredLeads.length})
          </label>
          {selectedLeads.length > 0 && (
            <span className="text-sm text-rust">{selectedLeads.length} selected</span>
          )}
        </div>

        {/* Lead Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLeads.map(lead => (
            <LeadCard
              key={lead.id}
              lead={lead}
              pipelines={pipelines}
              isSelected={selectedLeads.includes(lead.id)}
              onToggleSelect={() => toggleLeadSelection(lead.id)}
              onUpdate={onLeadUpdate}
            />
          ))}
        </div>

        {filteredLeads.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <svg className="w-16 h-16 mx-auto mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p>No leads found in this category</p>
          </div>
        )}
      </div>

      {/* Push Modal */}
      {showPushModal && (
        <PushLeadsModal
          selectedLeads={leads.filter(l => selectedLeads.includes(l.id))}
          users={users}
          onClose={() => setShowPushModal(false)}
          onPush={onLeadUpdate}
        />
      )}

      {/* Import Modal */}
      {showImportModal && (
        <ImportLeadsModal
          onClose={() => setShowImportModal(false)}
          onImport={onLeadUpdate}
        />
      )}
    </div>
  );
}

function LeadCard({ lead, pipelines, isSelected, onToggleSelect, onUpdate }) {
  const [showActions, setShowActions] = useState(false);

  const getAcreageLabel = (acreage) => {
    if (!acreage) return null;
    if (acreage < 10) return '1-10 Acres';
    if (acreage < 20) return '10-20 Acres';
    if (acreage < 50) return '20-50 Acres';
    if (acreage < 100) return '50-100 Acres';
    return '100+ Acres';
  };

  const pipeline = pipelines.find(p => p.id === lead.pipeline);

  return (
    <div className={`bg-slate-800/50 rounded-xl border transition ${
      isSelected ? 'border-rust ring-1 ring-rust' : 'border-slate-700/50 hover:border-slate-600'
    }`}>
      {/* Header */}
      <div className="p-4 border-b border-slate-700/30">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onToggleSelect}
              className="mt-1 rounded border-slate-600 bg-slate-800 text-rust focus:ring-rust"
            />
            <div>
              <div className="font-semibold text-white">{lead.name || 'Unknown Owner'}</div>
              <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                {lead.owner_type && (
                  <span className="px-2 py-0.5 bg-slate-700/50 rounded text-[10px] uppercase">{lead.owner_type}</span>
                )}
              </div>
            </div>
          </div>
          {lead.stage === 'New' && (
            <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-semibold rounded">NEW</span>
          )}
        </div>
      </div>

      {/* Property Info */}
      <div className="p-4 space-y-3">
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wide">Property Location</div>
          <div className="text-white text-sm">{lead.address || 'No address'}</div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-slate-400 text-sm">{lead.county || lead.city}</span>
            <span className="text-slate-400 text-sm">{lead.state}</span>
          </div>
        </div>

        {lead.acreage > 0 && (
          <div className="text-rust font-semibold">{getAcreageLabel(lead.acreage)}</div>
        )}

        {/* Property Details */}
        <div className="text-xs text-slate-500 uppercase tracking-wide">Property Details</div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div>
            <span className="text-slate-500">Home: </span>
            <span className={lead.has_home ? 'text-green-400' : 'text-red-400'}>
              {lead.has_home ? 'YES' : 'NO'}
            </span>
          </div>
          <div>
            <span className="text-slate-500">Listed: </span>
            <span className={lead.is_listed ? 'text-green-400' : 'text-red-400'}>
              {lead.is_listed ? 'YES' : 'NO'}
            </span>
          </div>
          <div>
            <span className="text-slate-500">4+ Years: </span>
            <span className="text-green-400">YES</span>
          </div>
        </div>

        {/* Contact Info */}
        <div className="pt-2 border-t border-slate-700/30 space-y-1.5">
          {lead.email && (
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {lead.email}
            </div>
          )}
          {lead.phone && (
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              {lead.phone}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="p-3 border-t border-slate-700/30 flex gap-2">
        <button className="flex-1 px-3 py-2 bg-rust hover:bg-rust/80 text-white rounded-lg text-sm font-medium transition">
          Attach Map
        </button>
        <button className="flex-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition">
          View Details
        </button>
      </div>
    </div>
  );
}

function PushLeadsModal({ selectedLeads, users, onClose, onPush }) {
  const [pushTargets, setPushTargets] = useState({
    calendar: false,
    googlePPC: false,
    facebook: false,
    agentPipeline: false,
    mail: false,
    calling: false,
  });
  const [assignedUser, setAssignedUser] = useState('');

  const handlePush = async () => {
    // Here you would implement the actual push logic
    console.log('Pushing leads:', selectedLeads.map(l => l.id));
    console.log('Targets:', pushTargets);
    console.log('Assigned to:', assignedUser);

    // For now just close the modal
    alert(`Pushed ${selectedLeads.length} lead(s) to selected channels!`);
    onClose();
    onPush();
  };

  const channels = [
    { id: 'calendar', label: 'Calendar', icon: '📅', desc: 'Schedule follow-up tasks' },
    { id: 'googlePPC', label: 'Google PPC', icon: '🔍', desc: 'Add to remarketing audience' },
    { id: 'facebook', label: 'Facebook', icon: '📘', desc: 'Add to Facebook audience' },
    { id: 'agentPipeline', label: 'Agent Pipeline', icon: '👥', desc: 'Assign to agent for outreach' },
    { id: 'mail', label: 'Mail Campaign', icon: '📬', desc: 'Add to direct mail list' },
    { id: 'calling', label: 'Calling Queue', icon: '📞', desc: 'Add to cold calling list' },
  ];

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-navy border border-white/20 rounded-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-white/10">
          <h2 className="text-xl font-semibold text-white">Push Leads to Channels</h2>
          <p className="text-slate-400 text-sm mt-1">
            Push {selectedLeads.length} selected lead{selectedLeads.length > 1 ? 's' : ''} to marketing and sales channels
          </p>
        </div>

        <div className="p-6 space-y-4">
          {/* Channel Selection */}
          <div className="space-y-2">
            {channels.map(channel => (
              <label
                key={channel.id}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition ${
                  pushTargets[channel.id] ? 'bg-rust/20 border border-rust' : 'bg-white/5 border border-transparent hover:bg-white/10'
                }`}
              >
                <input
                  type="checkbox"
                  checked={pushTargets[channel.id]}
                  onChange={(e) => setPushTargets({ ...pushTargets, [channel.id]: e.target.checked })}
                  className="rounded border-slate-600 bg-slate-800 text-rust focus:ring-rust"
                />
                <span className="text-xl">{channel.icon}</span>
                <div>
                  <div className="text-white font-medium">{channel.label}</div>
                  <div className="text-slate-400 text-xs">{channel.desc}</div>
                </div>
              </label>
            ))}
          </div>

          {/* Assign to User (for Agent Pipeline) */}
          {pushTargets.agentPipeline && (
            <div>
              <label className="text-sm text-white/60 block mb-2">Assign to Agent</label>
              <select
                value={assignedUser}
                onChange={(e) => setAssignedUser(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
              >
                <option value="" className="bg-navy">Select agent...</option>
                {users.map(user => (
                  <option key={user.id} value={user.id} className="bg-navy">{user.name || user.email}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-white/10 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-white/60 hover:text-white transition">
            Cancel
          </button>
          <button
            onClick={handlePush}
            disabled={!Object.values(pushTargets).some(v => v)}
            className="px-4 py-2 bg-rust hover:bg-rust/80 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg transition"
          >
            Push Leads
          </button>
        </div>
      </div>
    </div>
  );
}

function ImportLeadsModal({ onClose, onImport }) {
  const [importType, setImportType] = useState('csv');
  const [file, setFile] = useState(null);

  const handleImport = async () => {
    if (!file) return;

    if (importType === 'csv') {
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
              pipeline: row.pipeline || 'listing',
              stage: 'New',
              lat: parseFloat(row.lat || row.latitude || 0) || null,
              lng: parseFloat(row.lng || row.longitude || row.lon || 0) || null,
              has_home: row.has_home === 'true' || row.has_home === 'YES' || row.has_home === '1',
              is_listed: row.is_listed === 'true' || row.is_listed === 'YES' || row.is_listed === '1',
              created_at: new Date().toISOString(),
            }));

          if (importedLeads.length > 0) {
            const { error } = await supabase.from('leads').insert(importedLeads);
            if (!error) {
              alert(`Imported ${importedLeads.length} leads successfully!`);
              onImport();
              onClose();
            } else {
              alert('Error importing leads: ' + error.message);
            }
          } else {
            alert('No valid leads found in file');
          }
        }
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-navy border border-white/20 rounded-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-white/10">
          <h2 className="text-xl font-semibold text-white">Import Leads</h2>
        </div>

        <div className="p-6 space-y-4">
          {/* Import Type */}
          <div className="flex gap-2">
            <button
              onClick={() => setImportType('csv')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                importType === 'csv' ? 'bg-rust text-white' : 'bg-white/10 text-white/60 hover:text-white'
              }`}
            >
              CSV File
            </button>
            <button
              onClick={() => setImportType('kml')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                importType === 'kml' ? 'bg-rust text-white' : 'bg-white/10 text-white/60 hover:text-white'
              }`}
            >
              KML/KMZ
            </button>
          </div>

          {/* File Upload */}
          <div>
            <input
              type="file"
              accept={importType === 'csv' ? '.csv' : '.kml,.kmz'}
              onChange={(e) => setFile(e.target.files[0])}
              className="w-full bg-white/10 border border-white/20 rounded-lg p-3 text-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-rust file:text-white file:cursor-pointer"
            />
          </div>

          {/* Instructions */}
          <div className="text-xs text-slate-400">
            {importType === 'csv' ? (
              <p>CSV should include columns: name, address, city, state, county, acreage, phone, email, lat, lng</p>
            ) : (
              <p>KML/KMZ files will extract parcel boundaries and center coordinates</p>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-white/10 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-white/60 hover:text-white transition">
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!file}
            className="px-4 py-2 bg-rust hover:bg-rust/80 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg transition"
          >
            Import
          </button>
        </div>
      </div>
    </div>
  );
}
