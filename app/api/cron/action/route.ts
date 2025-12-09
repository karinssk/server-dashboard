import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import util from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const execAsync = util.promisify(exec);

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const { action, job, index } = await request.json();

        // 1. Get current crontab
        let currentLines: string[] = [];
        try {
            const { stdout } = await execAsync('crontab -l');
            currentLines = stdout.split('\n').filter(line => line.trim() !== '');
        } catch (error: any) {
            if (error.code !== 1 || !error.stderr.includes('no crontab')) {
                throw error;
            }
            // If no crontab, currentLines is empty
        }

        // 2. Modify lines based on action
        if (action === 'add') {
            if (!job || !job.schedule || !job.command) {
                return NextResponse.json({ error: 'Schedule and command are required' }, { status: 400 });
            }
            currentLines.push(`${job.schedule} ${job.command}`);
        } else if (action === 'update') {
            if (index === undefined || index < 0 || index >= currentLines.length) {
                return NextResponse.json({ error: 'Invalid index' }, { status: 400 });
            }
            if (!job || !job.schedule || !job.command) {
                return NextResponse.json({ error: 'Schedule and command are required' }, { status: 400 });
            }

            // We need to map the "clean" index back to the real lines including comments?
            // For simplicity, our list API filtered out comments. 
            // If we want to support preserving comments, we need a more robust parser.
            // For now, let's assume we are rewriting the whole file based on the "clean" list + new job.
            // BUT, rewriting the whole file drops comments.
            // Let's stick to the "filtered" view for now. If the user has comments, they might be lost.
            // A better approach for "update" by index is to find the Nth non-comment line.

            let nonCommentIndex = 0;
            for (let i = 0; i < currentLines.length; i++) {
                if (!currentLines[i].trim().startsWith('#')) {
                    if (nonCommentIndex === index) {
                        currentLines[i] = `${job.schedule} ${job.command}`;
                        break;
                    }
                    nonCommentIndex++;
                }
            }

        } else if (action === 'delete') {
            if (index === undefined || index < 0) {
                return NextResponse.json({ error: 'Invalid index' }, { status: 400 });
            }

            let nonCommentIndex = 0;
            for (let i = 0; i < currentLines.length; i++) {
                if (!currentLines[i].trim().startsWith('#')) {
                    if (nonCommentIndex === index) {
                        currentLines.splice(i, 1);
                        break;
                    }
                    nonCommentIndex++;
                }
            }
        } else {
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

        // 3. Write to temp file
        const tempPath = path.join(os.tmpdir(), `crontab-${Date.now()}`);
        // Ensure newline at end
        await fs.writeFile(tempPath, currentLines.join('\n') + '\n');

        // 4. Install new crontab
        await execAsync(`crontab "${tempPath}"`);

        // 5. Cleanup
        await fs.unlink(tempPath);

        return NextResponse.json({ success: true, message: 'Cron jobs updated successfully' });

    } catch (error: any) {
        console.error('Cron Action Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to update cron jobs' }, { status: 500 });
    }
}
