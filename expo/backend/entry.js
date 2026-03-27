try {
    // 1. Load .env
    if (typeof process.loadEnvFile === 'function') {
        process.loadEnvFile('.env');
    }

    // 2. Register TSX (Using the verified absolute path)
    require('/home/zewijuxs/api_backend/node_modules/tsx/dist/register-2skVXuRQ.cjs');

    // 3. Start Hono & Server in one go
    const { Hono } = require('hono');
    const { serve } = require('@hono/node-server');
    const { trpcServer } = require('@hono/trpc-server');

    // We import the router from your existing file
    const { appRouter } = require('./trpc/app-router');
    const { createContext } = require('./trpc/create-context');

    const app = new Hono();

    app.use('/trpc/*', trpcServer({
        router: appRouter,
        createContext,
    }));

    app.get('/health', (c) => c.json({ status: 'ok', server: 'Hono/Node', time: new Date().toISOString() }));

    const port = process.env.PORT || 8080;
    const portValue = isNaN(Number(port)) ? port : Number(port);

    serve({
        fetch: app.fetch,
        port: portValue
    }, (info) => {
        console.log(`\n🚀 APP IS ONLINE: ${info.port ?? portValue}`);
    });

} catch (error) {
    console.error('[FATAL ERROR]', error);
}
