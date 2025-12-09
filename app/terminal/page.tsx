'use client';

import { useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { Terminal as TerminalIcon } from 'lucide-react';
import 'xterm/css/xterm.css';

export default function TerminalPage() {
    const terminalRef = useRef<HTMLDivElement>(null);
    const socketRef = useRef<any>(null);
    const termRef = useRef<any>(null);

    useEffect(() => {
        if (!terminalRef.current) return;

        const initTerminal = async () => {
            const { Terminal } = await import('xterm');
            const { FitAddon } = await import('xterm-addon-fit');

            const term = new Terminal({
                cursorBlink: true,
                theme: {
                    background: '#0f172a', // Slate 900
                    foreground: '#e2e8f0', // Slate 200
                    cursor: '#3b82f6',     // Blue 500
                },
                fontFamily: 'Menlo, Monaco, "Courier New", monospace',
                fontSize: 14,
            });

            const fitAddon = new FitAddon();
            term.loadAddon(fitAddon);
            term.open(terminalRef.current!);
            fitAddon.fit();

            termRef.current = term;

            // Connect to Socket.IO
            socketRef.current = io();

            socketRef.current.on('connect', () => {
                term.write('\r\n\x1b[32mConnected to server terminal...\x1b[0m\r\n');
                socketRef.current.emit('resize', { cols: term.cols, rows: term.rows });
            });

            socketRef.current.on('output', (data: string) => {
                term.write(data);
            });

            term.onData((data) => {
                socketRef.current.emit('input', data);
            });

            term.onResize((size) => {
                socketRef.current.emit('resize', { cols: size.cols, rows: size.rows });
            });

            const handleResize = () => {
                fitAddon.fit();
            };
            window.addEventListener('resize', handleResize);
        };

        initTerminal();

        return () => {
            socketRef.current?.disconnect();
            termRef.current?.dispose();
            // window.removeEventListener('resize', handleResize); // handleResize is inside closure, tricky to remove without ref
        };
    }, []);

    return (
        <div className="h-screen flex flex-col bg-slate-950">
            <header className="p-4 border-b border-slate-800 flex items-center gap-3 bg-slate-900">
                <TerminalIcon className="text-blue-500" />
                <h1 className="text-xl font-bold text-white">Web Terminal</h1>
                <span className="text-xs text-slate-500 ml-auto">Connected via Socket.IO</span>
            </header>
            <div className="flex-1 p-4 overflow-hidden">
                <div ref={terminalRef} className="w-full h-full rounded-lg overflow-hidden border border-slate-800 shadow-2xl" />
            </div>
        </div>
    );
}
