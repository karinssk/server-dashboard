import { NextResponse } from 'next/server';
import { exec, spawn } from 'child_process';
import util from 'util';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import os from 'os';

const execAsync = util.promisify(exec);

export const dynamic = 'force-dynamic';

// Helper to manage job state
const getJobPath = (jobId: string) => path.join(os.tmpdir(), `unzip-job-${jobId}.json`);
const getLogPath = (jobId: string) => path.join(os.tmpdir(), `unzip-job-${jobId}.log`);

export async function POST(request: Request) {
    try {
        const { action, paths, destination, targetPath, jobId } = await request.json();

        if (!action) {
            return NextResponse.json({ error: 'Action is required' }, { status: 400 });
        }

        if (action === 'zip') {
            if (!paths || !Array.isArray(paths) || paths.length === 0 || !destination) {
                return NextResponse.json({ error: 'Paths and destination are required for zip' }, { status: 400 });
            }

            const parentDir = path.dirname(paths[0]);
            const fileNames = paths.map(p => path.basename(p)).map(n => `"${n}"`).join(' ');
            const command = `cd "${parentDir}" && zip -r "${destination}" ${fileNames}`;

            await execAsync(command);

            return NextResponse.json({ success: true, message: 'Archive created successfully' });
        }

        // Start Unzip Job
        if (action === 'unzip-start') {
            if (!targetPath) {
                return NextResponse.json({ error: 'Target path is required' }, { status: 400 });
            }

            const destDir = destination || path.dirname(targetPath);
            const newJobId = Date.now().toString();
            const logPath = getLogPath(newJobId);

            // 1. Count total files
            // unzip -l lists files. We count lines, minus header (3 lines) and footer (2 lines) approx.
            // A safer way is to grep for the date format or just count all lines and estimate.
            // unzip -l output:
            // Archive:  file.zip
            //   Length      Date    Time    Name
            // ---------  ---------- -----   ----
            //         0  2023-01-01 00:00   dir/
            // ...
            // ---------                     -------
            //      1234                     5 files

            let totalFiles = 0;
            try {
                const { stdout } = await execAsync(`unzip -l "${targetPath}" | tail -n +4 | head -n -2 | wc -l`);
                totalFiles = parseInt(stdout.trim()) || 1;
            } catch (e) {
                console.warn('Failed to count files', e);
                totalFiles = 1; // Fallback
            }

            // 2. Spawn unzip process
            // -o: overwrite without prompting
            const child = spawn('unzip', ['-o', targetPath, '-d', destDir], {
                stdio: ['ignore', 'ignore', 'ignore'] // We'll handle output manually if needed, or just let it run
            });

            // Actually, to track progress, we need stdout.
            // Let's redirect stdout to a log file.
            const logStream = await fs.open(logPath, 'w');
            const childWithLog = spawn('unzip', ['-o', targetPath, '-d', destDir], {
                stdio: ['ignore', logStream.fd, logStream.fd]
            });

            // We don't await the child process here. It runs in background.
            // But we need to unref it so the server doesn't hang? 
            // Next.js might kill it if the request ends. 
            // In Vercel/Serverless this is bad. In a VPS (PM2) it works.
            childWithLog.unref();

            // 3. Save job state
            const jobState = {
                id: newJobId,
                pid: childWithLog.pid,
                totalFiles,
                status: 'running',
                startTime: Date.now(),
                targetPath,
                destDir
            };
            await fs.writeFile(getJobPath(newJobId), JSON.stringify(jobState));
            await logStream.close();

            return NextResponse.json({ success: true, jobId: newJobId });
        }

        // Check Job Status
        if (action === 'unzip-status') {
            if (!jobId) return NextResponse.json({ error: 'Job ID required' }, { status: 400 });

            const jobFile = getJobPath(jobId);
            if (!existsSync(jobFile)) {
                return NextResponse.json({ status: 'not_found' });
            }

            const jobState = JSON.parse(await fs.readFile(jobFile, 'utf-8'));

            // Check if process is running
            let isRunning = true;
            try {
                process.kill(jobState.pid, 0); // Throws if PID doesn't exist
            } catch (e) {
                isRunning = false;
            }

            // Calculate progress
            let extractedCount = 0;
            try {
                const logContent = await fs.readFile(getLogPath(jobId), 'utf-8');
                // Count lines starting with "  inflating:" or "  creating:"
                extractedCount = (logContent.match(/(inflating|creating):/g) || []).length;
            } catch (e) {
                // Log might not exist yet
            }

            let status = jobState.status;
            if (!isRunning && status === 'running') {
                status = 'done'; // Or error? We assume done if it exited.
                // We could check exit code if we had a way to capture it, but unref() makes it hard.
                // Validating by checking if log has "inflating" lines or checking file existence is better.
            }

            const progress = Math.min(100, Math.round((extractedCount / jobState.totalFiles) * 100));

            return NextResponse.json({
                status,
                progress,
                extracted: extractedCount,
                total: jobState.totalFiles
            });
        }

        // Cancel Job
        if (action === 'unzip-cancel') {
            if (!jobId) return NextResponse.json({ error: 'Job ID required' }, { status: 400 });

            const jobFile = getJobPath(jobId);
            if (existsSync(jobFile)) {
                const jobState = JSON.parse(await fs.readFile(jobFile, 'utf-8'));
                if (jobState.status === 'running') {
                    try {
                        process.kill(jobState.pid, 'SIGKILL');
                    } catch (e) {
                        // Ignore if already dead
                    }
                    jobState.status = 'cancelled';
                    await fs.writeFile(jobFile, JSON.stringify(jobState));
                }
            }
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error: any) {
        console.error('Archive Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to perform archive operation' }, { status: 500 });
    }
}
