-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('RECRUIT', 'MANAGER', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'INVITED');

-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('PRIVATE', 'MANAGER_ONLY', 'PUBLIC');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "IssueSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "IssueStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "FeedbackType" AS ENUM ('POSITIVE', 'NEUTRAL', 'CONSTRUCTIVE');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('DRAFT', 'GENERATED', 'REVIEWED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('WEEKLY', 'MONTHLY', 'FINAL', 'CUSTOM');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "avatar_url" VARCHAR(500),
    "role" "Role" NOT NULL DEFAULT 'RECRUIT',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recruit_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "department" VARCHAR(100),
    "position" VARCHAR(200),
    "start_date" DATE,
    "expected_end_date" DATE,
    "bio" TEXT,
    "onboarding_status" VARCHAR(50) NOT NULL DEFAULT 'NOT_STARTED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recruit_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_entries" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "due_date" DATE,
    "completed_at" TIMESTAMP(3),
    "visibility" "Visibility" NOT NULL DEFAULT 'MANAGER_ONLY',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "task_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "issue_entries" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "IssueSeverity" NOT NULL DEFAULT 'MEDIUM',
    "status" "IssueStatus" NOT NULL DEFAULT 'OPEN',
    "resolution_note" TEXT,
    "resolved_at" TIMESTAMP(3),
    "visibility" "Visibility" NOT NULL DEFAULT 'MANAGER_ONLY',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "issue_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback_entries" (
    "id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "type" "FeedbackType" NOT NULL DEFAULT 'NEUTRAL',
    "title" VARCHAR(255) NOT NULL,
    "body" TEXT NOT NULL,
    "rating" SMALLINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "feedback_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "note_entries" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "body" TEXT NOT NULL,
    "mood_rating" SMALLINT,
    "entry_date" DATE NOT NULL,
    "visibility" "Visibility" NOT NULL DEFAULT 'PRIVATE',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "note_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "recruit_id" TEXT NOT NULL,
    "generated_by" TEXT NOT NULL,
    "type" "ReportType" NOT NULL DEFAULT 'WEEKLY',
    "status" "ReportStatus" NOT NULL DEFAULT 'DRAFT',
    "title" VARCHAR(255) NOT NULL,
    "summary" TEXT,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "generated_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manager_recruit_relationships" (
    "id" TEXT NOT NULL,
    "manager_id" TEXT NOT NULL,
    "recruit_id" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassigned_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,

    CONSTRAINT "manager_recruit_relationships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_agent" VARCHAR(500),
    "ip_address" VARCHAR(45),

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "recruit_profiles_user_id_key" ON "recruit_profiles"("user_id");

-- CreateIndex
CREATE INDEX "recruit_profiles_department_idx" ON "recruit_profiles"("department");

-- CreateIndex
CREATE INDEX "recruit_profiles_onboarding_status_idx" ON "recruit_profiles"("onboarding_status");

-- CreateIndex
CREATE INDEX "task_entries_user_id_idx" ON "task_entries"("user_id");

-- CreateIndex
CREATE INDEX "task_entries_status_idx" ON "task_entries"("status");

-- CreateIndex
CREATE INDEX "task_entries_priority_idx" ON "task_entries"("priority");

-- CreateIndex
CREATE INDEX "task_entries_due_date_idx" ON "task_entries"("due_date");

-- CreateIndex
CREATE INDEX "task_entries_user_id_status_idx" ON "task_entries"("user_id", "status");

-- CreateIndex
CREATE INDEX "issue_entries_user_id_idx" ON "issue_entries"("user_id");

-- CreateIndex
CREATE INDEX "issue_entries_status_idx" ON "issue_entries"("status");

-- CreateIndex
CREATE INDEX "issue_entries_severity_idx" ON "issue_entries"("severity");

-- CreateIndex
CREATE INDEX "issue_entries_user_id_status_idx" ON "issue_entries"("user_id", "status");

-- CreateIndex
CREATE INDEX "feedback_entries_author_id_idx" ON "feedback_entries"("author_id");

-- CreateIndex
CREATE INDEX "feedback_entries_subject_id_idx" ON "feedback_entries"("subject_id");

-- CreateIndex
CREATE INDEX "feedback_entries_type_idx" ON "feedback_entries"("type");

-- CreateIndex
CREATE INDEX "feedback_entries_author_id_subject_id_idx" ON "feedback_entries"("author_id", "subject_id");

-- CreateIndex
CREATE INDEX "note_entries_user_id_idx" ON "note_entries"("user_id");

-- CreateIndex
CREATE INDEX "note_entries_entry_date_idx" ON "note_entries"("entry_date");

-- CreateIndex
CREATE INDEX "note_entries_user_id_entry_date_idx" ON "note_entries"("user_id", "entry_date");

-- CreateIndex
CREATE INDEX "reports_recruit_id_idx" ON "reports"("recruit_id");

-- CreateIndex
CREATE INDEX "reports_generated_by_idx" ON "reports"("generated_by");

-- CreateIndex
CREATE INDEX "reports_status_idx" ON "reports"("status");

-- CreateIndex
CREATE INDEX "reports_type_idx" ON "reports"("type");

-- CreateIndex
CREATE INDEX "reports_recruit_id_period_start_period_end_idx" ON "reports"("recruit_id", "period_start", "period_end");

-- CreateIndex
CREATE INDEX "manager_recruit_relationships_manager_id_idx" ON "manager_recruit_relationships"("manager_id");

-- CreateIndex
CREATE INDEX "manager_recruit_relationships_recruit_id_idx" ON "manager_recruit_relationships"("recruit_id");

-- CreateIndex
CREATE INDEX "manager_recruit_relationships_is_active_idx" ON "manager_recruit_relationships"("is_active");

-- CreateIndex
CREATE INDEX "manager_recruit_relationships_manager_id_is_active_idx" ON "manager_recruit_relationships"("manager_id", "is_active");

-- CreateIndex
CREATE INDEX "manager_recruit_relationships_recruit_id_is_active_idx" ON "manager_recruit_relationships"("recruit_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "manager_recruit_relationships_manager_id_recruit_id_is_acti_key" ON "manager_recruit_relationships"("manager_id", "recruit_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens"("expires_at");

-- AddForeignKey
ALTER TABLE "recruit_profiles" ADD CONSTRAINT "recruit_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_entries" ADD CONSTRAINT "task_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issue_entries" ADD CONSTRAINT "issue_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_entries" ADD CONSTRAINT "feedback_entries_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_entries" ADD CONSTRAINT "feedback_entries_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "note_entries" ADD CONSTRAINT "note_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_generated_by_fkey" FOREIGN KEY ("generated_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manager_recruit_relationships" ADD CONSTRAINT "manager_recruit_relationships_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manager_recruit_relationships" ADD CONSTRAINT "manager_recruit_relationships_recruit_id_fkey" FOREIGN KEY ("recruit_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

