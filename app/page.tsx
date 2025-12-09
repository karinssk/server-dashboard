
'use client';

import useSWR from 'swr';
import { useState } from 'react';
import { Play, Square, RotateCw, Activity, Cpu, HardDrive, Clock, User, Layers, FileText } from 'lucide-react';
import Swal from 'sweetalert2';
import MetricsDashboard from './components/MetricsDashboard';
import LogViewer from './components/LogViewer';

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

interface PM2Process {
  id: number;
  name: string;
  namespace: string;
  version: string;
  mode: string;
  pid: number;
  uptime: number;
  restarts: number;
  status: string;
  cpu: number;
  mem: number;
  user: string;
  watching: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function PM2Dashboard() {
  const { data: processes, error, mutate } = useSWR<PM2Process[]>('/api/pm2/list', fetcher, {
    refreshInterval: 3000,
  });

  const [loadingAction, setLoadingAction] = useState<number | null>(null);
  const [selectedLogProcess, setSelectedLogProcess] = useState<number | 'all' | null>(null);

  const handleAction = async (id: number, action: 'start' | 'stop' | 'restart') => {
    setLoadingAction(id);
    try {
      const res = await fetch('/api/pm2/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed');

      Toast.fire({
        icon: 'success',
        title: `Process ${action}ed successfully`
      });

      mutate(); // Refresh data immediately
    } catch (err: any) {
      console.error('Action failed:', err);
      Toast.fire({
        icon: 'error',
        title: `Failed to ${action} process`,
        text: err.message
      });
    } finally {
      setLoadingAction(null);
    }
  };

  const formatUptime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
  };

  const formatMemory = (bytes: number) => {
    return `${(bytes / 1024 / 1024).toFixed(1)}mb`;
  };

  if (error) return <div className="p-8 text-red-500">Failed to load PM2 data. Ensure the server is running.</div>;
  if (!processes) return <div className="p-8 text-gray-400">Loading PM2 processes...</div>;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              PM2 Dashboard
            </h1>
            <p className="text-gray-400 mt-2">Real-time process monitoring and control</p>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              Live Updates
            </div>
            <div>Total Processes: {processes.length}</div>
            <button
              onClick={() => setSelectedLogProcess('all')}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/20 transition-colors text-xs font-medium border border-blue-500/20"
            >
              <FileText size={14} />
              All Logs
            </button>
          </div>
        </header>

        <MetricsDashboard />

        <div className="bg-gray-900 rounded-xl border border-gray-800 shadow-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-800/50 text-gray-400 text-xs uppercase tracking-wider">
                  <th className="p-4 font-medium">ID</th>
                  <th className="p-4 font-medium">Name</th>
                  <th className="p-4 font-medium">PID</th>
                  <th className="p-4 font-medium">Uptime</th>
                  <th className="p-4 font-medium">Restarts</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">CPU</th>
                  <th className="p-4 font-medium">Mem</th>
                  <th className="p-4 font-medium">User</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 text-sm">
                {processes.map((proc) => (
                  <tr key={proc.id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="p-4 font-mono text-gray-500">#{proc.id}</td>
                    <td className="p-4 font-medium text-white">
                      <div className="flex flex-col">
                        <span>{proc.name}</span>
                        <span className="text-xs text-gray-500">{proc.mode}</span>
                      </div>
                    </td>
                    <td className="p-4 text-gray-400">{proc.pid}</td>
                    <td className="p-4 text-gray-300">
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-gray-500" />
                        {formatUptime(proc.uptime)}
                      </div>
                    </td>
                    <td className="p-4 text-gray-400">
                      <div className="flex items-center gap-2">
                        <RotateCw size={14} className="text-gray-500" />
                        {proc.restarts}
                      </div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${proc.status === 'online'
                          ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}
                      >
                        {proc.status}
                      </span>
                    </td>
                    <td className="p-4 text-gray-300">
                      <div className="flex items-center gap-2">
                        <Cpu size={14} className="text-gray-500" />
                        {proc.cpu}%
                      </div>
                    </td>
                    <td className="p-4 text-gray-300">
                      <div className="flex items-center gap-2">
                        <HardDrive size={14} className="text-gray-500" />
                        {formatMemory(proc.mem)}
                      </div>
                    </td>
                    <td className="p-4 text-gray-400">
                      <div className="flex items-center gap-2">
                        <User size={14} className="text-gray-500" />
                        {proc.user}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedLogProcess(proc.id)}
                          className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:bg-gray-700 transition-colors mr-2"
                          title="View Logs"
                        >
                          <FileText size={16} />
                        </button>
                        <button
                          onClick={() => handleAction(proc.id, 'stop')}
                          disabled={loadingAction === proc.id || proc.status !== 'online'}
                          className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          title="Stop"
                        >
                          <Square size={16} fill="currentColor" />
                        </button>
                        <button
                          onClick={() => handleAction(proc.id, 'restart')}
                          disabled={loadingAction === proc.id}
                          className="p-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          title="Restart"
                        >
                          <RotateCw size={16} />
                        </button>
                        <button
                          onClick={() => handleAction(proc.id, 'start')}
                          disabled={loadingAction === proc.id || proc.status === 'online'}
                          className="p-2 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          title="Start"
                        >
                          <Play size={16} fill="currentColor" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {selectedLogProcess !== null && (
          <LogViewer
            processId={selectedLogProcess}
            onClose={() => setSelectedLogProcess(null)}
          />
        )}
      </div>
    </div>
  );
}
