import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const targetPath = formData.get('path') as string;

        if (!file || !targetPath) {
            return NextResponse.json({ error: 'File and path are required' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const filePath = path.join(targetPath, file.name);

        await fs.writeFile(filePath, buffer);

        return NextResponse.json({ success: true, message: 'File uploaded successfully' });

    } catch (error: any) {
        console.error('Upload Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to upload file' }, { status: 500 });
    }
}
