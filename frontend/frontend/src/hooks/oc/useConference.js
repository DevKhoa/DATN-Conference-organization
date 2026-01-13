import { useState, useEffect } from 'react';
import mockConferenceService from '../../services/oc/mockConferenceService';

/**
 * Custom hook for Conference Details
 * Usage: const { conference, loading, error, update } = useConference(conferenceId);
 */
export const useConference = (conferenceId) => {
  const [conference, setConference] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchConference = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await mockConferenceService.getConferenceDetails(conferenceId);

      if (response.success) {
        setConference(response.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch conference');
      console.error('Conference error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (conferenceId) {
      fetchConference();
    }
  }, [conferenceId]);

  /**
   * Update conference details
   */
  const update = async (updateData) => {
    try {
      const response = await mockConferenceService.updateConference(conferenceId, updateData);
      
      if (response.success) {
        setConference(prev => ({ ...prev, ...response.data }));
        return { success: true, data: response.data };
      }
    } catch (err) {
      console.error('Update conference error:', err);
      return { success: false, error: err.message };
    }
  };

  /**
   * Update conference status
   */
  const updateStatus = async (status) => {
    try {
      const response = await mockConferenceService.updateConferenceStatus(conferenceId, status);
      
      if (response.success) {
        setConference(prev => ({ ...prev, status: response.data.status }));
        return { success: true, data: response.data };
      }
    } catch (err) {
      console.error('Update status error:', err);
      return { success: false, error: err.message };
    }
  };

  return { conference, loading, error, update, updateStatus, refetch: fetchConference };
};

/**
 * Hook for conference overview/statistics
 */
export const useConferenceOverview = (conferenceId) => {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await mockConferenceService.getConferenceOverview(conferenceId);

      if (response.success) {
        setOverview(response.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch overview');
      console.error('Overview error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (conferenceId) {
      fetchOverview();
    }
  }, [conferenceId]);

  return { overview, loading, error, refetch: fetchOverview };
};

/**
 * Hook for conference timeline
 */
export const useConferenceTimeline = (conferenceId) => {
  const [timeline, setTimeline] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTimeline = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await mockConferenceService.getConferenceTimeline(conferenceId);

      if (response.success) {
        setTimeline(response.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch timeline');
      console.error('Timeline error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (conferenceId) {
      fetchTimeline();
    }
  }, [conferenceId]);

  return { timeline, loading, error, refetch: fetchTimeline };
};

/**
 * Hook for conflict detection
 */
export const useConflicts = (conferenceId) => {
  const [conflicts, setConflicts] = useState({ hasConflicts: false, conflicts: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchConflicts = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await mockConferenceService.detectConflicts(conferenceId);

      if (response.success) {
        setConflicts(response.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to detect conflicts');
      console.error('Conflicts error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (conferenceId) {
      fetchConflicts();
    }
  }, [conferenceId]);

  /**
   * Resolve a conflict
   */
  const resolveConflict = async (conflictId, resolution) => {
    try {
      const response = await mockConferenceService.resolveConflict(conflictId, resolution);
      
      if (response.success) {
        // Remove resolved conflict from list
        setConflicts(prev => ({
          ...prev,
          conflicts: prev.conflicts.filter(c => c.id !== conflictId)
        }));
        
        // Refetch to get updated conflicts
        await fetchConflicts();
        
        return { success: true, data: response.data };
      }
    } catch (err) {
      console.error('Resolve conflict error:', err);
      return { success: false, error: err.message };
    }
  };

  return { conflicts, loading, error, resolveConflict, refetch: fetchConflicts };
};
