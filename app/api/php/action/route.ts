
import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);

export async function POST(request: Request) {
    try {
        const { service, action } = await request.json();

        if (!service || !action) {
            return NextResponse.json({ error: 'Missing service or action' }, { status: 400 });
        }

        if (!['start', 'stop', 'restart'].includes(action)) {
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

        // Sanitize service name to ensure it starts with php (security check)
        if (!service.startsWith('php')) {
            return NextResponse.json({ error: 'Invalid service name' }, { status: 400 });
        }

        const isLinux = process.platform === 'linux';

        if (isLinux) {
            // Debian 12: Use systemctl (requires sudo)
            // Note: The user running the Node.js process must have passwordless sudo for systemctl
            await execAsync(`sudo systemctl ${action} ${service}`);
        } else {
            // macOS: Use brew services
            await execAsync(`brew services ${action} ${service}`);
        }

        return NextResponse.json({ success: true, message: `Service ${service} ${action}ed` });
    } catch (error: any) {
        console.error('PHP Action Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to perform action on service' }, { status: 500 });
    }
}
