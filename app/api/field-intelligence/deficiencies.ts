/**
 * Field Deficiencies API
 * Record and manage deficiencies found during unit inspections
 * Layer 5: Field Intelligence Capture
 */

import { db } from "@/server/db";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";

import {
  fieldUnitWalkRows,
  fieldUnitWalkDeficiencies,
} from "@/shared/fieldIntelligenceSchema";

/**
 * POST /api/field-intelligence/deficiencies
 * Record a new deficiency found in a unit walk
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      unitWalkId,
      system,
      severity,
      title,
      description,
      estimatedRepairCost,
      estimatedDaysToFix,
      needsImmediateAttention,
      affectsTenancy,
    } = body;

    if (!unitWalkId || !system || !severity || !title) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: unitWalkId, system, severity, title",
        },
        { status: 400 }
      );
    }

    // Verify unit walk exists
    const walk = await db
      .select()
      .from(fieldUnitWalkRows)
      .where(eq(fieldUnitWalkRows.id, unitWalkId))
      .limit(1);

    if (!walk.length) {
      return NextResponse.json({ error: "Unit walk not found" }, { status: 404 });
    }

    // Create deficiency record
    const result = await db
      .insert(fieldUnitWalkDeficiencies)
      .values({
        unitWalkId,
        system,
        severity,
        title,
        description,
        estimatedRepairCost: estimatedRepairCost ? parseFloat(estimatedRepairCost) : null,
        estimatedDaysToFix: estimatedDaysToFix ? parseInt(estimatedDaysToFix) : null,
        needsImmediateAttention: needsImmediateAttention || false,
        affectsTenancy: affectsTenancy || false,
        meta: {
          reportedBy: userId,
          reportedAt: new Date().toISOString(),
        },
      })
      .returning();

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error("[POST field-intelligence/deficiencies]", error);
    return NextResponse.json(
      { error: "Failed to record deficiency" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/field-intelligence/deficiencies?unitWalkId=...
 * List all deficiencies for a unit walk
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const unitWalkId = searchParams.get("unitWalkId");

    if (!unitWalkId) {
      return NextResponse.json(
        { error: "unitWalkId query parameter required" },
        { status: 400 }
      );
    }

    const deficiencies = await db
      .select()
      .from(fieldUnitWalkDeficiencies)
      .where(eq(fieldUnitWalkDeficiencies.unitWalkId, unitWalkId))
      .orderBy((t: any) => t.createdAt);

    return NextResponse.json(deficiencies);
  } catch (error) {
    console.error("[GET field-intelligence/deficiencies]", error);
    return NextResponse.json(
      { error: "Failed to fetch deficiencies" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/field-intelligence/deficiencies/[deficiencyId]
 * Update a deficiency record
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { deficiencyId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { deficiencyId } = params;
    const body = await req.json();

    const updateData: any = {};

    if (body.severity !== undefined) updateData.severity = body.severity;
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.estimatedRepairCost !== undefined) {
      updateData.estimatedRepairCost = parseFloat(body.estimatedRepairCost);
    }
    if (body.estimatedDaysToFix !== undefined) {
      updateData.estimatedDaysToFix = parseInt(body.estimatedDaysToFix);
    }
    if (body.needsImmediateAttention !== undefined) {
      updateData.needsImmediateAttention = body.needsImmediateAttention;
    }
    if (body.affectsTenancy !== undefined) {
      updateData.affectsTenancy = body.affectsTenancy;
    }

    const result = await db
      .update(fieldUnitWalkDeficiencies)
      .set(updateData)
      .where(eq(fieldUnitWalkDeficiencies.id, deficiencyId))
      .returning();

    if (!result.length) {
      return NextResponse.json(
        { error: "Deficiency not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("[PATCH field-intelligence/deficiencies]", error);
    return NextResponse.json(
      { error: "Failed to update deficiency" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/field-intelligence/deficiencies/[deficiencyId]
 * Remove a deficiency record
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { deficiencyId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { deficiencyId } = params;

    const result = await db
      .delete(fieldUnitWalkDeficiencies)
      .where(eq(fieldUnitWalkDeficiencies.id, deficiencyId))
      .returning();

    if (!result.length) {
      return NextResponse.json(
        { error: "Deficiency not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Deficiency deleted successfully" });
  } catch (error) {
    console.error("[DELETE field-intelligence/deficiencies]", error);
    return NextResponse.json(
      { error: "Failed to delete deficiency" },
      { status: 500 }
    );
  }
}
