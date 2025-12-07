import { translate } from 'google-translate-api-x';

// Language code mappings for Google Translate
const LANGUAGE_CODES = {
  'en': 'en',
  'hi': 'hi', 
  'ta': 'ta',
  'te': 'te',
  'kn': 'kn',
  'ml': 'ml',
  'mr': 'mr',
  'bn': 'bn',
  'gu': 'gu',
  'pa': 'pa',
  'es': 'es',
  'fr': 'fr',
  'de': 'de',
  'zh': 'zh',
  'ja': 'ja'
};

export interface TranslationRequest {
  text: string;
  targetLanguage: string;
  sourceLanguage?: string;
}

export interface TranslationResponse {
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
}

class TranslationService {
  private cache = new Map<string, string>();
  
  // Create cache key for translation
  private getCacheKey(text: string, targetLang: string, sourceLang: string = 'en'): string {
    return `${sourceLang}-${targetLang}-${text}`;
  }
  
  // Translate single text
  async translateText(text: string, targetLanguage: string, sourceLanguage: string = 'en'): Promise<string> {
    // Return original text if target is same as source or text is not a string
    if (!text || typeof text !== 'string' || targetLanguage === sourceLanguage || targetLanguage === 'en') {
      return typeof text === 'string' ? text : String(text || '');
    }
    
    const cacheKey = this.getCacheKey(text, targetLanguage, sourceLanguage);
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }
    
    try {
      const targetLangCode = LANGUAGE_CODES[targetLanguage as keyof typeof LANGUAGE_CODES] || targetLanguage;
      const result = await translate(text, { 
        from: sourceLanguage, 
        to: targetLangCode,
        rejectOnPartialFail: false,
        forceBatch: false 
      });
      
      const translatedText = result.text || text;
      
      // Cache the result
      this.cache.set(cacheKey, translatedText);
      
      return translatedText;
    } catch (error) {
      console.error('Translation error:', error);
      return text; // Return original text on error
    }
  }
  
  // Translate multiple texts in batch
  async translateBatch(texts: string[], targetLanguage: string, sourceLanguage: string = 'en'): Promise<string[]> {
    const promises = texts.map(text => this.translateText(text, targetLanguage, sourceLanguage));
    return Promise.all(promises);
  }
  
  // Translate object properties recursively
  async translateObject(obj: any, targetLanguage: string, fieldsToTranslate: string[], sourceLanguage: string = 'en'): Promise<any> {
    if (!obj || targetLanguage === 'en') return obj;
    
    const translated = { ...obj };
    
    for (const field of fieldsToTranslate) {
      if (obj[field] && typeof obj[field] === 'string') {
        translated[field] = await this.translateText(obj[field], targetLanguage, sourceLanguage);
      }
    }
    
    return translated;
  }
  
  // Translate array of objects
  async translateObjectArray(array: any[], targetLanguage: string, fieldsToTranslate: string[], sourceLanguage: string = 'en'): Promise<any[]> {
    if (!array || !array.length || targetLanguage === 'en') return array;
    
    const promises = array.map(item => this.translateObject(item, targetLanguage, fieldsToTranslate, sourceLanguage));
    return Promise.all(promises);
  }
  
  // Weather-specific translation helper
  async translateWeatherData(weatherData: any, targetLanguage: string): Promise<any> {
    if (!weatherData || targetLanguage === 'en') return weatherData;
    
    const translated = { ...weatherData };
    
    // Handle wrapped data (e.g. { success: true, data: weather })
    if (translated.data && (translated.data.current || translated.data.daily)) {
      translated.data = await this.translateWeatherData(translated.data, targetLanguage);
      return translated;
    }
    
    // Translate weather descriptions
    if (weatherData.current?.weather?.[0]?.description) {
      translated.current.weather[0].description = await this.translateText(
        weatherData.current.weather[0].description, 
        targetLanguage
      );
    }
    
    // Translate agricultural indices descriptions
    if (weatherData.agriculturalIndices) {
      const indices = { ...weatherData.agriculturalIndices };
      
      // Translate comfort level descriptions
      if (indices.comfortIndex) {
        indices.comfortIndex = await this.translateText(indices.comfortIndex, targetLanguage);
      }
      
      translated.agriculturalIndices = indices;
    }
    
    // Translate daily forecasts
    if (weatherData.daily) {
      const dailyPromises = weatherData.daily.map(async (day: any) => {
        const translatedDay = { ...day };
        if (day.weather?.[0]?.description) {
          translatedDay.weather[0].description = await this.translateText(
            day.weather[0].description, 
            targetLanguage
          );
        }
        return translatedDay;
      });
      translated.daily = await Promise.all(dailyPromises);
    }
    
    return translated;
  }
  
  // Crop recommendation specific translation
  async translateCropRecommendations(recommendations: any[], targetLanguage: string): Promise<any[]> {
    if (!recommendations || !recommendations.length || targetLanguage === 'en') {
      return recommendations;
    }
    
    const fieldsToTranslate = [
      'cropName', 
      'variety', 
      'reason', 
      'description',
      'benefits',
      'challenges',
      'tips'
    ];
    
    return this.translateObjectArray(recommendations, targetLanguage, fieldsToTranslate);
  }
  
  // Drought analysis translation
  async translateDroughtAnalysis(analysis: any, targetLanguage: string): Promise<any> {
    if (!analysis || targetLanguage === 'en') return analysis;
    
    const translated = { ...analysis };
    
    // Translate risk level descriptions
    const levelTranslations = {
      'low': await this.translateText('Low', targetLanguage),
      'moderate': await this.translateText('Moderate', targetLanguage),  
      'high': await this.translateText('High', targetLanguage),
      'critical': await this.translateText('Critical', targetLanguage),
      'extreme': await this.translateText('Extreme', targetLanguage)
    };
    
    if (analysis.riskLevel) {
      translated.riskLevel = levelTranslations[analysis.riskLevel.toLowerCase() as keyof typeof levelTranslations] || analysis.riskLevel;
    }
    
    // Translate recommendations and action plans
    if (analysis.recommendations) {
      translated.recommendations = await this.translateBatch(
        analysis.recommendations, 
        targetLanguage
      );
    }
    
    if (analysis.actionPlan) {
      translated.actionPlan = await this.translateText(analysis.actionPlan, targetLanguage);
    }
    
    return translated;
  }

  // Predictions translation
  async translatePredictions(predictions: any[], targetLanguage: string): Promise<any[]> {
    if (!predictions || !predictions.length || targetLanguage === 'en') {
      return predictions;
    }
    
    const fieldsToTranslate = [
      'title', 
      'description', 
      'severity', 
      'predictionType',
      'aiModel'
    ];
    
    return this.translateObjectArray(predictions, targetLanguage, fieldsToTranslate);
  }

  // Seasonal forecast translation
  async translateSeasonalForecast(forecast: any, targetLanguage: string): Promise<any> {
    if (!forecast || targetLanguage === 'en') return forecast;
    
    const translated = { ...forecast };
    
    if (translated.data && Array.isArray(translated.data)) {
      // Translate any text fields in seasonal data if they exist
      // Currently seasonal data is mostly numeric, but if there are descriptions:
      // translated.data = await this.translateObjectArray(translated.data, targetLanguage, ['description']);
    }
    
    return translated;
  }

  // Comprehensive analysis translation
  async translateComprehensiveAnalysis(analysis: any, targetLanguage: string): Promise<any> {
    if (!analysis || targetLanguage === 'en') return analysis;
    
    const translated = { ...analysis };
    
    // Translate location data
    if (translated.locationData) {
      if (translated.locationData.address) {
        translated.locationData.address = await this.translateText(translated.locationData.address, targetLanguage);
      }
      if (translated.locationData.soilType) {
        if (typeof translated.locationData.soilType === 'string') {
          translated.locationData.soilType = await this.translateText(translated.locationData.soilType, targetLanguage);
        } else if (typeof translated.locationData.soilType === 'object') {
          // Handle soilType object
          const soil = translated.locationData.soilType;
          if (soil.primary) soil.primary = await this.translateText(soil.primary, targetLanguage);
          if (soil.secondary) soil.secondary = await this.translateText(soil.secondary, targetLanguage);
          if (soil.fertility) soil.fertility = await this.translateText(soil.fertility, targetLanguage);
          if (soil.drainage) soil.drainage = await this.translateText(soil.drainage, targetLanguage);
        }
      }
    }

    // Translate weather prediction
    if (translated.weatherPrediction) {
      const wp = translated.weatherPrediction;
      if (wp.summary) wp.summary = await this.translateText(wp.summary, targetLanguage);
      if (wp.alerts) {
        wp.alerts = await this.translateBatch(wp.alerts, targetLanguage);
      }
    }

    // Translate crop recommendations
    if (translated.cropRecommendations && Array.isArray(translated.cropRecommendations)) {
      translated.cropRecommendations = await this.translateCropRecommendations(translated.cropRecommendations, targetLanguage);
    }
    
    // Translate historical analysis
    if (translated.historicalAnalysis?.extremeEvents) {
      const events = translated.historicalAnalysis.extremeEvents;
      const translatedEvents = await Promise.all(events.map(async (event: any) => {
        const newEvent = { ...event };
        if (event.type) newEvent.type = await this.translateText(event.type, targetLanguage);
        if (event.severity) newEvent.severity = await this.translateText(event.severity, targetLanguage);
        if (event.impact) newEvent.impact = await this.translateText(event.impact, targetLanguage);
        return newEvent;
      }));
      translated.historicalAnalysis.extremeEvents = translatedEvents;
    }

    return translated;
  }

  // Universal deep translation method - translates EVERYTHING recursively
  async translateAnything(obj: any, targetLanguage: string, sourceLanguage: string = 'en', depth: number = 0): Promise<any> {
    // Prevent infinite recursion
    if (depth > 10 || !obj || targetLanguage === 'en') {
      return obj;
    }

    // Handle different data types
    if (typeof obj === 'string') {
      // Only translate if string contains meaningful text (not IDs, URLs, etc.)
      if (this.shouldTranslateString(obj)) {
        return await this.translateText(obj, targetLanguage, sourceLanguage);
      }
      return obj;
    }

    if (typeof obj === 'number' || typeof obj === 'boolean' || obj === null || obj === undefined) {
      return obj;
    }

    if (Array.isArray(obj)) {
      // Translate each item in array
      const translatedArray = [];
      for (const item of obj) {
        translatedArray.push(await this.translateAnything(item, targetLanguage, sourceLanguage, depth + 1));
      }
      return translatedArray;
    }

    if (typeof obj === 'object') {
      const translated: any = {};
      
      // Handle each property
      for (const [key, value] of Object.entries(obj)) {
        // Skip certain technical keys that shouldn't be translated
        if (this.shouldSkipKey(key)) {
          translated[key] = value;
        } else {
          translated[key] = await this.translateAnything(value, targetLanguage, sourceLanguage, depth + 1);
        }
      }
      
      return translated;
    }

    return obj;
  }

  // Helper to determine if a string should be translated
  private shouldTranslateString(str: string): boolean {
    // Don't translate if empty or very short
    if (!str || str.length < 2) return false;
    
    // Don't translate if it looks like an ID, UUID, or technical identifier
    if (/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(str)) return false;
    if (/^[a-z0-9_-]+$/i.test(str) && str.length < 4) return false;
    
    // Don't translate URLs
    if (str.startsWith('http://') || str.startsWith('https://')) return false;
    
    // Don't translate email addresses
    if (str.includes('@') && str.includes('.')) return false;
    
    // Don't translate file paths
    if (str.includes('/') && (str.includes('.') || str.startsWith('/'))) return false;
    
    // Don't translate JSON strings
    if ((str.startsWith('{') && str.endsWith('}')) || (str.startsWith('[') && str.endsWith(']'))) return false;
    
    // Don't translate pure numbers or dates in ISO format
    if (/^\d+$/.test(str) || /^\d{4}-\d{2}-\d{2}/.test(str)) return false;
    
    // Don't translate coordinates
    if (/^-?\d+\.\d+$/.test(str)) return false;
    
    // Don't translate single letters or very short technical terms
    if (str.length === 1 || (str.length <= 3 && /^[A-Z]+$/.test(str))) return false;
    
    return true;
  }

  // Helper to determine if a key should be skipped during translation
  private shouldSkipKey(key: string): boolean {
    const skipKeys = [
      'id', 'userId', 'landId', 'lat', 'lng', 'latitude', 'longitude',
      'timestamp', 'createdAt', 'updatedAt', 'date', 'time',
      'url', 'href', 'src', 'path', 'apiKey', 'token',
      'coordinates', 'coords', 'bounds', 'bbox',
      'uuid', 'guid', 'hash', 'checksum',
      'version', 'build', 'revision',
      'status', 'code', 'errno', 'pid',
      'length', 'size', 'count', 'total',
      'min', 'max', 'avg', 'mean', 'median',
      'temp', 'humidity', 'pressure', 'windSpeed', 'windDirection',
      'precipitation', 'uv', 'visibility'
    ];
    
    return skipKeys.includes(key.toLowerCase()) || 
           key.endsWith('Id') || 
           key.endsWith('_id') ||
           key.endsWith('At') ||
           key.startsWith('_') ||
           /^\d+$/.test(key);
  }
}

export const translationService = new TranslationService();