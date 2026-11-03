-- CreateTable
CREATE TABLE "push_device" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_device_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "push_device_endpoint_key" ON "push_device"("endpoint");

-- CreateIndex
CREATE INDEX "push_device_userId_idx" ON "push_device"("userId");

-- AddForeignKey
ALTER TABLE "push_device" ADD CONSTRAINT "push_device_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
