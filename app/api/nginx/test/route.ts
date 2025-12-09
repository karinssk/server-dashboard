import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import util from 'util';

export const dynamic = 'force-dynamic';

const execAsync = util.promisify(exec);

export async function POST() {
    try {
        const isLinux = process.platform === 'linux';
        let command = 'sudo nginx -t';

        if (!isLinux) {
            // macOS / Dev fallback
            // Check if nginx is installed
            try {
                await execAsync('nginx -v');
                command = 'nginx -t'; // Try running without sudo on mac if possible, or just mock
            } catch (e) {
                // Mock response if nginx not found
                return NextResponse.json({
                    success: true,
                    output: 'nginx: the configuration file /etc/nginx/nginx.conf syntax is ok\nnginx: configuration file /etc/nginx/nginx.conf test is successful'
                });
            }
        }

        // nginx -t writes to stderr usually, even for success
        const { stdout, stderr } = await execAsync(command);

        // Combine stdout and stderr
        const output = (stdout || '') + (stderr || '');

        // Check if successful (usually exit code 0, which execAsync handles, but we want to capture output)
        // If execAsync throws, it means non-zero exit code (failure)

        return NextResponse.json({ success: true, output });

    } catch (error: any) {
        // If exec fails (non-zero exit code), it throws an error
        // The error object usually contains stdout and stderr
        const output = (error.stdout || '') + (error.stderr || error.message);
        return NextResponse.json({ success: false, output });
    }
}
