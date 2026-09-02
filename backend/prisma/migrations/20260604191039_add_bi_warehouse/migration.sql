-- CreateTable (bi_uploads: lowercase to match schema.prisma @map)
CREATE TABLE "bi_uploads" (
    "id" TEXT NOT NULL,
    "clientid" TEXT NOT NULL,
    "businesstype" TEXT NOT NULL,
    "bischemaversion" TEXT,
    "filename" TEXT NOT NULL,
    "filesize" INTEGER NOT NULL,
    "filepath" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UPLOADED',
    "totalfiles" INTEGER NOT NULL DEFAULT 0,
    "totalrows" INTEGER NOT NULL DEFAULT 0,
    "errormessage" TEXT,
    "createdat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedat" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bi_uploads_pkey" PRIMARY KEY ("id")
);

-- CreateTable (bi_upload_files: lowercase)
CREATE TABLE "bi_upload_files" (
    "id" TEXT NOT NULL,
    "uploadid" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "rowcount" INTEGER NOT NULL DEFAULT 0,
    "filesize" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "errormessage" TEXT,
    "createdat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bi_upload_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable (bi_processing_jobs: lowercase)
CREATE TABLE "bi_processing_jobs" (
    "id" TEXT NOT NULL,
    "uploadid" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "startedat" TIMESTAMP(3),
    "completedat" TIMESTAMP(3),
    "errormessage" TEXT,
    "recordsloaded" INTEGER NOT NULL DEFAULT 0,
    "createdat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedat" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bi_processing_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable (bi_processing_logs: lowercase)
CREATE TABLE "bi_processing_logs" (
    "id" TEXT NOT NULL,
    "jobid" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'INFO',
    "step" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "details" JSONB,
    "createdat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bi_processing_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dim_clients" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "exportId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "businessType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dim_clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dim_products" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "exportId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "family" TEXT,
    "barcode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dim_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dim_suppliers" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "exportId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dim_suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dim_time" (
    "id" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "year" INTEGER NOT NULL,
    "quarter" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "day" INTEGER NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "isWeekend" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dim_time_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fact_sales" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "exportId" TEXT NOT NULL,
    "dimClientId" TEXT,
    "dimProductId" TEXT,
    "dimTimeId" INTEGER,
    "saleId" TEXT NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "tax" DOUBLE PRECISION,
    "discount" DOUBLE PRECISION,
    "paymentMethod" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fact_sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fact_inventory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "exportId" TEXT NOT NULL,
    "dimProductId" TEXT,
    "dimTimeId" INTEGER,
    "productName" TEXT NOT NULL,
    "stock" INTEGER NOT NULL,
    "price" DOUBLE PRECISION,
    "timesSold" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fact_inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fact_appointments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "exportId" TEXT NOT NULL,
    "dimTimeId" INTEGER,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT,
    "serviceId" TEXT,
    "duration" INTEGER,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fact_appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fact_kitchen_orders" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "exportId" TEXT NOT NULL,
    "dimTimeId" INTEGER,
    "tableNumber" INTEGER,
    "items" TEXT,
    "priority" TEXT,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fact_kitchen_orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (bi_processing_jobs.uploadid unique is created in 20260806010000)
CREATE UNIQUE INDEX "dim_time_date_key" ON "dim_time"("date");

-- AddForeignKey
ALTER TABLE "bi_upload_files" ADD CONSTRAINT "bi_upload_files_uploadid_fkey" FOREIGN KEY ("uploadid") REFERENCES "bi_uploads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bi_processing_jobs" ADD CONSTRAINT "bi_processing_jobs_uploadid_fkey" FOREIGN KEY ("uploadid") REFERENCES "bi_uploads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bi_processing_logs" ADD CONSTRAINT "bi_processing_logs_jobid_fkey" FOREIGN KEY ("jobid") REFERENCES "bi_processing_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fact_sales" ADD CONSTRAINT "fact_sales_dimClientId_fkey" FOREIGN KEY ("dimClientId") REFERENCES "dim_clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fact_sales" ADD CONSTRAINT "fact_sales_dimProductId_fkey" FOREIGN KEY ("dimProductId") REFERENCES "dim_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fact_sales" ADD CONSTRAINT "fact_sales_dimTimeId_fkey" FOREIGN KEY ("dimTimeId") REFERENCES "dim_time"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fact_inventory" ADD CONSTRAINT "fact_inventory_dimProductId_fkey" FOREIGN KEY ("dimProductId") REFERENCES "dim_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fact_inventory" ADD CONSTRAINT "fact_inventory_dimTimeId_fkey" FOREIGN KEY ("dimTimeId") REFERENCES "dim_time"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fact_appointments" ADD CONSTRAINT "fact_appointments_dimTimeId_fkey" FOREIGN KEY ("dimTimeId") REFERENCES "dim_time"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fact_kitchen_orders" ADD CONSTRAINT "fact_kitchen_orders_dimTimeId_fkey" FOREIGN KEY ("dimTimeId") REFERENCES "dim_time"("id") ON DELETE SET NULL ON UPDATE CASCADE;
