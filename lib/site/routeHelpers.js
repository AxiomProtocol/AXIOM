export function buildTo(to, section) {
  if (!section) return to;
  return `${to}?section=${section}`;
}
