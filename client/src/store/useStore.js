import { create } from 'zustand';

// Initialise from localStorage for persistence across refreshes
const storedToken = localStorage.getItem('token') || null;
const storedUser = (() => {
  try {
    const u = localStorage.getItem('user');
    return u ? JSON.parse(u) : null;
  } catch {
    return null;
  }
})();

const useStore = create((set) => ({
  // Auth
  user: storedUser,
  token: storedToken,

  setAuth: (user, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ user, token });
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, token: null, currentReview: null, streamingText: '' });
  },

  // Review state
  currentReview: null,
  setCurrentReview: (review) => set({ currentReview: review }),

  // Streaming text accumulator
  streamingText: '',
  setStreamingText: (text) => set({ streamingText: text }),

  // Reviewing loading state
  isReviewing: false,
  setIsReviewing: (val) => set({ isReviewing: val }),

  // Active language
  language: 'javascript',
  setLanguage: (lang) => set({ language: lang }),
}));

export default useStore;
