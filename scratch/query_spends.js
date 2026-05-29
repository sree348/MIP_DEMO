import 'dotenv/config';
import { prisma } from '../backend/src/services/prisma.service.js';

async function main() {
  const campaigns = await prisma.campaignData.findMany({
    where: { clientId: 'cai_mahindra' }
  });
  console.log('Total Campaigns:', campaigns.length);
  const totalSpend = campaigns.reduce((sum, c) => sum + c.spend, 0);
  console.log('Total Spend in Database:', totalSpend);
  console.log('Campaign details:');
  console.table(campaigns.map(c => ({ name: c.campaignName, spend: c.spend })));
  await prisma.$disconnect();
}

main().catch(console.error);
