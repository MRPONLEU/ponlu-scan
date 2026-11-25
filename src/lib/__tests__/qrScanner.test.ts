import { describe, expect, it } from 'vitest';
import { parseQrPayload } from '../qrScanner';

describe('QR Scanner payload parser', () => {
  it('detects URLs, Wi-Fi, KHQR, tel, email, and plain text', () => {
    expect(parseQrPayload('https://example.com/doc').type).toBe('url');

    const wifi = parseQrPayload('WIFI:T:WPA;S:OfficeNet;P:Secret123;;');
    expect(wifi.type).toBe('wifi');
    expect(wifi.wifi?.ssid).toBe('OfficeNet');
    expect(wifi.wifi?.password).toBe('Secret123');
    expect(wifi.wifi?.encryption).toBe('WPA');

    expect(
      parseQrPayload('00020101021129370016A00000067701011101130085512345678952045999').type
    ).toBe('khqr');

    expect(parseQrPayload('tel:+85512345678').type).toBe('tel');
    expect(parseQrPayload('mailto:info@pscan.app').type).toBe('email');
    expect(parseQrPayload('សួស្តី P-Scan').type).toBe('text');
  });
});
