-- CreateTable
CREATE TABLE "activity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "focus_week" (
    "userId" TEXT NOT NULL,
    "week" TEXT NOT NULL,
    "hours" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "focus_week_pkey" PRIMARY KEY ("userId","week")
);

-- CreateIndex
CREATE INDEX "activity_userId_at_idx" ON "activity"("userId", "at");

-- CreateIndex
CREATE UNIQUE INDEX "activity_userId_key_key" ON "activity"("userId", "key");

-- AddForeignKey
ALTER TABLE "activity" ADD CONSTRAINT "activity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "focus_week" ADD CONSTRAINT "focus_week_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
