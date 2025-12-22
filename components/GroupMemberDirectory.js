import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function GroupMemberDirectory({ groupId, groupName }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (groupId) {
      fetchMembers();
    }
  }, [groupId]);

  const fetchMembers = async () => {
    try {
      const res = await fetch(`/api/susu/groups/${groupId}/members`);
      const data = await res.json();
      if (data.success) {
        setMembers(data.members);
      }
    } catch (err) {
      console.error('Failed to fetch members:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatWallet = (addr) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'organizer':
        return <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-500 text-xs rounded-full">Organizer</span>;
      case 'member':
        return null;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-yellow-500">Loading members...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-white">
          Group Members ({members.length})
        </h3>
      </div>

      {members.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          No members in this group yet.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {members.map((member) => (
            <div
              key={member.id}
              className="bg-gray-800 rounded-lg border border-gray-700 p-4 hover:border-yellow-500/50 transition"
            >
              <div className="flex items-start gap-4">
                <Link href={`/profile/${member.wallet_address}`}>
                  <div className="w-14 h-14 rounded-full bg-yellow-500/20 border border-yellow-500/50 flex items-center justify-center overflow-hidden cursor-pointer hover:border-yellow-500 transition">
                    {member.profile_image_url ? (
                      <img src={member.profile_image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl text-yellow-500">
                        {(member.first_name?.[0] || member.username?.[0] || '?').toUpperCase()}
                      </span>
                    )}
                  </div>
                </Link>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link href={`/profile/${member.wallet_address}`}>
                      <span className="font-semibold text-white hover:text-yellow-500 cursor-pointer">
                        {member.first_name || member.last_name 
                          ? `${member.first_name || ''} ${member.last_name || ''}`.trim()
                          : member.username || formatWallet(member.wallet_address)}
                      </span>
                    </Link>
                    {getRoleBadge(member.role)}
                  </div>
                  
                  {member.occupation && (
                    <p className="text-yellow-500/80 text-sm mt-0.5">{member.occupation}</p>
                  )}
                  
                  {member.location && (
                    <p className="text-gray-400 text-sm">{member.location}</p>
                  )}
                  
                  {member.purpose_statement && (
                    <p className="text-gray-300 text-sm mt-2 line-clamp-2">{member.purpose_statement}</p>
                  )}

                  <div className="flex gap-2 mt-3">
                    {member.email && (
                      <a
                        href={`mailto:${member.email}`}
                        className="p-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition"
                        title="Email"
                      >
                        <svg className="w-4 h-4 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </a>
                    )}
                    {member.phone && (
                      <a
                        href={`tel:${member.phone}`}
                        className="p-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition"
                        title="Call"
                      >
                        <svg className="w-4 h-4 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      </a>
                    )}
                    {member.whatsapp && (
                      <a
                        href={`https://wa.me/${member.whatsapp.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-green-600 rounded-lg hover:bg-green-500 transition"
                        title="WhatsApp"
                      >
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                      </a>
                    )}
                    <Link href={`/profile/${member.wallet_address}`}>
                      <button className="px-3 py-1.5 bg-yellow-500/20 text-yellow-500 text-sm rounded-lg hover:bg-yellow-500/30 transition">
                        View Profile
                      </button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
