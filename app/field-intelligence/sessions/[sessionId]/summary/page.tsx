/**
 * Inspection Session Completion Report
 * Displayed after all units are walked and the session is submitted.
 * Fetches the computed summary and renders it in structured blocks
 * with a one-click clipboard copy button.
 * Route: /field-intelligence/sessions/[sessionId]/summary
 * Layer 5: Field Intelligence Capture
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../../components/ui/card";
import { Button } from "../../../../../components/ui/button";
import { Badge } from "../../../../../components/ui/badge";
import {
  Loader2,
  Copy,
  Check,
  AlertCircle,
  ClipboardCheck,
  ArrowLeft,
} from "lucide-react";

// ─── Type Shapes ────────────────────────────────────────────────────────────

interface SystemCount {
  good: number;
  light_rehab: number;
  medium_rehab: number;
  full_replace: number;
  not_inspected: number;
}

interface DeficiencyCount {
  total: number;
  minor: number;
  moderate: number;
  major: number;
  critical: number;
}

interface RehabBreakdown {
  units_needing_light_rehab: number;
  units_needing_medium_rehab: number;
  units_needing_full_rehab: number;
  estimated_cost_light: number;
  estimated_cost_medium: number;
  estimated_cost_full: number;
}

interface InspectionSummary {
  id: string;
  sessionId: string;
  totalUnitsInProperty: number;
  unitsInspected: number;
  samplingPercentage: string;
  samplingConfidencePercentage: string;
  systemIssueDistribution: Record<string, SystemCount> | null;
  unitsInGoodCondition: number | null;
  unitsNeedingLightRehab: number | null;
  unitsNeedingMediumRehab: number | null;
  unitsNeedingFullRehab: number | null;
  unitsNotInspected: number | null;
  totalDeficiencies: number | null;
  criticalDeficiencies: number | null;
  deficienciesBySystem: Record<string, DeficiencyCount> | null;
  estimatedTotalRehabCost: string | null;
  estimatedAvgCostPerUnit: string | null;
  likelyRehabPackage: string | null;
  rehabPackageBreakdown: RehabBreakdown | null;
  computedAt: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SYSTEM_LABELS: Record<string, string> = {
  kitchen: "Kitchen",
  bathroom: "Bathroom",
  flooring: "Flooring",
  appliances: "Appliances",
  hvac: "HVAC",
  windows: "Windows",
  paint: "Paint",
  plumbing: "Plumbing",
  electrical: "Electrical",
  doors: "Doors",
  exterior: "Exterior",
  commonArea: "Common Area",
  siteParking: "Site / Parking",
  other: "Other",
};

const REHAB_PACKAGE_LABELS: Record<string, string> = {
  hold_as_is: "Hold As-Is",
  cosmetic_updates: "Cosmetic Updates",
  light_rehab: "Light Rehab",
  moderate_renovation: "Moderate Renovation",
  substantial_rehab: "Substantial Rehab",
  major_renovation: "Major Renovation",
};

function fmt(n: number | string | null | undefined, decimals = 0): string {
  const num = typeof n === "string" ? parseFloat(n) : (n ?? 0);
  return isNaN(num) ? "—" : num.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtUsd(n: number | string | null | undefined): string {
  const num = typeof n === "string" ? parseFloat(n) : (n ?? 0);
  return isNaN(num) ? "—" : num.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function conditionBar(count: SystemCount | undefined): React.ReactNode {
  if (!count) return <span className="text-gray-400 text-xs">No data</span>;
  const total = count.good + count.light_rehab + count.medium_rehab + count.full_replace + count.not_inspected;
  if (total === 0) return <span className="text-gray-400 text-xs">—</span>;
  const segments = [
    { key: "good", color: "bg-green-500", label: "Good" },
    { key: "light_rehab", color: "bg-blue-400", label: "Light Rehab" },
    { key: "medium_rehab", color: "bg-yellow-400", label: "Med Rehab" },
    { key: "full_replace", color: "bg-red-500", label: "Full Replace" },
    { key: "not_inspected", color: "bg-gray-300", label: "Not Inspected" },
  ] as const;
  return (
    <div className="flex h-2 w-full rounded-full overflow-hidden gap-px">
      {segments.map(({ key, color }) => {
        const pct = (count[key] / total) * 100;
        if (pct === 0) return null;
        return (
          <div
            key={key}
            className={`${color} h-2`}
            style={{ width: `${pct}%` }}
            title={`${SYSTEM_LABELS[key] ?? key}: ${count[key]}`}
          />
        );
      })}
    </div>
  );
}

// ─── Plain-text report builder (for clipboard) ───────────────────────────────

function buildPlainTextReport(summary: InspectionSummary, sessionId: string): string {
  const lines: string[] = [];

  lines.push("════════════════════════════════════════════════");
  lines.push("  FIELD INSPECTION COMPLETION REPORT");
  lines.push("════════════════════════════════════════════════");
  lines.push(`Session ID:          ${sessionId}`);
  lines.push(`Computed At:         ${new Date(summary.computedAt).toLocaleString()}`);
  lines.push("");

  lines.push("── SAMPLING METRICS ────────────────────────────");
  lines.push(`Total Units in Property:  ${summary.totalUnitsInProperty}`);
  lines.push(`Units Inspected:          ${summary.unitsInspected}`);
  lines.push(`Sampling %:               ${fmt(summary.samplingPercentage, 1)}%`);
  lines.push(`Sampling Confidence:      ${fmt(summary.samplingConfidencePercentage, 1)}%`);
  lines.push("");

  lines.push("── UNIT CONDITION DISTRIBUTION ─────────────────");
  lines.push(`Good Condition:           ${summary.unitsInGoodCondition ?? 0}`);
  lines.push(`Needs Light Rehab:        ${summary.unitsNeedingLightRehab ?? 0}`);
  lines.push(`Needs Medium Rehab:       ${summary.unitsNeedingMediumRehab ?? 0}`);
  lines.push(`Needs Full Rehab:         ${summary.unitsNeedingFullRehab ?? 0}`);
  lines.push(`Not Inspected:            ${summary.unitsNotInspected ?? 0}`);
  lines.push("");

  lines.push("── DEFICIENCY SUMMARY ──────────────────────────");
  lines.push(`Total Deficiencies:       ${summary.totalDeficiencies ?? 0}`);
  lines.push(`Critical Deficiencies:    ${summary.criticalDeficiencies ?? 0}`);
  lines.push("");

  if (summary.deficienciesBySystem) {
    lines.push("  By System:");
    for (const [sys, counts] of Object.entries(summary.deficienciesBySystem)) {
      if (counts.total > 0) {
        lines.push(
          `    ${(SYSTEM_LABELS[sys] ?? sys).padEnd(16)} total=${counts.total}  critical=${counts.critical}  major=${counts.major}  moderate=${counts.moderate}  minor=${counts.minor}`
        );
      }
    }
    lines.push("");
  }

  lines.push("── COST ESTIMATION ─────────────────────────────");
  lines.push(`Est. Total Rehab Cost:    ${fmtUsd(summary.estimatedTotalRehabCost)}`);
  lines.push(`Est. Avg Cost / Unit:     ${fmtUsd(summary.estimatedAvgCostPerUnit)}`);
  lines.push("");

  lines.push("── REHAB PACKAGE RECOMMENDATION ────────────────");
  lines.push(`Likely Rehab Package:     ${REHAB_PACKAGE_LABELS[summary.likelyRehabPackage ?? ""] ?? summary.likelyRehabPackage ?? "—"}`);
  if (summary.rehabPackageBreakdown) {
    const rb = summary.rehabPackageBreakdown;
    lines.push(`  Units – Light Rehab:    ${rb.units_needing_light_rehab}  (${fmtUsd(rb.estimated_cost_light)})`);
    lines.push(`  Units – Medium Rehab:   ${rb.units_needing_medium_rehab}  (${fmtUsd(rb.estimated_cost_medium)})`);
    lines.push(`  Units – Full Rehab:     ${rb.units_needing_full_rehab}  (${fmtUsd(rb.estimated_cost_full)})`);
  }
  lines.push("");
  lines.push("════════════════════════════════════════════════");

  return lines.join("\n");
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function InspectionSummaryPage() {
  const params = useParams<{ sessionId?: string | string[] }>();
  const router = useRouter();
  const sessionId = Array.isArray(params?.sessionId)
    ? params.sessionId[0]
    : params?.sessionId ?? "";

  const [summary, setSummary] = useState<InspectionSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    setIsLoading(true);
    setError(null);
    fetch(`/api/field-intelligence/summary?sessionId=${sessionId}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        return res.json();
      })
      .then((data) => setSummary(data))
      .catch((err) => setError(err instanceof Error ? err.message : "Unknown error"))
      .finally(() => setIsLoading(false));
  }, [sessionId]);

  const handleCopy = useCallback(async () => {
    if (!summary) return;
    try {
      await navigator.clipboard.writeText(buildPlainTextReport(summary, sessionId));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback for environments without clipboard API
      const el = document.createElement("textarea");
      el.value = buildPlainTextReport(summary, sessionId);
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }, [summary, sessionId]);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3 text-gray-500">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-sm">Loading inspection report…</p>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error || !summary) {
    return (
      <div className="max-w-lg mx-auto p-6">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Report Unavailable
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700 text-sm">
              {error ?? "No summary data found for this session."}
            </p>
            <Button
              variant="outline"
              className="mt-4 w-full"
              onClick={() => router.back()}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const samplingPct = parseFloat(summary.samplingPercentage);
  const samplingBadge =
    samplingPct >= 80 ? "bg-green-500" : samplingPct >= 50 ? "bg-yellow-500" : "bg-red-500";

  const sysEntries = Object.entries(summary.systemIssueDistribution ?? {});
  const defEntries = Object.entries(summary.deficienciesBySystem ?? {}).filter(
    ([, c]) => c.total > 0
  );
  const rb = summary.rehabPackageBreakdown;

  // ── Report ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ClipboardCheck className="w-6 h-6 text-green-600" />
            <h1 className="text-2xl font-bold text-gray-900">Inspection Report</h1>
          </div>
          <p className="text-sm text-gray-500">
            Session&nbsp;
            <span className="font-mono text-gray-700">{sessionId.slice(0, 8)}…</span>
            &nbsp;·&nbsp;
            <span>Computed {new Date(summary.computedAt).toLocaleString()}</span>
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={handleCopy}
            className="flex items-center gap-2"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-green-600" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy Report
              </>
            )}
          </Button>
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
      </div>

      {/* ── Block 1: Sampling Metrics ────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold text-gray-700 uppercase tracking-wide">
            Sampling Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">Total Units</p>
              <p className="text-2xl font-bold">{summary.totalUnitsInProperty}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">Inspected</p>
              <p className="text-2xl font-bold text-blue-600">{summary.unitsInspected}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">Sampling %</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">{fmt(summary.samplingPercentage, 1)}%</p>
                <Badge className={samplingBadge}>
                  {samplingPct >= 80 ? "High" : samplingPct >= 50 ? "Med" : "Low"}
                </Badge>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">Confidence</p>
              <p className="text-2xl font-bold">{fmt(summary.samplingConfidencePercentage, 1)}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Block 2: Unit Condition Distribution ─────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold text-gray-700 uppercase tracking-wide">
            Unit Condition Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Stacked bar */}
          <div className="space-y-1 mb-4">
            {(() => {
              const total = summary.unitsInspected || 1;
              const bars = [
                { label: "Good", count: summary.unitsInGoodCondition ?? 0, color: "bg-green-500" },
                { label: "Light Rehab", count: summary.unitsNeedingLightRehab ?? 0, color: "bg-blue-400" },
                { label: "Medium Rehab", count: summary.unitsNeedingMediumRehab ?? 0, color: "bg-yellow-400" },
                { label: "Full Rehab", count: summary.unitsNeedingFullRehab ?? 0, color: "bg-red-500" },
                { label: "Not Inspected", count: summary.unitsNotInspected ?? 0, color: "bg-gray-300" },
              ];
              return (
                <>
                  <div className="flex h-4 rounded-full overflow-hidden gap-px">
                    {bars.map(({ label, count, color }) =>
                      count > 0 ? (
                        <div
                          key={label}
                          className={`${color} h-4`}
                          style={{ width: `${(count / total) * 100}%` }}
                          title={`${label}: ${count}`}
                        />
                      ) : null
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
                    {bars.map(({ label, count, color }) => (
                      <div key={label} className="flex items-center gap-2">
                        <span className={`inline-block w-3 h-3 rounded-sm ${color}`} />
                        <span className="text-xs text-gray-600">{label}</span>
                        <span className="text-xs font-semibold ml-auto">{count}</span>
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}
          </div>
        </CardContent>
      </Card>

      {/* ── Block 3: System Issue Distribution ───────────────────────────── */}
      {sysEntries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold text-gray-700 uppercase tracking-wide">
              System Condition Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sysEntries.map(([sys, counts]) => (
                <div key={sys}>
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span className="font-medium">{SYSTEM_LABELS[sys] ?? sys}</span>
                    <span className="text-gray-400">
                      {counts.good}G / {counts.light_rehab}L / {counts.medium_rehab}M / {counts.full_replace}F
                    </span>
                  </div>
                  {conditionBar(counts)}
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t text-xs text-gray-500">
              <span><span className="inline-block w-2 h-2 rounded-sm bg-green-500 mr-1" />Good</span>
              <span><span className="inline-block w-2 h-2 rounded-sm bg-blue-400 mr-1" />Light Rehab</span>
              <span><span className="inline-block w-2 h-2 rounded-sm bg-yellow-400 mr-1" />Medium Rehab</span>
              <span><span className="inline-block w-2 h-2 rounded-sm bg-red-500 mr-1" />Full Replace</span>
              <span><span className="inline-block w-2 h-2 rounded-sm bg-gray-300 mr-1" />Not Inspected</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Block 4: Deficiency Summary ───────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold text-gray-700 uppercase tracking-wide">
            Deficiency Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">Total Deficiencies</p>
              <p className="text-3xl font-bold">{summary.totalDeficiencies ?? 0}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">Critical</p>
              <p className="text-3xl font-bold text-red-600">{summary.criticalDeficiencies ?? 0}</p>
            </div>
          </div>

          {defEntries.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left py-2 px-3 font-medium text-gray-600">System</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-600">Total</th>
                    <th className="text-right py-2 px-3 font-medium text-red-700">Critical</th>
                    <th className="text-right py-2 px-3 font-medium text-orange-700">Major</th>
                    <th className="text-right py-2 px-3 font-medium text-yellow-700">Moderate</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-600">Minor</th>
                  </tr>
                </thead>
                <tbody>
                  {defEntries.map(([sys, counts], idx) => (
                    <tr key={sys} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="py-2 px-3 font-medium">{SYSTEM_LABELS[sys] ?? sys}</td>
                      <td className="py-2 px-3 text-right font-semibold">{counts.total}</td>
                      <td className="py-2 px-3 text-right text-red-700">{counts.critical}</td>
                      <td className="py-2 px-3 text-right text-orange-700">{counts.major}</td>
                      <td className="py-2 px-3 text-right text-yellow-700">{counts.moderate}</td>
                      <td className="py-2 px-3 text-right text-gray-600">{counts.minor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Block 5: Cost Estimation ──────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold text-gray-700 uppercase tracking-wide">
            Cost Estimation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">Est. Total Rehab Cost</p>
              <p className="text-2xl font-bold text-green-700">
                {fmtUsd(summary.estimatedTotalRehabCost)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">Est. Avg Cost / Unit</p>
              <p className="text-2xl font-bold text-green-600">
                {fmtUsd(summary.estimatedAvgCostPerUnit)}
              </p>
            </div>
          </div>

          {rb && (
            <div className="mt-4 pt-3 border-t space-y-2">
              <p className="text-xs font-medium text-gray-600">Breakdown by Rehab Level</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="border rounded p-3 bg-blue-50">
                  <p className="text-xs text-blue-700 font-medium mb-1">Light Rehab</p>
                  <p className="text-sm font-bold">{rb.units_needing_light_rehab} units</p>
                  <p className="text-xs text-gray-500">{fmtUsd(rb.estimated_cost_light)}</p>
                </div>
                <div className="border rounded p-3 bg-yellow-50">
                  <p className="text-xs text-yellow-700 font-medium mb-1">Medium Rehab</p>
                  <p className="text-sm font-bold">{rb.units_needing_medium_rehab} units</p>
                  <p className="text-xs text-gray-500">{fmtUsd(rb.estimated_cost_medium)}</p>
                </div>
                <div className="border rounded p-3 bg-red-50">
                  <p className="text-xs text-red-700 font-medium mb-1">Full Rehab</p>
                  <p className="text-sm font-bold">{rb.units_needing_full_rehab} units</p>
                  <p className="text-xs text-gray-500">{fmtUsd(rb.estimated_cost_full)}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Block 6: Rehab Package Recommendation ────────────────────────── */}
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-green-800 uppercase tracking-wide">
            Recommended Rehab Package
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-green-900">
            {REHAB_PACKAGE_LABELS[summary.likelyRehabPackage ?? ""] ??
              summary.likelyRehabPackage ??
              "—"}
          </p>
          <p className="text-xs text-green-700 mt-1">
            Based on unit condition distribution across {summary.unitsInspected} inspected unit
            {summary.unitsInspected !== 1 ? "s" : ""}.
          </p>
        </CardContent>
      </Card>

      {/* ── Footer Copy Button ─────────────────────────────────────────────── */}
      <div className="pb-6">
        <Button
          className="w-full h-12 text-base bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-2"
          onClick={handleCopy}
        >
          {copied ? (
            <>
              <Check className="w-5 h-5" />
              Report Copied to Clipboard!
            </>
          ) : (
            <>
              <Copy className="w-5 h-5" />
              Copy Full Report
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
