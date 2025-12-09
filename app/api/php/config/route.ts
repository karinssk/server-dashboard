import { NextResponse } from 'next/server';
import fs from 'fs';
import util from 'util';
import { exec } from 'child_process';

export const dynamic = 'force-dynamic';

const readFile = util.promisify(fs.readFile);
const execAsync = util.promisify(exec);

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const version = searchParams.get('version');

        if (!version) {
            return NextResponse.json({ error: 'Missing version' }, { status: 400 });
        }

        let iniPath = '';
        const isLinux = process.platform === 'linux';

        if (isLinux) {
            // Debian: /etc/php/<version>/fpm/php.ini
            iniPath = `/etc/php/${version}/fpm/php.ini`;
        } else {
            // macOS: Use php --ini to find it (approximate for local dev)
            // This is tricky for multiple versions on macOS without full path knowledge
            // We'll try to guess based on Homebrew paths or just return current php.ini for dev
            const { stdout } = await execAsync(`php --ini | grep "Loaded Configuration File"`);
            iniPath = stdout.split(':')[1].trim();
        }

        if (!fs.existsSync(iniPath)) {
            return NextResponse.json({ error: `Config file not found at ${iniPath}` }, { status: 404 });
        }

        const content = await readFile(iniPath, 'utf-8');
        const config: Record<string, string> = {};

        // Simple parser for key values we care about
        const keysToFind = [
            'memory_limit',
            'upload_max_filesize',
            'post_max_size',
            'max_execution_time',
            'max_input_time',
            'display_errors',
            'error_reporting'
        ];

        const lines = content.split('\n');
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith(';') || !trimmed.includes('=')) continue;

            const [key, value] = trimmed.split('=').map(s => s.trim());
            if (keysToFind.includes(key)) {
                config[key] = value;
            }
        }

        return NextResponse.json({ path: iniPath, config });

    } catch (error: any) {
        console.error('PHP Config Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to fetch config' }, { status: 500 });
    }
}
