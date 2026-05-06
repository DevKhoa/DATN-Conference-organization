import { useState } from "react";
import { useParams, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Upload, FileText, Calendar, User, Info, Loader2, History, AlertTriangle, CheckCircle2, XCircle, ChevronDown, ChevronUp, Plus, Trash2, Save, Table2, Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DefaultLayout } from "@/layouts/DefaultLayout";
import { toast } from "sonner";
import useAuth from "@/features/auth/hooks/useAuth";
import { useAxios } from "@/lib/axios";

export const ImportPapers = () => {
  const { conferenceId } = useParams({ strict: false }) as any;
  const navigate = useNavigate();
  const { session } = useAuth();
  const axiosInstance = useAxios();
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);

  type ManualRow = {
    title: string;
    abstract: string;
    primary_author_email: string;
    co_author_emails: string;
  };

  const emptyRow: ManualRow = { title: "", abstract: "", primary_author_email: "", co_author_emails: "" };
  const [manualRows, setManualRows] = useState<ManualRow[]>([{ ...emptyRow }]);
  const [isSavingManual, setIsSavingManual] = useState(false);

  const { data: historyData, isLoading } = useQuery({
    queryKey: ["importHistory", conferenceId],
    queryFn: async () => {
      const res = await axiosInstance.get<any>(`/conferences/${conferenceId}/import-history`);
      return res.data;
    },
    enabled: !!conferenceId,
  });

  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ["importLogs", conferenceId],
    queryFn: async () => {
      const res = await axiosInstance.get<any>(`/conferences/${conferenceId}/import-logs`);
      return res.data;
    },
    enabled: !!conferenceId && showLogs,
  });

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      const uploaderId = session?.user?.user_metadata?.["user_id"];
      if (uploaderId) {
        formData.append("uploader_id", String(uploaderId));
      } else {
        throw new Error("User ID is missing");
      }

      const res = await axiosInstance.upload<any>({
        url: `/conferences/${conferenceId}/import-papers`,
        formData
      });
      return res;
    },
    onSuccess: (data: any) => {
      toast.success("Success", {
        description: data?.message || "Papers imported successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["importHistory", conferenceId] });
      queryClient.invalidateQueries({ queryKey: ["importLogs", conferenceId] });
      setUploadError(null);
    },
    onError: (error: any) => {
      const errorMsg = error.response?.data?.detail || error.message || "Failed to import papers";
      setUploadError(errorMsg);
      queryClient.invalidateQueries({ queryKey: ["importLogs", conferenceId] });
      const errorList = errorMsg.includes(" | ") ? errorMsg.split(" | ") : [errorMsg];
      toast.error("Import Failed", {
        description: `${errorList.length} error(s) found`,
      });
    },
    onSettled: () => {
      setIsUploading(false);
      // Reset input
      const fileInput = document.getElementById("csv-upload") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const name = file.name.toLowerCase();
    if (!name.endsWith(".csv") && !name.endsWith(".xlsx")) {
      toast.error("Invalid file", {
        description: "Please upload a .csv or .xlsx file.",
      });
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    importMutation.mutate(file);
  };

  const handleDownloadTemplate = () => {
    const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
    const url = `${apiUrl}/conferences/${conferenceId}/import-template`;
    
    // Create a hidden link and click it to trigger download
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `template_${conferenceId}.xlsx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const updateManualRow = (index: number, field: keyof ManualRow, value: string) => {
    setManualRows(prev => prev.map((row, i) => i === index ? { ...row, [field]: value } : row));
  };

  const addManualRow = () => {
    setManualRows(prev => [...prev, { ...emptyRow }]);
  };

  const removeManualRow = (index: number) => {
    if (manualRows.length <= 1) return;
    setManualRows(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveManual = () => {
    // Validate at least one row has data
    const filledRows = manualRows.filter(r => r.title.trim() || r.primary_author_email.trim());
    if (filledRows.length === 0) {
      toast.error("No data", { description: "Please fill in at least one row." });
      return;
    }

    // Convert to CSV
    const headers = "title,abstract,primary_author_email,co_author_emails";
    const csvRows = filledRows.map(r =>
      `"${r.title.replace(/"/g, '""')}","${r.abstract.replace(/"/g, '""')}","${r.primary_author_email}","${r.co_author_emails}"`
    );
    const csvContent = [headers, ...csvRows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const file = new File([blob], "manual_entry.csv", { type: "text/csv" });

    setIsSavingManual(true);
    setUploadError(null);
    importMutation.mutate(file, {
      onSettled: () => {
        setIsSavingManual(false);
      },
      onSuccess: () => {
        setManualRows([{ ...emptyRow }]);
        setShowManualEntry(false);
      }
    });
  };

  return (
    <DefaultLayout meta={{ title: "Import Papers" }}>
      <div className="min-h-screen bg-background pb-24 text-foreground p-6">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="outline"
              onClick={() => navigate({ to: `/conferences/${conferenceId}` })}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">Import Papers</h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 space-y-6">
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm flex flex-col items-center justify-center text-center">
                <div className="mb-4 rounded-full bg-primary/10 p-4">
                  <Upload className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-bold mb-2">Import Papers</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Upload a .csv or .xlsx file, or enter data manually.
                </p>

                <Button
                  variant="outline"
                  onClick={handleDownloadTemplate}
                  className="w-full mb-3"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download Template (.xlsx)
                </Button>

                <input
                  type="file"
                  id="csv-upload"
                  accept=".csv,.xlsx"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={isUploading}
                />
                <Button
                  onClick={() => document.getElementById("csv-upload")?.click()}
                  disabled={isUploading}
                  className="w-full"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload File (.csv / .xlsx)
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowManualEntry(!showManualEntry)}
                  className="w-full mt-3"
                >
                  <Table2 className="mr-2 h-4 w-4" />
                  {showManualEntry ? "Hide" : "Manual Entry"}
                </Button>
              </div>

              {uploadError && (
                <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-4">
                  <h4 className="font-bold text-destructive mb-1 flex items-center">
                    <Info className="w-4 h-4 mr-1" /> Error Details
                  </h4>
                  {uploadError.includes(" | ") ? (
                    <ul className="list-disc pl-5 space-y-1 text-sm text-destructive/90">
                      {uploadError.split(" | ").map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-destructive/90">{uploadError}</p>
                  )}
                </div>
              )}

              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <h3 className="font-bold mb-3 flex items-center">
                  <Info className="w-4 h-4 mr-2 text-primary" /> CSV Format
                </h3>
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>The CSV must contain these headers:</p>
                  <ul className="list-disc pl-5 font-mono text-xs text-foreground/80 space-y-1">
                    <li>title <span className="text-destructive">*</span></li>
                    <li>abstract</li>
                    <li>primary_author_email <span className="text-destructive">*</span></li>
                    <li>co_author_emails</li>
                  </ul>
                  <p className="pt-2 text-xs">
                    * Multiple co-author emails should be separated by a semicolon (;).
                  </p>
                  <p className="text-xs text-destructive mt-2">
                    Note: All emails must belong to existing users in the system, otherwise the import will be rejected.
                  </p>
                </div>
              </div>


            </div>

            <div className="md:col-span-2 space-y-6">
              {/* Manual Entry Spreadsheet */}
              {showManualEntry && (
                <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-border bg-muted/30 flex items-center justify-between">
                    <h2 className="text-xl font-bold flex items-center">
                      <Table2 className="w-5 h-5 mr-2 text-primary" /> Manual Entry
                    </h2>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={addManualRow}>
                        <Plus className="w-4 h-4 mr-1" /> Add Row
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSaveManual}
                        disabled={isSavingManual}
                      >
                        {isSavingManual ? (
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4 mr-1" />
                        )}
                        Save & Import
                      </Button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-xs uppercase bg-muted text-muted-foreground">
                        <tr>
                          <th className="px-2 py-3 w-8 text-center">#</th>
                          <th className="px-2 py-3 min-w-[180px]">Title <span className="text-destructive">*</span></th>
                          <th className="px-2 py-3 min-w-[220px]">Abstract</th>
                          <th className="px-2 py-3 min-w-[180px]">Author Email <span className="text-destructive">*</span></th>
                          <th className="px-2 py-3 min-w-[180px]">Co-authors (;)</th>
                          <th className="px-2 py-3 w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {manualRows.map((row, idx) => (
                          <tr key={idx} className="border-b border-border hover:bg-muted/30 transition-colors">
                            <td className="px-2 py-1 text-center text-xs text-muted-foreground font-mono">
                              {idx + 1}
                            </td>
                            <td className="px-1 py-1">
                              <input
                                type="text"
                                value={row.title}
                                onChange={e => updateManualRow(idx, "title", e.target.value)}
                                className="w-full px-2 py-1.5 text-xs rounded border border-input bg-background focus:ring-1 focus:ring-ring outline-none"
                                placeholder="Paper title"
                              />
                            </td>
                            <td className="px-1 py-1">
                              <input
                                type="text"
                                value={row.abstract}
                                onChange={e => updateManualRow(idx, "abstract", e.target.value)}
                                className="w-full px-2 py-1.5 text-xs rounded border border-input bg-background focus:ring-1 focus:ring-ring outline-none"
                                placeholder="Abstract"
                              />
                            </td>
                            <td className="px-1 py-1">
                              <input
                                type="email"
                                value={row.primary_author_email}
                                onChange={e => updateManualRow(idx, "primary_author_email", e.target.value)}
                                className="w-full px-2 py-1.5 text-xs rounded border border-input bg-background focus:ring-1 focus:ring-ring outline-none"
                                placeholder="author@email.com"
                              />
                            </td>
                            <td className="px-1 py-1">
                              <input
                                type="text"
                                value={row.co_author_emails}
                                onChange={e => updateManualRow(idx, "co_author_emails", e.target.value)}
                                className="w-full px-2 py-1.5 text-xs rounded border border-input bg-background focus:ring-1 focus:ring-ring outline-none"
                                placeholder="a@b.com;c@d.com"
                              />
                            </td>
                            <td className="px-1 py-1 text-center">
                              <button
                                onClick={() => removeManualRow(idx)}
                                disabled={manualRows.length <= 1}
                                className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive disabled:opacity-30 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="p-3 bg-muted/20 border-t border-border flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">
                      {manualRows.length} row(s) • Separate co-author emails with semicolons (;)
                    </span>
                    <Button variant="outline" size="sm" onClick={addManualRow}>
                      <Plus className="w-3.5 h-3.5 mr-1" /> Add Row
                    </Button>
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                <div className="p-6 border-b border-border bg-muted/30">
                  <h2 className="text-xl font-bold flex items-center">
                    <Calendar className="w-5 h-5 mr-2 text-primary" /> Import History
                  </h2>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs uppercase bg-muted text-muted-foreground">
                      <tr>
                        <th className="px-6 py-4 rounded-tl-lg">Import Date</th>
                        <th className="px-6 py-4">Papers</th>
                        <th className="px-6 py-4">File Name</th>
                        <th className="px-6 py-4 rounded-tr-lg">Person In Charge</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isLoading ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                            Loading history...
                          </td>
                        </tr>
                      ) : !historyData || historyData.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                            No imports found for this conference.
                          </td>
                        </tr>
                      ) : (
                        historyData.map((item: any) => (
                          <tr key={item.import_id} className="border-b border-border hover:bg-muted/50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              {new Date(item.import_date).toLocaleString()}
                            </td>
                            <td className="px-6 py-4 font-medium text-primary">
                              {item.num_papers}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center text-muted-foreground">
                                <FileText className="w-4 h-4 mr-2" />
                                {item.file_name}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center">
                                <User className="w-4 h-4 mr-2 text-muted-foreground" />
                                {item.person?.full_name || 'Unknown'}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* View Log Toggle Button */}
              <div className="mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowLogs(!showLogs)}
                  className="w-full"
                >
                  <History className="w-4 h-4 mr-2" />
                  {showLogs ? "Hide" : "View"} Import Logs
                  {showLogs ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
                </Button>
              </div>

              {/* Import Logs Table */}
              {showLogs && (
                <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden mt-4">
                  <div className="p-6 border-b border-border bg-muted/30">
                    <h2 className="text-xl font-bold flex items-center">
                      <History className="w-5 h-5 mr-2 text-orange-500" /> Import Logs
                    </h2>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs uppercase bg-muted text-muted-foreground">
                        <tr>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">File</th>
                          <th className="px-4 py-3">Papers</th>
                          <th className="px-4 py-3">Person</th>
                          <th className="px-4 py-3">Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {logsLoading ? (
                          <tr>
                            <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                              Loading logs...
                            </td>
                          </tr>
                        ) : !logsData || logsData.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                              No import logs found.
                            </td>
                          </tr>
                        ) : (
                          logsData.map((log: any) => (
                            <tr key={log.log_id} className="border-b border-border hover:bg-muted/50 transition-colors">
                              <td className="px-4 py-3">
                                {log.status === "SUCCESS" ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                    <CheckCircle2 className="w-3 h-3" /> Success
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                    <XCircle className="w-3 h-3" /> Error
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-xs">
                                {new Date(log.created_at).toLocaleString()}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center text-muted-foreground text-xs">
                                  <FileText className="w-3.5 h-3.5 mr-1.5" />
                                  {log.file_name || '-'}
                                </div>
                              </td>
                              <td className="px-4 py-3 font-medium text-primary text-xs">
                                {log.num_papers}
                              </td>
                              <td className="px-4 py-3 text-xs">
                                {log.person?.full_name || 'Unknown'}
                              </td>
                              <td className="px-4 py-3 text-xs max-w-xs">
                                {log.error_details ? (
                                  <details className="cursor-pointer">
                                    <summary className="text-destructive/80 hover:text-destructive">
                                      <AlertTriangle className="w-3 h-3 inline mr-1" />
                                      View errors
                                    </summary>
                                    <ul className="list-disc pl-4 mt-1 space-y-0.5 text-destructive/70">
                                      {log.error_details.split(" | ").map((err: string, i: number) => (
                                        <li key={i}>{err}</li>
                                      ))}
                                    </ul>
                                  </details>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DefaultLayout>
  );
};
