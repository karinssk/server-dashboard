
import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import util from 'util';

export const dynamic = 'force-dynamic';

const execAsync = util.promisify(exec);

export async function GET() {
    try {
        const [versionData, extensionsData, iniData, pathData] = await Promise.all([
            execAsync('php -v'),
            execAsync('php -m'),
            execAsync('php --ini'),
            execAsync('which php'),
        ]);

        const version = versionData.stdout.split('\n')[0];
        const rawExtensions = extensionsData.stdout.split('\n').filter(Boolean).filter(line => !line.startsWith('['));
        const extensions = [...new Set(rawExtensions)];
        const executable = pathData.stdout.trim();

        // Parse INI path
        const iniLines = iniData.stdout.split('\n');
        let iniPath = 'Unknown';
        const loadedIniLine = iniLines.find(line => line.includes('Loaded Configuration File'));
        if (loadedIniLine) {
            iniPath = loadedIniLine.split(':')[1].trim();
        }

        return NextResponse.json({
            version,
            executable,
            iniPath,
            extensions
        });
    } catch (error: any) {
        console.error('PHP Info Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to fetch PHP info' }, { status: 500 });
    }
}
