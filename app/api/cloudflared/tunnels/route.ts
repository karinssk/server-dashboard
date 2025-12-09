
import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import util from 'util';

export const dynamic = 'force-dynamic';

const execAsync = util.promisify(exec);

export async function GET() {
    try {
        // This command requires authentication (cloudflared login)
        const { stdout } = await execAsync('cloudflared tunnel list');

        const lines = stdout.split('\n').filter(Boolean);
        const tunnels = [];

        // Skip header lines if present (format varies, but usually has headers)
        // ID   NAME    CREATED   CONNECTIONS

        for (const line of lines) {
            // Simple heuristic to skip headers or empty lines
            if (line.includes('ID') && line.includes('NAME')) continue;
            if (line.trim() === '') continue;

            const parts = line.split(/\s+/);
            if (parts.length >= 3) {
                tunnels.push({
                    id: parts[0],
                    name: parts[1],
                    created: parts.slice(2).join(' ') // Date might have spaces
                });
            }
        }

        return NextResponse.json(tunnels);

    } catch (error: any) {
        console.error('Cloudflared Tunnels Error:', error);
        // If it fails, it might be due to no auth. Return empty list or specific error?
        // Let's return empty list but log error.
        return NextResponse.json([]);
    }
}
