import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import util from 'util';

export const dynamic = 'force-dynamic';

const execAsync = util.promisify(exec);

export async function POST(request: Request) {
    try {
        const { action } = await request.json();

        if (action !== 'restart') {
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

        const isLinux = process.platform === 'linux';
        // systemctl for Linux, brew for macOS
        const command = isLinux ? 'sudo systemctl restart apache2' : 'brew services restart httpd';

        await execAsync(command);

        return NextResponse.json({ success: true, message: 'Apache restarted successfully' });

    } catch (error: any) {
        console.error('Apache Action Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to restart Apache' }, { status: 500 });
    }
}
