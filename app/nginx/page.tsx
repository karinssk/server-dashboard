'use client';

import useSWR, { mutate } from 'swr';
import { Server, Activity, FileText, AlertTriangle, CheckCircle, XCircle, Edit, Trash2, Plus, Play, Terminal, X, Save, RotateCw } from 'lucide-react';
import { useState } from 'react';
import Swal from 'sweetalert2';
import NginxLogViewer from '../components/NginxLogViewer';

const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer);
        toast.addEventListener('mouseleave', Swal.resumeTimer);
    }
});

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

interface SiteListResponse {
    sites: string[];
}

export default function NginxPage() {
    const { data: status, error: statusError } = useSWR<NginxStatus>('/api/nginx/status', fetcher);
    const { data: config, error: configError } = useSWR<NginxConfig>('/api/nginx/config', fetcher);
    const { data: sitesData, error: sitesError } = useSWR<SiteListResponse>('/api/nginx/sites', fetcher);

    const [editingSite, setEditingSite] = useState<{ name: string; content: string } | null>(null);
    const [isNewSite, setIsNewSite] = useState(false);
    const [loadingSite, setLoadingSite] = useState(false);
    const [savingSite, setSavingSite] = useState(false);
    const [testingConfig, setTestingConfig] = useState(false);
    const [showLogs, setShowLogs] = useState(false);

    const handleEditSite = async (name: string) => {
        setLoadingSite(true);
        try {
            const res = await fetch(`/api/nginx/site?name=${name}`);
            if (!res.ok) throw new Error('Failed to fetch site content');
            const data = await res.json();
            setEditingSite({ name, content: data.content });
            setIsNewSite(false);
        } catch (error) {
            Toast.fire({ icon: 'error', title: 'Failed to load site configuration' });
        } finally {
            setLoadingSite(false);
        }
    };

    const handleCreateSite = () => {
        setEditingSite({ name: '', content: '# New Nginx Server Block\nserver {\n    listen 80;\n    server_name example.com;\n\n    location / {\n        try_files $uri $uri/ =404;\n    }\n}' });
        setIsNewSite(true);
    };

    const handleSaveSite = async () => {
        if (!editingSite) return;
        if (!editingSite.name.trim()) {
            Toast.fire({ icon: 'warning', title: 'Site name is required' });
            return;
        }

        setSavingSite(true);
        try {
            const res = await fetch('/api/nginx/site', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editingSite),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to save');

            Toast.fire({ icon: 'success', title: 'Site configuration saved' });
            setEditingSite(null);
            mutate('/api/nginx/sites');
        } catch (error: any) {
            Toast.fire({ icon: 'error', title: 'Failed to save site', text: error.message });
        } finally {
            setSavingSite(false);
        }
    };

    const handleDeleteSite = async (name: string) => {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: `Delete configuration for ${name}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!'
        });

        if (result.isConfirmed) {
            try {
                const res = await fetch(`/api/nginx/site?name=${name}`, { method: 'DELETE' });
                if (!res.ok) throw new Error('Failed to delete');

                Toast.fire({ icon: 'success', title: 'Site deleted successfully' });
                mutate('/api/nginx/sites');
            } catch (error) {
                Toast.fire({ icon: 'error', title: 'Failed to delete site' });
            }
        }
    };

    const handleTestConfig = async () => {
        setTestingConfig(true);
        try {
            const res = await fetch('/api/nginx/test', { method: 'POST' });
            const data = await res.json();

            Swal.fire({
                title: data.success ? 'Configuration Valid' : 'Configuration Error',
                html: `<pre class="text-left text-xs bg-gray-900 p-4 rounded text-gray-300 overflow-auto max-h-60">${data.output}</pre>`,
                icon: data.success ? 'success' : 'error',
                width: '600px',
                background: '#1f2937',
                color: '#fff'
            });

        } catch (error) {
            Toast.fire({ icon: 'error', title: 'Failed to test configuration' });
        } finally {
            setTestingConfig(false);
        }
    };

    const [editingConfig, setEditingConfig] = useState(false);
    const [configContent, setConfigContent] = useState('');
    const [savingConfig, setSavingConfig] = useState(false);
    const [restarting, setRestarting] = useState(false);

    const handleRestartNginx = async () => {
        setRestarting(true);
        try {
            const res = await fetch('/api/nginx/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'restart' }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to restart');

            Toast.fire({ icon: 'success', title: 'Nginx restarted successfully' });
            mutate('/api/nginx/status');
        } catch (error: any) {
            Toast.fire({ icon: 'error', title: 'Failed to restart Nginx', text: error.message });
        } finally {
            setRestarting(false);
        }
    };

    const handleEditConfig = () => {
        if (config) {
            setConfigContent(config.content);
            setEditingConfig(true);
        }
    };

    const handleSaveConfig = async () => {
        setSavingConfig(true);
        try {
            const res = await fetch('/api/nginx/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: configContent }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to save');

            Toast.fire({ icon: 'success', title: 'Main configuration saved' });
            setEditingConfig(false);
            mutate('/api/nginx/config');

            // Ask to restart
            const result = await Swal.fire({
                title: 'Configuration Saved',
                text: 'Do you want to restart Nginx to apply changes?',
                icon: 'success',
                showCancelButton: true,
                confirmButtonText: 'Yes, Restart',
                cancelButtonText: 'No, Later'
            });

            if (result.isConfirmed) {
                handleRestartNginx();
            }

        } catch (error: any) {
            Toast.fire({ icon: 'error', title: 'Failed to save configuration', text: error.message });
        } finally {
            setSavingConfig(false);
        }
    };

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
        <div className="p-8 max-w-7xl mx-auto relative">
            <header className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent flex items-center gap-3">
                        <Server className="text-green-400" /> Nginx Manager
                    </h1>
                    <p className="text-gray-400 mt-2">Web Server Status & Configuration</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setShowLogs(true)}
                        className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                    >
                        <Terminal size={16} /> View Logs
                    </button>
                    <button
                        onClick={handleRestartNginx}
                        disabled={restarting}
                        className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                        <RotateCw size={16} className={restarting ? "animate-spin" : ""} />
                        {restarting ? 'Restarting...' : 'Restart Nginx'}
                    </button>
                    <button
                        onClick={handleTestConfig}
                        disabled={testingConfig}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                        {testingConfig ? <RotateCw size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                        Test Config
                    </button>
                </div>
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

            {/* Sites Available Section */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <FileText className="text-yellow-400" /> Sites Available
                    </h2>
                    <button
                        onClick={handleCreateSite}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                    >
                        <Plus size={16} /> Add New Site
                    </button>
                </div>

                <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-950 text-gray-400 text-xs uppercase">
                                <tr>
                                    <th className="px-6 py-4 font-medium">Site Name</th>
                                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {sitesData?.sites.map((site) => (
                                    <tr key={site} className="hover:bg-gray-800/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-white flex items-center gap-2">
                                            <FileText size={16} className="text-gray-500" />
                                            {site}
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            <button
                                                onClick={() => handleEditSite(site)}
                                                className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                                                title="Edit"
                                            >
                                                <Edit size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteSite(site)}
                                                className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {sitesData?.sites.length === 0 && (
                                    <tr>
                                        <td colSpan={2} className="px-6 py-8 text-center text-gray-500">No sites found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Main Configuration Viewer (Read-only) */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden flex flex-col h-[300px]">
                <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-950">
                    <div className="flex items-center gap-2">
                        <FileText className="text-gray-400" size={20} />
                        <h2 className="text-sm font-semibold text-white">Main Configuration (nginx.conf)</h2>
                        {config?.path && (
                            <span className="text-xs text-gray-500 font-mono ml-2">({config.path})</span>
                        )}
                    </div>
                    <button
                        onClick={handleEditConfig}
                        className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-white rounded text-xs font-medium transition-colors flex items-center gap-2"
                    >
                        <Edit size={14} /> Edit Config
                    </button>
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

            {/* Main Config Editor Modal */}
            {editingConfig && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col">
                        <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <Edit className="text-blue-400" /> Edit Main Configuration
                            </h3>
                            <button
                                onClick={() => setEditingConfig(false)}
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-6 flex-1 flex flex-col gap-4 overflow-hidden">
                            <div className="flex-1 flex flex-col">
                                <label className="block text-sm font-medium text-gray-400 mb-1">Configuration Content</label>
                                <textarea
                                    value={configContent}
                                    onChange={(e) => setConfigContent(e.target.value)}
                                    className="flex-1 w-full bg-[#0d1117] border border-gray-800 rounded-lg p-4 text-gray-300 font-mono text-sm focus:outline-none focus:border-blue-500 resize-none"
                                    spellCheck={false}
                                />
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-800 flex justify-end gap-3">
                            <button
                                onClick={() => setEditingConfig(false)}
                                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveConfig}
                                disabled={savingConfig}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                                {savingConfig ? <RotateCw size={16} className="animate-spin" /> : <Save size={16} />}
                                Save Configuration
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Site Editor Modal */}
            {editingSite && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col">
                        <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <Edit className="text-blue-400" /> {isNewSite ? 'Create New Site' : `Edit ${editingSite.name}`}
                            </h3>
                            <button
                                onClick={() => setEditingSite(null)}
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-6 flex-1 flex flex-col gap-4 overflow-hidden">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Site Name (Filename)</label>
                                <input
                                    type="text"
                                    value={editingSite.name}
                                    onChange={(e) => setEditingSite({ ...editingSite, name: e.target.value })}
                                    disabled={!isNewSite}
                                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
                                    placeholder="e.g., mysite.com"
                                />
                            </div>
                            <div className="flex-1 flex flex-col">
                                <label className="block text-sm font-medium text-gray-400 mb-1">Configuration Content</label>
                                <textarea
                                    value={editingSite.content}
                                    onChange={(e) => setEditingSite({ ...editingSite, content: e.target.value })}
                                    className="flex-1 w-full bg-[#0d1117] border border-gray-800 rounded-lg p-4 text-gray-300 font-mono text-sm focus:outline-none focus:border-blue-500 resize-none"
                                    spellCheck={false}
                                />
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-800 flex justify-end gap-3">
                            <button
                                onClick={() => setEditingSite(null)}
                                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveSite}
                                disabled={savingSite}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                                {savingSite ? <RotateCw size={16} className="animate-spin" /> : <Save size={16} />}
                                Save Configuration
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Nginx Log Viewer */}
            {showLogs && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="w-full max-w-5xl h-[80vh]">
                        <NginxLogViewer onClose={() => setShowLogs(false)} />
                    </div>
                </div>
            )}
        </div>
    );
}
