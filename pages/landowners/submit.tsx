import React, { useState } from "react";
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

const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut",
  "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa",
  "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan",
  "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
  "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio",
  "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia",
  "Wisconsin", "Wyoming"
];

export default function LandownerSubmitPage() {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    ownerName: "",
    ownerEmail: "",
    ownerPhone: "",
    propertyAddress: "",
    city: "",
    state: "",
    zipCode: "",
    county: "",
    parcelNumber: "",
    acreage: "",
    askingPrice: "",
    zoning: "",
    propertyType: "",
    currentUse: "",
    utilitiesAvailable: {
      electric: false,
      water: false,
      sewer: false,
      gas: false,
      internet: false
    },
    roadAccess: "",
    waterSource: "",
    topography: "",
    structuresOnProperty: "",
    environmentalIssues: "",
    titleClear: true,
    liensEncumbrances: "",
    ownerMotivation: "",
    timelineToSell: "",
    openToOption: true,
    optionPremiumAcceptable: "",
    notes: ""
  });

  const updateForm = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateUtility = (utility: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      utilitiesAvailable: { ...prev.utilitiesAvailable, [utility]: checked }
    }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/land-acquisition/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          acreage: parseFloat(formData.acreage) || 0,
          askingPrice: formData.askingPrice ? parseFloat(formData.askingPrice) : null,
          optionPremiumAcceptable: formData.optionPremiumAcceptable ? parseFloat(formData.optionPremiumAcceptable) : null
        })
      });

      const data = await response.json();

      if (data.success) {
        setSubmitted(true);
      } else {
        setError(data.error || "Failed to submit. Please try again.");
      }
    } catch (err) {
      setError("Network error. Please check your connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px 16px",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    fontSize: "15px",
    transition: "border-color 0.2s",
    outline: "none"
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    marginBottom: "6px",
    fontSize: "14px",
    fontWeight: 500,
    color: theme.dark
  };

  const fieldGroup: React.CSSProperties = {
    marginBottom: "20px"
  };

  if (submitted) {
    return (
      <>
        <Head>
          <title>Submission Received | Axiom Protocol</title>
        </Head>
        <main style={{ minHeight: "100vh", background: theme.light, padding: "60px 20px" }}>
          <div style={{ maxWidth: "600px", margin: "0 auto", textAlign: "center" }}>
            <div style={{
              background: theme.white,
              borderRadius: "20px",
              padding: "60px 40px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.08)"
            }}>
              <div style={{ fontSize: "60px", marginBottom: "24px" }}>✅</div>
              <h1 style={{ fontSize: "28px", fontWeight: 700, color: theme.dark, marginBottom: "16px" }}>
                Property Submitted Successfully!
              </h1>
              <p style={{ fontSize: "16px", color: theme.muted, marginBottom: "32px", lineHeight: 1.6 }}>
                Thank you for submitting your property. Our team will review your submission within 48 hours 
                and reach out if your land qualifies for our acquisition program.
              </p>
              <div style={{
                background: "rgba(0, 212, 170, 0.1)",
                borderRadius: "12px",
                padding: "20px",
                marginBottom: "32px"
              }}>
                <h3 style={{ fontSize: "16px", fontWeight: 600, color: theme.dark, marginBottom: "8px" }}>What Happens Next?</h3>
                <ul style={{ textAlign: "left", fontSize: "14px", color: theme.muted, margin: 0, paddingLeft: "20px" }}>
                  <li style={{ marginBottom: "8px" }}>Our team reviews your property details</li>
                  <li style={{ marginBottom: "8px" }}>A Steward may be assigned to evaluate the land</li>
                  <li style={{ marginBottom: "8px" }}>You'll receive updates via email</li>
                  <li>If qualified, we'll discuss option terms with you</li>
                </ul>
              </div>
              <Link href="/land-acquisition" style={{
                display: "inline-block",
                padding: "14px 32px",
                background: theme.primary,
                color: theme.white,
                borderRadius: "12px",
                textDecoration: "none",
                fontWeight: 600
              }}>
                View Land Acquisition Program
              </Link>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Submit Your Property | Axiom Protocol</title>
        <meta name="description" content="Submit your land for consideration in Axiom's community-powered acquisition program." />
      </Head>
      <main style={{ minHeight: "100vh", background: theme.light, padding: "40px 20px" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "40px" }}>
            <Link href="/" style={{ textDecoration: "none", color: theme.dark, fontWeight: 700, fontSize: "24px" }}>
              Axiom
            </Link>
          </div>

          <div style={{
            background: theme.white,
            borderRadius: "20px",
            padding: "40px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.08)"
          }}>
            <div style={{ marginBottom: "32px" }}>
              <h1 style={{ fontSize: "28px", fontWeight: 700, color: theme.dark, marginBottom: "8px" }}>
                Submit Your Property
              </h1>
              <p style={{ fontSize: "15px", color: theme.muted }}>
                Tell us about your land and we'll evaluate it for our community acquisition program.
              </p>
            </div>

            <div style={{ display: "flex", gap: "8px", marginBottom: "32px" }}>
              {[1, 2, 3].map(s => (
                <div key={s} style={{
                  flex: 1,
                  height: "4px",
                  borderRadius: "2px",
                  background: step >= s ? theme.primary : "#e2e8f0"
                }} />
              ))}
            </div>

            {step === 1 && (
              <div>
                <h2 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "24px", color: theme.dark }}>
                  Owner Information
                </h2>
                <div style={fieldGroup}>
                  <label style={labelStyle}>Full Name *</label>
                  <input
                    type="text"
                    value={formData.ownerName}
                    onChange={e => updateForm("ownerName", e.target.value)}
                    style={inputStyle}
                    placeholder="John Smith"
                  />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div style={fieldGroup}>
                    <label style={labelStyle}>Email *</label>
                    <input
                      type="email"
                      value={formData.ownerEmail}
                      onChange={e => updateForm("ownerEmail", e.target.value)}
                      style={inputStyle}
                      placeholder="john@example.com"
                    />
                  </div>
                  <div style={fieldGroup}>
                    <label style={labelStyle}>Phone</label>
                    <input
                      type="tel"
                      value={formData.ownerPhone}
                      onChange={e => updateForm("ownerPhone", e.target.value)}
                      style={inputStyle}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>

                <h2 style={{ fontSize: "18px", fontWeight: 600, margin: "32px 0 24px", color: theme.dark }}>
                  Property Location
                </h2>
                <div style={fieldGroup}>
                  <label style={labelStyle}>Property Address *</label>
                  <input
                    type="text"
                    value={formData.propertyAddress}
                    onChange={e => updateForm("propertyAddress", e.target.value)}
                    style={inputStyle}
                    placeholder="123 Rural Road"
                  />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "16px" }}>
                  <div style={fieldGroup}>
                    <label style={labelStyle}>City</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={e => updateForm("city", e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                  <div style={fieldGroup}>
                    <label style={labelStyle}>State</label>
                    <select
                      value={formData.state}
                      onChange={e => updateForm("state", e.target.value)}
                      style={inputStyle}
                    >
                      <option value="">Select...</option>
                      {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div style={fieldGroup}>
                    <label style={labelStyle}>ZIP Code</label>
                    <input
                      type="text"
                      value={formData.zipCode}
                      onChange={e => updateForm("zipCode", e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div style={fieldGroup}>
                    <label style={labelStyle}>County</label>
                    <input
                      type="text"
                      value={formData.county}
                      onChange={e => updateForm("county", e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                  <div style={fieldGroup}>
                    <label style={labelStyle}>Parcel Number (if known)</label>
                    <input
                      type="text"
                      value={formData.parcelNumber}
                      onChange={e => updateForm("parcelNumber", e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <h2 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "24px", color: theme.dark }}>
                  Property Details
                </h2>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div style={fieldGroup}>
                    <label style={labelStyle}>Acreage *</label>
                    <input
                      type="number"
                      value={formData.acreage}
                      onChange={e => updateForm("acreage", e.target.value)}
                      style={inputStyle}
                      placeholder="100"
                      min="1"
                    />
                  </div>
                  <div style={fieldGroup}>
                    <label style={labelStyle}>Asking Price (optional)</label>
                    <input
                      type="number"
                      value={formData.askingPrice}
                      onChange={e => updateForm("askingPrice", e.target.value)}
                      style={inputStyle}
                      placeholder="500000"
                    />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div style={fieldGroup}>
                    <label style={labelStyle}>Zoning</label>
                    <select
                      value={formData.zoning}
                      onChange={e => updateForm("zoning", e.target.value)}
                      style={inputStyle}
                    >
                      <option value="">Select...</option>
                      <option value="agricultural">Agricultural</option>
                      <option value="residential">Residential</option>
                      <option value="commercial">Commercial</option>
                      <option value="industrial">Industrial</option>
                      <option value="mixed-use">Mixed Use</option>
                      <option value="unzoned">Unzoned</option>
                    </select>
                  </div>
                  <div style={fieldGroup}>
                    <label style={labelStyle}>Property Type</label>
                    <select
                      value={formData.propertyType}
                      onChange={e => updateForm("propertyType", e.target.value)}
                      style={inputStyle}
                    >
                      <option value="">Select...</option>
                      <option value="farmland">Farmland</option>
                      <option value="pasture">Pasture</option>
                      <option value="woodland">Woodland</option>
                      <option value="vacant-land">Vacant Land</option>
                      <option value="ranch">Ranch</option>
                      <option value="orchard">Orchard/Vineyard</option>
                    </select>
                  </div>
                </div>
                <div style={fieldGroup}>
                  <label style={labelStyle}>Current Use</label>
                  <input
                    type="text"
                    value={formData.currentUse}
                    onChange={e => updateForm("currentUse", e.target.value)}
                    style={inputStyle}
                    placeholder="e.g., Cattle grazing, Hay production, Timber"
                  />
                </div>

                <h3 style={{ fontSize: "16px", fontWeight: 600, margin: "24px 0 16px", color: theme.dark }}>
                  Utilities Available
                </h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
                  {["electric", "water", "sewer", "gas", "internet"].map(util => (
                    <label key={util} style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={formData.utilitiesAvailable[util as keyof typeof formData.utilitiesAvailable]}
                        onChange={e => updateUtility(util, e.target.checked)}
                      />
                      <span style={{ fontSize: "14px", textTransform: "capitalize" }}>{util}</span>
                    </label>
                  ))}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginTop: "24px" }}>
                  <div style={fieldGroup}>
                    <label style={labelStyle}>Road Access</label>
                    <select
                      value={formData.roadAccess}
                      onChange={e => updateForm("roadAccess", e.target.value)}
                      style={inputStyle}
                    >
                      <option value="">Select...</option>
                      <option value="paved">Paved Road</option>
                      <option value="gravel">Gravel Road</option>
                      <option value="dirt">Dirt Road</option>
                      <option value="private">Private Road</option>
                      <option value="none">No Road Access</option>
                    </select>
                  </div>
                  <div style={fieldGroup}>
                    <label style={labelStyle}>Water Source</label>
                    <select
                      value={formData.waterSource}
                      onChange={e => updateForm("waterSource", e.target.value)}
                      style={inputStyle}
                    >
                      <option value="">Select...</option>
                      <option value="municipal">Municipal Water</option>
                      <option value="well">Well</option>
                      <option value="pond">Pond/Lake</option>
                      <option value="stream">Stream/River</option>
                      <option value="none">None</option>
                    </select>
                  </div>
                  <div style={fieldGroup}>
                    <label style={labelStyle}>Topography</label>
                    <select
                      value={formData.topography}
                      onChange={e => updateForm("topography", e.target.value)}
                      style={inputStyle}
                    >
                      <option value="">Select...</option>
                      <option value="flat">Flat</option>
                      <option value="rolling">Rolling Hills</option>
                      <option value="hilly">Hilly</option>
                      <option value="mountainous">Mountainous</option>
                      <option value="mixed">Mixed</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <h2 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "24px", color: theme.dark }}>
                  Legal & Motivation
                </h2>
                <div style={fieldGroup}>
                  <label style={labelStyle}>Any structures on the property?</label>
                  <textarea
                    value={formData.structuresOnProperty}
                    onChange={e => updateForm("structuresOnProperty", e.target.value)}
                    style={{ ...inputStyle, minHeight: "80px", resize: "vertical" }}
                    placeholder="e.g., Barn, farmhouse, storage shed..."
                  />
                </div>
                <div style={fieldGroup}>
                  <label style={labelStyle}>Known environmental issues?</label>
                  <textarea
                    value={formData.environmentalIssues}
                    onChange={e => updateForm("environmentalIssues", e.target.value)}
                    style={{ ...inputStyle, minHeight: "80px", resize: "vertical" }}
                    placeholder="e.g., Wetlands, flood zone, previous contamination..."
                  />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div style={fieldGroup}>
                    <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: "8px" }}>
                      <input
                        type="checkbox"
                        checked={formData.titleClear}
                        onChange={e => updateForm("titleClear", e.target.checked)}
                      />
                      Title is clear (no disputes)
                    </label>
                  </div>
                  <div style={fieldGroup}>
                    <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: "8px" }}>
                      <input
                        type="checkbox"
                        checked={formData.openToOption}
                        onChange={e => updateForm("openToOption", e.target.checked)}
                      />
                      Open to option agreement
                    </label>
                  </div>
                </div>
                <div style={fieldGroup}>
                  <label style={labelStyle}>Liens or encumbrances?</label>
                  <input
                    type="text"
                    value={formData.liensEncumbrances}
                    onChange={e => updateForm("liensEncumbrances", e.target.value)}
                    style={inputStyle}
                    placeholder="e.g., Mortgage, easements, HOA..."
                  />
                </div>

                <h3 style={{ fontSize: "16px", fontWeight: 600, margin: "24px 0 16px", color: theme.dark }}>
                  Seller Motivation
                </h3>
                <div style={fieldGroup}>
                  <label style={labelStyle}>Why are you selling?</label>
                  <textarea
                    value={formData.ownerMotivation}
                    onChange={e => updateForm("ownerMotivation", e.target.value)}
                    style={{ ...inputStyle, minHeight: "80px", resize: "vertical" }}
                    placeholder="e.g., Retirement, relocation, estate planning..."
                  />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div style={fieldGroup}>
                    <label style={labelStyle}>Timeline to sell</label>
                    <select
                      value={formData.timelineToSell}
                      onChange={e => updateForm("timelineToSell", e.target.value)}
                      style={inputStyle}
                    >
                      <option value="">Select...</option>
                      <option value="immediate">Immediate</option>
                      <option value="1-3 months">1-3 months</option>
                      <option value="3-6 months">3-6 months</option>
                      <option value="6-12 months">6-12 months</option>
                      <option value="flexible">Flexible</option>
                    </select>
                  </div>
                  <div style={fieldGroup}>
                    <label style={labelStyle}>Acceptable option premium ($)</label>
                    <input
                      type="number"
                      value={formData.optionPremiumAcceptable}
                      onChange={e => updateForm("optionPremiumAcceptable", e.target.value)}
                      style={inputStyle}
                      placeholder="e.g., 10000"
                    />
                  </div>
                </div>
                <div style={fieldGroup}>
                  <label style={labelStyle}>Additional notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={e => updateForm("notes", e.target.value)}
                    style={{ ...inputStyle, minHeight: "100px", resize: "vertical" }}
                    placeholder="Any other information you'd like to share..."
                  />
                </div>
              </div>
            )}

            {error && (
              <div style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "8px",
                padding: "12px 16px",
                marginBottom: "20px",
                color: "#dc2626",
                fontSize: "14px"
              }}>
                {error}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "32px" }}>
              {step > 1 ? (
                <button
                  onClick={() => setStep(step - 1)}
                  style={{
                    padding: "12px 24px",
                    background: theme.white,
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontWeight: 500
                  }}
                >
                  Back
                </button>
              ) : (
                <div />
              )}
              
              {step < 3 ? (
                <button
                  onClick={() => setStep(step + 1)}
                  disabled={
                    (step === 1 && (!formData.ownerName || !formData.ownerEmail || !formData.propertyAddress)) ||
                    (step === 2 && !formData.acreage)
                  }
                  style={{
                    padding: "12px 32px",
                    background: theme.primary,
                    color: theme.white,
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontWeight: 600,
                    opacity: (step === 1 && (!formData.ownerName || !formData.ownerEmail || !formData.propertyAddress)) ||
                             (step === 2 && !formData.acreage) ? 0.5 : 1
                  }}
                >
                  Continue
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  style={{
                    padding: "12px 32px",
                    background: theme.gold,
                    color: theme.dark,
                    border: "none",
                    borderRadius: "8px",
                    cursor: isSubmitting ? "wait" : "pointer",
                    fontWeight: 700
                  }}
                >
                  {isSubmitting ? "Submitting..." : "Submit Property"}
                </button>
              )}
            </div>
          </div>

          <p style={{ textAlign: "center", marginTop: "24px", fontSize: "13px", color: theme.muted }}>
            Your information is secure and will only be used to evaluate your property.
          </p>
        </div>
      </main>
    </>
  );
}
