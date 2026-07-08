-- CreateTable
CREATE TABLE "bi_requests" (
    "id" TEXT NOT NULL,
    "clientid" TEXT NOT NULL,
    "licenseid" TEXT,
    "businesstype" TEXT NOT NULL,
    "businessname" TEXT,
    "message" TEXT NOT NULL,
    "objectives" JSONB,
    "kpis" JSONB,
    "dashboardrequirements" TEXT,
    "dashboardtype" TEXT,
    "userid" TEXT,
    "useremail" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentmethod" TEXT,
    "paymentnotes" TEXT,
    "adminnotes" TEXT,
    "specialistNotes" TEXT DEFAULT '',
    "files" JSONB DEFAULT '[]',
    "createdat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedat" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bi_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bi_requests_clientid_idx" ON "bi_requests"("clientid");

-- CreateIndex
CREATE INDEX "bi_requests_licenseid_idx" ON "bi_requests"("licenseid");

-- CreateIndex
CREATE INDEX "bi_requests_status_idx" ON "bi_requests"("status");

-- CreateIndex
CREATE INDEX "bi_requests_paymentstatus_idx" ON "bi_requests"("paymentStatus");
