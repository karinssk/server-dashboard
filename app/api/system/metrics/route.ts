
import { NextResponse } from 'next/server';
import si from 'systeminformation';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const [cpu, mem, currentLoad, fsSize, networkStats] = await Promise.all([
            si.cpu(),
            si.mem(),
            si.currentLoad(),
            si.fsSize(),
            si.networkStats(),
        ]);

        const metrics = {
            cpu: {
                manufacturer: cpu.manufacturer,
                brand: cpu.brand,
                speed: cpu.speed,
                cores: cpu.cores,
                currentLoad: currentLoad.currentLoad,
            },
            memory: {
                total: mem.total,
                used: mem.used,
                active: mem.active,
                available: mem.available,
            },
            disk: fsSize.map((disk) => ({
                fs: disk.fs,
                type: disk.type,
                size: disk.size,
                used: disk.used,
                use: disk.use,
                mount: disk.mount,
            })),
            network: networkStats.map((iface) => ({
                iface: iface.iface,
                rx_sec: iface.rx_sec,
                tx_sec: iface.tx_sec,
            })),
        };

        return NextResponse.json(metrics);
    } catch (error: any) {
        console.error('System Metrics Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
