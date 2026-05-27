type Campaign = {
  id: number | string;
  clientId: string;
  name: string;
  channel: string;
  spend: number;
  roas: number | null;
  ctr: number;
  conv: number;
  status: string;
  active: boolean;
  frequency?: number;
  cpc?: number;
};

type Client = {
  id: string;
  name: string;
  status: string;
};

type Integration = {
  name: string;
  connected: boolean;
  clients?: string[];
  lastSync?: string;
};

export function formatInr(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export function getConnectedPlatforms(integrations: Integration[]) {
  return integrations.filter(item => item.connected);
}

export function getCampaignScope(campaigns: Campaign[], clientId?: string | null) {
  return clientId ? campaigns.filter(campaign => campaign.clientId === clientId) : campaigns;
}

export function getPerformanceSummary(campaigns: Campaign[]) {
  const totalSpend = campaigns.reduce((sum, campaign) => sum + (campaign.spend || 0), 0);
  const totalConversions = campaigns.reduce((sum, campaign) => sum + (campaign.conv || 0), 0);
  const campaignsWithRoas = campaigns.filter(campaign => typeof campaign.roas === 'number');
  const avgRoas = campaignsWithRoas.length
    ? campaignsWithRoas.reduce((sum, campaign) => sum + Number(campaign.roas), 0) / campaignsWithRoas.length
    : null;

  return {
    totalSpend,
    totalConversions,
    avgRoas,
    activeCampaigns: campaigns.filter(campaign => campaign.active).length,
    criticalCampaigns: campaigns.filter(campaign => campaign.status === 'critical').length,
    atRiskCampaigns: campaigns.filter(campaign => campaign.status === 'at_risk' || campaign.status === 'warning').length,
  };
}

export function getAlerts(campaigns: Campaign[], clients: Client[] = []) {
  return campaigns
    .flatMap(campaign => {
      const client = clients.find(item => item.id === campaign.clientId);
      const prefix = client ? `${client.name} - ${campaign.name}` : campaign.name;
      const alerts = [];

      if (campaign.status === 'critical') {
        alerts.push({
          severity: 'critical',
          title: `${prefix} needs immediate attention`,
          message: 'Campaign health is critical. Review audience fatigue, budget allocation, and creative performance.',
        });
      }

      if (campaign.roas === null || campaign.conv === 0) {
        alerts.push({
          severity: 'critical',
          title: `${prefix} has zero conversions`,
          message: 'ROAS is null because conversions are zero. Pause inefficient spend or rebuild targeting.',
        });
      }

      if ((campaign.frequency || 0) >= 5) {
        alerts.push({
          severity: 'warning',
          title: `${prefix} frequency is high`,
          message: `Frequency is ${campaign.frequency}. Rotate creatives or refresh audiences.`,
        });
      }

      if (campaign.status === 'at_risk' || campaign.status === 'warning') {
        alerts.push({
          severity: 'warning',
          title: `${prefix} is at risk`,
          message: 'Performance is below target. Check CPC, CTR, budget pacing, and conversion quality.',
        });
      }

      return alerts;
    })
    .slice(0, 6);
}

export function getRecommendations(campaigns: Campaign[], clients: Client[] = [], integrations: Integration[] = []) {
  const connectedPlatforms = getConnectedPlatforms(integrations).map(item => item.name);
  const best = [...campaigns]
    .filter(campaign => typeof campaign.roas === 'number')
    .sort((a, b) => Number(b.roas) - Number(a.roas))[0];
  const worst = [...campaigns]
    .sort((a, b) => (Number(a.roas) || -1) - (Number(b.roas) || -1))[0];

  const recommendations = [];

  if (best) {
    const client = clients.find(item => item.id === best.clientId);
    recommendations.push({
      title: `Scale ${best.name}`,
      detail: `${client?.name || 'Client'} is getting ${Number(best.roas).toFixed(1)}x ROAS. Shift budget from weak campaigns into this audience or channel.`,
    });
  }

  if (worst) {
    const roasText = worst.roas === null ? 'null ROAS' : `${Number(worst.roas).toFixed(1)}x ROAS`;
    recommendations.push({
      title: `Fix or pause ${worst.name}`,
      detail: `This campaign has ${roasText}. Review conversion tracking, landing page quality, and audience overlap.`,
    });
  }

  if (connectedPlatforms.length > 0) {
    recommendations.push({
      title: 'Use connected platform data in dashboards',
      detail: `${connectedPlatforms.join(', ')} are connected. Dashboards, AI analysis, and reports can now use synced campaign data.`,
    });
  } else {
    recommendations.push({
      title: 'Connect at least one marketing source',
      detail: 'Connect Meta, Google Ads, TikTok, LinkedIn, or GA4 to replace demo metrics with synced data.',
    });
  }

  return recommendations.slice(0, 5);
}

export function buildAiInsight(prompt: string, campaigns: Campaign[], clients: Client[], integrations: Integration[]) {
  const summary = getPerformanceSummary(campaigns);
  const alerts = getAlerts(campaigns, clients);
  const recommendations = getRecommendations(campaigns, clients, integrations);
  const topCampaign = [...campaigns]
    .filter(campaign => typeof campaign.roas === 'number')
    .sort((a, b) => Number(b.roas) - Number(a.roas))[0];
  const connectedCount = getConnectedPlatforms(integrations).length;

  return [
    `Based on ${campaigns.length} campaigns and ${connectedCount} connected data source${connectedCount === 1 ? '' : 's'}:`,
    '',
    `Total spend: **${formatInr(summary.totalSpend)}**`,
    `Conversions: **${summary.totalConversions.toLocaleString('en-IN')}**`,
    `Average ROAS: **${summary.avgRoas === null ? 'N/A' : `${summary.avgRoas.toFixed(1)}x`}**`,
    topCampaign ? `Top campaign: **${topCampaign.name}** at **${Number(topCampaign.roas).toFixed(1)}x ROAS**` : '',
    '',
    alerts[0] ? `Alert: **${alerts[0].title}** - ${alerts[0].message}` : 'No critical alerts detected.',
    recommendations[0] ? `Recommendation: **${recommendations[0].title}** - ${recommendations[0].detail}` : '',
    '',
    `Question handled: "${prompt}"`,
  ].filter(Boolean).join('\n');
}
