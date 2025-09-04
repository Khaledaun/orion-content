
import { promises as fs } from 'fs';
import path from 'path';
import { randomBytes } from 'crypto';

/**
 * Local Storage Provider for file management
 * Phase 1: Content Management System
 */

export interface StorageFile {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  url?: string;
}

export interface UploadOptions {
  folder?: string;
  maxSize?: number; // in bytes
  allowedTypes?: string[];
}

export class LocalStorageProvider {
  private baseDir: string;
  private publicUrl: string;

  constructor(baseDir: string = './uploads', publicUrl: string = '/uploads') {
    this.baseDir = path.resolve(baseDir);
    this.publicUrl = publicUrl;
  }

  /**
   * Initialize storage directories
   */
  async initialize(): Promise<void> {
    const folders = [
      'articles',
      'media',
      'images',
      'documents',
      'temp',
    ];

    // Create base directory
    await fs.mkdir(this.baseDir, { recursive: true });

    // Create organized folder structure
    for (const folder of folders) {
      const folderPath = path.join(this.baseDir, folder);
      await fs.mkdir(folderPath, { recursive: true });
    }

    console.log(`[STORAGE] Initialized local storage at: ${this.baseDir}`);
  }

  /**
   * Upload a file to local storage
   */
  async uploadFile(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    options: UploadOptions = {}
  ): Promise<StorageFile> {
    const {
      folder = 'media',
      maxSize = 10 * 1024 * 1024, // 10MB default
      allowedTypes = [],
    } = options;

    // Validate file size
    if (buffer.length > maxSize) {
      throw new Error(`File size exceeds maximum allowed size of ${maxSize} bytes`);
    }

    // Validate file type
    if (allowedTypes.length > 0 && !allowedTypes.includes(mimeType)) {
      throw new Error(`File type ${mimeType} is not allowed`);
    }

    // Generate unique filename
    const ext = path.extname(originalName);
    const basename = path.basename(originalName, ext);
    const timestamp = Date.now();
    const random = randomBytes(4).toString('hex');
    const filename = `${basename}-${timestamp}-${random}${ext}`;

    // Ensure folder exists
    const folderPath = path.join(this.baseDir, folder);
    await fs.mkdir(folderPath, { recursive: true });

    // Write file
    const filePath = path.join(folderPath, filename);
    await fs.writeFile(filePath, buffer);

    const storageFile: StorageFile = {
      filename,
      originalName,
      mimeType,
      size: buffer.length,
      path: path.relative(this.baseDir, filePath),
      url: `${this.publicUrl}/${folder}/${filename}`,
    };

    console.log(`[STORAGE] Uploaded file: ${originalName} -> ${filename}`);

    return storageFile;
  }

  /**
   * Delete a file from storage
   */
  async deleteFile(filePath: string): Promise<void> {
    const fullPath = path.join(this.baseDir, filePath);
    
    try {
      await fs.unlink(fullPath);
      console.log(`[STORAGE] Deleted file: ${filePath}`);
    } catch (error) {
      if ((error as any).code !== 'ENOENT') {
        throw error;
      }
      // File doesn't exist, which is fine
    }
  }

  /**
   * Get file information
   */
  async getFileInfo(filePath: string): Promise<{ exists: boolean; size?: number; mtime?: Date }> {
    const fullPath = path.join(this.baseDir, filePath);
    
    try {
      const stats = await fs.stat(fullPath);
      return {
        exists: true,
        size: stats.size,
        mtime: stats.mtime,
      };
    } catch (error) {
      return { exists: false };
    }
  }

  /**
   * List files in a folder
   */
  async listFiles(folder: string = ''): Promise<string[]> {
    const folderPath = path.join(this.baseDir, folder);
    
    try {
      const files = await fs.readdir(folderPath);
      return files.filter(file => {
        // Filter out directories
        return !file.startsWith('.');
      });
    } catch (error) {
      return [];
    }
  }

  /**
   * Clean up temporary files older than specified age
   */
  async cleanupTempFiles(maxAge: number = 24 * 60 * 60 * 1000): Promise<number> {
    const tempFolder = path.join(this.baseDir, 'temp');
    let cleanedCount = 0;

    try {
      const files = await fs.readdir(tempFolder);
      const now = Date.now();

      for (const file of files) {
        const filePath = path.join(tempFolder, file);
        const stats = await fs.stat(filePath);

        if (now - stats.mtime.getTime() > maxAge) {
          await fs.unlink(filePath);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        console.log(`[STORAGE] Cleaned up ${cleanedCount} temporary files`);
      }
    } catch (error) {
      console.error('[STORAGE] Error cleaning up temp files:', error);
    }

    return cleanedCount;
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    folderStats: Record<string, { files: number; size: number }>;
  }> {
    const stats = {
      totalFiles: 0,
      totalSize: 0,
      folderStats: {} as Record<string, { files: number; size: number }>,
    };

    const folders = ['articles', 'media', 'images', 'documents', 'temp'];

    for (const folder of folders) {
      const folderPath = path.join(this.baseDir, folder);
      const folderStat = { files: 0, size: 0 };

      try {
        const files = await fs.readdir(folderPath);

        for (const file of files) {
          const filePath = path.join(folderPath, file);
          const fileStat = await fs.stat(filePath);

          if (fileStat.isFile()) {
            folderStat.files++;
            folderStat.size += fileStat.size;
          }
        }
      } catch (error) {
        // Folder doesn't exist or can't be read
      }

      stats.folderStats[folder] = folderStat;
      stats.totalFiles += folderStat.files;
      stats.totalSize += folderStat.size;
    }

    return stats;
  }

  /**
   * Create a public URL for a file
   */
  getPublicUrl(filePath: string): string {
    return `${this.publicUrl}/${filePath}`;
  }

  /**
   * Get the absolute file system path
   */
  getAbsolutePath(filePath: string): string {
    return path.join(this.baseDir, filePath);
  }
}

// Default instance
export const localStorage = new LocalStorageProvider();
