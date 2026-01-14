import { useState, useEffect } from 'react';
import mockAwardsService from '../../services/oc/mockAwardsService';

/**
 * Custom hook for Award Candidates
 * Usage: const { candidates, loading, error, finalize, announce } = useAwards(conferenceId);
 */
export const useAwards = (conferenceId, filters = {}) => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await mockAwardsService.getAwardCandidates(conferenceId);

      if (response.success) {
        let filteredData = response.data;
        
        // Apply filters
        if (filters.type) {
          filteredData = filteredData.filter(c => c.type === filters.type);
        }
        if (filters.status) {
          filteredData = filteredData.filter(c => c.status === filters.status);
        }
        
        setCandidates(filteredData);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch award candidates');
      console.error('Award candidates error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (conferenceId) {
      fetchCandidates();
    }
  }, [conferenceId, JSON.stringify(filters)]);

  /**
   * Finalize award decision
   */
  const finalize = async (candidateId, decision) => {
    try {
      const response = await mockAwardsService.finalizeAward(candidateId, decision);
      
      if (response.success) {
        // Update local state
        setCandidates(prev => 
          prev.map(c => 
            c.id === candidateId 
              ? { ...c, status: 'FINALIZED', ...response.data }
              : c
          )
        );
        
        return { success: true, data: response.data };
      }
    } catch (err) {
      console.error('Finalize award error:', err);
      return { success: false, error: err.message };
    }
  };

  /**
   * Announce awards
   */
  const announce = async (awardIds) => {
    try {
      const response = await mockAwardsService.announceAwards(conferenceId, awardIds);
      
      if (response.success) {
        // Update local state for announced awards
        setCandidates(prev => 
          prev.map(c => 
            awardIds.includes(c.id) 
              ? { ...c, status: 'ANNOUNCED' }
              : c
          )
        );
        
        return { success: true, data: response.data };
      }
    } catch (err) {
      console.error('Announce awards error:', err);
      return { success: false, error: err.message };
    }
  };

  /**
   * Send internal notification
   */
  const sendNotification = async (recipientIds) => {
    try {
      const response = await mockAwardsService.sendInternalNotification(
        conferenceId,
        recipientIds
      );
      
      if (response.success) {
        return { success: true, data: response.data };
      }
    } catch (err) {
      console.error('Send notification error:', err);
      return { success: false, error: err.message };
    }
  };

  return {
    candidates,
    loading,
    error,
    finalize,
    announce,
    sendNotification,
    refetch: fetchCandidates
  };
};

/**
 * Hook for single award candidate details
 */
export const useAwardCandidate = (candidateId) => {
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCandidate = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await mockAwardsService.getAwardCandidateDetails(candidateId);

      if (response.success) {
        setCandidate(response.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch candidate details');
      console.error('Candidate details error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (candidateId) {
      fetchCandidate();
    }
  }, [candidateId]);

  return { candidate, loading, error, refetch: fetchCandidate };
};

/**
 * Hook for award statistics
 */
export const useAwardStats = (conferenceId) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await mockAwardsService.getAwardStats(conferenceId);

      if (response.success) {
        setStats(response.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch award stats');
      console.error('Award stats error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (conferenceId) {
      fetchStats();
    }
  }, [conferenceId]);

  return { stats, loading, error, refetch: fetchStats };
};
