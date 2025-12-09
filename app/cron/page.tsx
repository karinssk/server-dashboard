'use client';

import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { Clock, Plus, Trash2, Edit2, Play, RefreshCw, Save, X } from 'lucide-react';
import Swal from 'sweetalert2';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface CronJob {
    id: number;
    schedule: string;
    command: string;
    original: string;
}

export default function CronPage() {
    const { data, error, isLoading } = useSWR<{ jobs: CronJob[] }>('/api/cron/list', fetcher);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingJob, setEditingJob] = useState<CronJob | null>(null);

    // Form state
    const [minute, setMinute] = useState('*');
    const [hour, setHour] = useState('*');
    const [dom, setDom] = useState('*');
    const [month, setMonth] = useState('*');
    const [dow, setDow] = useState('*');
    const [command, setCommand] = useState('');

    const openModal = (job?: CronJob) => {
        if (job) {
            setEditingJob(job);
            const parts = job.schedule.split(' ');
            if (parts.length === 5) {
                setMinute(parts[0]);
                setHour(parts[1]);
                setDom(parts[2]);
                setMonth(parts[3]);
                setDow(parts[4]);
            } else {
                // Handle special cases or invalid parsing
                setMinute('*'); setHour('*'); setDom('*'); setMonth('*'); setDow('*');
            }
            setCommand(job.command);
        } else {
            setEditingJob(null);
            setMinute('*');
            setHour('*');
            setDom('*');
            setMonth('*');
            setDow('*');
            setCommand('');
        }
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!command) {
            Swal.fire('Error', 'Command is required', 'error');
            return;
        }

        const schedule = `${minute} ${hour} ${dom} ${month} ${dow}`;
        const action = editingJob ? 'update' : 'add';
        const body = {
            action,
            job: { schedule, command },
            index: editingJob?.id
        };

        try {
            const res = await fetch('/api/cron/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!res.ok) throw new Error('Failed to save cron job');

            mutate('/api/cron/list');
            setIsModalOpen(false);
            Swal.fire({
                icon: 'success',
                title: 'Saved',
                text: 'Cron job saved successfully',
                timer: 1500,
                showConfirmButton: false,
                background: '#1f2937',
                color: '#fff'
            });
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to save cron job',
                background: '#1f2937',
                color: '#fff'
            });
        }
    };

    const handleDelete = async (job: CronJob) => {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: 'Delete this cron job?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!',
            background: '#1f2937',
            color: '#fff'
        });

        if (result.isConfirmed) {
            try {
                const res = await fetch('/api/cron/action', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'delete', index: job.id }),
                });

                if (!res.ok) throw new Error('Failed to delete cron job');

                mutate('/api/cron/list');
                Swal.fire({
                    icon: 'success',
                    title: 'Deleted',
                    text: 'Cron job deleted successfully',
                    timer: 1500,
                    showConfirmButton: false,
                    background: '#1f2937',
                    color: '#fff'
                });
            } catch (error) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to delete cron job',
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
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent flex items-center gap-3">
                        <Clock className="text-purple-500" /> Cron Job Manager
                    </h1>
                    <p className="text-gray-400 mt-2">Schedule and manage system tasks</p>
                </div>
                <button
                    onClick={() => openModal()}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 shadow-lg shadow-purple-900/20"
                >
                    <Plus size={20} /> Add Job
                </button>
            </header>

            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-950 text-gray-400 text-xs uppercase">
                            <tr>
                                <th className="px-6 py-4 font-medium">Schedule</th>
                                <th className="px-6 py-4 font-medium">Command</th>
                                <th className="px-6 py-4 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                                        <RefreshCw className="animate-spin inline-block mr-2" /> Loading...
                                    </td>
                                </tr>
                            ) : data?.jobs.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                                        No cron jobs found.
                                    </td>
                                </tr>
                            ) : (
                                data?.jobs.map((job) => (
                                    <tr key={job.id} className="hover:bg-gray-800/50 transition-colors">
                                        <td className="px-6 py-4 font-mono text-blue-400 whitespace-nowrap">
                                            {job.schedule}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-gray-300 break-all">
                                            {job.command}
                                        </td>
                                        <td className="px-6 py-4 text-right whitespace-nowrap">
                                            <button
                                                onClick={() => openModal(job)}
                                                className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors mr-2"
                                                title="Edit"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(job)}
                                                className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                title="Delete"
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

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden">
                        <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-950">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                {editingJob ? <Edit2 size={20} /> : <Plus size={20} />}
                                {editingJob ? 'Edit Cron Job' : 'Add New Cron Job'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-5 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1">Minute</label>
                                    <input
                                        type="text"
                                        value={minute}
                                        onChange={(e) => setMinute(e.target.value)}
                                        className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-white font-mono text-center focus:border-purple-500 focus:outline-none"
                                        placeholder="*"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1">Hour</label>
                                    <input
                                        type="text"
                                        value={hour}
                                        onChange={(e) => setHour(e.target.value)}
                                        className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-white font-mono text-center focus:border-purple-500 focus:outline-none"
                                        placeholder="*"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1">Day</label>
                                    <input
                                        type="text"
                                        value={dom}
                                        onChange={(e) => setDom(e.target.value)}
                                        className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-white font-mono text-center focus:border-purple-500 focus:outline-none"
                                        placeholder="*"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1">Month</label>
                                    <input
                                        type="text"
                                        value={month}
                                        onChange={(e) => setMonth(e.target.value)}
                                        className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-white font-mono text-center focus:border-purple-500 focus:outline-none"
                                        placeholder="*"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1">Week</label>
                                    <input
                                        type="text"
                                        value={dow}
                                        onChange={(e) => setDow(e.target.value)}
                                        className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-white font-mono text-center focus:border-purple-500 focus:outline-none"
                                        placeholder="*"
                                    />
                                </div>
                            </div>

                            <div className="bg-gray-800/50 rounded-lg p-3 text-xs text-gray-400 flex justify-between">
                                <span>Schedule Preview:</span>
                                <span className="font-mono text-blue-400">{`${minute} ${hour} ${dom} ${month} ${dow}`}</span>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Command</label>
                                <input
                                    type="text"
                                    value={command}
                                    onChange={(e) => setCommand(e.target.value)}
                                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-3 text-white font-mono focus:border-purple-500 focus:outline-none"
                                    placeholder="/usr/bin/php /var/www/script.php"
                                />
                                <p className="text-xs text-gray-500 mt-2">Enter the full path to the command or script.</p>
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-800 bg-gray-950 flex justify-end gap-3">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                            >
                                <Save size={18} /> Save Job
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
