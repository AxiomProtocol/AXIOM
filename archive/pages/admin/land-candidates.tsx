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

const STAGES = [
  { value: "candidate", label: "Candidate" },
  { value: "under_review", label: "Under Review" },
  { value: "due_diligence", label: "Due Diligence" },
  { value: "ready_for_vote", label: "Ready For Vote" },
  { value: "approved_for_execution", label: "Approved" },
  { value: "acquired", label: "Acquired" },
  { value: "archived", label: "Archived" }
];

const PROPERTY_TYPES = [
  { value: "agricultural", label: "Agricultural" },
  { value: "mixed_use", label: "Mixed Use" },
  { value: "residential", label: "Residential" },
  { value: "urban", label: "Urban" },
  { value: "recreational", label: "Recreational" },
  { value: "commercial", label: "Commercial" }
];

interface LandCandidate {
  id: number;
  name: string;
  location: string;
  county: string;
  state: string;
  acreage: string;
  askingPrice: string;
  propertyType: string;
  stage: string;
  stewardshipIntent: string;
  publicSummary: string;
  featuredImageUrl: string | null;
  listingUrl: string | null;
  dueDiligenceProgress: number;
  isAccessVerified: boolean;
  isTitleReviewed: boolean;
  isSurveyVerified: boolean;
  isEnvironmentalScreened: boolean;
}

export default function AdminLandCandidates() {
  const [candidates, setCandidates] = useState<LandCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCandidate, setSelectedCandidate] = useState<LandCandidate | null>(null);
  const [editing, setEditing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [formData, setFormData] = useState<Partial<LandCandidate>>({});

  const fetchCandidates = async () => {
    try {
      const res = await fetch("/api/land/candidates");
      const data = await res.json();
      if (data.success) {
        setCandidates(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch candidates:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, []);

  const openEditModal = (candidate: LandCandidate) => {
    setSelectedCandidate(candidate);
    setFormData({ ...candidate });
    setEditing(true);
    setMessage(null);
  };

  const closeModal = () => {
    setSelectedCandidate(null);
    setFormData({});
    setEditing(false);
    setCreating(false);
    setMessage(null);
  };

  const openCreateModal = () => {
    setFormData({
      stage: 'candidate',
      propertyType: 'agricultural',
      dueDiligenceProgress: 0,
      isAccessVerified: false,
      isTitleReviewed: false,
      isSurveyVerified: false,
      isEnvironmentalScreened: false
    });
    setCreating(true);
    setMessage(null);
  };

  const createCandidate = async () => {
    if (!formData.name) {
      setMessage({ type: 'error', text: 'Name is required' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/land/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'Land candidate created successfully' });
        await fetchCandidates();
        setTimeout(closeModal, 1500);
      } else {
        throw new Error(data.error || 'Failed to create');
      }
    } catch (error: any) {
      console.error('Create error:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to create land candidate' });
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage(null);

    try {
      const urlRes = await fetch("/api/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: file.name,
          size: file.size,
          contentType: file.type
        })
      });

      if (!urlRes.ok) {
        throw new Error("Failed to get upload URL");
      }

      const { uploadURL, objectPath } = await urlRes.json();

      const uploadRes = await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type }
      });

      if (!uploadRes.ok) {
        throw new Error("Failed to upload image");
      }

      setFormData(prev => ({ ...prev, featuredImageUrl: objectPath }));
      setMessage({ type: 'success', text: 'Image uploaded successfully' });
    } catch (error) {
      console.error("Image upload error:", error);
      setMessage({ type: 'error', text: 'Failed to upload image' });
    } finally {
      setUploading(false);
    }
  };

  const saveChanges = async () => {
    if (!selectedCandidate) return;

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/land/candidates/${selectedCandidate.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'Changes saved successfully' });
        await fetchCandidates();
        setTimeout(closeModal, 1500);
      } else {
        throw new Error(data.error || "Failed to save");
      }
    } catch (error: any) {
      console.error("Save error:", error);
      setMessage({ type: 'error', text: error.message || 'Failed to save changes' });
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (value: string) => {
    if (!value) return "N/A";
    return `$${parseInt(value).toLocaleString()}`;
  };

  const getStageColor = (stage: string) => {
    const colors: Record<string, string> = {
      candidate: "#3b82f6",
      under_review: "#f59e0b",
      due_diligence: "#8b5cf6",
      ready_for_vote: "#06b6d4",
      approved_for_execution: "#10b981",
      acquired: "#22c55e",
      archived: "#6b7280"
    };
    return colors[stage] || "#6b7280";
  };

  return (
    <>
      <Head>
        <title>Land Candidates | Admin</title>
      </Head>

      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)",
        padding: "24px"
      }}>
        <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px"
          }}>
            <div>
              <h1 style={{ fontSize: "28px", fontWeight: 700, color: theme.white, marginBottom: "8px" }}>
                Land Candidates Management
              </h1>
              <p style={{ color: theme.muted, fontSize: "14px" }}>
                Edit property details and upload images
              </p>
            </div>
            <div style={{ display: "flex", gap: "12px" }}>
              <Link href="/admin" style={{
                padding: "10px 20px",
                background: "rgba(255,255,255,0.1)",
                color: theme.white,
                borderRadius: "8px",
                textDecoration: "none",
                fontSize: "14px"
              }}>
                Back to Admin
              </Link>
              <Link href="/land" style={{
                padding: "10px 20px",
                background: theme.primary,
                color: theme.dark,
                borderRadius: "8px",
                textDecoration: "none",
                fontWeight: 600,
                fontSize: "14px"
              }}>
                View Public Page
              </Link>
              <button
                onClick={openCreateModal}
                style={{
                  padding: "10px 20px",
                  background: theme.gold,
                  color: theme.dark,
                  borderRadius: "8px",
                  border: "none",
                  fontWeight: 600,
                  fontSize: "14px",
                  cursor: "pointer"
                }}
              >
                + Add New Candidate
              </button>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", color: theme.white, padding: "100px" }}>
              Loading candidates...
            </div>
          ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
              gap: "20px"
            }}>
              {candidates.map(candidate => (
                <div
                  key={candidate.id}
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    borderRadius: "12px",
                    overflow: "hidden",
                    border: "1px solid rgba(255,255,255,0.1)"
                  }}
                >
                  <div style={{
                    height: "160px",
                    background: candidate.featuredImageUrl
                      ? `url(${candidate.featuredImageUrl}) center/cover`
                      : "linear-gradient(135deg, #374151 0%, #1f2937 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                    {!candidate.featuredImageUrl && (
                      <span style={{ color: theme.muted, fontSize: "14px" }}>No Image</span>
                    )}
                  </div>

                  <div style={{ padding: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                      <span style={{
                        padding: "4px 10px",
                        borderRadius: "12px",
                        fontSize: "11px",
                        fontWeight: 600,
                        background: `${getStageColor(candidate.stage)}20`,
                        color: getStageColor(candidate.stage)
                      }}>
                        {STAGES.find(s => s.value === candidate.stage)?.label || candidate.stage}
                      </span>
                      <span style={{
                        padding: "4px 10px",
                        borderRadius: "12px",
                        fontSize: "11px",
                        background: "rgba(255,255,255,0.1)",
                        color: theme.muted
                      }}>
                        {candidate.propertyType}
                      </span>
                    </div>

                    <h3 style={{ fontSize: "18px", fontWeight: 600, color: theme.white, marginBottom: "4px" }}>
                      {candidate.name}
                    </h3>
                    <p style={{ fontSize: "13px", color: theme.muted, marginBottom: "12px" }}>
                      {candidate.location}
                    </p>

                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: "12px",
                      marginBottom: "16px"
                    }}>
                      <div>
                        <div style={{ fontSize: "16px", fontWeight: 600, color: theme.primary }}>
                          {parseFloat(candidate.acreage).toLocaleString()}
                        </div>
                        <div style={{ fontSize: "11px", color: theme.muted }}>Acres</div>
                      </div>
                      <div>
                        <div style={{ fontSize: "16px", fontWeight: 600, color: theme.gold }}>
                          {formatCurrency(candidate.askingPrice)}
                        </div>
                        <div style={{ fontSize: "11px", color: theme.muted }}>Price</div>
                      </div>
                      <div>
                        <div style={{ fontSize: "16px", fontWeight: 600, color: theme.secondary }}>
                          {candidate.dueDiligenceProgress}%
                        </div>
                        <div style={{ fontSize: "11px", color: theme.muted }}>Progress</div>
                      </div>
                    </div>

                    <button
                      onClick={() => openEditModal(candidate)}
                      style={{
                        width: "100%",
                        padding: "12px",
                        background: "rgba(255,255,255,0.1)",
                        color: theme.white,
                        border: "1px solid rgba(255,255,255,0.2)",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: 500,
                        transition: "all 0.2s"
                      }}
                    >
                      Edit Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {(editing && selectedCandidate) || creating ? (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.8)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
          zIndex: 1000
        }}>
          <div style={{
            background: "#1a1a2e",
            borderRadius: "16px",
            width: "100%",
            maxWidth: "800px",
            maxHeight: "90vh",
            overflow: "auto",
            border: "1px solid rgba(255,255,255,0.1)"
          }}>
            <div style={{
              padding: "20px",
              borderBottom: "1px solid rgba(255,255,255,0.1)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <h2 style={{ fontSize: "20px", fontWeight: 600, color: theme.white }}>
                {creating ? "Add New Land Candidate" : `Edit: ${selectedCandidate?.name}`}
              </h2>
              <button
                onClick={closeModal}
                style={{
                  background: "transparent",
                  border: "none",
                  color: theme.muted,
                  fontSize: "24px",
                  cursor: "pointer"
                }}
              >
                ×
              </button>
            </div>

            <div style={{ padding: "20px" }}>
              {message && (
                <div style={{
                  padding: "12px 16px",
                  borderRadius: "8px",
                  marginBottom: "20px",
                  background: message.type === 'success' ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)",
                  color: message.type === 'success' ? "#10b981" : "#ef4444",
                  fontSize: "14px"
                }}>
                  {message.text}
                </div>
              )}

              <div style={{ marginBottom: "24px" }}>
                <label style={{ display: "block", color: theme.muted, fontSize: "13px", marginBottom: "8px" }}>
                  Featured Image
                </label>
                <div style={{
                  border: "2px dashed rgba(255,255,255,0.2)",
                  borderRadius: "12px",
                  padding: "20px",
                  textAlign: "center"
                }}>
                  {formData.featuredImageUrl ? (
                    <div>
                      <img
                        src={formData.featuredImageUrl}
                        alt="Featured"
                        style={{
                          maxWidth: "100%",
                          maxHeight: "200px",
                          borderRadius: "8px",
                          marginBottom: "12px"
                        }}
                      />
                      <button
                        onClick={() => setFormData(prev => ({ ...prev, featuredImageUrl: null }))}
                        style={{
                          padding: "8px 16px",
                          background: "rgba(239,68,68,0.2)",
                          color: "#ef4444",
                          border: "none",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontSize: "13px"
                        }}
                      >
                        Remove Image
                      </button>
                    </div>
                  ) : (
                    <div>
                      <p style={{ color: theme.muted, marginBottom: "12px", fontSize: "14px" }}>
                        {uploading ? "Uploading..." : "Click to upload an image"}
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={uploading}
                        style={{ display: "none" }}
                        id="image-upload"
                      />
                      <label
                        htmlFor="image-upload"
                        style={{
                          display: "inline-block",
                          padding: "10px 20px",
                          background: theme.primary,
                          color: theme.dark,
                          borderRadius: "8px",
                          cursor: uploading ? "not-allowed" : "pointer",
                          fontWeight: 600,
                          fontSize: "14px",
                          opacity: uploading ? 0.7 : 1
                        }}
                      >
                        {uploading ? "Uploading..." : "Choose Image"}
                      </label>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                <div>
                  <label style={{ display: "block", color: theme.muted, fontSize: "13px", marginBottom: "6px" }}>
                    Name
                  </label>
                  <input
                    type="text"
                    value={formData.name || ""}
                    onChange={e => handleInputChange("name", e.target.value)}
                    style={{
                      width: "100%",
                      padding: "12px",
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "8px",
                      color: theme.white,
                      fontSize: "14px"
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", color: theme.muted, fontSize: "13px", marginBottom: "6px" }}>
                    Location
                  </label>
                  <input
                    type="text"
                    value={formData.location || ""}
                    onChange={e => handleInputChange("location", e.target.value)}
                    style={{
                      width: "100%",
                      padding: "12px",
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "8px",
                      color: theme.white,
                      fontSize: "14px"
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                <div>
                  <label style={{ display: "block", color: theme.muted, fontSize: "13px", marginBottom: "6px" }}>
                    County
                  </label>
                  <input
                    type="text"
                    value={formData.county || ""}
                    onChange={e => handleInputChange("county", e.target.value)}
                    style={{
                      width: "100%",
                      padding: "12px",
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "8px",
                      color: theme.white,
                      fontSize: "14px"
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", color: theme.muted, fontSize: "13px", marginBottom: "6px" }}>
                    State
                  </label>
                  <input
                    type="text"
                    value={formData.state || ""}
                    onChange={e => handleInputChange("state", e.target.value)}
                    style={{
                      width: "100%",
                      padding: "12px",
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "8px",
                      color: theme.white,
                      fontSize: "14px"
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", color: theme.muted, fontSize: "13px", marginBottom: "6px" }}>
                    Acreage
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.acreage || ""}
                    onChange={e => handleInputChange("acreage", e.target.value)}
                    style={{
                      width: "100%",
                      padding: "12px",
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "8px",
                      color: theme.white,
                      fontSize: "14px"
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                <div>
                  <label style={{ display: "block", color: theme.muted, fontSize: "13px", marginBottom: "6px" }}>
                    Asking Price
                  </label>
                  <input
                    type="number"
                    value={formData.askingPrice || ""}
                    onChange={e => handleInputChange("askingPrice", e.target.value)}
                    style={{
                      width: "100%",
                      padding: "12px",
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "8px",
                      color: theme.white,
                      fontSize: "14px"
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", color: theme.muted, fontSize: "13px", marginBottom: "6px" }}>
                    Property Type
                  </label>
                  <select
                    value={formData.propertyType || ""}
                    onChange={e => handleInputChange("propertyType", e.target.value)}
                    style={{
                      width: "100%",
                      padding: "12px",
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "8px",
                      color: theme.white,
                      fontSize: "14px"
                    }}
                  >
                    {PROPERTY_TYPES.map(type => (
                      <option key={type.value} value={type.value} style={{ background: theme.dark }}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", color: theme.muted, fontSize: "13px", marginBottom: "6px" }}>
                    Stage
                  </label>
                  <select
                    value={formData.stage || ""}
                    onChange={e => handleInputChange("stage", e.target.value)}
                    style={{
                      width: "100%",
                      padding: "12px",
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "8px",
                      color: theme.white,
                      fontSize: "14px"
                    }}
                  >
                    {STAGES.map(stage => (
                      <option key={stage.value} value={stage.value} style={{ background: theme.dark }}>
                        {stage.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", color: theme.muted, fontSize: "13px", marginBottom: "6px" }}>
                  Listing URL
                </label>
                <input
                  type="url"
                  value={formData.listingUrl || ""}
                  onChange={e => handleInputChange("listingUrl", e.target.value)}
                  placeholder="https://..."
                  style={{
                    width: "100%",
                    padding: "12px",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    color: theme.white,
                    fontSize: "14px"
                  }}
                />
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", color: theme.muted, fontSize: "13px", marginBottom: "6px" }}>
                  Stewardship Intent
                </label>
                <textarea
                  value={formData.stewardshipIntent || ""}
                  onChange={e => handleInputChange("stewardshipIntent", e.target.value)}
                  rows={3}
                  style={{
                    width: "100%",
                    padding: "12px",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    color: theme.white,
                    fontSize: "14px",
                    resize: "vertical"
                  }}
                />
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", color: theme.muted, fontSize: "13px", marginBottom: "6px" }}>
                  Public Summary
                </label>
                <textarea
                  value={formData.publicSummary || ""}
                  onChange={e => handleInputChange("publicSummary", e.target.value)}
                  rows={3}
                  style={{
                    width: "100%",
                    padding: "12px",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    color: theme.white,
                    fontSize: "14px",
                    resize: "vertical"
                  }}
                />
              </div>

              <div style={{ marginBottom: "24px" }}>
                <label style={{ display: "block", color: theme.muted, fontSize: "13px", marginBottom: "10px" }}>
                  Due Diligence Progress: {formData.dueDiligenceProgress || 0}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={formData.dueDiligenceProgress || 0}
                  onChange={e => handleInputChange("dueDiligenceProgress", parseInt(e.target.value))}
                  style={{ width: "100%" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "24px" }}>
                {[
                  { key: "isAccessVerified", label: "Access Verified" },
                  { key: "isTitleReviewed", label: "Title Reviewed" },
                  { key: "isSurveyVerified", label: "Survey Verified" },
                  { key: "isEnvironmentalScreened", label: "Environmental" }
                ].map(check => (
                  <label
                    key={check.key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "10px",
                      background: (formData as any)[check.key] ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.05)",
                      borderRadius: "8px",
                      cursor: "pointer",
                      border: "1px solid " + ((formData as any)[check.key] ? "rgba(16,185,129,0.4)" : "rgba(255,255,255,0.1)")
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={(formData as any)[check.key] || false}
                      onChange={e => handleInputChange(check.key, e.target.checked)}
                      style={{ width: "16px", height: "16px" }}
                    />
                    <span style={{ fontSize: "12px", color: theme.white }}>{check.label}</span>
                  </label>
                ))}
              </div>

              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                <button
                  onClick={closeModal}
                  style={{
                    padding: "12px 24px",
                    background: "transparent",
                    color: theme.muted,
                    border: "1px solid rgba(255,255,255,0.2)",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "14px"
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={creating ? createCandidate : saveChanges}
                  disabled={saving}
                  style={{
                    padding: "12px 24px",
                    background: creating ? theme.gold : theme.primary,
                    color: theme.dark,
                    border: "none",
                    borderRadius: "8px",
                    cursor: saving ? "not-allowed" : "pointer",
                    fontWeight: 600,
                    fontSize: "14px",
                    opacity: saving ? 0.7 : 1
                  }}
                >
                  {saving ? "Saving..." : (creating ? "Create Candidate" : "Save Changes")}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
