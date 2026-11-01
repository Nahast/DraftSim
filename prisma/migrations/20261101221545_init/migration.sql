-- CreateEnum
CREATE TYPE "Sport" AS ENUM ('NFL', 'NBA', 'EPL', 'MLS');

-- CreateEnum
CREATE TYPE "DraftMode" AS ENUM ('LIVE', 'MOCK');

-- CreateEnum
CREATE TYPE "Experience" AS ENUM ('BEGINNER', 'PRO');

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "sport" "Sport" NOT NULL,
    "name" TEXT NOT NULL,
    "team" TEXT,
    "positions" TEXT[],
    "status" TEXT,
    "externalIds" JSONB NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerRanking" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "format" TEXT NOT NULL,
    "teams" INTEGER,
    "adp" DOUBLE PRECISION,
    "rank" INTEGER,
    "projection" DOUBLE PRECISION,
    "fetchedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerRanking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Draft" (
    "id" TEXT NOT NULL,
    "sport" "Sport" NOT NULL,
    "mode" "DraftMode" NOT NULL,
    "experience" "Experience" NOT NULL,
    "app" TEXT NOT NULL,
    "teams" INTEGER NOT NULL,
    "rounds" INTEGER NOT NULL,
    "myPosition" INTEGER NOT NULL,
    "snake" BOOLEAN NOT NULL DEFAULT true,
    "scoring" TEXT NOT NULL,
    "rosterSlots" JSONB NOT NULL,
    "sleeperDraftId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Draft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DraftPick" (
    "id" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "overall" INTEGER NOT NULL,
    "team" INTEGER NOT NULL,
    "playerId" TEXT NOT NULL,
    "source" TEXT NOT NULL,

    CONSTRAINT "DraftPick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceSync" (
    "source" TEXT NOT NULL,
    "lastOk" TIMESTAMP(3),
    "lastError" TEXT,

    CONSTRAINT "SourceSync_pkey" PRIMARY KEY ("source")
);

-- CreateIndex
CREATE INDEX "Player_sport_idx" ON "Player"("sport");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerRanking_playerId_source_season_format_teams_key" ON "PlayerRanking"("playerId", "source", "season", "format", "teams");

-- CreateIndex
CREATE UNIQUE INDEX "DraftPick_draftId_overall_key" ON "DraftPick"("draftId", "overall");

-- CreateIndex
CREATE UNIQUE INDEX "DraftPick_draftId_playerId_key" ON "DraftPick"("draftId", "playerId");

-- AddForeignKey
ALTER TABLE "PlayerRanking" ADD CONSTRAINT "PlayerRanking_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftPick" ADD CONSTRAINT "DraftPick_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "Draft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftPick" ADD CONSTRAINT "DraftPick_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
