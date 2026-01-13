import { useState, useCallback } from "react";
import SessionService from "../../services/secretariat/SessionService";

export const useSession = () => {
  const [sessions, setSessions] = useState([]);
  const [aiSessions, setAISessions] = useState([]);
  const [stats, setStats] = useState(null);
  const [aiStats, setAIStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchSessions = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const response = await SessionService.getSessions(filters);
      if (response.success) setSessions(response.data);
      else setError(response.error);
    } catch (err) {
      setError(err.message || "Failed to fetch sessions");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const response = await SessionService.getSessionStats();
      if (response.success) setStats(response.data);
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  }, []);

  const createSession = useCallback(async (sessionData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await SessionService.createSession(sessionData);
      if (response.success) {
        setSessions((prev) => [...prev, response.data]);
        await fetchStats();
        return response;
      } else {
        setError(response.error);
        return response;
      }
    } catch (err) {
      setError(err.message || "Failed to create session");
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [fetchStats]);

  const updateSession = useCallback(async (id, updates) => {
    setLoading(true);
    setError(null);
    try {
      const response = await SessionService.updateSession(id, updates);
      if (response.success) {
        setSessions((prev) =>
          prev.map((session) => (session.id === id ? response.data : session))
        );
        return response;
      } else {
        setError(response.error);
        return response;
      }
    } catch (err) {
      setError(err.message || "Failed to update session");
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleSessionLock = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      const response = await SessionService.toggleSessionLock(id);
      if (response.success) {
        setSessions((prev) =>
          prev.map((session) => (session.id === id ? response.data : session))
        );
        await fetchStats();
        return response;
      } else {
        setError(response.error);
        return response;
      }
    } catch (err) {
      setError(err.message || "Failed to toggle lock");
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [fetchStats]);

  const fetchAISessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await SessionService.getAISessionSuggestions();
      if (response.success) setAISessions(response.data);
      else setError(response.error);
    } catch (err) {
      setError(err.message || "Failed to fetch AI sessions");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAIStats = useCallback(async () => {
    try {
      const response = await SessionService.getAISessionStats();
      if (response.success) setAIStats(response.data);
    } catch (err) {
      console.error("Failed to fetch AI stats:", err);
    }
  }, []);

  const runAIOptimization = useCallback(async (config) => {
    setLoading(true);
    setError(null);
    try {
      const response = await SessionService.runAIOptimization(config);
      if (response.success) {
        setAISessions(response.data);
        return response;
      } else {
        setError(response.error);
        return response;
      }
    } catch (err) {
      setError(err.message || "AI optimization failed");
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const acceptAIProposals = useCallback(async (sessionIds = []) => {
    setLoading(true);
    setError(null);
    try {
      const response = await SessionService.acceptAIProposals(sessionIds);
      if (response.success) {
        setSessions((prev) => [...prev, ...response.data]);
        await fetchStats();
        return response;
      } else {
        setError(response.error);
        return response;
      }
    } catch (err) {
      setError(err.message || "Failed to accept proposals");
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [fetchStats]);

  return {
    sessions,
    aiSessions,
    stats,
    aiStats,
    loading,
    error,
    fetchSessions,
    fetchStats,
    createSession,
    updateSession,
    toggleSessionLock,
    fetchAISessions,
    fetchAIStats,
    runAIOptimization,
    acceptAIProposals,
  };
};

export default useSession;
