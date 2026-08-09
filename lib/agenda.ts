export type AgendaInterval = { id: string; start: number; end: number };

export type AgendaLayout<T extends AgendaInterval> = T & {
  lane: number;
  laneCount: number;
};

export function layoutAgendaEvents<T extends AgendaInterval>(
  items: T[],
  minimumVisualMinutes = 0,
): AgendaLayout<T>[] {
  const sorted = [...items]
    .filter((item) => item.end > item.start)
    .sort((a, b) => a.start - b.start || a.end - b.end);
  const result: AgendaLayout<T>[] = [];

  for (let cursor = 0; cursor < sorted.length;) {
    const group: T[] = [sorted[cursor]];
    let groupEnd = Math.max(sorted[cursor].end, sorted[cursor].start + minimumVisualMinutes);
    let next = cursor + 1;
    while (next < sorted.length && sorted[next].start < groupEnd) {
      group.push(sorted[next]);
      groupEnd = Math.max(groupEnd, sorted[next].end, sorted[next].start + minimumVisualMinutes);
      next += 1;
    }

    const laneEnds: number[] = [];
    const positioned = group.map((item) => {
      let lane = laneEnds.findIndex((end) => end <= item.start);
      if (lane < 0) lane = laneEnds.length;
      laneEnds[lane] = Math.max(item.end, item.start + minimumVisualMinutes);
      return { item, lane };
    });
    const laneCount = Math.max(1, laneEnds.length);
    positioned.forEach(({ item, lane }) => result.push({ ...item, lane, laneCount }));
    cursor = next;
  }

  return result;
}

export function getAgendaBounds(
  items: AgendaInterval[],
  defaultStart = 7 * 60,
  defaultEnd = 22 * 60,
) {
  const valid = items.filter((item) => item.end > item.start);
  if (!valid.length) return { start: defaultStart, end: defaultEnd };
  const earliest = Math.min(...valid.map((item) => item.start));
  const latest = Math.max(...valid.map((item) => item.end));
  const start = Math.max(0, Math.min(defaultStart, Math.floor(earliest / 60) * 60));
  const end = Math.min(24 * 60, Math.max(defaultEnd, Math.ceil(latest / 60) * 60));
  return { start, end: Math.max(start + 60, end) };
}
