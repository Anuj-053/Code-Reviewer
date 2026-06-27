# AI Code Reviewer 

A full-stack web application that provides AI-powered, real-time code reviews. Paste your code into an interactive editor to receive instant, inline feedback regarding bugs, security vulnerabilities, performance issues, code style, and general suggestions.

---

## Features ✨

*   **Interactive Monaco Editor**: Experience a VS Code-style editor with syntax highlighting, line numbers, and helper tooltips.
*   **Inline Highlights (Decorations)**: AI review comments are painted directly onto the code lines as warning/error squiggly underlines.
*   **Real-time Streaming (SSE)**: Feedback streams in character-by-character as the AI processes the code.
*   **Severity Filters**: Easily filter findings by Category: *Bug, Security, Performance, Style, or Suggestion*.
*   **AST Code Analysis**: Generates Abstract Syntax Trees for JavaScript/TypeScript snippets to help the AI understand the code structure.
*   **Persistent History**: Save your previous code reviews and load them back into the editor with all visual markings intact at any time.
*   **Flexible AI Providers**: Supports multiple API engines including **Google Gemini**, **Groq**, and **OpenRouter** out-of-the-box.

---

## Tech Stack 🛠️

*   **Frontend**: React (Vite), Zustand, TailwindCSS, Axios, `@monaco-editor/react`.
*   **Backend**: Node.js, Express, MongoDB (Mongoose), `@google/genai`.
*   **Hosting**: Render (Backend + Static Frontend Build) or Vercel (Frontend).

---

## Project Structure 📁

```text
├── client/          # React frontend (Vite configuration)
├── server/          # Node.js/Express backend
├── package.json     # Root workspace configuration
└── README.md        # Documentation
```

---

## Local Setup & Configuration ⚙️

### Prerequisites
*   Node.js (v18+)
*   MongoDB running locally or a MongoDB Atlas account

### 1. Clone & Install Dependencies
Run the following command at the project root to install workspace dependencies:
```bash
# Install root, client, and server dependencies
npm run install-root && npm run install-client
```

### 2. Configure Environment Variables
Create a `.env` file inside the `server/` directory:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/codereview
JWT_SECRET=your_jwt_secret_key_here

# Configure at least ONE of the following AI keys:
GEMINI_API_KEY=AIzaSy...         # Google AI Studio
GROQ_API_KEY=gsk_...            # Groq Cloud (Defaults to llama-3.3-70b-versatile)
OPENROUTER_API_KEY=sk-or-...    # OpenRouter (Defaults to qwen-2.5-coder-32b-instruct:free)
```

### 3. Run Locally
To run both client and server concurrently during development:

*   **Start Backend**:
    ```bash
    cd server
    npm run dev
    ```
*   **Start Frontend**:
    ```bash
    cd client
    npm run dev
    ```

Open your browser at `http://localhost:5173`.


