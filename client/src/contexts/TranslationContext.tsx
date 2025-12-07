import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { setGlobalRequestTracker } from '@/lib/apiWithTranslation';

interface TranslationContextType {
  activeRequests: number;
  apiRequests: number;
  addRequest: () => void;
  removeRequest: () => void;
  isTranslating: boolean;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

export function TranslationProvider({ children }: { children: ReactNode }) {
  const [activeRequests, setActiveRequests] = useState(0);
  const [apiRequests, setApiRequests] = useState(0);

  const addRequest = useCallback(() => {
    setActiveRequests(prev => prev + 1);
  }, []);

  const removeRequest = useCallback(() => {
    setActiveRequests(prev => Math.max(0, prev - 1));
  }, []);

  // Set up global API request tracking
  useEffect(() => {
    setGlobalRequestTracker(setApiRequests);
  }, []);

  return (
    <TranslationContext.Provider value={{ 
      activeRequests, 
      apiRequests,
      addRequest, 
      removeRequest,
      isTranslating: activeRequests > 0 || apiRequests > 0
    }}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslationContext() {
  const context = useContext(TranslationContext);
  if (context === undefined) {
    throw new Error('useTranslationContext must be used within a TranslationProvider');
  }
  return context;
}