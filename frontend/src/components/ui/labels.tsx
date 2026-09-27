import type { AssignmentStatus, Role, UserStatus } from "@/lib/apiClient";
import styles from "./table.module.css";

export const ROLE_LABELS: Record<Role, string> = {
  NEW_RECRUIT: "New recruit",
  MANAGER: "Manager",
  ADMIN: "Admin",
};

export const ROLES: Role[] = ["NEW_RECRUIT", "MANAGER", "ADMIN"];
export const USER_STATUSES: UserStatus[] = ["INVITED", "ACTIVE", "DEACTIVATED"];

const STATUS_CLASS: Record<UserStatus | AssignmentStatus, string> = {
  INVITED: styles.badgeInvited,
  ACTIVE: styles.badgeActive,
  DEACTIVATED: styles.badgeDeactivated,
  REASSIGNED: styles.badgeReassigned,
  ENDED: styles.badgeReassigned,
};

export function StatusBadge({ status }: { status: UserStatus | AssignmentStatus }) {
  return (
    <span className={`${styles.badge} ${STATUS_CLASS[status]}`} data-testid={`status-${status}`}>
      {status}
    </span>
  );
}

export function formatDateTime(iso: string | null | undefined) {
  return iso ? new Date(iso).toLocaleString() : "—";
}

export function formatDate(iso: string | null | undefined) {
  return iso ? new Date(iso).toLocaleDateString() : "—";
}
