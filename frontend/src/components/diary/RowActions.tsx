import { IconButton, Tooltip } from '@mui/material';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/EditOutlined';
import type { ReactNode } from 'react';

interface Props {
  label: string;
  onEdit: () => void;
  onDelete: () => void;
  children?: ReactNode;
}

export function RowActions({ label, onEdit, onDelete, children }: Props) {
  return (
    <>
      {children}
      <Tooltip title="Edit">
        <IconButton size="small" aria-label={`Edit ${label}`} onClick={onEdit}>
          <EditIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Delete">
        <IconButton size="small" aria-label={`Delete ${label}`} onClick={onDelete}>
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </>
  );
}
