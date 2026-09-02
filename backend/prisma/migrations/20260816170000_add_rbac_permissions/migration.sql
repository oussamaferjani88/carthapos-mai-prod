-- RBAC granular permissions for the admin dashboard.
-- Maps to Prisma models Permission (app_permissions) and UserPermission (user_permissions).
-- NOTE: table is deliberately named "app_permissions" to avoid colliding with the
-- Metabase-owned "permissions" table in the same Postgres database.

-- CreateTable
CREATE TABLE "app_permissions" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedat" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_permissions" (
    "id" TEXT NOT NULL,
    "userid" TEXT NOT NULL,
    "permissionid" TEXT NOT NULL,
    "createdat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "app_permissions_key_key" ON "app_permissions"("key");

-- CreateIndex
CREATE INDEX "user_permissions_userid_idx" ON "user_permissions"("userid");

-- CreateIndex
CREATE UNIQUE INDEX "user_permissions_userid_permissionid_key" ON "user_permissions"("userid", "permissionid");

-- AddForeignKey
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_userid_fkey" FOREIGN KEY ("userid") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_permissionid_fkey" FOREIGN KEY ("permissionid") REFERENCES "app_permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
