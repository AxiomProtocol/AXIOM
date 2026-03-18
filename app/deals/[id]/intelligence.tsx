/**
 * Enhanced Deal Intelligence Page
 * Layer 1 + Layer 5 Integration
 * Shows predicted vs. field-informed underwriting
 */

"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, TrendingUp, TrendingDown, Zap } from "lucide-react";

interface DealIntelligence {
  id: string;
  dealName: string;
  deal: any;
  standardUnderwriting: any;
  enrichedUnderwriting: any;
  fieldSignals: any;
  assumptionAdjustments: any;
}

export default function EnhancedDealIntelligencePage() {
    // --- Contract Status Panel State ---
    const [contractEntity, setContractEntity] = useState<any | null>(null);
    const [contractLoading, setContractLoading] = useState(true);
    const [contractError, setContractError] = useState<string | null>(null);
    const [transitionTarget, setTransitionTarget] = useState<string>("");
    const [transitionLoading, setTransitionLoading] = useState(false);
    const [transitionError, setTransitionError] = useState<string | null>(null);

    useEffect(() => {
      const fetchContractEntity = async () => {
        setContractLoading(true);
        setContractError(null);
        try {
          const response = await fetch(`/api/real-estate/deals/${dealId}/contract-entity`);
          if (!response.ok) throw new Error("Failed to load contract entity");
          const data = await response.json();
          setContractEntity(data);
        } catch (err) {
          setContractError(err instanceof Error ? err.message : "Unknown error");
        } finally {
          setContractLoading(false);
        }
      };
      if (dealId) fetchContractEntity();
    }, [dealId]);

    const statusOptions = [
      "draft",
      "intake",
      "under_review",
      "approved",
      "in_execution",
      "completed",
      "blocked",
      "rejected",
      "archived",
    ];

    const contractStatus = contractEntity?.currentStatus || "Not Linked";
    const contractStatusColor = {
      draft: "bg-gray-200 text-gray-800",
      intake: "bg-blue-100 text-blue-800",
      under_review: "bg-yellow-100 text-yellow-800",
      approved: "bg-green-100 text-green-800",
      in_execution: "bg-purple-100 text-purple-800",
      completed: "bg-green-200 text-green-900",
      blocked: "bg-red-100 text-red-800",
      rejected: "bg-red-200 text-red-900",
      archived: "bg-gray-300 text-gray-900",
      "Not Linked": "bg-gray-100 text-gray-500",
    }[contractStatus] || "bg-gray-100 text-gray-500";

    const handleStatusTransition = async () => {
      setTransitionLoading(true);
      setTransitionError(null);
      try {
        if (!contractEntity?.id) {
          setTransitionError("Deal is not linked to a contract entity.");
          setTransitionLoading(false);
          return;
        }
        const response = await fetch(`/api/contracts/v1/entities/${contractEntity.id}/status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requestId: crypto.randomUUID(),
            idempotencyKey: `${contractEntity.id}:transition:${Date.now()}`,
            concurrency: contractEntity.version
              ? { version: contractEntity.version }
              : { updatedAt: contractEntity.updatedAt },
            reasonCode: "status_transition_requested",
            payload: {
              entity: {
                id: contractEntity.id,
                domain: "real_estate",
                entityType: "deal",
              },
              toStatus: transitionTarget,
              substatus: null,
            },
          }),
        });
        if (!response.ok) {
          const err = await response.json();
          setTransitionError(err.error || "Transition failed.");
        } else {
          setTransitionTarget("");
          setTransitionError(null);
          // Refresh contract entity
          const refreshed = await fetch(`/api/real-estate/deals/${dealId}/contract-entity`);
          if (refreshed.ok) {
            const data = await refreshed.json();
            setContractEntity(data);
          }
        }
      } catch (err) {
        setTransitionError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setTransitionLoading(false);
      }
    };
  const params = useParams();
  const dealId = params.id as string;
  const [intelligence, setIntelligence] = useState<DealIntelligence | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load deal with enhanced underwriting
        const response = await fetch(`/api/re/deals/${dealId}/underwriting`);
        if (response.ok) {
          const data = await response.json();
          setIntelligence(data);
        }
      } catch (error) {
        console.error("Failed to load deal intelligence:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (dealId) {
      loadData();
    }
  }, [dealId]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Zap className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!intelligence) {
    return <div className="p-4 text-center">Deal not found</div>;
  }

  const standard = intelligence.standardUnderwriting;
  const enriched = intelligence.enrichedUnderwriting;
  const field = enriched?.fieldSignals;
  const adjustments = enriched?.assumptionAdjustments;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Contract Status Panel */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Contract Status
            <Badge className={contractStatusColor}>{contractStatus}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {contractLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
          ) : contractError ? (
            <div className="text-red-600 text-sm">{contractError}</div>
          ) : (
            <>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500">Contract Entity ID:</span>
                <span className="font-mono text-xs text-gray-700">
                  {contractEntity?.id || "Not Linked"}
                </span>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <select
                  className="border rounded px-2 py-1 text-sm"
                  value={transitionTarget}
                  onChange={e => setTransitionTarget(e.target.value)}
                  disabled={transitionLoading}
                >
                  <option value="">Select status...</option>
                  {statusOptions.map(opt => (
                    <option key={opt} value={opt} disabled={opt === contractStatus}>
                      {opt}
                    </option>
                  ))}
                </select>
                <Button
                  disabled={!transitionTarget || transitionLoading}
                  onClick={handleStatusTransition}
                  variant="primary"
                >
                  {transitionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Change Status"}
                </Button>
              </div>
              {transitionError && (
                <div className="mt-2 text-red-600 text-sm">{transitionError}</div>
              )}
            </>
          )}
        </CardContent>
      </Card>
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{intelligence.dealName}</h1>
        <p className="text-gray-600 mt-2">
          Enhanced Underwriting with Field Intelligence Integration
        </p>
      </div>

      {/* Field Intelligence Status */}
      {field && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-green-600" />
              Field Intelligence Active
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Sampling Confidence</p>
                <p className="text-2xl font-bold text-green-700">
                  {(field.samplingConfidence * 100).toFixed(0)}%
                </p>
                <Badge
                  className={
                    field.estimateConfidence === "high"
                      ? "bg-green-600"
                      : field.estimateConfidence === "medium"
                        ? "bg-yellow-600"
                        : "bg-red-600"
                  }
                >
                  {field.estimateConfidence} confidence
                </Badge>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Deficiencies</p>
                <p className="text-2xl font-bold text-orange-700">
                  {field.deficiencySummary.total}
                </p>
                <p className="text-xs text-gray-600">
                  {field.deficiencySummary.critical} critical
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Estimated Rehab</p>
                <p className="text-2xl font-bold text-blue-700">
                  ${(field.estimatedRehabCosts.totalPerProperty / 1000).toFixed(0)}K
                </p>
                <p className="text-xs text-gray-600">
                  ${(field.estimatedRehabCosts.perUnit / 1000).toFixed(1)}K per unit
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assumption Adjustments */}
      {adjustments && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle>Underwriting Adjustments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-white rounded border border-blue-200">
              <div>
                <p className="font-medium">Rehab Cost</p>
                <p className="text-sm text-gray-600">
                  {adjustments.rationale}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold">${adjustments.originalRehabCost.toLocaleString()}</p>
                <p className="text-xs text-gray-600">original</p>
              </div>
              <div className="text-xl">→</div>
              <div className="text-right">
                <p className="text-lg font-bold text-blue-700">
                  ${adjustments.adjustedRehabCost.toLocaleString()}
                </p>
                <p className="text-xs text-blue-600">adjusted</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Underwriting Comparison */}
      <Tabs defaultValue="financial" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="financial">Financial Metrics</TabsTrigger>
          <TabsTrigger value="risks">Risk Analysis</TabsTrigger>
          <TabsTrigger value="systems">System Health</TabsTrigger>
        </TabsList>

        <TabsContent value="financial">
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-6">
                {/* DSCR */}
                <div className="border rounded p-4">
                  <p className="text-sm text-gray-600">DSCR</p>
                  <div className="flex items-center gap-4 mt-2">
                    <div>
                      <p className="text-sm text-gray-600">Standard</p>
                      <p className="text-2xl font-bold">
                        {standard?.dscr?.toFixed(2) || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Enriched</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {enriched?.dscr?.toFixed(2) || "—"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Cap Rate */}
                <div className="border rounded p-4">
                  <p className="text-sm text-gray-600">Cap Rate</p>
                  <div className="flex items-center gap-4 mt-2">
                    <div>
                      <p className="text-sm text-gray-600">Standard</p>
                      <p className="text-2xl font-bold">
                        {standard?.capRate?.toFixed(2)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Enriched</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {enriched?.capRate?.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                </div>

                {/* Cash-on-Cash */}
                <div className="border rounded p-4">
                  <p className="text-sm text-gray-600">Cash-on-Cash</p>
                  <div className="flex items-center gap-4 mt-2">
                    <div>
                      <p className="text-sm text-gray-600">Standard</p>
                      <p className="text-2xl font-bold">
                        {standard?.cashOnCash?.toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Enriched</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {enriched?.cashOnCash?.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>

                {/* Deal Grade */}
                {enriched?.fieldImpact && (
                  <div className="border rounded p-4">
                    <p className="text-sm text-gray-600">Deal Grade</p>
                    <div className="flex items-center gap-4 mt-2">
                      <div>
                        <p className="text-sm text-gray-600">Score</p>
                        <p className="text-3xl font-bold text-green-600">
                          {enriched.fieldImpact.scoreImpact > 0 ? "↑" : "↓"} {enriched.fieldImpact.scoreImpact}pts
                        </p>
                      </div>
                      <div className="text-sm">{enriched.fieldImpact.recommendation}</div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risks">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                {enriched?.riskFlags?.slice(0, 10).map((flag: any, idx: number) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-3 p-3 rounded border ${
                      flag.severity === "critical"
                        ? "border-red-200 bg-red-50"
                        : flag.severity === "high"
                          ? "border-orange-200 bg-orange-50"
                          : "border-yellow-200 bg-yellow-50"
                    }`}
                  >
                    <AlertCircle
                      className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                        flag.severity === "critical"
                          ? "text-red-600"
                          : flag.severity === "high"
                            ? "text-orange-600"
                            : "text-yellow-600"
                      }`}
                    />
                    <div>
                      <Badge
                        className={
                          flag.severity === "critical"
                            ? "bg-red-600"
                            : flag.severity === "high"
                              ? "bg-orange-600"
                              : "bg-yellow-600"
                        }
                      >
                        {flag.severity}
                      </Badge>
                      <p className="font-medium mt-1">{flag.message}</p>
                      {flag.detail && (
                        <p className="text-sm text-gray-600 mt-1">
                          {JSON.stringify(flag.detail)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="systems">
          {field?.systemRiskScores && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  {Object.entries(field.systemRiskScores)
                    .sort(([, a], [, b]) => (b as number) - (a as number))
                    .map(([system, score]) => (
                      <div key={system} className="flex items-center gap-3">
                        <div className="w-32">{system}</div>
                        <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full ${
                              (score as number) > 75
                                ? "bg-red-500"
                                : (score as number) > 50
                                  ? "bg-yellow-500"
                                  : "bg-green-500"
                            }`}
                            style={{ width: `${(score as number)}%` }}
                          />
                        </div>
                        <div className="w-12 text-right font-bold">
                          {Math.round(score as number)}
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
