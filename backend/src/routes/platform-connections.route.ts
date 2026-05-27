import { Router } from 'express';
import {
  listPlatformConnections,
  upsertPlatformConnection,
} from '../repositories/platform-connections.repository.js';
import { syncPlatformConnection } from '../services/platform-sync.service.js';

export const platformConnectionsRouter = Router();

function getTenantId(req: { query: any; headers: any; body?: any }) {
  return String(req.headers['x-tenant-id'] || req.query.tenantId || req.body?.tenantId || 'agency');
}

platformConnectionsRouter.get('/platform-connections', async (req, res, next) => {
  try {
    const connections = await listPlatformConnections(getTenantId(req));
    return res.json(connections);
  } catch (error) {
    return next(error);
  }
});

platformConnectionsRouter.post('/platform-connections', async (req, res, next) => {
  try {
    const { platform, clientId, accountName, accountId, credentials = {} } = req.body || {};

    if (!platform) {
      return res.status(400).json({ error: 'platform is required.' });
    }

    const connection = await upsertPlatformConnection({
      tenantId: getTenantId(req),
      clientId,
      platform,
      accountName,
      accountId,
      credentials,
    });

    return res.status(201).json(connection);
  } catch (error) {
    return next(error);
  }
});

platformConnectionsRouter.post('/platform-connections/:id/sync', async (req, res, next) => {
  try {
    const result = await syncPlatformConnection(req.params.id, getTenantId(req));
    return res.json(result);
  } catch (error) {
    return next(error);
  }
});
