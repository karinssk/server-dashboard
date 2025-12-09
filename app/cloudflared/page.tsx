'use client';

import useSWR, { mutate } from 'swr';
import { Cloud, Activity, FileText, AlertTriangle, Network, Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { useState } from 'react';
import Swal from 'sweetalert2';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

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

interface CloudflaredStatus {
    installed: boolean;
    path?: string;
    version?: string;
    running?: boolean;
}

interface IngressRule {
    hostname?: string;
    service: string;
}

interface CloudflaredConfig {
    tunnel?: string;
    'credentials-file'?: string;
    ingress?: IngressRule[];
}

export default function CloudflaredPage() {
    const { data: status, error: statusError } = useSWR<CloudflaredStatus>('/api/cloudflared/status', fetcher);
    const { data: configData, error: configError } = useSWR<{ config: CloudflaredConfig, path: string }>('/api/cloudflared/config', fetcher);

    const [isEditing, setIsEditing] = useState(false);
    const [editIndex, setEditIndex] = useState<number | null>(null);
    const [editHostname, setEditHostname] = useState('');
    const [editService, setEditService] = useState('');

    const handleSaveConfig = async (newConfig: CloudflaredConfig) => {
        try {
            const res = await fetch('/api/cloudflared/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ config: newConfig }),
            });

            if (!res.ok) throw new Error('Failed to save config');

            Toast.fire({ icon: 'success', title: 'Configuration saved successfully' });
            mutate('/api/cloudflared/config');
            setIsEditing(false);
            setEditIndex(null);
        } catch (err: any) {
            console.error(err);
            Toast.fire({ icon: 'error', title: 'Failed to save configuration', text: err.message });
        }
    };

    const handleAddRule = () => {
        setEditIndex(-1); // -1 for new rule
        setEditHostname('');
        setEditService('');
        setIsEditing(true);
    };

    const handleEditRule = (index: number, rule: IngressRule) => {
        setEditIndex(index);
        setEditHostname(rule.hostname || '');
        setEditService(rule.service);
        setIsEditing(true);
    };

    const handleDeleteRule = async (index: number) => {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: "You won't be able to revert this!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!'
        });

        if (result.isConfirmed && configData?.config.ingress) {
            const newIngress = [...configData.config.ingress];
            newIngress.splice(index, 1);
            const newConfig = { ...configData.config, ingress: newIngress };
            await handleSaveConfig(newConfig);
        }
    };

    const handleSaveRule = async () => {
        if (!configData?.config) return;

        const newIngress = configData.config.ingress ? [...configData.config.ingress] : [];
        const newRule: IngressRule = { service: editService };
        if (editHostname) newRule.hostname = editHostname;

        if (editIndex === -1) {
            // Add new rule before the last catch-all rule (usually service: http_status:404)
            // Heuristic: Insert at beginning or before last if last has no hostname
            const lastRule = newIngress[newIngress.length - 1];
            if (lastRule && !lastRule.hostname) {
                newIngress.splice(newIngress.length - 1, 0, newRule);
            } else {
                newIngress.push(newRule);
            }
        } else if (editIndex !== null) {
            newIngress[editIndex] = newRule;
        }

        const newConfig = { ...configData.config, ingress: newIngress };
        await handleSaveConfig(newConfig);
    };

    if (statusError) return <div className="p-8 text-red-500">Failed to load Cloudflared status.</div>;
    if (!status) return <div className="p-8 text-gray-400 animate-pulse">Loading Cloudflared status...</div>;

    if (!status.installed) {
        return (
            <div className="p-8 max-w-7xl mx-auto">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent flex items-center gap-3">
                        <Cloud className="text-orange-500" /> Cloudflared Manager
                    </h1>
                </header>
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
                    <div className="inline-flex p-4 rounded-full bg-red-500/10 text-red-500 mb-4">
                        <AlertTriangle size={48} />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Cloudflared Not Detected</h2>
                    <p className="text-gray-400 max-w-md mx-auto">
                        We couldn't find Cloudflared on this system. Please ensure it is installed and available in your system PATH.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <header className="mb-8">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent flex items-center gap-3">
                    <Cloud className="text-orange-500" /> Cloudflared Manager
                </h1>
                <p className="text-gray-400 mt-2">Tunnel Status & Configuration</p>
            </header>

            {/* Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
                    <div className="flex items-center gap-3 mb-4">
                        <div className={`p-3 rounded-lg ${status.running ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                            <Activity size={24} />
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-gray-400">Service Status</h3>
                            <p className={`text-xl font-bold ${status.running ? 'text-green-400' : 'text-red-400'}`}>
                                {status.running ? 'Running' : 'Stopped'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 rounded-lg bg-blue-500/10 text-blue-400">
                            <Network size={24} />
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-gray-400">Current Tunnel</h3>
                            <p className="text-xl font-bold text-white truncate" title={configData?.config.tunnel}>
                                {configData?.config.tunnel || 'Not Configured'}
                            </p>
                        </div>
                    </div>
                    <div className="text-xs text-gray-500 font-mono truncate">
                        {configData?.path || '/etc/cloudflared/config.yml'}
                    </div>
                </div>

                <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 rounded-lg bg-purple-500/10 text-purple-400">
                            <FileText size={24} />
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-gray-400">Version</h3>
                            <p className="text-xl font-bold text-white truncate" title={status.version}>
                                {status.version?.split('version ')[1]?.split(' ')[0] || 'Unknown'}
                            </p>
                        </div>
                    </div>
                    <div className="text-xs text-gray-500 font-mono truncate" title={status.version}>
                        {status.version}
                    </div>
                </div>
            </div>

            {/* Ingress Rules Section */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                <div className="p-6 border-b border-gray-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Network className="text-gray-400" size={20} />
                        <h2 className="text-lg font-semibold text-white">Ingress Rules (Domains)</h2>
                    </div>
                    <button
                        onClick={handleAddRule}
                        className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                    >
                        <Plus size={16} /> Add Domain
                    </button>
                </div>

                {configError ? (
                    <div className="p-8 text-center text-red-400">
                        <AlertTriangle className="mx-auto mb-2" size={32} />
                        <p>Failed to load configuration file. Please check permissions for <code>/etc/cloudflared/config.yml</code>.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-950 text-gray-400 text-xs uppercase">
                                <tr>
                                    <th className="px-6 py-4 font-medium">Hostname</th>
                                    <th className="px-6 py-4 font-medium">Service</th>
                                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {configData?.config.ingress?.map((rule, index) => (
                                    <tr key={index} className="hover:bg-gray-800/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-white font-mono">{rule.hostname || <span className="text-gray-500 italic">Catch-all</span>}</td>
                                        <td className="px-6 py-4 text-gray-400 font-mono">{rule.service}</td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            <button
                                                onClick={() => handleEditRule(index, rule)}
                                                className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                                                title="Edit"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteRule(index)}
                                                className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {!configData?.config.ingress && (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-8 text-center text-gray-500">No ingress rules found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            {isEditing && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md p-6 shadow-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-white">{editIndex === -1 ? 'Add Domain' : 'Edit Domain'}</h3>
                            <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-white">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Hostname</label>
                                <input
                                    type="text"
                                    value={editHostname}
                                    onChange={(e) => setEditHostname(e.target.value)}
                                    placeholder="e.g. app.example.com"
                                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-orange-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Service</label>
                                <input
                                    type="text"
                                    value={editService}
                                    onChange={(e) => setEditService(e.target.value)}
                                    placeholder="e.g. http://localhost:3000"
                                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-orange-500"
                                />
                            </div>
                        </div>

                        <div className="mt-8 flex justify-end gap-3">
                            <button
                                onClick={() => setIsEditing(false)}
                                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveRule}
                                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                            >
                                <Save size={18} /> Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
