// TextSpan to BoundingBox conversion

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface IndexedWord {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
}

export interface TextSpan {
  startWordIndex: number;
  endWordIndex: number;
}

export function spanToBoxes(span: TextSpan, words: IndexedWord[]): BoundingBox[] {
  const boxes: BoundingBox[] = [];

  for (let i = span.startWordIndex; i <= span.endWordIndex; i++) {
    const word = words[i];
    boxes.push({
      x: word.x,
      y: word.y,
      width: word.width,
      height: word.height,
    });
  }

  return boxes;
}

export function mergeBoxes(boxes: BoundingBox[]): BoundingBox {
  if (boxes.length === 0) {
    throw new Error('Cannot merge empty box array');
  }

  const minX = Math.min(...boxes.map((b) => b.x));
  const minY = Math.min(...boxes.map((b) => b.y));
  const maxX = Math.max(...boxes.map((b) => b.x + b.width));
  const maxY = Math.max(...boxes.map((b) => b.y + b.height));

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}
