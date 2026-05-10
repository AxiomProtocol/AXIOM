/**
 * Field Inspection Photos API
 * Upload, retrieve, and manage photos captured during unit inspections
 * Layer 5: Field Intelligence Capture
 */

import { db } from "@/server/db";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";

import {
  fieldUnitWalkRows,
  fieldUnitWalkPhotos,
} from "@/shared/fieldIntelligenceSchema";

/**
 * POST /api/field-intelligence/photos
 * Upload a photo from a unit inspection
 * Expected: multipart form data with file + metadata
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const unitWalkId = formData.get("unitWalkId") as string;
    const photoType = formData.get("photoType") as string; // e.g., "deficiency", "overview", "system_detail"
    const system = formData.get("system") as string; // System being photographed (if specific)
    const isBefore = formData.get("isBefore") === "true";
    const caption = formData.get("caption") as string;
    const gpsCoordinates = formData.get("gpsCoordinates") as string;
    const timestamp = formData.get("timestamp") as string;

    if (!file || !unitWalkId) {
      return NextResponse.json(
        { error: "file and unitWalkId are required" },
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

    // For now, store file metadata and URL reference
    // In production, integrate with S3/Cloudinary/etc.
    // Placeholder: assume file is handled by storage service
    const fileName = `${unitWalkId}_${Date.now()}_${file.name}`;
    const fileSize = file.size;
    const mimeType = file.type;

    // In a real implementation, upload file to S3/etc and get back URL
    // For now, mock the URL based on storage service convention
    const fileUrl = `/uploads/field-photos/${fileName}`;

    let parsedGps = null;
    if (gpsCoordinates) {
      try {
        parsedGps = JSON.parse(gpsCoordinates);
      } catch {
        parsedGps = { raw: gpsCoordinates };
      }
    }

    // Create photo record
    const result = await db
      .insert(fieldUnitWalkPhotos)
      .values({
        unitWalkId,
        photoType: photoType || "general",
        system: system || null,
        isBefore,
        fileName,
        fileUrl,
        fileSize,
        mimeType,
        caption: caption || null,
        timestamp: timestamp ? new Date(timestamp) : new Date(),
        gpsCoordinates: parsedGps,
        meta: {
          uploadedBy: userId,
          uploadedAt: new Date().toISOString(),
        },
      })
      .returning();

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error("[POST field-intelligence/photos]", error);
    return NextResponse.json(
      { error: "Failed to upload photo" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/field-intelligence/photos?unitWalkId=...
 * List all photos for a unit walk
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const unitWalkId = searchParams.get("unitWalkId");
    const photoType = searchParams.get("photoType");
    const system = searchParams.get("system");

    if (!unitWalkId) {
      return NextResponse.json(
        { error: "unitWalkId query parameter required" },
        { status: 400 }
      );
    }

    let query = db
      .select()
      .from(fieldUnitWalkPhotos)
      .where(eq(fieldUnitWalkPhotos.unitWalkId, unitWalkId));

    // Optional filtering
    if (photoType) {
      query = query.where(eq(fieldUnitWalkPhotos.photoType, photoType));
    }
    if (system) {
      query = query.where(eq(fieldUnitWalkPhotos.system, system));
    }

    const photos = await query.orderBy((t: any) => t.createdAt);

    return NextResponse.json(photos);
  } catch (error) {
    console.error("[GET field-intelligence/photos]", error);
    return NextResponse.json(
      { error: "Failed to fetch photos" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/field-intelligence/photos/[photoId]
 * Update photo metadata (caption, tags, etc.)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { photoId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { photoId } = params;
    const body = await req.json();

    const updateData: any = {};

    if (body.caption !== undefined) updateData.caption = body.caption;
    if (body.photoType !== undefined) updateData.photoType = body.photoType;
    if (body.isBefore !== undefined) updateData.isBefore = body.isBefore;
    if (body.system !== undefined) updateData.system = body.system;

    const result = await db
      .update(fieldUnitWalkPhotos)
      .set(updateData)
      .where(eq(fieldUnitWalkPhotos.id, photoId))
      .returning();

    if (!result.length) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("[PATCH field-intelligence/photos]", error);
    return NextResponse.json(
      { error: "Failed to update photo" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/field-intelligence/photos/[photoId]
 * Remove a photo record
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { photoId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { photoId } = params;

    const result = await db
      .delete(fieldUnitWalkPhotos)
      .where(eq(fieldUnitWalkPhotos.id, photoId))
      .returning();

    if (!result.length) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Photo deleted successfully" });
  } catch (error) {
    console.error("[DELETE field-intelligence/photos]", error);
    return NextResponse.json(
      { error: "Failed to delete photo" },
      { status: 500 }
    );
  }
}
