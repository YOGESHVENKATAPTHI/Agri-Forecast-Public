import { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTranslationContext } from '@/contexts/TranslationContext';

interface TranslationCache {
  [key: string]: string;
}

interface UseTranslationApiReturn {
  translateText: (text: string, sourceLanguage?: string) => Promise<string>;
  translateBatch: (texts: string[], sourceLanguage?: string) => Promise<string[]>;
  isTranslating: boolean;
  translationError: string | null;
}

// Global cache to share translations across components and prevent re-fetching
const globalCache: TranslationCache = {};
const pendingRequests: Record<string, Promise<string>> = {};

export function getCachedTranslation(text: string, targetLang: string, sourceLang: string = 'en'): string | undefined {
  const key = `${sourceLang}-${targetLang}-${text}`;
  return globalCache[key];
}

export function shouldTranslateForUser(userLanguage?: string): boolean {
  return userLanguage && userLanguage !== 'en';
}

export function useTranslationApi(): UseTranslationApiReturn {
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const { user } = useAuth();
  
  // Safely try to use context, fallback if not available (e.g. during init)
  let addRequest: (() => void) | undefined;
  let removeRequest: (() => void) | undefined;
  
  try {
    const ctx = useTranslationContext();
    addRequest = ctx.addRequest;
    removeRequest = ctx.removeRequest;
  } catch (e) {
    // Context not available yet
  }
  
  const targetLanguage = user?.language || 'en';
  
  const getCacheKey = useCallback((text: string, targetLang: string, sourceLang: string = 'en'): string => {
    return `${sourceLang}-${targetLang}-${text}`;
  }, []);
  
  const translateText = useCallback(async (text: string, sourceLanguage: string = 'en'): Promise<string> => {
    if (!text || targetLanguage === 'en' || targetLanguage === sourceLanguage) {
      return text;
    }
    
    const cacheKey = getCacheKey(text, targetLanguage, sourceLanguage);
    
    // 1. Check Global Cache
    if (globalCache[cacheKey]) {
      return globalCache[cacheKey];
    }
    
    // 2. Check Pending Requests (Deduplication)
    if (pendingRequests[cacheKey]) {
      return pendingRequests[cacheKey];
    }
    
    // 3. Start New Request
    const promise = (async () => {
      try {
        if (addRequest) addRequest();
        setIsTranslating(true);
        setTranslationError(null);
        
        const response = await fetch('/api/translate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text,
            targetLanguage,
            sourceLanguage
          }),
        });
        
        if (!response.ok) {
          throw new Error('Translation request failed');
        }
        
        const data = await response.json();
        const translatedText = data.translatedText || text;
        
        // Update global cache
        globalCache[cacheKey] = translatedText;
        
        return translatedText;
      } catch (error) {
        console.error('Translation error:', error);
        setTranslationError('Translation failed');
        return text; // Return original text on error
      } finally {
        setIsTranslating(false);
        if (removeRequest) removeRequest();
        delete pendingRequests[cacheKey];
      }
    })();
    
    pendingRequests[cacheKey] = promise;
    return promise;
    
  }, [targetLanguage, getCacheKey, addRequest, removeRequest]);
  
  const translateBatch = useCallback(async (texts: string[], sourceLanguage: string = 'en'): Promise<string[]> => {
    if (!texts.length || targetLanguage === 'en' || targetLanguage === sourceLanguage) {
      return texts;
    }
    
    // Limit batch size to prevent overwhelming the server
    const MAX_BATCH_SIZE = 10;
    if (texts.length > MAX_BATCH_SIZE) {
      const chunks = [];
      for (let i = 0; i < texts.length; i += MAX_BATCH_SIZE) {
        chunks.push(texts.slice(i, i + MAX_BATCH_SIZE));
      }
      const results = await Promise.all(chunks.map(chunk => translateBatch(chunk, sourceLanguage)));
      return results.flat();
    }
    
    // Check which texts are already cached
    const uncachedTexts: string[] = [];
    const results: string[] = new Array(texts.length);
    const uncachedIndices: number[] = [];
    
    texts.forEach((text, index) => {
      const cacheKey = getCacheKey(text, targetLanguage, sourceLanguage);
      if (globalCache[cacheKey]) {
        results[index] = globalCache[cacheKey];
      } else {
        uncachedTexts.push(text);
        uncachedIndices.push(index);
        results[index] = ''; // Placeholder
      }
    });
    
    if (uncachedTexts.length === 0) {
      return results;
    }
    
    try {
      if (addRequest) addRequest();
      setIsTranslating(true);
      setTranslationError(null);
      
      const response = await fetch('/api/translate/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          texts: uncachedTexts,
          targetLanguage,
          sourceLanguage
        }),
      });
      
      if (!response.ok) {
        throw new Error('Batch translation request failed');
      }
      
      const data = await response.json();
      const translatedTexts = data.translatedTexts || uncachedTexts;
      
      // Update cache and results
      translatedTexts.forEach((translatedText: string, i: number) => {
        const originalText = uncachedTexts[i];
        const originalIndex = uncachedIndices[i];
        const cacheKey = getCacheKey(originalText, targetLanguage, sourceLanguage);
        
        globalCache[cacheKey] = translatedText;
        results[originalIndex] = translatedText;
      });
      
      return results;
    } catch (error) {
      console.error('Batch translation error:', error);
      setTranslationError('Batch translation failed');
      // Fill missing results with original text
      uncachedTexts.forEach((text, i) => {
        const originalIndex = uncachedIndices[i];
        results[originalIndex] = text;
      });
      return results;
    } finally {
      setIsTranslating(false);
      if (removeRequest) removeRequest();
    }
  }, [targetLanguage, getCacheKey, addRequest, removeRequest]);
  
  return {
    translateText,
    translateBatch,
    isTranslating,
    translationError
  };
}