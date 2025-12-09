import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import util from 'util';

export const dynamic = 'force-dynamic';

const readdir = util.promisify(fs.readdir);
const mkdir = util.promisify(fs.mkdir);

export async function GET() {
    try {
        const isLinux = process.platform === 'linux';
        // Debian/Ubuntu standard path
        let sitesPath = '/etc/apache2/sites-available';

        if (!isLinux) {
            // For macOS development, use a mock directory
            sitesPath = path.join(process.cwd(), 'mock_apache_sites');
            if (!fs.existsSync(sitesPath)) {
                await mkdir(sitesPath, { recursive: true });
                // Create a dummy site for testing
                fs.writeFileSync(path.join(sitesPath, '000-default.conf'), '<VirtualHost *:80>\n    ServerAdmin webmaster@localhost\n    DocumentRoot /var/www/html\n</VirtualHost>');
            }
        }

        if (!fs.existsSync(sitesPath)) {
            return NextResponse.json({ sites: [] });
        }

        const files = await readdir(sitesPath);
        // Filter for .conf files or just return all? Apache usually uses .conf
        const sites = files.filter(file => file.endsWith('.conf'));

        return NextResponse.json({ sites });

    } catch (error: any) {
        console.error('Apache Sites List Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to list sites' }, { status: 500 });
    }
}
