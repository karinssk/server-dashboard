import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import { createReadStream } from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('path');
    const isPreview = searchParams.get('preview') === 'true';

    if (!filePath) {
        return NextResponse.json({ error: 'Path is required' }, { status: 400 });
    }

    try {
        const stats = await fs.stat(filePath);
        if (!stats.isFile()) {
            return NextResponse.json({ error: 'Not a file' }, { status: 400 });
        }

        // Determine Content-Type
        const ext = path.extname(filePath).toLowerCase();
        let contentType = 'application/octet-stream';

        const mimeTypes: Record<string, string> = {
            '.html': 'text/html',
            '.css': 'text/css',
            '.js': 'text/javascript',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml',
            '.webp': 'image/webp',
            '.mp4': 'video/mp4',
            '.webm': 'video/webm',
            '.txt': 'text/plain',
            '.pdf': 'application/pdf',
        };

        if (mimeTypes[ext]) {
            contentType = mimeTypes[ext];
        }

        // Create a readable stream
        const stream = createReadStream(filePath);

        // @ts-ignore - NextResponse supports streams but types might be strict
        return new NextResponse(stream, {
            headers: {
                'Content-Disposition': isPreview
                    ? 'inline'
                    : `attachment; filename="${path.basename(filePath)}"`,
                'Content-Type': contentType,
                'Content-Length': stats.size.toString(),
            },
        });

    } catch (error: any) {
        console.error('Download Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to download file' }, { status: 500 });
    }
}
