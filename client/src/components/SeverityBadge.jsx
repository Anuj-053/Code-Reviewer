import React from 'react';

const SEVERITY_CONFIG = {
  bug: { color: '#f85149', label: 'Bug' },
  security: { color: '#ff7b72', label: 'Security' },
  performance: { color: '#e3b341', label: 'Performance' },
  style: { color: '#58a6ff', label: 'Style' },
  suggestion: { color: '#8b949e', label: 'Suggestion' },
};

export default function SeverityBadge({ severity }) {
  const config = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.suggestion;

  return (
    <span
      style={{
        backgroundColor: config.color + '26',
        color: config.color,
        border: `1px solid ${config.color}40`,
      }}
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium font-mono uppercase tracking-wide"
    >
      {config.label}
    </span>
  );
}

export { SEVERITY_CONFIG };
