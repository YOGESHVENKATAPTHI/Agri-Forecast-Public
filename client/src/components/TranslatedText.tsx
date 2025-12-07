import React, { useState, useEffect } from 'react';
import { useTranslationApi, getCachedTranslation } from '@/hooks/useTranslationApi';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface TranslatedTextProps {
  text: string;
  sourceLanguage?: string;
  fallback?: string;
  className?: string;
}

export function TranslatedText({ text, sourceLanguage = 'en', fallback, className }: TranslatedTextProps) {
  const { user } = useAuth();
  const targetLang = user?.language || 'en';
  
  // Initialize with cached value if available
  const cached = getCachedTranslation(text, targetLang, sourceLanguage);
  const [translatedText, setTranslatedText] = useState<string>(cached || '');
  
  const { translateText } = useTranslationApi();
  
  useEffect(() => {
    // Prevent infinite loops by checking if we already have the correct translation
    if (text && targetLang !== 'en' && targetLang !== sourceLanguage) {
      const cached = getCachedTranslation(text, targetLang, sourceLanguage);
      if (cached && cached !== translatedText) {
        setTranslatedText(cached);
      } else if (!cached) {
        // Only call API if not cached and we haven't already started translating this text
        translateText(text, sourceLanguage)
          .then(translated => {
            if (translated !== translatedText) {
              setTranslatedText(translated);
            }
          })
          .catch(error => {
            console.error('Translation failed:', error);
            setTranslatedText(text); // Fallback to original
          });
      }
    } else if (text !== translatedText) {
      setTranslatedText(text);
    }
  }, [text, sourceLanguage, targetLang]); // Removed translateText from dependencies to prevent loops
  
  // If we are supposed to translate but don't have the text yet, render invisible text to preserve layout
  // The global loader should be visible during this time
  const shouldTranslate = text && targetLang !== 'en' && targetLang !== sourceLanguage;
  const isReady = !shouldTranslate || (shouldTranslate && translatedText);

  if (!isReady) {
    return <span className={cn(className, "opacity-0 select-none")}>{fallback || text}</span>;
  }
  
  return <span className={className}>{translatedText}</span>;
}