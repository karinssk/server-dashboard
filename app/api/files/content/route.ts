import { NextResponse } from 'next/server';
import fs from 'fs/promises';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('path');

    if (!filePath) {
        return NextResponse.json({ error: 'Path is required' }, { status: 400 });
    }

    try {
        const content = await fs.readFile(filePath, 'utf-8');
        return NextResponse.json({ content });
    } catch (error: any) {
        console.error('File Read Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to read file' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { path: filePath, content } = await request.json();

        if (!filePath || content === undefined) {
            return NextResponse.json({ error: 'Path and content are required' }, { status: 400 });
        }

        await fs.writeFile(filePath, content, 'utf-8');
        return NextResponse.json({ success: true, message: 'File saved successfully' });

    } catch (error: any) {
        console.error('File Write Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to save file' }, { status: 500 });
    }
}
