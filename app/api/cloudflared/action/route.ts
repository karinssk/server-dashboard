
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

        // Using brew services to restart
        await execAsync('brew services restart cloudflared');

        return NextResponse.json({ success: true, message: 'Cloudflared restarted successfully' });

    } catch (error: any) {
        console.error('Cloudflared Action Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to restart Cloudflared' }, { status: 500 });
    }
}
