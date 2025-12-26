import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { 
  susuInterestHubs, 
  susuPurposeGroups, 
  susuPurposeCategories
} from '../../../shared/schema';
import { eq, and, sql } from 'drizzle-orm';

interface JoinRequest {
  region: string;
  purpose: string;
  commitmentAmount: number;
  commitmentDuration: number;
  name: string;
  email: string;
  phone?: string | null;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      region, 
      purpose, 
      commitmentAmount, 
      commitmentDuration,
      name, 
      email, 
      phone 
    } = req.body as JoinRequest;

    if (!region || !purpose || !commitmentAmount || !name || !email) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['region', 'purpose', 'commitmentAmount', 'name', 'email']
      });
    }

    if (commitmentAmount < 25) {
      return res.status(400).json({ error: 'Minimum contribution is $25/month' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    let hubId: number | null = null;
    let groupId: number | null = null;
    let dataSource = 'pending';

    try {
      let [hub] = await db
        .select()
        .from(susuInterestHubs)
        .where(eq(susuInterestHubs.regionId, region));

      if (!hub) {
        const regionDisplay = region.charAt(0).toUpperCase() + region.slice(1).replace(/-/g, ' ');
        
        [hub] = await db
          .insert(susuInterestHubs)
          .values({
            regionId: region,
            regionDisplay: `${regionDisplay} Interest Hub`,
            regionType: 'metro',
            memberCount: 1,
            isActive: true
          })
          .returning();
      } else {
        await db
          .update(susuInterestHubs)
          .set({ 
            memberCount: sql`COALESCE(${susuInterestHubs.memberCount}, 0) + 1`,
            updatedAt: new Date()
          })
          .where(eq(susuInterestHubs.id, hub.id));
      }

      hubId = hub.id;

      let [purposeCategory] = await db
        .select()
        .from(susuPurposeCategories)
        .where(eq(susuPurposeCategories.name, purpose));

      if (!purposeCategory) {
        [purposeCategory] = await db
          .insert(susuPurposeCategories)
          .values({
            name: purpose,
            description: `Purpose Group for ${purpose}`,
            icon: '🎯',
            isActive: true
          })
          .returning();
      }

      let [group] = await db
        .select()
        .from(susuPurposeGroups)
        .where(and(
          eq(susuPurposeGroups.hubId, hub.id),
          eq(susuPurposeGroups.purposeCategoryId, purposeCategory.id),
          eq(susuPurposeGroups.isActive, true)
        ));

      if (!group) {
        [group] = await db
          .insert(susuPurposeGroups)
          .values({
            hubId: hub.id,
            purposeCategoryId: purposeCategory.id,
            contributionAmount: String(commitmentAmount),
            contributionCurrency: 'USD',
            cycleLengthDays: commitmentDuration * 30,
            displayName: `${hub.regionDisplay} ${purposeCategory.name} Circle`,
            memberCount: 1,
            minMembersToActivate: 3,
            maxMembers: 50,
            isActive: true
          })
          .returning();
      } else {
        await db
          .update(susuPurposeGroups)
          .set({ 
            memberCount: sql`COALESCE(${susuPurposeGroups.memberCount}, 0) + 1`,
            updatedAt: new Date()
          })
          .where(eq(susuPurposeGroups.id, group.id));
      }

      groupId = group.id;
      dataSource = 'database';

    } catch (dbError) {
      console.error('Database operation error:', dbError);
      dataSource = 'pending_manual_review';
    }

    return res.status(200).json({
      success: true,
      message: 'Successfully registered for Purpose Group!',
      data: {
        hubId,
        groupId,
        region,
        purpose,
        commitmentAmount,
        memberName: name,
        memberEmail: email,
        memberPhone: phone || null,
        dataSource
      }
    });
  } catch (error: unknown) {
    console.error('Join purpose group error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
}
