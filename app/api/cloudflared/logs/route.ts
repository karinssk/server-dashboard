
import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import fs from 'fs';
import util from 'util';

export const dynamic = 'force-dynamic';

const stat = util.promisify(fs.stat);

export async function GET(request: Request) {
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        start(controller) {
            const isLinux = process.platform === 'linux';
            let logProcess: any;

            if (isLinux) {
                // Use journalctl to stream logs
                logProcess = spawn('sudo', ['journalctl', '-u', 'cloudflared', '-f', '-n', '100', '-o', 'json']);
            } else {
                // macOS/Dev: Try to tail log file or mock
                const commonPaths = [
                    '/opt/homebrew/var/log/cloudflared.log',
                    '/usr/local/var/log/cloudflared.log',
                    '/var/log/cloudflared.log',
                    '/tmp/cloudflared.log'
                ];

                let logPath = '';
                for (const p of commonPaths) {
                    try {
                        if (fs.existsSync(p)) {
                            logPath = p;
                            break;
                        }
                    } catch (e) { }
                }

                if (logPath) {
                    logProcess = spawn('tail', ['-f', '-n', '100', logPath]);
                } else {
                    // Mock logs if no file found
                    const sendMockLog = () => {
                        const mockLog = {
                            timestamp: Date.now(),
                            message: `[${new Date().toISOString()}] INF Connection established tunnelID=${crypto.randomUUID()}`,
                            service: 'cloudflared',
                            priority: '6'
                        };
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify(mockLog)}\n\n`));
                    };
                    const interval = setInterval(sendMockLog, 2000);
                    request.signal.addEventListener('abort', () => clearInterval(interval));
                    return;
                }
            }

            logProcess.stdout.on('data', (data: Buffer) => {
                const lines = data.toString().split('\n');
                lines.forEach(line => {
                    if (!line.trim()) return;
                    try {
                        if (isLinux) {
                            const logEntry = JSON.parse(line);
                            const formattedLog = {
                                timestamp: parseInt(logEntry.__REALTIME_TIMESTAMP) / 1000 || Date.now(),
                                message: logEntry.MESSAGE,
                                service: logEntry._SYSTEMD_UNIT || 'cloudflared',
                                priority: logEntry.PRIORITY || '6'
                            };
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify(formattedLog)}\n\n`));
                        } else {
                            // Raw text log from tail
                            const rawLog = {
                                timestamp: Date.now(),
                                message: line,
                                service: 'cloudflared',
                                priority: '6'
                            };
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify(rawLog)}\n\n`));
                        }
                    } catch (e) {
                        // Fallback for non-JSON lines
                        const rawLog = {
                            timestamp: Date.now(),
                            message: line,
                            service: 'cloudflared',
                            priority: '6'
                        };
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify(rawLog)}\n\n`));
                    }
                });
            });

            logProcess.stderr.on('data', (data: Buffer) => {
                // console.error(`Log Error: ${data}`);
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
