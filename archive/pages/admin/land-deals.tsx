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
  owner_phone: string;
  property_address: string;
  city: string;
  state: string;
  acreage: string;
  asking_price: string;
  zoning: string;
  property_type: string;
  road_access: string;
  water_source: string;
  utilities_available: any;
  title_clear: boolean;
  open_to_option: boolean;
  timeline_to_sell: string;
  owner_motivation: string;
  lead_score: number;
  status: string;
  steward_name: string | null;
  created_at: string;
}

interface Stats {
  total: number;
  new_count: number;
  reviewing_count: number;
  qualified_count: number;
  approved_count: number;
  rejected_count: number;
  avg_acreage: string;
  total_acreage: string;
  avg_lead_score: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  new: { label: "New", color: "#3b82f6", bg: "#eff6ff" },
  reviewing: { label: "In Review", color: "#f59e0b", bg: "#fffbeb" },
  qualified: { label: "Qualified", color: "#8b5cf6", bg: "#f5f3ff" },
  approved: { label: "Approved", color: "#10b981", bg: "#ecfdf5" },
  rejected: { label: "Rejected", color: "#ef4444", bg: "#fef2f2" },
  archived: { label: "Archived", color: "#6b7280", bg: "#f3f4f6" }
};

export default function AdminLandDealsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [filter, setFilter] = useState("all");
  const [updating, setUpdating] = useState(false);

  const fetchSubmissions = async () => {
    try {
      const url = filter === "all" 
        ? "/api/land-acquisition/submissions"
        : `/api/land-acquisition/submissions?status=${filter}`;
      
      const res = await fetch(url);
      const data = await res.json();
      
      if (data.success) {
        setSubmissions(data.data.submissions);
        setStats(data.data.stats);
      }
    } catch (error) {
      console.error("Failed to fetch submissions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [filter]);

  const updateStatus = async (id: number, newStatus: string) => {
    setUpdating(true);
    try {
      const res = await fetch("/api/land-acquisition/submissions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus })
      });
      
      const data = await res.json();
      
      if (data.success) {
        await fetchSubmissions();
        if (selectedSubmission?.id === id) {
          setSelectedSubmission({ ...selectedSubmission, status: newStatus });
        }
      }
    } catch (error) {
      console.error("Failed to update status:", error);
    } finally {
      setUpdating(false);
    }
  };

  const getLeadScoreColor = (score: number) => {
    if (score >= 70) return "#10b981";
    if (score >= 50) return "#f59e0b";
    return "#ef4444";
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  const formatCurrency = (val: string | null) => {
    if (!val) return "N/A";
    return `$${parseFloat(val).toLocaleString()}`;
  };

  return (
    <>
      <Head>
        <title>Land Deals Admin | Axiom Protocol</title>
      </Head>
      <div style={{ display: "flex", minHeight: "100vh", background: theme.light }}>
        <aside style={{
          width: "240px",
          background: theme.dark,
          padding: "24px 16px",
          color: theme.white
        }}>
          <Link href="/admin" style={{ color: theme.white, textDecoration: "none" }}>
            <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "32px" }}>Axiom Admin</h2>
          </Link>
          <nav>
            {[
              { label: "Dashboard", href: "/admin" },
              { label: "Land Deals", href: "/admin/land-deals", active: true },
              { label: "Land Candidates", href: "/admin/land-candidates" },
              { label: "Crowdfunding", href: "/admin/crowdfunding" },
              { label: "Land Pipeline", href: "/admin/land-pipeline" },
              { label: "Stewards", href: "/admin/steward-recruitment" }
            ].map(item => (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: "block",
                  padding: "12px 16px",
                  borderRadius: "8px",
                  color: item.active ? theme.white : "rgba(255,255,255,0.7)",
                  background: item.active ? "rgba(255,255,255,0.1)" : "transparent",
                  textDecoration: "none",
                  marginBottom: "4px",
                  fontSize: "14px"
                }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <main style={{ flex: 1, padding: "32px", overflow: "auto" }}>
          <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
              <div>
                <h1 style={{ fontSize: "28px", fontWeight: 700, color: theme.dark, marginBottom: "8px" }}>
                  Land Deal Pipeline
                </h1>
                <p style={{ color: theme.muted }}>Review and approve property submissions</p>
              </div>
              <Link
                href="/landowners/submit"
                target="_blank"
                style={{
                  padding: "10px 20px",
                  background: theme.primary,
                  color: theme.white,
                  borderRadius: "8px",
                  textDecoration: "none",
                  fontWeight: 500,
                  fontSize: "14px"
                }}
              >
                View Submission Form
              </Link>
            </div>

            {stats && (
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(6, 1fr)",
                gap: "16px",
                marginBottom: "32px"
              }}>
                {[
                  { label: "Total", value: stats.total, color: theme.dark },
                  { label: "New", value: stats.new_count, color: "#3b82f6" },
                  { label: "Reviewing", value: stats.reviewing_count, color: "#f59e0b" },
                  { label: "Qualified", value: stats.qualified_count, color: "#8b5cf6" },
                  { label: "Approved", value: stats.approved_count, color: "#10b981" },
                  { label: "Rejected", value: stats.rejected_count, color: "#ef4444" }
                ].map(stat => (
                  <div key={stat.label} style={{
                    background: theme.white,
                    borderRadius: "12px",
                    padding: "20px",
                    textAlign: "center",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
                  }}>
                    <div style={{ fontSize: "28px", fontWeight: 700, color: stat.color }}>{stat.value || 0}</div>
                    <div style={{ fontSize: "13px", color: theme.muted }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            )}

            {stats && (
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "16px",
                marginBottom: "32px"
              }}>
                <div style={{ background: theme.white, borderRadius: "12px", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                  <div style={{ fontSize: "14px", color: theme.muted, marginBottom: "4px" }}>Total Acreage</div>
                  <div style={{ fontSize: "24px", fontWeight: 700, color: theme.dark }}>
                    {parseFloat(stats.total_acreage || "0").toLocaleString()} acres
                  </div>
                </div>
                <div style={{ background: theme.white, borderRadius: "12px", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                  <div style={{ fontSize: "14px", color: theme.muted, marginBottom: "4px" }}>Average Acreage</div>
                  <div style={{ fontSize: "24px", fontWeight: 700, color: theme.dark }}>
                    {parseFloat(stats.avg_acreage || "0").toFixed(1)} acres
                  </div>
                </div>
                <div style={{ background: theme.white, borderRadius: "12px", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                  <div style={{ fontSize: "14px", color: theme.muted, marginBottom: "4px" }}>Avg Lead Score</div>
                  <div style={{ fontSize: "24px", fontWeight: 700, color: getLeadScoreColor(parseFloat(stats.avg_lead_score || "0")) }}>
                    {parseFloat(stats.avg_lead_score || "0").toFixed(0)}/100
                  </div>
                </div>
              </div>
            )}

            <div style={{
              background: theme.white,
              borderRadius: "16px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              overflow: "hidden"
            }}>
              <div style={{
                padding: "20px 24px",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                gap: "8px"
              }}>
                {["all", "new", "reviewing", "qualified", "approved", "rejected"].map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    style={{
                      padding: "8px 16px",
                      border: "none",
                      borderRadius: "6px",
                      background: filter === f ? theme.primary : "#f1f5f9",
                      color: filter === f ? theme.white : theme.dark,
                      cursor: "pointer",
                      fontSize: "13px",
                      fontWeight: 500,
                      textTransform: "capitalize"
                    }}
                  >
                    {f === "all" ? "All Deals" : f}
                  </button>
                ))}
              </div>

              {loading ? (
                <div style={{ padding: "60px", textAlign: "center", color: theme.muted }}>
                  Loading submissions...
                </div>
              ) : submissions.length === 0 ? (
                <div style={{ padding: "60px", textAlign: "center" }}>
                  <div style={{ fontSize: "48px", marginBottom: "16px" }}>📭</div>
                  <div style={{ color: theme.muted }}>No submissions found</div>
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc" }}>
                      {["Score", "Owner", "Location", "Acreage", "Price", "Status", "Submitted", "Actions"].map(h => (
                        <th key={h} style={{
                          padding: "12px 16px",
                          textAlign: "left",
                          fontSize: "12px",
                          fontWeight: 600,
                          color: theme.muted,
                          textTransform: "uppercase"
                        }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map(sub => (
                      <tr
                        key={sub.id}
                        style={{
                          borderBottom: "1px solid #f1f5f9",
                          cursor: "pointer"
                        }}
                        onClick={() => setSelectedSubmission(sub)}
                      >
                        <td style={{ padding: "16px" }}>
                          <div style={{
                            width: "40px",
                            height: "40px",
                            borderRadius: "50%",
                            background: getLeadScoreColor(sub.lead_score),
                            color: theme.white,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 700,
                            fontSize: "13px"
                          }}>
                            {sub.lead_score}
                          </div>
                        </td>
                        <td style={{ padding: "16px" }}>
                          <div style={{ fontWeight: 500, color: theme.dark }}>{sub.owner_name}</div>
                          <div style={{ fontSize: "13px", color: theme.muted }}>{sub.owner_email}</div>
                        </td>
                        <td style={{ padding: "16px" }}>
                          <div style={{ fontWeight: 500, color: theme.dark }}>{sub.city}, {sub.state}</div>
                          <div style={{ fontSize: "13px", color: theme.muted }}>{sub.property_address?.slice(0, 30)}...</div>
                        </td>
                        <td style={{ padding: "16px", fontWeight: 600, color: theme.dark }}>
                          {parseFloat(sub.acreage).toLocaleString()} ac
                        </td>
                        <td style={{ padding: "16px", color: theme.dark }}>
                          {formatCurrency(sub.asking_price)}
                        </td>
                        <td style={{ padding: "16px" }}>
                          <span style={{
                            padding: "4px 10px",
                            borderRadius: "12px",
                            fontSize: "12px",
                            fontWeight: 500,
                            background: STATUS_CONFIG[sub.status]?.bg || "#f3f4f6",
                            color: STATUS_CONFIG[sub.status]?.color || "#6b7280"
                          }}>
                            {STATUS_CONFIG[sub.status]?.label || sub.status}
                          </span>
                        </td>
                        <td style={{ padding: "16px", fontSize: "13px", color: theme.muted }}>
                          {formatDate(sub.created_at)}
                        </td>
                        <td style={{ padding: "16px" }} onClick={e => e.stopPropagation()}>
                          <select
                            value={sub.status}
                            onChange={e => updateStatus(sub.id, e.target.value)}
                            disabled={updating}
                            style={{
                              padding: "6px 10px",
                              borderRadius: "6px",
                              border: "1px solid #e2e8f0",
                              fontSize: "13px",
                              cursor: "pointer"
                            }}
                          >
                            <option value="new">New</option>
                            <option value="reviewing">Reviewing</option>
                            <option value="qualified">Qualified</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                            <option value="archived">Archived</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </main>

        {selectedSubmission && (
          <div
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              bottom: 0,
              width: "480px",
              background: theme.white,
              boxShadow: "-4px 0 20px rgba(0,0,0,0.15)",
              overflow: "auto",
              zIndex: 1000
            }}
          >
            <div style={{
              padding: "24px",
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <h2 style={{ fontSize: "18px", fontWeight: 600, color: theme.dark }}>Property Details</h2>
              <button
                onClick={() => setSelectedSubmission(null)}
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  border: "none",
                  background: "#f1f5f9",
                  cursor: "pointer",
                  fontSize: "18px"
                }}
              >
                ×
              </button>
            </div>

            <div style={{ padding: "24px" }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
                marginBottom: "24px"
              }}>
                <div style={{
                  width: "60px",
                  height: "60px",
                  borderRadius: "50%",
                  background: getLeadScoreColor(selectedSubmission.lead_score),
                  color: theme.white,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: "20px"
                }}>
                  {selectedSubmission.lead_score}
                </div>
                <div>
                  <div style={{ fontSize: "20px", fontWeight: 600, color: theme.dark }}>
                    {selectedSubmission.owner_name}
                  </div>
                  <span style={{
                    padding: "4px 10px",
                    borderRadius: "12px",
                    fontSize: "12px",
                    fontWeight: 500,
                    background: STATUS_CONFIG[selectedSubmission.status]?.bg,
                    color: STATUS_CONFIG[selectedSubmission.status]?.color
                  }}>
                    {STATUS_CONFIG[selectedSubmission.status]?.label}
                  </span>
                </div>
              </div>

              <div style={{ marginBottom: "24px" }}>
                <h3 style={{ fontSize: "14px", fontWeight: 600, color: theme.muted, marginBottom: "12px", textTransform: "uppercase" }}>
                  Contact Info
                </h3>
                <div style={{ fontSize: "14px", color: theme.dark, marginBottom: "8px" }}>
                  <strong>Email:</strong> {selectedSubmission.owner_email}
                </div>
                {selectedSubmission.owner_phone && (
                  <div style={{ fontSize: "14px", color: theme.dark }}>
                    <strong>Phone:</strong> {selectedSubmission.owner_phone}
                  </div>
                )}
              </div>

              <div style={{ marginBottom: "24px" }}>
                <h3 style={{ fontSize: "14px", fontWeight: 600, color: theme.muted, marginBottom: "12px", textTransform: "uppercase" }}>
                  Property Location
                </h3>
                <div style={{ fontSize: "14px", color: theme.dark, lineHeight: 1.6 }}>
                  {selectedSubmission.property_address}<br />
                  {selectedSubmission.city}, {selectedSubmission.state}
                </div>
              </div>

              <div style={{ marginBottom: "24px" }}>
                <h3 style={{ fontSize: "14px", fontWeight: 600, color: theme.muted, marginBottom: "12px", textTransform: "uppercase" }}>
                  Property Details
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px" }}>
                    <div style={{ fontSize: "12px", color: theme.muted }}>Acreage</div>
                    <div style={{ fontSize: "16px", fontWeight: 600, color: theme.dark }}>{parseFloat(selectedSubmission.acreage).toLocaleString()} ac</div>
                  </div>
                  <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px" }}>
                    <div style={{ fontSize: "12px", color: theme.muted }}>Asking Price</div>
                    <div style={{ fontSize: "16px", fontWeight: 600, color: theme.dark }}>{formatCurrency(selectedSubmission.asking_price)}</div>
                  </div>
                  <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px" }}>
                    <div style={{ fontSize: "12px", color: theme.muted }}>Zoning</div>
                    <div style={{ fontSize: "16px", fontWeight: 600, color: theme.dark, textTransform: "capitalize" }}>{selectedSubmission.zoning || "N/A"}</div>
                  </div>
                  <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px" }}>
                    <div style={{ fontSize: "12px", color: theme.muted }}>Property Type</div>
                    <div style={{ fontSize: "16px", fontWeight: 600, color: theme.dark, textTransform: "capitalize" }}>{selectedSubmission.property_type || "N/A"}</div>
                  </div>
                  <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px" }}>
                    <div style={{ fontSize: "12px", color: theme.muted }}>Road Access</div>
                    <div style={{ fontSize: "16px", fontWeight: 600, color: theme.dark, textTransform: "capitalize" }}>{selectedSubmission.road_access || "N/A"}</div>
                  </div>
                  <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px" }}>
                    <div style={{ fontSize: "12px", color: theme.muted }}>Water Source</div>
                    <div style={{ fontSize: "16px", fontWeight: 600, color: theme.dark, textTransform: "capitalize" }}>{selectedSubmission.water_source || "N/A"}</div>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: "24px" }}>
                <h3 style={{ fontSize: "14px", fontWeight: 600, color: theme.muted, marginBottom: "12px", textTransform: "uppercase" }}>
                  Qualifications
                </h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  <span style={{
                    padding: "6px 12px",
                    borderRadius: "16px",
                    fontSize: "13px",
                    background: selectedSubmission.title_clear ? "#ecfdf5" : "#fef2f2",
                    color: selectedSubmission.title_clear ? "#10b981" : "#ef4444"
                  }}>
                    {selectedSubmission.title_clear ? "✓ Clear Title" : "✗ Title Issues"}
                  </span>
                  <span style={{
                    padding: "6px 12px",
                    borderRadius: "16px",
                    fontSize: "13px",
                    background: selectedSubmission.open_to_option ? "#ecfdf5" : "#fef2f2",
                    color: selectedSubmission.open_to_option ? "#10b981" : "#ef4444"
                  }}>
                    {selectedSubmission.open_to_option ? "✓ Open to Option" : "✗ No Option"}
                  </span>
                </div>
              </div>

              {selectedSubmission.owner_motivation && (
                <div style={{ marginBottom: "24px" }}>
                  <h3 style={{ fontSize: "14px", fontWeight: 600, color: theme.muted, marginBottom: "12px", textTransform: "uppercase" }}>
                    Seller Motivation
                  </h3>
                  <p style={{ fontSize: "14px", color: theme.dark, lineHeight: 1.6 }}>
                    {selectedSubmission.owner_motivation}
                  </p>
                </div>
              )}

              <div style={{ marginBottom: "24px" }}>
                <h3 style={{ fontSize: "14px", fontWeight: 600, color: theme.muted, marginBottom: "12px", textTransform: "uppercase" }}>
                  Timeline
                </h3>
                <div style={{ fontSize: "14px", color: theme.dark }}>
                  {selectedSubmission.timeline_to_sell || "Not specified"}
                </div>
              </div>

              <div style={{
                padding: "20px",
                background: "#f8fafc",
                borderRadius: "12px",
                marginTop: "24px"
              }}>
                <h3 style={{ fontSize: "14px", fontWeight: 600, color: theme.dark, marginBottom: "12px" }}>
                  Update Status
                </h3>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {["reviewing", "qualified", "approved", "rejected"].map(status => (
                    <button
                      key={status}
                      onClick={() => updateStatus(selectedSubmission.id, status)}
                      disabled={updating || selectedSubmission.status === status}
                      style={{
                        padding: "8px 16px",
                        border: "none",
                        borderRadius: "6px",
                        background: STATUS_CONFIG[status]?.bg,
                        color: STATUS_CONFIG[status]?.color,
                        cursor: selectedSubmission.status === status ? "not-allowed" : "pointer",
                        fontSize: "13px",
                        fontWeight: 500,
                        opacity: selectedSubmission.status === status ? 0.5 : 1
                      }}
                    >
                      {STATUS_CONFIG[status]?.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
