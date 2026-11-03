-- CreateTable
CREATE TABLE "billing" (
    "userId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'none',
    "plan" TEXT NOT NULL DEFAULT 'free',
    "currentPeriodEnd" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "ai_usage" (
    "userId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ai_usage_pkey" PRIMARY KEY ("userId","day")
);

-- CreateIndex
CREATE UNIQUE INDEX "billing_customerId_key" ON "billing"("customerId");

-- AddForeignKey
ALTER TABLE "billing" ADD CONSTRAINT "billing_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
