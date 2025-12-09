
import { NextResponse } from 'next/server';
import pm2 from 'pm2';

export async function POST(request: Request): Promise<NextResponse> {
    const { id, action } = await request.json();

    if (id === undefined || id === null) {
        return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    return new Promise<NextResponse>((resolve) => {
        pm2.connect((err) => {
            if (err) {
                resolve(NextResponse.json({ error: err.message }, { status: 500 }));
                return;
            }

            const callback = (err: any) => {
                pm2.disconnect();
                if (err) {
                    resolve(NextResponse.json({ error: err.message }, { status: 500 }));
                } else {
                    resolve(NextResponse.json({ success: true, message: `Process ${id} ${action}ed` }));
                }
            };

            switch (action) {
                case 'start':
                case 'restart':
                    // Using restart for both start and restart to ensure it works for existing processes by ID
                    pm2.restart(id, callback);
                    break;
                case 'stop':
                    pm2.stop(id, callback);
                    break;
                default:
                    pm2.disconnect();
                    resolve(NextResponse.json({ error: 'Invalid action' }, { status: 400 }));
            }
        });
    });
}
