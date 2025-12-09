import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import util from 'util';

export const dynamic = 'force-dynamic';

const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const unlink = util.promisify(fs.unlink);
const mkdir = util.promisify(fs.mkdir);

const getSitesPath = async () => {
    const isLinux = process.platform === 'linux';
    let sitesPath = '/etc/apache2/sites-available';

    if (!isLinux) {
        sitesPath = path.join(process.cwd(), 'mock_apache_sites');
        if (!fs.existsSync(sitesPath)) {
            await mkdir(sitesPath, { recursive: true });
        }
    }
    return sitesPath;
};

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const name = searchParams.get('name');

        if (!name) {
            return NextResponse.json({ error: 'Site name is required' }, { status: 400 });
        }

        // Basic sanitization
        if (name.includes('..') || name.includes('/') || name.includes('\\')) {
            return NextResponse.json({ error: 'Invalid site name' }, { status: 400 });
        }

        const sitesPath = await getSitesPath();
        const filePath = path.join(sitesPath, name);

        if (!fs.existsSync(filePath)) {
            return NextResponse.json({ error: 'Site not found' }, { status: 404 });
        }

        const content = await readFile(filePath, 'utf-8');
        return NextResponse.json({ content });

    } catch (error: any) {
        console.error('Apache Site Read Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to read site' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { name, content } = await request.json();

        if (!name || !content) {
            return NextResponse.json({ error: 'Name and content are required' }, { status: 400 });
        }

        if (name.includes('..') || name.includes('/') || name.includes('\\')) {
            return NextResponse.json({ error: 'Invalid site name' }, { status: 400 });
        }

        const sitesPath = await getSitesPath();
        const filePath = path.join(sitesPath, name);

        await writeFile(filePath, content, 'utf-8');

        return NextResponse.json({ success: true, message: 'Site saved successfully' });

    } catch (error: any) {
        console.error('Apache Site Save Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to save site' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const name = searchParams.get('name');

        if (!name) {
            return NextResponse.json({ error: 'Site name is required' }, { status: 400 });
        }

        if (name.includes('..') || name.includes('/') || name.includes('\\')) {
            return NextResponse.json({ error: 'Invalid site name' }, { status: 400 });
        }

        const sitesPath = await getSitesPath();
        const filePath = path.join(sitesPath, name);

        if (fs.existsSync(filePath)) {
            await unlink(filePath);
        }

        return NextResponse.json({ success: true, message: 'Site deleted successfully' });

    } catch (error: any) {
        console.error('Apache Site Delete Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to delete site' }, { status: 500 });
    }
}
