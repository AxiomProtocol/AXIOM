import React, { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";

const theme = {
  primary: "#00D4AA",
  secondary: "#7B68EE",
  gold: "#FFD700",
  dark: "#1a1a2e",
  muted: "#64748b",
  light: "#f8fafc",
  white: "#ffffff"
};

interface Submission {
  id: number;
  owner_name: string;
  owner_email: string;
  property_address: string;
  city: string;
  state: string;
  acreage: string;
  asking_price: string;
  lead_score: number;
  status: string;
  assigned_steward_id: number | null;
  created_at: string;
}

const COLUMNS = [
  { id: "new", label: "New Leads", color: "#3b82f6" },
  { id: "reviewing", label: "In Review", color: "#f59e0b" },
  { id: "qualified", label: "Qualified", color: "#8b5cf6" },
  { id: "approved", label: "Approved", color: "#10b981" },
  { id: "rejected", label: "Rejected", color: "#ef4444" }
];

export default function LandPipelinePage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedItem, setDraggedItem] = useState<Submission | null>(null);
  const [updating, setUpdating] = useState<number | null>(null);

  const fetchSubmissions = async () => {
    try {
      const res = await fetch("/api/land-acquisition/submissions");
      const data = await res.json();
      if (data.success) {
        setSubmissions(data.data.submissions);
      }
    } catch (error) {
      console.error("Failed to fetch:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const handleDragStart = (e: React.DragEvent, submission: Submission) => {
    setDraggedItem(submission);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    if (!draggedItem || draggedItem.status === newStatus) {
      setDraggedItem(null);
      return;
    }

    setUpdating(draggedItem.id);
    
    try {
      const res = await fetch("/api/land-acquisition/submissions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: draggedItem.id, status: newStatus })
      });
      
      if (res.ok) {
        await fetchSubmissions();
      }
    } catch (error) {
      console.error("Failed to update:", error);
    } finally {
      setUpdating(null);
      setDraggedItem(null);
    }
  };

  const getLeadScoreColor = (score: number) => {
    if (score >= 70) return "#10b981";
    if (score >= 50) return "#f59e0b";
    return "#ef4444";
  };

  const formatCurrency = (value: string) => {
    if (!value) return "N/A";
    return `$${parseInt(value).toLocaleString()}`;
  };

  const getColumnSubmissions = (status: string) => {
    return submissions.filter(s => s.status === status);
  };

  const getTotalValue = (status: string) => {
    return getColumnSubmissions(status).reduce((sum, s) => {
      return sum + (parseFloat(s.asking_price) || 0);
    }, 0);
  };

  return (
    <>
      <Head>
        <title>Land Pipeline | Admin</title>
      </Head>

      <div style={{ 
        minHeight: "100vh", 
        background: "linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)",
        padding: "24px"
      }}>
        <div style={{ maxWidth: "1800px", margin: "0 auto" }}>
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center",
            marginBottom: "24px"
          }}>
            <div>
              <h1 style={{ 
                fontSize: "28px", 
                fontWeight: 700, 
                color: theme.white,
                marginBottom: "8px"
              }}>
                Land Acquisition Pipeline
              </h1>
              <p style={{ color: theme.muted, fontSize: "14px" }}>
                Drag and drop deals between stages
              </p>
            </div>
            <div style={{ display: "flex", gap: "12px" }}>
              <Link href="/admin/land-deals" style={{
                padding: "10px 20px",
                background: "rgba(255,255,255,0.1)",
                color: theme.white,
                borderRadius: "8px",
                textDecoration: "none",
                fontSize: "14px"
              }}>
                List View
              </Link>
              <Link href="/landowners/submit" style={{
                padding: "10px 20px",
                background: theme.primary,
                color: theme.dark,
                borderRadius: "8px",
                textDecoration: "none",
                fontWeight: 600,
                fontSize: "14px"
              }}>
                + Add Property
              </Link>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", color: theme.white, padding: "100px" }}>
              Loading pipeline...
            </div>
          ) : (
            <div style={{ 
              display: "grid",
              gridTemplateColumns: `repeat(${COLUMNS.length}, 1fr)`,
              gap: "16px",
              overflowX: "auto"
            }}>
              {COLUMNS.map(column => (
                <div
                  key={column.id}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, column.id)}
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    borderRadius: "12px",
                    padding: "16px",
                    minHeight: "500px",
                    border: draggedItem?.status !== column.id && draggedItem 
                      ? "2px dashed rgba(255,255,255,0.3)" 
                      : "2px solid transparent"
                  }}
                >
                  <div style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "space-between",
                    marginBottom: "16px",
                    paddingBottom: "12px",
                    borderBottom: `2px solid ${column.color}`
                  }}>
                    <div>
                      <h3 style={{ 
                        fontSize: "14px", 
                        fontWeight: 600, 
                        color: theme.white,
                        marginBottom: "4px"
                      }}>
                        {column.label}
                      </h3>
                      <span style={{ 
                        fontSize: "12px", 
                        color: theme.muted 
                      }}>
                        {getColumnSubmissions(column.id).length} deals
                        {getTotalValue(column.id) > 0 && ` • ${formatCurrency(String(getTotalValue(column.id)))}`}
                      </span>
                    </div>
                    <div style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      background: column.color,
                      color: theme.white,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 600,
                      fontSize: "12px"
                    }}>
                      {getColumnSubmissions(column.id).length}
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {getColumnSubmissions(column.id).map(submission => (
                      <div
                        key={submission.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, submission)}
                        style={{
                          background: updating === submission.id 
                            ? "rgba(255,255,255,0.15)" 
                            : "rgba(255,255,255,0.08)",
                          borderRadius: "10px",
                          padding: "14px",
                          cursor: "grab",
                          border: "1px solid rgba(255,255,255,0.1)",
                          transition: "all 0.2s ease",
                          opacity: updating === submission.id ? 0.7 : 1
                        }}
                      >
                        <div style={{ 
                          display: "flex", 
                          alignItems: "center", 
                          gap: "10px",
                          marginBottom: "10px"
                        }}>
                          <div style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "50%",
                            background: getLeadScoreColor(submission.lead_score),
                            color: theme.white,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 700,
                            fontSize: "12px"
                          }}>
                            {submission.lead_score}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ 
                              fontSize: "14px", 
                              fontWeight: 600, 
                              color: theme.white,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis"
                            }}>
                              {submission.owner_name}
                            </div>
                            <div style={{ 
                              fontSize: "12px", 
                              color: theme.muted,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis"
                            }}>
                              {submission.city}, {submission.state}
                            </div>
                          </div>
                        </div>

                        <div style={{ 
                          fontSize: "12px", 
                          color: "#94a3b8",
                          marginBottom: "8px",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis"
                        }}>
                          {submission.property_address}
                        </div>

                        <div style={{ 
                          display: "flex", 
                          justifyContent: "space-between",
                          fontSize: "12px"
                        }}>
                          <span style={{ color: theme.primary }}>
                            {parseFloat(submission.acreage).toLocaleString()} ac
                          </span>
                          <span style={{ color: theme.gold }}>
                            {formatCurrency(submission.asking_price)}
                          </span>
                        </div>

                        {submission.assigned_steward_id && (
                          <div style={{
                            marginTop: "8px",
                            padding: "4px 8px",
                            background: "rgba(123, 104, 238, 0.2)",
                            borderRadius: "4px",
                            fontSize: "11px",
                            color: theme.secondary
                          }}>
                            Steward Assigned
                          </div>
                        )}
                      </div>
                    ))}

                    {getColumnSubmissions(column.id).length === 0 && (
                      <div style={{
                        padding: "40px 20px",
                        textAlign: "center",
                        color: theme.muted,
                        fontSize: "13px",
                        border: "1px dashed rgba(255,255,255,0.15)",
                        borderRadius: "8px"
                      }}>
                        No deals in this stage
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
