-- AlterTable
-- Add columns only if they don't exist (to handle partial migration)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='cefrLevel') THEN
        ALTER TABLE "User" ADD COLUMN "cefrLevel" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='language') THEN
        ALTER TABLE "User" ADD COLUMN "language" TEXT NOT NULL DEFAULT 'en';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='lastActive') THEN
        ALTER TABLE "User" ADD COLUMN "lastActive" TIMESTAMP(3);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='longestStreak') THEN
        ALTER TABLE "User" ADD COLUMN "longestStreak" INTEGER NOT NULL DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='placementScore') THEN
        ALTER TABLE "User" ADD COLUMN "placementScore" INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='placementTestCompleted') THEN
        ALTER TABLE "User" ADD COLUMN "placementTestCompleted" BOOLEAN NOT NULL DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='streak') THEN
        ALTER TABLE "User" ADD COLUMN "streak" INTEGER NOT NULL DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='theme') THEN
        ALTER TABLE "User" ADD COLUMN "theme" TEXT NOT NULL DEFAULT 'light';
    END IF;
END $$;

-- CreateTable
CREATE TABLE "UserActivity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "skill" TEXT NOT NULL,
    "activityType" TEXT NOT NULL,
    "duration" INTEGER,
    "score" DOUBLE PRECISION,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserGoal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "target" INTEGER NOT NULL,
    "current" INTEGER NOT NULL DEFAULT 0,
    "deadline" TIMESTAMP(3),
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlacementTestResult" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "totalQuestions" INTEGER NOT NULL DEFAULT 20,
    "cefrLevel" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlacementTestResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WritingLLMUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "taskId" TEXT,
    "feature" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WritingLLMUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserActivity_userId_date_idx" ON "UserActivity"("userId", "date");

-- CreateIndex
CREATE INDEX "UserActivity_userId_skill_idx" ON "UserActivity"("userId", "skill");

-- CreateIndex
CREATE INDEX "UserGoal_userId_idx" ON "UserGoal"("userId");

-- CreateIndex
CREATE INDEX "UserGoal_userId_completed_idx" ON "UserGoal"("userId", "completed");

-- CreateIndex
CREATE INDEX "PlacementTestResult_userId_idx" ON "PlacementTestResult"("userId");

-- CreateIndex
CREATE INDEX "PlacementTestResult_userId_completedAt_idx" ON "PlacementTestResult"("userId", "completedAt");

-- CreateIndex
CREATE INDEX "WritingLLMUsage_userId_taskId_feature_idx" ON "WritingLLMUsage"("userId", "taskId", "feature");

-- CreateIndex
CREATE INDEX "WritingLLMUsage_userId_feature_idx" ON "WritingLLMUsage"("userId", "feature");

-- CreateIndex
CREATE INDEX "WritingLLMUsage_usedAt_idx" ON "WritingLLMUsage"("usedAt");

-- AddForeignKey
ALTER TABLE "UserActivity" ADD CONSTRAINT "UserActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserGoal" ADD CONSTRAINT "UserGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlacementTestResult" ADD CONSTRAINT "PlacementTestResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WritingLLMUsage" ADD CONSTRAINT "WritingLLMUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
