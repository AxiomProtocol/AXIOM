import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { SiteLayout } from '../../components/navigation';

interface Property {
  id: number;
  name: string;
  location?: string;
  county?: string;
  state?: string;
  acreage?: number;
  askingPrice?: number;
  pricePerAcre?: number;
  propertyType?: string;
  stage: string;
  stewardshipIntent?: string;
  featuredImageUrl?: string;
  dueDiligence?: {
    completedTasks: number;
    totalTasks: number;
    progress: number;
  };
  commentCount: number;
}

interface ComparisonRow {
  field: string;
  values: string[];
}

interface ComparisonData {
  properties: Property[];
  comparison: ComparisonRow[];
  summary: {
    propertyCount: number;
    totalAcreage: number;
    totalValue: number;
    avgPricePerAcre: number;
  };
}

interface AllCandidate {
  id: number;
  name: string;
  stage: string;
  acreage?: string;
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

export default function CompareProperties() {
  const router = useRouter();
  const { ids } = router.query;
  
  const [data, setData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [allCandidates, setAllCandidates] = useState<AllCandidate[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  useEffect(() => {
    fetch('/api/land/candidates')
      .then(r => r.json())
      .then(d => {
        if (d.success) setAllCandidates(d.data || []);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (ids) {
      const idList = (ids as string).split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      setSelectedIds(idList);
    }
  }, [ids]);

  useEffect(() => {
    if (selectedIds.length >= 2) {
      setLoading(true);
      fetch(`/api/land/compare?ids=${selectedIds.join(',')}`)
        .then(r => r.json())
        .then(d => {
          if (d.success) setData(d.data);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
      
      router.replace(`/land/compare?ids=${selectedIds.join(',')}`, undefined, { shallow: true });
    } else {
      setData(null);
      setLoading(false);
    }
  }, [selectedIds]);

  const handleToggleProperty = (id: number) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(i => i !== id);
      } else if (prev.length < 3) {
        return [...prev, id];
      }
      return prev;
    });
  };

  return (
    <SiteLayout>
      <Head>
        <title>Compare Properties | Axiom Protocol</title>
        <meta name="description" content="Compare land candidates side by side" />
      </Head>

      <div style={{ background: "#FFFFFF", minHeight: "100vh" }}>
        <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "40px 20px" }}>
          <Link href="/land" style={{
            display: "inline-flex", alignItems: "center", gap: "8px",
            color: "#00A389", textDecoration: "none", fontSize: "14px",
            fontWeight: 500, marginBottom: "24px"
          }}>
            <span style={{ fontSize: "18px" }}>&larr;</span>
            Back to Land Candidates
          </Link>

          <h1 style={{ fontSize: "32px", fontWeight: 700, color: "#1a1a2e", marginBottom: "8px" }}>
            Compare Properties
          </h1>
          <p style={{ color: "#64748b", fontSize: "16px", marginBottom: "32px" }}>
            Select 2-3 properties to compare side by side
          </p>

          <div style={{ marginBottom: "32px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 600, color: "#1a1a2e", marginBottom: "12px" }}>
              Select Properties ({selectedIds.length}/3)
            </h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {allCandidates.filter(c => c.stage !== 'archived').map(candidate => {
                const isSelected = selectedIds.includes(candidate.id);
                return (
                  <button
                    key={candidate.id}
                    onClick={() => handleToggleProperty(candidate.id)}
                    disabled={!isSelected && selectedIds.length >= 3}
                    style={{
                      padding: "8px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: 500,
                      background: isSelected ? "#00A389" : "#f9fafb",
                      color: isSelected ? "#fff" : "#4b5563",
                      border: `1px solid ${isSelected ? "#00A389" : "#e5e7eb"}`,
                      cursor: (!isSelected && selectedIds.length >= 3) ? "not-allowed" : "pointer",
                      opacity: (!isSelected && selectedIds.length >= 3) ? 0.5 : 1
                    }}
                  >
                    {candidate.name}
                  </button>
                );
              })}
            </div>
          </div>

          {selectedIds.length < 2 ? (
            <div style={{ padding: "60px", textAlign: "center", background: "#f9fafb", borderRadius: "16px", color: "#64748b" }}>
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚖️</div>
              <h3 style={{ fontSize: "18px", fontWeight: 600, color: "#1a1a2e", marginBottom: "8px" }}>
                Select at least 2 properties to compare
              </h3>
              <p>Click on the properties above to add them to the comparison</p>
            </div>
          ) : loading ? (
            <div style={{ textAlign: "center", padding: "60px", color: "#64748b" }}>
              Loading comparison...
            </div>
          ) : data ? (
            <>
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${data.properties.length + 1}, 1fr)`, gap: "16px", marginBottom: "32px" }}>
                <div style={{ padding: "20px", background: "#1a1a2e", borderRadius: "12px", color: "#fff" }}>
                  <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "8px" }}>Summary</h3>
                  <div style={{ fontSize: "24px", fontWeight: 700 }}>{data.summary.propertyCount} Properties</div>
                  <div style={{ fontSize: "13px", color: "#9ca3af", marginTop: "8px" }}>
                    {data.summary.totalAcreage.toLocaleString()} total acres
                  </div>
                </div>
                {data.properties.map(property => (
                  <div key={property.id} style={{ padding: "20px", background: "#f9fafb", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
                    {property.featuredImageUrl && (
                      <div style={{
                        height: "120px", borderRadius: "8px", marginBottom: "12px",
                        background: `url(${property.featuredImageUrl}) center/cover`
                      }} />
                    )}
                    <Link href={`/land/${property.id}`} style={{ textDecoration: "none" }}>
                      <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#1a1a2e", marginBottom: "4px" }}>
                        {property.name}
                      </h3>
                    </Link>
                    <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "8px" }}>
                      {property.county && `${property.county} County, `}{property.state || 'AR'}
                    </p>
                    {STAGE_LABELS[property.stage] && (
                      <span style={{
                        display: "inline-block", padding: "4px 10px", borderRadius: "100px",
                        fontSize: "11px", fontWeight: 600,
                        background: `${STAGE_LABELS[property.stage].color}20`,
                        color: STAGE_LABELS[property.stage].color
                      }}>
                        {STAGE_LABELS[property.stage].label}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ background: "#fff", borderRadius: "16px", border: "1px solid #e5e7eb", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f9fafb" }}>
                      <th style={{ padding: "16px 20px", textAlign: "left", fontSize: "14px", fontWeight: 600, color: "#1a1a2e", borderBottom: "1px solid #e5e7eb" }}>
                        Attribute
                      </th>
                      {data.properties.map(property => (
                        <th key={property.id} style={{ padding: "16px 20px", textAlign: "left", fontSize: "14px", fontWeight: 600, color: "#1a1a2e", borderBottom: "1px solid #e5e7eb" }}>
                          {property.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.comparison.map((row, index) => (
                      <tr key={row.field} style={{ background: index % 2 === 0 ? "#fff" : "#fafafa" }}>
                        <td style={{ padding: "14px 20px", fontSize: "14px", color: "#64748b", borderBottom: "1px solid #f0f0f0" }}>
                          {row.field}
                        </td>
                        {row.values.map((value, i) => (
                          <td key={i} style={{ padding: "14px 20px", fontSize: "14px", fontWeight: 500, color: "#1a1a2e", borderBottom: "1px solid #f0f0f0" }}>
                            {value}
                          </td>
                        ))}
                      </tr>
                    ))}
                    <tr style={{ background: "#f0fdf4" }}>
                      <td style={{ padding: "14px 20px", fontSize: "14px", fontWeight: 600, color: "#166534" }}>
                        Due Diligence Progress
                      </td>
                      {data.properties.map(property => (
                        <td key={property.id} style={{ padding: "14px 20px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <div style={{ flex: 1, height: "6px", background: "#e5e7eb", borderRadius: "3px", overflow: "hidden" }}>
                              <div style={{
                                height: "100%",
                                width: `${property.dueDiligence?.progress || 0}%`,
                                background: "#22c55e",
                                borderRadius: "3px"
                              }} />
                            </div>
                            <span style={{ fontSize: "13px", fontWeight: 600, color: "#166534" }}>
                              {property.dueDiligence?.progress || 0}%
                            </span>
                          </div>
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td style={{ padding: "14px 20px", fontSize: "14px", color: "#64748b" }}>
                        Discussion Comments
                      </td>
                      {data.properties.map(property => (
                        <td key={property.id} style={{ padding: "14px 20px", fontSize: "14px", fontWeight: 500, color: "#1a1a2e" }}>
                          {property.commentCount} comments
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: "32px", padding: "24px", background: "#f9fafb", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
                <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#1a1a2e", marginBottom: "12px" }}>Stewardship Intents</h3>
                <div style={{ display: "grid", gridTemplateColumns: `repeat(${data.properties.length}, 1fr)`, gap: "16px" }}>
                  {data.properties.map(property => (
                    <div key={property.id}>
                      <h4 style={{ fontSize: "14px", fontWeight: 600, color: "#00A389", marginBottom: "8px" }}>{property.name}</h4>
                      <p style={{ fontSize: "13px", color: "#4b5563", lineHeight: 1.6 }}>
                        {property.stewardshipIntent || "No stewardship intent defined."}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </SiteLayout>
  );
}
