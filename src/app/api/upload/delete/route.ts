// ============================================================
// MUMAA File Delete API
// POST /api/upload/delete - Delete a file by key
// Body: { key: string, userId?: string }
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getStorageService } from '@/lib/storage';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { key, userId } = body;

    if (!key || typeof key !== 'string') {
      return NextResponse.json(
        { error: 'File key is required' },
        { status: 400 }
      );
    }

    // Validate key format: must be folder/filename.ext
    const keyParts = key.split('/');
    if (keyParts.length < 2 || keyParts.some((p: string) => !p)) {
      return NextResponse.json(
        { error: 'Invalid file key format' },
        { status: 400 }
      );
    }

    // Security: prevent path traversal
    if (key.includes('..') || key.includes('\\') || key.startsWith('/')) {
      return NextResponse.json(
        { error: 'Invalid file key' },
        { status: 400 }
      );
    }

    // TODO: Add proper authorization check using userId
    // For now, basic check: require userId to be present
    if (!userId) {
      return NextResponse.json(
        { error: 'Authorization required' },
        { status: 401 }
      );
    }

    const storage = getStorageService();
    const deleted = storage.delete(key);

    if (!deleted) {
      return NextResponse.json(
        { error: 'File not found or could not be deleted' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully',
    });
  } catch (error: unknown) {
    console.error('Delete API error:', error);
    return NextResponse.json(
      { error: 'Internal server error during deletion' },
      { status: 500 }
    );
  }
}
