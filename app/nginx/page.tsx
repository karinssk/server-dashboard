'use client';

import useSWR from 'swr';
import { Server, Activity, FileText, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface NginxStatus {
    installed: boolean;
    path?: string;
    version?: string;
    running?: boolean;
}

interface NginxConfig {
    path: string;
    content: string;
}

export default function NginxPage() {
    const { data: status, error: statusError } = useSWR<NginxStatus>('/api/nginx/status', fetcher);
    const { data: config, error: configError } = useSWR<NginxConfig>('/api/nginx/config', fetcher);

    if (statusError) return <div className="p-8 text-red-500">Failed to load Nginx status.</div>;
    if (!status) return <div className="p-8 text-gray-400 animate-pulse">Loading Nginx status...</div>;

    if (!status.installed) {
        return (
            <div className="p-8 max-w-7xl mx-auto">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent flex items-center gap-3">
                        <Server className="text-green-400" /> Nginx Manager
                    </h1>
                </header>

                <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
                    <div className="inline-flex p-4 rounded-full bg-red-500/10 text-red-500 mb-4">
                        <AlertTriangle size={48} />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Nginx Not Detected</h2>
                    <p className="text-gray-400 max-w-md mx-auto">
                        We couldn't find an Nginx installation on this system. Please ensure Nginx is installed and available in your system PATH or standard locations.
                    </p>
                    <div className="mt-8 p-4 bg-gray-950 rounded-lg border border-gray-800 inline-block text-left">
                        <p className="text-xs text-gray-500 uppercase font-bold mb-2">Installation Guide (macOS)</p>
                        <code className="text-sm text-green-400 font-mono">brew install nginx</code>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <header className="mb-8">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent flex items-center gap-3">
                    <Server className="text-green-400" /> Nginx Manager
                </h1>
                <p className="text-gray-400 mt-2">Web Server Status & Configuration</p>
            </header>

            {/* Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
                    <div className="flex items-center gap-3 mb-4">
                        <div className={`p-3 rounded-lg ${status.running ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                            <Activity size={24} />
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-gray-400">Status</h3>
                            <p className={`text-xl font-bold ${status.running ? 'text-green-400' : 'text-red-400'}`}>
                                {status.running ? 'Running' : 'Stopped'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 rounded-lg bg-blue-500/10 text-blue-400">
                            <Server size={24} />
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-gray-400">Version</h3>
                            <p className="text-xl font-bold text-white truncate" title={status.version}>
                                {status.version?.split('/').pop() || 'Unknown'}
                            </p>
                        </div>
                    </div>
                    <div className="text-xs text-gray-500 font-mono truncate" title={status.version}>
                        {status.version}
                    </div>
                </div>

                <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 rounded-lg bg-purple-500/10 text-purple-400">
                            <FileText size={24} />
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-gray-400">Executable Path</h3>
                            <p className="text-sm font-bold text-white truncate max-w-[200px]">
                                nginx
                            </p>
                        </div>
                    </div>
                    <div className="text-xs text-gray-500 font-mono truncate" title={status.path}>
                        {status.path}
                    </div>
                </div>
            </div>

            {/* Configuration Viewer */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden flex flex-col h-[600px]">
                <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-950">
                    <div className="flex items-center gap-2">
                        <FileText className="text-gray-400" size={20} />
                        <h2 className="text-sm font-semibold text-white">Configuration File</h2>
                        {config?.path && (
                            <span className="text-xs text-gray-500 font-mono ml-2">({config.path})</span>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-auto p-4 bg-[#0d1117]">
                    {config ? (
                        <pre className="text-sm font-mono text-gray-300 leading-relaxed">
                            <code>{config.content}</code>
                        </pre>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500">
                            <AlertTriangle size={32} className="mb-2 opacity-50" />
                            <p>Configuration file not found or unreadable.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
