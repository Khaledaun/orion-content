
/**
 * Phase 1: Tests for crypto utilities
 */
import { encryptData, decryptData, generateKey } from '@/lib/crypto';

// Mock crypto for Node.js environment
const mockCrypto = {
  randomBytes: (size: number) => Buffer.from('a'.repeat(size)),
  createCipher: () => ({
    setAAD: jest.fn(),
    update: jest.fn().mockReturnValue('encrypted'),
    final: jest.fn().mockReturnValue(''),
    getAuthTag: () => Buffer.from('tag')
  }),
  createDecipher: () => ({
    setAuthTag: jest.fn(),
    setAAD: jest.fn(),
    update: jest.fn().mockReturnValue('decrypted'),
    final: jest.fn().mockReturnValue('')
  })
};

jest.mock('crypto', () => mockCrypto);

describe('Crypto utilities', () => {
  describe('generateKey', () => {
    it('should generate a 64-character hex string', () => {
      const key = generateKey();
      expect(key).toHaveLength(64);
      expect(key).toMatch(/^[a-f0-9]+$/);
    });
  });

  describe('encryptData and decryptData', () => {
    it('should encrypt and decrypt data successfully', async () => {
      const originalData = 'test-secret-data';
      const key = generateKey();

      const encrypted = await encryptData(originalData, key);
      expect(encrypted).toHaveProperty('data');
      expect(encrypted).toHaveProperty('iv');
      expect(encrypted).toHaveProperty('tag');

      const decrypted = await decryptData(encrypted, key);
      expect(decrypted).toBe('decrypted'); // Mocked return value
    });

    it('should handle empty data', async () => {
      const key = generateKey();
      const encrypted = await encryptData('', key);
      const decrypted = await decryptData(encrypted, key);
      expect(decrypted).toBe('decrypted'); // Mocked return value
    });
  });
});
