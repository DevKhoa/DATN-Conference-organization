import { useState, useCallback } from "react";
import PapersService from "../../services/secretariat/PapersService";

export const usePapers = () => {
  const [papers, setPapers] = useState([]);
  const [finalSubmissions, setFinalSubmissions] = useState([]);
  const [stats, setStats] = useState(null);
  const [submissionStats, setSubmissionStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPapers = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const response = await PapersService.getPapers(filters);
      if (response.success) setPapers(response.data);
      else setError(response.error);
    } catch (err) {
      setError(err.message || "Failed to fetch papers");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const response = await PapersService.getPaperStats();
      if (response.success) setStats(response.data);
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  }, []);

  const fetchFinalSubmissions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await PapersService.getFinalSubmissions();
      if (response.success) setFinalSubmissions(response.data);
      else setError(response.error);
    } catch (err) {
      setError(err.message || "Failed to fetch submissions");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSubmissionStats = useCallback(async () => {
    try {
      const response = await PapersService.getFinalSubmissionStats();
      if (response.success) setSubmissionStats(response.data);
    } catch (err) {
      console.error("Failed to fetch submission stats:", err);
    }
  }, []);

  const approveFinalSubmission = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      const response = await PapersService.approveFinalSubmission(id);
      if (response.success) {
        setFinalSubmissions((prev) =>
          prev.map((sub) => (sub.id === id ? response.data : sub))
        );
        await fetchSubmissionStats();
        return response;
      } else {
        setError(response.error);
        return response;
      }
    } catch (err) {
      setError(err.message || "Failed to approve submission");
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [fetchSubmissionStats]);

  const rejectFinalSubmission = useCallback(async (id, reason) => {
    setLoading(true);
    setError(null);
    try {
      const response = await PapersService.rejectFinalSubmission(id, reason);
      if (response.success) {
        setFinalSubmissions((prev) =>
          prev.map((sub) => (sub.id === id ? response.data : sub))
        );
        await fetchSubmissionStats();
        return response;
      } else {
        setError(response.error);
        return response;
      }
    } catch (err) {
      setError(err.message || "Failed to reject submission");
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [fetchSubmissionStats]);

  const downloadPaper = useCallback(async (id) => {
    try {
      return await PapersService.downloadPaper(id);
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, []);

  const exportPapers = useCallback(async (format = "xlsx") => {
    setLoading(true);
    try {
      return await PapersService.exportPapers(format);
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    papers,
    finalSubmissions,
    stats,
    submissionStats,
    loading,
    error,
    fetchPapers,
    fetchStats,
    fetchFinalSubmissions,
    fetchSubmissionStats,
    approveFinalSubmission,
    rejectFinalSubmission,
    downloadPaper,
    exportPapers,
  };
};

export default usePapers;
