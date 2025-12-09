import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const { action, path: targetPath, newPath } = await request.json();

        if (!action || !targetPath) {
            return NextResponse.json({ error: 'Action and path are required' }, { status: 400 });
        }

        switch (action) {
            case 'delete':
                const stats = await fs.stat(targetPath);
                if (stats.isDirectory()) {
                    await fs.rm(targetPath, { recursive: true, force: true });
                } else {
                    await fs.unlink(targetPath);
                }
                break;

            case 'rename':
                if (!newPath) {
                    return NextResponse.json({ error: 'New path is required for rename' }, { status: 400 });
                }
                await fs.rename(targetPath, newPath);
                break;

            case 'mkdir':
                await fs.mkdir(targetPath, { recursive: true });
                break;

            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

        return NextResponse.json({ success: true, message: `Action ${action} completed successfully` });

    } catch (error: any) {
        console.error('File Action Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to perform action' }, { status: 500 });
    }
}
