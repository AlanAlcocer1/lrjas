-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED');

-- CreateEnum
CREATE TYPE "ResponsibleType" AS ENUM ('PRIMARY', 'SECONDARY');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "group_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "access_roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "access_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "participant_access_roles" (
    "participant_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "participant_access_roles_pkey" PRIMARY KEY ("participant_id","role_id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_members" (
    "team_id" TEXT NOT NULL,
    "participant_id" TEXT NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("team_id","participant_id")
);

-- CreateTable
CREATE TABLE "activity_statuses" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#84bd31',
    "position" INTEGER NOT NULL DEFAULT 0,
    "is_initial" BOOLEAN NOT NULL DEFAULT false,
    "is_final" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activity_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "public_description" TEXT NOT NULL,
    "internal_description" TEXT,
    "date" DATE NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT,
    "location" TEXT NOT NULL,
    "location_url" TEXT,
    "cover_image_url" TEXT,
    "team_id" TEXT,
    "status_id" TEXT NOT NULL,
    "approval_status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "requires_budget" BOOLEAN NOT NULL DEFAULT false,
    "internal_notes" TEXT,
    "created_by_id" TEXT NOT NULL,
    "approved_by_id" TEXT,
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_responsibles" (
    "id" TEXT NOT NULL,
    "activity_id" TEXT NOT NULL,
    "participant_id" TEXT NOT NULL,
    "type" "ResponsibleType" NOT NULL DEFAULT 'SECONDARY',

    CONSTRAINT "activity_responsibles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_tasks" (
    "id" TEXT NOT NULL,
    "activity_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "assignee_id" TEXT,
    "due_date" DATE,
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMP(3),
    "completed_by_id" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activity_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_requests" (
    "id" TEXT NOT NULL,
    "activity_id" TEXT NOT NULL,
    "requested_by_id" TEXT NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_by_id" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "comments" TEXT,
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approval_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_budgets" (
    "id" TEXT NOT NULL,
    "activity_id" TEXT NOT NULL,
    "requested_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "approved_amount" DECIMAL(12,2),
    "spent_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activity_budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_items" (
    "id" TEXT NOT NULL,
    "budget_id" TEXT NOT NULL,
    "concept" TEXT NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "budget_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_history" (
    "id" TEXT NOT NULL,
    "activity_id" TEXT NOT NULL,
    "participant_id" TEXT,
    "action" TEXT NOT NULL,
    "old_value" JSONB,
    "new_value" JSONB,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "participant_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "data" JSONB,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "permissions_key_key" ON "permissions"("key");

-- CreateIndex
CREATE INDEX "permissions_group_key_idx" ON "permissions"("group_key");

-- CreateIndex
CREATE UNIQUE INDEX "access_roles_name_key" ON "access_roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "teams_name_key" ON "teams"("name");

-- CreateIndex
CREATE UNIQUE INDEX "activity_statuses_name_key" ON "activity_statuses"("name");

-- CreateIndex
CREATE UNIQUE INDEX "activities_slug_key" ON "activities"("slug");

-- CreateIndex
CREATE INDEX "activities_approval_status_idx" ON "activities"("approval_status");

-- CreateIndex
CREATE INDEX "activities_date_idx" ON "activities"("date");

-- CreateIndex
CREATE INDEX "activities_team_id_idx" ON "activities"("team_id");

-- CreateIndex
CREATE INDEX "activities_status_id_idx" ON "activities"("status_id");

-- CreateIndex
CREATE INDEX "activity_responsibles_participant_id_idx" ON "activity_responsibles"("participant_id");

-- CreateIndex
CREATE UNIQUE INDEX "activity_responsibles_activity_id_participant_id_key" ON "activity_responsibles"("activity_id", "participant_id");

-- CreateIndex
CREATE INDEX "activity_tasks_activity_id_idx" ON "activity_tasks"("activity_id");

-- CreateIndex
CREATE INDEX "activity_tasks_assignee_id_idx" ON "activity_tasks"("assignee_id");

-- CreateIndex
CREATE INDEX "approval_requests_activity_id_idx" ON "approval_requests"("activity_id");

-- CreateIndex
CREATE INDEX "approval_requests_status_idx" ON "approval_requests"("status");

-- CreateIndex
CREATE UNIQUE INDEX "activity_budgets_activity_id_key" ON "activity_budgets"("activity_id");

-- CreateIndex
CREATE INDEX "budget_items_budget_id_idx" ON "budget_items"("budget_id");

-- CreateIndex
CREATE INDEX "activity_history_activity_id_idx" ON "activity_history"("activity_id");

-- CreateIndex
CREATE INDEX "notifications_participant_id_read_at_idx" ON "notifications"("participant_id", "read_at");

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "access_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "participant_access_roles" ADD CONSTRAINT "participant_access_roles_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "participant_access_roles" ADD CONSTRAINT "participant_access_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "access_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "team_members" ADD CONSTRAINT "team_members_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "activities" ADD CONSTRAINT "activities_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "activities" ADD CONSTRAINT "activities_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "activity_statuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "activities" ADD CONSTRAINT "activities_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "participants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "activities" ADD CONSTRAINT "activities_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "participants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "activity_responsibles" ADD CONSTRAINT "activity_responsibles_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "activity_responsibles" ADD CONSTRAINT "activity_responsibles_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "activity_tasks" ADD CONSTRAINT "activity_tasks_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "activity_tasks" ADD CONSTRAINT "activity_tasks_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "participants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "activity_tasks" ADD CONSTRAINT "activity_tasks_completed_by_id_fkey" FOREIGN KEY ("completed_by_id") REFERENCES "participants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "participants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "participants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "activity_budgets" ADD CONSTRAINT "activity_budgets_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "budget_items" ADD CONSTRAINT "budget_items_budget_id_fkey" FOREIGN KEY ("budget_id") REFERENCES "activity_budgets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "activity_history" ADD CONSTRAINT "activity_history_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "activity_history" ADD CONSTRAINT "activity_history_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "notifications" ADD CONSTRAINT "notifications_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
