/**
 * tests/migrate-journal-sync.test.ts
 *
 * Ensures that every *.sql file under migrations/ has a corresponding entry
 * in migrations/meta/_journal.json, and vice-versa. Catches the class of bug
 * where a new SQL file is added but the journal is never updated (or the
 * journal is edited but the SQL file is absent), causing `tsx scripts/migrate.ts`
 * to silently skip migrations on a fresh dev database.
 *
 * This test has no external dependencies — it is a pure filesystem check and
 * always runs regardless of DATABASE_URL.
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const MIGRATIONS_DIR = path.join(process.cwd(), 'migrations');
const JOURNAL_PATH = path.join(MIGRATIONS_DIR, 'meta', '_journal.json');

describe('migrations/_journal.json sync check', () => {
  const journal = JSON.parse(fs.readFileSync(JOURNAL_PATH, 'utf8')) as {
    entries: Array<{ idx: number; tag: string }>;
  };

  const journalTags = new Set(journal.entries.map((e) => e.tag));

  const sqlFiles = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .map((f) => path.basename(f, '.sql'));

  const sqlFileSet = new Set(sqlFiles);

  it('every .sql file in migrations/ has an entry in _journal.json', () => {
    const missing = sqlFiles.filter((tag) => !journalTags.has(tag));
    expect(
      missing,
      `These SQL files are not listed in _journal.json:\n  ${missing.join('\n  ')}\n\nAdd them to migrations/meta/_journal.json with the correct idx and tag.`,
    ).toEqual([]);
  });

  it('every journal entry has a matching .sql file in migrations/', () => {
    const orphaned = journal.entries
      .map((e) => e.tag)
      .filter((tag) => !sqlFileSet.has(tag));
    expect(
      orphaned,
      `These _journal.json entries have no matching .sql file:\n  ${orphaned.join('\n  ')}\n\nEither add the missing SQL file or remove the stale journal entry.`,
    ).toEqual([]);
  });

  it('journal entries have unique, sequential idx values starting at 0', () => {
    const indices = journal.entries.map((e) => e.idx).sort((a, b) => a - b);
    const expected = indices.map((_, i) => i);
    expect(
      indices,
      `Journal idx values must be unique integers 0…N-1. Got: [${indices.join(', ')}]`,
    ).toEqual(expected);
  });

  it('journal entries have unique tags', () => {
    const seen = new Set<string>();
    const duplicates: string[] = [];
    for (const { tag } of journal.entries) {
      if (seen.has(tag)) duplicates.push(tag);
      seen.add(tag);
    }
    expect(
      duplicates,
      `Duplicate tags found in _journal.json: ${duplicates.join(', ')}`,
    ).toEqual([]);
  });
});
