/**
 * USE REGISTRATION HOOK
 * Custom hook for registration management
 */

import { useState, useCallback } from "react";
import RegistrationService from "../../services/secretariat/RegistrationService";

export const useRegistration = () => {
  const [registrations, setRegistrations] = useState([]);
  const [ticketTypes, setTicketTypes] = useState([]);
  const [portalSettings, setPortalSettings] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Fetch all registrations
   */
  const fetchRegistrations = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);

    try {
      const response = await RegistrationService.getRegistrations(filters);
      
      if (response.success) {
        setRegistrations(response.data);
      } else {
        setError(response.error);
      }
    } catch (err) {
      setError(err.message || "Failed to fetch registrations");
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch registration statistics
   */
  const fetchStats = useCallback(async () => {
    try {
      const response = await RegistrationService.getRegistrationStats();
      
      if (response.success) {
        setStats(response.data);
      }
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  }, []);

  /**
   * Approve registration
   */
  const approveRegistration = useCallback(async (id) => {
    setLoading(true);
    setError(null);

    try {
      const response = await RegistrationService.approveRegistration(id);
      
      if (response.success) {
        // Update local state
        setRegistrations((prev) =>
          prev.map((reg) =>
            reg.id === id ? { ...reg, status: "approved" } : reg
          )
        );
        
        // Refresh stats
        await fetchStats();
        
        return response;
      } else {
        setError(response.error);
        return response;
      }
    } catch (err) {
      setError(err.message || "Failed to approve registration");
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [fetchStats]);

  /**
   * Reject registration
   */
  const rejectRegistration = useCallback(async (id, reason) => {
    setLoading(true);
    setError(null);

    try {
      const response = await RegistrationService.rejectRegistration(id, reason);
      
      if (response.success) {
        // Update local state
        setRegistrations((prev) =>
          prev.map((reg) =>
            reg.id === id ? { ...reg, status: "rejected", rejectionReason: reason } : reg
          )
        );
        
        // Refresh stats
        await fetchStats();
        
        return response;
      } else {
        setError(response.error);
        return response;
      }
    } catch (err) {
      setError(err.message || "Failed to reject registration");
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [fetchStats]);

  /**
   * Fetch ticket types
   */
  const fetchTicketTypes = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await RegistrationService.getTicketTypes();
      
      if (response.success) {
        setTicketTypes(response.data);
      } else {
        setError(response.error);
      }
    } catch (err) {
      setError(err.message || "Failed to fetch ticket types");
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Create ticket type
   */
  const createTicketType = useCallback(async (ticketData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await RegistrationService.createTicketType(ticketData);
      
      if (response.success) {
        setTicketTypes((prev) => [...prev, response.data]);
        return response;
      } else {
        setError(response.error);
        return response;
      }
    } catch (err) {
      setError(err.message || "Failed to create ticket type");
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Update ticket type
   */
  const updateTicketType = useCallback(async (id, updates) => {
    setLoading(true);
    setError(null);

    try {
      const response = await RegistrationService.updateTicketType(id, updates);
      
      if (response.success) {
        setTicketTypes((prev) =>
          prev.map((ticket) =>
            ticket.id === id ? response.data : ticket
          )
        );
        return response;
      } else {
        setError(response.error);
        return response;
      }
    } catch (err) {
      setError(err.message || "Failed to update ticket type");
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch portal settings
   */
  const fetchPortalSettings = useCallback(async () => {
    try {
      const response = await RegistrationService.getPortalSettings();
      
      if (response.success) {
        setPortalSettings(response.data);
      }
    } catch (err) {
      console.error("Failed to fetch portal settings:", err);
    }
  }, []);

  /**
   * Toggle portal status
   */
  const togglePortal = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await RegistrationService.togglePortalStatus();
      
      if (response.success) {
        setPortalSettings(response.data);
        return response;
      } else {
        setError(response.error);
        return response;
      }
    } catch (err) {
      setError(err.message || "Failed to toggle portal");
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Export registrations
   */
  const exportRegistrations = useCallback(async (format = "csv") => {
    setLoading(true);
    setError(null);

    try {
      const response = await RegistrationService.exportRegistrations(format);
      
      if (response.success) {
        return response;
      } else {
        setError(response.error);
        return response;
      }
    } catch (err) {
      setError(err.message || "Failed to export registrations");
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    // State
    registrations,
    ticketTypes,
    portalSettings,
    stats,
    loading,
    error,

    // Actions
    fetchRegistrations,
    fetchStats,
    approveRegistration,
    rejectRegistration,
    fetchTicketTypes,
    createTicketType,
    updateTicketType,
    fetchPortalSettings,
    togglePortal,
    exportRegistrations,
  };
};

export default useRegistration;
