-- Photos move to object storage. Existing rows keep their bytes until scripts/move-images.ts runs.
ALTER TABLE "ReportImage" ADD COLUMN "storageKey" TEXT;
ALTER TABLE "ReportImage" ALTER COLUMN "bytes" DROP NOT NULL;
