/**
 * Minimal X12 850 parser. Segments separated by ~, elements by *, sub-elements by :.
 * Again, template-driven mapping rather than a full grammar.
 */
export type X12Segment = { tag: string; elements: string[] };

export function parseX12(input: string): X12Segment[] {
  const trimmed = input.replace(/\r?\n/g, "").trim();
  const segs = trimmed.split("~").map(s => s.trim()).filter(Boolean);
  return segs.map(seg => {
    const [tag, ...rest] = seg.split("*");
    return { tag, elements: rest.map(e => e) };
  });
}

export function x12Index(segments: X12Segment[]): Record<string, X12Segment[]> {
  return segments.reduce((acc, s) => {
    acc[s.tag] = acc[s.tag] || [];
    acc[s.tag].push(s);
    return acc;
  }, {} as Record<string, X12Segment[]>);
}
