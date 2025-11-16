-- CreateTable
CREATE TABLE "routing_decisions" (
    "id" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "analysis" JSONB NOT NULL,
    "routingPlan" JSONB NOT NULL,
    "executedModel" TEXT NOT NULL,
    "validationResult" JSONB,
    "totalCost" DECIMAL(10,6) NOT NULL,
    "successful" BOOLEAN NOT NULL,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "conversationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "routing_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "routing_decisions_conversationId_idx" ON "routing_decisions"("conversationId");

-- CreateIndex
CREATE INDEX "routing_decisions_executedModel_idx" ON "routing_decisions"("executedModel");

-- CreateIndex
CREATE INDEX "routing_decisions_successful_idx" ON "routing_decisions"("successful");

-- CreateIndex
CREATE INDEX "routing_decisions_createdAt_idx" ON "routing_decisions"("createdAt");
