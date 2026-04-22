export function getAuthorizedReviewers(): string[] {
  const raw = process.env.AXIOM_REVIEWER_WALLETS || '';
  if (!raw.trim()) return [];
  return raw
    .split(',')
    .map(a => a.trim().toLowerCase())
    .filter(Boolean);
}

export function isAuthorizedReviewer(address: string): boolean {
  const list = getAuthorizedReviewers();
  if (list.length === 0) return false;
  return list.includes(address.toLowerCase());
}
