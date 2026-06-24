import React, { useState } from 'react';
import SeverityBadge from './SeverityBadge';

function ChevronIcon({ open }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function WrenchIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}

export default function CommentCard({ comment }) {
  const [fixOpen, setFixOpen] = useState(false);

  return (
    <div className="rounded-lg border border-border bg-surface overflow-hidden transition-all">
      {/* Header */}
      <div className="flex items-start gap-3 p-4">
        <div className="flex-shrink-0 mt-0.5">
          <SeverityBadge severity={comment.severity} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-semibold text-text">{comment.title}</h4>
            <span className="text-xs font-mono bg-surface-2 text-text-muted px-2 py-0.5 rounded border border-border-muted">
              {comment.line === comment.endLine
                ? `L${comment.line}`
                : `L${comment.line}–${comment.endLine}`}
            </span>
          </div>
          <p className="mt-1.5 text-sm text-text-muted leading-relaxed">
            {comment.description}
          </p>
        </div>
      </div>

      {/* Suggested fix toggle */}
      {comment.suggestion && (
        <div className="border-t border-border">
          <button
            onClick={() => setFixOpen((v) => !v)}
            className="flex items-center gap-2 w-full px-4 py-2.5 text-xs font-medium text-text-muted hover:text-text hover:bg-surface-2 transition-colors"
          >
            <WrenchIcon />
            <span>Suggested fix</span>
            <span className="ml-auto">
              <ChevronIcon open={fixOpen} />
            </span>
          </button>

          {fixOpen && (
            <div className="px-4 pb-4">
              <pre
                className="text-xs font-mono p-3 rounded-md overflow-x-auto"
                style={{
                  backgroundColor: '#0d1117',
                  border: '1px solid #30363d',
                  color: '#e6edf3',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {comment.suggestion}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
