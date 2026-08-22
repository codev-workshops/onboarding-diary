-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('RECRUIT', 'MANAGER', 'ADMIN');

-- CreateEnum
CREATE TYPE "task_category" AS ENUM ('ORIENTATION', 'TRAINING', 'SETUP', 'DOCUMENTATION', 'MEETING', 'PROJECT_WORK', 'SHADOWING', 'COMPLIANCE', 'OTHER');

-- CreateEnum
CREATE TYPE "task_status" AS ENUM ('TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "priority_level" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "issue_severity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "issue_status" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "feedback_type" AS ENUM ('POSITIVE', 'SUGGESTION', 'CONCERN');

-- CreateEnum
CREATE TYPE "feedback_visibility" AS ENUM ('MANAGER_VISIBLE', 'ADMIN_ONLY');

-- CreateTable
CREATE TABLE "departments" (
    "id" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "description" VARCHAR(255),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" VARCHAR(120) NOT NULL,
    "role" "user_role" NOT NULL DEFAULT 'RECRUIT',
    "department_id" UUID,
    "start_date" DATE NOT NULL,
    "manager_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_entries" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "entry_date" DATE NOT NULL,
    "title" VARCHAR(140) NOT NULL,
    "description" TEXT,
    "category" "task_category" NOT NULL DEFAULT 'OTHER',
    "status" "task_status" NOT NULL DEFAULT 'TODO',
    "priority" "priority_level" NOT NULL DEFAULT 'MEDIUM',
    "completed_at" TIMESTAMPTZ(6),
    "version" INTEGER NOT NULL DEFAULT 1,
    "updated_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "task_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "issue_entries" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "entry_date" DATE NOT NULL,
    "title" VARCHAR(140) NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "issue_severity" NOT NULL DEFAULT 'MEDIUM',
    "status" "issue_status" NOT NULL DEFAULT 'OPEN',
    "resolution_notes" TEXT,
    "resolved_at" TIMESTAMPTZ(6),
    "version" INTEGER NOT NULL DEFAULT 1,
    "updated_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "issue_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback_entries" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "entry_date" DATE NOT NULL,
    "subject" VARCHAR(140) NOT NULL,
    "type" "feedback_type" NOT NULL,
    "details" TEXT NOT NULL,
    "visibility" "feedback_visibility" NOT NULL DEFAULT 'MANAGER_VISIBLE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "updated_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "feedback_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "note_entries" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "entry_date" DATE NOT NULL,
    "title" VARCHAR(140) NOT NULL,
    "content" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "version" INTEGER NOT NULL DEFAULT 1,
    "updated_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "note_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "departments_name_key" ON "departments"("name");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_manager_id_idx" ON "users"("manager_id");

-- CreateIndex
CREATE INDEX "users_department_id_idx" ON "users"("department_id");

-- CreateIndex
CREATE INDEX "task_entries_owner_id_entry_date_idx" ON "task_entries"("owner_id", "entry_date" DESC);

-- CreateIndex
CREATE INDEX "task_entries_owner_id_status_idx" ON "task_entries"("owner_id", "status");

-- CreateIndex
CREATE INDEX "task_entries_updated_by_idx" ON "task_entries"("updated_by");

-- CreateIndex
CREATE INDEX "issue_entries_owner_id_entry_date_idx" ON "issue_entries"("owner_id", "entry_date" DESC);

-- CreateIndex
CREATE INDEX "issue_entries_owner_id_status_idx" ON "issue_entries"("owner_id", "status");

-- CreateIndex
CREATE INDEX "issue_entries_updated_by_idx" ON "issue_entries"("updated_by");

-- CreateIndex
CREATE INDEX "feedback_entries_owner_id_entry_date_idx" ON "feedback_entries"("owner_id", "entry_date" DESC);

-- CreateIndex
CREATE INDEX "feedback_entries_updated_by_idx" ON "feedback_entries"("updated_by");

-- CreateIndex
CREATE INDEX "note_entries_owner_id_entry_date_idx" ON "note_entries"("owner_id", "entry_date" DESC);

-- CreateIndex
CREATE INDEX "note_entries_tags_idx" ON "note_entries" USING GIN ("tags" array_ops);

-- CreateIndex
CREATE INDEX "note_entries_updated_by_idx" ON "note_entries"("updated_by");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_entries" ADD CONSTRAINT "task_entries_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_entries" ADD CONSTRAINT "task_entries_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issue_entries" ADD CONSTRAINT "issue_entries_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issue_entries" ADD CONSTRAINT "issue_entries_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_entries" ADD CONSTRAINT "feedback_entries_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_entries" ADD CONSTRAINT "feedback_entries_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "note_entries" ADD CONSTRAINT "note_entries_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "note_entries" ADD CONSTRAINT "note_entries_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- CHECK constraints
--
-- Prisma has no concept of CHECK constraints, so these are applied here and are
-- invisible to schema drift detection. They mirror the field-level validation
-- rules enforced by the API so the database remains the last line of defence.
--
-- C1/C2 (architecture review): the `completed_at` / `resolved_at` constraints are
-- deliberately ONE-WAY implications, not biconditionals. A biconditional would
-- make it impossible to cancel a previously completed task or to reopen a
-- resolved issue without destroying its resolution timestamp.
-- ---------------------------------------------------------------------------

ALTER TABLE "departments"
  ADD CONSTRAINT "departments_name_len"
  CHECK (char_length("name") BETWEEN 2 AND 80);

ALTER TABLE "users"
  ADD CONSTRAINT "users_full_name_len"
  CHECK (char_length("full_name") BETWEEN 2 AND 120);

ALTER TABLE "users"
  ADD CONSTRAINT "users_email_lowercase"
  CHECK ("email" = lower("email"));

ALTER TABLE "users"
  ADD CONSTRAINT "users_start_date_sane"
  CHECK ("start_date" >= DATE '1990-01-01');

ALTER TABLE "users"
  ADD CONSTRAINT "users_not_self_manager"
  CHECK ("manager_id" IS NULL OR "manager_id" <> "id");

ALTER TABLE "task_entries"
  ADD CONSTRAINT "task_title_len"
  CHECK (char_length("title") BETWEEN 3 AND 140);

ALTER TABLE "task_entries"
  ADD CONSTRAINT "task_description_len"
  CHECK ("description" IS NULL OR char_length("description") <= 5000);

ALTER TABLE "task_entries"
  ADD CONSTRAINT "task_completed_at_required_when_done"
  CHECK ("status" <> 'DONE' OR "completed_at" IS NOT NULL);

ALTER TABLE "issue_entries"
  ADD CONSTRAINT "issue_title_len"
  CHECK (char_length("title") BETWEEN 3 AND 140);

ALTER TABLE "issue_entries"
  ADD CONSTRAINT "issue_description_len"
  CHECK (char_length("description") BETWEEN 10 AND 5000);

ALTER TABLE "issue_entries"
  ADD CONSTRAINT "issue_resolution_notes_required_when_closed"
  CHECK ("status" NOT IN ('RESOLVED', 'CLOSED')
         OR ("resolution_notes" IS NOT NULL AND char_length("resolution_notes") >= 10));

ALTER TABLE "issue_entries"
  ADD CONSTRAINT "issue_resolved_at_required_when_closed"
  CHECK ("status" NOT IN ('RESOLVED', 'CLOSED') OR "resolved_at" IS NOT NULL);

ALTER TABLE "feedback_entries"
  ADD CONSTRAINT "feedback_subject_len"
  CHECK (char_length("subject") BETWEEN 3 AND 140);

ALTER TABLE "feedback_entries"
  ADD CONSTRAINT "feedback_details_len"
  CHECK (char_length("details") BETWEEN 10 AND 5000);

ALTER TABLE "note_entries"
  ADD CONSTRAINT "note_title_len"
  CHECK (char_length("title") BETWEEN 3 AND 140);

ALTER TABLE "note_entries"
  ADD CONSTRAINT "note_content_len"
  CHECK (char_length("content") BETWEEN 1 AND 20000);

ALTER TABLE "note_entries"
  ADD CONSTRAINT "note_tag_count"
  CHECK (array_length("tags", 1) IS NULL OR array_length("tags", 1) <= 10);
