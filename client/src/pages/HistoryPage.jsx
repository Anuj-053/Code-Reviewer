import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import HistoryTable from '../components/HistoryTable';
import api from '../api/axios';

export default function HistoryPage() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchHistory() {
      setLoading(true);
      setError('');
      try {
        const res = await api.get('/review/history');
        setReviews(res.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load history.');
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, []);

  return (
    <div className="flex h-screen bg-bg overflow-hidden">
      <Sidebar />

      <main className="flex-1 overflow-y-auto px-8 py-8">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-text">Review History</h1>
          <p className="text-sm text-text-muted mt-1">
            Your last 20 code reviews. Click <span className="text-accent font-medium">View</span> to reload any review into the editor.
          </p>
        </div>

        {/* Stats row */}
        {!loading && !error && reviews.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <StatCard
              label="Total Reviews"
              value={reviews.length}
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#58a6ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              }
            />
            <StatCard
              label="Total Issues Found"
              value={reviews.reduce((s, r) => s + r.commentCount, 0)}
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f85149" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              }
            />
            <StatCard
              label="Languages Used"
              value={new Set(reviews.map((r) => r.language)).size}
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e3b341" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="16 18 22 12 16 6" />
                  <polyline points="8 6 2 12 8 18" />
                </svg>
              }
            />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-4 px-4 py-3 rounded-md bg-bug/10 border border-bug/30 text-bug text-sm">
            {error}
          </div>
        )}

        {/* Table */}
        <HistoryTable reviews={reviews} loading={loading} />
      </main>
    </div>
  );
}

function StatCard({ label, value, icon }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-5 py-4 flex items-center gap-4">
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: '#161b2280', border: '1px solid #30363d' }}
      >
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-text font-mono">{value}</p>
        <p className="text-xs text-text-muted mt-0.5">{label}</p>
      </div>
    </div>
  );
}
