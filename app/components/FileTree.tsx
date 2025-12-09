'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { ChevronRight, ChevronDown, Folder, File as FileIcon, FolderOpen } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface FileItem {
    name: string;
    path: string;
    type: 'file' | 'directory';
}

interface ListResponse {
    items: FileItem[];
}

interface FileTreeNodeProps {
    name: string;
    path: string;
    type: 'file' | 'directory';
    level: number;
    onSelect: (path: string) => void;
    currentPath: string;
}

function FileTreeNode({ name, path, type, level, onSelect, currentPath }: FileTreeNodeProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    const shouldFetch = isExpanded && type === 'directory';
    const { data, error, isLoading } = useSWR<ListResponse>(
        shouldFetch ? `/api/files/list?path=${encodeURIComponent(path)}` : null,
        fetcher,
        {
            revalidateOnFocus: false,
            dedupingInterval: 60000 // Cache for 1 minute
        }
    );

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (type === 'directory') {
            setIsExpanded(!isExpanded);
        }
        onSelect(path);
    };

    const isSelected = currentPath === path;
    const paddingLeft = level * 12 + 12; // Indentation

    return (
        <div>
            <div
                className={`
                    flex items-center gap-1 py-1 pr-2 cursor-pointer select-none transition-colors text-sm
                    ${isSelected ? 'bg-blue-600/20 text-blue-400' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'}
                `}
                style={{ paddingLeft: `${paddingLeft}px` }}
                onClick={handleClick}
            >
                <span className="opacity-70">
                    {type === 'directory' && (
                        isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
                    )}
                    {type === 'file' && <span className="w-[14px]" />}
                </span>

                <span className={isSelected ? 'text-blue-400' : 'text-yellow-500'}>
                    {type === 'directory' ? (
                        isExpanded ? <FolderOpen size={16} /> : <Folder size={16} />
                    ) : (
                        <FileIcon size={16} className="text-gray-500" />
                    )}
                </span>

                <span className="truncate">{name}</span>
            </div>

            {isExpanded && type === 'directory' && (
                <div>
                    {isLoading && (
                        <div className="text-xs text-gray-600 py-1" style={{ paddingLeft: `${paddingLeft + 20}px` }}>
                            Loading...
                        </div>
                    )}
                    {data?.items?.map((item) => (
                        <FileTreeNode
                            key={item.path}
                            name={item.name}
                            path={item.path}
                            type={item.type}
                            level={level + 1}
                            onSelect={onSelect}
                            currentPath={currentPath}
                        />
                    ))}
                    {data?.items?.length === 0 && (
                        <div className="text-xs text-gray-600 py-1 italic" style={{ paddingLeft: `${paddingLeft + 20}px` }}>
                            Empty
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default function FileTree({ currentPath, onNavigate }: { currentPath: string, onNavigate: (path: string) => void }) {
    return (
        <div className="h-full overflow-y-auto py-2 custom-scrollbar">
            <FileTreeNode
                name="Root (/)"
                path="/"
                type="directory"
                level={0}
                onSelect={onNavigate}
                currentPath={currentPath}
            />
        </div>
    );
}
