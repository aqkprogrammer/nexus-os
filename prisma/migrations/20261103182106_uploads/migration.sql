-- CreateTable
CREATE TABLE "upload" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "upload_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "upload_userId_idx" ON "upload"("userId");

-- AddForeignKey
ALTER TABLE "upload" ADD CONSTRAINT "upload_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
