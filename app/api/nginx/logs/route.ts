import { NextResponse } from 'next/server';
import { spawn } from 'child_process';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const stream = new ReadableStream({
        start(controller) {
            const encoder = new TextEncoder();

            const sendLog = (data: any) => {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
            };

            const isLinux = process.platform === 'linux';
            let journal: any;

            if (isLinux) {
                // Debian: Use journalctl for nginx unit
                const args = ['--no-pager', '-f', '-n', '100', '-o', 'json', '-u', 'nginx'];
                journal = spawn('journalctl', args);
            } else {
                // macOS: Mock logs
                const interval = setInterval(() => {
                    sendLog({
                        timestamp: Date.now(),
                        message: `[Mock Nginx] Access log entry ${new Date().toISOString()}`,
                        service: 'nginx',
                        priority: '6'
                    });
                }, 2000);
                return () => clearInterval(interval);
            }

            if (journal) {
                journal.stdout.on('data', (data: Buffer) => {
                    const lines = data.toString().split('\n');
                    lines.forEach(line => {
                        if (!line.trim()) return;
                        try {
                            const entry = JSON.parse(line);
                            sendLog({
                                timestamp: parseInt(entry.__REALTIME_TIMESTAMP) / 1000,
                                message: entry.MESSAGE,
                                service: 'nginx',
                                priority: entry.PRIORITY
                            });
                        } catch (e) {
                            sendLog({
                                timestamp: Date.now(),
                                message: line,
                                service: 'nginx',
                                priority: '6'
                            });
                        }
                    });
                });

                journal.stderr.on('data', (data: Buffer) => {
                    console.error('Journalctl error:', data.toString());
                });

                journal.on('close', (code: number) => {
                    console.log(`Journalctl exited with code ${code}`);
                    controller.close();
                });
            }
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
