import { createContext, useState, useCallback, useEffect } from 'react';

export const AppContext = createContext();

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const [resume, setResume] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [applications, setApplications] = useState([]);

  // Check localStorage for saved user on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (err) {
        console.error('Error parsing saved user:', err);
        localStorage.removeItem('user');
      }
    }
    setIsAuthenticating(false);
  }, []);

  // Chat and filters state
  const [filters, setFilters] = useState({
    role: '',
    skills: [],
    datePosted: '',
    jobType: '',
    workMode: '',
    location: '',
    matchScore: '',
  });
  const [chatHistory, setChatHistory] = useState([]);

  const updateFilters = useCallback((newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const addChatMessage = useCallback((message) => {
    setChatHistory(prev => [...prev, message]);
  }, []);

  const safeJson = (text) => {
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch (parseError) {
      console.warn('safeJson parse error:', parseError, 'text:', text);
      return {};
    }
  };

  const login = useCallback(async (email, password) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const text = await response.text();
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch (e) {
        throw new Error('Invalid server response');
      }
      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }
      setUser(data.user);
      localStorage.setItem('user', JSON.stringify(data.user));
      return data.user;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchResume = useCallback(async () => {
    try {
      const response = await fetch('/api/resume');
      const text = await response.text();
      const data = safeJson(text);

      if (!response.ok) {
        setResume(null);
        return null;
      }

      const nextResume =
        data?.resume ??
        (Array.isArray(data?.resumes) && data.resumes.length > 0 ? data.resumes[0] : null);

      setResume(nextResume);
      return nextResume;
    } catch (err) {
      console.error('Error fetching resume:', err);
      setResume(null);
      return null;
    }
  }, []);

  const fetchApplications = useCallback(async () => {
    try {
      const response = await fetch('/api/applications');
      const text = await response.text();
      const data = text ? JSON.parse(text) : {};

      if (!response.ok) {
        setApplications([]);
        return [];
      }

      setApplications(data?.applications || []);
      return data?.applications || [];
    } catch (err) {
      console.error('Error fetching applications:', err);
      setApplications([]);
      return [];
    }
  }, []);

  const uploadResume = useCallback(async (file) => {
  setIsLoading(true);
  setError(null);

  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/resume/upload', {
      method: 'POST',
      body: formData,
    });

    const text = await response.text();
    const data = safeJson(text);

    if (!response.ok || !data.success) {
      throw new Error(data.message || data.error || 'Upload failed');
    }

    if (data.resume) {
      setResume(data.resume);
    } else if (fetchResume) {
      await fetchResume();
    }

    return data.resume;
  } catch (err) {
    setError(err.message);
    throw err;
  } finally {
    setIsLoading(false);
  }
}, [fetchResume]);


const logout = useCallback(() => {
  setUser(null);
  localStorage.removeItem('user');
  setResume(null);
  setFilters({
    role: '',
    skills: [],
    datePosted: '',
    jobType: '',
    workMode: '',
    location: '',
    matchScore: '',
  });
  setChatHistory([]);
}, []);


  return (
    <AppContext.Provider
      value={{
        user,
        isAuthenticating,
        resume,
        applications,
        isLoading,
        error,
        login,
        logout,
        fetchResume,
        fetchApplications,
        uploadResume,
        filters,
        updateFilters,
        chatHistory,
        addChatMessage,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
