import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControl,
  FormControlLabel,
  FormLabel,
  Grid,
  LinearProgress,
  MenuItem,
  Radio,
  RadioGroup,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import PreviewIcon from '@mui/icons-material/Preview';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { getErrorMessage } from '../api/errors';
import { fetchRecruits } from '../api/manager';
import {
  REPORT_FORMATS,
  REPORT_TYPES,
  downloadReport,
  previewReport,
  saveBlob,
  type ReportFormat,
  type ReportParams,
  type ReportPreview,
  type ReportScope,
  type ReportType,
} from '../api/reports';
import { useAuth } from '../auth/useAuth';
import { MAX_REPORT_RANGE_DAYS, rangeError, shiftIsoDate } from '../utils/reportRange';
import { todayIso } from '../utils/dates';
import { enumLabel } from '../utils/labels';

const SCOPE_LABELS: Record<ReportScope, string> = {
  SELF: 'One person',
  TEAM: 'My team',
  ALL: 'All recruits',
};

export function ReportsPage() {
  const { user, hasRole } = useAuth();
  const today = todayIso();
  const isManager = hasRole('MANAGER', 'ADMIN');
  const isAdmin = hasRole('ADMIN');
  const startDate = user?.profile.startDate ?? today;

  const [from, setFrom] = useState(shiftIsoDate(today, -29));
  const [to, setTo] = useState(today);
  const [type, setType] = useState<ReportType>('COMBINED');
  const [format, setFormat] = useState<ReportFormat>('PDF');
  const [scope, setScope] = useState<ReportScope>('SELF');
  const [subject, setSubject] = useState('');
  const [preview, setPreview] = useState<ReportPreview | null>(null);
  const [busy, setBusy] = useState<'preview' | 'download' | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recruits = useQuery({
    queryKey: ['manager-recruits'],
    queryFn: fetchRecruits,
    enabled: isManager,
  });

  const invalid = rangeError(from, to);
  const params: ReportParams = {
    type,
    from,
    to,
    scope,
    ...(scope === 'SELF' && subject ? { userId: Number(subject) } : {}),
  };

  const applyPreset = (preset: 'week' | 'month' | 'start') => {
    const now = new Date();
    if (preset === 'week') setFrom(shiftIsoDate(today, -((now.getDay() + 6) % 7)));
    if (preset === 'month') setFrom(shiftIsoDate(today, -29));
    if (preset === 'start') {
      const earliest = shiftIsoDate(today, -(MAX_REPORT_RANGE_DAYS - 1));
      setFrom(startDate < earliest ? earliest : startDate);
    }
    setTo(today);
    setPreview(null);
  };

  const change =
    <T,>(setter: (value: T) => void) =>
    (value: T) => {
      setter(value);
      setPreview(null);
      setError(null);
    };

  const runPreview = async () => {
    setBusy('preview');
    setError(null);
    try {
      setPreview(await previewReport(params));
    } catch (err) {
      setError(getErrorMessage(err, 'Could not preview the report'));
    } finally {
      setBusy(null);
    }
  };

  const runDownload = async () => {
    setBusy('download');
    setProgress(0);
    setError(null);
    try {
      const { blob, fileName } = await downloadReport({ ...params, format }, setProgress);
      saveBlob(blob, fileName);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not generate the report'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Box>
      <Typography variant="h5" component="h1" fontWeight={600} mb={2}>
        Reports
      </Typography>
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Stack direction="row" gap={1} mb={1.5} flexWrap="wrap">
                <Chip label="This week" onClick={() => applyPreset('week')} />
                <Chip label="Last 30 days" onClick={() => applyPreset('month')} />
                <Chip label="Since start" onClick={() => applyPreset('start')} />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}>
                <TextField
                  label="From"
                  type="date"
                  value={from}
                  onChange={(e) => change(setFrom)(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ max: today }}
                  fullWidth
                />
                <TextField
                  label="To"
                  type="date"
                  value={to}
                  onChange={(e) => change(setTo)(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ max: today }}
                  error={!!invalid}
                  helperText={invalid ?? ' '}
                  fullWidth
                />
              </Stack>
              {isManager && (
                <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}>
                  <TextField
                    select
                    label="Scope"
                    value={scope}
                    onChange={(e) => change(setScope)(e.target.value as ReportScope)}
                    fullWidth
                  >
                    {(isAdmin
                      ? (['SELF', 'TEAM', 'ALL'] as const)
                      : (['SELF', 'TEAM'] as const)
                    ).map((value) => (
                      <MenuItem key={value} value={value}>
                        {SCOPE_LABELS[value]}
                      </MenuItem>
                    ))}
                  </TextField>
                  {scope === 'SELF' && (
                    <TextField
                      select
                      label="Person"
                      value={subject}
                      onChange={(e) => change(setSubject)(e.target.value)}
                      fullWidth
                    >
                      <MenuItem value="">Myself</MenuItem>
                      {(recruits.data ?? []).map((recruit) => (
                        <MenuItem key={recruit.id} value={String(recruit.id)}>
                          {recruit.fullName}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                </Stack>
              )}
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl>
                <FormLabel id="report-type">Report type</FormLabel>
                <RadioGroup
                  row
                  aria-labelledby="report-type"
                  value={type}
                  onChange={(e) => change(setType)(e.target.value as ReportType)}
                >
                  {REPORT_TYPES.map((value) => (
                    <FormControlLabel
                      key={value}
                      value={value}
                      control={<Radio />}
                      label={enumLabel(value)}
                    />
                  ))}
                </RadioGroup>
              </FormControl>
              <FormControl sx={{ display: 'block', mt: 1 }}>
                <FormLabel id="report-format">Format</FormLabel>
                <RadioGroup
                  row
                  aria-labelledby="report-format"
                  value={format}
                  onChange={(e) => setFormat(e.target.value as ReportFormat)}
                >
                  {REPORT_FORMATS.map((value) => (
                    <FormControlLabel key={value} value={value} control={<Radio />} label={value} />
                  ))}
                </RadioGroup>
              </FormControl>
              <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                Notes are private and never included in reports.
              </Typography>
            </Grid>
          </Grid>
          <Stack direction="row" gap={1} mt={2} flexWrap="wrap">
            <Button
              variant="outlined"
              startIcon={<PreviewIcon />}
              disabled={!!invalid || busy !== null}
              onClick={runPreview}
            >
              Preview
            </Button>
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              disabled={!!invalid || busy !== null}
              onClick={runDownload}
            >
              Download {format}
            </Button>
          </Stack>
          {busy && (
            <Box mt={2}>
              <LinearProgress aria-label="Working" />
              {busy === 'download' && progress > 0 && (
                <Typography variant="caption">{Math.round(progress / 1024)} KB received</Typography>
              )}
            </Box>
          )}
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </CardContent>
      </Card>
      {preview && <PreviewPanel preview={preview} />}
    </Box>
  );
}

function PreviewPanel({ preview }: { preview: ReportPreview }) {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" component="h2">
          Preview
        </Typography>
        <Stack direction="row" gap={1} my={1} flexWrap="wrap">
          {Object.entries(preview.counts).map(([recordType, count]) => (
            <Chip key={recordType} label={`${enumLabel(recordType)}: ${count}`} />
          ))}
          <Chip variant="outlined" label={`${preview.subjects.length} recruit(s)`} />
        </Stack>
        {preview.totalRows === 0 ? (
          <Typography color="text.secondary">No entries in this period.</Typography>
        ) : (
          <>
            <Typography variant="caption" color="text.secondary">
              Showing {preview.rows.length} of {preview.totalRows} rows
            </Typography>
            <TableContainer sx={{ maxHeight: 480 }}>
              <Table size="small" stickyHeader aria-label="Report preview">
                <TableHead>
                  <TableRow>
                    {preview.columns.map((column) => (
                      <TableCell key={column.key}>{column.label}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {preview.rows.map((row, index) => (
                    <TableRow key={index}>
                      {row.map((cell, cellIndex) => (
                        <TableCell
                          key={cellIndex}
                          sx={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis' }}
                        >
                          {cell ?? ''}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </CardContent>
    </Card>
  );
}
