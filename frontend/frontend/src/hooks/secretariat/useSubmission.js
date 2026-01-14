import { useState, useCallback } from "react";
import SubmissionService from "../../services/secretariat/SubmissionService";

export const useSubmission = () => {
  const [analysisResult, setAnalysisResult] = useState(null);
  const [checkResults, setCheckResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const analyzeDocument = useCallback(async (file) => {
    setLoading(true);
    setError(null);
    try {
      const response = await SubmissionService.analyzeDocument(file);
      if (response.success) {
        setAnalysisResult(response.data);
        return response;
      } else {
        setError(response.error);
        return response;
      }
    } catch (err) {
      setError(err.message || "Analysis failed");
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const generateRevisedPDF = useCallback(async (documentId, suggestions) => {
    setLoading(true);
    setError(null);
    try {
      const response = await SubmissionService.generateRevisedPDF(documentId, suggestions);
      return response;
    } catch (err) {
      setError(err.message || "Failed to generate PDF");
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const runPrePublishChecks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await SubmissionService.runPrePublishChecks();
      if (response.success) {
        setCheckResults(response.data);
        return response;
      } else {
        setError(response.error);
        return response;
      }
    } catch (err) {
      setError(err.message || "Checks failed");
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const checkPlagiarism = useCallback(async (paperId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await SubmissionService.checkPlagiarism(paperId);
      return response;
    } catch (err) {
      setError(err.message || "Plagiarism check failed");
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const generateProceedings = useCallback(async (options) => {
    setLoading(true);
    setError(null);
    try {
      const response = await SubmissionService.generateProceedings(options);
      return response;
    } catch (err) {
      setError(err.message || "Failed to generate proceedings");
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    analysisResult,
    checkResults,
    loading,
    error,
    analyzeDocument,
    generateRevisedPDF,
    runPrePublishChecks,
    checkPlagiarism,
    generateProceedings,
  };
};

export default useSubmission;
