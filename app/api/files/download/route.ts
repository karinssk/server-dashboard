import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import { createReadStream } from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('path');

    if (!filePath) {
        return NextResponse.json({ error: 'Path is required' }, { status: 400 });
    }

    try {
        const stats = await fs.stat(filePath);
        if (!stats.isFile()) {
            return NextResponse.json({ error: 'Not a file' }, { status: 400 });
        }

        // Create a readable stream
        const stream = createReadStream(filePath);

        // @ts-ignore - NextResponse supports streams but types might be strict
        return new NextResponse(stream, {
            headers: {
                'Content-Disposition': `attachment; filename="${path.basename(filePath)}"`,
                'Content-Type': 'application/octet-stream',
                'Content-Length': stats.size.toString(),
            },
        });

    } catch (error: any) {
        console.error('Download Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to download file' }, { status: 500 });
    }
}
