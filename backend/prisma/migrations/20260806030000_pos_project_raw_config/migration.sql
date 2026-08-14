-- Client POS Projects phase 1: add a full-configuration JSON snapshot to
-- license_configurations. Keeps the typed columns untouched for backward
-- compatibility; rawconfig stores 100% of the generator state (including
-- fields the whitelist drops) so a project can be restored/rebuilt exactly.
ALTER TABLE "license_configurations"
  ADD COLUMN     "rawconfig" JSONB,
  ADD COLUMN     "posconfigversion" INTEGER NOT NULL DEFAULT 1;
