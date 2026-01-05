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

interface Campaign {
  id: number;
  land_option_id: number;
  title: string;
  subtitle: string | null;
  description: string | null;
  target_amount: string;
  raised_amount: string;
  investor_count: number;
  status: string;
  start_date: string | null;
  end_date: string | null;
  min_investment: string;
  max_investment: string | null;
  requires_accreditation: boolean;
  created_at: string;
  land_option?: {
    location: string;
    acreage: string;
    purchase_price: string;
  };
}

interface Stats {
  total: number;
  draft: number;
  active: number;
  funded: number;
  closed: number;
  total_raised: string;
  total_investors: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: "Draft", color: "#6b7280", bg: "#f3f4f6" },
  active: { label: "Active", color: "#10b981", bg: "#ecfdf5" },
  funded: { label: "Funded", color: "#3b82f6", bg: "#eff6ff" },
  closed: { label: "Closed", color: "#f59e0b", bg: "#fffbeb" },
  cancelled: { label: "Cancelled", color: "#ef4444", bg: "#fef2f2" }
};

export default function AdminCrowdfundingPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const fetchCampaigns = async () => {
    try {
      const url = filter === "all"
        ? "/api/land-acquisition/campaigns"
        : `/api/land-acquisition/campaigns?status=${filter}`;

      const res = await fetch(url);
      const data = await res.json();

      if (data.success) {
        setCampaigns(data.data?.campaigns || []);
        setStats(data.data?.stats || null);
      }
    } catch (error) {
      console.error("Failed to fetch campaigns:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, [filter]);

  const formatCurrency = (val: string | null) => {
    if (!val) return "$0";
    return `$${parseFloat(val).toLocaleString()}`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  const getProgress = (raised: string, target: string) => {
    const r = parseFloat(raised) || 0;
    const t = parseFloat(target) || 1;
    return Math.min((r / t) * 100, 100);
  };

  return (
    <>
      <Head>
        <title>Crowdfunding Admin | Axiom Protocol</title>
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
              { label: "Dashboard", href: "/admin/treasury" },
              { label: "Land Deals", href: "/admin/land-deals" },
              { label: "Crowdfunding", href: "/admin/crowdfunding", active: true },
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
                  Crowdfunding Campaigns
                </h1>
                <p style={{ color: theme.muted }}>Manage SEC Reg CF compliant fundraising campaigns</p>
              </div>
            </div>

            {stats && (
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(5, 1fr)",
                gap: "16px",
                marginBottom: "32px"
              }}>
                {[
                  { label: "Total", value: stats.total, color: theme.dark },
                  { label: "Draft", value: stats.draft, color: "#6b7280" },
                  { label: "Active", value: stats.active, color: "#10b981" },
                  { label: "Funded", value: stats.funded, color: "#3b82f6" },
                  { label: "Closed", value: stats.closed, color: "#f59e0b" }
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
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: "16px",
                marginBottom: "32px"
              }}>
                <div style={{ background: theme.white, borderRadius: "12px", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                  <div style={{ fontSize: "14px", color: theme.muted, marginBottom: "4px" }}>Total Raised</div>
                  <div style={{ fontSize: "24px", fontWeight: 700, color: theme.primary }}>
                    {formatCurrency(stats.total_raised)}
                  </div>
                </div>
                <div style={{ background: theme.white, borderRadius: "12px", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                  <div style={{ fontSize: "14px", color: theme.muted, marginBottom: "4px" }}>Total Investors</div>
                  <div style={{ fontSize: "24px", fontWeight: 700, color: theme.secondary }}>
                    {stats.total_investors?.toLocaleString() || 0}
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: "8px", marginBottom: "24px" }}>
              {["all", "draft", "active", "funded", "closed"].map(status => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    border: "1px solid",
                    borderColor: filter === status ? theme.primary : "rgba(0,0,0,0.1)",
                    background: filter === status ? theme.primary : theme.white,
                    color: filter === status ? theme.white : theme.dark,
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: 500,
                    textTransform: "capitalize"
                  }}
                >
                  {status === "all" ? "All Campaigns" : status}
                </button>
              ))}
            </div>

            {loading ? (
              <div style={{ textAlign: "center", padding: "60px", color: theme.muted }}>
                Loading campaigns...
              </div>
            ) : campaigns.length === 0 ? (
              <div style={{
                background: theme.white,
                borderRadius: "16px",
                padding: "60px",
                textAlign: "center",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
              }}>
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>📊</div>
                <h3 style={{ fontSize: "18px", fontWeight: 600, color: theme.dark, marginBottom: "8px" }}>
                  No Campaigns Yet
                </h3>
                <p style={{ color: theme.muted, marginBottom: "24px" }}>
                  Crowdfunding campaigns will appear here once land options are approved.
                </p>
                <Link
                  href="/admin/land-deals"
                  style={{
                    display: "inline-block",
                    padding: "12px 24px",
                    background: theme.primary,
                    color: theme.white,
                    borderRadius: "8px",
                    textDecoration: "none",
                    fontWeight: 500
                  }}
                >
                  View Land Deals
                </Link>
              </div>
            ) : (
              <div style={{ display: "grid", gap: "16px" }}>
                {campaigns.map(campaign => {
                  const progress = getProgress(campaign.raised_amount, campaign.target_amount);
                  const statusConfig = STATUS_CONFIG[campaign.status] || STATUS_CONFIG.draft;

                  return (
                    <div
                      key={campaign.id}
                      style={{
                        background: theme.white,
                        borderRadius: "16px",
                        padding: "24px",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                        <div>
                          <h3 style={{ fontSize: "18px", fontWeight: 600, color: theme.dark, marginBottom: "4px" }}>
                            {campaign.title}
                          </h3>
                          {campaign.subtitle && (
                            <p style={{ color: theme.muted, fontSize: "14px" }}>{campaign.subtitle}</p>
                          )}
                        </div>
                        <span style={{
                          padding: "4px 12px",
                          borderRadius: "20px",
                          fontSize: "12px",
                          fontWeight: 600,
                          background: statusConfig.bg,
                          color: statusConfig.color
                        }}>
                          {statusConfig.label}
                        </span>
                      </div>

                      <div style={{ marginBottom: "16px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                          <span style={{ fontSize: "14px", color: theme.muted }}>
                            {formatCurrency(campaign.raised_amount)} raised
                          </span>
                          <span style={{ fontSize: "14px", fontWeight: 600, color: theme.dark }}>
                            {progress.toFixed(1)}%
                          </span>
                        </div>
                        <div style={{ height: "8px", background: "#e5e7eb", borderRadius: "4px", overflow: "hidden" }}>
                          <div style={{
                            width: `${progress}%`,
                            height: "100%",
                            background: progress >= 100 ? "#10b981" : theme.primary,
                            borderRadius: "4px",
                            transition: "width 0.3s"
                          }} />
                        </div>
                        <div style={{ textAlign: "right", marginTop: "4px" }}>
                          <span style={{ fontSize: "12px", color: theme.muted }}>
                            Goal: {formatCurrency(campaign.target_amount)}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", fontSize: "13px" }}>
                        <div>
                          <div style={{ color: theme.muted, marginBottom: "2px" }}>Investors</div>
                          <div style={{ fontWeight: 600, color: theme.dark }}>{campaign.investor_count}</div>
                        </div>
                        <div>
                          <div style={{ color: theme.muted, marginBottom: "2px" }}>Min Investment</div>
                          <div style={{ fontWeight: 600, color: theme.dark }}>{formatCurrency(campaign.min_investment)}</div>
                        </div>
                        <div>
                          <div style={{ color: theme.muted, marginBottom: "2px" }}>Start Date</div>
                          <div style={{ fontWeight: 600, color: theme.dark }}>{formatDate(campaign.start_date)}</div>
                        </div>
                        <div>
                          <div style={{ color: theme.muted, marginBottom: "2px" }}>End Date</div>
                          <div style={{ fontWeight: 600, color: theme.dark }}>{formatDate(campaign.end_date)}</div>
                        </div>
                      </div>

                      {campaign.requires_accreditation && (
                        <div style={{
                          marginTop: "16px",
                          padding: "8px 12px",
                          background: "#fef3c7",
                          borderRadius: "8px",
                          fontSize: "12px",
                          color: "#92400e"
                        }}>
                          ⚠️ Accredited investors only
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
