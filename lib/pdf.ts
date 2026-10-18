/**
 * Minimal, dependency-free PDF generator for synthetic seed documents.
 * Produces a valid single-page PDF with a title and body lines. This is only
 * used to create clearly-synthetic demo files; it is not a general PDF library.
 */
function escapePdf(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

export function makePdf(title: string, lines: string[]): Buffer {
  const body: string[] = [];
  body.push('BT', '/F1 18 Tf', '72 720 Td', `(${escapePdf(title)}) Tj`, 'ET');
  let y = 690;
  for (const line of lines) {
    body.push('BT', '/F1 11 Tf', `72 ${y} Td`, `(${escapePdf(line)}) Tj`, 'ET');
    y -= 18;
    if (y < 72) break;
  }
  const content = body.join('\n');

  const objects: string[] = [];
  objects.push('<< /Type /Catalog /Pages 2 0 R >>');
  objects.push('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  objects.push(
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
  );
  objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((obj, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (const off of offsets) {
    pdf += `${off.toString().padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return Buffer.from(pdf, 'binary');
}
