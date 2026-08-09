export type Identified = { id: string };

export function upsertById<T extends Identified>(items: T[], item: T) {
  return items.some((current) => current.id === item.id)
    ? items.map((current) => (current.id === item.id ? item : current))
    : [...items, item];
}

export function removeById<T extends Identified>(items: T[], id: string) {
  return items.filter((item) => item.id !== id);
}

export function restoreById<T extends Identified>(
  items: T[],
  id: string,
  previous?: T,
) {
  const withoutCurrent = removeById(items, id);
  return previous ? [...withoutCurrent, previous] : withoutCurrent;
}
