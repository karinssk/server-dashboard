import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import util from 'util';
import path from 'path';
import fs from 'fs/promises';

const execAsync = util.promisify(exec);

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const { action, paths, destination, targetPath } = await request.json();

        if (!action) {
            return NextResponse.json({ error: 'Action is required' }, { status: 400 });
        }

        if (action === 'zip') {
            if (!paths || !Array.isArray(paths) || paths.length === 0 || !destination) {
                return NextResponse.json({ error: 'Paths and destination are required for zip' }, { status: 400 });
            }

            // Construct zip command
            // zip -r /path/to/dest.zip file1 file2 dir1 ...
            // We need to be careful with CWD. It's better to cd into the directory of the files first
            // so the zip structure is relative.

            const parentDir = path.dirname(paths[0]);
            const fileNames = paths.map(p => path.basename(p)).map(n => `"${n}"`).join(' ');
            const zipName = path.basename(destination);

            // Command: cd /parent/dir && zip -r /full/path/to/dest.zip file1 file2
            const command = `cd "${parentDir}" && zip -r "${destination}" ${fileNames}`;

            await execAsync(command);

            return NextResponse.json({ success: true, message: 'Archive created successfully' });
        }

        if (action === 'unzip') {
            if (!targetPath) {
                return NextResponse.json({ error: 'Target path is required for unzip' }, { status: 400 });
            }

            // Default destination is the same directory as the zip file
            const destDir = destination || path.dirname(targetPath);

            // Command: unzip /path/to/file.zip -d /path/to/dest
            const command = `unzip "${targetPath}" -d "${destDir}"`;

            await execAsync(command);

            return NextResponse.json({ success: true, message: 'Archive extracted successfully' });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error: any) {
        console.error('Archive Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to perform archive operation' }, { status: 500 });
    }
}
