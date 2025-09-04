
/**
 * Phase 1: Tests for storage utilities
 */
import {
  getStoredCredentials,
  storeCredential,
  removeCredential,
  getCredential,
  clearAllCredentials
} from '@/lib/storage';

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

describe('Storage utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getStoredCredentials', () => {
    it('should return empty array when no credentials stored', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      const credentials = getStoredCredentials();
      expect(credentials).toEqual([]);
    });

    it('should return parsed credentials when stored', () => {
      const mockCredentials = [
        {
          id: '1',
          name: 'Test Credential',
          type: 'api_key',
          encryptedData: 'encrypted',
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z'
        }
      ];
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockCredentials));
      
      const credentials = getStoredCredentials();
      expect(credentials).toEqual(mockCredentials);
    });

    it('should handle invalid JSON gracefully', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid-json');
      const credentials = getStoredCredentials();
      expect(credentials).toEqual([]);
    });
  });

  describe('storeCredential', () => {
    it('should store a new credential', () => {
      mockLocalStorage.getItem.mockReturnValue('[]');
      
      const credential = {
        id: '1',
        name: 'Test Credential',
        type: 'api_key',
        encryptedData: 'encrypted'
      };

      storeCredential(credential);
      
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'orion_credentials',
        expect.stringContaining(credential.id)
      );
    });

    it('should update existing credential', () => {
      const existingCredentials = [
        {
          id: '1',
          name: 'Old Name',
          type: 'api_key',
          encryptedData: 'old-encrypted',
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z'
        }
      ];
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(existingCredentials));

      const updatedCredential = {
        id: '1',
        name: 'New Name',
        type: 'api_key',
        encryptedData: 'new-encrypted'
      };

      storeCredential(updatedCredential);
      
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'orion_credentials',
        expect.stringContaining('New Name')
      );
    });
  });

  describe('removeCredential', () => {
    it('should remove credential by id', () => {
      const credentials = [
        {
          id: '1',
          name: 'Keep',
          type: 'api_key',
          encryptedData: 'encrypted',
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z'
        },
        {
          id: '2',
          name: 'Remove',
          type: 'api_key',
          encryptedData: 'encrypted',
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z'
        }
      ];
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(credentials));

      removeCredential('2');
      
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'orion_credentials',
        expect.not.stringContaining('Remove')
      );
    });
  });

  describe('getCredential', () => {
    it('should return specific credential by id', () => {
      const credentials = [
        {
          id: '1',
          name: 'Test Credential',
          type: 'api_key',
          encryptedData: 'encrypted',
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z'
        }
      ];
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(credentials));

      const credential = getCredential('1');
      expect(credential).toEqual(credentials[0]);
    });

    it('should return null for non-existent credential', () => {
      mockLocalStorage.getItem.mockReturnValue('[]');
      const credential = getCredential('non-existent');
      expect(credential).toBeNull();
    });
  });

  describe('clearAllCredentials', () => {
    it('should remove all credentials', () => {
      clearAllCredentials();
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('orion_credentials');
    });
  });
});
