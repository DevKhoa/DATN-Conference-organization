import { useState, useEffect } from 'react';
import mockEmailService from '../../services/oc/mockEmailService';

/**
 * Custom hook for Email Management
 * Usage: const { stats, loading, error } = useEmailStats(conferenceId);
 */
export const useEmailStats = (conferenceId) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await mockEmailService.getEmailStats(conferenceId);

      if (response.success) {
        setStats(response.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch email stats');
      console.error('Email stats error:', err);
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

/**
 * Hook for email templates
 */
export const useEmailTemplates = (conferenceId) => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await mockEmailService.getTemplates(conferenceId);

      if (response.success) {
        setTemplates(response.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch templates');
      console.error('Templates error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (conferenceId) {
      fetchTemplates();
    }
  }, [conferenceId]);

  /**
   * Save template (create or update)
   */
  const saveTemplate = async (templateData) => {
    try {
      const response = await mockEmailService.saveTemplate(templateData);
      
      if (response.success) {
        await fetchTemplates(); // Refetch templates
        return { success: true, data: response.data };
      }
    } catch (err) {
      console.error('Save template error:', err);
      return { success: false, error: err.message };
    }
  };

  return { templates, loading, error, saveTemplate, refetch: fetchTemplates };
};

/**
 * Hook for email logs
 */
export const useEmailLogs = (conferenceId, filters = {}) => {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await mockEmailService.getEmailLogs(conferenceId, filters);

      if (response.success) {
        setLogs(response.data.logs);
        setTotal(response.data.total);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch email logs');
      console.error('Email logs error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (conferenceId) {
      fetchLogs();
    }
  }, [conferenceId, JSON.stringify(filters)]);

  return { logs, total, loading, error, refetch: fetchLogs };
};

/**
 * Hook for sending emails
 */
export const useEmailSender = () => {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const sendInvitation = async (emailData) => {
    try {
      setSending(true);
      setError(null);

      const response = await mockEmailService.sendInvitation(emailData);

      if (response.success) {
        return { success: true, data: response.data };
      }
    } catch (err) {
      const errorMsg = err.message || 'Failed to send invitation';
      setError(errorMsg);
      console.error('Send invitation error:', err);
      return { success: false, error: errorMsg };
    } finally {
      setSending(false);
    }
  };

  const scheduleReminder = async (scheduleData) => {
    try {
      setSending(true);
      setError(null);

      const response = await mockEmailService.scheduleReminder(scheduleData);

      if (response.success) {
        return { success: true, data: response.data };
      }
    } catch (err) {
      const errorMsg = err.message || 'Failed to schedule reminder';
      setError(errorMsg);
      console.error('Schedule reminder error:', err);
      return { success: false, error: errorMsg };
    } finally {
      setSending(false);
    }
  };

  return { sendInvitation, scheduleReminder, sending, error };
};
