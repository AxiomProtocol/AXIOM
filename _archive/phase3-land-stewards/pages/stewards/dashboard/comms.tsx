import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useWallet } from '../../../components/WalletConnect/WalletContext';
import { DashboardShell, CommunicationsComposer } from '../../../components/stewardsDashboard';
import { track, StewardEvents } from '../../../lib/stewardsAnalytics';

type Channel = 'announcements' | 'dropUpdates' | 'stewardInternal' | 'incidentInternal';

interface Message {
  id: number;
  channel: Channel;
  subject: string;
  body: string;
  sentBy: string;
  sentAt: string;
}

export default function StewardCommsPage() {
  const router = useRouter();
  const { action } = router.query;
  const { walletState } = useWallet();
  const address = walletState?.address;
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [showCompose, setShowCompose] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    track(StewardEvents.DASHBOARD_VIEW, { page: 'communications' });
    if (action === 'compose') {
      setShowCompose(true);
    }
  }, [action]);

  useEffect(() => {
    setLoading(false);
  }, [address]);

  const handleSendMessage = async (message: {
    channel: Channel;
    subject: string;
    body: string;
    audienceSegment?: string;
    templateUsed?: string;
  }) => {
    track(StewardEvents.MESSAGE_SENT, { channel: message.channel });
  };

  const channelLabels: Record<Channel, string> = {
    announcements: 'Announcements',
    dropUpdates: 'Drop Updates',
    stewardInternal: 'Steward Internal',
    incidentInternal: 'Incident Internal'
  };

  return (
    <>
      <Head>
        <title>Communications | Steward Dashboard | Axiom Protocol</title>
      </Head>
      
      <DashboardShell title="Communications">
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 600, color: '#1a1a2e' }}>
            Messaging Center
          </h2>
          <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>
            Communicate with participants and stewards in your region
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: messages.length > 0 ? '1fr 1fr' : '1fr',
          gap: '24px'
        }}>
          <CommunicationsComposer
            regionId={1}
            onSend={handleSendMessage}
          />

          {messages.length > 0 && (
            <div style={{
              background: '#fff',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              border: '1px solid rgba(0,0,0,0.06)',
              overflow: 'hidden'
            }}>
              <div style={{
                padding: '16px 20px',
                borderBottom: '1px solid rgba(0,0,0,0.06)'
              }}>
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#1a1a2e' }}>
                  Recent Messages
                </h3>
              </div>
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {messages.map(msg => (
                  <div
                    key={msg.id}
                    style={{
                      padding: '12px 20px',
                      borderBottom: '1px solid rgba(0,0,0,0.04)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 500, color: '#1a1a2e' }}>
                        {msg.subject}
                      </span>
                      <span style={{
                        fontSize: '10px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: 'rgba(123,104,238,0.1)',
                        color: '#7B68EE'
                      }}>
                        {channelLabels[msg.channel]}
                      </span>
                    </div>
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#666' }}>
                      {new Date(msg.sentAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {messages.length === 0 && !loading && (
          <div style={{
            marginTop: '24px',
            padding: '24px',
            background: 'rgba(0,0,0,0.02)',
            borderRadius: '12px',
            textAlign: 'center'
          }}>
            <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
              No messages sent yet. Use the composer above to send your first message.
            </p>
          </div>
        )}
      </DashboardShell>
    </>
  );
}
