'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Server, Globe, Cloud, Code, Settings, LogOut, Folder, Clock, Shield, Terminal } from 'lucide-react';

const menuItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'PHP Manager', href: '/php', icon: Code },
    { name: 'Nginx', href: '/nginx', icon: Server },
    { name: 'Apache', href: '/apache', icon: Globe },
    { name: 'Cloudflared', href: '/cloudflared', icon: Cloud },
    { name: 'File Manager', href: '/files', icon: Folder },
    { name: 'Cron Jobs', href: '/cron', icon: Clock },
    { name: 'Firewall', href: '/firewall', icon: Shield },
    { name: 'Terminal', href: '/terminal', icon: Terminal },
];

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();

    if (pathname === '/login') {
        return null;
    }

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            router.push('/login');
            router.refresh();
        } catch (error) {
            console.error('Logout failed', error);
        }
    };

    return (
        <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col h-screen sticky top-0">
            <div className="p-6 border-b border-gray-800">
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                    Server Admin
                </h1>
                <p className="text-xs text-gray-500 mt-1">v1.0.0</p>
            </div>

            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                                ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20'
                                : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
                                }`}
                        >
                            <Icon size={20} className={isActive ? 'text-blue-400' : 'text-gray-500 group-hover:text-gray-300'} />
                            <span className="font-medium">{item.name}</span>
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-gray-800 space-y-2">
                <button className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-gray-400 hover:bg-gray-800 hover:text-gray-100 transition-all duration-200">
                    <Settings size={20} className="text-gray-500" />
                    <span className="font-medium">Settings</span>
                </button>
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-all duration-200"
                >
                    <LogOut size={20} className="text-red-500" />
                    <span className="font-medium">Logout</span>
                </button>
            </div>
        </aside>
    );
}
