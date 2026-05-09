/**
 * InspectionWalkthrough Component
 * Mobile-first UI for field inspectors to capture unit conditions, deficiencies, and photos
 * Layer 5: Field Intelligence Capture
 */

"use client";

import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Camera, Check, AlertCircle, Upload } from "lucide-react";

const SYSTEMS = [
  { id: "kitchen", label: "Kitchen", icon: "🍳" },
  { id: "bathroom", label: "Bathroom", icon: "🚿" },
  { id: "flooring", label: "Flooring", icon: "⬜" },
  { id: "appliances", label: "Appliances", icon: "🔌" },
  { id: "hvac", label: "HVAC", icon: "❄️" },
  { id: "windows", label: "Windows", icon: "🪟" },
  { id: "paint", label: "Paint", icon: "🎨" },
  { id: "plumbing", label: "Plumbing", icon: "🚰" },
  { id: "electrical", label: "Electrical", icon: "⚡" },
  { id: "doors", label: "Doors", icon: "🚪" },
  { id: "exterior", label: "Exterior", icon: "🏠" },
  { id: "commonArea", label: "Common Area", icon: "🏢" },
  { id: "siteParking", label: "Site/Parking", icon: "🅿️" },
  { id: "other", label: "Other", icon: "📋" },
];

const CONDITIONS = [
  { value: "good", label: "Good", color: "bg-green-500" },
  { value: "light_rehab", label: "Light Rehab", color: "bg-blue-500" },
  { value: "medium_rehab", label: "Medium Rehab", color: "bg-yellow-500" },
  { value: "full_replace", label: "Full Replace", color: "bg-red-500" },
  { value: "not_inspected", label: "Not Inspected", color: "bg-gray-400" },
];

const SEVERITIES = [
  { value: "minor", label: "Minor", color: "text-yellow-600" },
  { value: "moderate", label: "Moderate", color: "text-orange-600" },
  { value: "major", label: "Major", color: "text-red-600" },
  { value: "critical", label: "Critical", color: "text-red-900 font-bold" },
];

export interface UnitWalkData {
  unitNumber: string;
  unitType: string;
  occupancyStatus?: string;
  conditions: Record<string, string>;
  deficiencies: DeficiencyRecord[];
  photos: PhotoRecord[];
  generalNotes: string;
}

export interface DeficiencyRecord {
  system: string;
  severity: string;
  title: string;
  description: string;
  estimatedRepairCost?: number;
  estimatedDaysToFix?: number;
  needsImmediateAttention: boolean;
  affectsTenancy: boolean;
}

export interface PhotoRecord {
  file: File;
  photoType: string;
  system?: string;
  isBefore: boolean;
  caption?: string;
}

interface InspectionWalkthroughProps {
  sessionId: string;
  totalUnits: number;
  onUnitComplete: (walkData: UnitWalkData) => void;
  onSessionComplete: () => void;
}

export default function InspectionWalkthrough({
  sessionId,
  totalUnits,
  onUnitComplete,
  onSessionComplete,
}: InspectionWalkthroughProps) {
  const [currentStep, setCurrentStep] = useState<
    "unit_info" | "conditions" | "deficiencies" | "photos" | "review"
  >("unit_info");

  const [unitNumber, setUnitNumber] = useState("");
  const [unitType, setUnitType] = useState("1BR/1BA");
  const [occupancyStatus, setOccupancyStatus] = useState("vacant");

  const [conditions, setConditions] = useState<Record<string, string>>(
    SYSTEMS.reduce((acc, sys) => ({ ...acc, [sys.id]: "not_inspected" }), {})
  );

  const [deficiencies, setDeficiencies] = useState<DeficiencyRecord[]>([]);
  const [currentDeficiency, setCurrentDeficiency] = useState<
    Partial<DeficiencyRecord>
  >({});

  const [photos, setPhotos] = useState<PhotoRecord[]>([]);
  const [generalNotes, setGeneralNotes] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);

  const unitsCompleted = sessionId ? 1 : 0; // Placeholder

  // Step 1: Unit Information
  const handleUnitInfoNext = () => {
    if (!unitNumber.trim()) {
      alert("Please enter a unit number");
      return;
    }
    setCurrentStep("conditions");
  };

  // Step 2: Conditions Matrix
  const handleConditionChange = (system: string, condition: string) => {
    setConditions((prev) => ({ ...prev, [system]: condition }));
  };

  const allConditionsSet = Object.values(conditions).every(
    (c) => c !== "not_inspected"
  );

  const handleConditionsNext = () => {
    if (!allConditionsSet && !confirm("Skip unset systems?")) {
      return;
    }
    setCurrentStep("deficiencies");
  };

  // Step 3: Deficiencies
  const handleAddDeficiency = () => {
    if (
      !currentDeficiency.system ||
      !currentDeficiency.severity ||
      !currentDeficiency.title
    ) {
      alert("Please fill required deficiency fields");
      return;
    }

    setDeficiencies((prev) => [...prev, currentDeficiency as DeficiencyRecord]);
    setCurrentDeficiency({});
  };

  const handleRemoveDeficiency = (index: number) => {
    setDeficiencies((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDeficienciesNext = () => {
    setCurrentStep("photos");
  };

  // Step 4: Photos
  const handlePhotoCapture = () => {
    cameraRef.current?.click();
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files) {
      Array.from(files).forEach((file) => {
        setPhotos((prev) => [
          ...prev,
          {
            file,
            photoType: "general",
            isBefore: true,
          },
        ]);
      });
    }
    e.currentTarget.value = ""; // Reset input
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePhotosNext = () => {
    setCurrentStep("review");
  };

  // Step 5: Review & Submit
  const handleSubmitUnit = async () => {
    setIsSubmitting(true);
    try {
      const walkData: UnitWalkData = {
        unitNumber,
        unitType,
        occupancyStatus,
        conditions,
        deficiencies,
        photos,
        generalNotes,
      };

      onUnitComplete(walkData);

      // Reset form for next unit
      setUnitNumber("");
      setCurrentStep("unit_info");
      setConditions(
        SYSTEMS.reduce((acc, sys) => ({ ...acc, [sys.id]: "not_inspected" }), {})
      );
      setDeficiencies([]);
      setPhotos([]);
      setGeneralNotes("");
      setCurrentDeficiency({});
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteSession = () => {
    onSessionComplete();
  };

  // Step 1: Unit Information
  if (currentStep === "unit_info") {
    return (
      <Card className="w-full max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>New Unit Inspection</CardTitle>
          <p className="text-sm text-gray-500">
            Unit {unitsCompleted + 1} of {totalUnits}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Unit Number</label>
            <Input
              placeholder="e.g., 101, A-302, Unit 5"
              value={unitNumber}
              onChange={(e) => setUnitNumber(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Unit Type</label>
            <Select value={unitType} onValueChange={setUnitType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Studio">Studio</SelectItem>
                <SelectItem value="1BR/1BA">1BR/1BA</SelectItem>
                <SelectItem value="2BR/1BA">2BR/1BA</SelectItem>
                <SelectItem value="2BR/2BA">2BR/2BA</SelectItem>
                <SelectItem value="3BR/2BA">3BR/2BA</SelectItem>
                <SelectItem value="Office">Office</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Occupancy Status
            </label>
            <Select value={occupancyStatus} onValueChange={setOccupancyStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vacant">Vacant</SelectItem>
                <SelectItem value="occupied">Occupied</SelectItem>
                <SelectItem value="being_renovated">Being Renovated</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            className="w-full bg-blue-600 hover:bg-blue-700"
            onClick={handleUnitInfoNext}
          >
            Next: Assess Conditions
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Step 2: Conditions Matrix
  if (currentStep === "conditions") {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Unit {unitNumber}: System Conditions</CardTitle>
          <p className="text-sm text-gray-500">
            Rate each building system (swipe left for mobile)
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
            {SYSTEMS.map((system) => (
              <div key={system.id}>
                <p className="text-xs font-medium mb-1">
                  {system.icon} {system.label}
                </p>
                <Select
                  value={conditions[system.id]}
                  onValueChange={(value) =>
                    handleConditionChange(system.id, value)
                  }
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONDITIONS.map((cond) => (
                      <SelectItem key={cond.value} value={cond.value}>
                        {cond.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setCurrentStep("unit_info")}
            >
              Back
            </Button>
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={handleConditionsNext}
            >
              Next: Add Deficiencies
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Step 3: Deficiencies
  if (currentStep === "deficiencies") {
    return (
      <Card className="w-full max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>Unit {unitNumber}: Deficiencies Detail</CardTitle>
          <p className="text-sm text-gray-500">
            {deficiencies.length} deficiency(ies) recorded
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add Deficiency Form */}
          <div className="border rounded-lg p-4 bg-gray-50 space-y-3">
            <h3 className="font-medium text-sm">Add New Deficiency</h3>

            <div>
              <label className="text-xs font-medium">System</label>
              <Select
                value={currentDeficiency.system || ""}
                onValueChange={(value) =>
                  setCurrentDeficiency((prev) => ({ ...prev, system: value }))
                }
              >
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Select system" />
                </SelectTrigger>
                <SelectContent>
                  {SYSTEMS.map((sys) => (
                    <SelectItem key={sys.id} value={sys.id}>
                      {sys.icon} {sys.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium">Severity</label>
              <Select
                value={currentDeficiency.severity || ""}
                onValueChange={(value) =>
                  setCurrentDeficiency((prev) => ({ ...prev, severity: value }))
                }
              >
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Select severity" />
                </SelectTrigger>
                <SelectContent>
                  {SEVERITIES.map((sev) => (
                    <SelectItem key={sev.value} value={sev.value}>
                      {sev.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium">Title</label>
              <Input
                placeholder="e.g., Cracked tile in kitchen"
                value={currentDeficiency.title || ""}
                onChange={(e) =>
                  setCurrentDeficiency((prev) => ({
                    ...prev,
                    title: e.target.value,
                  }))
                }
                className="text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-medium">Description</label>
              <Textarea
                placeholder="Additional details..."
                value={currentDeficiency.description || ""}
                onChange={(e) =>
                  setCurrentDeficiency((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                className="text-xs h-20"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium">Est. Cost ($)</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={currentDeficiency.estimatedRepairCost || ""}
                  onChange={(e) =>
                    setCurrentDeficiency((prev) => ({
                      ...prev,
                      estimatedRepairCost: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-medium">Est. Days</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={currentDeficiency.estimatedDaysToFix || ""}
                  onChange={(e) =>
                    setCurrentDeficiency((prev) => ({
                      ...prev,
                      estimatedDaysToFix: parseInt(e.target.value) || 0,
                    }))
                  }
                  className="text-xs"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={currentDeficiency.needsImmediateAttention || false}
                  onChange={(e) =>
                    setCurrentDeficiency((prev) => ({
                      ...prev,
                      needsImmediateAttention: e.target.checked,
                    }))
                  }
                />
                Needs immediate attention
              </label>
            </div>

            <Button
              className="w-full text-xs bg-blue-600 hover:bg-blue-700"
              onClick={handleAddDeficiency}
              disabled={
                !currentDeficiency.system ||
                !currentDeficiency.severity ||
                !currentDeficiency.title
              }
            >
              Add Deficiency
            </Button>
          </div>

          {/* Recorded Deficiencies */}
          {deficiencies.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium text-sm">Recorded Deficiencies</h3>
              {deficiencies.map((def, idx) => (
                <div
                  key={idx}
                  className="border rounded p-2 bg-white flex justify-between items-start gap-2"
                >
                  <div className="flex-1 text-xs">
                    <p className="font-medium">{def.title}</p>
                    <p className="text-gray-600">{def.system}</p>
                    <Badge
                      className={`mt-1 ${SEVERITIES.find((s) => s.value === def.severity)?.color}`}
                    >
                      {def.severity}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() => handleRemoveDeficiency(idx)}
                    className="text-red-600"
                  >
                    ✕
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setCurrentStep("conditions")}
            >
              Back
            </Button>
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={handleDeficienciesNext}
            >
              Next: Add Photos
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Step 4: Photos
  if (currentStep === "photos") {
    return (
      <Card className="w-full max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>Unit {unitNumber}: Photos</CardTitle>
          <p className="text-sm text-gray-500">{photos.length} photo(s)</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto">
            {photos.map((photo, idx) => (
              <div key={idx} className="relative border rounded overflow-hidden">
                <img
                  src={URL.createObjectURL(photo.file)}
                  alt={`Photo ${idx + 1}`}
                  className="w-full h-24 object-cover"
                />
                <Button
                  variant="ghost"
                  onClick={() => handleRemovePhoto(idx)}
                  className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white"
                >
                  ✕
                </Button>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700"
              onClick={handlePhotoCapture}
            >
              <Camera className="w-4 h-4 mr-2" />
              Take/Upload Photo
            </Button>
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              onChange={handlePhotoSelect}
              className="hidden"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              General Notes
            </label>
            <Textarea
              placeholder="Any additional observations..."
              value={generalNotes}
              onChange={(e) => setGeneralNotes(e.target.value)}
              className="h-20"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setCurrentStep("deficiencies")}
            >
              Back
            </Button>
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={handlePhotosNext}
            >
              Next: Review
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Step 5: Review & Submit
  if (currentStep === "review") {
    return (
      <Card className="w-full max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>Unit {unitNumber}: Review & Submit</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 max-h-96 overflow-y-auto">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium">Unit Info</p>
              <p className="text-gray-600">
                {unitType} • {occupancyStatus}
              </p>
            </div>
            <div>
              <p className="font-medium">Systems Assessed</p>
              <p className="text-gray-600">
                {Object.values(conditions).filter((c) => c !== "not_inspected").length} of {SYSTEMS.length}
              </p>
            </div>
            <div>
              <p className="font-medium">Deficiencies</p>
              <p className="text-gray-600">{deficiencies.length} found</p>
            </div>
            <div>
              <p className="font-medium">Photos</p>
              <p className="text-gray-600">{photos.length} attached</p>
            </div>
          </div>

          {deficiencies.length > 0 && (
            <div className="border-t pt-4">
              <p className="font-medium text-sm mb-2">Deficiencies Summary</p>
              <div className="space-y-1 text-xs">
                {deficiencies.map((d, idx) => (
                  <p key={idx} className="text-gray-600">
                    • {d.title} ({d.severity})
                  </p>
                ))}
              </div>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs">
            <p className="font-medium mb-1">Ready to submit?</p>
            <p className="text-gray-600">
              This unit's inspection will be saved and added to the session summary.
            </p>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setCurrentStep("photos")}
            >
              Back
            </Button>
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={handleSubmitUnit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Save Unit
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}
