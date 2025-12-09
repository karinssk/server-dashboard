import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import util from 'util';

export const dynamic = 'force-dynamic';

const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const unlink = util.promisify(fs.unlink);

const getSitesPath = () => {
    if (process.platform === 'linux') {
        return '/etc/nginx/sites-available';
    }
    return path.join(process.cwd(), 'mock_nginx_sites');
};

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');

    if (!name) {
        return NextResponse.json({ error: 'Site name is required' }, { status: 400 });
    }

    // Security: Prevent directory traversal
    if (name.includes('..') || name.includes('/')) {
        return NextResponse.json({ error: 'Invalid site name' }, { status: 400 });
    }

    const filePath = path.join(getSitesPath(), name);

    try {
        if (!fs.existsSync(filePath)) {
            return NextResponse.json({ error: 'Site not found' }, { status: 404 });
        }
        const content = await readFile(filePath, 'utf-8');
        return NextResponse.json({ content });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { name, content } = await request.json();

        if (!name || content === undefined) {
            return NextResponse.json({ error: 'Name and content are required' }, { status: 400 });
        }

        if (name.includes('..') || name.includes('/')) {
            return NextResponse.json({ error: 'Invalid site name' }, { status: 400 });
        }

        const filePath = path.join(getSitesPath(), name);
        await writeFile(filePath, content, 'utf-8');

        return NextResponse.json({ success: true, message: 'Site saved successfully' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');

    if (!name) {
        return NextResponse.json({ error: 'Site name is required' }, { status: 400 });
    }

    if (name.includes('..') || name.includes('/')) {
        return NextResponse.json({ error: 'Invalid site name' }, { status: 400 });
    }

    const filePath = path.join(getSitesPath(), name);

    try {
        if (!fs.existsSync(filePath)) {
            return NextResponse.json({ error: 'Site not found' }, { status: 404 });
        }
        await unlink(filePath);
        return NextResponse.json({ success: true, message: 'Site deleted successfully' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
