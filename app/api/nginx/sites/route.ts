import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import util from 'util';

export const dynamic = 'force-dynamic';

const readdir = util.promisify(fs.readdir);

export async function GET() {
    try {
        const isLinux = process.platform === 'linux';
        // Default Debian path
        let sitesPath = '/etc/nginx/sites-available';

        if (!isLinux) {
            // macOS / Dev fallback
            // We can use a temp dir or just mock it
            // For dev purposes, let's look at a local folder if it exists, or return mock data
            const localMockPath = path.join(process.cwd(), 'mock_nginx_sites');
            if (!fs.existsSync(localMockPath)) {
                fs.mkdirSync(localMockPath, { recursive: true });
                // Create a dummy file if empty
                if (fs.readdirSync(localMockPath).length === 0) {
                    fs.writeFileSync(path.join(localMockPath, 'default'), '# Default Nginx Config\nserver { listen 80; }');
                }
            }
            sitesPath = localMockPath;
        }

        if (!fs.existsSync(sitesPath)) {
            return NextResponse.json({ error: `Sites directory not found at ${sitesPath}` }, { status: 404 });
        }

        const files = await readdir(sitesPath);
        // Filter out hidden files or non-conf files if needed? 
        // Usually sites-available contains just config files, sometimes with no extension or .conf
        // Let's return all files.
        return NextResponse.json({ sites: files });

    } catch (error: any) {
        console.error('Failed to list nginx sites:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
