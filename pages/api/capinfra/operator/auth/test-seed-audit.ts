/**
 * DEV / TEST ONLY — seeds audit events with controlled user/legal-name
 * combinations so e2e tests can deterministically verify the legal-name
 * column rendering of the Audit Search table.
 *
 * Disabled in production.
 *
 * POST returns:
 *   {
 *     correlationId: string,
 *     withName: { eventId, userId, legalName, aggregateId },
 *     withoutName: { eventId, userId, aggregateId },
 *   }
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { eq } from 'drizzle-orm';
import { db } from '../../../../../server/db';
import { capUsers, capIdentityProfiles } from '../../../../../shared/capInfraSchema';
import { emitAuditEventStrict } from '../../../../../lib/capinfra/audit';
import { generateId } from '../../../../../lib/capinfra/ids';

const NAMED_USER_ID = 'usr_capinfra_legalname_test';
const NAMED_USER_EMAIL = 'capinfra-legalname-test@axiom.local';
const NAMED_USER_LEGAL_NAME = 'Capinfra Legal Name Test';

const ANON_USER_ID = 'usr_capinfra_nolegalname_test';
const ANON_USER_EMAIL = 'capinfra-nolegalname-test@axiom.local';

async function ensureUser(id: string, email: string) {
  const existing = await db.select().from(capUsers).where(eq(capUsers.id, id)).limit(1);
  if (existing[0]) return;
  await db.insert(capUsers).values({
    id,
    externalId: email,
    entityType: 'NATURAL_PERSON',
    primaryEmail: email,
    jurisdiction: 'US',
    status: 'ACTIVE',
  });
}

async function ensureIdentity(userId: string, legalName: string) {
  const existing = await db
    .select()
    .from(capIdentityProfiles)
    .where(eq(capIdentityProfiles.userId, userId))
    .limit(1);
  if (existing[0]) return;
  await db.insert(capIdentityProfiles).values({
    id: generateId('ip'),
    userId,
    legalName,
    countryOfResidence: 'US',
    countryOfCitizenship: 'US',
    exposureClass: 'UNRESTRICTED',
  });
}

async function ensureNoIdentity(userId: string) {
  await db.delete(capIdentityProfiles).where(eq(capIdentityProfiles.userId, userId));
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'NOT_FOUND' });
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  try {
    await ensureUser(NAMED_USER_ID, NAMED_USER_EMAIL);
    await ensureIdentity(NAMED_USER_ID, NAMED_USER_LEGAL_NAME);

    await ensureUser(ANON_USER_ID, ANON_USER_EMAIL);
    await ensureNoIdentity(ANON_USER_ID);

    // Use a unique aggregateId per call so each test run can filter to
    // only its own seeded rows.
    const correlationId = generateId('ae');
    const namedAggregateId = `LegalNameTest:${correlationId}:named`;
    const anonAggregateId = `LegalNameTest:${correlationId}:anon`;

    const namedEventId = await emitAuditEventStrict({
      eventType: 'LegalNameSeed.Named',
      aggregateType: 'LegalNameTest',
      aggregateId: namedAggregateId,
      userId: NAMED_USER_ID,
      actor: 'e2e-test',
      correlationId,
    });

    const anonEventId = await emitAuditEventStrict({
      eventType: 'LegalNameSeed.Anon',
      aggregateType: 'LegalNameTest',
      aggregateId: anonAggregateId,
      userId: ANON_USER_ID,
      actor: 'e2e-test',
      correlationId,
    });

    return res.status(200).json({
      correlationId,
      withName: {
        eventId: namedEventId,
        userId: NAMED_USER_ID,
        legalName: NAMED_USER_LEGAL_NAME,
        aggregateId: namedAggregateId,
      },
      withoutName: {
        eventId: anonEventId,
        userId: ANON_USER_ID,
        aggregateId: anonAggregateId,
      },
    });
  } catch (err) {
    return res.status(500).json({
      error: 'SEED_FAILED',
      message: err instanceof Error ? err.message : String(err),
    });
  }
}
