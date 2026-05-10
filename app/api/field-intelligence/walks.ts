/**
 * Field Unit Walks API
 * CRUD operations for individual unit inspection records within a session
 * Layer 5: Field Intelligence Capture
 */

import { db } from "@/server/db";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";

import {
  fieldInspectionSessions,
  fieldUnitWalkRows,
  fieldUnitWalkDeficiencies,
} from "@/shared/fieldIntelligenceSchema";

/**
 * POST /api/field-intelligence/sessions/[sessionId]/walks
 * Add a new unit walk record to an inspection session
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sessionId } = params;
    const body = await req.json();

    // Verify session exists
    const session = await db
      .select()
      .from(fieldInspectionSessions)
      .where(eq(fieldInspectionSessions.id, sessionId))
      .limit(1);

    if (!session.length) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Extract system conditions from body and default to 'not_inspected'
    // Systems: kitchen, bathroom, flooring, appliances, hvac, windows, paint,
    //          plumbing, electrical, doors, exterior, commonArea, siteParking, other
    const {
      unitNumber,
      unitType,
      occupancyStatus,
      kitchen = "not_inspected",
      bathroom = "not_inspected",
      flooring = "not_inspected",
      appliances = "not_inspected",
      hvac = "not_inspected",
      windows = "not_inspected",
      paint = "not_inspected",
      plumbing = "not_inspected",
      electrical = "not_inspected",
      doors = "not_inspected",
      exterior = "not_inspected",
      commonArea = "not_inspected",
      siteParking = "not_inspected",
      other = "not_inspected",
      generalNotes,
      inspectionTime,
    } = body;

    if (!unitNumber) {
      return NextResponse.json(
        { error: "unitNumber is required" },
        { status: 400 }
      );
    }

    // Create unit walk record
    const result = await db
      .insert(fieldUnitWalkRows)
      .values({
        sessionId,
        unitNumber,
        unitType,
        occupancyStatus,
        kitchen,
        bathroom,
        flooring,
        appliances,
        hvac,
        windows,
        paint,
        plumbing,
        electrical,
        doors,
        exterior,
        commonArea,
        siteParking,
        other,
        generalNotes,
        inspectionCompleted: true,
        inspectionTime,
        meta: {
          inspectorId: userId,
          completedAt: new Date().toISOString(),
        },
      })
      .returning();

    // Update session metadata
    const currentSession = session[0];
    const newUnitsWalked = (currentSession.unitsWalked || 0) + 1;
    const samplingConfidence =
      newUnitsWalked / currentSession.totalUnits;

    await db
      .update(fieldInspectionSessions)
      .set({
        unitsWalked: newUnitsWalked,
        samplingConfidenceScore: samplingConfidence,
        updatedAt: new Date(),
      })
      .where(eq(fieldInspectionSessions.id, sessionId));

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error("[POST field-intelligence/walks]", error);
    return NextResponse.json(
      { error: "Failed to create unit walk" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/field-intelligence/sessions/[sessionId]/walks
 * List all unit walks for a session
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sessionId } = params;

    const walks = await db
      .select()
      .from(fieldUnitWalkRows)
      .where(eq(fieldUnitWalkRows.sessionId, sessionId))
      .orderBy((t: any) => t.createdAt);

    return NextResponse.json(walks);
  } catch (error) {
    console.error("[GET field-intelligence/walks]", error);
    return NextResponse.json(
      { error: "Failed to fetch unit walks" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/field-intelligence/walks/[walkId]
 * Update a specific unit walk record
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { walkId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { walkId } = params;
    const body = await req.json();

    // Build update object with only provided fields
    const updateData: any = {
      updatedAt: new Date(),
    };

    // Only include system conditions if provided
    const systemFields = [
      "kitchen",
      "bathroom",
      "flooring",
      "appliances",
      "hvac",
      "windows",
      "paint",
      "plumbing",
      "electrical",
      "doors",
      "exterior",
      "commonArea",
      "siteParking",
      "other",
    ];

    systemFields.forEach((field) => {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    });

    if (body.generalNotes !== undefined) {
      updateData.generalNotes = body.generalNotes;
    }
    if (body.occupancyStatus !== undefined) {
      updateData.occupancyStatus = body.occupancyStatus;
    }

    const result = await db
      .update(fieldUnitWalkRows)
      .set(updateData)
      .where(eq(fieldUnitWalkRows.id, walkId))
      .returning();

    if (!result.length) {
      return NextResponse.json({ error: "Walk not found" }, { status: 404 });
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("[PATCH field-intelligence/walks]", error);
    return NextResponse.json(
      { error: "Failed to update unit walk" },
      { status: 500 }
    );
  }
}
