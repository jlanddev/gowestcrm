'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';

// Dynamically import map to avoid SSR issues
const LeadsMap = dynamic(() => import('@/components/LeadsMap'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-gray-200 animate-pulse" />
});

const PIPELINES = [
  { id: 'jv', name: 'JV Development', color: 'purple', icon: '🤝' },
  { id: 'development', name: 'Developments', color: 'blue', icon: '🏗️' },
  { id: 'listing', name: 'Listing Leads', color: 'green', icon: '📋' },
  { id: 'capital', name: 'Capital Partners', color: 'yellow', icon: '💰' },
  { id: 'dispo', name: 'Dispo Leads', color: 'red', icon: '🎯' },
];

const STAGES = ['New', 'Contacted', 'Qualified', 'Negotiating', 'Under Contract', 'Closed', 'Lost'];

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('pipelines');
  const [activePipeline, setActivePipeline] = useState('all');
  const [leads, setLeads] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [tasks, setTasks] = useState([]);
  const router = useRouter();
  const fileInputRef = useRef(null);

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
    // Load leads
    const { data: leadsData } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });
    setLeads(leadsData || []);

    // Load team users
    const { data: usersData } = await supabase
      .from('users')
      .select('*');
    setUsers(usersData || []);

    // Load tasks
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

  const handleImportCSV = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const Papa = (await import('papaparse')).default;
    Papa.parse(file, {
      header: true,
      complete: async (results) => {
        const importedLeads = results.data
          .filter(row => row.name || row.address)
          .map(row => ({
            name: row.name || row.owner_name || '',
            address: row.address || row.property_address || '',
            city: row.city || '',
            state: row.state || 'TX',
            county: row.county || '',
            acreage: parseFloat(row.acreage || row.acres || 0),
            phone: row.phone || '',
            email: row.email || '',
            pipeline: 'listing',
            stage: 'New',
            lat: parseFloat(row.lat || row.latitude || 0) || null,
            lng: parseFloat(row.lng || row.longitude || row.lon || 0) || null,
            created_at: new Date().toISOString(),
          }));

        if (importedLeads.length > 0) {
          const { error } = await supabase.from('leads').insert(importedLeads);
          if (!error) {
            loadData();
            setShowImportModal(false);
            alert(`Imported ${importedLeads.length} leads successfully!`);
          }
        }
      }
    });
  };

  const updateLeadStage = async (leadId, newStage) => {
    await supabase.from('leads').update({ stage: newStage }).eq('id', leadId);
    loadData();
  };

  const updateLeadPipeline = async (leadId, newPipeline) => {
    await supabase.from('leads').update({ pipeline: newPipeline }).eq('id', leadId);
    loadData();
  };

  const filteredLeads = activePipeline === 'all'
    ? leads
    : leads.filter(l => l.pipeline === activePipeline);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-navy">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <div className="w-64 bg-navy text-white flex flex-col">
        <div className="p-4 border-b border-navy-light">
          <img src="/logo.svg" alt="GoWest" className="h-10" />
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          <button
            onClick={() => setActiveView('pipelines')}
            className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition ${
              activeView === 'pipelines' ? 'bg-rust' : 'hover:bg-navy-light'
            }`}
          >
            <span>📊</span> Pipelines
          </button>
          <button
            onClick={() => setActiveView('map')}
            className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition ${
              activeView === 'map' ? 'bg-rust' : 'hover:bg-navy-light'
            }`}
          >
            <span>🗺️</span> Map View
          </button>
          <button
            onClick={() => setActiveView('calendar')}
            className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition ${
              activeView === 'calendar' ? 'bg-rust' : 'hover:bg-navy-light'
            }`}
          >
            <span>📅</span> Calendar
          </button>
          <button
            onClick={() => setActiveView('tasks')}
            className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition ${
              activeView === 'tasks' ? 'bg-rust' : 'hover:bg-navy-light'
            }`}
          >
            <span>✅</span> Tasks
          </button>
        </nav>

        {/* User info */}
        <div className="p-4 border-t border-navy-light">
          <div className="text-sm text-gray-300 mb-2">{user?.email}</div>
          <button
            onClick={handleSignOut}
            className="text-sm text-gray-400 hover:text-white transition"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-display text-navy">
            {activeView === 'pipelines' && 'PIPELINES'}
            {activeView === 'map' && 'MAP VIEW'}
            {activeView === 'calendar' && 'CALENDAR'}
            {activeView === 'tasks' && 'TASKS'}
          </h1>
          <div className="flex gap-3">
            <button
              onClick={() => setShowImportModal(true)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition"
            >
              Import CSV
            </button>
            <button
              onClick={() => setShowAddLeadModal(true)}
              className="px-4 py-2 bg-navy hover:bg-rust text-white rounded-lg text-sm font-medium transition"
            >
              + Add Lead
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          {/* Pipeline View */}
          {activeView === 'pipelines' && (
            <div className="p-6">
              {/* Pipeline Tabs */}
              <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                <button
                  onClick={() => setActivePipeline('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                    activePipeline === 'all'
                      ? 'bg-navy text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  All ({leads.length})
                </button>
                {PIPELINES.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setActivePipeline(p.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                      activePipeline === p.id
                        ? 'bg-navy text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {p.icon} {p.name} ({leads.filter(l => l.pipeline === p.id).length})
                  </button>
                ))}
              </div>

              {/* Kanban Board */}
              <div className="flex gap-4 overflow-x-auto pb-4">
                {STAGES.map(stage => (
                  <div key={stage} className="flex-shrink-0 w-72">
                    <div className="bg-gray-200 rounded-t-lg px-4 py-2 font-semibold text-gray-700">
                      {stage} ({filteredLeads.filter(l => l.stage === stage).length})
                    </div>
                    <div className="bg-gray-50 rounded-b-lg p-2 min-h-[500px] space-y-2">
                      {filteredLeads.filter(l => l.stage === stage).map(lead => (
                        <div
                          key={lead.id}
                          onClick={() => setSelectedLead(lead)}
                          className={`bg-white rounded-lg p-3 shadow-sm cursor-pointer hover:shadow-md transition pipeline-${lead.pipeline}`}
                        >
                          <div className="font-medium text-gray-900 truncate">{lead.name || 'Unknown'}</div>
                          <div className="text-sm text-gray-500 truncate">{lead.address}</div>
                          {lead.acreage > 0 && (
                            <div className="text-xs text-gray-400 mt-1">{lead.acreage} acres</div>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`text-xs px-2 py-0.5 rounded bg-${PIPELINES.find(p => p.id === lead.pipeline)?.color || 'gray'}-100 text-${PIPELINES.find(p => p.id === lead.pipeline)?.color || 'gray'}-700`}>
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

          {/* Map View */}
          {activeView === 'map' && (
            <div className="h-full">
              <LeadsMap leads={leads} onSelectLead={setSelectedLead} />
            </div>
          )}

          {/* Calendar View */}
          {activeView === 'calendar' && (
            <div className="p-6">
              <div className="bg-white rounded-xl p-6">
                <h2 className="text-xl font-semibold mb-4">Coming Soon</h2>
                <p className="text-gray-500">Calendar with task assignments will be available here.</p>
              </div>
            </div>
          )}

          {/* Tasks View */}
          {activeView === 'tasks' && (
            <div className="p-6">
              <div className="bg-white rounded-xl p-6">
                <h2 className="text-xl font-semibold mb-4">Tasks</h2>
                {tasks.length === 0 ? (
                  <p className="text-gray-500">No tasks yet.</p>
                ) : (
                  <div className="space-y-2">
                    {tasks.map(task => (
                      <div key={task.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <input type="checkbox" checked={task.completed} className="w-5 h-5" />
                        <span className={task.completed ? 'line-through text-gray-400' : ''}>{task.title}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lead Detail Slide-out */}
      {selectedLead && (
        <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setSelectedLead(null)}>
          <div
            className="absolute right-0 top-0 bottom-0 w-96 bg-white shadow-xl overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-xl font-bold">{selectedLead.name || 'Lead Details'}</h2>
                <button onClick={() => setSelectedLead(null)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-500">Address</label>
                  <p className="font-medium">{selectedLead.address}</p>
                  <p className="text-sm text-gray-600">{selectedLead.city}, {selectedLead.state}</p>
                </div>

                {selectedLead.acreage > 0 && (
                  <div>
                    <label className="text-sm text-gray-500">Acreage</label>
                    <p className="font-medium">{selectedLead.acreage} acres</p>
                  </div>
                )}

                {selectedLead.phone && (
                  <div>
                    <label className="text-sm text-gray-500">Phone</label>
                    <p className="font-medium">{selectedLead.phone}</p>
                  </div>
                )}

                {selectedLead.email && (
                  <div>
                    <label className="text-sm text-gray-500">Email</label>
                    <p className="font-medium">{selectedLead.email}</p>
                  </div>
                )}

                <div>
                  <label className="text-sm text-gray-500 block mb-1">Pipeline</label>
                  <select
                    value={selectedLead.pipeline}
                    onChange={(e) => updateLeadPipeline(selectedLead.id, e.target.value)}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    {PIPELINES.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm text-gray-500 block mb-1">Stage</label>
                  <select
                    value={selectedLead.stage}
                    onChange={(e) => updateLeadStage(selectedLead.id, e.target.value)}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    {STAGES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setShowImportModal(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">Import Leads from CSV</h2>
            <p className="text-gray-600 text-sm mb-4">
              Upload a CSV file with columns: name, address, city, state, county, acreage, phone, email, lat, lng
            </p>
            <input
              type="file"
              accept=".csv"
              onChange={handleImportCSV}
              className="w-full border rounded-lg p-3"
            />
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Lead Modal */}
      {showAddLeadModal && (
        <AddLeadModal
          onClose={() => setShowAddLeadModal(false)}
          onSave={() => { loadData(); setShowAddLeadModal(false); }}
        />
      )}
    </div>
  );
}

function AddLeadModal({ onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: 'TX',
    county: '',
    acreage: '',
    phone: '',
    email: '',
    pipeline: 'listing',
    stage: 'New',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('leads').insert([{
      ...formData,
      acreage: parseFloat(formData.acreage) || 0,
      created_at: new Date().toISOString(),
    }]);
    if (!error) onSave();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4">Add New Lead</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-sm text-gray-600">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div className="col-span-2">
              <label className="text-sm text-gray-600">Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={e => setFormData({...formData, address: e.target.value})}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={e => setFormData({...formData, city: e.target.value})}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">State</label>
              <input
                type="text"
                value={formData.state}
                onChange={e => setFormData({...formData, state: e.target.value})}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">County</label>
              <input
                type="text"
                value={formData.county}
                onChange={e => setFormData({...formData, county: e.target.value})}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Acreage</label>
              <input
                type="number"
                value={formData.acreage}
                onChange={e => setFormData({...formData, acreage: e.target.value})}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Pipeline</label>
              <select
                value={formData.pipeline}
                onChange={e => setFormData({...formData, pipeline: e.target.value})}
                className="w-full border rounded-lg px-3 py-2"
              >
                {PIPELINES.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-600">Stage</label>
              <select
                value={formData.stage}
                onChange={e => setFormData({...formData, stage: e.target.value})}
                className="w-full border rounded-lg px-3 py-2"
              >
                {STAGES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-navy text-white rounded-lg">Add Lead</button>
          </div>
        </form>
      </div>
    </div>
  );
}
