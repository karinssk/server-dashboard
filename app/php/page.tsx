'use client';

import useSWR, { mutate } from 'swr';
import { Code, FileText, Terminal, Package, Search, Play, Square, RotateCw, Server, Settings, X } from 'lucide-react';
import { useState } from 'react';
import Swal from 'sweetalert2';

const fetcher = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error('An error occurred while fetching the data.');
    }
    return res.json();
};

const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
        toast.onmouseenter = Swal.stopTimer;
        toast.onmouseleave = Swal.resumeTimer;
    }
});

interface PHPInfo {
    version: string;
    executable: string;
    iniPath: string;
    extensions: string[];
}

interface PHPService {
    name: string;
    status: string;
    user: string;
    version: string;
}

interface PHPConfig {
    path: string;
    config: Record<string, string>;
}

export default function PHPPage() {
    const { data: phpInfo, error: infoError } = useSWR<PHPInfo>('/api/php/info', fetcher);
    const { data: services, error: servicesError } = useSWR<PHPService[]>('/api/php/services', fetcher, { refreshInterval: 5000 });
    const [searchTerm, setSearchTerm] = useState('');
    const [loadingAction, setLoadingAction] = useState<string | null>(null);
    const [selectedConfig, setSelectedConfig] = useState<PHPConfig | null>(null);
    const [loadingConfig, setLoadingConfig] = useState(false);

    const handleAction = async (service: string, action: 'start' | 'stop' | 'restart') => {
        setLoadingAction(`${service}-${action}`);
        try {
            const res = await fetch('/api/php/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ service, action }),
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Failed');

            Toast.fire({
                icon: 'success',
                title: `Service ${service} ${action}ed successfully`
            });

            mutate('/api/php/services');
        } catch (err: any) {
            console.error('Action failed:', err);
            Toast.fire({
                icon: 'error',
                title: `Failed to ${action} service`,
                text: err.message
            });
        } finally {
            setLoadingAction(null);
        }
    };

    const handleRestartAll = async () => {
        if (!services) return;
        for (const service of services) {
            await handleAction(service.name, 'restart');
        }
    };

    const handleViewConfig = async (version: string) => {
        setLoadingConfig(true);
        try {
            const res = await fetch(`/api/php/config?version=${version}`);
            if (!res.ok) throw new Error('Failed to fetch config');
            const data = await res.json();
            setSelectedConfig(data);
        } catch (error) {
            Toast.fire({
                icon: 'error',
                title: 'Failed to load configuration'
            });
        } finally {
            setLoadingConfig(false);
        }
    };

    if (infoError) return <div className="p-8 text-red-500">Failed to load PHP info.</div>;
    if (!phpInfo) return <div className="p-8 text-gray-400 animate-pulse">Loading PHP environment...</div>;

    const filteredExtensions = phpInfo.extensions.filter(ext =>
        ext.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-8 max-w-7xl mx-auto relative">
            <header className="mb-8">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent flex items-center gap-3">
                    <Code className="text-purple-400" /> PHP Manager
                </h1>
                <p className="text-gray-400 mt-2">Environment Information & Extensions</p>
            </header>

            {/* Services Section */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Server className="text-blue-400" /> PHP Services
                    </h2>
                    <button
                        onClick={handleRestartAll}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                    >
                        <RotateCw size={16} /> Restart All
                    </button>
                </div>

                <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-950 text-gray-400 text-xs uppercase">
                                <tr>
                                    <th className="px-6 py-4 font-medium">Service Name</th>
                                    <th className="px-6 py-4 font-medium">Version</th>
                                    <th className="px-6 py-4 font-medium">Status</th>
                                    <th className="px-6 py-4 font-medium">User</th>
                                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {Array.isArray(services) && services.map((service) => (
                                    <tr key={service.name} className="hover:bg-gray-800/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-white">{service.name}</td>
                                        <td className="px-6 py-4 text-gray-400">{service.version}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${service.status === 'started'
                                                ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                                : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                                }`}>
                                                {service.status === 'started' ? 'Running' : 'Stopped'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-400">{service.user || '-'}</td>
                                        <td className="px-6 py-4 text-right space-x-2 flex justify-end items-center">
                                            <button
                                                onClick={() => handleViewConfig(service.version)}
                                                className="p-2 text-purple-400 hover:bg-purple-500/10 rounded-lg transition-colors mr-2"
                                                title="View Config"
                                            >
                                                <Settings size={18} />
                                            </button>
                                            {service.status !== 'started' && (
                                                <button
                                                    onClick={() => handleAction(service.name, 'start')}
                                                    disabled={loadingAction === `${service.name}-start`}
                                                    className="p-2 text-green-400 hover:bg-green-500/10 rounded-lg transition-colors disabled:opacity-50"
                                                    title="Start"
                                                >
                                                    <Play size={18} />
                                                </button>
                                            )}
                                            {service.status === 'started' && (
                                                <button
                                                    onClick={() => handleAction(service.name, 'stop')}
                                                    disabled={loadingAction === `${service.name}-stop`}
                                                    className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                                                    title="Stop"
                                                >
                                                    <Square size={18} />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleAction(service.name, 'restart')}
                                                disabled={loadingAction === `${service.name}-restart`}
                                                className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors disabled:opacity-50"
                                                title="Restart"
                                            >
                                                <RotateCw size={18} className={loadingAction === `${service.name}-restart` ? 'animate-spin' : ''} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {!services && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500">Loading services...</td>
                                    </tr>
                                )}
                                {services && services.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500">No PHP services found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 rounded-lg bg-purple-500/10 text-purple-400">
                            <Terminal size={24} />
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-gray-400">PHP Version</h3>
                            <p className="text-xl font-bold text-white">{phpInfo.version.split(' ')[1]}</p>
                        </div>
                    </div>
                    <div className="text-xs text-gray-500 font-mono truncate" title={phpInfo.version}>
                        {phpInfo.version}
                    </div>
                </div>

                <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 rounded-lg bg-blue-500/10 text-blue-400">
                            <FileText size={24} />
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-gray-400">Configuration File</h3>
                            <p className="text-sm font-bold text-white truncate max-w-[200px]" title={phpInfo.iniPath}>
                                php.ini
                            </p>
                        </div>
                    </div>
                    <div className="text-xs text-gray-500 font-mono truncate" title={phpInfo.iniPath}>
                        {phpInfo.iniPath}
                    </div>
                </div>

                <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 rounded-lg bg-green-500/10 text-green-400">
                            <Package size={24} />
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-gray-400">Executable Path</h3>
                            <p className="text-sm font-bold text-white truncate max-w-[200px]">
                                php
                            </p>
                        </div>
                    </div>
                    <div className="text-xs text-gray-500 font-mono truncate" title={phpInfo.executable}>
                        {phpInfo.executable}
                    </div>
                </div>
            </div>

            {/* Extensions Section */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                <div className="p-6 border-b border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <Package className="text-gray-400" size={20} />
                        <h2 className="text-lg font-semibold text-white">Installed Extensions</h2>
                        <span className="bg-gray-800 text-gray-400 text-xs px-2 py-1 rounded-full">
                            {phpInfo.extensions.length}
                        </span>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                        <input
                            type="text"
                            placeholder="Search extensions..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-gray-950 border border-gray-800 text-gray-200 text-sm rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:border-purple-500 w-full md:w-64"
                        />
                    </div>
                </div>

                <div className="p-6">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {filteredExtensions.map((ext) => (
                            <div
                                key={ext}
                                className="bg-gray-950/50 border border-gray-800 p-3 rounded-lg flex items-center gap-2 hover:border-purple-500/30 transition-colors"
                            >
                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                <span className="text-gray-300 font-mono text-sm">{ext}</span>
                            </div>
                        ))}
                        {filteredExtensions.length === 0 && (
                            <div className="col-span-full text-center text-gray-500 py-8">
                                No extensions found matching "{searchTerm}"
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Config Modal */}
            {selectedConfig && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <Settings className="text-purple-400" /> PHP Configuration
                            </h3>
                            <button
                                onClick={() => setSelectedConfig(null)}
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            <div className="mb-4">
                                <span className="text-gray-500 text-sm">Configuration File:</span>
                                <code className="block mt-1 bg-gray-950 p-2 rounded text-sm text-gray-300 font-mono break-all">
                                    {selectedConfig.path}
                                </code>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {Object.entries(selectedConfig.config).map(([key, value]) => (
                                    <div key={key} className="bg-gray-950 p-4 rounded-lg border border-gray-800">
                                        <span className="text-gray-500 text-xs uppercase tracking-wider block mb-1">
                                            {key.replace(/_/g, ' ')}
                                        </span>
                                        <span className="text-white font-mono font-medium">
                                            {value}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
