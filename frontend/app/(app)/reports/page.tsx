"use client";

import { useCallback, useEffect, useState } from "react";
import { ProtectedRoute } from "@/lib/protected-route";
import { useAuth } from "@/lib/auth-context";
import {
  generateReport,
  listReports,
  downloadReportUrl,
  listUsers,
  getAccessToken,
  type ReportListItemDto,
  type GenerateReportPayload,
  type UserListItemDto,
} from "@/lib/api";
import styles from "./reports.module.css";

const CATEGORY_OPTIONS = ["tasks", "issues", "feedback", "notes"] as const;

interface FormData {
  startDate: string;
  endDate: string;
  categories: string[];
  recruitId: string;
  format: string;
}

interface FormErrors {
  startDate?: string;
  endDate?: string;
  categories?: string;
  format?: string;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function emptyForm(): FormData {
  return {
    startDate: "",
    endDate: todayStr(),
    categories: [],
    recruitId: "",
    format: "Pdf",
  };
}

function validateForm(data: FormData): FormErrors {
  const errs: FormErrors = {};
  if (!data.startDate) errs.startDate = "Start date is required.";
  if (!data.endDate) errs.endDate = "End date is required.";
  if (data.startDate && data.endDate) {
    if (data.endDate < data.startDate) errs.endDate = "End date must be on or after start date.";
    const diffMs = new Date(data.endDate).getTime() - new Date(data.startDate).getTime();
    if (diffMs / (1000 * 60 * 60 * 24) > 365) errs.endDate = "Date range must not exceed 365 days.";
  }
  if (data.categories.length === 0) errs.categories = "At least one category must be selected.";
  if (!data.format) errs.format = "Format is required.";
  return errs;
}

function ReportsContent() {
  const { user } = useAuth();
  const isManagerOrAdmin = user?.role === "Manager" || user?.role === "Admin";

  const [reports, setReports] = useState<ReportListItemDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState<FormData>(emptyForm());
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<{ reportId: string; downloadUrl: string } | null>(null);

  const [recruits, setRecruits] = useState<UserListItemDto[]>([]);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / 20));

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await listReports(page, 20);
        if (!cancelled) {
          setReports(res.reports);
          setTotal(res.total);
        }
      } catch (err) {
        if (!cancelled) showToast(err instanceof Error ? err.message : "Failed to load reports.", "error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [page, showToast, refreshKey]);

  useEffect(() => {
    if (!isManagerOrAdmin) return;
    let cancelled = false;
    async function loadRecruits() {
      try {
        const res = await listUsers({ limit: 100, role: "Recruit" });
        if (!cancelled) setRecruits(res.users);
      } catch {
        // ignore
      }
    }
    loadRecruits();
    return () => { cancelled = true; };
  }, [isManagerOrAdmin]);

  function openGenerate() {
    setFormData(emptyForm());
    setFormErrors({});
    setGeneratedResult(null);
    setModalOpen(true);
  }

  function handleCategoryToggle(cat: string, checked: boolean) {
    setFormData(prev => {
      if (cat === "all") {
        return { ...prev, categories: checked ? [...CATEGORY_OPTIONS] : [] };
      }
      const next = checked
        ? [...prev.categories.filter(c => c !== cat), cat]
        : prev.categories.filter(c => c !== cat);
      return { ...prev, categories: next };
    });
  }

  async function handleGenerate() {
    const errs = validateForm(formData);
    setFormErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    try {
      const payload: GenerateReportPayload = {
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
        categories: formData.categories,
        format: formData.format,
      };
      if (formData.recruitId) payload.recruitId = formData.recruitId;

      const result = await generateReport(payload);
      setGeneratedResult(result);
      setRefreshKey(k => k + 1);
      showToast("Report generated successfully.", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to generate report.", "error");
    } finally {
      setSaving(false);
    }
  }

  function handleDownload(reportId: string, format: string) {
    const url = downloadReportUrl(reportId, format);
    const token = getAccessToken();
    const a = document.createElement("a");

    fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(res => {
        if (!res.ok) throw new Error("Download failed");
        return res.blob();
      })
      .then(blob => {
        const blobUrl = URL.createObjectURL(blob);
        a.href = blobUrl;
        a.download = `report-${reportId}.${format.toLowerCase()}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
      })
      .catch(err => {
        showToast(err instanceof Error ? err.message : "Download failed.", "error");
      });
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Reports</h1>
        <button className={styles.newBtn} onClick={openGenerate}>
          + Generate New Report
        </button>
      </div>

      {loading ? (
        <p className={styles.empty}>Loading reports...</p>
      ) : reports.length === 0 ? (
        <p className={styles.empty}>No reports found. Click &quot;+ Generate New Report&quot; to create one.</p>
      ) : (
        <>
          <div className={styles.reportList}>
            {reports.map(report => (
              <div key={report.id} className={styles.reportCard}>
                <div className={styles.reportCardHeader}>
                  <div>
                    <span className={styles.reportTitle}>{report.recruitName}</span>
                    <div className={styles.reportMeta}>
                      {new Date(report.startDate).toLocaleDateString()} &ndash; {new Date(report.endDate).toLocaleDateString()}
                      {" | "}Generated {new Date(report.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    className={styles.downloadBtn}
                    onClick={() => handleDownload(report.id, report.format)}
                  >
                    Download {report.format.toUpperCase()}
                  </button>
                </div>
                <div className={styles.badges}>
                  <span className={`${styles.badge} ${styles.badgeFormat}`}>{report.format.toUpperCase()}</span>
                  {report.categories.map(cat => (
                    <span key={cat} className={`${styles.badge} ${styles.badgeCategory}`}>{cat}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
              <span>Page {page} of {totalPages} ({total} reports)</span>
              <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</button>
            </div>
          )}
        </>
      )}

      {modalOpen && (
        <div className={styles.overlay} onClick={() => setModalOpen(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2>Generate New Report</h2>

            {generatedResult ? (
              <div className={styles.successMessage}>
                <p>Report generated successfully!</p>
                <button
                  className={styles.downloadBtn}
                  onClick={() => handleDownload(generatedResult.reportId, formData.format)}
                >
                  Download {formData.format.toUpperCase()}
                </button>
                <div className={styles.formActions}>
                  <button className={styles.cancelBtn} type="button" onClick={() => setModalOpen(false)}>Close</button>
                </div>
              </div>
            ) : (
              <div className={styles.form}>
                <div className={styles.field}>
                  <label htmlFor="reportStartDate">Start Date</label>
                  <input
                    id="reportStartDate"
                    type="date"
                    value={formData.startDate}
                    onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                  />
                  {formErrors.startDate && <p className={styles.fieldError}>{formErrors.startDate}</p>}
                </div>

                <div className={styles.field}>
                  <label htmlFor="reportEndDate">End Date</label>
                  <input
                    id="reportEndDate"
                    type="date"
                    value={formData.endDate}
                    onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                  />
                  {formErrors.endDate && <p className={styles.fieldError}>{formErrors.endDate}</p>}
                </div>

                <div className={styles.field}>
                  <label>Categories</label>
                  <div className={styles.checkboxGroup}>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={formData.categories.length === CATEGORY_OPTIONS.length}
                        onChange={e => handleCategoryToggle("all", e.target.checked)}
                      />
                      All
                    </label>
                    {CATEGORY_OPTIONS.map(cat => (
                      <label key={cat} className={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={formData.categories.includes(cat)}
                          onChange={e => handleCategoryToggle(cat, e.target.checked)}
                        />
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </label>
                    ))}
                  </div>
                  {formErrors.categories && <p className={styles.fieldError}>{formErrors.categories}</p>}
                </div>

                {isManagerOrAdmin && (
                  <div className={styles.field}>
                    <label htmlFor="recruitSelect">Recruit</label>
                    <select
                      id="recruitSelect"
                      value={formData.recruitId}
                      onChange={e => setFormData({ ...formData, recruitId: e.target.value })}
                    >
                      <option value="">Myself</option>
                      {recruits.map(r => (
                        <option key={r.id} value={r.id}>{r.name} ({r.department})</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className={styles.field}>
                  <label>Format</label>
                  <div className={styles.radioGroup}>
                    <label className={styles.radioLabel}>
                      <input
                        type="radio"
                        name="format"
                        value="Pdf"
                        checked={formData.format === "Pdf"}
                        onChange={e => setFormData({ ...formData, format: e.target.value })}
                      />
                      PDF
                    </label>
                    <label className={styles.radioLabel}>
                      <input
                        type="radio"
                        name="format"
                        value="Csv"
                        checked={formData.format === "Csv"}
                        onChange={e => setFormData({ ...formData, format: e.target.value })}
                      />
                      CSV
                    </label>
                  </div>
                  {formErrors.format && <p className={styles.fieldError}>{formErrors.format}</p>}
                </div>

                <div className={styles.formActions}>
                  <button className={styles.cancelBtn} type="button" onClick={() => setModalOpen(false)}>Cancel</button>
                  <button className={styles.saveBtn} type="button" disabled={saving} onClick={handleGenerate}>
                    {saving ? "Generating..." : "Generate Report"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {toast && (
        <div className={`${styles.toast} ${toast.type === "success" ? styles.toastSuccess : styles.toastError}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}

export default function ReportsPage() {
  return (
    <ProtectedRoute>
      <ReportsContent />
    </ProtectedRoute>
  );
}
