-- pgvector stores and compares embeddings.
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateTable
CREATE TABLE "memory_vector" (
    "userId" TEXT NOT NULL,
    "memoryId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "embedding" vector(1536) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "memory_vector_pkey" PRIMARY KEY ("userId","memoryId")
);

-- AddForeignKey
ALTER TABLE "memory_vector" ADD CONSTRAINT "memory_vector_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
