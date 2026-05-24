import type { EnrollmentStatus, MilestoneCategory } from '../enums';

export interface MilestoneDto {
  id: string;
  name: string;
  description: string | null;
  target_day: number;
  category: MilestoneCategory;
  sort_order: number;
}

export interface ProgramDto {
  id: string;
  name: string;
  description: string | null;
  duration_days: number;
  is_active: boolean;
  milestone_count: number;
  enrollment_count: number;
  created_at: string;
  updated_at: string;
}

export interface ProgramDetailDto extends ProgramDto {
  milestones: MilestoneDto[];
}

export interface CreateProgramInput {
  name: string;
  description?: string;
  duration_days: number;
  milestones?: CreateMilestoneInput[];
}

export interface UpdateProgramInput {
  name?: string;
  description?: string;
  duration_days?: number;
  is_active?: boolean;
}

export interface CreateMilestoneInput {
  name: string;
  description?: string;
  target_day: number;
  category: MilestoneCategory;
  sort_order: number;
}

export interface EnrollmentDto {
  id: string;
  user_id: string;
  program_id: string;
  program_name: string;
  status: EnrollmentStatus;
  enrolled_at: string;
  completed_at: string | null;
}
