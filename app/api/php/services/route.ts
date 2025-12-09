
import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import util from 'util';

export const dynamic = 'force-dynamic';

const execAsync = util.promisify(exec);

export async function GET() {
    try {
        // Try to get JSON output first, if fails, fallback to text parsing? 
        // Actually, let's just parse the text output we saw earlier as it's reliable enough for simple columns.
        // "Name    Status User File"
        const { stdout } = await execAsync('brew services list');

        const lines = stdout.split('\n').filter(Boolean);
        const services = [];

        // Skip header line
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            const parts = line.split(/\s+/); // Split by whitespace

            // parts[0] = Name, parts[1] = Status, parts[2] = User (optional), parts[3] = File (optional)
            const name = parts[0];
            const status = parts[1];
            const user = parts[2] || '';

            if (name.startsWith('php')) {
                services.push({
                    name,
                    status: status === 'none' ? 'stopped' : status, // 'none' usually means stopped/not running
                    user
                });
            }
        }

        return NextResponse.json(services);
    } catch (error: any) {
        console.error('PHP Services Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to fetch services' }, { status: 500 });
    }
}
