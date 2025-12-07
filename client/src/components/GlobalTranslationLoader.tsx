import React from 'react';
import { useTranslationContext } from '@/contexts/TranslationContext';
import { Loader2 } from 'lucide-react';

export function GlobalTranslationLoader() {
  const { isTranslating } = useTranslationContext();

  if (!isTranslating) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex items-center gap-3 p-4 bg-card/90 backdrop-blur-md rounded-lg shadow-lg border border-primary/20 animate-in slide-in-from-bottom-5 fade-in duration-300">
      <Loader2 className="h-5 w-5 animate-spin text-primary" />
      <div className="flex flex-col">
        <span className="text-sm font-medium text-foreground">Processing...</span>
      </div>
    </div>
  );
}