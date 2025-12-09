'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Terminal, Trash2, Pause, Play } from 'lucide-react';

interface LogEntry {
    timestamp: number;
    message: string;
    service: string;
    priority: string;
}

interface PHPLogViewerProps {
    service: string; // 'all' or specific service name
    onClose: () => void;
}

export default function PHPLogViewer({ service, onClose }: PHPLogViewerProps) {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isPaused, setIsPaused] = useState(false);
    const logsEndRef = useRef<HTMLDivElement>(null);
    const eventSourceRef = useRef<EventSource | null>(null);

    useEffect(() => {
        const url = `/api/php/logs?service=${service}`;
        const eventSource = new EventSource(url);
        eventSourceRef.current = eventSource;

        eventSource.onmessage = (event) => {
            if (isPaused) return;
            try {
                const data = JSON.parse(event.data);
                setLogs((prev) => [...prev, data].slice(-1000)); // Keep last 1000 logs
            } catch (e) {
                console.error('Failed to parse log:', e);
            }
        };

        eventSource.onerror = (err) => {
            console.error('EventSource failed:', err);
            eventSource.close();
        };

        return () => {
            eventSource.close();
        };
    }, [service, isPaused]);

    useEffect(() => {
        if (!isPaused) {
            logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs, isPaused]);

    const clearLogs = () => setLogs([]);
    const togglePause = () => setIsPaused(!isPaused);

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 w-full max-w-5xl h-[80vh] rounded-xl border border-gray-800 shadow-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-gray-900">
                    <div className="flex items-center gap-3">
                        <Terminal className="text-purple-400" size={20} />
                        <h3 className="font-mono text-gray-200">
                            PHP Logs: <span className="text-blue-400">{service === 'all' ? 'All Services' : service}</span>
                        </h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={togglePause}
                            className={`p-2 rounded-lg transition-colors ${isPaused ? 'bg-yellow-500/10 text-yellow-400' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                            title={isPaused ? "Resume Auto-scroll" : "Pause Auto-scroll"}
                        >
                            {isPaused ? <Play size={18} /> : <Pause size={18} />}
                        </button>
                        <button
                            onClick={clearLogs}
                            className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                            title="Clear Logs"
                        >
                            <Trash2 size={18} />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:bg-gray-700 transition-colors"
                            title="Close"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Log Content */}
                <div className="flex-1 overflow-y-auto p-4 font-mono text-sm bg-black custom-scrollbar">
                    {logs.length === 0 && (
                        <div className="text-gray-600 text-center mt-10">Waiting for logs...</div>
                    )}
                    {logs.map((log, index) => (
                        <div key={index} className="mb-1 break-words border-b border-gray-900/50 pb-1">
                            <span className="text-gray-500 select-none mr-2">
                                [{new Date(log.timestamp).toLocaleTimeString()}]
                            </span>
                            {service === 'all' && (
                                <span className="text-purple-400 select-none mr-2">[{log.service}]</span>
                            )}
                            <span className={log.priority <= '3' ? 'text-red-400' : 'text-green-400'}>
                                {log.priority <= '3' ? '[ERR] ' : '> '}
                            </span>
                            <span className="text-gray-300 whitespace-pre-wrap">{log.message}</span>
                        </div>
                    ))}
                    <div ref={logsEndRef} />
                </div>
            </div>
        </div>
    );
}
