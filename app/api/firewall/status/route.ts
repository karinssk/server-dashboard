import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);

export const dynamic = 'force-dynamic';

interface FirewallRule {
    to: string;
    action: string;
    from: string;
    ipv6: boolean;
}

export async function GET() {
    try {
        // Check if ufw exists
        try {
            await execAsync('which ufw');
        } catch (e) {
            // Mock data for development on non-Linux systems
            if (process.platform !== 'linux') {
                return NextResponse.json({
                    status: 'active',
                    rules: [
                        { to: '22/tcp', action: 'ALLOW', from: 'Anywhere', ipv6: false },
                        { to: '80/tcp', action: 'ALLOW', from: 'Anywhere', ipv6: false },
                        { to: '443/tcp', action: 'ALLOW', from: 'Anywhere', ipv6: false },
                        { to: '22/tcp', action: 'ALLOW', from: 'Anywhere (v6)', ipv6: true },
                    ]
                });
            }
            return NextResponse.json({ error: 'UFW not installed' }, { status: 500 });
        }

        const { stdout } = await execAsync('sudo ufw status numbered');

        // Parse output
        // Status: active
        //
        //      To                         Action      From
        //      --                         ------      ----
        // [ 1] 22/tcp                     ALLOW IN    Anywhere
        // [ 2] 80/tcp                     ALLOW IN    Anywhere

        const lines = stdout.split('\n');
        const statusLine = lines.find(l => l.toLowerCase().startsWith('status:'));
        const status = statusLine ? statusLine.split(':')[1].trim() : 'unknown';

        const rules: FirewallRule[] = [];
        let parsingRules = false;

        for (const line of lines) {
            if (line.trim().startsWith('--')) {
                parsingRules = true;
                continue;
            }
            if (!parsingRules) continue;
            if (line.trim() === '') continue;

            // [ 1] 22/tcp                     ALLOW IN    Anywhere
            const match = line.match(/\[\s*(\d+)\]\s+(.*?)\s+(ALLOW|DENY|REJECT|LIMIT)(?:\s+IN)?\s+(.*)/i);
            if (match) {
                const to = match[2].trim();
                const action = match[3].toUpperCase();
                const from = match[4].trim();
                const ipv6 = from.includes('(v6)');

                rules.push({ to, action, from, ipv6 });
            }
        }

        return NextResponse.json({ status, rules });

    } catch (error: any) {
        console.error('Firewall Status Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to get firewall status' }, { status: 500 });
    }
}
