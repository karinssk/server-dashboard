
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
        const commonPaths = ['/opt/homebrew/bin/httpd', '/usr/sbin/httpd', '/usr/local/bin/httpd'];

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
            // Try 'which httpd' or 'which apachectl'
            try {
                const { stdout } = await execAsync('which httpd');
                path = stdout.trim();
            } catch (e) {
                try {
                    const { stdout } = await execAsync('which apachectl');
                    path = stdout.trim();
                } catch (e2) {
                    // ignore
                }
            }
        }

        if (!path) {
            return NextResponse.json({ installed: false });
        }

        // Get Version
        let version = 'Unknown';
        try {
            const { stdout } = await execAsync(`${path} -v`);
            // Server version: Apache/2.4.58 (Unix)
            version = stdout.trim();
        } catch (e) {
            // ignore
        }

        // Check Status (brew services or ps)
        let running = false;
        try {
            const { stdout } = await execAsync('ps aux | grep httpd | grep -v grep');
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
        console.error('Apache Status Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to check Apache status' }, { status: 500 });
    }
}
