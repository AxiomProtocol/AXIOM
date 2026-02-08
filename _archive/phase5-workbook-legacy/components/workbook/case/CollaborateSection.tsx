import React, { useState, useEffect, useCallback } from 'react';

interface CollaborateSectionProps {
  caseId: string;
}

interface Collaborator {
  id: string;
  email: string;
  name: string;
  role: 'viewer' | 'contributor' | 'admin';
  status: 'pending' | 'active';
  invitedAt: string;
  acceptedAt?: string;
}

interface CaseData {
  case_title: string;
}

export default function CollaborateSection({ caseId }: CollaborateSectionProps) {
  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<'viewer' | 'contributor'>('contributor');
  const [inviteSent, setInviteSent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    if (!caseId) return;

    try {
      setLoading(true);
      const [caseRes, collabRes] = await Promise.all([
        fetch(`/api/workbook/cases/${caseId}`),
        fetch(`/api/workbook/collaborators?caseId=${caseId}`)
      ]);
      
      const caseJson = await caseRes.json();
      setCaseData(caseJson.data);

      const collabJson = await collabRes.json();
      if (collabJson.success) {
        setCollaborators(collabJson.data);
      }
    } catch (err) {
      console.error('Failed to load:', err);
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inviteEmail || !inviteName || !caseId) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/workbook/collaborators?caseId=${caseId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          name: inviteName,
          role: inviteRole,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setCollaborators([json.data, ...collaborators]);
        setInviteEmail('');
        setInviteName('');
        setShowInviteForm(false);
        setInviteSent(true);
        setTimeout(() => setInviteSent(false), 3000);
      }
    } catch (err) {
      console.error('Failed to invite:', err);
      alert('Failed to send invitation. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (collaboratorId: string) => {
    if (!confirm('Remove this collaborator?')) return;
    
    try {
      await fetch(`/api/workbook/collaborators?caseId=${caseId}&collaboratorId=${collaboratorId}`, {
        method: 'DELETE',
      });
      setCollaborators(collaborators.filter(c => c.id !== collaboratorId));
    } catch (err) {
      console.error('Failed to remove:', err);
      alert('Failed to remove collaborator. Please try again.');
    }
  };

  const generateShareLink = () => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    return `${baseUrl}/workbook/case/${caseId}?invite=true`;
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(generateShareLink());
    alert('Share link copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {inviteSent && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <span>✅</span>
          Invitation saved! The collaborator has been added to this case.
        </div>
      )}

      <div className="bg-white rounded-xl border shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Share This Case</h2>
            <p className="text-sm text-gray-600">
              Case: {caseData?.case_title || 'Untitled'}
            </p>
          </div>
          <button
            onClick={copyShareLink}
            className="px-4 py-2 bg-cyan-100 text-cyan-700 rounded-lg hover:bg-cyan-200 transition"
          >
            📋 Copy Link
          </button>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600 mb-2">Share this link with family members:</p>
          <code className="text-sm bg-white px-3 py-2 rounded border block overflow-x-auto">
            {generateShareLink()}
          </code>
        </div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Collaborators</h2>
          <button
            onClick={() => setShowInviteForm(!showInviteForm)}
            className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition"
          >
            + Invite Family Member
          </button>
        </div>

        {showInviteForm && (
          <form onSubmit={handleInvite} className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="Family member's name"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  required
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Permission Level</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as 'viewer' | 'contributor')}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="viewer">Viewer - Can view but not edit</option>
                <option value="contributor">Contributor - Can add family members and notes</option>
              </select>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowInviteForm(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Send Invitation'}
              </button>
            </div>
          </form>
        )}

        {collaborators.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-4">👥</div>
            <p>No collaborators added yet.</p>
            <p className="text-sm mt-1">Invite family members to help with research!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {collaborators.map(collaborator => (
              <div
                key={collaborator.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-600 font-medium">
                    {collaborator.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{collaborator.name}</div>
                    <div className="text-sm text-gray-500">{collaborator.email}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      collaborator.role === 'contributor' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {collaborator.role === 'contributor' ? 'Contributor' : 'Viewer'}
                    </span>
                    <div className={`text-xs mt-1 ${
                      collaborator.status === 'pending' ? 'text-amber-600' : 'text-green-600'
                    }`}>
                      {collaborator.status === 'pending' ? 'Pending' : 'Active'}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleRemove(collaborator.id)}
                    className="text-gray-400 hover:text-red-600"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Why Collaborate?</h2>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 bg-cyan-50 rounded-lg">
            <div className="text-2xl mb-2">🌳</div>
            <h3 className="font-medium text-cyan-900">Complete the Family Tree</h3>
            <p className="text-sm text-cyan-700 mt-1">
              Different family members know different branches. Combining knowledge reveals the full picture.
            </p>
          </div>
          
          <div className="p-4 bg-teal-50 rounded-lg">
            <div className="text-2xl mb-2">📷</div>
            <h3 className="font-medium text-teal-900">Share Photos & Documents</h3>
            <p className="text-sm text-teal-700 mt-1">
              Elderly relatives often have old deeds, photos, and family Bibles with crucial information.
            </p>
          </div>
          
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="text-2xl mb-2">🔗</div>
            <h3 className="font-medium text-green-900">Identify All Heirs</h3>
            <p className="text-sm text-green-700 mt-1">
              Heir property requires locating every legal heir. Family collaboration helps find lost branches.
            </p>
          </div>
          
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl mb-2">💪</div>
            <h3 className="font-medium text-blue-900">Unite for Action</h3>
            <p className="text-sm text-blue-700 mt-1">
              Resolving heir property requires agreement among heirs. Start building consensus early.
            </p>
          </div>
        </div>

        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <h3 className="font-medium text-amber-800 mb-2">💡 Pro Tip: Start with Elders</h3>
          <p className="text-sm text-amber-700">
            The oldest family members often have oral histories and documents that aren't recorded anywhere else. 
            Invite them first, or offer to help them add their knowledge to the family tree.
          </p>
        </div>
      </div>
    </div>
  );
}
