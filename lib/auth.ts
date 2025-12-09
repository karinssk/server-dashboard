import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { SignJWT, jwtVerify } from 'jose';

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key-change-me';

export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

export async function signToken(payload: any): Promise<string> {
    const secret = new TextEncoder().encode(JWT_SECRET);
    return new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('14d')
        .sign(secret);
}

export async function verifyToken(token: string): Promise<any> {
    try {
        const secret = new TextEncoder().encode(JWT_SECRET);
        const { payload } = await jwtVerify(token, secret);
        return payload;
    } catch (error) {
        return null;
    }
}
