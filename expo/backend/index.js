const fs = require('fs');
const path = require('path');
const http = require('http');

const port = process.env.PORT || 8080;

// 🛡️ Adaptive TSX Loader (Finds the hash-named register file)
function getTsxRegister() {
    const searchPaths = [
        path.join(__dirname, '../node_modules/tsx/dist'),
        '/home/zewijuxs/api_backend/node_modules/tsx/dist',
        '/home/zewijuxs/nodevenv/api_backend/24/lib/node_modules/tsx/dist'
    ];

    for (const dir of searchPaths) {
        if (fs.existsSync(dir)) {
            const files = fs.readdirSync(dir);
            const registerFile = files.find(f => f.startsWith('register-') && f.endsWith('.cjs'));
            if (registerFile) return path.join(dir, registerFile);
        }
    }
    return null;
}

try {
    console.log('--- FINAL ADAPTIVE BOOT ---');

    // 1. Register TSX
    const registerPath = getTsxRegister();
    if (!registerPath) throw new Error('Could not find TSX register file anywhere!');

    // Support for both CJS and ESM
    require(registerPath);
    try {
        const { register } = require('node:module');
        const { pathToFileURL } = require('node:url');
        register(pathToFileURL(registerPath).href);
        console.log('[Runner] ESM Loader registered');
    } catch (e) {
        console.log('[Runner] ESM Loader registration skipped (legacy node)');
    }

    console.log('[Runner] TSX registered via:', registerPath);

    // 2. Load the App
    const honoPath = path.resolve(__dirname, 'hono.ts');
    if (!fs.existsSync(honoPath)) throw new Error('Could not find hono.ts at ' + honoPath);

    require(honoPath);
    console.log('[Runner] Hono app loaded successfully');

} catch (err) {
    console.error('[FATAL STARTUP]', err);

    // FAIL-SAFE: Show the error in the browser instead of a 503
    http.createServer((req, res) => {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'error',
            message: 'Adaptive Startup Failed',
            details: err.message,
            stack: err.stack,
            node: process.version
        }, null, 2));
    }).listen(port);
}
