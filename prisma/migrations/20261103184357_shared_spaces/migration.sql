-- CreateTable
CREATE TABLE "space" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "space_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "space_member" (
    "spaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "space_member_pkey" PRIMARY KEY ("spaceId","userId")
);

-- CreateTable
CREATE TABLE "space_invite" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "space_invite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "space_item" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "space_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "space_member_userId_idx" ON "space_member"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "space_invite_token_key" ON "space_invite"("token");

-- CreateIndex
CREATE INDEX "space_invite_email_idx" ON "space_invite"("email");

-- CreateIndex
CREATE INDEX "space_item_spaceId_idx" ON "space_item"("spaceId");

-- AddForeignKey
ALTER TABLE "space" ADD CONSTRAINT "space_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "space_member" ADD CONSTRAINT "space_member_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "space"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "space_member" ADD CONSTRAINT "space_member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "space_invite" ADD CONSTRAINT "space_invite_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "space"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "space_item" ADD CONSTRAINT "space_item_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "space"("id") ON DELETE CASCADE ON UPDATE CASCADE;
