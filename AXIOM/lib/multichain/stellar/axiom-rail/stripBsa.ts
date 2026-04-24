/**
 * Axiom Rail — BSA Data Strip Utility
 *
 * BSA identity records (legal name, DOB, country, ID number) are stored
 * in anchorRawResponse.bsa and must NEVER be returned in public-facing
 * API responses. Call stripBsaFromRecord() or stripBsaFromRecords() on
 * any record before sending it to an external caller.
 */

export function stripBsaFromRecord<T extends { anchorRawResponse?: unknown }>(record: T): T {
  if (!record.anchorRawResponse || typeof record.anchorRawResponse !== 'object') {
    return record;
  }

  const raw = { ...(record.anchorRawResponse as Record<string, unknown>) };
  delete raw['bsa'];

  return { ...record, anchorRawResponse: raw };
}

export function stripBsaFromRecords<T extends { anchorRawResponse?: unknown }>(records: T[]): T[] {
  return records.map(stripBsaFromRecord);
}
