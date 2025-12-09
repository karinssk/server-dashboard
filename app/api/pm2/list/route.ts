
import { NextResponse } from 'next/server';
import pm2 from 'pm2';

export const dynamic = 'force-dynamic';

export async function GET() {
    return new Promise((resolve) => {
        pm2.connect((err) => {
            if (err) {
                console.error('PM2 Connect Error:', err);
                resolve(NextResponse.json({ error: err.message }, { status: 500 }));
                return;
            }

            pm2.list((err, list) => {
                pm2.disconnect();
                if (err) {
                    console.error('PM2 List Error:', err);
                    resolve(NextResponse.json({ error: err.message }, { status: 500 }));
                    return;
                }

                const formattedList = list.map((proc) => {
                    const env = (proc.pm2_env || {}) as any;
                    const monit = proc.monit || {};

                    return {
                        id: proc.pm_id,
                        name: proc.name,
                        namespace: env.namespace,
                        version: env.version,
                        mode: env.exec_mode,
                        pid: proc.pid,
                        uptime: env.pm_uptime, // Timestamp, will format on frontend or here. Let's send raw and format on frontend for real-time tick.
                        restarts: env.restart_time,
                        status: env.status,
                        cpu: monit.cpu,
                        mem: monit.memory,
                        user: env.username,
                        watching: env.watch ? 'enabled' : 'disabled',
                    };
                });

                resolve(NextResponse.json(formattedList));
            });
        });
    });
}
