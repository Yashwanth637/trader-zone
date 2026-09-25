export interface TreemapNode<T = any> {
  id: string;
  value: number; // e.g. market cap or volume
  data: T;
}

export interface TreemapRect<T = any> {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  data: T;
  value: number;
}

interface ContainerRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Calculates worst aspect ratio for a row of items along length w
 */
function worstAspectRatio(row: number[], w: number): number {
  if (row.length === 0 || w <= 0) return Infinity;
  let s = 0;
  let min = Infinity;
  let max = -Infinity;

  for (let i = 0; i < row.length; i++) {
    const val = row[i];
    s += val;
    if (val < min) min = val;
    if (val > max) max = val;
  }

  if (s <= 0) return Infinity;

  const s2 = s * s;
  const w2 = w * w;
  return Math.max((w2 * max) / s2, s2 / (w2 * min));
}

/**
 * Lays out a completed row of elements along the shorter side of the container
 */
function layoutRow<T>(
  row: TreemapNode<T>[],
  container: ContainerRect,
  horizontal: boolean
): { rects: TreemapRect<T>[]; remaining: ContainerRect } {
  let rowArea = 0;
  for (let i = 0; i < row.length; i++) {
    rowArea += row[i].value;
  }

  const rects: TreemapRect<T>[] = [];

  if (horizontal) {
    // Row runs horizontally across container.width, height is rowArea / container.width
    const rowHeight = container.width > 0 ? rowArea / container.width : 0;
    let currentX = container.x;

    for (let i = 0; i < row.length; i++) {
      const item = row[i];
      const itemWidth = rowHeight > 0 ? item.value / rowHeight : 0;
      rects.push({
        id: item.id,
        x: currentX,
        y: container.y,
        width: itemWidth,
        height: rowHeight,
        data: item.data,
        value: item.value
      });
      currentX += itemWidth;
    }

    const remaining: ContainerRect = {
      x: container.x,
      y: container.y + rowHeight,
      width: container.width,
      height: Math.max(0, container.height - rowHeight)
    };

    return { rects, remaining };
  } else {
    // Row runs vertically across container.height, width is rowArea / container.height
    const rowWidth = container.height > 0 ? rowArea / container.height : 0;
    let currentY = container.y;

    for (let i = 0; i < row.length; i++) {
      const item = row[i];
      const itemHeight = rowWidth > 0 ? item.value / rowWidth : 0;
      rects.push({
        id: item.id,
        x: container.x,
        y: currentY,
        width: rowWidth,
        height: itemHeight,
        data: item.data,
        value: item.value
      });
      currentY += itemHeight;
    }

    const remaining: ContainerRect = {
      x: container.x + rowWidth,
      y: container.y,
      width: Math.max(0, container.width - rowWidth),
      height: container.height
    };

    return { rects, remaining };
  }
}

/**
 * Squarified Treemap Layout (Bruls, Huizing, van Wijk algorithm)
 * Generates optimally square-like tiles for hierarchical or flat data.
 */
export function squarify<T>(
  items: TreemapNode<T>[],
  bounds: ContainerRect
): TreemapRect<T>[] {
  if (items.length === 0 || bounds.width <= 0 || bounds.height <= 0) {
    return [];
  }

  // Filter positive items and calculate total value
  const validItems = items.filter(it => it.value > 0);
  if (validItems.length === 0) return [];

  const totalValue = validItems.reduce((acc, it) => acc + it.value, 0);
  const totalArea = bounds.width * bounds.height;

  // Scale node values to exact pixel areas
  const scaledItems: TreemapNode<T>[] = validItems
    .map(it => ({
      ...it,
      value: (it.value / totalValue) * totalArea
    }))
    .sort((a, b) => b.value - a.value);

  const results: TreemapRect<T>[] = [];
  let remainingBounds: ContainerRect = { ...bounds };
  let currentRow: TreemapNode<T>[] = [];

  for (let i = 0; i < scaledItems.length; i++) {
    const item = scaledItems[i];
    const isHorizontal = remainingBounds.width >= remainingBounds.height;
    const shortestSide = Math.min(remainingBounds.width, remainingBounds.height);

    if (shortestSide <= 0) break;

    const rowValues = currentRow.map(r => r.value);
    const currentWorst = worstAspectRatio(rowValues, shortestSide);
    const candidateWorst = worstAspectRatio([...rowValues, item.value], shortestSide);

    if (currentRow.length === 0 || candidateWorst <= currentWorst) {
      // Adding item improves or maintains aspect ratio
      currentRow.push(item);
    } else {
      // Lay out current row and start new row
      const { rects, remaining } = layoutRow(currentRow, remainingBounds, !isHorizontal);
      results.push(...rects);
      remainingBounds = remaining;
      currentRow = [item];
    }
  }

  // Lay out final remaining row
  if (currentRow.length > 0 && remainingBounds.width > 0 && remainingBounds.height > 0) {
    const isHorizontal = remainingBounds.width >= remainingBounds.height;
    const { rects } = layoutRow(currentRow, remainingBounds, !isHorizontal);
    results.push(...rects);
  }

  return results;
}
