import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import {
  Card,
  CardContent,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import type { ReactNode } from 'react';

export interface EntryColumn<T> {
  key: string;
  label: string;
  render: (row: T) => ReactNode;
  primary?: boolean;
}

interface EntryListProps<T extends { id: number }> {
  rows: T[];
  columns: EntryColumn<T>[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
}

export function EntryList<T extends { id: number }>({
  rows,
  columns,
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onEdit,
  onDelete,
}: EntryListProps<T>) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const showActions = Boolean(onEdit || onDelete);

  const actions = (row: T) =>
    showActions ? (
      <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
        {onEdit ? (
          <IconButton size="small" aria-label={`Edit entry ${row.id}`} onClick={() => onEdit(row)}>
            <EditIcon fontSize="small" />
          </IconButton>
        ) : null}
        {onDelete ? (
          <IconButton size="small" aria-label={`Delete entry ${row.id}`} onClick={() => onDelete(row)}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        ) : null}
      </Stack>
    ) : null;

  const pagination = (
    <TablePagination
      component="div"
      count={total}
      page={page - 1}
      rowsPerPage={pageSize}
      rowsPerPageOptions={[10, 20, 50]}
      onPageChange={(_, nextPage) => onPageChange(nextPage + 1)}
      onRowsPerPageChange={(event) => onPageSizeChange(Number(event.target.value))}
    />
  );

  if (isMobile) {
    return (
      <Stack spacing={2}>
        {rows.map((row) => (
          <Card key={row.id} variant="outlined">
            <CardContent>
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Stack spacing={0.5} sx={{ minWidth: 0 }}>
                  {columns.map((column) => (
                    <Typography
                      key={column.key}
                      variant={column.primary ? 'subtitle1' : 'body2'}
                      color={column.primary ? 'text.primary' : 'text.secondary'}
                      component="div"
                    >
                      {column.primary ? null : `${column.label}: `}
                      {column.render(row)}
                    </Typography>
                  ))}
                </Stack>
                {actions(row)}
              </Stack>
            </CardContent>
          </Card>
        ))}
        {pagination}
      </Stack>
    );
  }

  return (
    <Paper variant="outlined">
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell key={column.key}>{column.label}</TableCell>
              ))}
              {showActions ? <TableCell align="right">Actions</TableCell> : null}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id} hover>
                {columns.map((column) => (
                  <TableCell key={column.key}>{column.render(row)}</TableCell>
                ))}
                {showActions ? <TableCell align="right">{actions(row)}</TableCell> : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {pagination}
    </Paper>
  );
}
