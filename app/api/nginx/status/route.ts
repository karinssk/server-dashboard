
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
        const commonPaths = ['/opt/homebrew/bin/nginx', '/usr/local/bin/nginx', '/usr/sbin/nginx'];

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
            // Try 'which nginx'
            try {
                const { stdout } = await execAsync('which nginx');
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
            const { stderr } = await execAsync(`${path} -v`);
            // nginx -v output is usually to stderr: "nginx version: nginx/1.27.0"
            version = stderr.trim();
        } catch (e) {
            // ignore
        }

        // Check Status (brew services or ps)
        let running = false;
        try {
            const { stdout } = await execAsync('ps aux | grep nginx | grep -v grep');
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
        console.error('Nginx Status Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to check Nginx status' }, { status: 500 });
    }
}
