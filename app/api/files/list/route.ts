import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const dirPath = searchParams.get('path') || '/';

    try {
        const stats = await fs.stat(dirPath);
        if (!stats.isDirectory()) {
            return NextResponse.json({ error: 'Path is not a directory' }, { status: 400 });
        }

        const entries = await fs.readdir(dirPath, { withFileTypes: true });

        const items = await Promise.all(entries.map(async (entry) => {
            const fullPath = path.join(dirPath, entry.name);
            let details = { size: 0, modified: new Date(), isDirectory: entry.isDirectory() };

            try {
                // We need to stat again to get size and time, readdir only gives type
                const entryStats = await fs.stat(fullPath);
                details.size = entryStats.size;
                details.modified = entryStats.mtime;
                details.isDirectory = entryStats.isDirectory();
            } catch (e) {
                // Ignore stat errors (e.g. permission denied on specific file)
            }

            return {
                name: entry.name,
                path: fullPath,
                type: details.isDirectory ? 'directory' : 'file',
                size: details.size,
                modified: details.modified,
            };
        }));

        // Sort: Directories first, then files. Alphabetical within groups.
        items.sort((a, b) => {
            if (a.type === b.type) {
                return a.name.localeCompare(b.name);
            }
            return a.type === 'directory' ? -1 : 1;
        });

        return NextResponse.json({
            path: dirPath,
            items,
            separator: path.sep,
            os: process.platform
        });

    } catch (error: any) {
        console.error('File List Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to list directory' }, { status: 500 });
    }
}
