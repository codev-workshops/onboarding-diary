import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Stepper,
  Step,
  StepLabel,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormGroup,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  SelectChangeEvent,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import DownloadIcon from '@mui/icons-material/Download';
import dayjs, { Dayjs } from 'dayjs';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import EmptyState from '@/components/common/EmptyState';
import { reportService, ReportMeta, ReportRequest } from '@/services/reportService';

const STEPS = ['Select Date Range', 'Select Categories', 'Select Format', 'Generate'];
const CATEGORIES = ['TASKS', 'ISSUES', 'FEEDBACK', 'NOTES'];
const FORMATS: Array<'PDF' | 'CSV' | 'EXCEL'> = ['PDF', 'CSV', 'EXCEL'];

export default function ReportsPage() {
  const [activeStep, setActiveStep] = useState(0);
  const [dateFrom, setDateFrom] = useState(dayjs().subtract(30, 'day').format('YYYY-MM-DD'));
  const [dateTo, setDateTo] = useState(dayjs().format('YYYY-MM-DD'));
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['TASKS']);
  const [format, setFormat] = useState<'PDF' | 'CSV' | 'EXCEL'>('PDF');
  const [generating, setGenerating] = useState(false);
  const [reports, setReports] = useState<ReportMeta[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);

  useEffect(() => {
    reportService
      .listReports()
      .then(setReports)
      .catch(() => setReports([]))
      .finally(() => setLoadingReports(false));
  }, []);

  const handleCategoryToggle = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const request: ReportRequest = {
        dateFrom,
        dateTo,
        categories: selectedCategories,
        format,
      };
      const meta = await reportService.generate(request);
      setReports((prev) => [meta, ...prev]);
      setActiveStep(0);
    } catch {
      // error handling
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (report: ReportMeta) => {
    try {
      const blob = await reportService.download(report.id);
      const url = window.URL.createObjectURL(blob as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = report.fileName;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      // error handling
    }
  };

  const canNext = () => {
    if (activeStep === 0) return !!dateFrom && !!dateTo;
    if (activeStep === 1) return selectedCategories.length > 0;
    if (activeStep === 2) return !!format;
    return true;
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box display="flex" gap={3} flexWrap="wrap" mt={2}>
            <DatePicker
              label="From"
              value={dayjs(dateFrom)}
              onChange={(val: Dayjs | null) => setDateFrom(val?.format('YYYY-MM-DD') || dateFrom)}
              slotProps={{ textField: { sx: { minWidth: 200 } } }}
            />
            <DatePicker
              label="To"
              value={dayjs(dateTo)}
              onChange={(val: Dayjs | null) => setDateTo(val?.format('YYYY-MM-DD') || dateTo)}
              slotProps={{ textField: { sx: { minWidth: 200 } } }}
            />
          </Box>
        );
      case 1:
        return (
          <FormGroup sx={{ mt: 2 }}>
            {CATEGORIES.map((cat) => (
              <FormControlLabel
                key={cat}
                control={
                  <Checkbox
                    checked={selectedCategories.includes(cat)}
                    onChange={() => handleCategoryToggle(cat)}
                  />
                }
                label={cat}
              />
            ))}
          </FormGroup>
        );
      case 2:
        return (
          <FormControl sx={{ mt: 2, minWidth: 200 }}>
            <InputLabel>Format</InputLabel>
            <Select value={format} label="Format" onChange={(e: SelectChangeEvent) => setFormat(e.target.value as 'PDF' | 'CSV' | 'EXCEL')}>
              {FORMATS.map((f) => (
                <MenuItem key={f} value={f}>{f}</MenuItem>
              ))}
            </Select>
          </FormControl>
        );
      case 3:
        return (
          <Box mt={2}>
            <Typography variant="body1" gutterBottom>
              <strong>Date Range:</strong> {dayjs(dateFrom).format('MMM D, YYYY')} - {dayjs(dateTo).format('MMM D, YYYY')}
            </Typography>
            <Typography variant="body1" gutterBottom>
              <strong>Categories:</strong>{' '}
              {selectedCategories.map((c) => (
                <Chip key={c} label={c} size="small" sx={{ mr: 0.5 }} />
              ))}
            </Typography>
            <Typography variant="body1" gutterBottom>
              <strong>Format:</strong> {format}
            </Typography>
            <Button variant="contained" onClick={handleGenerate} disabled={generating} sx={{ mt: 2 }}>
              {generating ? 'Generating...' : 'Generate Report'}
            </Button>
          </Box>
        );
      default:
        return null;
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Reports
      </Typography>

      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Generate New Report
          </Typography>
          <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 3 }}>
            {STEPS.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
          {renderStepContent()}
          {activeStep < 3 && (
            <Box display="flex" justifyContent="space-between" mt={3}>
              <Button disabled={activeStep === 0} onClick={() => setActiveStep((s) => s - 1)}>
                Back
              </Button>
              <Button variant="contained" disabled={!canNext()} onClick={() => setActiveStep((s) => s + 1)}>
                Next
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Previous Reports
          </Typography>
          {loadingReports ? (
            <LoadingSpinner />
          ) : reports.length === 0 ? (
            <EmptyState message="No reports generated yet" />
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>File Name</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Format</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Date Range</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Generated</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.id} hover>
                      <TableCell>{report.fileName}</TableCell>
                      <TableCell>
                        <Chip label={report.format} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        {dayjs(report.dateFrom).format('MMM D')} - {dayjs(report.dateTo).format('MMM D, YYYY')}
                      </TableCell>
                      <TableCell>{dayjs(report.generatedAt).format('MMM D, YYYY h:mm A')}</TableCell>
                      <TableCell>
                        <Button size="small" startIcon={<DownloadIcon />} onClick={() => handleDownload(report)}>
                          Download
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
