import { QrService } from './qr.service';

describe('QrService', () => {
  let service: QrService;

  beforeEach(() => {
    service = new QrService();
  });

  describe('toDataUrl', () => {
    it('returns a base64 PNG data URL', async () => {
      const url = await service.toDataUrl('https://example.com/track/abc');
      expect(url).toMatch(/^data:image\/png;base64,/);
    });

    it('encodes different payloads into different images', async () => {
      const a = await service.toDataUrl('payload-a');
      const b = await service.toDataUrl('payload-b');
      expect(a).not.toEqual(b);
    });

    it('honours a custom pixel size (e.g. 100x100 cert label)', async () => {
      const small = await service.toDataUrl('x', 100);
      const large = await service.toDataUrl('x', 400);
      // larger size → more pixels → longer base64 payload
      expect(large.length).toBeGreaterThan(small.length);
    });
  });

  describe('toPngBuffer', () => {
    it('returns a PNG buffer with the PNG magic header', async () => {
      const buf = await service.toPngBuffer('hello');
      // PNG files start with the 8-byte signature 89 50 4E 47 0D 0A 1A 0A
      expect(buf.subarray(0, 4).toString('hex')).toBe('89504e47');
    });
  });
});
