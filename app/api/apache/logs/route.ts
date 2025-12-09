import { NextResponse } from 'next/server';
import { spawn } from 'child_process';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        start(controller) {
            const isLinux = process.platform === 'linux';
            let logProcess: any;

            if (isLinux) {
                // Use journalctl to stream logs
                logProcess = spawn('sudo', ['journalctl', '-u', 'apache2', '-f', '-n', '100', '-o', 'json']);
            } else {
                // Mock logs for macOS/dev
                const sendMockLog = () => {
                    const mockLog = {
                        timestamp: Date.now(),
                        message: `[${new Date().toISOString()}] "GET / HTTP/1.1" 200 1234 "-" "Mozilla/5.0"`,
                        service: 'apache2',
                        priority: '6'
                    };
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(mockLog)}\n\n`));
                };

                const interval = setInterval(sendMockLog, 2000);

                request.signal.addEventListener('abort', () => {
                    clearInterval(interval);
                    controller.close();
                });
                return;
            }

            logProcess.stdout.on('data', (data: Buffer) => {
                const lines = data.toString().split('\n');
                lines.forEach(line => {
                    if (!line.trim()) return;
                    try {
                        const logEntry = JSON.parse(line);
                        const formattedLog = {
                            timestamp: parseInt(logEntry.__REALTIME_TIMESTAMP) / 1000 || Date.now(),
                            message: logEntry.MESSAGE,
                            service: logEntry._SYSTEMD_UNIT || 'apache2',
                            priority: logEntry.PRIORITY || '6'
                        };
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify(formattedLog)}\n\n`));
                    } catch (e) {
                        // If not JSON, send as raw message
                        const rawLog = {
                            timestamp: Date.now(),
                            message: line,
                            service: 'apache2',
                            priority: '6'
                        };
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify(rawLog)}\n\n`));
                    }
                });
            });

            logProcess.stderr.on('data', (data: Buffer) => {
                console.error(`Log Error: ${data}`);
            });

            logProcess.on('close', () => {
                controller.close();
            });

            request.signal.addEventListener('abort', () => {
                logProcess.kill();
            });
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
