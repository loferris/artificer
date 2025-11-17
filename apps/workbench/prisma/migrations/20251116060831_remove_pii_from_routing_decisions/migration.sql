/*
  Warnings:

  - You are about to drop the column `analysis` on the `routing_decisions` table. All the data in the column will be lost.
  - You are about to drop the column `prompt` on the `routing_decisions` table. All the data in the column will be lost.
  - You are about to drop the column `routingPlan` on the `routing_decisions` table. All the data in the column will be lost.
  - You are about to drop the column `validationResult` on the `routing_decisions` table. All the data in the column will be lost.
  - Added the required column `category` to the `routing_decisions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `complexity` to the `routing_decisions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `latencyMs` to the `routing_decisions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `promptHash` to the `routing_decisions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `promptLength` to the `routing_decisions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."routing_decisions" DROP COLUMN "analysis",
DROP COLUMN "prompt",
DROP COLUMN "routingPlan",
DROP COLUMN "validationResult",
ADD COLUMN     "category" TEXT NOT NULL,
ADD COLUMN     "complexity" INTEGER NOT NULL,
ADD COLUMN     "expiresAt" TIMESTAMP(3) NOT NULL DEFAULT NOW() + INTERVAL '30 days',
ADD COLUMN     "latencyMs" INTEGER NOT NULL,
ADD COLUMN     "promptHash" TEXT NOT NULL,
ADD COLUMN     "promptLength" INTEGER NOT NULL,
ADD COLUMN     "strategy" TEXT,
ADD COLUMN     "validationScore" INTEGER;

-- CreateIndex
CREATE INDEX "routing_decisions_complexity_idx" ON "public"."routing_decisions"("complexity");

-- CreateIndex
CREATE INDEX "routing_decisions_category_idx" ON "public"."routing_decisions"("category");

-- CreateIndex
CREATE INDEX "routing_decisions_expiresAt_idx" ON "public"."routing_decisions"("expiresAt");
