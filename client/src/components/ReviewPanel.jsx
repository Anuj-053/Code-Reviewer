import React, { useState } from 'react';
import useStore from '../store/useStore';
import CommentCard from './CommentCard';
import { SEVERITY_CONFIG } from './SeverityBadge';

const FILTERS = ['all', 'bug', 'security', 'performance', 'style', 'suggestion'];

function SkeletonBar({ width = 'w-full', height = 'h-3' }) {
  return <div className={`skeleton rounded ${width} ${height}`} />;
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
        style={{ backgroundColor: '#58a6ff15', border: '1px solid #58a6ff30' }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#58a6ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-text mb-1">No review yet</h3>
      <p className="text-sm text-text-muted leading-relaxed">
        Paste your code in the editor and click{' '}
        <span className="text-accent font-medium">Review Code</span> to get AI-powered feedback.
      </p>
    </div>
  );
}

function StreamingState({ streamingText }) {
  return (
    <div className="p-5 space-y-5">
      {/* Animated skeleton bars */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <span className="text-xs text-text-muted font-medium">Analysing your code…</span>
        </div>
        <SkeletonBar width="w-full" height="h-3" />
        <SkeletonBar width="w-4/5" height="h-3" />
        <SkeletonBar width="w-3/4" height="h-3" />
        <SkeletonBar width="w-full" height="h-3" />
        <SkeletonBar width="w-2/3" height="h-3" />
      </div>

      {/* Live streaming text */}
      {streamingText && (
        <div
          className="rounded-lg p-4 border border-border-muted"
          style={{ backgroundColor: '#0d1117' }}
        >
          <p className="text-xs font-mono text-text-muted leading-relaxed whitespace-pre-wrap break-words">
            {streamingText}
            <span className="inline-block w-1.5 h-3.5 bg-accent ml-0.5 animate-pulse align-middle" />
          </p>
        </div>
      )}

      {/* More skeleton bars */}
      <div className="space-y-3 mt-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-lg border border-border p-4 space-y-2">
            <div className="flex gap-2">
              <SkeletonBar width="w-20" height="h-5" />
              <SkeletonBar width="w-32" height="h-5" />
            </div>
            <SkeletonBar width="w-full" height="h-3" />
            <SkeletonBar width="w-5/6" height="h-3" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ReviewPanel() {
  const { currentReview, isReviewing, streamingText } = useStore();
  const [activeFilter, setActiveFilter] = useState('all');

  if (isReviewing) {
    return (
      <div className="flex flex-col h-full bg-bg overflow-y-auto">
        <div className="flex-shrink-0 px-5 pt-5 pb-3 border-b border-border">
          <h2 className="text-sm font-semibold text-text">Review Results</h2>
        </div>
        <StreamingState streamingText={streamingText} />
      </div>
    );
  }

  if (!currentReview) {
    return (
      <div className="flex flex-col h-full bg-bg">
        <div className="flex-shrink-0 px-5 pt-5 pb-3 border-b border-border">
          <h2 className="text-sm font-semibold text-text">Review Results</h2>
        </div>
        <div className="flex-1">
          <EmptyState />
        </div>
      </div>
    );
  }

  const { comments = [], summary = '' } = currentReview;

  const filteredComments =
    activeFilter === 'all' ? comments : comments.filter((c) => c.severity === activeFilter);

  // Count per severity
  const counts = FILTERS.slice(1).reduce((acc, sev) => {
    acc[sev] = comments.filter((c) => c.severity === sev).length;
    return acc;
  }, {});

  return (
    <div className="flex flex-col h-full bg-bg overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-5 pt-5 pb-3 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text">Review Results</h2>
          <span className="text-xs text-text-muted">
            {comments.length} issue{comments.length !== 1 ? 's' : ''} found
          </span>
        </div>
      </div>

      {/* Summary card */}
      {summary && (
        <div className="flex-shrink-0 mx-5 mt-4 p-4 rounded-lg border border-border bg-surface">
          <div className="flex items-center gap-2 mb-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#58a6ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span className="text-xs font-semibold text-accent uppercase tracking-wide">Summary</span>
          </div>
          <p className="text-sm text-text-muted leading-relaxed">{summary}</p>
        </div>
      )}

      {/* Severity filter tabs */}
      <div className="flex-shrink-0 px-5 pt-4 pb-2 flex gap-1 flex-wrap">
        {FILTERS.map((f) => {
          const isActive = activeFilter === f;
          const count = f === 'all' ? comments.length : counts[f] || 0;
          const color = f !== 'all' ? SEVERITY_CONFIG[f]?.color : '#58a6ff';

          return (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              style={
                isActive
                  ? { backgroundColor: (color || '#58a6ff') + '20', color: color || '#58a6ff', borderColor: (color || '#58a6ff') + '60' }
                  : {}
              }
              className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors capitalize ${
                isActive
                  ? 'border-transparent'
                  : 'border-border text-text-muted hover:text-text hover:border-border'
              }`}
            >
              {f}
              {count > 0 && (
                <span
                  className="ml-1.5 px-1.5 py-0.5 rounded-full text-xs"
                  style={{
                    backgroundColor: isActive ? (color || '#58a6ff') + '30' : '#30363d',
                    color: isActive ? color || '#58a6ff' : '#8b949e',
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Comments list */}
      <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-3 pt-2">
        {filteredComments.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-sm text-text-muted">
            No {activeFilter === 'all' ? '' : activeFilter} issues found.
          </div>
        ) : (
          filteredComments.map((comment, idx) => (
            <CommentCard key={idx} comment={comment} />
          ))
        )}
      </div>
    </div>
  );
}
