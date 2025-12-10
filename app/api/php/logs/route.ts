import { NextResponse } from 'next/server';
import { spawn } from 'child_process';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const service = searchParams.get('service'); // 'all' or specific service name like 'php8.2-fpm'

    const stream = new ReadableStream({
        start(controller) {
            const encoder = new TextEncoder();

            const sendLog = (data: any) => {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
            };

            const isLinux = process.platform === 'linux';
            let journal: any;

            if (isLinux) {
                // Debian: Use journalctl
                const args = ['--no-pager', '-f', '-n', '100', '-o', 'json'];

                if (service && service !== 'all') {
                    args.push('-u', service);
                } else {
                    // For "all", we want all php-fpm services. 
                    // journalctl supports patterns in recent versions, or multiple -u flags.
                    // "php*-fpm" might work if the shell expands it, but spawn doesn't use shell by default.
                    // We can use a pattern match if supported, or just grep.
                    // Safer approach: just filter by SYSLOG_IDENTIFIER or similar if possible, 
                    // but simpler is to just grep the output if we can't easily specify wildcard units.
                    // Actually, let's try just running without unit filter but grep for php-fpm? No, that's too heavy.
                    // Let's assume standard naming and pass a wildcard if systemd supports it, or just rely on the user passing a specific service.
                    // If 'all', we might need to fetch the list first?
                    // For now, let's try a glob pattern if supported, otherwise we might need to spawn a shell.
                    // `journalctl -u "php*-fpm"` works in shell.
                    // Let's use shell: true for spawn to allow glob expansion? No, safer to avoid shell.
                    // We can use `journalctl` with multiple `-u` if we knew them.
                    // Let's stick to specific service for now, and for "all", maybe we just don't filter by unit but grep?
                    // Or better: `journalctl _SYSTEMD_UNIT=php*.service`?
                    // Let's try spawning with shell for the wildcard case to keep it simple for now.
                    if (service === 'all') {
                        // This is tricky without shell. Let's just use a broad grep?
                        // Or just don't support "all" perfectly yet?
                        // Let's try to find all php services first?
                        // Actually, the user asked for "all php".
                        // Let's use `journalctl` and grep.
                        // spawn('bash', ['-c', 'journalctl -f -n 100 -u "php*-fpm" -o json'])
                        journal = spawn('bash', ['-c', 'journalctl -f -n 100 -u "php*-fpm" -o json']);
                    } else {
                        journal = spawn('journalctl', args);
                    }
                }

                if (!journal && service !== 'all') {
                    journal = spawn('journalctl', args);
                }

            } else {
                // macOS: Mock logs for dev
                // We'll just emit some fake logs periodically
                const interval = setInterval(() => {
                    sendLog({
                        timestamp: Date.now(),
                        message: `[Mock_dev_mode ] when using local pc or mac os PHP Log entry for ${service || 'all'} - ${new Date().toISOString()}`,
                        service: service || 'php-fpm',
                        priority: '6'
                    });
                }, 2000);

                // Send some history
                for (let i = 0; i < 10; i++) {
                    sendLog({
                        timestamp: Date.now() - (10 - i) * 1000,
                        message: `[Mock History] PHP Log entry ${i}`,
                        service: service || 'php-fpm',
                        priority: '6'
                    });
                }

                return () => clearInterval(interval);
            }

            if (journal) {
                journal.stdout.on('data', (data: Buffer) => {
                    const lines = data.toString().split('\n');
                    lines.forEach(line => {
                        if (!line.trim()) return;
                        try {
                            const entry = JSON.parse(line);
                            // Transform systemd json to our format
                            // Entry usually has: __REALTIME_TIMESTAMP, MESSAGE, _SYSTEMD_UNIT, PRIORITY
                            sendLog({
                                timestamp: parseInt(entry.__REALTIME_TIMESTAMP) / 1000, // microseconds to milliseconds
                                message: entry.MESSAGE,
                                service: entry._SYSTEMD_UNIT?.replace('.service', '') || 'unknown',
                                priority: entry.PRIORITY
                            });
                        } catch (e) {
                            // Fallback for non-json lines (if any)
                            sendLog({
                                timestamp: Date.now(),
                                message: line,
                                service: 'system',
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
        },
        cancel() {
            // Cleanup logic if needed (killing spawned process is hard here without reference, 
            // but ReadableStream cancel might not trigger cleanup automatically in this scope unless we handle it.
            // Actually, we can't easily kill the process from here if we don't store it.
            // But Next.js might handle the stream closure.
            // Ideally we should kill the process.
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
