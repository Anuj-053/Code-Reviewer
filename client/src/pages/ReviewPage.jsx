import React, { useRef, useState, useCallback, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import Sidebar from '../components/Sidebar';
import ReviewPanel from '../components/ReviewPanel';
import useStore from '../store/useStore';

const SAMPLE_CODE = `// User authentication service
const getUserData = async (userId, db, cache, logger, metrics) => {
  let userData = null;
  let cacheKey = "user_" + userId;
  
  if (cache.has(cacheKey)) {
    userData = cache.get(cacheKey);
  } else {
    if (userId) {
      if (db.isConnected()) {
        if (typeof userId === 'string') {
          // SQL injection vulnerability
          const query = "SELECT * FROM users WHERE id = '" + userId + "'";
          userData = await db.raw(query);
          cache.set(cacheKey, userData);
          console.log("Fetched user:", userData);
        }
      }
    }
  }
  
  const password = userData.password;
  const apiKey = "sk-prod-abc123secretkey";
  
  let processedData = processUser(userData);
  
  return processedData;
};

const processUser = (data) => {
  var result = {};
  result.name = data.name;
  result.email = data.email;
  debugger;
  return result;
}`;

const LANGUAGE_OPTIONS = [
  { value: 'javascript', label: 'JavaScript', monacoLang: 'javascript' },
  { value: 'typescript', label: 'TypeScript', monacoLang: 'typescript' },
  { value: 'python', label: 'Python', monacoLang: 'python' },
  { value: 'java', label: 'Java', monacoLang: 'java' },
  { value: 'cpp', label: 'C++', monacoLang: 'cpp' },
  { value: 'go', label: 'Go', monacoLang: 'go' },
];

const SEVERITY_DECORATION_CLASS = {
  bug: 'decoration-bug',
  security: 'decoration-security',
  performance: 'decoration-performance',
  style: 'decoration-style',
  suggestion: 'decoration-suggestion',
};

const SEVERITY_MARKER_SEVERITY = {
  bug: 8, // MarkerSeverity.Error
  security: 8,
  performance: 4, // MarkerSeverity.Warning
  style: 2, // MarkerSeverity.Info
  suggestion: 1, // MarkerSeverity.Hint
};

export default function ReviewPage() {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const decorationsRef = useRef([]);

  const {
    language,
    setLanguage,
    isReviewing,
    setIsReviewing,
    currentReview,
    setCurrentReview,
    setStreamingText,
    token,
  } = useStore();

  const [code, setCode] = useState("");
  const [reviewError, setReviewError] = useState('');
  const [editorMounted, setEditorMounted] = useState(false);

  const selectedLang = LANGUAGE_OPTIONS.find((l) => l.value === language) || LANGUAGE_OPTIONS[0];

  function applyDecorations(comments, monacoInstance, editorInstance) {
    if (!monacoInstance || !editorInstance) return;
    const model = editorInstance.getModel();
    if (!model) return;

    // Set model markers (hover tooltips)
    const markers = comments.map((c) => ({
      startLineNumber: c.line,
      endLineNumber: c.endLine,
      startColumn: 1,
      endColumn: model.getLineMaxColumn(Math.min(c.endLine, model.getLineCount())),
      message: `[${c.severity.toUpperCase()}] ${c.title}: ${c.description}`,
      severity: SEVERITY_MARKER_SEVERITY[c.severity] ?? 4,
      source: 'AI Code Reviewer',
    }));
    monacoInstance.editor.setModelMarkers(model, 'ai-reviewer', markers);

    // Delta decorations (squiggly underlines)
    const newDecorations = comments.map((c) => ({
      range: new monacoInstance.Range(
        c.line,
        1,
        Math.min(c.endLine, model.getLineCount()),
        model.getLineMaxColumn(Math.min(c.endLine, model.getLineCount()))
      ),
      options: {
        inlineClassName: SEVERITY_DECORATION_CLASS[c.severity] || 'decoration-suggestion',
        hoverMessage: { value: `**[${c.severity}]** ${c.title}\n\n${c.description}` },
      },
    }));

    decorationsRef.current = editorInstance.deltaDecorations(
      decorationsRef.current,
      newDecorations
    );
  }

  const handleEditorDidMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    setEditorMounted(true);
  }, []);

  // Sync historical code with editor state
  useEffect(() => {
    if (currentReview && typeof currentReview.code === 'string') {
      setCode(currentReview.code);
    } else if (!currentReview) {
      setCode("");
    }
  }, [currentReview]);

  // Apply decorations on mount or when currentReview updates
  useEffect(() => {
    if (currentReview && currentReview.comments && editorRef.current && monacoRef.current) {
      const timer = setTimeout(() => {
        applyDecorations(currentReview.comments, monacoRef.current, editorRef.current);
      }, 100);
      return () => clearTimeout(timer);
    } else if (!currentReview && editorRef.current && monacoRef.current) {
      decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, []);
      monacoRef.current.editor.setModelMarkers(editorRef.current.getModel(), 'ai-reviewer', []);
    }
  }, [currentReview, editorMounted]);

  async function handleReview() {
    if (!code.trim()) return;
    setReviewError('');
    setIsReviewing(true);
    setCurrentReview(null);
    setStreamingText('');

    // Clear existing decorations
    if (editorRef.current && monacoRef.current) {
      decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, []);
      monacoRef.current.editor.setModelMarkers(
        editorRef.current.getModel(),
        'ai-reviewer',
        []
      );
    }

    try {
      const response = await fetch('/api/review/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code, language: selectedLang.value }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error || `HTTP ${response.status}`);
      }

      const contentType = response.headers.get('content-type') || '';

      // Cached response (JSON, not SSE)
      if (contentType.includes('application/json')) {
        const data = await response.json();
        setCurrentReview({ comments: data.comments, summary: data.summary });
        setIsReviewing(false);
        applyDecorations(data.comments, monacoRef.current, editorRef.current);
        return;
      }

      // SSE streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // keep incomplete line

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;

          let payload;
          try {
            payload = JSON.parse(jsonStr);
          } catch {
            continue;
          }

          if (payload.error) {
            throw new Error(payload.error);
          }

          if (payload.chunk) {
            accumulated += payload.chunk;
            // Show accumulated text in streaming panel
            // Extract just the readable part (after any JSON array content)
            const summaryIdx = accumulated.indexOf('SUMMARY:');
            if (summaryIdx !== -1) {
              setStreamingText(accumulated.slice(summaryIdx + 8).trim());
            } else {
              // Show last 300 chars of JSON building up
              const display = accumulated.length > 300
                ? '…' + accumulated.slice(-300)
                : accumulated;
              setStreamingText(display);
            }
          }

          if (payload.done) {
            const { comments, summary } = payload;
            setCurrentReview({ comments, summary });
            setIsReviewing(false);
            setStreamingText('');
            applyDecorations(comments, monacoRef.current, editorRef.current);
          }
        }
      }
    } catch (err) {
      console.error('Review error:', err);
      setReviewError(err.message || 'Review failed. Please try again.');
      setIsReviewing(false);
      setStreamingText('');
    }
  }

  return (
    <div className="flex h-screen bg-bg overflow-hidden">
      <Sidebar />

      <main className="flex-1 flex overflow-hidden">
        {/* Left: Editor panel */}
        <div
          className="flex flex-col border-r border-border overflow-hidden"
          style={{ width: '55%', minWidth: '400px' }}
        >
          {/* Top bar */}
          <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-border bg-surface">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-text">Editor</span>
              {/* Language selector */}
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="text-xs font-mono bg-bg border border-border text-text-muted rounded-md px-2.5 py-1.5 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors cursor-pointer"
              >
                {LANGUAGE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 text-xs text-text-muted font-mono">
              <span>{code.split('\n').length} lines</span>
            </div>
          </div>

          {/* Monaco Editor */}
          <div className="flex-1 overflow-hidden">
            <Editor
              height="100%"
              language={selectedLang.monacoLang}
              value={code}
              onChange={(val) => setCode(val || '')}
              onMount={handleEditorDidMount}
              theme="vs-dark"
              options={{
                fontSize: 13,
                fontFamily: '"JetBrains Mono", monospace',
                fontLigatures: true,
                lineHeight: 1.7,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                padding: { top: 16, bottom: 16 },
                renderLineHighlight: 'gutter',
                smoothScrolling: true,
                cursorBlinking: 'phase',
                bracketPairColorization: { enabled: true },
                tabSize: 2,
              }}
            />
          </div>

          {/* Review button */}
          <div className="flex-shrink-0 px-4 py-3 border-t border-border bg-surface">
            {reviewError && (
              <div className="mb-2 px-3 py-2 rounded-md bg-bug/10 border border-bug/30 text-bug text-xs">
                {reviewError}
              </div>
            )}
            <button
              onClick={handleReview}
              disabled={isReviewing || !code.trim()}
              className="w-full py-2.5 rounded-md bg-accent text-bg text-sm font-semibold hover:bg-accent-hover transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isReviewing ? (
                <>
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                    <path d="M12 2a10 10 0 0 1 10 10" />
                  </svg>
                  Reviewing…
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  Review Code
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right: Review panel */}
        <div className="flex-1 overflow-hidden">
          <ReviewPanel />
        </div>
      </main>
    </div>
  );
}
