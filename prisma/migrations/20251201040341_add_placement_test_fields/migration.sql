-- AlterTable
-- Add new columns to PlacementTestResult without dropping existing data
ALTER TABLE "PlacementTestResult" 
ADD COLUMN IF NOT EXISTS "startedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "timeSpent" INTEGER,
ADD COLUMN IF NOT EXISTS "skillScores" JSONB,
ADD COLUMN IF NOT EXISTS "correctAnswers" INTEGER,
ADD COLUMN IF NOT EXISTS "wrongAnswers" INTEGER,
ADD COLUMN IF NOT EXISTS "skippedAnswers" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "metadata" JSONB;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PlacementTestResult_cefrLevel_idx" ON "PlacementTestResult"("cefrLevel");

