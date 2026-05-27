import { fetchAndStoreCampaigns } from './meta.fetch.js';

type SyncResult = {
  rowsUpserted: number;
  message: string;
};

const SUPPORTED_PLATFORMS = new Set([
  'Meta Ads',
  'TikTok Ads',
  'LinkedIn Ads',
  'Google Ads',
  'Google Analytics 4',
]);

export async function syncPlatformConnection(connectionId: string, tenantId: string): Promise<SyncResult> {
  const result = await fetchAndStoreCampaigns(tenantId);

  return {
    rowsUpserted: result.count,
    message: `Meta Ads sync completed for ${connectionId}.`,
  };
}
