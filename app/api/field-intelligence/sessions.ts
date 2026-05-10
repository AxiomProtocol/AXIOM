/**
 * Field Intelligence Sessions API
 * Manages inspection session lifecycle (planning, walkthrough, submission, review)
 * Layer 5: Field Intelligence Capture
 */

import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { eq, and } from "drizzle-orm";

// Import the field intelligence tables from the main schema
// These are defined in shared/fieldIntelligenceSchema.ts and seeded in instrumentation.ts
import { fieldInspectionSessions, fieldUnitWalkRows } from "@/shared/fieldIntelligenceSchema";

/**
 * POST /api/field-intelligence/sessions
 * Create a new inspection session for a property
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      dealId,
      propertyId,
      sessionName,
      totalUnits,
      inspectionDate,
    } = body;

    if (!dealId || !propertyId || !totalUnits) {
      return NextResponse.json(
        { error: "Missing required fields: dealId, propertyId, totalUnits" },
        { status: 400 }
      );
    }

    // Create new inspection session with status 'planned'
    const result = await db
      .insert(fieldInspectionSessions)
      .values({
        dealId,
        propertyId,
        sessionName: sessionName || `Inspection for${new Date().toLocaleDateString()}`,
        status: "planned",
        totalUnits,
        inspectionDate: inspectionDate ? new Date(inspectionDate) : null,
        inspectedBy: userId,
        unitsWalked: 0,
        samplingConfidenceScore: 0,
        meta: {
          ip: req.headers.get("x-forwarded-for") || "unknown",
          userAgent: req.headers.get("user-agent"),
        },
      })
      .returning();

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error("[POST field-intelligence/sessions]", error);
    return NextResponse.json(
      { error: "Failed to create inspection session" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/field-intelligence/sessions?dealId=...
 * List all inspection sessions for a deal
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const dealId = searchParams.get("dealId");
    const status = searchParams.get("status");

    if (!dealId) {
      return NextResponse.json(
        { error: "dealId query parameter required" },
        { status: 400 }
      );
    }

    // Build query conditions
    let conditions = [eq(fieldInspectionSessions.dealId, dealId)];
    if (status) {
      conditions.push(eq(fieldInspectionSessions.status, status as any));
    }

    const sessions = await db
      .select()
      .from(fieldInspectionSessions)
      .where(and(...conditions))
      .orderBy((t: any) => t.createdAt)
      .limit(100);

    return NextResponse.json(sessions);
  } catch (error) {
    console.error("[GET field-intelligence/sessions]", error);
    return NextResponse.json(
      { error: "Failed to fetch inspection sessions" },
      { status: 500 }
    );
  }
}
