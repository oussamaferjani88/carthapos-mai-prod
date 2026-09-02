-- BI Hardening: idempotency, unique constraints, duplicate detection

-- fileHash for duplicate ZIP detection (lowercase to match schema.prisma @map("filehash"))
ALTER TABLE "bi_uploads" ADD COLUMN "filehash" TEXT;
CREATE UNIQUE INDEX "bi_uploads_filehash_key" ON "bi_uploads"("filehash");

-- DimClient: one row per tenant
CREATE UNIQUE INDEX "dim_clients_tenantId_key" ON "dim_clients"("tenantId");

-- FactSale: upsert key (exportId + saleId)
CREATE UNIQUE INDEX "fact_sales_exportId_saleId_key" ON "fact_sales"("exportId", "saleId");

-- FactInventory: row-level upsert key
ALTER TABLE "fact_inventory" ADD COLUMN "rowIndex" INTEGER NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX "fact_inventory_exportId_rowIndex_key" ON "fact_inventory"("exportId", "rowIndex");

-- FactAppointment: row-level upsert key
ALTER TABLE "fact_appointments" ADD COLUMN "rowIndex" INTEGER NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX "fact_appointments_exportId_rowIndex_key" ON "fact_appointments"("exportId", "rowIndex");

-- FactKitchenOrder: row-level upsert key
ALTER TABLE "fact_kitchen_orders" ADD COLUMN "rowIndex" INTEGER NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX "fact_kitchen_orders_exportId_rowIndex_key" ON "fact_kitchen_orders"("exportId", "rowIndex");
