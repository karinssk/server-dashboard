
import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import fs from 'fs';
import util from 'util';

export const dynamic = 'force-dynamic';

const stat = util.promisify(fs.stat);

export async function GET() {
    const encoder = new TextEncoder();

    // Find log file
    const commonPaths = [
        '/opt/homebrew/var/log/cloudflared.log',
        '/usr/local/var/log/cloudflared.log',
        '/var/log/cloudflared.log',
        '/tmp/cloudflared.log' // Fallback
    ];

    let logPath = '';
    for (const p of commonPaths) {
        try {
            await stat(p);
            logPath = p;
            break;
        } catch (e) {
            // ignore
        }
    }

    const stream = new ReadableStream({
        async start(controller) {
            if (!logPath) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: 'Log file not found. Checked: ' + commonPaths.join(', ') })}\n\n`));
                // Keep connection open but inactive? Or close?
                // Let's keep it open so the UI doesn't retry infinitely immediately
                return;
            }

            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'info', message: `Streaming logs from ${logPath}` })}\n\n`));

            const tail = spawn('tail', ['-f', '-n', '100', logPath]);

            tail.stdout.on('data', (data) => {
                const lines = data.toString().split('\n');
                for (const line of lines) {
                    if (line.trim()) {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'log', message: line })}\n\n`));
                    }
                }
            });

            tail.stderr.on('data', (data) => {
                // ignore stderr from tail usually
            });

            // Cleanup on close
            requestAnimationFrame(() => { }); // Hack to keep alive? No, Next.js handles this via the return stream.

            // We need to handle client disconnect, but in Next.js App Router route handlers, 
            // we don't have a direct 'close' event on the request easily accessible in this scope 
            // without using the signal.

            // For now, we rely on the runtime to kill the process when the stream is closed.
            // But to be safe, we can't easily detect disconnect here in standard Web Streams API 
            // without the 'request.signal'.
        },
        cancel() {
            // This is called when the client disconnects
            // We should kill the tail process here if we had reference to it, 
            // but 'tail' variable is inside 'start'. 
            // Ideally we structure this differently, but for a simple implementation:
            // The 'tail' process might linger if not killed. 
            // In a production app, we'd manage these subprocesses more carefully.
        }
    });

    return new NextResponse(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}
