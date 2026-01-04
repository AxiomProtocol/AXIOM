import React, { useState } from 'react';
import Head from 'next/head';
import { SiteLayout } from '../../components/navigation';
import { web3Theme } from '../../components/axiomRebuild/styles/web3Theme';

interface Template {
  id: string;
  platform: string;
  type: string;
  title: string;
  content: string;
  hashtags: string[];
  notes?: string;
}

const TEMPLATES: Template[] = [
  {
    id: 'ig-reel-hook',
    platform: 'Instagram/TikTok',
    type: 'Short Video Hook',
    title: 'The Land Movement Hook',
    content: `What if you could be first in line for land access in your city?

Not in 10 years. Not after you're rich.

Right now.

We're building a corps of 250 stewards to coordinate land activation across America.

You'd lead produce drops in your area.
Connect landowners with activation opportunities.
Get first access to properties before anyone else.

This isn't a job. It's a movement.

Link in bio to express interest.`,
    hashtags: ['#landaccess', '#communitybuilding', '#stewardship', '#axiom', '#realestate', '#urbanfarming'],
    notes: 'Use this as a voiceover for B-roll of land, farming, community events'
  },
  {
    id: 'ig-story-urgency',
    platform: 'Instagram Stories',
    type: 'Story Sequence',
    title: '3-Part Story Sequence',
    content: `STORY 1:
"We need 250 people."
(Text on screen, dramatic pause)

STORY 2:
"To lead the land movement in their city."
"Atlanta. Houston. Chicago. LA. Miami."
"First access. Real responsibility."

STORY 3:
"Not a job. A corps."
"Link in bio if you're ready to lead."`,
    hashtags: ['#stewardcorps', '#landmovement'],
    notes: 'Post as 3 sequential stories with countdown sticker on last one'
  },
  {
    id: 'twitter-thread',
    platform: 'Twitter/X',
    type: 'Thread',
    title: 'Why I Became a Steward Thread',
    content: `Thread idea - personalize with your own story:

1/ I just became a Steward with @AxiomProtocol

Here's what that actually means and why I'm excited:

2/ For years I've wanted land access. Not just to own - but to USE.

To grow food. To gather. To build something real in my community.

3/ The problem? Either you need $500K to buy property, or you wait for someone else to figure it out.

Neither worked for me.

4/ Axiom is doing something different.

They're coordinating a network of Stewards who:
- Lead produce drops in their city
- Activate underutilized land
- Connect landowners with the community

5/ It's not ownership. It's access and responsibility.

And Stewards get first access to properties before general participants.

6/ They're recruiting 250 of us in the next 90 days.

If you care about land, community, or just want to be part of something real - check it out.

[link to /stewards/recruit]`,
    hashtags: ['#Axiom', '#Stewardship', '#LandAccess', '#CommunityBuilding']
  },
  {
    id: 'linkedin-post',
    platform: 'LinkedIn',
    type: 'Professional Post',
    title: 'Leadership Opportunity Angle',
    content: `I just learned about an interesting model for community land coordination.

Axiom Protocol is building a "Steward Corps" - a network of local leaders who:

→ Coordinate produce distribution in their regions
→ Activate underutilized land through community stewardship
→ Connect landowners with productive opportunities

It's not employment. It's a new kind of civic participation.

They're looking for 250 people across 10+ regions to lead this movement.

What caught my attention: it's real coordination work with real responsibility, not just another community building exercise.

If you're interested in urban agriculture, real estate, or community development - this is worth a look.

[link]`,
    hashtags: ['#CommunityDevelopment', '#UrbanAgriculture', '#Leadership', '#RealEstate']
  },
  {
    id: 'facebook-community',
    platform: 'Facebook',
    type: 'Community Group Post',
    title: 'Local Group Outreach',
    content: `Hey [GROUP NAME] family 👋

I wanted to share something I've been looking into.

There's a new initiative called Axiom that's coordinating land stewardship in [CITY/REGION].

They're looking for local leaders to:
• Run produce drops
• Activate unused land for community use
• Connect with landowners who want to see their property put to good use

It's not paid work - but Stewards get first access to land opportunities and are building something real for our community.

They need 250 stewards across the country in the next 90 days.

If this sounds interesting, I can share more or drop the link. 

Who else thinks [CITY] needs more of this energy?`,
    hashtags: []
  },
  {
    id: 'dm-outreach',
    platform: 'Direct Message',
    type: 'Personal Outreach',
    title: 'DM to Potential Steward',
    content: `Hey [NAME]!

I've been following your work with [THEIR PROJECT/INTEREST] and thought you might be interested in something I'm part of.

There's a new initiative called Axiom that's building a Steward Corps - a network of local leaders coordinating land access and produce distribution.

I immediately thought of you because [SPECIFIC REASON - their community work, interest in land, leadership qualities].

They're looking for 250 people across 10+ regions. It's not a job - more like a movement you help lead.

Would you be open to checking it out? I can send you the link if interested.

No pressure either way - just thought it aligned with what you're already doing.`,
    hashtags: [],
    notes: 'Personalize heavily. Reference something specific about their work.'
  },
  {
    id: 'short-caption',
    platform: 'Any',
    type: 'Short Caption',
    title: 'Quick Post Variations',
    content: `VARIATION 1:
250 stewards. 90 days. 10+ regions.
We're building a land movement.
Link in bio.

VARIATION 2:
Want first access to land in your city?
Not speculation. Coordination.
Steward applications open →

VARIATION 3:
This isn't about buying land.
It's about using it.
Leading your community's access.
250 stewards needed.

VARIATION 4:
Land access shouldn't require $500K.
We're building another path.
Join the Steward Corps.`,
    hashtags: ['#stewardcorps', '#landaccess', '#axiom', '#communitybuilding']
  }
];

export default function SocialTemplatesPage() {
  const [copied, setCopied] = useState<string | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');

  const platforms = ['all', ...Array.from(new Set(TEMPLATES.map(t => t.platform)))];

  const filteredTemplates = TEMPLATES.filter(t => 
    selectedPlatform === 'all' || t.platform === selectedPlatform
  );

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <SiteLayout>
      <Head>
        <title>Social Content Templates | Steward Recruitment</title>
      </Head>

      <main style={{ minHeight: '100vh', background: '#F9FAFB', padding: '32px 24px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ marginBottom: '32px' }}>
            <h1 style={{ fontSize: '32px', fontWeight: 700, color: '#1F2937', marginBottom: '8px' }}>
              Social Content Templates
            </h1>
            <p style={{ fontSize: '16px', color: '#6B7280', marginBottom: '24px' }}>
              Ready-to-use content for recruiting stewards. Copy, personalize, and post.
            </p>

            <div style={{
              padding: '16px 20px',
              background: 'linear-gradient(135deg, rgba(0, 212, 170, 0.1) 0%, rgba(123, 104, 238, 0.1) 100%)',
              borderRadius: '12px',
              marginBottom: '24px'
            }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#1F2937', marginBottom: '8px' }}>
                🔗 Recruitment Link
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <code style={{
                  flex: 1,
                  padding: '10px 14px',
                  background: '#FFFFFF',
                  borderRadius: '8px',
                  fontSize: '14px',
                  color: '#4B5563'
                }}>
                  axiomprotocol.app/stewards/recruit
                </code>
                <button
                  onClick={() => copyToClipboard('link', 'https://axiomprotocol.app/stewards/recruit')}
                  style={{
                    padding: '10px 16px',
                    background: web3Theme.colors.primary,
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer'
                  }}
                >
                  {copied === 'link' ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {platforms.map(p => (
                <button
                  key={p}
                  onClick={() => setSelectedPlatform(p)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '20px',
                    border: 'none',
                    background: selectedPlatform === p ? '#1F2937' : '#FFFFFF',
                    color: selectedPlatform === p ? '#FFFFFF' : '#6B7280',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                  }}
                >
                  {p === 'all' ? 'All Platforms' : p}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {filteredTemplates.map(template => (
              <div
                key={template.id}
                style={{
                  background: '#FFFFFF',
                  borderRadius: '16px',
                  padding: '24px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                      <span style={{
                        padding: '4px 10px',
                        background: '#DBEAFE',
                        color: '#1D4ED8',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 500
                      }}>
                        {template.platform}
                      </span>
                      <span style={{
                        padding: '4px 10px',
                        background: '#F3F4F6',
                        color: '#6B7280',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 500
                      }}>
                        {template.type}
                      </span>
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1F2937', margin: 0 }}>
                      {template.title}
                    </h3>
                  </div>
                  <button
                    onClick={() => copyToClipboard(template.id, template.content + (template.hashtags.length ? '\n\n' + template.hashtags.join(' ') : ''))}
                    style={{
                      padding: '8px 16px',
                      background: copied === template.id ? '#D1FAE5' : '#F3F4F6',
                      color: copied === template.id ? '#059669' : '#4B5563',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer'
                    }}
                  >
                    {copied === template.id ? '✓ Copied' : 'Copy All'}
                  </button>
                </div>

                <pre style={{
                  background: '#F9FAFB',
                  padding: '16px',
                  borderRadius: '10px',
                  fontSize: '14px',
                  lineHeight: 1.6,
                  color: '#374151',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  margin: 0,
                  fontFamily: 'inherit'
                }}>
                  {template.content}
                </pre>

                {template.hashtags.length > 0 && (
                  <div style={{ marginTop: '16px' }}>
                    <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '8px' }}>Hashtags:</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {template.hashtags.map(tag => (
                        <span key={tag} style={{
                          padding: '4px 10px',
                          background: '#EEF2FF',
                          color: '#6366F1',
                          borderRadius: '12px',
                          fontSize: '13px'
                        }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {template.notes && (
                  <div style={{
                    marginTop: '16px',
                    padding: '12px 16px',
                    background: '#FEF3C7',
                    borderRadius: '8px',
                    fontSize: '13px',
                    color: '#92400E'
                  }}>
                    💡 {template.notes}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{
            marginTop: '40px',
            padding: '24px',
            background: '#FFFFFF',
            borderRadius: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1F2937', marginBottom: '16px' }}>
              Tips for Effective Posts
            </h3>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <li style={{ display: 'flex', gap: '12px', fontSize: '14px', color: '#4B5563' }}>
                <span>✓</span>
                <span><strong>Personalize</strong> - Add your own story, especially for longer posts</span>
              </li>
              <li style={{ display: 'flex', gap: '12px', fontSize: '14px', color: '#4B5563' }}>
                <span>✓</span>
                <span><strong>Localize</strong> - Mention your city/region by name</span>
              </li>
              <li style={{ display: 'flex', gap: '12px', fontSize: '14px', color: '#4B5563' }}>
                <span>✓</span>
                <span><strong>Tag strategically</strong> - Use 3-5 relevant hashtags, not all at once</span>
              </li>
              <li style={{ display: 'flex', gap: '12px', fontSize: '14px', color: '#4B5563' }}>
                <span>✓</span>
                <span><strong>Engage</strong> - Respond to comments and DMs promptly</span>
              </li>
              <li style={{ display: 'flex', gap: '12px', fontSize: '14px', color: '#4B5563' }}>
                <span>✓</span>
                <span><strong>Post consistently</strong> - 3-5x per week across platforms</span>
              </li>
            </ul>
          </div>
        </div>
      </main>
    </SiteLayout>
  );
}
