const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  console.log('=== SALES ===');
  const sales = await prisma.$queryRawUnsafe('SELECT * FROM v_sales LIMIT 5');
  console.table(sales);
  console.log('=== INVENTORY ===');
  const inv = await prisma.$queryRawUnsafe('SELECT * FROM v_inventory LIMIT 5');
  console.table(inv);
  console.log('=== PRODUCT PERFORMANCE ===');
  const perf = await prisma.$queryRawUnsafe('SELECT client_id, product_name, category, total_sold, current_stock, estimated_revenue FROM v_product_performance LIMIT 10');
  console.table(perf);
  console.log('=== DASHBOARD KPIS ===');
  const kpis = await prisma.$queryRawUnsafe('SELECT * FROM v_dashboard_kpis');
  console.table(kpis);
  console.log('=== REVENUE DAILY ===');
  const rev = await prisma.$queryRawUnsafe('SELECT * FROM v_revenue_daily ORDER BY date LIMIT 10');
  console.table(rev);
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
