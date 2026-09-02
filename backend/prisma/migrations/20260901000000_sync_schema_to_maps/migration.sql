-- DropForeignKey
ALTER TABLE "UserPosConfiguration" DROP CONSTRAINT "UserPosConfiguration_licenseId_fkey";

-- DropForeignKey
ALTER TABLE "UserPosConfiguration" DROP CONSTRAINT "UserPosConfiguration_userId_fkey";

-- DropForeignKey
ALTER TABLE "appointments" DROP CONSTRAINT "appointments_customerId_fkey";

-- DropForeignKey
ALTER TABLE "bi_analysis_requests" DROP CONSTRAINT "bi_analysis_requests_clientid_fkey";

-- DropForeignKey
ALTER TABLE "bi_analysis_requests" DROP CONSTRAINT "bi_analysis_requests_licenseid_fkey";

-- DropForeignKey
ALTER TABLE "bi_analysis_requests" DROP CONSTRAINT "bi_analysis_requests_uploadid_fkey";

-- DropForeignKey
ALTER TABLE "bi_dashboards" DROP CONSTRAINT "bi_dashboards_clientid_fkey";

-- DropForeignKey
ALTER TABLE "bi_dashboards" DROP CONSTRAINT "bi_dashboards_licenseid_fkey";

-- DropForeignKey
ALTER TABLE "bi_dashboards" DROP CONSTRAINT "bi_dashboards_uploadid_fkey";

-- DropForeignKey
ALTER TABLE "bi_notifications" DROP CONSTRAINT "bi_notifications_clientid_fkey";

-- DropForeignKey
ALTER TABLE "bi_notifications" DROP CONSTRAINT "bi_notifications_dashboardid_fkey";

-- DropForeignKey
ALTER TABLE "fact_appointments" DROP CONSTRAINT "fact_appointments_dimTimeId_fkey";

-- DropForeignKey
ALTER TABLE "fact_inventory" DROP CONSTRAINT "fact_inventory_dimProductId_fkey";

-- DropForeignKey
ALTER TABLE "fact_inventory" DROP CONSTRAINT "fact_inventory_dimTimeId_fkey";

-- DropForeignKey
ALTER TABLE "fact_kitchen_order_items" DROP CONSTRAINT "fact_kitchen_order_items_dimClientId_fkey";

-- DropForeignKey
ALTER TABLE "fact_kitchen_order_items" DROP CONSTRAINT "fact_kitchen_order_items_dimTimeId_fkey";

-- DropForeignKey
ALTER TABLE "fact_kitchen_orders" DROP CONSTRAINT "fact_kitchen_orders_dimTimeId_fkey";

-- DropForeignKey
ALTER TABLE "fact_sale_items" DROP CONSTRAINT "fact_sale_items_dimClientId_fkey";

-- DropForeignKey
ALTER TABLE "fact_sale_items" DROP CONSTRAINT "fact_sale_items_dimProductId_fkey";

-- DropForeignKey
ALTER TABLE "fact_sale_items" DROP CONSTRAINT "fact_sale_items_dimTimeId_fkey";

-- DropForeignKey
ALTER TABLE "fact_sales" DROP CONSTRAINT "fact_sales_dimClientId_fkey";

-- DropForeignKey
ALTER TABLE "fact_sales" DROP CONSTRAINT "fact_sales_dimCustomerId_fkey";

-- DropForeignKey
ALTER TABLE "fact_sales" DROP CONSTRAINT "fact_sales_dimProductId_fkey";

-- DropForeignKey
ALTER TABLE "fact_sales" DROP CONSTRAINT "fact_sales_dimTimeId_fkey";

-- DropForeignKey
ALTER TABLE "license_configurations" DROP CONSTRAINT "license_configurations_licenseId_fkey";

-- DropForeignKey
ALTER TABLE "license_modules" DROP CONSTRAINT "license_modules_licenseId_fkey";

-- DropForeignKey
ALTER TABLE "license_modules" DROP CONSTRAINT "license_modules_moduleId_fkey";

-- DropForeignKey
ALTER TABLE "licenses" DROP CONSTRAINT "licenses_clientId_fkey";

-- DropForeignKey
ALTER TABLE "loyalty_transactions" DROP CONSTRAINT "loyalty_transactions_customerId_fkey";

-- DropForeignKey
ALTER TABLE "order_items" DROP CONSTRAINT "order_items_orderId_fkey";

-- DropForeignKey
ALTER TABLE "order_items" DROP CONSTRAINT "order_items_productId_fkey";

-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_customerId_fkey";

-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_userId_fkey";

-- DropForeignKey
ALTER TABLE "referrals" DROP CONSTRAINT "referrals_affiliateUserId_fkey";

-- DropForeignKey
ALTER TABLE "referrals" DROP CONSTRAINT "referrals_referredUserId_fkey";

-- DropIndex
DROP INDEX "UserPosConfiguration_licenseId_key";

-- DropIndex
DROP INDEX "bi_dashboards_metabasedashboardid_idx";

-- DropIndex
DROP INDEX "bi_dashboards_status_idx";

-- DropIndex
DROP INDEX "bi_notifications_isread_idx";

-- DropIndex
DROP INDEX "bi_uploads_requestid_idx";

-- DropIndex
DROP INDEX "license_configurations_licenseId_key";

-- DropIndex
DROP INDEX "license_modules_licenseId_moduleId_key";

-- DropIndex
DROP INDEX "licenses_licenseKey_key";

-- DropIndex
DROP INDEX "users_affiliateCode_key";

-- AlterTable
ALTER TABLE "UserPosConfiguration" DROP COLUMN "buildStatus",
DROP COLUMN "businessName",
DROP COLUMN "createdAt",
DROP COLUMN "lastBuiltAt",
DROP COLUMN "licenseId",
DROP COLUMN "outputPath",
DROP COLUMN "updatedAt",
DROP COLUMN "userId",
ADD COLUMN     "buildstatus" TEXT NOT NULL DEFAULT 'idle',
ADD COLUMN     "businessname" TEXT NOT NULL,
ADD COLUMN     "createdat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "lastbuiltat" TIMESTAMP(3),
ADD COLUMN     "licenseid" TEXT NOT NULL,
ADD COLUMN     "outputpath" TEXT,
ADD COLUMN     "updatedat" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "userid" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "appointments" DROP COLUMN "appointmentDate",
DROP COLUMN "createdAt",
DROP COLUMN "customerEmail",
DROP COLUMN "customerId",
DROP COLUMN "customerName",
DROP COLUMN "customerPhone",
DROP COLUMN "serviceType",
DROP COLUMN "updatedAt",
ADD COLUMN     "appointmentdate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "createdat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "customeremail" TEXT,
ADD COLUMN     "customerid" TEXT,
ADD COLUMN     "customername" TEXT NOT NULL,
ADD COLUMN     "customerphone" TEXT,
ADD COLUMN     "servicetype" TEXT NOT NULL,
ADD COLUMN     "updatedat" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "bi_analysis_requests" ALTER COLUMN "createdat" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedat" DROP DEFAULT,
ALTER COLUMN "updatedat" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "completedat" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "bi_dashboard_templates" ALTER COLUMN "createdat" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedat" DROP DEFAULT,
ALTER COLUMN "updatedat" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "bi_dashboards" ALTER COLUMN "assignedat" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdat" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedat" DROP DEFAULT,
ALTER COLUMN "updatedat" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "bi_notifications" ALTER COLUMN "createdat" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "bi_processing_jobs" ALTER COLUMN "uploadid" DROP NOT NULL,
ALTER COLUMN "updatedat" DROP NOT NULL;

-- AlterTable
ALTER TABLE "bi_processing_logs" ALTER COLUMN "jobid" DROP NOT NULL;

-- AlterTable
ALTER TABLE "bi_request_events" ALTER COLUMN "performedat" DROP DEFAULT;

-- AlterTable
ALTER TABLE "bi_upload_files" ALTER COLUMN "uploadid" DROP NOT NULL,
ALTER COLUMN "filename" DROP NOT NULL;

-- AlterTable
ALTER TABLE "bi_uploads" ALTER COLUMN "clientid" DROP NOT NULL,
ALTER COLUMN "businesstype" DROP NOT NULL,
ALTER COLUMN "filename" DROP NOT NULL,
ALTER COLUMN "filesize" DROP NOT NULL,
ALTER COLUMN "filepath" DROP NOT NULL,
ALTER COLUMN "updatedat" DROP NOT NULL;

-- AlterTable
ALTER TABLE "clients" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "createdat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedat" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "customers" DROP COLUMN "createdAt",
DROP COLUMN "loyaltyPoints",
DROP COLUMN "updatedAt",
ADD COLUMN     "createdat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "loyaltypoints" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updatedat" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "gift_cards" DROP COLUMN "createdAt",
DROP COLUMN "currentValue",
DROP COLUMN "expiryDate",
DROP COLUMN "isActive",
DROP COLUMN "originalValue",
DROP COLUMN "updatedAt",
ADD COLUMN     "createdat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "currentvalue" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "expirydate" TIMESTAMP(3),
ADD COLUMN     "isactive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "originalvalue" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "updatedat" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "license_configurations" DROP COLUMN "accentColor",
DROP COLUMN "appTitle",
DROP COLUMN "autoModeSwitch",
DROP COLUMN "autoSave",
DROP COLUMN "backdropBlur",
DROP COLUMN "backgroundColor",
DROP COLUMN "borderColor",
DROP COLUMN "borderRadius",
DROP COLUMN "brandWatermark",
DROP COLUMN "businessName",
DROP COLUMN "buttonStyle",
DROP COLUMN "cardBackgroundColor",
DROP COLUMN "cardStyle",
DROP COLUMN "compactMode",
DROP COLUMN "customCSS",
DROP COLUMN "dashboardLayout",
DROP COLUMN "fontFamily",
DROP COLUMN "fontSize",
DROP COLUMN "fontWeight",
DROP COLUMN "glassEffect",
DROP COLUMN "gradientBackgrounds",
DROP COLUMN "highContrastMode",
DROP COLUMN "hoverEffects",
DROP COLUMN "largeTextMode",
DROP COLUMN "licenseId",
DROP COLUMN "maxWidth",
DROP COLUMN "modalStyle",
DROP COLUMN "navbarCollapsible",
DROP COLUMN "navbarPosition",
DROP COLUMN "navbarStyle",
DROP COLUMN "primaryColor",
DROP COLUMN "reducedMotion",
DROP COLUMN "responsiveMode",
DROP COLUMN "secondaryColor",
DROP COLUMN "shadowIntensity",
DROP COLUMN "showBreadcrumbs",
DROP COLUMN "showModuleBadges",
DROP COLUMN "showModuleIcons",
DROP COLUMN "showQuickActions",
DROP COLUMN "spacingScale",
DROP COLUMN "splashScreen",
DROP COLUMN "tableStyle",
DROP COLUMN "taxRate",
DROP COLUMN "textColor",
DROP COLUMN "textMutedColor",
DROP COLUMN "widgetSizes",
ADD COLUMN     "accentcolor" TEXT NOT NULL DEFAULT '#F59E0B',
ADD COLUMN     "apptitle" TEXT,
ADD COLUMN     "automodeswitch" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "autosave" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "backdropblur" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "backgroundcolor" TEXT NOT NULL DEFAULT '#FFFFFF',
ADD COLUMN     "bordercolor" TEXT NOT NULL DEFAULT '#E5E7EB',
ADD COLUMN     "borderradius" TEXT NOT NULL DEFAULT 'medium',
ADD COLUMN     "brandwatermark" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "businessname" TEXT NOT NULL,
ADD COLUMN     "buttonstyle" TEXT NOT NULL DEFAULT 'filled',
ADD COLUMN     "cardbackgroundcolor" TEXT NOT NULL DEFAULT '#FFFFFF',
ADD COLUMN     "cardstyle" TEXT NOT NULL DEFAULT 'modern',
ADD COLUMN     "compactmode" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "customcss" TEXT,
ADD COLUMN     "dashboardlayout" TEXT NOT NULL DEFAULT 'grid',
ADD COLUMN     "fontfamily" TEXT NOT NULL DEFAULT 'Inter',
ADD COLUMN     "fontsize" TEXT NOT NULL DEFAULT '14px',
ADD COLUMN     "fontweight" TEXT NOT NULL DEFAULT 'normal',
ADD COLUMN     "glasseffect" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "gradientbackgrounds" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "highcontrastmode" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hovereffects" TEXT NOT NULL DEFAULT 'subtle',
ADD COLUMN     "largetextmode" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "licenseid" TEXT NOT NULL,
ADD COLUMN     "maxwidth" TEXT NOT NULL DEFAULT '1200px',
ADD COLUMN     "modalstyle" TEXT NOT NULL DEFAULT 'centered',
ADD COLUMN     "navbarcollapsible" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "navbarposition" TEXT,
ADD COLUMN     "navbarstyle" TEXT NOT NULL DEFAULT 'modern',
ADD COLUMN     "primarycolor" TEXT NOT NULL DEFAULT '#3B82F6',
ADD COLUMN     "reducedmotion" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "responsivemode" TEXT NOT NULL DEFAULT 'auto',
ADD COLUMN     "secondarycolor" TEXT NOT NULL DEFAULT '#1E40AF',
ADD COLUMN     "shadowintensity" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
ADD COLUMN     "showbreadcrumbs" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showmodulebadges" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showmoduleicons" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showquickactions" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "spacingscale" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
ADD COLUMN     "splashscreen" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tablestyle" TEXT NOT NULL DEFAULT 'modern',
ADD COLUMN     "taxrate" DOUBLE PRECISION NOT NULL DEFAULT 20.0,
ADD COLUMN     "textcolor" TEXT NOT NULL DEFAULT '#1F2937',
ADD COLUMN     "textmutedcolor" TEXT NOT NULL DEFAULT '#6B7280',
ADD COLUMN     "widgetsizes" TEXT NOT NULL DEFAULT 'mixed';

-- AlterTable
ALTER TABLE "license_modules" DROP COLUMN "isEnabled",
DROP COLUMN "licenseId",
DROP COLUMN "moduleId",
ADD COLUMN     "isenabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "licenseid" TEXT NOT NULL,
ADD COLUMN     "moduleid" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "licenses" DROP COLUMN "buildProjectName",
DROP COLUMN "buildProjectPath",
DROP COLUMN "buildRunId",
DROP COLUMN "buildStatus",
DROP COLUMN "clientId",
DROP COLUMN "createdAt",
DROP COLUMN "expirationDate",
DROP COLUMN "licenseKey",
DROP COLUMN "licenseType",
DROP COLUMN "machineId",
DROP COLUMN "updatedAt",
ADD COLUMN     "buildprojectname" TEXT,
ADD COLUMN     "buildprojectpath" TEXT,
ADD COLUMN     "buildrunid" TEXT,
ADD COLUMN     "buildstatus" TEXT DEFAULT 'pending',
ADD COLUMN     "clientid" TEXT NOT NULL,
ADD COLUMN     "createdat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "expirationdate" TIMESTAMP(3),
ADD COLUMN     "licensekey" TEXT NOT NULL,
ADD COLUMN     "licensetype" "LicenseType" NOT NULL,
ADD COLUMN     "machineid" TEXT,
ADD COLUMN     "updatedat" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "loyalty_transactions" DROP COLUMN "createdAt",
DROP COLUMN "customerId",
ADD COLUMN     "createdat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "customerid" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "modules" DROP COLUMN "createdAt",
DROP COLUMN "displayName",
DROP COLUMN "isCore",
DROP COLUMN "updatedAt",
ADD COLUMN     "createdat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "displayname" TEXT NOT NULL,
ADD COLUMN     "iscore" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "updatedat" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "order_items" DROP COLUMN "orderId",
DROP COLUMN "productId",
DROP COLUMN "unitPrice",
ADD COLUMN     "orderid" TEXT NOT NULL,
ADD COLUMN     "productid" TEXT NOT NULL,
ADD COLUMN     "unitprice" DOUBLE PRECISION NOT NULL;

-- AlterTable
ALTER TABLE "orders" DROP COLUMN "createdAt",
DROP COLUMN "customerId",
DROP COLUMN "deliveryAddress",
DROP COLUMN "orderType",
DROP COLUMN "pickupTime",
DROP COLUMN "preparationTime",
DROP COLUMN "specialInstructions",
DROP COLUMN "tableNumber",
DROP COLUMN "updatedAt",
DROP COLUMN "userId",
ADD COLUMN     "createdat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "customerid" TEXT,
ADD COLUMN     "deliveryaddress" TEXT,
ADD COLUMN     "ordertype" "OrderType" NOT NULL DEFAULT 'DINE_IN',
ADD COLUMN     "pickuptime" TIMESTAMP(3),
ADD COLUMN     "preparationtime" INTEGER,
ADD COLUMN     "specialinstructions" TEXT,
ADD COLUMN     "tablenumber" INTEGER,
ADD COLUMN     "updatedat" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "userid" TEXT;

-- AlterTable
ALTER TABLE "products" DROP COLUMN "createdAt",
DROP COLUMN "isActive",
DROP COLUMN "updatedAt",
ADD COLUMN     "createdat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "isactive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "updatedat" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "referrals" DROP COLUMN "affiliateUserId",
DROP COLUMN "commissionAmount",
DROP COLUMN "commissionRate",
DROP COLUMN "createdAt",
DROP COLUMN "paidAt",
DROP COLUMN "purchaseAmount",
DROP COLUMN "referredUserId",
DROP COLUMN "updatedAt",
ADD COLUMN     "affiliateuserid" TEXT NOT NULL,
ADD COLUMN     "commissionamount" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "commissionrate" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "createdat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "paidat" TIMESTAMP(3),
ADD COLUMN     "purchaseamount" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "referreduserid" TEXT NOT NULL,
ADD COLUMN     "updatedat" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "tables" DROP COLUMN "isActive",
ADD COLUMN     "isactive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "accountType",
DROP COLUMN "affiliateCode",
DROP COLUMN "businessInfo",
DROP COLUMN "createdAt",
DROP COLUMN "isActive",
DROP COLUMN "lastLogin",
DROP COLUMN "pendingCommissions",
DROP COLUMN "referredBy",
DROP COLUMN "rejectionReason",
DROP COLUMN "totalCommissions",
DROP COLUMN "totalReferrals",
DROP COLUMN "updatedAt",
DROP COLUMN "verificationStatus",
DROP COLUMN "verifiedAt",
ADD COLUMN     "accounttype" "AccountType" NOT NULL DEFAULT 'NORMAL',
ADD COLUMN     "affiliatecode" TEXT,
ADD COLUMN     "businessinfo" JSONB,
ADD COLUMN     "createdat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "isactive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lastlogin" TIMESTAMP(3),
ADD COLUMN     "pendingcommissions" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "referredby" TEXT,
ADD COLUMN     "rejectionreason" TEXT,
ADD COLUMN     "totalcommissions" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "totalreferrals" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updatedat" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "verificationstatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "verifiedat" TIMESTAMP(3);

-- Drop legacy BI views (not modeled in schema.prisma; they depend on the legacy
-- dim_/fact_ tables below and live only in the main DB, not the warehouse DB).
DROP VIEW IF EXISTS "v_revenue_daily";
DROP VIEW IF EXISTS "v_sales";
DROP VIEW IF EXISTS "v_dashboard_kpis";
DROP VIEW IF EXISTS "v_appointments";
DROP VIEW IF EXISTS "v_customer_analysis";
DROP VIEW IF EXISTS "v_inventory";
DROP VIEW IF EXISTS "v_inventory_status";
DROP VIEW IF EXISTS "v_kitchen_orders";
DROP VIEW IF EXISTS "v_kitchen_performance";
DROP VIEW IF EXISTS "v_peak_hours";
DROP VIEW IF EXISTS "v_product_performance";
DROP VIEW IF EXISTS "v_sales_hourly";
DROP VIEW IF EXISTS "v_suppliers";
DROP VIEW IF EXISTS "v_table_turnover";

-- DropTable
DROP TABLE "dim_clients";

-- DropTable
DROP TABLE "dim_customers";

-- DropTable
DROP TABLE "dim_products";

-- DropTable
DROP TABLE "dim_suppliers";

-- DropTable
DROP TABLE "dim_time";

-- DropTable
DROP TABLE "fact_appointments";

-- DropTable
DROP TABLE "fact_inventory";

-- DropTable
DROP TABLE "fact_kitchen_order_items";

-- DropTable
DROP TABLE "fact_kitchen_orders";

-- DropTable
DROP TABLE "fact_sale_items";

-- DropTable
DROP TABLE "fact_sales";

-- CreateIndex
CREATE UNIQUE INDEX "UserPosConfiguration_licenseid_key" ON "UserPosConfiguration"("licenseid");

-- CreateIndex
CREATE UNIQUE INDEX "license_configurations_licenseid_key" ON "license_configurations"("licenseid");

-- CreateIndex
CREATE UNIQUE INDEX "license_modules_licenseid_moduleid_key" ON "license_modules"("licenseid", "moduleid");

-- CreateIndex
CREATE UNIQUE INDEX "licenses_licensekey_key" ON "licenses"("licensekey");

-- CreateIndex
CREATE UNIQUE INDEX "users_affiliatecode_key" ON "users"("affiliatecode");

-- AddForeignKey
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_clientid_fkey" FOREIGN KEY ("clientid") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "license_modules" ADD CONSTRAINT "license_modules_licenseid_fkey" FOREIGN KEY ("licenseid") REFERENCES "licenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "license_modules" ADD CONSTRAINT "license_modules_moduleid_fkey" FOREIGN KEY ("moduleid") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "license_configurations" ADD CONSTRAINT "license_configurations_licenseid_fkey" FOREIGN KEY ("licenseid") REFERENCES "licenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_affiliateuserid_fkey" FOREIGN KEY ("affiliateuserid") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referreduserid_fkey" FOREIGN KEY ("referreduserid") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_customerid_fkey" FOREIGN KEY ("customerid") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_userid_fkey" FOREIGN KEY ("userid") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderid_fkey" FOREIGN KEY ("orderid") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_productid_fkey" FOREIGN KEY ("productid") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_customerid_fkey" FOREIGN KEY ("customerid") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_customerid_fkey" FOREIGN KEY ("customerid") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPosConfiguration" ADD CONSTRAINT "UserPosConfiguration_licenseid_fkey" FOREIGN KEY ("licenseid") REFERENCES "licenses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPosConfiguration" ADD CONSTRAINT "UserPosConfiguration_userid_fkey" FOREIGN KEY ("userid") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bi_dashboards" ADD CONSTRAINT "bi_dashboards_clientid_fkey" FOREIGN KEY ("clientid") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bi_dashboards" ADD CONSTRAINT "bi_dashboards_licenseid_fkey" FOREIGN KEY ("licenseid") REFERENCES "licenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bi_dashboards" ADD CONSTRAINT "bi_dashboards_uploadid_fkey" FOREIGN KEY ("uploadid") REFERENCES "bi_uploads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bi_notifications" ADD CONSTRAINT "bi_notifications_clientid_fkey" FOREIGN KEY ("clientid") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bi_notifications" ADD CONSTRAINT "bi_notifications_dashboardid_fkey" FOREIGN KEY ("dashboardid") REFERENCES "bi_dashboards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bi_analysis_requests" ADD CONSTRAINT "bi_analysis_requests_clientid_fkey" FOREIGN KEY ("clientid") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bi_analysis_requests" ADD CONSTRAINT "bi_analysis_requests_licenseid_fkey" FOREIGN KEY ("licenseid") REFERENCES "licenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bi_analysis_requests" ADD CONSTRAINT "bi_analysis_requests_uploadid_fkey" FOREIGN KEY ("uploadid") REFERENCES "bi_uploads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bi_requests" ADD CONSTRAINT "bi_requests_clientid_fkey" FOREIGN KEY ("clientid") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bi_requests" ADD CONSTRAINT "bi_requests_licenseid_fkey" FOREIGN KEY ("licenseid") REFERENCES "licenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bi_uploads" ADD CONSTRAINT "bi_uploads_requestid_fkey" FOREIGN KEY ("requestid") REFERENCES "bi_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "bi_dashboard_templates_businessType_key" RENAME TO "bi_dashboard_templates_businesstype_key";

-- RenameIndex
ALTER INDEX "bi_requests_paymentstatus_idx" RENAME TO "bi_requests_paymentStatus_idx";

