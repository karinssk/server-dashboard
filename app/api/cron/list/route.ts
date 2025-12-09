import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);

export const dynamic = 'force-dynamic';

interface CronJob {
    id: number;
    schedule: string;
    command: string;
    original: string;
}

export async function GET() {
    try {
        // crontab -l returns exit code 1 if no crontab exists for user
        try {
            const { stdout } = await execAsync('crontab -l');
            const lines = stdout.split('\n').filter(line => line.trim() !== '' && !line.trim().startsWith('#'));

            const jobs: CronJob[] = lines.map((line, index) => {
                // Simple parse: first 5 parts are schedule, rest is command
                // This is a naive split, but works for standard cron
                // Special strings like @reboot are handled differently

                const parts = line.trim().split(/\s+/);
                let schedule = '';
                let command = '';

                if (line.trim().startsWith('@')) {
                    schedule = parts[0];
                    command = parts.slice(1).join(' ');
                } else {
                    if (parts.length >= 6) {
                        schedule = parts.slice(0, 5).join(' ');
                        command = parts.slice(5).join(' ');
                    } else {
                        // Fallback
                        schedule = 'Invalid';
                        command = line;
                    }
                }

                return {
                    id: index,
                    schedule,
                    command,
                    original: line
                };
            });

            return NextResponse.json({ jobs });
        } catch (error: any) {
            // If error code is 1, it likely means no crontab for user, which is fine
            if (error.code === 1 && error.stderr.includes('no crontab')) {
                return NextResponse.json({ jobs: [] });
            }
            throw error;
        }

    } catch (error: any) {
        console.error('Cron List Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to list cron jobs' }, { status: 500 });
    }
}
