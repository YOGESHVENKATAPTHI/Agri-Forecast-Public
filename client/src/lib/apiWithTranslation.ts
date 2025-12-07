import { useTranslationContext } from '@/contexts/TranslationContext';
import { useAuth } from '@/hooks/useAuth';

// Global tracking for API requests
let globalActiveRequests = 0;
let globalSetRequestCount: ((count: number) => void) | null = null;

export function setGlobalRequestTracker(setter: (count: number) => void) {
  globalSetRequestCount = setter;
}

// Enhanced API request function that tracks loading state
export async function apiRequestWithTranslation(
  method: string,
  url: string,
  data?: unknown | undefined
): Promise<Response> {
  // Increment global request counter
  globalActiveRequests++;
  if (globalSetRequestCount) {
    globalSetRequestCount(globalActiveRequests);
  }

  try {
    const response = await fetch(url, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    if (!response.ok) {
      const text = (await response.text()) || response.statusText;
      throw new Error(`${response.status}: ${text}`);
    }

    return response;
  } finally {
    // Decrement global request counter
    globalActiveRequests = Math.max(0, globalActiveRequests - 1);
    if (globalSetRequestCount) {
      globalSetRequestCount(globalActiveRequests);
    }
  }
}

// Hook for API requests with translation loading integration
export function useApiWithTranslation() {
  const { user } = useAuth();
  
  // Safely try to use translation context
  let addRequest: (() => void) | undefined;
  let removeRequest: (() => void) | undefined;
  
  try {
    const ctx = useTranslationContext();
    addRequest = ctx.addRequest;
    removeRequest = ctx.removeRequest;
  } catch (e) {
    // Context not available yet
  }

  const makeRequest = async (method: string, url: string, data?: unknown) => {
    // Show loading if user needs translation
    const needsTranslation = user?.language && user.language !== 'en';
    
    if (needsTranslation && addRequest) {
      addRequest();
    }

    try {
      const response = await apiRequestWithTranslation(method, url, data);
      return response;
    } finally {
      if (needsTranslation && removeRequest) {
        removeRequest();
      }
    }
  };

  return {
    get: (url: string) => makeRequest('GET', url),
    post: (url: string, data?: unknown) => makeRequest('POST', url, data),
    put: (url: string, data?: unknown) => makeRequest('PUT', url, data),
    delete: (url: string) => makeRequest('DELETE', url),
  };
}