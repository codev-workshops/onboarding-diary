export interface ManagerRecruitRelationshipDto {
  id: string;
  manager_id: string;
  recruit_id: string;
  assigned_at: string;
  unassigned_at: string | null;
  is_active: boolean;
  notes: string | null;
  manager?: {
    id: string;
    first_name: string;
    last_name: string;
  };
  recruit?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

export interface CreateManagerRecruitInput {
  manager_id: string;
  recruit_id: string;
  notes?: string;
}
