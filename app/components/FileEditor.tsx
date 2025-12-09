'use client';

import { useState, useEffect } from 'react';
import { X, Save, FileText } from 'lucide-react';
import Swal from 'sweetalert2';

interface FileEditorProps {
    path: string;
    onClose: () => void;
    onSave: () => void;
}

export default function FileEditor({ path, onClose, onSave }: FileEditorProps) {
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchContent = async () => {
            try {
                const res = await fetch(`/api/files/content?path=${encodeURIComponent(path)}`);
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                setContent(data.content);
            } catch (error: any) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: error.message || 'Failed to load file content',
                    background: '#1f2937',
                    color: '#fff'
                });
                onClose();
            } finally {
                setLoading(false);
            }
        };

        fetchContent();
    }, [path, onClose]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/files/content', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path, content }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            Swal.fire({
                icon: 'success',
                title: 'Saved',
                text: 'File saved successfully',
                timer: 1500,
                showConfirmButton: false,
                background: '#1f2937',
                color: '#fff'
            });
            onSave();
        } catch (error: any) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message || 'Failed to save file',
                background: '#1f2937',
                color: '#fff'
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-800">
                    <div className="flex items-center gap-3">
                        <FileText className="text-blue-400" size={20} />
                        <div>
                            <h3 className="font-semibold text-white">Edit File</h3>
                            <p className="text-xs text-gray-400 font-mono">{path}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleSave}
                            disabled={saving || loading}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                            <Save size={16} /> {saving ? 'Saving...' : 'Save'}
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Editor Area */}
                <div className="flex-1 relative">
                    {loading ? (
                        <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                            Loading content...
                        </div>
                    ) : (
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="w-full h-full bg-gray-950 text-gray-300 font-mono p-4 resize-none focus:outline-none text-sm leading-relaxed"
                            spellCheck={false}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
