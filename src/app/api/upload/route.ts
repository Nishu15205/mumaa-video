// ============================================================
// MUMAA File Upload API
// POST /api/upload - Upload single or multiple files
// Supports: jpg, jpeg, png, gif, webp (images), pdf (documents)
// Images are resized to max 800x800 and compressed at quality 80
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getStorageService } from '@/lib/storage';

const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf']);

function isAllowedFile(filename: string, mimeType: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return ALLOWED_EXTENSIONS.has(ext) && (
    mimeType.startsWith('image/') || mimeType === 'application/pdf'
  );
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll('file');

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided. Use the "file" field.' },
        { status: 400 }
      );
    }

    if (files.length > 10) {
      return NextResponse.json(
        { error: 'Maximum 10 files per upload.' },
        { status: 400 }
      );
    }

    const folder = (formData.get('folder') as string) || 'general';
    const storage = getStorageService();
    const results: Array<{
      url: string;
      key: string;
      size: number;
      mimeType: string;
      width?: number;
      height?: number;
      error?: string;
    }> = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (!(file instanceof File)) {
        results.push({ url: '', key: '', size: 0, mimeType: '', error: 'Invalid file object' });
        continue;
      }

      // Validate file type by extension AND MIME type
      if (!isAllowedFile(file.name, file.type)) {
        results.push({
          url: '', key: '', size: 0, mimeType: file.type,
          error: `Unsupported file type: ${file.type || 'unknown'} (${file.name})`
        });
        continue;
      }

      // Convert File to Buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      try {
        const result = await storage.upload(buffer, file.type, folder);
        results.push(result);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Upload failed';
        const isSizeError = message.toLowerCase().includes('too large');
        const isTypeError = message.toLowerCase().includes('unsupported');

        results.push({
          url: '', key: '', size: buffer.length, mimeType: file.type,
          error: message,
          ...(isSizeError && { statusCode: 413 }),
          ...(isTypeError && { statusCode: 415 }),
        });
      }
    }

    // Determine overall status
    const allFailed = results.every((r) => !!r.error);
    const allSucceeded = results.every((r) => !r.error);

    if (allFailed) {
      // Return status based on first error
      const firstError = results[0];
      const statusCode = (firstError as Record<string, unknown>).statusCode as number || 400;
      return NextResponse.json(
        { error: firstError.error, results },
        { status: statusCode }
      );
    }

    // For single file upload with error
    if (files.length === 1 && results[0].error) {
      const statusCode = (results[0] as Record<string, unknown>).statusCode as number || 400;
      return NextResponse.json(
        { error: results[0].error },
        { status: statusCode }
      );
    }

    // For batch: return mixed results
    const successCount = results.filter((r) => !r.error).length;

    return NextResponse.json({
      message: `Uploaded ${successCount}/${results.length} file(s) successfully`,
      results: results.filter((r) => !r.error),
      errors: results.filter((r) => r.error).map((r) => r.error),
      ...(allSucceeded && { url: results[0].url, key: results[0].key, size: results[0].size }),
    });
  } catch (error: unknown) {
    console.error('Upload API error:', error);
    return NextResponse.json(
      { error: 'Internal server error during upload' },
      { status: 500 }
    );
  }
}
