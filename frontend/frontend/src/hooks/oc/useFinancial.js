import { useState, useEffect } from 'react';
import mockFinancialService from '../../services/oc/mockFinancialService';

/**
 * Custom hook for Financial Dashboard
 * Usage: const { summary, revenue, expenses, loading, error, refetch } = useFinancial(conferenceId);
 */
export const useFinancial = (conferenceId) => {
  const [summary, setSummary] = useState(null);
  const [revenue, setRevenue] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all financial data in parallel
      const [summaryRes, revenueRes, expensesRes] = await Promise.all([
        mockFinancialService.getFinancialSummary(conferenceId),
        mockFinancialService.getRevenueBySource(conferenceId),
        mockFinancialService.getExpenseByCategory(conferenceId)
      ]);

      if (summaryRes.success) setSummary(summaryRes.data);
      if (revenueRes.success) setRevenue(revenueRes.data);
      if (expensesRes.success) setExpenses(expensesRes.data);
    } catch (err) {
      setError(err.message || 'Failed to fetch financial data');
      console.error('Financial data error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (conferenceId) {
      fetchData();
    }
  }, [conferenceId]);

  return {
    summary,
    revenue,
    expenses,
    loading,
    error,
    refetch: fetchData
  };
};

/**
 * Hook for detailed financial report
 */
export const useFinancialReport = (conferenceId, startDate, endDate) => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await mockFinancialService.getDetailedReport(
        conferenceId,
        startDate,
        endDate
      );

      if (response.success) {
        setReport(response.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch report');
      console.error('Report error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (conferenceId) {
      fetchReport();
    }
  }, [conferenceId, startDate, endDate]);

  return { report, loading, error, refetch: fetchReport };
};
