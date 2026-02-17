import { normalizeEddApiUrl } from '../../src/env';

describe('env', () => {
  describe('normalizeEddApiUrl', () => {
    it('adds /edd-api/ when given a site root', () => {
      expect(normalizeEddApiUrl('https://example.com')).toBe('https://example.com/edd-api/');
      expect(normalizeEddApiUrl('https://example.com/')).toBe('https://example.com/edd-api/');
    });

    it('adds /edd-api/ when given a subdirectory site root', () => {
      expect(normalizeEddApiUrl('https://example.com/subdir')).toBe(
        'https://example.com/subdir/edd-api/'
      );
    });

    it('normalizes /edd-api to /edd-api/', () => {
      expect(normalizeEddApiUrl('https://example.com/edd-api')).toBe(
        'https://example.com/edd-api/'
      );
    });

    it('normalizes a pasted endpoint back to the base /edd-api/', () => {
      expect(normalizeEddApiUrl('https://example.com/edd-api/products/')).toBe(
        'https://example.com/edd-api/'
      );
    });

    it('throws for invalid URLs', () => {
      expect(() => normalizeEddApiUrl('example.com')).toThrow(/https:\/\/example\.com\/edd-api\//i);
    });
  });
});

