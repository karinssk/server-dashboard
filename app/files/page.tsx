'use client';

import { useState, useEffect } from 'react';
import { Folder, File, ArrowLeft, Home, RefreshCw, Plus, Trash2, Edit2, MoreVertical, FileText, FolderPlus, FilePlus } from 'lucide-react';
import useSWR, { mutate } from 'swr';
import Swal from 'sweetalert2';
import FileEditor from '../components/FileEditor';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface FileItem {
    name: string;
    path: string;
    type: 'file' | 'directory';
    size: number;
    modified: string;
}

interface ListResponse {
    path: string;
    items: FileItem[];
    separator: string;
    os: string;
}

export default function FilesPage() {
    const [currentPath, setCurrentPath] = useState('/');
    const [editingFile, setEditingFile] = useState<string | null>(null);

    const { data, error, isLoading } = useSWR<ListResponse>(`/api/files/list?path=${encodeURIComponent(currentPath)}`, fetcher);

    const handleNavigate = (path: string) => {
        setCurrentPath(path);
    };

    const handleUp = () => {
        if (!data) return;
        const parts = currentPath.split(data.separator).filter(Boolean);
        parts.pop();
        const newPath = data.separator + parts.join(data.separator);
        // Ensure root is handled correctly (especially on Windows if we ever support it, but for now Linux/Mac)
        setCurrentPath(newPath || '/');
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const handleDelete = async (item: FileItem) => {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: `Delete ${item.name}? This cannot be undone.`,
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
                const res = await fetch('/api/files/action', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'delete', path: item.path }),
                });
                if (!res.ok) throw new Error('Failed to delete');
                mutate(`/api/files/list?path=${encodeURIComponent(currentPath)}`);
                Swal.fire({
                    title: 'Deleted!',
                    text: 'Item has been deleted.',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false,
                    background: '#1f2937',
                    color: '#fff'
                });
            } catch (error) {
                Swal.fire({
                    title: 'Error',
                    text: 'Failed to delete item',
                    icon: 'error',
                    background: '#1f2937',
                    color: '#fff'
                });
            }
        }
    };

    const handleRename = async (item: FileItem) => {
        const { value: newName } = await Swal.fire({
            title: 'Rename',
            input: 'text',
            inputValue: item.name,
            showCancelButton: true,
            inputValidator: (value) => {
                if (!value) return 'You need to write something!';
            },
            background: '#1f2937',
            color: '#fff'
        });

        if (newName && newName !== item.name) {
            try {
                // Construct new path. 
                // We need to be careful about the separator.
                const parentDir = item.path.substring(0, item.path.lastIndexOf(data?.separator || '/'));
                const newPath = parentDir + (data?.separator || '/') + newName;

                const res = await fetch('/api/files/action', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'rename', path: item.path, newPath }),
                });
                if (!res.ok) throw new Error('Failed to rename');
                mutate(`/api/files/list?path=${encodeURIComponent(currentPath)}`);
            } catch (error) {
                Swal.fire({
                    title: 'Error',
                    text: 'Failed to rename item',
                    icon: 'error',
                    background: '#1f2937',
                    color: '#fff'
                });
            }
        }
    };

    const handleCreateFolder = async () => {
        const { value: folderName } = await Swal.fire({
            title: 'New Folder',
            input: 'text',
            inputPlaceholder: 'Folder Name',
            showCancelButton: true,
            inputValidator: (value) => {
                if (!value) return 'You need to write something!';
            },
            background: '#1f2937',
            color: '#fff'
        });

        if (folderName) {
            try {
                const newPath = (currentPath === '/' ? '' : currentPath) + '/' + folderName;
                const res = await fetch('/api/files/action', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'mkdir', path: newPath }),
                });
                if (!res.ok) throw new Error('Failed to create folder');
                mutate(`/api/files/list?path=${encodeURIComponent(currentPath)}`);
            } catch (error) {
                Swal.fire({
                    title: 'Error',
                    text: 'Failed to create folder',
                    icon: 'error',
                    background: '#1f2937',
                    color: '#fff'
                });
            }
        }
    };

    const handleCreateFile = async () => {
        const { value: fileName } = await Swal.fire({
            title: 'New File',
            input: 'text',
            inputPlaceholder: 'File Name.txt',
            showCancelButton: true,
            inputValidator: (value) => {
                if (!value) return 'You need to write something!';
            },
            background: '#1f2937',
            color: '#fff'
        });

        if (fileName) {
            try {
                const newPath = (currentPath === '/' ? '' : currentPath) + '/' + fileName;
                // Create empty file
                const res = await fetch('/api/files/content', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ path: newPath, content: '' }),
                });
                if (!res.ok) throw new Error('Failed to create file');
                mutate(`/api/files/list?path=${encodeURIComponent(currentPath)}`);
                // Open editor immediately
                setEditingFile(newPath);
            } catch (error) {
                Swal.fire({
                    title: 'Error',
                    text: 'Failed to create file',
                    icon: 'error',
                    background: '#1f2937',
                    color: '#fff'
                });
            }
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto h-screen flex flex-col">
            <header className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent flex items-center gap-3">
                        <Folder className="text-blue-500" /> File Manager
                    </h1>
                    <p className="text-gray-400 mt-2">Explore and manage server files</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleCreateFolder}
                        className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                    >
                        <FolderPlus size={16} /> New Folder
                    </button>
                    <button
                        onClick={handleCreateFile}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                    >
                        <FilePlus size={16} /> New File
                    </button>
                </div>
            </header>

            {/* Navigation Bar */}
            <div className="bg-gray-900 border border-gray-800 rounded-t-xl p-4 flex items-center gap-4">
                <button
                    onClick={handleUp}
                    disabled={currentPath === '/'}
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
                    title="Go Up"
                >
                    <ArrowLeft size={20} />
                </button>
                <button
                    onClick={() => setCurrentPath('/')}
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                    title="Go Root"
                >
                    <Home size={20} />
                </button>

                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        // Trigger re-fetch by updating state (which is already bound to input)
                        mutate(`/api/files/list?path=${encodeURIComponent(currentPath)}`);
                    }}
                    className="flex-1"
                >
                    <input
                        type="text"
                        value={currentPath}
                        onChange={(e) => setCurrentPath(e.target.value)}
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-gray-300 font-mono text-sm focus:outline-none focus:border-blue-500 transition-colors"
                        placeholder="/path/to/directory"
                    />
                </form>

                <button
                    onClick={() => mutate(`/api/files/list?path=${encodeURIComponent(currentPath)}`)}
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                    title="Refresh"
                >
                    <RefreshCw size={20} />
                </button>
            </div>

            {/* File List */}
            <div className="flex-1 bg-gray-900 border-x border-b border-gray-800 rounded-b-xl overflow-hidden flex flex-col">
                {isLoading ? (
                    <div className="flex-1 flex items-center justify-center text-gray-500">
                        <RefreshCw className="animate-spin mr-2" /> Loading...
                    </div>
                ) : error ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-red-500 p-8 text-center">
                        <p className="text-xl font-bold mb-2">Access Denied or Error</p>
                        <p className="text-sm opacity-80">{error.message || 'Failed to list directory'}</p>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-950 text-gray-400 text-xs uppercase sticky top-0 z-10">
                                <tr>
                                    <th className="px-6 py-3 font-medium w-12"></th>
                                    <th className="px-6 py-3 font-medium">Name</th>
                                    <th className="px-6 py-3 font-medium w-32">Size</th>
                                    <th className="px-6 py-3 font-medium w-48">Modified</th>
                                    <th className="px-6 py-3 font-medium w-32 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {data?.items.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                            Empty directory
                                        </td>
                                    </tr>
                                )}
                                {data?.items.map((item) => (
                                    <tr
                                        key={item.name}
                                        className="hover:bg-gray-800/50 transition-colors group cursor-pointer"
                                        onClick={() => {
                                            if (item.type === 'directory') {
                                                handleNavigate(item.path);
                                            } else {
                                                setEditingFile(item.path);
                                            }
                                        }}
                                    >
                                        <td className="px-6 py-3 text-gray-400">
                                            {item.type === 'directory' ? (
                                                <Folder className="text-blue-400 fill-blue-400/20" size={20} />
                                            ) : (
                                                <FileText className="text-gray-400" size={20} />
                                            )}
                                        </td>
                                        <td className="px-6 py-3 font-medium text-gray-200">
                                            {item.name}
                                        </td>
                                        <td className="px-6 py-3 text-gray-500 text-sm font-mono">
                                            {item.type === 'file' ? formatSize(item.size) : '-'}
                                        </td>
                                        <td className="px-6 py-3 text-gray-500 text-sm">
                                            {new Date(item.modified).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleRename(item)}
                                                    className="p-1.5 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                                                    title="Rename"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(item)}
                                                    className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Editor Modal */}
            {editingFile && (
                <FileEditor
                    path={editingFile}
                    onClose={() => setEditingFile(null)}
                    onSave={() => mutate(`/api/files/list?path=${encodeURIComponent(currentPath)}`)}
                />
            )}
        </div>
    );
}
