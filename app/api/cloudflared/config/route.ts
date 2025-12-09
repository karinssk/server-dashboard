
import { NextResponse } from 'next/server';
import fs from 'fs';
import util from 'util';
import yaml from 'js-yaml';

export const dynamic = 'force-dynamic';

const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const stat = util.promisify(fs.stat);

const CONFIG_PATH = '/etc/cloudflared/config.yml';

export async function GET() {
    try {
        // Check if file exists
        try {
            await stat(CONFIG_PATH);
        } catch (e) {
            return NextResponse.json({ error: 'Config file not found', path: CONFIG_PATH }, { status: 404 });
        }

        const content = await readFile(CONFIG_PATH, 'utf-8');
        const config = yaml.load(content);

        return NextResponse.json({
            path: CONFIG_PATH,
            config
        });

    } catch (error: any) {
        console.error('Cloudflared Config Read Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to read config' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { config } = await request.json();

        if (!config) {
            return NextResponse.json({ error: 'Missing config data' }, { status: 400 });
        }

        const yamlStr = yaml.dump(config);

        // Attempt to write. This might fail if permissions are not set.
        // In a real scenario, we might need a privileged helper or sudo.
        // For now, we assume the user has made the file writable or we are running as root.
        await writeFile(CONFIG_PATH, yamlStr, 'utf-8');

        return NextResponse.json({ success: true, message: 'Config saved successfully' });

    } catch (error: any) {
        console.error('Cloudflared Config Write Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to save config' }, { status: 500 });
    }
}
