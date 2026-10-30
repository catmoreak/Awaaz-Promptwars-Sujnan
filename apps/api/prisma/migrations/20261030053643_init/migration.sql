-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CITIZEN', 'ADMIN');

-- CreateEnum
CREATE TYPE "Category" AS ENUM ('WATERLOGGING', 'DRAINAGE', 'ROAD_DAMAGE', 'WASTE', 'STREETLIGHT', 'WATER_SUPPLY', 'ELECTRICAL_HAZARD', 'PUBLIC_SERVICE', 'OTHER');

-- CreateEnum
CREATE TYPE "IssueStatus" AS ENUM ('SUBMITTED', 'TRIAGED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AiState" AS ENUM ('PENDING', 'PROCESSING', 'DONE', 'FAILED');

-- CreateEnum
CREATE TYPE "AiSource" AS ENUM ('LLM', 'RULES');

-- CreateEnum
CREATE TYPE "ReportSource" AS ENUM ('MOBILE', 'WEB', 'STAFF', 'SEED');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('CREATED', 'STATUS_CHANGED', 'ASSIGNED', 'REPORT_LINKED', 'REPORT_DETACHED', 'MERGED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "googleSub" TEXT,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "role" "Role" NOT NULL DEFAULT 'CITIZEN',
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categories" "Category"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Issue" (
    "id" TEXT NOT NULL,
    "seq" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "category" "Category" NOT NULL,
    "status" "IssueStatus" NOT NULL DEFAULT 'SUBMITTED',
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "address" TEXT,
    "h3Res9" TEXT NOT NULL,
    "h3Res10" TEXT NOT NULL,
    "reportCount" INTEGER NOT NULL DEFAULT 1,
    "hazard" INTEGER NOT NULL,
    "exposure" INTEGER NOT NULL,
    "serviceDisruption" BOOLEAN NOT NULL DEFAULT false,
    "sensitiveSites" JSONB,
    "isSynthetic" BOOLEAN NOT NULL DEFAULT false,
    "firstReportedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "mergedIntoId" TEXT,
    "teamId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Issue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "seq" SERIAL NOT NULL,
    "clientRequestId" TEXT,
    "userId" TEXT,
    "issueId" TEXT,
    "source" "ReportSource" NOT NULL,
    "channel" TEXT,
    "viaVoice" BOOLEAN NOT NULL DEFAULT false,
    "text" TEXT NOT NULL,
    "userCategory" "Category" NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "address" TEXT,
    "h3Res9" TEXT NOT NULL,
    "h3Res10" TEXT NOT NULL,
    "isSynthetic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "aiState" "AiState" NOT NULL DEFAULT 'PENDING',
    "aiAttempts" INTEGER NOT NULL DEFAULT 0,
    "aiError" TEXT,
    "aiClaimedAt" TIMESTAMP(3),
    "aiSource" "AiSource",
    "aiModel" TEXT,
    "aiCategory" "Category",
    "aiConfidence" DOUBLE PRECISION,
    "aiSummary" TEXT,
    "aiReasoning" TEXT,
    "aiImageNote" TEXT,
    "language" TEXT,
    "englishText" TEXT,
    "hazard" INTEGER,
    "exposure" INTEGER,
    "serviceDisruption" BOOLEAN,
    "embedding" DOUBLE PRECISION[],
    "embeddingModel" TEXT,
    "dedupe" JSONB,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportImage" (
    "reportId" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "bytes" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportImage_pkey" PRIMARY KEY ("reportId")
);

-- CreateTable
CREATE TABLE "IssueEvent" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "actorId" TEXT,
    "type" "EventType" NOT NULL,
    "fromStatus" "IssueStatus",
    "toStatus" "IssueStatus",
    "message" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IssueEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HotspotBrief" (
    "hotspotId" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "brief" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HotspotBrief_pkey" PRIMARY KEY ("hotspotId")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_googleSub_key" ON "User"("googleSub");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Team_name_key" ON "Team"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Issue_seq_key" ON "Issue"("seq");

-- CreateIndex
CREATE INDEX "Issue_status_idx" ON "Issue"("status");

-- CreateIndex
CREATE INDEX "Issue_h3Res9_idx" ON "Issue"("h3Res9");

-- CreateIndex
CREATE INDEX "Issue_h3Res10_idx" ON "Issue"("h3Res10");

-- CreateIndex
CREATE INDEX "Issue_mergedIntoId_idx" ON "Issue"("mergedIntoId");

-- CreateIndex
CREATE UNIQUE INDEX "Report_seq_key" ON "Report"("seq");

-- CreateIndex
CREATE INDEX "Report_aiState_createdAt_idx" ON "Report"("aiState", "createdAt");

-- CreateIndex
CREATE INDEX "Report_userId_createdAt_idx" ON "Report"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Report_issueId_idx" ON "Report"("issueId");

-- CreateIndex
CREATE UNIQUE INDEX "Report_userId_clientRequestId_key" ON "Report"("userId", "clientRequestId");

-- CreateIndex
CREATE INDEX "IssueEvent_issueId_createdAt_idx" ON "IssueEvent"("issueId", "createdAt");

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportImage" ADD CONSTRAINT "ReportImage_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssueEvent" ADD CONSTRAINT "IssueEvent_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssueEvent" ADD CONSTRAINT "IssueEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
