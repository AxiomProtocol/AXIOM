import React from 'react';
import Link from 'next/link';
import { track, StewardEvents } from '../../lib/stewardsAnalytics';

type LandLeadStage = 'new' | 'needsData' | 'qualified' | 'underReview' | 'escalated' | 'declined' | 'pursuing' | 'acquired' | 'archived';

interface LandLead {
  id: number;
  parcelAddress: string;
  county?: string;
  acreage?: number;
  askingPrice?: number;
  stage: LandLeadStage;
  confidenceScore?: number;
  createdAt: string;
  createdBy?: string;
}

interface LandLeadPipelineProps {
  leads: LandLead[];
  onStageChange?: (id: number, newStage: LandLeadStage) => Promise<void>;
  loading?: boolean;
}

export function LandLeadPipeline({ leads, onStageChange, loading }: LandLeadPipelineProps) {
  const stages: { id: LandLeadStage; label: string; color: string }[] = [
    { id: 'new', label: 'New', color: '#7B68EE' },
    { id: 'needsData', label: 'Needs Data', color: '#FFB800' },
    { id: 'qualified', label: 'Qualified', color: '#00D4AA' },
    { id: 'underReview', label: 'Under Review', color: '#00A0D0' },
    { id: 'escalated', label: 'Escalated', color: '#FF6B6B' },
    { id: 'pursuing', label: 'Pursuing', color: '#00D4AA' },
  ];

  const getLeadsByStage = (stage: LandLeadStage) => 
    leads.filter(l => l.stage === stage);

  const formatPrice = (price?: number) => {
    if (!price) return 'N/A';
    return `$${(price / 1000).toFixed(0)}K`;
  };

  const handleDragStart = (e: React.DragEvent, lead: LandLead) => {
    e.dataTransfer.setData('leadId', lead.id.toString());
    e.dataTransfer.setData('currentStage', lead.stage);
  };

  const handleDrop = async (e: React.DragEvent, targetStage: LandLeadStage) => {
    e.preventDefault();
    const leadId = parseInt(e.dataTransfer.getData('leadId'));
    const currentStage = e.dataTransfer.getData('currentStage') as LandLeadStage;
    
    if (currentStage !== targetStage && onStageChange) {
      await onStageChange(leadId, targetStage);
      if (targetStage === 'qualified') {
        track(StewardEvents.LAND_LEAD_QUALIFIED, { leadId });
      } else if (targetStage === 'escalated') {
        track(StewardEvents.LAND_LEAD_ESCALATED, { leadId });
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  if (loading) {
    return (
      <div style={{
        background: '#fff',
        borderRadius: '12px',
        padding: '40px',
        textAlign: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        border: '1px solid rgba(0,0,0,0.06)'
      }}>
        <p style={{ color: '#666' }}>Loading land pipeline...</p>
      </div>
    );
  }

  return (
    <div style={{
      background: '#fff',
      borderRadius: '12px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      border: '1px solid rgba(0,0,0,0.06)',
      overflow: 'hidden'
    }}>
      <div style={{
        padding: '16px',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#1a1a2e' }}>
          Land Pipeline
        </h3>
        <Link
          href="/stewards/dashboard/land?action=add"
          style={{
            padding: '6px 14px',
            borderRadius: '8px',
            background: 'rgba(0,212,170,0.1)',
            color: '#00D4AA',
            fontSize: '12px',
            fontWeight: 600,
            textDecoration: 'none'
          }}
        >
          + Add Lead
        </Link>
      </div>

      <div style={{
        display: 'flex',
        overflowX: 'auto',
        padding: '16px',
        gap: '12px'
      }}>
        {stages.map(stage => {
          const stageLeads = getLeadsByStage(stage.id);
          return (
            <div
              key={stage.id}
              onDrop={(e) => handleDrop(e, stage.id)}
              onDragOver={handleDragOver}
              style={{
                minWidth: '220px',
                flex: '0 0 220px',
                background: 'rgba(0,0,0,0.02)',
                borderRadius: '10px',
                padding: '12px'
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '12px'
              }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: stage.color
                }} />
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#1a1a2e' }}>
                  {stage.label}
                </span>
                <span style={{
                  marginLeft: 'auto',
                  fontSize: '11px',
                  color: '#666',
                  background: 'rgba(0,0,0,0.06)',
                  padding: '2px 8px',
                  borderRadius: '10px'
                }}>
                  {stageLeads.length}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {stageLeads.map(lead => (
                  <div
                    key={lead.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, lead)}
                    style={{
                      background: '#fff',
                      borderRadius: '8px',
                      padding: '12px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                      cursor: 'grab'
                    }}
                  >
                    <p style={{ margin: '0 0 4px', fontSize: '12px', fontWeight: 500, color: '#1a1a2e' }}>
                      {lead.parcelAddress.length > 30 
                        ? lead.parcelAddress.slice(0, 30) + '...' 
                        : lead.parcelAddress}
                    </p>
                    <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: '#666' }}>
                      {lead.county && <span>{lead.county}</span>}
                      {lead.acreage && <span>{lead.acreage} ac</span>}
                      <span>{formatPrice(lead.askingPrice)}</span>
                    </div>
                    {lead.confidenceScore !== undefined && (
                      <div style={{
                        marginTop: '8px',
                        height: '4px',
                        background: 'rgba(0,0,0,0.06)',
                        borderRadius: '2px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          height: '100%',
                          width: `${lead.confidenceScore}%`,
                          background: lead.confidenceScore >= 70 ? '#00D4AA' : lead.confidenceScore >= 40 ? '#FFB800' : '#FF6B6B',
                          borderRadius: '2px'
                        }} />
                      </div>
                    )}
                  </div>
                ))}
                {stageLeads.length === 0 && (
                  <div style={{
                    padding: '20px',
                    textAlign: 'center',
                    color: '#999',
                    fontSize: '12px'
                  }}>
                    No leads
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default LandLeadPipeline;
