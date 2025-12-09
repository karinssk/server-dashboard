'use client';

import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { Shield, Plus, Trash2, RefreshCw, Power, AlertTriangle, CheckCircle } from 'lucide-react';
import Swal from 'sweetalert2';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface FirewallRule {
    to: string;
    action: string;
    from: string;
    ipv6: boolean;
}

interface FirewallStatus {
    status: string;
    rules: FirewallRule[];
}

export default function FirewallPage() {
    const { data, error, isLoading } = useSWR<FirewallStatus>('/api/firewall/status', fetcher);

    const [port, setPort] = useState('');
    const [protocol, setProtocol] = useState('tcp');
    const [actionType, setActionType] = useState('allow');

    const handleToggle = async () => {
        const newStatus = data?.status === 'active' ? 'disable' : 'enable';
        const confirmText = newStatus === 'disable'
            ? 'Disable Firewall? This may expose your server.'
            : 'Enable Firewall? Ensure SSH port (22) is allowed!';

        const result = await Swal.fire({
            title: 'Are you sure?',
            text: confirmText,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: newStatus === 'disable' ? '#d33' : '#10b981',
            confirmButtonText: `Yes, ${newStatus}`,
            background: '#1f2937',
            color: '#fff'
        });

        if (result.isConfirmed) {
            try {
                const res = await fetch('/api/firewall/action', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: newStatus }),
                });
                if (!res.ok) throw new Error('Failed to update firewall');
                mutate('/api/firewall/status');
                Swal.fire({
                    icon: 'success',
                    title: 'Updated',
                    text: `Firewall ${newStatus}d successfully`,
                    timer: 1500,
                    showConfirmButton: false,
                    background: '#1f2937',
                    color: '#fff'
                });
            } catch (error) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to update firewall',
                    background: '#1f2937',
                    color: '#fff'
                });
            }
        }
    };

    const handleAddRule = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!port) return;

        try {
            const res = await fetch('/api/firewall/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: actionType,
                    port,
                    protocol
                }),
            });

            if (!res.ok) throw new Error('Failed to add rule');

            setPort('');
            mutate('/api/firewall/status');
            Swal.fire({
                icon: 'success',
                title: 'Added',
                text: 'Rule added successfully',
                timer: 1500,
                showConfirmButton: false,
                background: '#1f2937',
                color: '#fff'
            });
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to add rule',
                background: '#1f2937',
                color: '#fff'
            });
        }
    };

    const handleDeleteRule = async (rule: FirewallRule) => {
        const result = await Swal.fire({
            title: 'Delete Rule?',
            text: `Remove ${rule.action} ${rule.to}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Yes, delete',
            background: '#1f2937',
            color: '#fff'
        });

        if (result.isConfirmed) {
            try {
                const res = await fetch('/api/firewall/action', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'delete', rule }),
                });

                if (!res.ok) throw new Error('Failed to delete rule');

                mutate('/api/firewall/status');
                Swal.fire({
                    icon: 'success',
                    title: 'Deleted',
                    text: 'Rule deleted successfully',
                    timer: 1500,
                    showConfirmButton: false,
                    background: '#1f2937',
                    color: '#fff'
                });
            } catch (error) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to delete rule',
                    background: '#1f2937',
                    color: '#fff'
                });
            }
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <header className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent flex items-center gap-3">
                        <Shield className="text-green-500" /> Firewall Manager (UFW)
                    </h1>
                    <p className="text-gray-400 mt-2">Manage network access and security rules</p>
                </div>

                <div className="flex items-center gap-4">
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${data?.status === 'active' ? 'bg-green-500/10 border-green-500/50 text-green-400' : 'bg-red-500/10 border-red-500/50 text-red-400'}`}>
                        {data?.status === 'active' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
                        <span className="font-medium uppercase tracking-wider text-sm">{data?.status || 'Unknown'}</span>
                    </div>

                    <button
                        onClick={handleToggle}
                        className={`p-3 rounded-lg transition-colors ${data?.status === 'active' ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'}`}
                        title={data?.status === 'active' ? 'Disable Firewall' : 'Enable Firewall'}
                    >
                        <Power size={20} />
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Add Rule Form */}
                <div className="lg:col-span-1">
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 sticky top-8">
                        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <Plus size={20} className="text-blue-400" /> Add New Rule
                        </h2>
                        <form onSubmit={handleAddRule} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Action</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setActionType('allow')}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${actionType === 'allow' ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                                    >
                                        ALLOW
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActionType('deny')}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${actionType === 'deny' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                                    >
                                        DENY
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Port</label>
                                <input
                                    type="text"
                                    value={port}
                                    onChange={(e) => setPort(e.target.value)}
                                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-white font-mono focus:border-blue-500 focus:outline-none"
                                    placeholder="e.g. 80, 443, 3000-3005"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Protocol</label>
                                <select
                                    value={protocol}
                                    onChange={(e) => setProtocol(e.target.value)}
                                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                                >
                                    <option value="tcp">TCP</option>
                                    <option value="udp">UDP</option>
                                    <option value="">Both</option>
                                </select>
                            </div>

                            <button
                                type="submit"
                                className="w-full mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                <Plus size={18} /> Add Rule
                            </button>
                        </form>
                    </div>
                </div>

                {/* Rules List */}
                <div className="lg:col-span-2">
                    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-950 text-gray-400 text-xs uppercase">
                                    <tr>
                                        <th className="px-6 py-4 font-medium">To</th>
                                        <th className="px-6 py-4 font-medium">Action</th>
                                        <th className="px-6 py-4 font-medium">From</th>
                                        <th className="px-6 py-4 font-medium text-right"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800">
                                    {isLoading ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                                <RefreshCw className="animate-spin inline-block mr-2" /> Loading...
                                            </td>
                                        </tr>
                                    ) : data?.rules?.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                                No rules found.
                                            </td>
                                        </tr>
                                    ) : (
                                        data?.rules?.map((rule, idx) => (
                                            <tr key={idx} className="hover:bg-gray-800/50 transition-colors group">
                                                <td className="px-6 py-4 font-mono text-blue-400">
                                                    {rule.to}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${rule.action === 'ALLOW' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                                        {rule.action}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-gray-300">
                                                    {rule.from}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        onClick={() => handleDeleteRule(rule)}
                                                        className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                        title="Delete Rule"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
