import { app } from '../server/app';
import { registerRoutes } from '../server/routes';

// Vercel serverless function entry point
// We use a singleton promise to ensure routes are registered only once
let routerReadyPromise: Promise<any> | null = null;

export default async function handler(req: any, res: any) {
    if (!routerReadyPromise) {
        routerReadyPromise = registerRoutes(app);
    }

    await routerReadyPromise;

    // Hand off to the express app
    return app(req, res);
}
