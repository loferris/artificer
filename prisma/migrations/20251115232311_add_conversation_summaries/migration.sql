-- CreateTable
CREATE TABLE "public"."conversation_summaries" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "summaryContent" TEXT NOT NULL,
    "messageRange" JSONB NOT NULL,
    "tokensSaved" INTEGER NOT NULL,
    "messageCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "supersededBy" TEXT,

    CONSTRAINT "conversation_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "conversation_summaries_conversationId_idx" ON "public"."conversation_summaries"("conversationId");

-- CreateIndex
CREATE INDEX "conversation_summaries_conversationId_supersededBy_idx" ON "public"."conversation_summaries"("conversationId", "supersededBy");

-- AddForeignKey
ALTER TABLE "public"."conversation_summaries" ADD CONSTRAINT "conversation_summaries_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "public"."conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
