/**
 * USE CMS HOOK
 * Custom hook for content management
 */

import { useState, useCallback } from "react";
import CMSService from "../../services/secretariat/CMSService";

export const useCMS = () => {
  const [content, setContent] = useState([]);
  const [stats, setStats] = useState(null);
  const [postEventStats, setPostEventStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchContent = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);

    try {
      const response = await CMSService.getContent(filters);
      if (response.success) {
        setContent(response.data);
      } else {
        setError(response.error);
      }
    } catch (err) {
      setError(err.message || "Failed to fetch content");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const response = await CMSService.getContentStats();
      if (response.success) {
        setStats(response.data);
      }
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  }, []);

  const fetchPostEventStats = useCallback(async () => {
    try {
      const response = await CMSService.getPostEventStats();
      if (response.success) {
        setPostEventStats(response.data);
      }
    } catch (err) {
      console.error("Failed to fetch post-event stats:", err);
    }
  }, []);

  const createContent = useCallback(async (contentData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await CMSService.createContent(contentData);
      if (response.success) {
        setContent((prev) => [...prev, response.data]);
        await fetchStats();
        return response;
      } else {
        setError(response.error);
        return response;
      }
    } catch (err) {
      setError(err.message || "Failed to create content");
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [fetchStats]);

  const updateContent = useCallback(async (id, updates) => {
    setLoading(true);
    setError(null);

    try {
      const response = await CMSService.updateContent(id, updates);
      if (response.success) {
        setContent((prev) =>
          prev.map((item) => (item.id === id ? response.data : item))
        );
        return response;
      } else {
        setError(response.error);
        return response;
      }
    } catch (err) {
      setError(err.message || "Failed to update content");
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const publishContent = useCallback(async (id, publishDate = null) => {
    setLoading(true);
    setError(null);

    try {
      const response = await CMSService.publishContent(id, publishDate);
      if (response.success) {
        setContent((prev) =>
          prev.map((item) => (item.id === id ? response.data : item))
        );
        await fetchStats();
        return response;
      } else {
        setError(response.error);
        return response;
      }
    } catch (err) {
      setError(err.message || "Failed to publish content");
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [fetchStats]);

  const deleteContent = useCallback(async (id) => {
    setLoading(true);
    setError(null);

    try {
      const response = await CMSService.deleteContent(id);
      if (response.success) {
        setContent((prev) => prev.filter((item) => item.id !== id));
        await fetchStats();
        return response;
      } else {
        setError(response.error);
        return response;
      }
    } catch (err) {
      setError(err.message || "Failed to delete content");
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [fetchStats]);

  const sendPostEventEmail = useCallback(async (emailData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await CMSService.sendPostEventEmail(emailData);
      if (response.success) {
        await fetchPostEventStats();
        return response;
      } else {
        setError(response.error);
        return response;
      }
    } catch (err) {
      setError(err.message || "Failed to send email");
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [fetchPostEventStats]);

  return {
    content,
    stats,
    postEventStats,
    loading,
    error,
    fetchContent,
    fetchStats,
    fetchPostEventStats,
    createContent,
    updateContent,
    publishContent,
    deleteContent,
    sendPostEventEmail,
  };
};

export default useCMS;
