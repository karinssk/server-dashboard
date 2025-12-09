import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'socket.io';
import * as pty from 'node-pty';
import os from 'os';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3555', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
    const server = createServer(async (req, res) => {
        try {
            const parsedUrl = parse(req.url!, true);
            await handle(req, res, parsedUrl);
        } catch (err) {
            console.error('Error occurred handling', req.url, err);
            res.statusCode = 500;
            res.end('internal server error');
        }
    });

    const io = new Server(server);

    io.on('connection', (socket) => {
        console.log('Client connected to terminal socket');

        const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';

        const ptyProcess = pty.spawn(shell, [], {
            name: 'xterm-color',
            cols: 80,
            rows: 30,
            cwd: process.env.HOME,
            env: process.env as any
        });

        socket.on('input', (data) => {
            ptyProcess.write(data);
        });

        socket.on('resize', (size) => {
            ptyProcess.resize(size.cols, size.rows);
        });

        ptyProcess.onData((data) => {
            socket.emit('output', data);
        });

        socket.on('disconnect', () => {
            console.log('Client disconnected');
            ptyProcess.kill();
        });
    });

    server.listen(port, () => {
        console.log(`> Ready on http://${hostname}:${port}`);
    });
});
