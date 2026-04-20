import {
  contractTransitionMatrixVersion,
  isAllowedContractTransition,
} from '../shared/contracts/transitionMatrix';
import { contractWriteEnvelopeSchema } from '../shared/contracts/validators';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  PASS: ${name}`);
  } catch (error: any) {
    console.log(`  FAIL: ${name} - ${error.message}`);
    throw error;
  }
}

function run() {
  console.log('Running contract policy + validator tests...\n');
  console.log(`Transition matrix version: ${contractTransitionMatrixVersion}\n`);

  test('FI allows draft -> intake for operator', () => {
    const allowed = isAllowedContractTransition(
      'field_intelligence',
      'draft',
      'intake',
      'operator',
    );
    assert(allowed, 'Expected operator to move FI draft to intake');
  });

  test('FI denies under_review -> approved for investor', () => {
    const allowed = isAllowedContractTransition(
      'field_intelligence',
      'under_review',
      'approved',
      'investor',
    );
    assert(!allowed, 'Expected investor to be denied FI approval transition');
  });

  test('RE allows under_review -> approved for admin', () => {
    const allowed = isAllowedContractTransition(
      'real_estate',
      'under_review',
      'approved',
      'admin',
    );
    assert(allowed, 'Expected admin to approve RE under_review state');
  });

  test('RE denies intake -> completed for admin', () => {
    const allowed = isAllowedContractTransition(
      'real_estate',
      'intake',
      'completed',
      'admin',
    );
    assert(!allowed, 'Expected direct intake->completed to be denied');
  });

  test('Contract write envelope accepts version concurrency', () => {
    const parsed = contractWriteEnvelopeSchema.safeParse({
      requestId: 'req-1',
      idempotencyKey: 'idem-1',
      concurrency: { version: 2 },
      reasonCode: 'status_transition_requested',
      payload: {
        entity: {
          id: '11111111-1111-4111-8111-111111111111',
          domain: 'field_intelligence',
          entityType: 'inspection_session',
        },
        toStatus: 'under_review',
      },
    });

    assert(parsed.success, 'Expected envelope to parse with version concurrency');
  });

  test('Contract write envelope accepts updatedAt concurrency', () => {
    const parsed = contractWriteEnvelopeSchema.safeParse({
      requestId: 'req-2',
      idempotencyKey: 'idem-2',
      concurrency: { updatedAt: '2026-03-18T00:00:00.000Z' },
      reasonCode: 'status_transition_requested',
      payload: {
        entity: {
          id: '22222222-2222-4222-8222-222222222222',
          domain: 'real_estate',
          entityType: 'deal',
        },
        toStatus: 'approved',
      },
    });

    assert(parsed.success, 'Expected envelope to parse with updatedAt concurrency');
  });

  test('Contract write envelope rejects missing idempotency key', () => {
    const parsed = contractWriteEnvelopeSchema.safeParse({
      requestId: 'req-3',
      concurrency: { version: 1 },
      reasonCode: 'status_transition_requested',
      payload: {
        entity: {
          id: '33333333-3333-4333-8333-333333333333',
          domain: 'field_intelligence',
          entityType: 'inspection_session',
        },
        toStatus: 'approved',
      },
    });

    assert(!parsed.success, 'Expected missing idempotencyKey to fail validation');
  });

  test('Contract write envelope rejects invalid entity id', () => {
    const parsed = contractWriteEnvelopeSchema.safeParse({
      requestId: 'req-4',
      idempotencyKey: 'idem-4',
      concurrency: { version: 1 },
      reasonCode: 'status_transition_requested',
      payload: {
        entity: {
          id: 'not-a-uuid',
          domain: 'real_estate',
          entityType: 'deal',
        },
        toStatus: 'approved',
      },
    });

    assert(!parsed.success, 'Expected invalid UUID to fail validation');
  });

  console.log('\nAll contract policy + validator tests passed.');
}

run();