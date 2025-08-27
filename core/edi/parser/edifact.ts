/**
 * Very lightweight EDIFACT parser focusing on ORDERS: splits segments by ' and elements by + / :
 * This is not a full standards-compliant parser, but good enough for template-driven extraction.
 */
export type EdiSegment = { tag: string; elements: string[] };

export function parseEdifact(input: string): EdiSegment[] {
  const trimmed = input.replace(/\r?\n/g, "").trim();
  const segs = trimmed.split("'").map(s => s.trim()).filter(Boolean);
  return segs.map(seg => {
    const [tag, ...rest] = seg.split("+");
    return { tag, elements: rest.map(e => e) };
  });
}

export function edifactIndex(segments: EdiSegment[]): Record<string, EdiSegment[]> {
  return segments.reduce((acc, s) => {
    acc[s.tag] = acc[s.tag] || [];
    acc[s.tag].push(s);
    return acc;
  }, {} as Record<string, EdiSegment[]>);
}
