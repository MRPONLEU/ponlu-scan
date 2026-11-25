import { describe, expect, it } from 'vitest';
import { stripPdfExtension } from '../pdfToJpeg';

describe('PDF to JPEG helpers', () => {
  it('sanitizes and strips .pdf extension from filenames', () => {
    expect(stripPdfExtension('Invoice_2026.pdf')).toBe('Invoice_2026');
    expect(stripPdfExtension('Report.PDF')).toBe('Report');
    expect(stripPdfExtension('ឯកសារ:សាលា?.pdf')).toBe('ឯកសារ_សាលា_');
    expect(stripPdfExtension('.pdf')).toBe('P-Scan-PDF');
  });
});
