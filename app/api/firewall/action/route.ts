import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const { action, port, protocol, rule } = await request.json();

        // Check if ufw exists
        try {
            await execAsync('which ufw');
        } catch (e) {
            if (process.platform !== 'linux') {
                // Mock success for dev
                return NextResponse.json({ success: true, message: `Mock: Action ${action} executed` });
            }
            return NextResponse.json({ error: 'UFW not installed' }, { status: 500 });
        }

        let command = '';

        switch (action) {
            case 'enable':
                command = 'sudo ufw --force enable';
                break;
            case 'disable':
                command = 'sudo ufw disable';
                break;
            case 'allow':
                if (!port) return NextResponse.json({ error: 'Port is required' }, { status: 400 });
                command = `sudo ufw allow ${port}${protocol ? '/' + protocol : ''}`;
                break;
            case 'deny':
                if (!port) return NextResponse.json({ error: 'Port is required' }, { status: 400 });
                command = `sudo ufw deny ${port}${protocol ? '/' + protocol : ''}`;
                break;
            case 'delete':
                // Delete by rule content is safer than by number
                // e.g. sudo ufw delete allow 80/tcp
                if (!rule || !rule.to || !rule.action) return NextResponse.json({ error: 'Rule details required' }, { status: 400 });
                // rule.action is "ALLOW", command needs "allow"
                // rule.to is "80/tcp"
                command = `sudo ufw delete ${rule.action.toLowerCase()} ${rule.to}`;
                break;
            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

        await execAsync(command);

        return NextResponse.json({ success: true, message: 'Firewall updated successfully' });

    } catch (error: any) {
        console.error('Firewall Action Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to update firewall' }, { status: 500 });
    }
}
