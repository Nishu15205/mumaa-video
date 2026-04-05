// ============================================================
// MUMAA Storage Abstraction Layer
// CDN-ready: swap STORAGE_TYPE=cdn + set STORAGE_CDN_URL to use a CDN
// Default: local filesystem at public/uploads/
// ============================================================

import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

// ---------- Types ----------

export interface UploadOptions {
  /** Max width for image resize (default: 800) */
  maxWidth?: number;
  /** Max height for image resize (default: 800) */
  maxHeight?: number;
  /** JPEG/WebP compression quality 1-100 (default: 80) */
  quality?: number;
  /** Force output format (e.g. 'webp'). If omitted, keeps original format */
  format?: 'jpeg' | 'png' | 'webp';
}

export interface UploadResult {
  url: string;
  key: string;
  size: number;
  mimeType: string;
  width?: number;
  height?: number;
}

export interface StorageConfig {
  type: 'local' | 'cdn';
  cdnUrl?: string;
  basePath: string;
  publicPath: string;
}

// ---------- Constants ----------

const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/gif': 'png', // convert gif to png
  'image/webp': 'webp',
};

const ALLOWED_DOC_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
};

const ALL_ALLOWED_TYPES = { ...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOC_TYPES };

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_DOC_SIZE = 10 * 1024 * 1024; // 10MB

const DEFAULT_OPTIONS: Required<UploadOptions> = {
  maxWidth: 800,
  maxHeight: 800,
  quality: 80,
  format: 'webp',
};

// ---------- Helpers ----------

function getConfig(): StorageConfig {
  const type = (process.env.STORAGE_TYPE === 'cdn' ? 'cdn' : 'local') as 'local' | 'cdn';
  return {
    type,
    cdnUrl: process.env.STORAGE_CDN_URL || '',
    basePath: path.join(process.cwd(), 'public', 'uploads'),
    publicPath: '/uploads',
  };
}

function isImage(mimeType: string): boolean {
  return mimeType in ALLOWED_IMAGE_TYPES;
}

function isDocument(mimeType: string): boolean {
  return mimeType in ALLOWED_DOC_TYPES;
}

function getMaxSize(mimeType: string): number {
  return isImage(mimeType) ? MAX_IMAGE_SIZE : MAX_DOC_SIZE;
}

function getExtension(mimeType: string, options: Required<UploadOptions>): string {
  if (isDocument(mimeType)) {
    return ALLOWED_DOC_TYPES[mimeType];
  }
  // For images, use the forced format or original extension
  if (options.format) {
    return options.format === 'jpeg' ? 'jpg' : options.format;
  }
  return ALLOWED_IMAGE_TYPES[mimeType] || 'jpg';
}

function generateUniqueFilename(extension: string): string {
  const timestamp = Date.now().toString(36);
  const random = uuidv4().split('-')[0];
  return `${timestamp}-${random}.${extension}`;
}

function ensureDirectory(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// ---------- Storage Service ----------

class StorageService {
  private config: StorageConfig;

  constructor() {
    this.config = getConfig();
  }

  /**
   * Upload a file buffer to storage.
   * For images: resizes, compresses, and optionally converts format.
   * For documents: saves as-is.
   */
  async upload(
    buffer: Buffer,
    mimeType: string,
    folder: string = 'general',
    options?: UploadOptions
  ): Promise<UploadResult> {
    // Validate MIME type
    if (!(mimeType in ALL_ALLOWED_TYPES)) {
      throw new Error(`Unsupported file type: ${mimeType}`);
    }

    // Validate file size
    const maxSize = getMaxSize(mimeType);
    if (buffer.length > maxSize) {
      const maxMB = maxSize / (1024 * 1024);
      throw new Error(`File too large. Maximum ${maxMB}MB for this file type.`);
    }

    const opts = { ...DEFAULT_OPTIONS, ...options };
    const extension = getExtension(mimeType, opts);
    const filename = generateUniqueFilename(extension);
    const key = `${folder}/${filename}`;
    const relativePath = path.join(folder, filename);
    const fullPath = path.join(this.config.basePath, relativePath);

    ensureDirectory(path.join(this.config.basePath, folder));

    let processedBuffer: Buffer;
    let width: number | undefined;
    let height: number | undefined;
    let finalMimeType: string;

    if (isImage(mimeType)) {
      // Process image with sharp
      let pipeline = sharp(buffer);

      // Get metadata for dimensions
      const metadata = await pipeline.metadata();
      width = metadata.width;
      height = metadata.height;

      // Determine output format
      const format = opts.format || (mimeType === 'image/webp' ? 'webp' : 'jpeg');

      switch (format) {
        case 'webp':
          pipeline = pipeline.webp({ quality: opts.quality });
          finalMimeType = 'image/webp';
          break;
        case 'png':
          pipeline = pipeline.png({ quality: opts.quality });
          finalMimeType = 'image/png';
          break;
        default:
          pipeline = pipeline.jpeg({ quality: opts.quality });
          finalMimeType = 'image/jpeg';
          break;
      }

      // Resize if exceeds max dimensions
      pipeline = pipeline.resize(opts.maxWidth, opts.maxHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      });

      processedBuffer = await pipeline.toBuffer();
    } else {
      // Document: save as-is
      processedBuffer = buffer;
      finalMimeType = mimeType;
    }

    // Write to disk
    fs.writeFileSync(fullPath, processedBuffer);

    const url = this.getFileUrl(key);

    return {
      url,
      key,
      size: processedBuffer.length,
      mimeType: finalMimeType,
      width,
      height,
    };
  }

  /**
   * Delete a file by its storage key.
   */
  delete(key: string): boolean {
    try {
      const fullPath = path.join(this.config.basePath, key);

      // Security: prevent path traversal
      const resolvedBase = path.resolve(this.config.basePath);
      const resolvedFull = path.resolve(fullPath);
      if (!resolvedFull.startsWith(resolvedBase)) {
        console.error('Storage delete: path traversal attempt detected');
        return false;
      }

      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Storage delete error:', error);
      return false;
    }
  }

  /**
   * Get a signed URL for private files (CDN mode).
   * In local mode, returns the public URL directly.
   */
  getSignedUrl(key: string, _expiry: number = 3600): string {
    if (this.config.type === 'cdn' && this.config.cdnUrl) {
      // In a real CDN setup, this would generate a presigned URL
      // For now, return the CDN URL directly
      return `${this.config.cdnUrl}/${key}`;
    }
    return this.getFileUrl(key);
  }

  /**
   * Get the public URL for a file by key.
   */
  getFileUrl(key: string): string {
    if (this.config.type === 'cdn' && this.config.cdnUrl) {
      return `${this.config.cdnUrl}/${key}`;
    }
    return `${this.config.publicPath}/${key}`;
  }

  /**
   * Check if a file exists by key.
   */
  exists(key: string): boolean {
    const fullPath = path.join(this.config.basePath, key);
    return fs.existsSync(fullPath);
  }
}

// ---------- Singleton ----------

let _storageService: StorageService | null = null;

export function getStorageService(): StorageService {
  if (!_storageService) {
    _storageService = new StorageService();
  }
  return _storageService;
}

// Export for direct use
export { StorageService };
export { ALLOWED_IMAGE_TYPES, ALLOWED_DOC_TYPES, MAX_IMAGE_SIZE, MAX_DOC_SIZE };
