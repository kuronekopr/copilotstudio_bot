// OCR to TextSpan mapping

export interface IndexedWord {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
}

export interface TextSpan {
  text: string;
  startWordIndex: number;
  endWordIndex: number;
  startCharIndex: number;
  endCharIndex: number;
  confidence: number;
}

export function indexOcr(ocrWords: IndexedWord[]): Map<number, IndexedWord> {
  const indexed = new Map<number, IndexedWord>();
  for (let i = 0; i < ocrWords.length; i++) {
    indexed.set(i, ocrWords[i]);
  }
  return indexed;
}

export function matchSpans(
  fullText: string,
  words: IndexedWord[],
  regex: RegExp
): TextSpan[] {
  const spans: TextSpan[] = [];
  let match;

  while ((match = regex.exec(fullText)) !== null) {
    const matchStart = match.index;
    const matchEnd = match.index + match[0].length;
    let charIndex = 0;
    let startWordIndex = -1;
    let endWordIndex = -1;

    for (let i = 0; i < words.length; i++) {
      const wordLength = words[i].text.length;

      if (charIndex <= matchStart && matchStart < charIndex + wordLength) {
        startWordIndex = i;
      }

      if (charIndex < matchEnd && matchEnd <= charIndex + wordLength) {
        endWordIndex = i;
      }

      charIndex += wordLength + 1;
    }

    if (startWordIndex !== -1 && endWordIndex !== -1) {
      const avgConfidence = (
        words
          .slice(startWordIndex, endWordIndex + 1)
          .reduce((sum, w) => sum + w.confidence, 0) /
        (endWordIndex - startWordIndex + 1)
      ).toFixed(2);

      spans.push({
        text: match[0],
        startWordIndex,
        endWordIndex,
        startCharIndex: matchStart,
        endCharIndex: matchEnd,
        confidence: parseFloat(avgConfidence),
      });
    }
  }

  return spans;
}
