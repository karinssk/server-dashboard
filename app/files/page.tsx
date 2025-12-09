'use client';

import { useState, useRef } from 'react';
import { Folder, File, ArrowLeft, Home, RefreshCw, Plus, Trash2, Edit2, MoreVertical, FileText, FolderPlus, FilePlus, Upload, Download, Archive, PackageOpen } from 'lucide-react';
import useSWR, { mutate } from 'swr';
import Swal from 'sweetalert2';
import FileEditor from '../components/FileEditor';
import FileTree from '../components/FileTree';

const fetcher = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) {
        const error = new Error('An error occurred while fetching the data.');
        try {
            const info = await res.json();
            (error as any).info = info;
            (error as any).message = info.error || 'Failed to fetch';
        } catch (e) {
            // Ignore json parse error
        }
        throw error;
    }
    return res.json();
};

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
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { data, error, isLoading } = useSWR<ListResponse>(`/api/files/list?path=${encodeURIComponent(currentPath)}`, fetcher);

    const handleNavigate = (path: string) => {
        setCurrentPath(path);
        setSelectedItems(new Set()); // Clear selection on navigate
    };

    const handleUp = () => {
        if (!data) return;
        const parts = currentPath.split(data.separator).filter(Boolean);
        parts.pop();
        const newPath = data.separator + parts.join(data.separator);
        // Ensure root is handled correctly (especially on Windows if we ever support it, but for now Linux/Mac)
        setCurrentPath(newPath || '/');
        setSelectedItems(new Set());
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const toggleSelection = (path: string, multi: boolean) => {
        const newSet = new Set(multi ? selectedItems : []);
        if (newSet.has(path)) {
            newSet.delete(path);
        } else {
            newSet.add(path);
        }
        setSelectedItems(newSet);
    };

    const handleDelete = async (items: FileItem[]) => {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: `Delete ${items.length} item(s)? This cannot be undone.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete!',
            background: '#1f2937',
            color: '#fff'
        });

        if (result.isConfirmed) {
            try {
                for (const item of items) {
                    await fetch('/api/files/action', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'delete', path: item.path }),
                    });
                }
                mutate(`/api/files/list?path=${encodeURIComponent(currentPath)}`);
                setSelectedItems(new Set());
                Swal.fire({
                    title: 'Deleted!',
                    text: 'Items have been deleted.',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false,
                    background: '#1f2937',
                    color: '#fff'
                });
            } catch (error) {
                Swal.fire({
                    title: 'Error',
                    text: 'Failed to delete items',
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

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const formData = new FormData();
        formData.append('file', files[0]);
        formData.append('path', currentPath);

        try {
            const res = await fetch('/api/files/upload', {
                method: 'POST',
                body: formData,
            });
            if (!res.ok) throw new Error('Failed to upload');
            mutate(`/api/files/list?path=${encodeURIComponent(currentPath)}`);
            Swal.fire({
                icon: 'success',
                title: 'Uploaded',
                text: 'File uploaded successfully',
                timer: 1500,
                showConfirmButton: false,
                background: '#1f2937',
                color: '#fff'
            });
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to upload file',
                background: '#1f2937',
                color: '#fff'
            });
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDownload = (item: FileItem) => {
        const link = document.createElement('a');
        link.href = `/api/files/download?path=${encodeURIComponent(item.path)}`;
        link.download = item.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleZip = async () => {
        if (selectedItems.size === 0) return;

        const { value: zipName } = await Swal.fire({
            title: 'Compress to Zip',
            input: 'text',
            inputValue: 'archive.zip',
            showCancelButton: true,
            background: '#1f2937',
            color: '#fff'
        });

        if (zipName) {
            try {
                const destination = (currentPath === '/' ? '' : currentPath) + '/' + zipName;
                const res = await fetch('/api/files/archive', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'zip',
                        paths: Array.from(selectedItems),
                        destination
                    }),
                });
                if (!res.ok) throw new Error('Failed to create zip');
                mutate(`/api/files/list?path=${encodeURIComponent(currentPath)}`);
                setSelectedItems(new Set());
                Swal.fire({
                    icon: 'success',
                    title: 'Compressed',
                    text: 'Archive created successfully',
                    timer: 1500,
                    showConfirmButton: false,
                    background: '#1f2937',
                    color: '#fff'
                });
            } catch (error) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to create archive',
                    background: '#1f2937',
                    color: '#fff'
                });
            }
        }
    };

    const handleUnzip = async (item: FileItem) => {
        const result = await Swal.fire({
            title: 'Extract Here?',
            text: `Extract ${item.name} to current directory?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, extract',
            background: '#1f2937',
            color: '#fff'
        });

        if (result.isConfirmed) {
            try {
                const res = await fetch('/api/files/archive', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'unzip',
                        targetPath: item.path,
                        destination: currentPath
                    }),
                });
                if (!res.ok) throw new Error('Failed to extract');
                mutate(`/api/files/list?path=${encodeURIComponent(currentPath)}`);
                Swal.fire({
                    icon: 'success',
                    title: 'Extracted',
                    text: 'Archive extracted successfully',
                    timer: 1500,
                    showConfirmButton: false,
                    background: '#1f2937',
                    color: '#fff'
                });
            } catch (error) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to extract archive',
                    background: '#1f2937',
                    color: '#fff'
                });
            }
        }
    };

    return (
        <div className="flex h-screen overflow-hidden">
            {/* Left Sidebar - File Tree */}
            <div className="w-64 bg-gray-950 border-r border-gray-800 flex flex-col shrink-0">
                <div className="p-4 border-b border-gray-800">
                    <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Explorer</h2>
                </div>
                <div className="flex-1 overflow-hidden">
                    <FileTree currentPath={currentPath} onNavigate={handleNavigate} />
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 bg-gray-900">
                <div className="p-6 pb-0">
                    <header className="mb-6 flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent flex items-center gap-3">
                                <Folder className="text-blue-500" /> File Manager
                            </h1>
                            <p className="text-gray-400 mt-2">Explore and manage server files</p>
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                onChange={handleUpload}
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                            >
                                <Upload size={16} /> Upload
                            </button>
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

                    {/* Toolbar / Actions for Selection */}
                    {selectedItems.size > 0 && (
                        <div className="mb-4 bg-blue-900/20 border border-blue-500/30 rounded-lg p-2 flex items-center gap-4">
                            <span className="text-blue-400 text-sm font-medium px-2">{selectedItems.size} selected</span>
                            <div className="h-4 w-px bg-blue-500/30"></div>
                            <button
                                onClick={handleZip}
                                className="text-gray-300 hover:text-white text-sm flex items-center gap-1 px-2 py-1 rounded hover:bg-blue-500/20 transition-colors"
                            >
                                <Archive size={16} /> Compress
                            </button>
                            <button
                                onClick={() => {
                                    const itemsToDelete = data?.items.filter(i => selectedItems.has(i.path)) || [];
                                    handleDelete(itemsToDelete);
                                }}
                                className="text-red-400 hover:text-red-300 text-sm flex items-center gap-1 px-2 py-1 rounded hover:bg-red-500/20 transition-colors"
                            >
                                <Trash2 size={16} /> Delete
                            </button>
                        </div>
                    )}

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
                </div>

                {/* File List */}
                <div className="flex-1 px-6 pb-6 overflow-hidden flex flex-col">
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
                                            <th className="px-6 py-3 font-medium w-12">
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-gray-700 bg-gray-800 text-blue-600 focus:ring-blue-500"
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedItems(new Set(data?.items.map(i => i.path)));
                                                        } else {
                                                            setSelectedItems(new Set());
                                                        }
                                                    }}
                                                    checked={(data?.items?.length ?? 0) > 0 && selectedItems.size === (data?.items?.length ?? 0)}
                                                />
                                            </th>
                                            <th className="px-6 py-3 font-medium w-12"></th>
                                            <th className="px-6 py-3 font-medium">Name</th>
                                            <th className="px-6 py-3 font-medium w-32">Size</th>
                                            <th className="px-6 py-3 font-medium w-48">Modified</th>
                                            <th className="px-6 py-3 font-medium w-32 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-800">
                                        {data?.items?.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                                    Empty directory
                                                </td>
                                            </tr>
                                        )}
                                        {data?.items?.map((item) => (
                                            <tr
                                                key={item.name}
                                                className={`hover:bg-gray-800/50 transition-colors group cursor-pointer ${selectedItems.has(item.path) ? 'bg-blue-900/10' : ''}`}
                                                onClick={(e) => {
                                                    if (e.ctrlKey || e.metaKey) {
                                                        toggleSelection(item.path, true);
                                                    } else {
                                                        if (item.type === 'directory') {
                                                            handleNavigate(item.path);
                                                        } else {
                                                            setEditingFile(item.path);
                                                        }
                                                    }
                                                }}
                                            >
                                                <td className="px-6 py-3" onClick={(e) => e.stopPropagation()}>
                                                    <input
                                                        type="checkbox"
                                                        className="rounded border-gray-700 bg-gray-800 text-blue-600 focus:ring-blue-500"
                                                        checked={selectedItems.has(item.path)}
                                                        onChange={() => toggleSelection(item.path, true)}
                                                    />
                                                </td>
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
                                                        {item.type === 'file' && (
                                                            <button
                                                                onClick={() => handleDownload(item)}
                                                                className="p-1.5 text-green-400 hover:bg-green-500/10 rounded-lg transition-colors"
                                                                title="Download"
                                                            >
                                                                <Download size={16} />
                                                            </button>
                                                        )}
                                                        {item.name.endsWith('.zip') && (
                                                            <button
                                                                onClick={() => handleUnzip(item)}
                                                                className="p-1.5 text-yellow-400 hover:bg-yellow-500/10 rounded-lg transition-colors"
                                                                title="Extract"
                                                            >
                                                                <PackageOpen size={16} />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleRename(item)}
                                                            className="p-1.5 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                                                            title="Rename"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete([item])}
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
                </div>
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
