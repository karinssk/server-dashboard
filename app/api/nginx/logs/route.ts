
import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import fs from 'fs';
import util from 'util';

export const dynamic = 'force-dynamic';

const stat = util.promisify(fs.stat);

export async function GET() {
    const encoder = new TextEncoder();

    // Find log file (access.log)
    const commonPaths = [
        '/opt/homebrew/var/log/nginx/access.log',
        '/usr/local/var/log/nginx/access.log',
        '/var/log/nginx/access.log'
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
                // ignore
            });
        },
        cancel() {
            // cleanup
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
