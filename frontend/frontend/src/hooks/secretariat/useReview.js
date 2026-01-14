import { useState, useCallback } from "react";
import ReviewService from "../../services/secretariat/ReviewService";

export const useReview = () => {
  const [reviews, setReviews] = useState([]);
  const [bestPaperCandidates, setBestPaperCandidates] = useState([]);
  const [stats, setStats] = useState(null);
  const [bestPaperStats, setBestPaperStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchReviews = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const response = await ReviewService.getReviewDecisions(filters);
      if (response.success) setReviews(response.data);
      else setError(response.error);
    } catch (err) {
      setError(err.message || "Failed to fetch reviews");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const response = await ReviewService.getReviewStats();
      if (response.success) setStats(response.data);
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  }, []);

  const fetchBestPaperCandidates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await ReviewService.getBestPaperCandidates();
      if (response.success) setBestPaperCandidates(response.data);
      else setError(response.error);
    } catch (err) {
      setError(err.message || "Failed to fetch candidates");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchBestPaperStats = useCallback(async () => {
    try {
      const response = await ReviewService.getBestPaperStats();
      if (response.success) setBestPaperStats(response.data);
    } catch (err) {
      console.error("Failed to fetch best paper stats:", err);
    }
  }, []);

  const runAIDeepReview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await ReviewService.runAIDeepReview();
      if (response.success) {
        setBestPaperCandidates(response.data);
        return response;
      } else {
        setError(response.error);
        return response;
      }
    } catch (err) {
      setError(err.message || "AI analysis failed");
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const saveBestPaperEvaluation = useCallback(async (paperId, evaluation) => {
    setLoading(true);
    setError(null);
    try {
      const response = await ReviewService.saveBestPaperEvaluation(paperId, evaluation);
      if (response.success) {
        setBestPaperCandidates((prev) =>
          prev.map((paper) => (paper.id === paperId ? response.data : paper))
        );
        return response;
      } else {
        setError(response.error);
        return response;
      }
    } catch (err) {
      setError(err.message || "Failed to save evaluation");
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const finalizeBestPaper = useCallback(async (paperIds) => {
    setLoading(true);
    setError(null);
    try {
      const response = await ReviewService.finalizeBestPaper(paperIds);
      return response;
    } catch (err) {
      setError(err.message || "Failed to finalize");
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    reviews,
    bestPaperCandidates,
    stats,
    bestPaperStats,
    loading,
    error,
    fetchReviews,
    fetchStats,
    fetchBestPaperCandidates,
    fetchBestPaperStats,
    runAIDeepReview,
    saveBestPaperEvaluation,
    finalizeBestPaper,
  };
};

export default useReview;
