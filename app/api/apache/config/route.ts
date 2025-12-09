
import { NextResponse } from 'next/server';
import fs from 'fs';
import util from 'util';

export const dynamic = 'force-dynamic';

const readFile = util.promisify(fs.readFile);
const stat = util.promisify(fs.stat);

export async function GET() {
    try {
        const commonPaths = [
            '/opt/homebrew/etc/httpd/httpd.conf',
            '/etc/apache2/httpd.conf',
            '/private/etc/apache2/httpd.conf',
            '/usr/local/etc/httpd/httpd.conf'
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
        console.error('Apache Config Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to read Apache config' }, { status: 500 });
    }
}

const writeFile = util.promisify(fs.writeFile);

export async function POST(request: Request) {
    try {
        const { content } = await request.json();

        if (!content) {
            return NextResponse.json({ error: 'Content is required' }, { status: 400 });
        }

        const commonPaths = [
            '/opt/homebrew/etc/httpd/httpd.conf',
            '/etc/apache2/httpd.conf',
            '/private/etc/apache2/httpd.conf',
            '/usr/local/etc/httpd/httpd.conf'
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
            return NextResponse.json({ error: 'Configuration file not found to overwrite' }, { status: 404 });
        }

        await writeFile(configPath, content, 'utf-8');

        return NextResponse.json({ success: true, message: 'Configuration saved successfully' });

    } catch (error: any) {
        console.error('Apache Config Write Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to save Apache config' }, { status: 500 });
    }
}
