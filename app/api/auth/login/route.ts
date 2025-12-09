import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyPassword, signToken } from '@/lib/auth';
import { serialize } from 'cookie';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { username, password, remember } = body;

        if (!username || !password) {
            return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
        }

        const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
        const users = rows as any[];

        if (users.length === 0) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        const user = users[0];
        const isValid = await verifyPassword(password, user.password);

        if (!isValid) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        // Token expiration: 14 days if remember me, else 1 day (or session)
        // The requirement says "expire in 14 day if not logout", implying remember me is default or always on?
        // "have remember function expire in 14 day if not logout"
        // I'll assume it's always 14 days for now based on the prompt "have remember function expire in 14 day".

        const token = await signToken({ id: user.id, username: user.username });

        const cookie = serialize('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 60 * 60 * 24 * 14, // 14 days
            path: '/',
        });

        const response = NextResponse.json({ success: true });
        response.headers.set('Set-Cookie', cookie);

        return response;
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
