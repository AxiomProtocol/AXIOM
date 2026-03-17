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
