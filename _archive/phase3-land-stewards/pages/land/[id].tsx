import React, { useState, useEffect, FormEvent } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

interface ChecklistItem {
  id: number;
  category: string;
  taskName: string;
  description: string;
  isRequired: boolean;
  isCompleted: boolean;
  completedBy?: string;
  completedAt?: string;
  notes?: string;
}

interface Comment {
  id: number;
  userAddress?: string;
  userName: string;
  content: string;
  isEdited: boolean;
  upvotes: number;
  createdAt: string;
  replyCount: number;
  replies: Comment[];
}

interface HistoryEvent {
  id: number;
  eventType: string;
  eventTitle: string;
  eventDescription?: string;
  oldValue?: string;
  newValue?: string;
  createdAt: string;
  icon: string;
}

interface LandCandidate {
  id: number;
  name: string;
  location?: string;
  county?: string;
  state?: string;
  acreage?: string;
  askingPrice?: string;
  propertyType?: string;
  stage: string;
  stewardshipIntent?: string;
  publicSummary?: string;
  featuredImageUrl?: string;
  listingUrl?: string;
  dueDiligenceProgress?: number;
  isAccessVerified?: boolean;
  isTitleReviewed?: boolean;
  isSurveyVerified?: boolean;
  isEnvironmentalScreened?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const STAGE_LABELS: Record<string, { label: string; color: string }> = {
  candidate: { label: "Candidate", color: "#3b82f6" },
  under_review: { label: "Under Review", color: "#f59e0b" },
  due_diligence: { label: "Due Diligence", color: "#8b5cf6" },
  ready_for_vote: { label: "Ready For Vote", color: "#06b6d4" },
  approved_for_execution: { label: "Approved", color: "#10b981" },
  acquired: { label: "Acquired", color: "#22c55e" },
  archived: { label: "Archived", color: "#6b7280" }
};

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  agricultural: "Agricultural",
  mixed_use: "Mixed Use",
  residential: "Residential",
  urban: "Urban",
  recreational: "Recreational",
  commercial: "Commercial"
};

export default function LandCandidateDetail() {
  const router = useRouter();
  const { id } = router.query;
  
  const [candidate, setCandidate] = useState<LandCandidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'checklist' | 'discussion' | 'timeline'>('overview');
  
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [checklistProgress, setChecklistProgress] = useState({ total: 0, completed: 0, percentage: 0 });
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [history, setHistory] = useState<HistoryEvent[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    if (!id) return;

    async function fetchCandidate() {
      try {
        const res = await fetch(`/api/land/candidates/${id}`);
        const data = await res.json();

        if (data.success) {
          setCandidate(data.data);
          
          fetch('/api/land/analytics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              candidateId: id, 
              action: 'view',
              userAgent: navigator.userAgent
            })
          }).catch(() => {});

          Promise.all([
            fetch(`/api/land/candidates/${id}/checklist`).then(r => r.json()),
            fetch(`/api/land/candidates/${id}/comments`).then(r => r.json()),
            fetch(`/api/land/candidates/${id}/history`).then(r => r.json()),
          ]).then(([checklistData, commentsData, historyData]) => {
            if (checklistData.success) {
              setChecklist(checklistData.data.items || []);
              setChecklistProgress(checklistData.data.overall || { total: 0, completed: 0, percentage: 0 });
            }
            if (commentsData.success) {
              setComments(commentsData.data || []);
            }
            if (historyData.success) {
              setHistory(historyData.data || []);
            }
          }).catch(console.error);
        } else {
          setError(data.error || 'Land candidate not found');
        }
      } catch (err) {
        console.error('Failed to fetch land candidate:', err);
        setError('Failed to load land candidate');
      } finally {
        setLoading(false);
      }
    }

    fetchCandidate();
  }, [id]);

  const handleSubmitComment = async (e: FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !id) return;
    
    setSubmittingComment(true);
    try {
      const res = await fetch(`/api/land/candidates/${id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment, userName: 'Community Member' })
      });
      const data = await res.json();
      if (data.success) {
        setComments(prev => [data.data, ...prev]);
        setNewComment('');
      }
    } catch (err) {
      console.error('Failed to post comment:', err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!id) return;
    window.open(`/api/land/candidates/${id}/pdf`, '_blank');
  };

  const handleToggleSubscription = async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/land/candidates/${id}/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAddress: 'anonymous', isEnabled: !isSubscribed })
      });
      const data = await res.json();
      if (data.success) {
        setIsSubscribed(!isSubscribed);
      }
    } catch (err) {
      console.error('Failed to toggle subscription:', err);
    }
  };

  const formatCurrency = (value?: string) => {
    if (!value) return "N/A";
    return `$${parseInt(value).toLocaleString()}`;
  };

  const stageInfo = candidate ? STAGE_LABELS[candidate.stage] || { label: candidate.stage, color: "#6b7280" } : null;

  return (
    <>
      <Head>
        <title>{candidate?.name || 'Land Candidate'} | Axiom Protocol</title>
        <meta name="description" content={candidate?.publicSummary || 'View details about this land stewardship candidate.'} />
      </Head>

      <div style={{ background: "#FFFFFF", minHeight: "100vh" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "40px 20px" }}>
          <Link href="/land" style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            color: "#00A389",
            textDecoration: "none",
            fontSize: "14px",
            fontWeight: 500,
            marginBottom: "24px"
          }}>
            <span style={{ fontSize: "18px" }}>&larr;</span>
            Back to Land Candidates
          </Link>

          {loading ? (
            <div style={{ textAlign: "center", padding: "80px 20px", color: "#64748b" }}>
              Loading...
            </div>
          ) : error ? (
            <div style={{ 
              textAlign: "center", 
              padding: "80px 20px",
              background: "rgba(239, 68, 68, 0.1)",
              borderRadius: "12px",
              color: "#dc2626"
            }}>
              <h2 style={{ fontSize: "24px", marginBottom: "12px" }}>Not Found</h2>
              <p>{error}</p>
              <Link href="/land" style={{
                display: "inline-block",
                marginTop: "20px",
                padding: "12px 24px",
                background: "#00A389",
                color: "#fff",
                borderRadius: "8px",
                textDecoration: "none",
                fontWeight: 600
              }}>
                View All Candidates
              </Link>
            </div>
          ) : candidate ? (
            <div>
              <div className="land-detail-grid" style={{
                display: "grid",
                gridTemplateColumns: "1fr 400px",
                gap: "40px"
              }}>
                <div>
                  <div style={{
                    aspectRatio: "16/9",
                    borderRadius: "16px",
                    overflow: "hidden",
                    background: candidate.featuredImageUrl
                      ? `url(${candidate.featuredImageUrl}) center/cover`
                      : "linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "24px"
                  }}>
                    {!candidate.featuredImageUrl && (
                      <span style={{ color: "#9ca3af", fontSize: "16px" }}>No Image Available</span>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: "4px", marginBottom: "24px", flexWrap: "wrap", borderBottom: "1px solid #e5e7eb", paddingBottom: "8px" }}>
                    {[
                      { key: 'overview', label: 'Overview' },
                      { key: 'checklist', label: `Checklist${checklistProgress.total > 0 ? ` (${checklistProgress.completed}/${checklistProgress.total})` : ''}` },
                      { key: 'discussion', label: `Discussion${comments.length > 0 ? ` (${comments.length})` : ''}` },
                      { key: 'timeline', label: 'Timeline' }
                    ].map(tab => (
                      <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key as any)}
                        style={{
                          padding: "10px 16px",
                          background: activeTab === tab.key ? "#00A389" : "transparent",
                          color: activeTab === tab.key ? "#fff" : "#64748b",
                          border: "none",
                          borderRadius: "8px",
                          fontSize: "14px",
                          fontWeight: 500,
                          cursor: "pointer",
                          transition: "all 0.2s"
                        }}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {activeTab === 'overview' && (
                    <>
                      <div style={{ marginBottom: "32px" }}>
                        <h2 style={{ fontSize: "18px", fontWeight: 600, color: "#1a1a2e", marginBottom: "12px" }}>
                          Stewardship Intent
                        </h2>
                        <p style={{ color: "#4b5563", lineHeight: 1.7, fontSize: "15px" }}>
                          {candidate.stewardshipIntent || "No stewardship intent has been defined yet."}
                        </p>
                      </div>

                      <div style={{ marginBottom: "32px" }}>
                        <h2 style={{ fontSize: "18px", fontWeight: 600, color: "#1a1a2e", marginBottom: "12px" }}>
                          About This Property
                        </h2>
                        <p style={{ color: "#4b5563", lineHeight: 1.7, fontSize: "15px" }}>
                          {candidate.publicSummary || "No public summary available."}
                        </p>
                      </div>

                      <div>
                        <h2 style={{ fontSize: "18px", fontWeight: 600, color: "#1a1a2e", marginBottom: "16px" }}>
                          Due Diligence Progress
                        </h2>
                        
                        <div style={{ marginBottom: "16px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                            <span style={{ color: "#64748b", fontSize: "14px" }}>Overall Progress</span>
                            <span style={{ fontWeight: 600, color: "#1a1a2e" }}>{checklistProgress.percentage || 0}%</span>
                          </div>
                          <div style={{ height: "8px", background: "#e5e7eb", borderRadius: "4px", overflow: "hidden" }}>
                            <div style={{
                              height: "100%",
                              width: `${checklistProgress.percentage || 0}%`,
                              background: "linear-gradient(90deg, #00A389 0%, #22c55e 100%)",
                              borderRadius: "4px",
                              transition: "width 0.3s ease"
                            }} />
                          </div>
                        </div>

                        <div className="due-diligence-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px" }}>
                          {[
                            { key: "isAccessVerified", label: "Access Verified" },
                            { key: "isTitleReviewed", label: "Title Reviewed" },
                            { key: "isSurveyVerified", label: "Survey Verified" },
                            { key: "isEnvironmentalScreened", label: "Environmental Screening" }
                          ].map(check => {
                            const isComplete = (candidate as any)[check.key];
                            return (
                              <div key={check.key} style={{
                                display: "flex", alignItems: "center", gap: "10px", padding: "12px",
                                background: isComplete ? "rgba(34, 197, 94, 0.1)" : "#f9fafb",
                                borderRadius: "8px", border: `1px solid ${isComplete ? "rgba(34, 197, 94, 0.3)" : "#e5e7eb"}`
                              }}>
                                <span style={{
                                  width: "20px", height: "20px", borderRadius: "50%",
                                  background: isComplete ? "#22c55e" : "#d1d5db", color: "#fff",
                                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px"
                                }}>
                                  {isComplete ? "✓" : ""}
                                </span>
                                <span style={{ fontSize: "14px", color: isComplete ? "#166534" : "#6b7280" }}>
                                  {check.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}

                  {activeTab === 'checklist' && (
                    <div>
                      <h2 style={{ fontSize: "18px", fontWeight: 600, color: "#1a1a2e", marginBottom: "20px" }}>
                        Due Diligence Checklist
                      </h2>
                      {checklist.length === 0 ? (
                        <div style={{ padding: "40px", textAlign: "center", background: "#f9fafb", borderRadius: "12px", color: "#64748b" }}>
                          No checklist items yet. Checklist is generated when property enters Due Diligence stage.
                        </div>
                      ) : (
                        <>
                          {['title', 'environmental', 'survey', 'access', 'zoning', 'financial'].map(category => {
                            const items = checklist.filter(i => i.category === category);
                            if (items.length === 0) return null;
                            const categoryLabels: Record<string, string> = {
                              title: 'Title & Ownership', environmental: 'Environmental', survey: 'Survey & Boundaries',
                              access: 'Access & Utilities', zoning: 'Zoning & Restrictions', financial: 'Financial'
                            };
                            return (
                              <div key={category} style={{ marginBottom: "24px" }}>
                                <h3 style={{ fontSize: "14px", fontWeight: 600, color: "#7B68EE", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                  {categoryLabels[category]}
                                </h3>
                                {items.map(item => (
                                  <div key={item.id} style={{
                                    display: "flex", alignItems: "flex-start", gap: "12px", padding: "14px",
                                    background: item.isCompleted ? "rgba(34, 197, 94, 0.05)" : "#fff",
                                    borderRadius: "10px", border: `1px solid ${item.isCompleted ? "rgba(34, 197, 94, 0.2)" : "#e5e7eb"}`, marginBottom: "8px"
                                  }}>
                                    <span style={{
                                      width: "22px", height: "22px", borderRadius: "6px", flexShrink: 0,
                                      background: item.isCompleted ? "#22c55e" : "#e5e7eb", color: "#fff",
                                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px"
                                    }}>
                                      {item.isCompleted ? "✓" : ""}
                                    </span>
                                    <div style={{ flex: 1 }}>
                                      <div style={{ fontWeight: 500, color: item.isCompleted ? "#166534" : "#1a1a2e", fontSize: "14px" }}>
                                        {item.taskName}
                                      </div>
                                      <div style={{ fontSize: "13px", color: "#64748b", marginTop: "4px" }}>{item.description}</div>
                                      {item.notes && (
                                        <div style={{ fontSize: "12px", color: "#7B68EE", marginTop: "6px", fontStyle: "italic" }}>
                                          Note: {item.notes}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            );
                          })}
                        </>
                      )}
                    </div>
                  )}

                  {activeTab === 'discussion' && (
                    <div>
                      <h2 style={{ fontSize: "18px", fontWeight: 600, color: "#1a1a2e", marginBottom: "20px" }}>
                        Community Discussion
                      </h2>
                      
                      <form onSubmit={handleSubmitComment} style={{ marginBottom: "24px" }}>
                        <textarea
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Share your thoughts about this property..."
                          style={{
                            width: "100%", padding: "14px", border: "1px solid #e5e7eb", borderRadius: "10px",
                            fontSize: "14px", resize: "vertical", minHeight: "100px", fontFamily: "inherit"
                          }}
                        />
                        <button
                          type="submit"
                          disabled={!newComment.trim() || submittingComment}
                          style={{
                            marginTop: "12px", padding: "12px 24px", background: newComment.trim() ? "#00A389" : "#d1d5db",
                            color: "#fff", border: "none", borderRadius: "8px", fontWeight: 600, fontSize: "14px",
                            cursor: newComment.trim() ? "pointer" : "not-allowed"
                          }}
                        >
                          {submittingComment ? 'Posting...' : 'Post Comment'}
                        </button>
                      </form>

                      {comments.length === 0 ? (
                        <div style={{ padding: "40px", textAlign: "center", background: "#f9fafb", borderRadius: "12px", color: "#64748b" }}>
                          No comments yet. Be the first to share your thoughts!
                        </div>
                      ) : (
                        <div>
                          {comments.map(comment => (
                            <div key={comment.id} style={{
                              padding: "16px", background: "#f9fafb", borderRadius: "12px", marginBottom: "12px"
                            }}>
                              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                                <span style={{ fontWeight: 600, color: "#1a1a2e", fontSize: "14px" }}>
                                  {comment.userName}
                                  {comment.isEdited && <span style={{ fontSize: "11px", color: "#9ca3af", marginLeft: "8px" }}>(edited)</span>}
                                </span>
                                <span style={{ fontSize: "12px", color: "#9ca3af" }}>
                                  {new Date(comment.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              <p style={{ color: "#4b5563", fontSize: "14px", lineHeight: 1.6, margin: 0 }}>
                                {comment.content}
                              </p>
                              {comment.replies.length > 0 && (
                                <div style={{ marginTop: "12px", paddingLeft: "16px", borderLeft: "2px solid #e5e7eb" }}>
                                  {comment.replies.map(reply => (
                                    <div key={reply.id} style={{ marginBottom: "8px" }}>
                                      <span style={{ fontWeight: 500, fontSize: "13px", color: "#1a1a2e" }}>{reply.userName}: </span>
                                      <span style={{ fontSize: "13px", color: "#4b5563" }}>{reply.content}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'timeline' && (
                    <div>
                      <h2 style={{ fontSize: "18px", fontWeight: 600, color: "#1a1a2e", marginBottom: "20px" }}>
                        Activity Timeline
                      </h2>
                      {history.length === 0 ? (
                        <div style={{ padding: "40px", textAlign: "center", background: "#f9fafb", borderRadius: "12px", color: "#64748b" }}>
                          No activity recorded yet.
                        </div>
                      ) : (
                        <div style={{ position: "relative", paddingLeft: "24px" }}>
                          <div style={{ position: "absolute", left: "7px", top: "0", bottom: "0", width: "2px", background: "#e5e7eb" }} />
                          {history.map((event, index) => (
                            <div key={event.id} style={{ position: "relative", marginBottom: "20px" }}>
                              <div style={{
                                position: "absolute", left: "-24px", width: "16px", height: "16px",
                                borderRadius: "50%", background: "#fff", border: "2px solid #00A389",
                                display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px"
                              }}>
                                {event.icon}
                              </div>
                              <div style={{ background: "#f9fafb", borderRadius: "10px", padding: "14px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                                  <span style={{ fontWeight: 600, color: "#1a1a2e", fontSize: "14px" }}>{event.eventTitle}</span>
                                  <span style={{ fontSize: "12px", color: "#9ca3af" }}>
                                    {new Date(event.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                                {event.eventDescription && (
                                  <p style={{ color: "#64748b", fontSize: "13px", margin: 0 }}>{event.eventDescription}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <div className="land-detail-sidebar" style={{
                    background: "#f9fafb",
                    borderRadius: "16px",
                    padding: "24px",
                    border: "1px solid #e5e7eb",
                    position: "sticky",
                    top: "100px"
                  }}>
                    <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
                      {stageInfo && (
                        <span style={{
                          padding: "6px 12px",
                          borderRadius: "100px",
                          fontSize: "12px",
                          fontWeight: 600,
                          background: `${stageInfo.color}20`,
                          color: stageInfo.color
                        }}>
                          {stageInfo.label}
                        </span>
                      )}
                      <span style={{
                        padding: "6px 12px",
                        borderRadius: "100px",
                        fontSize: "12px",
                        fontWeight: 500,
                        background: "#e5e7eb",
                        color: "#4b5563"
                      }}>
                        {PROPERTY_TYPE_LABELS[candidate.propertyType || ''] || candidate.propertyType}
                      </span>
                    </div>

                    <h1 style={{ 
                      fontSize: "24px", 
                      fontWeight: 700, 
                      color: "#1a1a2e",
                      marginBottom: "8px",
                      lineHeight: 1.3
                    }}>
                      {candidate.name}
                    </h1>

                    <p style={{ 
                      color: "#64748b", 
                      fontSize: "15px",
                      marginBottom: "24px"
                    }}>
                      {candidate.location}
                      {candidate.county && ` • ${candidate.county} County`}
                    </p>

                    <div className="land-stats-grid" style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "16px",
                      marginBottom: "24px"
                    }}>
                      <div style={{
                        background: "#fff",
                        padding: "16px",
                        borderRadius: "12px",
                        border: "1px solid #e5e7eb"
                      }}>
                        <div style={{ fontSize: "24px", fontWeight: 700, color: "#00A389" }}>
                          {parseFloat(candidate.acreage || '0').toLocaleString()}
                        </div>
                        <div style={{ fontSize: "13px", color: "#64748b" }}>Acres</div>
                      </div>
                      <div style={{
                        background: "#fff",
                        padding: "16px",
                        borderRadius: "12px",
                        border: "1px solid #e5e7eb"
                      }}>
                        <div style={{ fontSize: "24px", fontWeight: 700, color: "#d4af37" }}>
                          {formatCurrency(candidate.askingPrice)}
                        </div>
                        <div style={{ fontSize: "13px", color: "#64748b" }}>Asking Price</div>
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
                      <button
                        onClick={handleDownloadPDF}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                          padding: "12px", background: "#fff", color: "#1a1a2e", textAlign: "center",
                          borderRadius: "10px", fontWeight: 600, fontSize: "14px", border: "1px solid #e5e7eb",
                          cursor: "pointer"
                        }}
                      >
                        📄 Download PDF Summary
                      </button>
                      
                      <button
                        onClick={handleToggleSubscription}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                          padding: "12px", background: isSubscribed ? "rgba(0, 163, 137, 0.1)" : "#fff",
                          color: isSubscribed ? "#00A389" : "#64748b", textAlign: "center",
                          borderRadius: "10px", fontWeight: 600, fontSize: "14px",
                          border: `1px solid ${isSubscribed ? "#00A389" : "#e5e7eb"}`,
                          cursor: "pointer"
                        }}
                      >
                        {isSubscribed ? "🔔 Subscribed to Updates" : "🔕 Get Notified of Updates"}
                      </button>

                      {candidate.listingUrl && (
                        <a
                          href={candidate.listingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                            padding: "12px", background: "#fff", color: "#3b82f6", textAlign: "center",
                            borderRadius: "10px", textDecoration: "none", fontWeight: 600, fontSize: "14px",
                            border: "1px solid #3b82f6"
                          }}
                        >
                          🔗 View Original Listing
                        </a>
                      )}

                      <Link
                        href={`/land/compare?ids=${candidate.id}`}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                          padding: "12px", background: "#fff", color: "#7B68EE", textAlign: "center",
                          borderRadius: "10px", textDecoration: "none", fontWeight: 600, fontSize: "14px",
                          border: "1px solid #7B68EE"
                        }}
                      >
                        ⚖️ Compare Properties
                      </Link>
                    </div>

                    <div style={{
                      padding: "16px",
                      background: "rgba(123, 104, 238, 0.1)",
                      borderRadius: "12px",
                      border: "1px solid rgba(123, 104, 238, 0.2)"
                    }}>
                      <p style={{ 
                        fontSize: "13px", 
                        color: "#7B68EE",
                        lineHeight: 1.6
                      }}>
                        <strong>Note:</strong> Land candidates are not offerings. They are properties under review for potential community stewardship. PMA membership is required to participate in governance votes.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <style jsx global>{`
        @media (max-width: 900px) {
          .land-detail-grid {
            grid-template-columns: 1fr !important;
          }
          .land-detail-sidebar {
            position: static !important;
          }
        }
        @media (max-width: 640px) {
          .due-diligence-grid {
            grid-template-columns: 1fr !important;
          }
          .land-stats-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </>
  );
}
