import { describe, expect, it } from 'vitest';
import { cleanKhmerOcrText } from '../ocr';

describe('Khmer OCR text post-processing', () => {
  it('joins broken spaces inside Khmer vowels/coeng while keeping word/number spacing', () => {
    expect(cleanKhmerOcrText('ក ារងារ  សួស្តី')).toBe('ការងារ សួស្តី');
    expect(cleanKhmerOcrText('ប្ រទេស កម ្ពុជា\n\n\n២០២៦')).toBe('ប្រទេស កម្ពុជា\n\n២០២៦');
    expect(cleanKhmerOcrText('តម្លៃ $316.50')).toBe('តម្លៃ $316.50');
  });
});
