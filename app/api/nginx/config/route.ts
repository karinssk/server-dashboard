
import { NextResponse } from 'next/server';
import fs from 'fs';
import util from 'util';

export const dynamic = 'force-dynamic';

const readFile = util.promisify(fs.readFile);
const stat = util.promisify(fs.stat);

export async function GET() {
    try {
        const commonPaths = [
            '/opt/homebrew/etc/nginx/nginx.conf',
            '/usr/local/etc/nginx/nginx.conf',
            '/etc/nginx/nginx.conf'
        ];

        let configPath = '';
        for (const p of commonPaths) {
            try {
                await stat(p);
                configPath = p;
                break;
            } catch (e) {
                // ignore
            }
        }

        if (!configPath) {
            return NextResponse.json({ error: 'Configuration file not found' }, { status: 404 });
        }

        const content = await readFile(configPath, 'utf-8');

        return NextResponse.json({
            path: configPath,
            content
        });

    } catch (error: any) {
        console.error('Nginx Config Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to read Nginx config' }, { status: 500 });
    }
}
