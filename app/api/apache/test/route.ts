import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import util from 'util';

export const dynamic = 'force-dynamic';

const execAsync = util.promisify(exec);

export async function POST() {
    try {
        const isLinux = process.platform === 'linux';
        // apache2ctl -t on Debian/Ubuntu, httpd -t on others
        const command = isLinux ? 'sudo apache2ctl -t' : 'httpd -t';

        try {
            const { stdout, stderr } = await execAsync(command);
            return NextResponse.json({
                success: true,
                output: stdout + stderr
            });
        } catch (error: any) {
            // Command failed (config error)
            return NextResponse.json({
                success: false,
                output: error.stdout + error.stderr
            });
        }

    } catch (error: any) {
        console.error('Apache Test Error:', error);
        // Fallback for dev/mock
        if (process.platform !== 'linux') {
            return NextResponse.json({
                success: true,
                output: 'Syntax OK (Mock for macOS)'
            });
        }
        return NextResponse.json({ error: error.message || 'Failed to test configuration' }, { status: 500 });
    }
}
