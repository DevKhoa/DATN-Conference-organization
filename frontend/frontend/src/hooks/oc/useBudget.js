import { useState, useEffect } from 'react';
import mockBudgetService from '../../services/oc/mockBudgetService';

/**
 * Custom hook for Budget Requests
 * Usage: const { requests, stats, loading, error, approve, reject, refetch } = useBudget(conferenceId);
 */
export const useBudget = (conferenceId, filters = {}) => {
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await mockBudgetService.getBudgetRequests(conferenceId, filters);

      if (response.success) {
        setRequests(response.data.requests);
        setStats({
          total: response.data.total,
          pending: response.data.pending,
          approved: response.data.approved,
          rejected: response.data.rejected
        });
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch budget requests');
      console.error('Budget requests error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (conferenceId) {
      fetchRequests();
    }
  }, [conferenceId, JSON.stringify(filters)]);

  /**
   * Approve a budget request
   */
  const approve = async (requestId, data = {}) => {
    try {
      const response = await mockBudgetService.approveBudgetRequest(requestId, data);
      
      if (response.success) {
        // Update local state
        setRequests(prev => 
          prev.map(r => 
            r.id === requestId 
              ? { ...r, status: 'APPROVED', ...response.data }
              : r
          )
        );
        
        // Update stats
        setStats(prev => ({
          ...prev,
          pending: prev.pending - 1,
          approved: prev.approved + 1
        }));
        
        return { success: true, data: response.data };
      }
    } catch (err) {
      console.error('Approve error:', err);
      return { success: false, error: err.message };
    }
  };

  /**
   * Reject a budget request
   */
  const reject = async (requestId, data = {}) => {
    try {
      const response = await mockBudgetService.rejectBudgetRequest(requestId, data);
      
      if (response.success) {
        // Update local state
        setRequests(prev => 
          prev.map(r => 
            r.id === requestId 
              ? { ...r, status: 'REJECTED', ...response.data }
              : r
          )
        );
        
        // Update stats
        setStats(prev => ({
          ...prev,
          pending: prev.pending - 1,
          rejected: prev.rejected + 1
        }));
        
        return { success: true, data: response.data };
      }
    } catch (err) {
      console.error('Reject error:', err);
      return { success: false, error: err.message };
    }
  };

  /**
   * Create new budget request
   */
  const create = async (requestData) => {
    try {
      const response = await mockBudgetService.createBudgetRequest(requestData);
      
      if (response.success) {
        // Refetch to get updated list
        await fetchRequests();
        return { success: true, data: response.data };
      }
    } catch (err) {
      console.error('Create error:', err);
      return { success: false, error: err.message };
    }
  };

  return {
    requests,
    stats,
    loading,
    error,
    approve,
    reject,
    create,
    refetch: fetchRequests
  };
};

/**
 * Hook for single budget request details
 */
export const useBudgetRequest = (requestId) => {
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRequest = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await mockBudgetService.getBudgetRequestById(requestId);

      if (response.success) {
        setRequest(response.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch request details');
      console.error('Request details error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (requestId) {
      fetchRequest();
    }
  }, [requestId]);

  return { request, loading, error, refetch: fetchRequest };
};
