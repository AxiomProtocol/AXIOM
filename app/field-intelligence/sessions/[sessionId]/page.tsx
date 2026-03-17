/**
 * Field Intelligence Inspection Page
 * Manage inspection sessions and guide field inspectors through unit walkthroughs
 * Route: /field-intelligence/sessions/[sessionId]
 * Layer 5: Field Intelligence Capture
 */

"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import InspectionWalkthrough, {
  UnitWalkData,
} from "@/components/InspectionWalkthrough";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Check, AlertCircle, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SessionData {
  id: string;
  dealId: string;
  propertyId: string;
  sessionName: string;
  status: string;
  totalUnits: number;
  unitsWalked: number;
  samplingConfidenceScore: number;
  createdAt: string;
}

export default function InspectionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [session, setSession] = useState<SessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [units, setUnits] = useState<UnitWalkData[]>([]);
  const [isWalkthrough, setIsWalkthrough] = useState(false);

  // Fetch session data
  useEffect(() => {
    const fetchSession = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/field-intelligence/sessions?sessionId=${sessionId}`);
        if (!response.ok) throw new Error("Failed to load session");
        const data = await response.json();
        setSession(Array.isArray(data) ? data[0] : data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    };

    if (sessionId) {
      fetchSession();
    }
  }, [sessionId]);

  const handleUnitComplete = async (walkData: UnitWalkData) => {
    setIsSaving(true);
    try {
      // Create the unit walk record
      const walkResponse = await fetch(
        `/api/field-intelligence/walks/${sessionId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            unitNumber: walkData.unitNumber,
            unitType: walkData.unitType,
            occupancyStatus: walkData.occupancyStatus,
            ...walkData.conditions,
            generalNotes: walkData.generalNotes,
            inspectionTime: 15, // Placeholder
          }),
        }
      );

      if (!walkResponse.ok) throw new Error("Failed to save unit walk");
      const walkRecord = await walkResponse.json();

      // Add deficiencies
      for (const deficiency of walkData.deficiencies) {
        await fetch("/api/field-intelligence/deficiencies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            unitWalkId: walkRecord.id,
            ...deficiency,
          }),
        });
      }

      // Upload photos
      for (const photo of walkData.photos) {
        const formData = new FormData();
        formData.append("file", photo.file);
        formData.append("unitWalkId", walkRecord.id);
        formData.append("photoType", photo.photoType);
        formData.append("isBefore", String(photo.isBefore));
        if (photo.caption) formData.append("caption", photo.caption);

        await fetch("/api/field-intelligence/photos", {
          method: "POST",
          body: formData,
        });
      }

      // Update local units list
      setUnits((prev) => [...prev, walkData]);

      // Update session metadata
      const newUnitsWalked = (units.length + 1);
      const newSamplingConfidence = newUnitsWalked / session!.totalUnits;

      if (newUnitsWalked >= session!.totalUnits) {
        // Session complete, compute summary
        await fetch(`/api/field-intelligence/summary?sessionId=${sessionId}&recompute=true`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save unit");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSessionComplete = async () => {
    try {
      // Mark session as submitted
      const response = await fetch(`/api/field-intelligence/sessions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: sessionId,
          status: "submitted",
        }),
      });

      if (response.ok) {
        router.push(`/field-intelligence/sessions/${sessionId}/summary`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete session");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <Card className="max-w-lg mx-auto bg-red-50 border-red-200">
        <CardHeader>
          <CardTitle className="text-red-900 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-700">{error || "Session not found"}</p>
          <Button
            className="mt-4 w-full"
            onClick={() => router.back()}
          >
            Go Back
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Show walkthrough if not started
  if (isWalkthrough) {
    return (
      <InspectionWalkthrough
        sessionId={sessionId}
        totalUnits={session.totalUnits}
        onUnitComplete={handleUnitComplete}
        onSessionComplete={handleSessionComplete}
      />
    );
  }

  // Show session overview
  const samplingPercent = ((units.length / session.totalUnits) * 100).toFixed(1);
  const samplingStatus =
    parseInt(samplingPercent) >= 80
      ? "high"
      : parseInt(samplingPercent) >= 50
        ? "medium"
        : "low";

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-4">
      {/* Session Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>{session.sessionName}</CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                Session ID: {sessionId.slice(0, 8)}...
              </p>
            </div>
            <Badge
              className={
                session.status === "in_progress"
                  ? "bg-blue-500"
                  : session.status === "submitted"
                    ? "bg-green-500"
                    : "bg-gray-500"
              }
            >
              {session.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-600 uppercase">Total Units</p>
              <p className="text-2xl font-bold">{session.totalUnits}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 uppercase">Units Walked</p>
              <p className="text-2xl font-bold text-blue-600">{units.length}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 uppercase">Sampling %</p>
              <p className="text-2xl font-bold text-green-600">
                {samplingPercent}%
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 uppercase">Confidence</p>
              <Badge
                className={
                  samplingStatus === "high"
                    ? "bg-green-500"
                    : samplingStatus === "medium"
                      ? "bg-yellow-500"
                      : "bg-red-500"
                }
              >
                {samplingStatus}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <p className="font-medium">Progress</p>
          <p className="text-gray-600">
            {units.length} of {session.totalUnits}
          </p>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-green-500 h-3 rounded-full transition-all duration-300"
            style={{ width: `${samplingPercent}%` }}
          />
        </div>
      </div>

      {/* Units Completed */}
      {units.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Units Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {units.map((unit, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded border"
                >
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-medium text-sm">Unit {unit.unitNumber}</p>
                      <p className="text-xs text-gray-600">
                        {unit.unitType} • {unit.deficiencies.length} deficiencies
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="space-y-3">
        {units.length < session.totalUnits ? (
          <>
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-base"
              onClick={() => setIsWalkthrough(true)}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  Continue Walkthrough
                  <ChevronRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
            <p className="text-center text-sm text-gray-600">
              {session.totalUnits - units.length} more unit
              {session.totalUnits - units.length !== 1 ? "s" : ""} to go
            </p>
          </>
        ) : (
          <>
            <Button
              className="w-full bg-green-600 hover:bg-green-700 h-12 text-base"
              onClick={handleSessionComplete}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Completing...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Complete & Review Summary
                </>
              )}
            </Button>
            <p className="text-center text-sm text-green-600 font-medium">
              ✓ All units inspected! Review the summary before submitting.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
