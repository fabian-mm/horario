export type TreasureMapPoint = {
  id: string;
  x: number;
  y: number;
};

const hashText = (value: string) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const randomFrom = (value: string, salt: string) =>
  hashText(`${salt}:${value}`) / 0xffffffff;

export function createTreasureMapLayout(ids: string[]): TreasureMapPoint[] {
  let currentY = 86;

  return ids.map((id, index) => {
    const x = 16 + randomFrom(id, "x") * 68;
    if (index > 0) currentY += 118 + randomFrom(id, "y") * 54;
    return { id, x: Math.round(x * 10) / 10, y: Math.round(currentY) };
  });
}

export function createTreasurePath(points: Array<Pick<TreasureMapPoint, "x" | "y">>) {
  if (!points.length) return "";
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const distance = current.y - previous.y;
    const firstControlY = previous.y + distance * 0.42;
    const secondControlY = current.y - distance * 0.42;
    path += ` C ${previous.x} ${firstControlY.toFixed(1)}, ${current.x} ${secondControlY.toFixed(1)}, ${current.x} ${current.y}`;
  }
  return path;
}
