-- CreateTable
CREATE TABLE IF NOT EXISTS "PlacementTestResult" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "totalQuestions" INTEGER NOT NULL DEFAULT 20,
    "cefrLevel" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "timeSpent" INTEGER,
    "skillScores" JSONB,
    "correctAnswers" INTEGER,
    "wrongAnswers" INTEGER,
    "skippedAnswers" INTEGER DEFAULT 0,
    "metadata" JSONB,

    CONSTRAINT "PlacementTestResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PlacementTestResult_userId_idx" ON "PlacementTestResult"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PlacementTestResult_userId_completedAt_idx" ON "PlacementTestResult"("userId", "completedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PlacementTestResult_cefrLevel_idx" ON "PlacementTestResult"("cefrLevel");

-- AddForeignKey
ALTER TABLE "PlacementTestResult" ADD CONSTRAINT "PlacementTestResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

