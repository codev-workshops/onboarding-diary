-- CreateEnum
CREATE TYPE "report_scope_type" AS ENUM ('SELF', 'USER', 'USERS', 'DEPARTMENT', 'ORG');

-- CreateEnum
CREATE TYPE "report_format" AS ENUM ('JSON', 'PDF', 'CSV');

-- CreateEnum
CREATE TYPE "report_run_status" AS ENUM ('SUCCESS', 'FAILED', 'DENIED');

-- CreateTable
CREATE TABLE "report_runs" (
    "id" UUID NOT NULL,
    "requested_by" UUID NOT NULL,
    "scope_type" "report_scope_type" NOT NULL,
    "target_user_ids" UUID[],
    "target_department_id" UUID,
    "date_from" DATE NOT NULL,
    "date_to" DATE NOT NULL,
    "sections" TEXT[],
    "format" "report_format" NOT NULL,
    "row_count" INTEGER NOT NULL DEFAULT 0,
    "status" "report_run_status" NOT NULL,
    "error_code" VARCHAR(60),
    "duration_ms" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "report_runs_requested_by_created_at_idx" ON "report_runs"("requested_by", "created_at" DESC);

-- CreateIndex
CREATE INDEX "report_runs_created_at_idx" ON "report_runs"("created_at" DESC);

-- AddForeignKey
ALTER TABLE "report_runs" ADD CONSTRAINT "report_runs_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
