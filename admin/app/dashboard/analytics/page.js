'use client';
/**
 * Analytics Dashboard Component
 * Displays comprehensive analytics and metrics for civic issues.
 * Features:
 * - Multi-day (7/14/30/90) analytics filtering
 * - Charts: Daily trends, issue type, status, priority distribution
 * - Top wards ranking
 * - PDF export functionality
 */
import { useState, useEffect } from 'react';
import { adminApi } from '../../../src/api/index';
import { logger } from '../../../src/lib/logger';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
const COMPONENT_NAME = 'AnalyticsPage';

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Fetch analytics data on mount and when days filter changes
   */
  useEffect(() => {
    fetchAnalyticsData();
  }, [days]);

  /**
   * Fetch analytics data with proper error handling
   */
  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);
      logger.debug(COMPONENT_NAME, `Fetching analytics data for ${days} days`);
      
      const { data: analyticsData } = await adminApi.getAnalytics({ days });
      
      if (!analyticsData) {
        throw new Error('No analytics data returned from API');
      }
      
      setData(analyticsData);
      logger.info(COMPONENT_NAME, `Analytics data loaded successfully for ${days}-day period`);
    } catch (err) {
      const errorMsg = err?.message || 'Failed to load analytics data';
      logger.error(COMPONENT_NAME, 'Error fetching analytics data', err);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Generate and download PDF analytics report
   * Includes summary stats, issues by type/priority, top wards
   */
  const handleExportPDF = async () => {
    if (!data) {
      logger.warn(COMPONENT_NAME, 'PDF export attempted with no data available');
      return;
    }
    
    setExporting(true);
    try {
      logger.info(COMPONENT_NAME, `Generating PDF report for ${days}-day period`);
      
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPosition = 10;

      // Title
      doc.setFontSize(20);
      doc.text('Civic Issues Analytics Report', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;

      // Metadata
      doc.setFontSize(10);
      doc.setTextColor(100);
      const now = new Date();
      doc.text(`Generated: ${now.toLocaleString()}`, pageWidth / 2, yPosition, { align: 'center' });
      doc.text(`Period: Last ${days} days`, pageWidth / 2, yPosition + 5, { align: 'center' });
      yPosition += 15;

      // Summary statistics
      doc.setTextColor(0);
      doc.setFontSize(12);
      doc.text('Summary Statistics', 10, yPosition);
      yPosition += 8;

      const summaryData = [
        ['Metric', 'Value'],
        ['Total Issues', data.total_issues || 0],
        ['Open Issues', data.open_issues || 0],
        ['Resolved Issues', data.resolved_issues || 0],
        ['Escalated Issues', data.escalated_issues || 0],
      ];

      if (data.total_issues && data.resolved_issues) {
        const resolutionRate = ((data.resolved_issues / data.total_issues) * 100).toFixed(1);
        summaryData.push(['Resolution Rate', `${resolutionRate}%`]);
      }

      autoTable(doc, {
        head: [summaryData[0]],
        body: summaryData.slice(1),
        startY: yPosition,
        margin: { left: 10, right: 10 },
      });
      yPosition = doc.lastAutoTable?.finalY || yPosition;

      // Issues by type
      if (data.by_type && Object.keys(data.by_type).length > 0) {
        yPosition += 10;
        doc.setFontSize(12);
        doc.text('Issues by Type', 10, yPosition);
        yPosition += 5;

        const typeData = Object.entries(data.by_type).map(([type, count]) => [
          type.replace(/_/g, ' ').charAt(0).toUpperCase() + type.replace(/_/g, ' ').slice(1),
          count,
        ]);

        autoTable(doc, {
          head: [['Type', 'Count']],
          body: typeData,
          startY: yPosition,
          margin: { left: 10, right: 10 },
        });
      }

      // Issues by priority
      if (data.by_priority && Object.keys(data.by_priority).length > 0) {
        yPosition = doc.lastAutoTable?.finalY + 10 || yPosition + 10;
        doc.setFontSize(12);
        doc.text('Issues by Priority', 10, yPosition);
        yPosition += 5;

        const priorityData = Object.entries(data.by_priority).map(([priority, count]) => [
          priority.charAt(0).toUpperCase() + priority.slice(1),
          count,
        ]);

        autoTable(doc, {
          head: [['Priority', 'Count']],
          body: priorityData,
          startY: yPosition,
          margin: { left: 10, right: 10 },
        });
      }

      // Top wards
      if (data.top_wards && data.top_wards.length > 0) {
        yPosition = doc.lastAutoTable?.finalY + 10 || yPosition + 10;
        doc.setFontSize(12);
        doc.text('Top Wards by Issue Count', 10, yPosition);
        yPosition += 5;

        const wardData = data.top_wards.slice(0, 10).map((ward, idx) => [
          idx + 1,
          ward.ward || 'Unknown',
          ward.count,
        ]);

        autoTable(doc, {
          head: [['Rank', 'Ward', 'Count']],
          body: wardData,
          startY: yPosition,
          margin: { left: 10, right: 10 },
        });
      }

      const filename = `civic-analytics-${days}d-${now.toISOString().split('T')[0]}.pdf`;
      doc.save(filename);
      logger.info(COMPONENT_NAME, `PDF report exported successfully: ${filename}`);
    } catch (error) {
      logger.error(COMPONENT_NAME, 'Failed to export PDF report', error);
      alert('Failed to export PDF. Please check the browser console for details.');
    } finally {
      setExporting(false);
    }
  };

  // Convert data for charts
  const daily = data?.daily_counts ? Object.entries(data.daily_counts).map(([date, count]) => ({ date, count })) : [];
  const byType = data?.by_type ? Object.entries(data.by_type).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value })) : [];
  const byStatus = data?.by_status ? Object.entries(data.by_status).map(([name, value]) => ({ name, value })) : [];
  const byPriority = data?.by_priority ? Object.entries(data.by_priority).map(([name, value]) => ({ name, value })) : [];

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 rounded-xl p-6 border border-red-200">
        <h2 className="text-lg font-bold text-red-700 mb-2">Error Loading Analytics</h2>
        <p className="text-red-600 mb-4">{error}</p>
        <button onClick={fetchAnalyticsData} className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Time Range & Export */}
      <div className="flex gap-2 justify-between items-center">
        <div className="flex gap-2">
          {[7, 14, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${days === d ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
            >
              {d}d
            </button>
          ))}
        </div>
        <button
          onClick={handleExportPDF}
          disabled={exporting || !data}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 ${exporting || !data ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700'}`}
        >
          {exporting ? <><span className="animate-spin">⟳</span>Exporting...</> : <>📄 Export PDF</>}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-gray-400">Loading analytics…</div>
      ) : (
        <>
          {/* Daily Trend */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h2 className="text-sm font-bold text-gray-700 mb-4">Daily Issue Volume — Last {days} days</h2>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="Issues" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* By Type */}
            <div className="bg-white rounded-xl shadow-sm p-5">
              <h2 className="text-sm font-bold text-gray-700 mb-4">By Issue Type</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={byType} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={90} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* By Status */}
            <div className="bg-white rounded-xl shadow-sm p-5">
              <h2 className="text-sm font-bold text-gray-700 mb-4">By Status</h2>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={byStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {byStatus.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* By Priority */}
            <div className="bg-white rounded-xl shadow-sm p-5">
              <h2 className="text-sm font-bold text-gray-700 mb-4">By Priority</h2>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={byPriority}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {byPriority.map((entry, i) => {
                      const c = { low: '#10b981', medium: '#f59e0b', high: '#ef4444', critical: '#7c3aed' };
                      return <Cell key={i} fill={c[entry.name] || '#3b82f6'} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Top Wards */}
            <div className="bg-white rounded-xl shadow-sm p-5">
              <h2 className="text-sm font-bold text-gray-700 mb-4">Top Wards by Issue Count</h2>
              {data?.top_wards?.length > 0 ? (
                <div className="space-y-3">
                  {data.top_wards.slice(0, 8).map((w, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs text-gray-400 w-4 font-bold">{i + 1}</span>
                      <div className="flex-1">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium text-gray-700 capitalize">{w.ward}</span>
                          <span className="text-gray-400">{w.count}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(w.count / data.top_wards[0].count) * 100}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-300 text-sm mt-8">No ward data</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
