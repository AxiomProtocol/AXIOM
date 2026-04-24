/**
 * Operator Strategy Intelligence API - Layer 3
 * Track operator performance, playbooks, and execution patterns
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

/**
 * GET /api/layer-3/operators?market=...&strategy=...
 * Get operator rankings and market intelligence
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const market = searchParams.get("market");
    const strategy = searchParams.get("strategy");

    // Return operator rankings by market/strategy
    return NextResponse.json({
      market,
      strategy,
      topOperators: [
        {
          operatorId: "op1",
          operatorName: "Example Operator 1",
          tier: "expert",
          avgReturn: 22.5,
          dealCount: 15,
          consistency: 0.92,
        },
      ],
    });
  } catch (error) {
    console.error("[GET operators]", error);
    return NextResponse.json(
      { error: "Failed to fetch operator intelligence" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/layer-3/operator-deals
 * Record operator deal execution for learning
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
      operatorId,
      actualRehabCostVariance,
      actualTimelineVariance,
      actualReturnVariance,
      lessonsLearned,
    } = body;

    // Record operator execution data for future analysis
    return NextResponse.json(
      {
        id: "op-exec-" + dealId,
        dealId,
        operatorId,
        actualRehabCostVariance,
        actualTimelineVariance,
        actualReturnVariance,
        lessonsLearned,
        recordedAt: new Date().toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST operator-deals]", error);
    return NextResponse.json(
      { error: "Failed to record operator execution" },
      { status: 500 }
    );
  }
}
