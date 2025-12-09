
'use client';

import useSWR from 'swr';
import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Cpu, HardDrive, Activity, Network, Server } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface SystemMetrics {
    cpu: {
        manufacturer: string;
        brand: string;
        speed: string;
        cores: number;
        currentLoad: number;
    };
    memory: {
        total: number;
        used: number;
        active: number;
        available: number;
    };
    disk: {
        fs: string;
        type: string;
        size: number;
        used: number;
        use: number;
        mount: string;
    }[];
    network: {
        iface: string;
        rx_sec: number;
        tx_sec: number;
    }[];
}

export default function MetricsDashboard() {
    const { data: metrics } = useSWR<SystemMetrics>('/api/system/metrics', fetcher, {
        refreshInterval: 2000,
    });

    const [history, setHistory] = useState<{ time: string; cpu: number; memory: number }[]>([]);

    useEffect(() => {
        if (metrics) {
            setHistory((prev) => {
                const now = new Date();
                const timeStr = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;
                const newEntry = {
                    time: timeStr,
                    cpu: metrics.cpu.currentLoad,
                    memory: (metrics.memory.active / metrics.memory.total) * 100,
                };
                const newHistory = [...prev, newEntry];
                if (newHistory.length > 30) newHistory.shift(); // Keep last 30 points (approx 60s)
                return newHistory;
            });
        }
    }, [metrics]);

    if (!metrics) return <div className="p-4 text-gray-400 animate-pulse">Loading System Metrics...</div>;

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const mainDisk = metrics.disk[0] || { size: 0, used: 0, use: 0 };
    const mainNet = metrics.network.find(n => n.iface !== 'lo0') || metrics.network[0] || { rx_sec: 0, tx_sec: 0 };

    return (
        <div className="mb-8 space-y-6">
            <h2 className="text-xl font-semibold text-gray-200 flex items-center gap-2">
                <Server className="text-blue-400" /> System Metrics
            </h2>

            {/* Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gray-900 p-4 rounded-xl border border-gray-800">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-400 text-sm">CPU Load</span>
                        <Cpu size={16} className="text-purple-400" />
                    </div>
                    <div className="text-2xl font-bold text-white">{metrics.cpu.currentLoad.toFixed(1)}%</div>
                    <div className="text-xs text-gray-500 mt-1">{metrics.cpu.cores} Cores @ {metrics.cpu.speed}GHz</div>
                </div>

                <div className="bg-gray-900 p-4 rounded-xl border border-gray-800">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-400 text-sm">Memory Usage</span>
                        <Activity size={16} className="text-green-400" />
                    </div>
                    <div className="text-2xl font-bold text-white">{((metrics.memory.active / metrics.memory.total) * 100).toFixed(1)}%</div>
                    <div className="text-xs text-gray-500 mt-1">{formatBytes(metrics.memory.active)} / {formatBytes(metrics.memory.total)}</div>
                </div>

                <div className="bg-gray-900 p-4 rounded-xl border border-gray-800">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-400 text-sm">Disk Usage</span>
                        <HardDrive size={16} className="text-yellow-400" />
                    </div>
                    <div className="text-2xl font-bold text-white">{mainDisk.use.toFixed(1)}%</div>
                    <div className="text-xs text-gray-500 mt-1">{formatBytes(mainDisk.used)} / {formatBytes(mainDisk.size)}</div>
                </div>

                <div className="bg-gray-900 p-4 rounded-xl border border-gray-800">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-400 text-sm">Network Traffic</span>
                        <Network size={16} className="text-blue-400" />
                    </div>
                    <div className="flex justify-between items-end">
                        <div>
                            <div className="text-xs text-gray-500">↓ {formatBytes(mainNet.rx_sec)}/s</div>
                            <div className="text-xs text-gray-500">↑ {formatBytes(mainNet.tx_sec)}/s</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-900 p-4 rounded-xl border border-gray-800 h-64">
                    <h3 className="text-sm font-medium text-gray-400 mb-4">CPU History</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={history}>
                            <defs>
                                <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="time" hide />
                            <YAxis domain={[0, 100]} stroke="#9CA3AF" fontSize={12} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#F3F4F6' }}
                                itemStyle={{ color: '#F3F4F6' }}
                            />
                            <Area type="monotone" dataKey="cpu" stroke="#8884d8" fillOpacity={1} fill="url(#colorCpu)" isAnimationActive={false} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                <div className="bg-gray-900 p-4 rounded-xl border border-gray-800 h-64">
                    <h3 className="text-sm font-medium text-gray-400 mb-4">Memory History</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={history}>
                            <defs>
                                <linearGradient id="colorMem" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#82ca9d" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="time" hide />
                            <YAxis domain={[0, 100]} stroke="#9CA3AF" fontSize={12} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#F3F4F6' }}
                                itemStyle={{ color: '#F3F4F6' }}
                            />
                            <Area type="monotone" dataKey="memory" stroke="#82ca9d" fillOpacity={1} fill="url(#colorMem)" isAnimationActive={false} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
