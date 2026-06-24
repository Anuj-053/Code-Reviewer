import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SEVERITY_CONFIG } from './SeverityBadge';
import api from '../api/axios';
import useStore from '../store/useStore';

const SEVERITY_ORDER = ['bug', 'security', 'performance', 'style', 'suggestion'];

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function LanguagePill({ language }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-surface-2 text-text-muted border border-border-muted">
      {language}
    </span>
  );
}

function SeverityDots({ breakdown }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {SEVERITY_ORDER.map((sev) => {
        const count = breakdown[sev] || 0;
        if (count === 0) return null;
        const color = SEVERITY_CONFIG[sev]?.color || '#8b949e';
        return (
          <span
            key={sev}
            className="flex items-center gap-1 text-xs"
            title={`${sev}: ${count}`}
          >
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span style={{ color }} className="font-mono">
              {count}
            </span>
          </span>
        );
      })}
    </div>
  );
}

export default function HistoryTable({ reviews, loading }) {
  const navigate = useNavigate();
  const { setCurrentReview, setLanguage } = useStore();

  async function handleView(reviewId) {
    try {
      const res = await api.get(`/review/${reviewId}`);
      const review = res.data;
      setCurrentReview({
        comments: review.comments,
        summary: review.summary,
        code: review.code,
      });
      setLanguage(review.language);
      navigate('/review');
    } catch (err) {
      console.error('Failed to load review:', err);
      alert('Failed to load review. Please try again.');
    }
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="skeleton rounded-lg h-14" />
        ))}
      </div>
    );
  }

  if (!reviews || reviews.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center mb-4"
          style={{ backgroundColor: '#58a6ff12', border: '1px solid #58a6ff25' }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#58a6ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="12 8 12 12 14 14" />
            <path d="M3.05 11a9 9 0 1 1 .5 4" />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-text mb-1">No reviews yet</h3>
        <p className="text-sm text-text-muted">
          Your review history will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-surface">
            <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">
              Date
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">
              Language
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">
              Issues
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">
              Breakdown
            </th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {reviews.map((review) => (
            <tr
              key={review._id}
              className="bg-bg hover:bg-surface transition-colors"
            >
              <td className="px-4 py-3 text-text-muted font-mono text-xs whitespace-nowrap">
                {formatDate(review.createdAt)}
              </td>
              <td className="px-4 py-3">
                <LanguagePill language={review.language} />
              </td>
              <td className="px-4 py-3">
                <span className="text-text font-medium">{review.commentCount}</span>
              </td>
              <td className="px-4 py-3">
                <SeverityDots breakdown={review.severityBreakdown || {}} />
              </td>
              <td className="px-4 py-3 text-right">
                <button
                  onClick={() => handleView(review._id)}
                  className="px-3 py-1.5 rounded-md text-xs font-medium bg-accent/10 text-accent border border-accent/30 hover:bg-accent/20 transition-colors"
                >
                  View
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
