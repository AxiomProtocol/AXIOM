import React, { useState } from 'react';
import { track, StewardEvents } from '../../lib/stewardsAnalytics';

type Channel = 'announcements' | 'dropUpdates' | 'stewardInternal' | 'incidentInternal';
type Template = 'dropAnnouncement' | 'reservationOpen' | 'cutoffReminder' | 'pickupInstructions' | 'postDropThankYou' | 'meetingInvite' | 'landSignalOpen' | 'custom';

interface CommunicationsComposerProps {
  regionId: number;
  onSend: (message: {
    channel: Channel;
    subject: string;
    body: string;
    audienceSegment?: string;
    templateUsed?: string;
  }) => Promise<void>;
}

const templates: Record<Template, { subject: string; body: string }> = {
  dropAnnouncement: {
    subject: 'Upcoming Produce Distribution',
    body: 'We are pleased to announce an upcoming produce distribution event.\n\nDate: [DATE]\nLocation: [LOCATION]\nTime Window: [TIME]\n\nReservations are now open. Please reserve your spot to participate.'
  },
  reservationOpen: {
    subject: 'Reservation Window Now Open',
    body: 'The reservation window for the upcoming produce distribution is now open.\n\nPlease visit the dashboard to reserve your spot. Limited capacity available.'
  },
  cutoffReminder: {
    subject: 'Reservation Cutoff Reminder',
    body: 'This is a reminder that the reservation cutoff for the upcoming distribution is approaching.\n\nCutoff: [DATE/TIME]\n\nIf you have not yet reserved your spot, please do so before the cutoff.'
  },
  pickupInstructions: {
    subject: 'Pickup Instructions',
    body: 'Your reservation is confirmed. Please follow these pickup instructions:\n\n1. Arrive during your designated time window\n2. Bring your confirmation (wallet address)\n3. Follow any on-site direction from stewards\n\nThank you for participating!'
  },
  postDropThankYou: {
    subject: 'Thank You for Participating',
    body: 'Thank you for participating in today\'s produce distribution.\n\nWe appreciate your continued support and engagement with the community. If you have any feedback, please let us know.\n\nSee you at the next distribution!'
  },
  meetingInvite: {
    subject: 'Community Meeting Invitation',
    body: 'You are invited to a community meeting.\n\nDate: [DATE]\nTime: [TIME]\nLocation/Link: [LOCATION]\n\nAgenda:\n- [ITEM 1]\n- [ITEM 2]\n- [ITEM 3]\n\nPlease confirm your attendance.'
  },
  landSignalOpen: {
    subject: 'Land Interest Signal Window Open',
    body: 'A new land opportunity is available for community interest signals.\n\nLocation: [LOCATION]\nAcreage: [ACRES]\n\nIf you are interested in learning more about this opportunity, please signal your interest through the dashboard before [DEADLINE].'
  },
  custom: { subject: '', body: '' }
};

export function CommunicationsComposer({ regionId, onSend }: CommunicationsComposerProps) {
  const [channel, setChannel] = useState<Channel>('announcements');
  const [template, setTemplate] = useState<Template>('custom');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const channels: { id: Channel; label: string }[] = [
    { id: 'announcements', label: 'Announcements' },
    { id: 'dropUpdates', label: 'Drop Updates' },
    { id: 'stewardInternal', label: 'Steward Internal' },
    { id: 'incidentInternal', label: 'Incident Internal' }
  ];

  const templateOptions: { id: Template; label: string }[] = [
    { id: 'custom', label: 'Custom Message' },
    { id: 'dropAnnouncement', label: 'Drop Announcement' },
    { id: 'reservationOpen', label: 'Reservation Window Open' },
    { id: 'cutoffReminder', label: 'Cutoff Reminder' },
    { id: 'pickupInstructions', label: 'Pickup Instructions' },
    { id: 'postDropThankYou', label: 'Post-Drop Thank You' },
    { id: 'meetingInvite', label: 'Meeting Invite' },
    { id: 'landSignalOpen', label: 'Land Signal Window Open' }
  ];

  const handleTemplateChange = (newTemplate: Template) => {
    setTemplate(newTemplate);
    if (newTemplate !== 'custom') {
      setSubject(templates[newTemplate].subject);
      setBody(templates[newTemplate].body);
    }
  };

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) return;
    setSending(true);
    try {
      await onSend({
        channel,
        subject,
        body,
        templateUsed: template !== 'custom' ? template : undefined
      });
      track(StewardEvents.MESSAGE_SENT, { channel, template, regionId });
      setSent(true);
      setTimeout(() => {
        setSent(false);
        setSubject('');
        setBody('');
        setTemplate('custom');
      }, 2000);
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{
      background: '#fff',
      borderRadius: '12px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      border: '1px solid rgba(0,0,0,0.06)',
      overflow: 'hidden'
    }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#1a1a2e' }}>
          Compose Message
        </h3>
      </div>

      <div style={{ padding: '20px' }}>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 500, color: '#666' }}>
            Channel
          </label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {channels.map(ch => (
              <button
                key={ch.id}
                onClick={() => setChannel(ch.id)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  background: channel === ch.id ? 'rgba(0,212,170,0.15)' : 'rgba(0,0,0,0.04)',
                  color: channel === ch.id ? '#00D4AA' : '#666',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                {ch.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 500, color: '#666' }}>
            Template
          </label>
          <select
            value={template}
            onChange={(e) => handleTemplateChange(e.target.value as Template)}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid rgba(0,0,0,0.1)',
              fontSize: '13px',
              outline: 'none',
              background: '#fff'
            }}
          >
            {templateOptions.map(t => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 500, color: '#666' }}>
            Subject
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Message subject..."
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid rgba(0,0,0,0.1)',
              fontSize: '13px',
              outline: 'none'
            }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 500, color: '#666' }}>
            Message Body
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your message..."
            rows={8}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid rgba(0,0,0,0.1)',
              fontSize: '13px',
              resize: 'vertical',
              outline: 'none',
              fontFamily: 'inherit'
            }}
          />
        </div>

        <button
          onClick={handleSend}
          disabled={!subject.trim() || !body.trim() || sending}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: '10px',
            border: 'none',
            background: subject.trim() && body.trim() ? '#00D4AA' : 'rgba(0,0,0,0.1)',
            color: subject.trim() && body.trim() ? '#fff' : '#999',
            fontSize: '14px',
            fontWeight: 600,
            cursor: subject.trim() && body.trim() ? 'pointer' : 'not-allowed'
          }}
        >
          {sent ? '✓ Sent!' : sending ? 'Sending...' : 'Send Message'}
        </button>
      </div>
    </div>
  );
}

export default CommunicationsComposer;
