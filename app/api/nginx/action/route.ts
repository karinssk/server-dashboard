
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
        const command = isLinux ? 'sudo systemctl restart nginx' : 'brew services restart nginx';

        await execAsync(command);

        return NextResponse.json({ success: true, message: 'Nginx restarted successfully' });

    } catch (error: any) {
        console.error('Nginx Action Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to restart Nginx' }, { status: 500 });
    }
}
