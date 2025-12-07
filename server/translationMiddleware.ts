import { Request, Response, NextFunction } from 'express';
import { translationService } from './translationService';
import { storage } from './storage';

interface AuthenticatedRequest extends Request {
  user?: {
    claims: {
      sub: string;
    };
  };
}

// Universal translation middleware that handles ALL responses automatically
export function universalTranslationMiddleware() {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Store original json method
    const originalJson = res.json;
    
    // Override res.json to intercept and translate ALL responses
    (res as any).json = async function(obj: any) {
      try {
        // Skip translation if user is not authenticated
        if (!req.user?.claims?.sub) {
          return originalJson.call(this, obj);
        }
        
        // Get user language preference
        const user = await storage.getUser(req.user.claims.sub);
        const userLanguage = user?.language || 'en';
        
        // Skip translation if language is English or not set
        if (userLanguage === 'en' || !userLanguage) {
          return originalJson.call(this, obj);
        }
        
        // Translate the entire response object recursively
        const translatedObj = await translationService.translateAnything(obj, userLanguage);
        
        return originalJson.call(this, translatedObj);
      } catch (error) {
        console.error('Universal translation middleware error:', error);
        // Return original object if translation fails
        return originalJson.call(this, obj);
      }
    };
    
    next();
  };
}

// Middleware to automatically translate API responses based on user language preference
export function createTranslationMiddleware(fieldsToTranslate: string[] = []) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Store original json method
    const originalJson = res.json;
    
    // Override res.json to intercept and translate responses
    (res as any).json = async function(obj: any) {
      try {
        // Skip translation if user is not authenticated or language is English
        if (!req.user?.claims?.sub) {
          return originalJson.call(this, obj);
        }
        
        // Get user language preference
        const user = await storage.getUser(req.user.claims.sub);
        const userLanguage = user?.language || 'en';
        
        if (userLanguage === 'en' || !userLanguage) {
          return originalJson.call(this, obj);
        }
        
        // Translate the response object
        let translatedObj = obj;
        
        if (Array.isArray(obj)) {
          // Handle array of objects
          translatedObj = await translationService.translateObjectArray(
            obj, 
            userLanguage, 
            fieldsToTranslate
          );
        } else if (obj && typeof obj === 'object') {
          // Handle single object
          translatedObj = await translationService.translateObject(
            obj, 
            userLanguage, 
            fieldsToTranslate
          );
        }
        
        return originalJson.call(this, translatedObj);
      } catch (error) {
        console.error('Translation middleware error:', error);
        // Return original object if translation fails
        return originalJson.call(this, obj);
      }
    };
    
    next();
  };
}

// Specific middleware for weather data translation
export const weatherTranslationMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const originalJson = res.json;
  
  (res as any).json = async function(obj: any) {
    try {
      if (!req.user?.claims?.sub) {
        return originalJson.call(this, obj);
      }
      
      const user = await storage.getUser(req.user.claims.sub);
      const userLanguage = user?.language || 'en';
      
      if (userLanguage === 'en') {
        return originalJson.call(this, obj);
      }
      
      const translatedWeather = await translationService.translateWeatherData(obj, userLanguage);
      return originalJson.call(this, translatedWeather);
    } catch (error) {
      console.error('Weather translation middleware error:', error);
      return originalJson.call(this, obj);
    }
  };
  
  next();
};

// Specific middleware for comprehensive analysis translation
export const comprehensiveAnalysisTranslationMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const originalJson = res.json;
  
  (res as any).json = async function(obj: any) {
    try {
      if (!req.user?.claims?.sub) {
        return originalJson.call(this, obj);
      }
      
      const user = await storage.getUser(req.user.claims.sub);
      const userLanguage = user?.language || 'en';
      
      if (userLanguage === 'en') {
        return originalJson.call(this, obj);
      }
      
      const translatedAnalysis = await translationService.translateComprehensiveAnalysis(obj, userLanguage);
      return originalJson.call(this, translatedAnalysis);
    } catch (error) {
      console.error('Comprehensive analysis translation middleware error:', error);
      return originalJson.call(this, obj);
    }
  };
  
  next();
};

// Specific middleware for crop recommendations translation
export const cropTranslationMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const originalJson = res.json;
  
  (res as any).json = async function(obj: any) {
    try {
      if (!req.user?.claims?.sub) {
        return originalJson.call(this, obj);
      }
      
      const user = await storage.getUser(req.user.claims.sub);
      const userLanguage = user?.language || 'en';
      
      if (userLanguage === 'en') {
        return originalJson.call(this, obj);
      }
      
      const translatedCrops = await translationService.translateCropRecommendations(obj, userLanguage);
      return originalJson.call(this, translatedCrops);
    } catch (error) {
      console.error('Crop translation middleware error:', error);
      return originalJson.call(this, obj);
    }
  };
  
  next();
};

// Specific middleware for drought analysis translation
export const droughtTranslationMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const originalJson = res.json;
  
  (res as any).json = async function(obj: any) {
    try {
      if (!req.user?.claims?.sub) {
        return originalJson.call(this, obj);
      }
      
      const user = await storage.getUser(req.user.claims.sub);
      const userLanguage = user?.language || 'en';
      
      if (userLanguage === 'en') {
        return originalJson.call(this, obj);
      }
      
      let translatedObj = obj;
      if (Array.isArray(obj)) {
        translatedObj = await Promise.all(
          obj.map(item => translationService.translateDroughtAnalysis(item, userLanguage))
        );
      } else {
        translatedObj = await translationService.translateDroughtAnalysis(obj, userLanguage);
      }
      
      return originalJson.call(this, translatedObj);
    } catch (error) {
      console.error('Drought translation middleware error:', error);
      return originalJson.call(this, obj);
    }
  };
  
  next();
};

// Specific middleware for predictions translation
export const predictionsTranslationMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const originalJson = res.json;
  
  (res as any).json = async function(obj: any) {
    try {
      if (!req.user?.claims?.sub) {
        return originalJson.call(this, obj);
      }
      
      const user = await storage.getUser(req.user.claims.sub);
      const userLanguage = user?.language || 'en';
      
      if (userLanguage === 'en') {
        return originalJson.call(this, obj);
      }
      
      const translatedPredictions = await translationService.translatePredictions(obj, userLanguage);
      return originalJson.call(this, translatedPredictions);
    } catch (error) {
      console.error('Predictions translation middleware error:', error);
      return originalJson.call(this, obj);
    }
  };
  
  next();
};

// Specific middleware for seasonal forecast translation
export const seasonalForecastTranslationMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const originalJson = res.json;
  
  (res as any).json = async function(obj: any) {
    try {
      if (!req.user?.claims?.sub) {
        return originalJson.call(this, obj);
      }
      
      const user = await storage.getUser(req.user.claims.sub);
      const userLanguage = user?.language || 'en';
      
      if (userLanguage === 'en') {
        return originalJson.call(this, obj);
      }
      
      const translatedForecast = await translationService.translateSeasonalForecast(obj, userLanguage);
      return originalJson.call(this, translatedForecast);
    } catch (error) {
      console.error('Seasonal forecast translation middleware error:', error);
      return originalJson.call(this, obj);
    }
  };
  
  next();
};
