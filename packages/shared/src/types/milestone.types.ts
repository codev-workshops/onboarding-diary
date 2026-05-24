import type { CompletionStatus, MilestoneCategory } from '../enums';

export interface MilestoneProgressDto {
  milestone_id: string;
  milestone_name: string;
  milestone_description: string | null;
  target_day: number;
  category: MilestoneCategory;
  completion: MilestoneCompletionDto | null;
}

export interface MilestoneCompletionDto {
  id: string;
  note: string | null;
  status: CompletionStatus;
  completed_at: string;
  verified_by: string | null;
  verified_at: string | null;
}

export interface CompleteMilestoneInput {
  note?: string;
}

export interface VerifyMilestoneInput {
  status: CompletionStatus.VERIFIED | CompletionStatus.REJECTED;
  note?: string;
}
