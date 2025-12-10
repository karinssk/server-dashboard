
import { NextResponse } from 'next/server';
import fs from 'fs';
import util from 'util';
import yaml from 'js-yaml';

export const dynamic = 'force-dynamic';

const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const stat = util.promisify(fs.stat);

const CONFIG_PATH = '/etc/cloudflared/config.yml';

export async function GET() {
    try {
        // Check if file exists
        try {
            await stat(CONFIG_PATH);
        } catch (e) {
            return NextResponse.json({ error: 'Config file not found', path: CONFIG_PATH }, { status: 404 });
        }

        const content = await readFile(CONFIG_PATH, 'utf-8');
        const config = yaml.load(content);

        return NextResponse.json({
            path: CONFIG_PATH,
            config
        });

    } catch (error: any) {
        console.error('Cloudflared Config Read Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to read config' }, { status: 500 });
    }
}

import { exec } from 'child_process';

const execAsync = util.promisify(exec);

export async function POST(request: Request) {
    try {
        const { config } = await request.json();

        if (!config) {
            return NextResponse.json({ error: 'Missing config data' }, { status: 400 });
        }

        // 1. Read existing config to compare
        let oldConfig: any = {};
        try {
            const oldContent = await readFile(CONFIG_PATH, 'utf-8');
            oldConfig = yaml.load(oldContent);
        } catch (e) {
            // Config might not exist yet
        }

        // 2. Identify new hostnames
        const oldHostnames = new Set<string>();
        if (oldConfig.ingress) {
            oldConfig.ingress.forEach((rule: any) => {
                if (rule.hostname) oldHostnames.add(rule.hostname);
            });
        }

        const newHostnames: string[] = [];
        if (config.ingress) {
            config.ingress.forEach((rule: any) => {
                if (rule.hostname && !oldHostnames.has(rule.hostname)) {
                    newHostnames.push(rule.hostname);
                }
            });
        }

        // 3. Save the new config first
        const yamlStr = yaml.dump(config, {
            sortKeys: (a, b) => {
                // Ensure hostname comes first
                if (a === 'hostname') return -1;
                if (b === 'hostname') return 1;
                // Ensure service comes after hostname but before others if needed
                if (a === 'service') return 1;
                if (b === 'service') return -1;
                return a.localeCompare(b);
            }
        });
        await writeFile(CONFIG_PATH, yamlStr, 'utf-8');

        // 4. Execute DNS routing for new hostnames
        const tunnelId = config.tunnel || oldConfig.tunnel;
        const results: string[] = [];

        if (tunnelId && newHostnames.length > 0) {
            console.log(`Found ${newHostnames.length} new hostnames to route for tunnel ${tunnelId}`);

            for (const hostname of newHostnames) {
                try {
                    // Command: cloudflared tunnel route dns <UUID> <hostname>
                    // Note: This requires cloudflared to be authenticated and have permissions
                    const command = `cloudflared tunnel route dns ${tunnelId} ${hostname}`;
                    console.log(`Executing: ${command}`);

                    await execAsync(command);
                    results.push(`Routed DNS for ${hostname}`);
                } catch (error: any) {
                    console.error(`Failed to route DNS for ${hostname}:`, error);
                    results.push(`Failed to route DNS for ${hostname}: ${error.message}`);
                }
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Config saved successfully',
            dnsResults: results
        });

    } catch (error: any) {
        console.error('Cloudflared Config Write Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to save config' }, { status: 500 });
    }
}
