
import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import util from 'util';

export const dynamic = 'force-dynamic';

const execAsync = util.promisify(exec);

export async function GET() {
    try {
        const isLinux = process.platform === 'linux';
        const services = [];

        if (isLinux) {
            // Debian 12: Use systemctl to find php-fpm services
            const { stdout } = await execAsync('systemctl list-units --type=service --all --no-pager --plain | grep "php.*-fpm"');
            const lines = stdout.split('\n').filter(Boolean);

            for (const line of lines) {
                // Example line: php8.2-fpm.service loaded active running The PHP 8.2 FastCGI Process Manager
                const parts = line.trim().split(/\s+/);
                const fullName = parts[0]; // php8.2-fpm.service
                const name = fullName.replace('.service', '');
                const activeState = parts[2]; // active/inactive
                const subState = parts[3]; // running/dead

                services.push({
                    name,
                    status: activeState === 'active' && subState === 'running' ? 'started' : 'stopped',
                    user: 'root', // systemd services usually run as root/www-data, hard to get easily here without detailed inspect
                    version: name.match(/php(\d+\.\d+)/)?.[1] || 'unknown'
                });
            }
        } else {
            // macOS: Use brew services
            const { stdout } = await execAsync('brew services list');
            const lines = stdout.split('\n').filter(Boolean);

            // Skip header line
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i];
                const parts = line.split(/\s+/);
                const name = parts[0];
                const status = parts[1];
                const user = parts[2] || '';

                if (name.startsWith('php')) {
                    services.push({
                        name,
                        status: status === 'none' ? 'stopped' : status,
                        user,
                        version: name.replace('php@', '').replace('php', '') || 'unknown'
                    });
                }
            }
        }

        return NextResponse.json(services);
    } catch (error: any) {
        console.error('PHP Services Error:', error);
        // If grep fails (exit code 1) it means no services found, which is not a 500 error
        if (error.code === 1 && error.cmd?.includes('grep')) {
            return NextResponse.json([]);
        }
        return NextResponse.json({ error: error.message || 'Failed to fetch services' }, { status: 500 });
    }
}
