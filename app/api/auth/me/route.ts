import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET() {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token');

    if (!token) {
        return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const payload = await verifyToken(token.value);

    if (!payload) {
        return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({ authenticated: true, user: payload });
}
