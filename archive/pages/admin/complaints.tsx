import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Complaint {
  id: number;
  complainant_wallet: string;
  complainant_email: string | null;
  category: string;
  subject: string;
  description: string;
  status: string;
  priority: string | null;
  assigned_to: string | null;
  resolution: string | null;
  created_at: string;
  updated_at: string;
  updates?: ComplaintUpdate[];
}

interface ComplaintUpdate {
  id: number;
  complaint_id: number;
  status: string;
  notes: string;
  updated_by: string;
  created_at: string;
}

interface ComplaintStats {
  total: number;
  pending: number;
  investigating: number;
  resolved: number;
  dismissed: number;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  investigating: 'bg-blue-100 text-blue-800 border-blue-200',
  resolved: 'bg-green-100 text-green-800 border-green-200',
  dismissed: 'bg-gray-100 text-gray-800 border-gray-200'
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'text-gray-600',
  medium: 'text-yellow-600',
  high: 'text-orange-600',
  critical: 'text-red-600'
};

export default function AdminComplaintsPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [stats, setStats] = useState<ComplaintStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [updateForm, setUpdateForm] = useState({
    status: '',
    notes: '',
    resolution: '',
    priority: ''
  });
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchComplaints();
  }, [filterStatus]);

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.append('status', filterStatus);
      
      const res = await fetch(`/api/admin/compliance/complaints?${params}`);
      if (res.ok) {
        const data = await res.json();
        setComplaints(data.complaints || []);
        setStats(data.stats || null);
      }
    } catch (error) {
      console.error('Failed to fetch complaints:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectComplaint = async (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setUpdateForm({
      status: complaint.status,
      notes: '',
      resolution: complaint.resolution || '',
      priority: complaint.priority || 'medium'
    });
    
    try {
      const res = await fetch(`/api/admin/compliance/complaints/${complaint.id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedComplaint({ ...complaint, updates: data.updates || [] });
      }
    } catch (error) {
      console.error('Failed to fetch complaint details:', error);
    }
  };

  const handleUpdateComplaint = async () => {
    if (!selectedComplaint) return;
    
    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/compliance/complaints/${selectedComplaint.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateForm)
      });
      
      if (res.ok) {
        fetchComplaints();
        const updatedData = await res.json();
        setSelectedComplaint(prev => prev ? { ...prev, ...updatedData.complaint } : null);
        setUpdateForm(prev => ({ ...prev, notes: '' }));
      }
    } catch (error) {
      console.error('Failed to update complaint:', error);
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatWallet = (wallet: string) => {
    return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/admin" className="text-gray-400 hover:text-white text-sm mb-2 inline-block">
              ← Back to Admin
            </Link>
            <h1 className="text-3xl font-bold">Complaints Dashboard</h1>
            <p className="text-gray-400 mt-1">Manage user complaints and disputes</p>
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-gray-400 text-sm">Total</div>
            </div>
            <div className="bg-yellow-900/30 rounded-xl p-4 border border-yellow-700">
              <div className="text-2xl font-bold text-yellow-400">{stats.pending}</div>
              <div className="text-gray-400 text-sm">Pending</div>
            </div>
            <div className="bg-blue-900/30 rounded-xl p-4 border border-blue-700">
              <div className="text-2xl font-bold text-blue-400">{stats.investigating}</div>
              <div className="text-gray-400 text-sm">Investigating</div>
            </div>
            <div className="bg-green-900/30 rounded-xl p-4 border border-green-700">
              <div className="text-2xl font-bold text-green-400">{stats.resolved}</div>
              <div className="text-gray-400 text-sm">Resolved</div>
            </div>
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <div className="text-2xl font-bold text-gray-400">{stats.dismissed}</div>
              <div className="text-gray-400 text-sm">Dismissed</div>
            </div>
          </div>
        )}

        <div className="flex gap-2 mb-6">
          {['all', 'pending', 'investigating', 'resolved', 'dismissed'].map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterStatus === status
                  ? 'bg-yellow-500 text-black'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-gray-800 rounded-xl border border-gray-700">
            <div className="p-4 border-b border-gray-700">
              <h2 className="font-semibold">Complaints List</h2>
            </div>
            <div className="divide-y divide-gray-700 max-h-[600px] overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-gray-400">Loading...</div>
              ) : complaints.length === 0 ? (
                <div className="p-8 text-center text-gray-400">No complaints found</div>
              ) : (
                complaints.map(complaint => (
                  <div
                    key={complaint.id}
                    onClick={() => handleSelectComplaint(complaint)}
                    className={`p-4 cursor-pointer hover:bg-gray-700/50 transition-colors ${
                      selectedComplaint?.id === complaint.id ? 'bg-gray-700/50' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium border ${STATUS_COLORS[complaint.status]}`}>
                            {complaint.status}
                          </span>
                          {complaint.priority && (
                            <span className={`text-xs font-medium ${PRIORITY_COLORS[complaint.priority]}`}>
                              {complaint.priority.toUpperCase()}
                            </span>
                          )}
                        </div>
                        <h3 className="font-medium text-white">{complaint.subject}</h3>
                        <p className="text-gray-400 text-sm truncate">{complaint.description}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                          <span>{formatWallet(complaint.complainant_wallet)}</span>
                          <span>{formatDate(complaint.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl border border-gray-700">
            {selectedComplaint ? (
              <>
                <div className="p-4 border-b border-gray-700">
                  <h2 className="font-semibold">Complaint Details</h2>
                </div>
                <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
                  <div>
                    <div className="text-gray-400 text-sm mb-1">Subject</div>
                    <div className="font-medium">{selectedComplaint.subject}</div>
                  </div>
                  
                  <div>
                    <div className="text-gray-400 text-sm mb-1">Category</div>
                    <div className="capitalize">{selectedComplaint.category}</div>
                  </div>
                  
                  <div>
                    <div className="text-gray-400 text-sm mb-1">Description</div>
                    <div className="text-gray-300 whitespace-pre-wrap">{selectedComplaint.description}</div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-gray-400 text-sm mb-1">Complainant</div>
                      <div className="font-mono text-sm">{formatWallet(selectedComplaint.complainant_wallet)}</div>
                      {selectedComplaint.complainant_email && (
                        <div className="text-gray-400 text-sm">{selectedComplaint.complainant_email}</div>
                      )}
                    </div>
                    <div>
                      <div className="text-gray-400 text-sm mb-1">Submitted</div>
                      <div className="text-sm">{formatDate(selectedComplaint.created_at)}</div>
                    </div>
                  </div>

                  {selectedComplaint.updates && selectedComplaint.updates.length > 0 && (
                    <div>
                      <div className="text-gray-400 text-sm mb-2">Update History</div>
                      <div className="space-y-2">
                        {selectedComplaint.updates.map(update => (
                          <div key={update.id} className="bg-gray-700/50 rounded-lg p-3 text-sm">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`px-2 py-0.5 rounded text-xs ${STATUS_COLORS[update.status]}`}>
                                {update.status}
                              </span>
                              <span className="text-gray-500 text-xs">{formatDate(update.created_at)}</span>
                            </div>
                            {update.notes && <p className="text-gray-300">{update.notes}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="border-t border-gray-700 pt-4 space-y-3">
                    <h3 className="font-medium">Update Status</h3>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-gray-400 text-sm block mb-1">Status</label>
                        <select
                          value={updateForm.status}
                          onChange={(e) => setUpdateForm(prev => ({ ...prev, status: e.target.value }))}
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                        >
                          <option value="pending">Pending</option>
                          <option value="investigating">Investigating</option>
                          <option value="resolved">Resolved</option>
                          <option value="dismissed">Dismissed</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-gray-400 text-sm block mb-1">Priority</label>
                        <select
                          value={updateForm.priority}
                          onChange={(e) => setUpdateForm(prev => ({ ...prev, priority: e.target.value }))}
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="critical">Critical</option>
                        </select>
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-gray-400 text-sm block mb-1">Notes</label>
                      <textarea
                        value={updateForm.notes}
                        onChange={(e) => setUpdateForm(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Add notes about this update..."
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white h-24 resize-none"
                      />
                    </div>
                    
                    {(updateForm.status === 'resolved' || updateForm.status === 'dismissed') && (
                      <div>
                        <label className="text-gray-400 text-sm block mb-1">Resolution</label>
                        <textarea
                          value={updateForm.resolution}
                          onChange={(e) => setUpdateForm(prev => ({ ...prev, resolution: e.target.value }))}
                          placeholder="Describe the resolution..."
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white h-24 resize-none"
                        />
                      </div>
                    )}
                    
                    <button
                      onClick={handleUpdateComplaint}
                      disabled={updating}
                      className="w-full bg-yellow-500 text-black font-semibold py-2 rounded-lg hover:bg-yellow-400 transition-colors disabled:opacity-50"
                    >
                      {updating ? 'Updating...' : 'Update Complaint'}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-8 text-center text-gray-400">
                Select a complaint to view details
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
