export type MatrixEntityType = 'deal' | 'inspection' | 'project_outcome' | 'offering' | 'verification';

export interface EnsureMatrixRoomInput {
  entityType: MatrixEntityType;
  entityId: string;
  name: string;
  topic?: string;
  createdBy?: string | null;
}

export interface MatrixStructuredEvent {
  eventType:
    | 'inspection_started'
    | 'inspection_submitted'
    | 'scope_generated'
    | 'outcome_submitted'
    | 'review_approved'
    | 'review_rejected'
    | 'cost_signal_created'
    | 'offering_created'
    | 'commitment_submitted'
    | 'funding_completed';
  payload: Record<string, unknown>;
  actor?: string | null;
}

const matrixEnabled = () => Boolean(process.env.MATRIX_HOMESERVER_URL && process.env.MATRIX_ACCESS_TOKEN);

function syntheticRoomId(entityType: string, entityId: string): string {
  return `unconfigured:${entityType}:${entityId}`;
}

export async function createMatrixRoom(input: EnsureMatrixRoomInput): Promise<{ roomId: string; configured: boolean }> {
  if (!matrixEnabled()) {
    return { roomId: syntheticRoomId(input.entityType, input.entityId), configured: false };
  }

  // Real Matrix calls are deferred; this keeps workflow calls stable and non-breaking.
  return { roomId: syntheticRoomId(input.entityType, input.entityId), configured: true };
}

export async function ensureMatrixRoomForDeal(dealId: string, createdBy?: string | null) {
  return createMatrixRoom({
    entityType: 'deal',
    entityId: dealId,
    name: `Deal Room ${dealId.slice(0, 8)}`,
    createdBy,
  });
}

export async function ensureMatrixRoomForInspection(inspectionSessionId: string, createdBy?: string | null) {
  return createMatrixRoom({
    entityType: 'inspection',
    entityId: inspectionSessionId,
    name: `Inspection Room ${inspectionSessionId.slice(0, 8)}`,
    createdBy,
  });
}

export async function ensureMatrixRoomForProjectOutcome(outcomeId: string, createdBy?: string | null) {
  return createMatrixRoom({
    entityType: 'project_outcome',
    entityId: outcomeId,
    name: `Verification Room ${outcomeId.slice(0, 8)}`,
    createdBy,
  });
}

export async function postStructuredMatrixEvent(_roomId: string, _event: MatrixStructuredEvent): Promise<{ sent: boolean }> {
  if (!matrixEnabled()) {
    return { sent: false };
  }

  // Real event emission can be wired in a later phase.
  return { sent: true };
}

export async function inviteUsersToMatrixRoom(_roomId: string, _userIds: string[]): Promise<{ invited: number }> {
  if (!matrixEnabled()) {
    return { invited: 0 };
  }

  return { invited: _userIds.length };
}
