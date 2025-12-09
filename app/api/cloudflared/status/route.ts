
import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import util from 'util';
import fs from 'fs';

export const dynamic = 'force-dynamic';

const execAsync = util.promisify(exec);
const stat = util.promisify(fs.stat);

export async function GET() {
    try {
        // Check for executable
        let path = '';
        const commonPaths = ['/opt/homebrew/bin/cloudflared', '/usr/local/bin/cloudflared'];

        for (const p of commonPaths) {
            try {
                await stat(p);
                path = p;
                break;
            } catch (e) {
                // ignore
            }
        }

        if (!path) {
            // Try 'which cloudflared'
            try {
                const { stdout } = await execAsync('which cloudflared');
                path = stdout.trim();
            } catch (e) {
                // ignore
            }
        }

        if (!path) {
            return NextResponse.json({ installed: false });
        }

        // Get Version
        let version = 'Unknown';
        try {
            const { stdout } = await execAsync(`${path} --version`);
            // cloudflared version 2024.4.1 (built 2024-04-17-1715)
            version = stdout.trim();
        } catch (e) {
            // ignore
        }

        // Check Status (brew services or ps)
        let running = false;
        try {
            const { stdout } = await execAsync('ps aux | grep cloudflared | grep -v grep');
            if (stdout.trim()) {
                running = true;
            }
        } catch (e) {
            // ignore
        }

        return NextResponse.json({
            installed: true,
            path,
            version,
            running
        });

    } catch (error: any) {
        console.error('Cloudflared Status Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to check Cloudflared status' }, { status: 500 });
    }
}
