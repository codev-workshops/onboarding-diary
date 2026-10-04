import {
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Pagination,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import type { ReactNode } from 'react';
import type { Page } from '../../api/diaryTypes';

export interface Column<T> {
  header: string;
  render: (item: T) => ReactNode;
  width?: number | string;
}

interface Props<T extends { id: number }> {
  data: Page<T> | undefined;
  isLoading: boolean;
  error: string | null;
  emptyMessage: string;
  columns: Column<T>[];
  renderCard: (item: T) => ReactNode;
  renderActions: (item: T) => ReactNode;
  page: number;
  onPageChange: (page: number) => void;
  /** Renders cards at every width, e.g. for the notes grid. */
  cardsOnly?: boolean;
  rowSx?: (item: T) => object | undefined;
}

/** Table on desktop, card list on phones, with loading/empty/error states and pagination. */
export function EntryList<T extends { id: number }>({
  data,
  isLoading,
  error,
  emptyMessage,
  columns,
  renderCard,
  renderActions,
  page,
  onPageChange,
  cardsOnly,
  rowSx,
}: Props<T>) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" py={6}>
        <CircularProgress aria-label="Loading" />
      </Box>
    );
  }
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data || data.content.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">{emptyMessage}</Typography>
      </Paper>
    );
  }

  const body =
    isDesktop && !cardsOnly ? (
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell key={column.header} sx={{ width: column.width, fontWeight: 600 }}>
                  {column.header}
                </TableCell>
              ))}
              <TableCell align="right" sx={{ width: 120, fontWeight: 600 }}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.content.map((item) => (
              <TableRow key={item.id} hover sx={rowSx?.(item)}>
                {columns.map((column) => (
                  <TableCell key={column.header}>{column.render(item)}</TableCell>
                ))}
                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                  {renderActions(item)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    ) : (
      <Box
        display="grid"
        gap={2}
        gridTemplateColumns={
          cardsOnly ? { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' } : '1fr'
        }
      >
        {data.content.map((item) => (
          <Card key={item.id} variant="outlined" sx={rowSx?.(item)}>
            <CardContent sx={{ pb: 1 }}>
              {renderCard(item)}
              <Stack direction="row" justifyContent="flex-end" mt={1}>
                {renderActions(item)}
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Box>
    );

  return (
    <Box>
      {body}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mt={2}>
        <Typography variant="body2" color="text.secondary">
          {data.totalElements} {data.totalElements === 1 ? 'entry' : 'entries'}
        </Typography>
        {data.totalPages > 1 && (
          <Pagination
            count={data.totalPages}
            page={page}
            onChange={(_, value) => onPageChange(value)}
            color="primary"
            size="small"
          />
        )}
      </Stack>
    </Box>
  );
}
