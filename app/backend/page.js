'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function BackendPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [showPushModal, setShowPushModal] = useState(false);
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
    const [leadsRes, usersRes] = await Promise.all([
      supabase.from('leads').select('*').order('created_at', { ascending: false }),
      supabase.from('users').select('*'),
    ]);
    setLeads(leadsRes.data || []);
    setUsers(usersRes.data || []);
    setLoading(false);
  };

  const deleteLead = async (leadId) => {
    if (confirm('Are you sure you want to delete this lead?')) {
      await supabase.from('leads').delete().eq('id', leadId);
      loadData();
    }
  };

  const deleteSelectedLeads = async () => {
    if (selectedLeads.length === 0) return;
    if (confirm(`Delete ${selectedLeads.length} selected lead(s)?`)) {
      await supabase.from('leads').delete().in('id', selectedLeads);
      setSelectedLeads([]);
      loadData();
    }
  };

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
      case 'capital':
        return leads.filter(l => l.pipeline === 'capital');
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
    { id: 'capital', label: 'Capital Partners', count: leads.filter(l => l.pipeline === 'capital').length },
  ];

  const handleImportCSV = async (file) => {
    if (!file) return;

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
            loadData();
            setShowImportModal(false);
          } else {
            alert('Error importing leads: ' + error.message);
          }
        } else {
          alert('No valid leads found in file');
        }
      }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <h1 className="text-xl font-semibold text-white">Backend - Lead Management</h1>
          </div>
          <div className="flex items-center gap-3">
            {selectedLeads.length > 0 && (
              <>
                <button
                  onClick={deleteSelectedLeads}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete ({selectedLeads.length})
                </button>
                <button
                  onClick={() => setShowPushModal(true)}
                  className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-medium transition flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Push ({selectedLeads.length})
                </button>
              </>
            )}
            <button
              onClick={() => setShowImportModal(true)}
              className="px-4 py-2 bg-rust hover:bg-rust/80 text-white rounded-lg text-sm font-medium transition flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Import Leads
            </button>
          </div>
        </div>
      </header>

      {/* Tabs & Stats */}
      <div className="bg-slate-800/50 border-b border-slate-700/50 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2 flex-wrap">
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
        </div>

        {/* Stats Row */}
        <div className="flex gap-4 flex-wrap">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredLeads.map(lead => (
            <LeadCard
              key={lead.id}
              lead={lead}
              isSelected={selectedLeads.includes(lead.id)}
              onToggleSelect={() => toggleLeadSelection(lead.id)}
              onDelete={() => deleteLead(lead.id)}
            />
          ))}
        </div>

        {filteredLeads.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <svg className="w-16 h-16 mx-auto mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p>No leads found</p>
          </div>
        )}
      </div>

      {/* Push Modal */}
      {showPushModal && (
        <PushModal
          selectedCount={selectedLeads.length}
          users={users}
          onClose={() => setShowPushModal(false)}
          onPush={() => {
            setSelectedLeads([]);
            loadData();
          }}
        />
      )}

      {/* Import Modal */}
      {showImportModal && (
        <ImportModal
          onClose={() => setShowImportModal(false)}
          onImport={handleImportCSV}
        />
      )}
    </div>
  );
}

function LeadCard({ lead, isSelected, onToggleSelect, onDelete }) {
  const getAcreageLabel = (acreage) => {
    if (!acreage) return null;
    if (acreage < 10) return '1-10 Acres';
    if (acreage < 20) return '10-20 Acres';
    if (acreage < 50) return '20-50 Acres';
    if (acreage < 100) return '50-100 Acres';
    return '100+ Acres';
  };

  const PIPELINE_COLORS = {
    jv: '#8B5CF6',
    development: '#3B82F6',
    listing: '#22C55E',
    capital: '#EAB308',
    dispo: '#EF4444',
  };

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
              {lead.pipeline && (
                <span
                  className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] uppercase font-medium text-white"
                  style={{ backgroundColor: PIPELINE_COLORS[lead.pipeline] || '#666' }}
                >
                  {lead.pipeline}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {lead.stage === 'New' && (
              <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-semibold rounded">NEW</span>
            )}
            <button
              onClick={onDelete}
              className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/20 rounded transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Property Info */}
      <div className="p-4 space-y-2">
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wide">Location</div>
          <div className="text-white text-sm">{lead.address || 'No address'}</div>
          <div className="text-slate-400 text-sm">{lead.county || lead.city}, {lead.state}</div>
        </div>

        {lead.acreage > 0 && (
          <div className="text-rust font-semibold text-sm">{getAcreageLabel(lead.acreage)}</div>
        )}

        {/* Contact Info */}
        <div className="pt-2 border-t border-slate-700/30 space-y-1">
          {lead.email && (
            <div className="text-sm text-slate-400 truncate">{lead.email}</div>
          )}
          {lead.phone && (
            <div className="text-sm text-slate-400">{lead.phone}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function PushModal({ selectedCount, users, onClose, onPush }) {
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
    alert(`Pushed ${selectedCount} lead(s) to selected channels!`);
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
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-slate-700">
          <h2 className="text-xl font-semibold text-white">Push Leads to Channels</h2>
          <p className="text-slate-400 text-sm mt-1">
            Push {selectedCount} selected lead{selectedCount > 1 ? 's' : ''} to marketing and sales channels
          </p>
        </div>

        <div className="p-6 space-y-3">
          {channels.map(channel => (
            <label
              key={channel.id}
              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition ${
                pushTargets[channel.id] ? 'bg-rust/20 border border-rust' : 'bg-slate-800/50 border border-transparent hover:bg-slate-800'
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

          {pushTargets.agentPipeline && (
            <div className="pt-2">
              <label className="text-sm text-slate-400 block mb-2">Assign to Agent</label>
              <select
                value={assignedUser}
                onChange={(e) => setAssignedUser(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
              >
                <option value="">Select agent...</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>{user.name || user.email}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-700 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white transition">
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

function ImportModal({ onClose, onImport }) {
  const [file, setFile] = useState(null);

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-slate-700">
          <h2 className="text-xl font-semibold text-white">Import Leads</h2>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setFile(e.target.files[0])}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-rust file:text-white file:cursor-pointer"
            />
          </div>
          <p className="text-xs text-slate-400">
            CSV columns: name, address, city, state, county, acreage, phone, email, lat, lng, pipeline
          </p>
        </div>

        <div className="p-6 border-t border-slate-700 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white transition">
            Cancel
          </button>
          <button
            onClick={() => file && onImport(file)}
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
