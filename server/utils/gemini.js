const { GoogleGenAI } = require('@google/genai');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function* streamReview(code, language, astSummary) {
  const prompt = `You are an expert code reviewer. Analyse the following code and return a JSON array of review comments followed by a summary.

Each comment object must have exactly these fields:
- line: number (line where issue starts)
- endLine: number (line where issue ends)
- severity: one of exactly: bug, security, performance, style, suggestion
- title: string (max 8 words)
- description: string (1-3 sentences)
- suggestion: string (the fix or improved code)

Return ONLY the raw JSON array first. Then on a new line write SUMMARY: followed by 2-3 sentences of overall assessment. No markdown, no backticks, no text before the JSON array.

CODE STRUCTURE (from AST analysis):
${astSummary}

LANGUAGE: ${language}

CODE:
${code}`;

  // Check if we should use Groq
  if (process.env.GROQ_API_KEY) {
    const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
    console.log(`[Groq] Starting stream review using model: ${model}`);
    yield* streamOpenAICompatible(
      'https://api.groq.com/openai/v1/chat/completions',
      process.env.GROQ_API_KEY,
      model,
      prompt
    );
    return;
  }

  // Check if we should use OpenRouter
  if (process.env.OPENROUTER_API_KEY) {
    const model = process.env.OPENROUTER_MODEL || 'qwen/qwen-2.5-coder-32b-instruct:free';
    console.log(`[OpenRouter] Starting stream review using model: ${model}`);
    yield* streamOpenAICompatible(
      'https://openrouter.ai/api/v1/chat/completions',
      process.env.OPENROUTER_API_KEY,
      model,
      prompt,
      {
        'HTTP-Referer': 'http://localhost:5173',
        'X-Title': 'AI Code Reviewer',
      }
    );
    return;
  }

  // Fallback to Gemini SDK
  if (process.env.GEMINI_API_KEY) {
    const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
    console.log(`[Gemini] Starting stream review using model: ${model}`);
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const MAX_RETRIES = 4;
    const BASE_DELAY_MS = 10000;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await ai.models.generateContentStream({
          model: model,
          contents: prompt,
        });

        for await (const chunk of response) {
          const text = chunk.text;
          if (text) yield text;
        }
        return; // success
      } catch (error) {
        const msg = error?.message || '';
        const is429 = msg.includes('429') || error?.status === 429 || msg.toLowerCase().includes('too many requests') || msg.includes('503');

        if (is429 && attempt < MAX_RETRIES) {
          const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
          console.warn(`[Gemini] Rate limited/Busy. Retrying in ${delay / 1000}s (attempt ${attempt}/${MAX_RETRIES})`);
          yield `__RETRY__:Model busy/rate limited — retrying in ${delay / 1000}s...`;
          await sleep(delay);
        } else {
          console.error('[Gemini] Fatal error:', msg);
          throw error;
        }
      }
    }
  } else {
    throw new Error('No API key configured. Please set GEMINI_API_KEY, GROQ_API_KEY, or OPENROUTER_API_KEY.');
  }
}

async function* streamOpenAICompatible(url, apiKey, model, prompt, additionalHeaders = {}) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      ...additionalHeaders,
    },
    body: JSON.stringify({
      model: model,
      messages: [{ role: 'user', content: prompt }],
      stream: true,
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    let parsedErr = errText;
    try {
      parsedErr = JSON.parse(errText).error?.message || errText;
    } catch {}
    throw new Error(`API failed (${response.status}): ${parsedErr}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop(); // keep last incomplete line

    for (const line of lines) {
      const cleanLine = line.trim();
      if (!cleanLine) continue;
      if (cleanLine === 'data: [DONE]') continue;
      
      if (cleanLine.startsWith('data: ')) {
        try {
          const json = JSON.parse(cleanLine.slice(6));
          const chunkText = json.choices?.[0]?.delta?.content;
          if (chunkText) {
            yield chunkText;
          }
        } catch (e) {
          // ignore parsing error for incomplete JSON lines
        }
      }
    }
  }
}

module.exports = { streamReview };
