-- CreateTable
CREATE TABLE "invite_count" (
    "userId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "invite_count_pkey" PRIMARY KEY ("userId","day")
);

-- AddForeignKey
ALTER TABLE "invite_count" ADD CONSTRAINT "invite_count_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
