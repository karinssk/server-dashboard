
import { NextResponse } from 'next/server';
import pm2 from 'pm2';
import fs from 'fs';
import util from 'util';

export const dynamic = 'force-dynamic';

const open = util.promisify(fs.open);
const read = util.promisify(fs.read);
const close = util.promisify(fs.close);
const stat = util.promisify(fs.stat);

async function readLastLines(filePath: string, maxLines: number): Promise<string[]> {
    if (!filePath || !fs.existsSync(filePath)) return [];

    try {
        const fileStat = await stat(filePath);
        const fileSize = fileStat.size;
        const bufferSize = 1024 * 16; // 16KB buffer
        let buffer = Buffer.alloc(bufferSize);
        let lines: string[] = [];
        let position = fileSize;
        let leftover = '';

        const fd = await open(filePath, 'r');

        while (position > 0 && lines.length < maxLines) {
            const readSize = Math.min(position, bufferSize);
            position -= readSize;

            await read(fd, buffer, 0, readSize, position);
            const chunk = buffer.toString('utf8', 0, readSize);
            const content = chunk + leftover;
            const chunkLines = content.split('\n');

            leftover = chunkLines.shift() || ''; // The first part might be incomplete

            // Reverse to process from end
            for (let i = chunkLines.length - 1; i >= 0; i--) {
                if (lines.length < maxLines && chunkLines[i].trim()) {
                    lines.unshift(chunkLines[i]);
                }
            }
        }

        await close(fd);
        return lines;
    } catch (err) {
        console.error(`Error reading file ${filePath}:`, err);
        return [];
    }
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const targetId = searchParams.get('id'); // 'all' or specific ID

    const stream = new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder();

            const sendLog = (data: any) => {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
            };

            // 1. Send Historical Logs (Tail)
            await new Promise<void>((resolve) => {
                pm2.connect(async (err) => {
                    if (err) {
                        sendLog({ type: 'error', message: err.message });
                        resolve();
                        return;
                    }

                    pm2.list(async (err, list) => {
                        if (err) {
                            sendLog({ type: 'error', message: err.message });
                            resolve();
                            return;
                        }

                        const processesToRead = list.filter((p) => {
                            if (targetId === 'all') return true;
                            return String(p.pm_id) === targetId;
                        });

                        const maxLines = targetId === 'all' ? 15 : 50;

                        for (const proc of processesToRead) {
                            const pm2_env = proc.pm2_env as any;
                            if (!pm2_env) continue;

                            const outPath = pm2_env.pm_out_log_path;
                            const errPath = pm2_env.pm_err_log_path;

                            const [outLogs, errLogs] = await Promise.all([
                                readLastLines(outPath, maxLines),
                                readLastLines(errPath, maxLines)
                            ]);

                            outLogs.forEach(msg => sendLog({
                                type: 'out',
                                timestamp: Date.now(), // Approximate
                                app_name: proc.name,
                                pm_id: proc.pm_id,
                                message: msg,
                                history: true
                            }));

                            errLogs.forEach(msg => sendLog({
                                type: 'err',
                                timestamp: Date.now(),
                                app_name: proc.name,
                                pm_id: proc.pm_id,
                                message: msg,
                                history: true
                            }));
                        }
                        resolve();
                    });
                });
            });

            // 2. Start Real-time Stream
            pm2.launchBus((err, bus) => {
                if (err) {
                    sendLog({ type: 'error', message: err.message });
                    controller.close();
                    return;
                }

                const logHandler = (type: 'out' | 'err', packet: any) => {
                    if (targetId && targetId !== 'all' && String(packet.process.pm_id) !== targetId) {
                        return;
                    }

                    sendLog({
                        type,
                        timestamp: Date.now(),
                        app_name: packet.process.name,
                        pm_id: packet.process.pm_id,
                        message: packet.data,
                    });
                };

                bus.on('log:out', (packet: any) => logHandler('out', packet));
                bus.on('log:err', (packet: any) => logHandler('err', packet));
            });
        },
    });

    return new NextResponse(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}
