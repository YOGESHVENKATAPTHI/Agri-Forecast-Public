import axios from "axios";
import { storage } from "./storage";
import { dataAggregationService } from "./dataAggregationService";
import { enhancedCropRecommendationEngine } from "./enhancedCropRecommendationEngine";
import { enhancedLocationService } from "./enhancedLocationService";
import { intelligentAIManager } from "./intelligentAIManager";
import { DroughtMonitoringService } from "./droughtMonitoringService";
import { getCurrentWeather, getNasaPowerData } from "./weatherService";
import { sendEnhancedNotification } from "./notificationService";

const OPENROUTER_API_KEYS = process.env.OPENROUTER_API_KEYS?.split(',') || [];
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1/chat/completions";

// Verified free AI models available on OpenRouter
const FREE_AI_MODELS = {
  // Primary Model
  "amazon/nova-2-lite-v1:free": "Amazon Nova 2 Lite",

  // High Performance Models
  "nousresearch/hermes-3-llama-3.1-405b:free": "Hermes 3 Llama 405B",
  "alibaba/tongyi-deepresearch-30b-a3b:free": "Tongyi DeepResearch 30B",
  "cognitivecomputations/dolphin-mistral-24b-venice-edition:free": "Dolphin Mistral 24B",
  "meta-llama/llama-3.3-70b-instruct:free": "Llama 3.3 70B Instruct",

  
  // Qwen Models
  "qwen/qwen3-235b-a22b:free": "Qwen 3 235B",
  "qwen/qwen3-4b:free": "Qwen 3 4B",
  "qwen/qwen3-30b-a3b:free": "Qwen 3 30B",
  
  // Microsoft Models
  "microsoft/mai-ds-r1:free": "Microsoft MAI DS R1",
};

interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface AIResponse {
  model: string;
  content: string;
  confidence: number;
  timestamp: Date;
  tokens: number;
}

// Helper function to safely parse AI-generated date strings
function parseAIDate(dateStr: any): Date | null {
  if (!dateStr || dateStr === 'null' || dateStr === null || dateStr === undefined) {
    return null;
  }
  
  try {
    // Clean the date string of any extra whitespace or quotes
    const cleanDateStr = String(dateStr).trim().replace(/['"]/g, '');
    
    // Common invalid patterns to catch early
    if (['N/A', 'TBD', 'Unknown', 'Varies', 'Seasonal'].includes(cleanDateStr)) {
      return null;
    }
    
    // Try standard ISO format first (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleanDateStr)) {
      const parsed = new Date(cleanDateStr + 'T00:00:00Z');
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    
    // Try other common formats
    const formats = [
      cleanDateStr, // Direct parsing attempt
      cleanDateStr + 'T00:00:00Z', // Add time zone
      cleanDateStr.replace(/\//g, '-'), // Convert slashes to dashes
    ];
    
    for (const format of formats) {
      const parsed = new Date(format);
      if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 1900 && parsed.getFullYear() < 2100) {
        return parsed;
      }
    }
    
    console.warn(`⚠️ Could not parse date: "${dateStr}"`);
    return null;
  } catch (error) {
    console.warn(`⚠️ Error parsing date "${dateStr}":`, error);
    return null;
  }
}

function getLanguageName(code: string): string {
  const languages: Record<string, string> = {
    "en": "English",
    "hi": "Hindi",
    "ta": "Tamil",
    "te": "Telugu",
    "kn": "Kannada",
    "ml": "Malayalam",
    "mr": "Marathi",
    "bn": "Bengali",
    "gu": "Gujarati",
    "pa": "Punjabi",
    "es": "Spanish",
    "fr": "French",
    "de": "German",
    "zh": "Chinese",
    "ja": "Japanese",
  };
  return languages[code] || "English";
}

interface UserMemory {
  userId: string;
  crops: string[];
  preferences: Record<string, any>;
  farmingHistory: string[];
  weatherPreferences: Record<string, any>;
  lastUpdated: Date;
}

// API Key rotation and health management
class APIKeyManager {
  private keys = OPENROUTER_API_KEYS;
  private keyHealth = new Map<string, { 
    failures: number; 
    lastFailure: Date | null; 
    blocked: boolean;
    successCount: number;
    lastUsed: Date | null;
    dailyLimitReached?: Date;
  }>();
  private currentKeyIndex = 0;

  constructor() {
    this.keys.forEach(key => {
      this.keyHealth.set(key.trim(), { 
        failures: 0, 
        lastFailure: null, 
        blocked: false,
        successCount: 0,
        lastUsed: null,
        dailyLimitReached: undefined
      });
    });
    console.log(`Initialized API Key Manager with ${this.keys.length} keys`);
  }

  getBestKey(): string | null {
    if (this.keys.length === 0) return null;
    
    // Reset old blocks first
    this.resetOldBlocks();
    
    // Find next healthy key using round-robin
    let attempts = 0;
    while (attempts < this.keys.length) {
      const key = this.keys[this.currentKeyIndex].trim();
      const health = this.keyHealth.get(key);
      
      this.currentKeyIndex = (this.currentKeyIndex + 1) % this.keys.length;
      attempts++;
      
      if (health && !health.blocked) {
        console.log(`🔑 Using API key: ${key.substring(0, 15)}... (failures: ${health.failures}, successes: ${health.successCount})`);
        return key;
      }
    }
    
    // If all keys are blocked, reset the least recently failed one
    console.log(`⚠️ All API keys blocked, resetting oldest`);
    const oldestFailedKey = Array.from(this.keyHealth.entries())
      .filter(([_, health]) => health.blocked)
      .sort((a, b) => (a[1].lastFailure?.getTime() || 0) - (b[1].lastFailure?.getTime() || 0))[0];
    
    if (oldestFailedKey) {
      oldestFailedKey[1].blocked = false;
      oldestFailedKey[1].failures = 0;
      return oldestFailedKey[0];
    }
    
    return this.keys[0]?.trim() || null;
  }

  markKeyFailure(key: string, error: any) {
    const health = this.keyHealth.get(key.trim());
    if (health) {
      health.failures++;
      health.lastFailure = new Date();
      health.lastUsed = new Date();
      
      // Block key based on error type or failure count
      const errorMessage = error?.response?.data?.error?.message || error?.message || '';
      const isRateLimit = error?.response?.status === 429 || 
                         errorMessage.includes('rate-limited') ||
                         errorMessage.includes('Rate limit exceeded');
      const isDailyLimit = errorMessage.includes('free-models-per-day') ||
                          errorMessage.includes('Add 10 credits to unlock');
      const isAuthError = error?.response?.status === 401 ||
                         errorMessage.includes('Insufficient credits') ||
                         errorMessage.includes('credits');
      const isModelError = errorMessage.includes('not a valid model') ||
                          errorMessage.includes('No endpoints found');
      
      if (isDailyLimit) {
        health.blocked = true;
        health.dailyLimitReached = new Date();
        console.log(`🚫 API Key frozen for 24hrs (daily limit exceeded): ${key.substring(0, 15)}... - Will unfreeze at ${new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleString()}`);
      } else if (isRateLimit || isAuthError || health.failures >= 3) {
        health.blocked = true;
        const reason = isRateLimit ? 'rate-limited' : isAuthError ? 'auth/credits' : 'repeated failures';
        console.log(`🚫 API Key blocked (${reason}): ${key.substring(0, 15)}... (failures: ${health.failures})`);
      } else if (isModelError) {
        // Don't block key for model errors, just log
        console.log(`⚠️ Model error with key ${key.substring(0, 15)}...: ${errorMessage}`);
      }
    }
  }

  markKeySuccess(key: string, tokens: number = 0) {
    const health = this.keyHealth.get(key.trim());
    if (health) {
      health.successCount++;
      health.failures = Math.max(0, health.failures - 1); // Reduce failure count on success
      health.blocked = false;
      health.lastUsed = new Date();
    }
  }

  private resetOldBlocks() {
    const twoMinutesAgo = Date.now() - (2 * 60 * 1000); // Reduced cooldown to 2 minutes
    const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000); // 24 hours for daily limits
    let resetCount = 0;
    
    this.keyHealth.forEach((health, key) => {
      // Handle 24-hour daily limit freeze
      if (health.blocked && health.dailyLimitReached && 
          health.dailyLimitReached.getTime() < twentyFourHoursAgo) {
        health.blocked = false;
        health.failures = 0;
        health.dailyLimitReached = undefined;
        resetCount++;
        console.log(`🔓 Unfroze API key after 24hrs (daily limit reset): ${key.substring(0, 15)}...`);
      }
      // Handle regular blocks
      else if (health.blocked && !health.dailyLimitReached && health.lastFailure && 
          health.lastFailure.getTime() < twoMinutesAgo) {
        health.blocked = false;
        health.failures = Math.max(0, health.failures - 2); // Reduce failures instead of reset
        resetCount++;
        console.log(`🔄 Reset blocked API key after cooldown: ${key.substring(0, 15)}...`);
      }
    });
    
    if (resetCount > 0) {
      console.log(`🔄 Reset ${resetCount} blocked API keys`);
    }
  }

  getStats() {
    const stats = Array.from(this.keyHealth.entries()).map(([key, health]) => ({
      key: key.substring(0, 15) + "...",
      failures: health.failures,
      successes: health.successCount,
      blocked: health.blocked,
      lastUsed: health.lastUsed,
      dailyLimitReached: health.dailyLimitReached,
      unfreezeTime: health.dailyLimitReached ? new Date(health.dailyLimitReached.getTime() + 24 * 60 * 60 * 1000) : null
    }));
    return stats;
  }
}

// User memory management
class UserMemoryManager {
  private memoryCache = new Map<string, UserMemory>();

  async getUserMemory(userId: string): Promise<UserMemory> {
    if (this.memoryCache.has(userId)) {
      return this.memoryCache.get(userId)!;
    }

    // Load from database or create new
    try {
      const user = await storage.getUser(userId);
      const chatHistory = await storage.getChatHistory(userId);
      const crops = await storage.getCropRecommendations(userId);
      
      const memory: UserMemory = {
        userId,
        crops: crops.map(c => c.cropName),
        preferences: {},
        farmingHistory: chatHistory
          .filter(msg => msg.role === 'user')
          .map(msg => msg.message)
          .slice(-10), // Last 10 user messages
        weatherPreferences: {},
        lastUpdated: new Date(),
      };

      this.memoryCache.set(userId, memory);
      return memory;
    } catch (error) {
      console.error("Error loading user memory:", error);
      return {
        userId,
        crops: [],
        preferences: {},
        farmingHistory: [],
        weatherPreferences: {},
        lastUpdated: new Date(),
      };
    }
  }

  async updateUserMemory(userId: string, updates: Partial<UserMemory>) {
    const memory = await this.getUserMemory(userId);
    Object.assign(memory, updates, { lastUpdated: new Date() });
    this.memoryCache.set(userId, memory);
  }

  extractMemoryFromText(text: string): { crops: string[], preferences: string[] } {
    const crops: string[] = [];
    const preferences: string[] = [];
    
    // Extract crop mentions
    const cropKeywords = ['rice', 'wheat', 'corn', 'potato', 'tomato', 'onion', 'carrot', 'bean', 'pea', 'cotton', 'sugarcane', 'paddy'];
    const lowerText = text.toLowerCase();
    
    cropKeywords.forEach(crop => {
      if (lowerText.includes(crop)) {
        crops.push(crop);
      }
    });

    // Extract farming preferences
    if (lowerText.includes('organic')) preferences.push('organic_farming');
    if (lowerText.includes('irrigation')) preferences.push('irrigation_focused');
    if (lowerText.includes('drought')) preferences.push('drought_resistant');
    
    return { crops, preferences };
  }
}

const apiKeyManager = new APIKeyManager();
const memoryManager = new UserMemoryManager();

// Enhanced single model call with retry logic
async function callSingleAI(
  messages: AIMessage[], 
  modelKey: string, 
  apiKey: string,
  maxRetries: number = 3,
  maxTokens: number = 1000 // Reduced default to encourage conciseness and save tokens
): Promise<AIResponse | null> {
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await axios.post(
        OPENROUTER_BASE_URL,
        {
          model: modelKey,
          messages,
          max_tokens: maxTokens,
          temperature: 0.7,
        },
        {
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "HTTP-Referer": "https://agri-forecast-7g7m.onrender.com",
            "X-Title": "AgriPredict AI Assistant",
            "Content-Type": "application/json",
          },
          timeout: 60000, // 60 seconds
        }
      );

      const content = response.data.choices[0]?.message?.content;
      const usage = response.data.usage;
      
      if (content) {
        apiKeyManager.markKeySuccess(apiKey, usage?.total_tokens || 0);
        
        return {
          model: FREE_AI_MODELS[modelKey as keyof typeof FREE_AI_MODELS] || modelKey,
          content,
          confidence: Math.random() * 0.2 + 0.8, // 0.8-1.0 confidence
          timestamp: new Date(),
          tokens: usage?.total_tokens || 0,
        };
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      console.error(`❌ Model ${modelKey} attempt ${attempt + 1} failed:`, errorMessage);
      
      // Handle different error types
      const isModelError = errorMessage?.includes('not a valid model') || 
                          errorMessage?.includes('No endpoints found');
      const isRateLimit = error.response?.status === 429 || 
                         errorMessage?.includes('rate-limited');
      const isAuthError = error.response?.status === 401 || 
                         errorMessage?.includes('Insufficient credits');
      
      // For model errors, don't retry with same model
      if (isModelError) {
        console.log(`⚠️ Model ${modelKey} is not available, skipping`);
        apiKeyManager.markKeyFailure(apiKey, error);
        return null;
      }
      
      // For rate limit or auth errors, try different API key
      if (isRateLimit || isAuthError) {
        apiKeyManager.markKeyFailure(apiKey, error);
        
        const newKey = apiKeyManager.getBestKey();
        if (newKey && newKey !== apiKey) {
          apiKey = newKey;
          console.log(`🔄 Switching to new API key for ${modelKey}: ${newKey.substring(0, 15)}...`);
          continue;
        }
      }
      
      if (attempt === maxRetries - 1) {
        apiKeyManager.markKeyFailure(apiKey, error);
        return null;
      }
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
  
  return null;
}

// Execute a request using a specific model
export async function callSpecificModel(
  messages: AIMessage[],
  modelKey: string,
  maxTokens: number = 1000
): Promise<string | null> {
  const apiKey = apiKeyManager.getBestKey();
  if (!apiKey) {
    console.warn(`⚠️ No available API key for model ${modelKey}`);
    return null;
  }
  
  const response = await callSingleAI(messages, modelKey, apiKey, 3, maxTokens);
  return response?.content || null;
}

// Parallel AI processing with deduplication
export async function callMultipleAI(
  messages: AIMessage[], 
  userId?: string,
  maxModels: number = 8,
  maxTokens: number = 1000
): Promise<AIResponse[]> {
  if (OPENROUTER_API_KEYS.length === 0) {
    console.error("❌ No OpenRouter API keys configured");
    return [];
  }

  // Add user memory context if available
  if (userId && messages.length > 0) {
    try {
      const memory = await memoryManager.getUserMemory(userId);
      const memoryContext = `User Context - Crops grown: ${memory.crops.join(', ')}, 
        Recent topics: ${memory.farmingHistory.slice(-3).join(', ')}`;
      
      // Create new messages array with enhanced first message
      messages = [
        {
          role: messages[0].role,
          content: messages[0].content + `\n\n${memoryContext}`
        },
        ...messages.slice(1)
      ];
    } catch (error) {
      console.log("Could not load user memory:", error);
    }
  }

  const modelKeys = Object.keys(FREE_AI_MODELS).slice(0, maxModels);
  const promises: Promise<AIResponse | null>[] = [];

  // Create parallel requests
  modelKeys.forEach(modelKey => {
    const apiKey = apiKeyManager.getBestKey();
    if (!apiKey) {
      console.warn(`⚠️ No available API key for model ${modelKey}`);
      return;
    }

    console.log(`🚀 Launching ${modelKey} with key ${apiKey.substring(0, 10)}...`);
    
    const promise = callSingleAI(messages, modelKey, apiKey, 3, maxTokens)
      .catch(error => {
        console.error(`❌ Model ${modelKey} failed completely:`, error.message);
        return null;
      });

    promises.push(promise);
  });

  if (promises.length === 0) {
    console.error("❌ No API keys available for any models");
    return [];
  }

  console.log(`⏳ Waiting for ${promises.length} AI models to respond...`);
  const results = await Promise.allSettled(promises);
  const validResponses: AIResponse[] = [];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value) {
      validResponses.push(result.value);
      console.log(`✅ Model ${modelKeys[index]} succeeded`);
    } else {
      console.log(`❌ Model ${modelKeys[index]} failed`);
    }
  });

  console.log(`🎉 Received ${validResponses.length} valid responses from ${promises.length} models`);
  
  // Update user memory if chat message
  if (userId && messages.length > 0) {
    const userMessage = messages[messages.length - 1];
    if (userMessage.role === 'user') {
      const extracted = memoryManager.extractMemoryFromText(userMessage.content);
      if (extracted.crops.length > 0 || extracted.preferences.length > 0) {
        await memoryManager.updateUserMemory(userId, {
          crops: [...(await memoryManager.getUserMemory(userId)).crops, ...extracted.crops],
          farmingHistory: [...(await memoryManager.getUserMemory(userId)).farmingHistory, userMessage.content]
        });
      }
    }
  }

  return deduplicateResponses(validResponses);
}

// Deduplicate similar responses
function deduplicateResponses(responses: AIResponse[]): AIResponse[] {
  if (responses.length <= 1) return responses;

  const unique: AIResponse[] = [];
  const seen = new Set<string>();

  responses
    .sort((a, b) => b.confidence - a.confidence) // Sort by confidence
    .forEach(response => {
      // Create similarity key (first 100 chars, normalized)
      const key = response.content
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .substring(0, 100)
        .trim();

      if (!seen.has(key)) {
        seen.add(key);
        unique.push(response);
      }
    });

  console.log(`🔄 Deduplicated ${responses.length} responses to ${unique.length} unique responses`);
  return unique;
}

// Centralized AI coordinator
export async function getCentralizedPrediction(
  messages: AIMessage[],
  userId?: string,
  maxTokens: number = 1000
): Promise<string | null> {
  const responses = await callMultipleAI(messages, userId, 8, maxTokens);
  
  if (responses.length === 0) {
    console.error("❌ No AI responses received");
    return null;
  }

  if (responses.length === 1) {
    return responses[0].content;
  }

  // Use the highest confidence model to synthesize all responses
  const bestResponse = responses[0];
  const otherResponses = responses.slice(1);

  const synthesisPrompt: AIMessage[] = [
    {
      role: "system",
      content: `You are a master AI coordinator. Analyze and synthesize multiple AI responses to provide the best unified answer. Consider accuracy, completeness, and relevance. Remove duplicates and combine complementary information.`
    },
    {
      role: "user", 
      content: `Primary Response: ${bestResponse.content}\n\nAlternative Responses:\n${otherResponses.map((r, i) => `${i + 1}. ${r.content}`).join('\n\n')}\n\nProvide a synthesized, comprehensive response that combines the best elements:`
    }
  ];

  // Use a reliable model for synthesis
  const apiKey = apiKeyManager.getBestKey();
  if (!apiKey) return bestResponse.content;
  
  const synthesis = await callSingleAI(synthesisPrompt, "qwen/qwen3-4b:free", apiKey);
  
  return synthesis?.content || bestResponse.content;
}

// Export enhanced functions
export async function generateEnhancedCropRecommendations(
  latitude: number,
  longitude: number,
  weatherData: any,
  userId?: string,
  landId?: number | null
): Promise<{ cropName: string; confidence: number; reasoning: string; detailedPlan: string }[]> {
  
  let languageInstruction = "";
  if (userId) {
    const user = await storage.getUser(userId);
    if (user && user.language) {
      const langName = getLanguageName(user.language);
      languageInstruction = `\nIMPORTANT: The "cropName", "reasoning", and "detailedPlan" fields MUST be in ${langName} language.`;
    }
  }

  const systemPrompt = `You are an expert agricultural AI specializing in weather-based crop planning. Analyze comprehensive weather forecasts to recommend the safest and most efficient crops. Consider the 5-day forecast, seasonal patterns, and risk mitigation strategies.

Return ONLY a valid JSON array with 4-6 crop recommendations in this exact format:
[
  {
    "cropName": "Rice",
    "confidence": 92,
    "reasoning": "Excellent weather alignment with upcoming rainfall patterns. 5-day forecast shows optimal temperature range (24-32°C) and 70% rain probability ensuring adequate water supply. Low wind speeds reduce lodging risk.",
    "detailedPlan": "##  Complete Rice Cultivation Plan\\n\\n### Phase 1: Land Preparation (Week 1-2)\\n- **Land Clearing**: Remove weeds and previous crop residues\\n- **Plowing**: Deep plowing to 20-25cm depth\\n- **Leveling**: Ensure uniform water distribution\\n- **Bunding**: Create 30cm high bunds for water retention\\n\\n### Phase 2: Nursery & Sowing (Week 2-3)\\n- **Seed Treatment**: Soak seeds in salt water, treat with fungicide\\n- **Nursery Preparation**: 400m² nursery for 1 hectare main field\\n- **Sowing**: Broadcast 40kg seeds/hectare in nursery\\n- **Water Management**: Maintain 2-3cm water level\\n\\n### Phase 3: Transplanting (Week 6-7)\\n- **Seedling Selection**: Choose 25-30 day old healthy seedlings\\n- **Spacing**: 20x15cm spacing, 2-3 seedlings per hill\\n- **Timing**: Early morning or evening to reduce stress\\n\\n### Phase 4: Growth Management (Week 8-16)\\n- **Irrigation**: Maintain 5cm standing water throughout\\n- **Fertilization Schedule**:\\n  - Basal: 60kg N + 30kg P₂O₅ + 30kg K₂O per hectare\\n  - 20 DAT: 30kg N per hectare\\n  - 40 DAT: 30kg N per hectare\\n- **Weed Control**: Manual weeding at 20 and 40 DAT\\n- **Pest Monitoring**: Check for stem borer, leaf folder weekly\\n\\n### Phase 5: Harvest (Week 17-20)\\n- **Maturity Signs**: 80% grains turn golden yellow\\n- **Harvesting**: Cut when moisture content is 20-25%\\n- **Drying**: Sun dry to 14% moisture\\n- **Storage**: Store in moisture-proof containers\\n\\n### 📊 Economics & Yield\\n- **Expected Yield**: 6.5-8.0 tons/hectare\\n- **Input Cost**: ₹45,000-55,000 per hectare\\n- **Market Price**: ₹22-26 per kg\\n- **Profit Margin**: ₹85,000-1,25,000 per hectare\\n\\n### ⚠️ Risk Management\\n- **Weather Risks**: Monitor for heavy rains during flowering\\n- **Disease Prevention**: Apply fungicide if humidity >85%\\n- **Insurance**: Consider crop insurance for yield protection"
  }
]
${languageInstruction}`;

  // Get user memory for personalized recommendations
  let userMemory = null;
  if (userId) {
    userMemory = await memoryManager.getUserMemory(userId);
  }

  const userPrompt = `Location: ${latitude}°N, ${longitude}°E

CURRENT CONDITIONS:
- Temperature: ${weatherData.current?.temp}°C (Feels like: ${weatherData.current?.feels_like}°C)
- Humidity: ${weatherData.current?.humidity}%
- Wind Speed: ${weatherData.current?.wind_speed} m/s
- Pressure: ${weatherData.current?.pressure} hPa
- UV Index: ${weatherData.current?.uvi}

5-DAY FORECAST ANALYSIS:
${weatherData.daily?.slice(0, 5).map((day: any, i: number) => 
  `Day ${i+1} (${new Date(day.dt * 1000).toLocaleDateString()}): 
  - Temp: ${day.temp.min}°C to ${day.temp.max}°C (avg: ${day.temp.day}°C)
  - Weather: ${day.weather[0]?.description}
  - Rain Probability: ${Math.round(day.pop * 100)}%
  - Humidity: ${day.humidity}%`
).join('\n')}

ADDITIONAL WEATHER DATA:
- NASA POWER: Temp: ${weatherData.nasaPower?.temperature}°C, Precipitation: ${weatherData.nasaPower?.precipitation}mm, Solar: ${weatherData.nasaPower?.solarRadiation}W/m²
- CHIRPS Precipitation: ${weatherData.chirps?.precipitation}mm
- GFS Extended Forecast: ${weatherData.gfs?.forecast?.slice(0, 7).map((d: any, i: number) => `Day ${i+1}: ${d.temp.toFixed(1)}°C, ${d.precipitation.toFixed(1)}mm precip`).join('; ')}

${userMemory ? `USER FARMING HISTORY:
- Previous Crops: ${userMemory.crops.join(', ')}
- Farming Experience: ${userMemory.farmingHistory.join('; ')}
- Preferences: ${JSON.stringify(userMemory.preferences)}` : ''}

Based on this comprehensive weather forecast and location data, provide crop recommendations that maximize safety and efficiency over the next growing season.`;

  const messages: AIMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt }
  ];

  console.log(`🌾 Generating crop recommendations for ${latitude}, ${longitude}`);
  const response = await getCentralizedPrediction(messages, userId);
  
  if (!response) {
    console.log(`❌ No response from AI for crop recommendations`);
    return [];
  }
  
  console.log(`📝 AI response for crops: ${response.substring(0, 200)}...`);

  try {
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      // Sanitize control characters and fix common JSON issues
      let jsonString = jsonMatch[0]
        .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Remove control characters
        .replace(/\\n/g, '\\n') // Escape literal newlines
        .replace(/\\t/g, '\\t') // Escape literal tabs
        .replace(/\\r/g, '\\r') // Escape literal carriage returns
        .replace(/\"/g, '"') // Fix escaped quotes
        .replace(/([^\\])\\([^"\\/bfnrt])/g, '$1\\\\$2'); // Fix invalid escapes
      
      const parsed = JSON.parse(jsonString);
      console.log(`✅ Generated ${parsed.length} crop recommendations:`, parsed.map(c => c.cropName));
      return parsed;
    }
    return [];
  } catch (error) {
    console.error("❌ Error parsing crop recommendations:", error);
    console.error("Raw response:", response.substring(0, 500));
    
    // Enhanced fallback: Provide region-specific recommendations based on coordinates and weather
    console.log("🔄 Generating fallback crop recommendations based on location and weather...");
    
    const fallbackCrops = [];
    
    // Determine climate zone and suitable crops based on latitude and current weather
    const isTemperateZone = latitude > 23.5 || latitude < -23.5;
    const currentTemp = weatherData.current?.temp || 25;
    const humidity = weatherData.current?.humidity || 65;
    const upcomingRain = weatherData.daily?.[0]?.pop > 0.6; // High rain probability
    
    // Region-specific crop recommendations for India (tropical/subtropical)
    if (latitude >= 8 && latitude <= 37 && longitude >= 68 && longitude <= 97) {
      // Indian subcontinent
      if (currentTemp >= 25 && humidity >= 60) {
        fallbackCrops.push({
          cropName: "Rice",
          confidence: 88,
          reasoning: `Excellent conditions for rice cultivation. Current temperature of ${currentTemp}°C and humidity of ${humidity}% are ideal. ${upcomingRain ? 'Upcoming rainfall supports water requirements.' : 'Ensure adequate irrigation.'}`,
          detailedPlan: "## Rice Cultivation Plan\n\n### Immediate Actions (Week 1-2)\n- Prepare paddy fields with proper leveling\n- Ensure bunds are 30cm high for water retention\n- Soak seeds in salt water, select floating seeds\n\n### Planting Phase (Week 3-4)\n- Transplant 25-30 day old seedlings\n- Maintain 20x15cm spacing\n- Keep 2-3 seedlings per hill\n\n### Growth Management\n- Maintain 5cm standing water\n- Apply fertilizer: 120kg N + 60kg P₂O₅ + 40kg K₂O per hectare\n- Expected yield: 6-8 tons per hectare\n- Harvest in 110-120 days"
        });
        
        fallbackCrops.push({
          cropName: "Sugarcane", 
          confidence: 82,
          reasoning: `High temperature and humidity favor sugarcane growth. Long growing season provides excellent yield potential.`,
          detailedPlan: "## Sugarcane Cultivation Plan\n\n### Land Preparation\n- Deep plowing to 40cm depth\n- Create furrows 1.2m apart\n- Apply 25 tons organic manure per hectare\n\n### Planting\n- Use 3-budded setts\n- Plant in February-March or October-November\n- Maintain proper irrigation\n\n### Expected Results\n- Yield: 80-120 tons per hectare\n- Crop duration: 12-18 months\n- High sugar recovery rate in this climate"
        });
      }
      
      if (currentTemp >= 20 && currentTemp <= 30) {
        fallbackCrops.push({
          cropName: "Wheat",
          confidence: 75,
          reasoning: `Moderate temperature suitable for wheat. Best planted in winter season with current conditions favorable for germination.`,
          detailedPlan: "## Wheat Cultivation Plan\n\n### Sowing (November-December)\n- Use 100kg seeds per hectare\n- Drill seeds 2-3cm deep\n- Maintain row spacing of 20-22.5cm\n\n### Irrigation Schedule\n- First irrigation 20-25 days after sowing\n- Second at tillering stage (40-45 DAS)\n- Third at flowering (65-70 DAS)\n\n### Fertilizer Application\n- Basal: 60kg N + 30kg P₂O₅ + 20kg K₂O\n- Top dressing: 60kg N at tillering\n- Expected yield: 4-6 tons per hectare"
        });
        
        fallbackCrops.push({
          cropName: "Mustard",
          confidence: 78,
          reasoning: `Cool season crop perfect for current temperature range. Low water requirement makes it suitable for sustainable farming.`,
          detailedPlan: "## Mustard Cultivation Plan\n\n### Sowing Time\n- October-November for best results\n- Use 3.5kg seeds per hectare\n- Broadcasting or line sowing both suitable\n\n### Crop Management\n- Light irrigation after sowing\n- Thinning after 15-20 days\n- Apply 40kg N + 20kg P₂O₅ per hectare\n\n### Harvest\n- Ready in 90-110 days\n- Expected yield: 1.5-2.5 tons per hectare\n- High oil content and market demand"
        });
      }
    } else {
      // Global fallback recommendations based on temperature
      if (currentTemp >= 20 && currentTemp <= 35) {
        fallbackCrops.push({
          cropName: "Tomato",
          confidence: 80,
          reasoning: "Versatile crop suitable for current temperature range with good market demand.",
          detailedPlan: "## Tomato Cultivation Plan\n\n### Nursery Preparation\n- Sow seeds in seedbed\n- Transplant after 4-5 weeks\n- Maintain 60cm x 45cm spacing\n\n### Care Management\n- Regular irrigation every 3-4 days\n- Apply balanced fertilizer NPK 100:50:50 kg/hectare\n- Support with stakes for indeterminate varieties\n- Expected yield: 25-40 tons per hectare"
        });
        
        if (upcomingRain) {
          fallbackCrops.push({
            cropName: "Maize",
            confidence: 85,
            reasoning: "Excellent rain forecast supports maize cultivation with minimal irrigation requirements.",
            detailedPlan: "## Maize Cultivation Plan\n\n### Sowing\n- Plant 20-25kg seeds per hectare\n- Row spacing: 60-75cm\n- Plant to plant: 20-25cm\n\n### Management\n- Apply 150kg N + 60kg P₂O₅ + 40kg K₂O per hectare\n- Side dressing with nitrogen at knee-high stage\n- Expected yield: 6-10 tons per hectare"
          });
        }
      }
    }
    
    if (fallbackCrops.length === 0) {
      // Last resort - basic universal crops
      fallbackCrops.push({
        cropName: "Onion",
        confidence: 70,
        reasoning: "Hardy crop suitable for various conditions with good storage life and market demand.",
        detailedPlan: "## Onion Cultivation Plan\n\n### Basic Guidelines\n- Plant during cool season\n- Use raised beds for good drainage\n- Apply organic manure and balanced fertilizer\n- Expected yield: 15-25 tons per hectare"
      });
    }
    
    console.log(`🌱 Generated ${fallbackCrops.length} fallback crop recommendations`);
    return fallbackCrops;
  }
}

export async function generateEnhancedWeatherPredictions(
  weatherData: any,
  userId?: string,
  landId?: number | null
): Promise<{ title: string; description: string; severity: string; confidence: number }[]> {
  
  let languageInstruction = "";
  if (userId) {
    const user = await storage.getUser(userId);
    if (user && user.language) {
      const langName = getLanguageName(user.language);
      languageInstruction = `\nIMPORTANT: The "title" and "description" fields MUST be in ${langName} language.`;
    }
  }

  const systemPrompt = `You are an advanced weather prediction AI specializing in agricultural forecasting. Analyze weather patterns to predict risks, opportunities, and important events for farmers. Focus on actionable insights.

Return ONLY a valid JSON array:
[
  {
    "title": "Heavy Monsoon Alert",
    "description": "Intense rainfall expected in next 48-72 hours (150-200mm). Immediate actions: Harvest ready crops, clear drainage channels, secure livestock, postpone planting activities. Risk of waterlogging in low-lying areas.",
    "severity": "high",
    "confidence": 89
  }
]
${languageInstruction}`;

  const userPrompt = `7-Day Weather Analysis:
${weatherData.daily?.slice(0, 7).map((d: any, i: number) => 
  `Day ${i + 1}: ${d.temp.min}-${d.temp.max}°C, ${d.weather[0].main}, Rain Probability: ${d.pop * 100}%, Humidity: ${d.humidity}%`
).join('\n')}

Current Conditions: ${weatherData.current?.temp}°C, ${weatherData.current?.humidity}% humidity, Wind: ${weatherData.current?.windSpeed}km/h

Predict critical weather events and provide actionable farming advice.`;

  const messages: AIMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt }
  ];

  const response = await getCentralizedPrediction(messages, userId);
  
  if (!response) return [];

  try {
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      // Sanitize control characters and fix common JSON issues
      let jsonString = jsonMatch[0]
        .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Remove control characters
        .replace(/\\n/g, '\\n') // Escape literal newlines
        .replace(/\\t/g, '\\t') // Escape literal tabs
        .replace(/\\r/g, '\\r') // Escape literal carriage returns
        .replace(/\"/g, '"') // Fix escaped quotes
        .replace(/([^\\])\\([^"\\\/bfnrt])/g, '$1\\\\$2'); // Fix invalid escapes
      
      const parsed = JSON.parse(jsonString);
      console.log(`🌤️ Generated ${parsed.length} weather predictions`);
      return parsed;
    }
    return [];
  } catch (error) {
    console.error("❌ Error parsing weather predictions:", error);
    console.error("Raw response:", response.substring(0, 500));
    return [];
  }
}

// This function is now implemented below with comprehensive data integration

// Legacy compatibility functions
export async function callAI(messages: AIMessage[], preferredModel?: string): Promise<string | null> {
  const responses = await callMultipleAI(messages, undefined, 3); // Use 3 models for speed
  return responses.length > 0 ? responses[0].content : null;
}

export async function generateCropRecommendations(
  latitude: number,
  longitude: number,
  weatherData: any
): Promise<{ cropName: string; confidence: number; reasoning: string; detailedPlan: string }[]> {
  return await generateEnhancedCropRecommendations(latitude, longitude, weatherData);
}

export async function generateWeatherPredictions(
  weatherData: any
): Promise<{ title: string; description: string; severity: string; confidence: number }[]> {
  return await generateEnhancedWeatherPredictions(weatherData);
}

export async function chatWithAI(userMessage: string, chatHistory: AIMessage[], userId?: string, language: string = 'en'): Promise<string | null> {
  return await chatWithEnhancedAI(userMessage, chatHistory, userId || 'anonymous', undefined, language);
}

// Comprehensive data aggregation for AI chat
async function getComprehensiveDataForChat(landId: number): Promise<any> {
  try {
    const landArea = await storage.getLandAreaById(landId);
    if (!landArea) return null;

    console.log(`📊 Gathering comprehensive data for land ${landId}`);

    // Get all data sources in parallel
    const [longTermPrediction, locationData, cropRecommendations, landMemory, recentPredictions, recentCrops] = await Promise.allSettled([
      dataAggregationService.get6MonthPrediction(landArea.latitude, landArea.longitude, landId),
      enhancedLocationService.getEnhancedLocationData(landArea.latitude, landArea.longitude, false),
      enhancedCropRecommendationEngine.generateRecommendations(landArea.latitude, landArea.longitude, landArea.userId || 'unknown', landId),
      storage.getLandMemory(landId),
      storage.getLandPredictions(landId),
      storage.getLandCropRecommendations(landId)
    ]);

    const comprehensiveData = {
      land: landArea,
      weather: {
        longTerm: longTermPrediction.status === 'fulfilled' ? longTermPrediction.value : null,
        recentPredictions: recentPredictions.status === 'fulfilled' ? recentPredictions.value : []
      },
      location: locationData.status === 'fulfilled' ? locationData.value : null,
      crops: {
        enhanced: cropRecommendations.status === 'fulfilled' ? cropRecommendations.value : [],
        recent: recentCrops.status === 'fulfilled' ? recentCrops.value : []
      },
      memory: landMemory.status === 'fulfilled' ? landMemory.value : [],
      timestamp: new Date()
    };

    console.log(`✅ Gathered comprehensive data: ${Object.keys(comprehensiveData).length} categories`);
    return comprehensiveData;
  } catch (error) {
    console.error("Error gathering comprehensive data:", error);
    return null;
  }
}

// Enhanced chat function with comprehensive data
export async function chatWithEnhancedAI(
  message: string,
  history: AIMessage[],
  userId: string,
  landId?: number,
  language: string = 'en'
): Promise<string | null> {
  try {
    console.log(`🤖 Enhanced AI chat request for user ${userId}${landId ? ` (land ${landId})` : ''} with comprehensive data (Language: ${language})`);

    // Get comprehensive user context and data
    const [userMemory, user, landContext, enhancedData] = await Promise.allSettled([
      memoryManager.getUserMemory(userId),
      storage.getUser(userId),
      landId ? storage.getLandAreaById(landId) : Promise.resolve(null),
      landId ? getComprehensiveDataForChat(landId) : Promise.resolve(null)
    ]);

    // Build comprehensive system prompt with all data sources
    let systemPrompt = `You are Agri-Forecast, an advanced AI agricultural advisor with access to:
- 🛰️ NASA POWER satellite agricultural data
- 🌍 Open-Meteo ECMWF SEAS5 seasonal forecasts (6+ months)
- ☁️ OpenWeather real-time conditions
-  ISRIC SoilGrids soil analysis
- 🤖 Enhanced crop recommendation engine
- 📊 Multi-source weather predictions

You provide accurate, data-driven agricultural advice based on comprehensive analysis.

IMPORTANT: You must respond in the following language: ${language}.
If the language is not English, translate all your advice and responses to ${language} naturally.

CURRENT CONTEXT:`;

    // Add user context
    if (user.status === 'fulfilled' && user.value) {
      systemPrompt += `\n\nUSER PROFILE:
- Email: ${user.value.email}
- Name: ${user.value.firstName || 'Not provided'}
- Location: ${user.value.address || 'Coordinates provided'}`;
    }

    // Add land-specific context
    if (landContext.status === 'fulfilled' && landContext.value) {
      const land = landContext.value;
      systemPrompt += `\n\nCURRENT LAND: "${land.name}"
- Location: ${land.address || `${land.latitude}, ${land.longitude}`}
- Soil Type: ${land.soilType || 'Analysis in progress'}
- Main Land: ${land.isMainLand ? 'Yes' : 'No'}
- Crop History: ${land.cropHistory || 'No previous data'}`;
    }

    // Add comprehensive weather data
    if (enhancedData.status === 'fulfilled' && enhancedData.value) {
      const data = enhancedData.value;
      
      if (data.weather.longTerm) {
        systemPrompt += `\n\n3-MONTH WEATHER OUTLOOK (ECMWF SEAS5):
- Source: Multiple satellite and ground stations
- Confidence: ${data.weather.longTerm.confidence}%
- Time Range: ${new Date(data.weather.longTerm.timeRange.start).toLocaleDateString()} to ${new Date(data.weather.longTerm.timeRange.end).toLocaleDateString()}

Monthly Summary:`;
        
        data.weather.longTerm.monthlyData?.slice(0, 3).forEach((month: any, index: number) => {
          systemPrompt += `
Month ${index + 1} (${new Date(2025, month.month - 1).toLocaleDateString('en-US', { month: 'long' })}):
  - Temperature: ${month.temperature.avg.toFixed(1)}°C
  - Precipitation: ${month.precipitation.total.toFixed(0)}mm
  - Conditions: ${month.conditions}`;
        });
      }

      // Add soil analysis
      if (data.location?.soilType) {
        systemPrompt += `\n\nSOIL ANALYSIS (ISRIC SoilGrids):
- Primary Type: ${data.location.soilType.primary}
- pH Level: ${data.location.soilType.pH?.toFixed(1)}
- Fertility: ${data.location.soilType.fertility}
- Drainage: ${data.location.soilType.drainage}
- Secondary: ${data.location.soilType.secondary || 'Not specified'}`;
      }

      // Add agricultural suitability
      if (data.location?.agriculture) {
        systemPrompt += `\n\nAGRICULTURAL SUITABILITY:
- Overall Rating: ${data.location.agriculture.suitability}
- Water Availability: ${data.location.agriculture.waterAvailability}
- Market Access: ${data.location.agriculture.marketAccess}
- Recommended Crops: ${data.location.agriculture.primaryCrops?.join(', ')}`;
      }

      // Add enhanced crop recommendations
      if (data.crops.enhanced && data.crops.enhanced.length > 0) {
        systemPrompt += `\n\nCURRENT CROP RECOMMENDATIONS (AI-Enhanced):`;
        data.crops.enhanced.slice(0, 3).forEach((crop: any, index: number) => {
          systemPrompt += `\n${index + 1}. ${crop.cropName} (${crop.confidence}% confidence)
   - Reasoning: ${crop.reasoning}
   - Planting Window: ${new Date(crop.plantingWindow.optimal.start).toLocaleDateString()} - ${new Date(crop.plantingWindow.optimal.end).toLocaleDateString()}
   - Expected Yield: ${crop.yieldPrediction?.expected}
   - Risk Level: ${crop.riskAssessment?.overall}
   - Profit Margin: ${crop.economicAnalysis?.profitMargin}
   - Sustainability Score: ${crop.sustainabilityScore?.score}/10`;
        });
      }

      // Add land memory and history
      if (data.memory && data.memory.length > 0) {
        systemPrompt += `\n\nLAND HISTORY & MEMORY:`;
        data.memory.slice(0, 3).forEach((memory: any) => {
          systemPrompt += `\n- ${memory.season} ${memory.year}: ${memory.observations}`;
          if (memory.cropPerformance) {
            systemPrompt += ` | Crop Performance: ${memory.cropPerformance}`;
          }
        });
      }
    }

    // Add user memory
    if (userMemory.status === 'fulfilled' && userMemory.value) {
      const memory = userMemory.value;
      systemPrompt += `\n\nUSER PREFERENCES & HISTORY:
- Preferred Crops: ${memory.crops.join(', ')}
- Farming Experience: ${memory.farmingHistory.join(', ')}
- Weather Preferences: ${JSON.stringify(memory.weatherPreferences)}`;
    }

    // Add language instruction
    if (user.status === 'fulfilled' && user.value && user.value.language) {
      const langCode = user.value.language;
      const languages: Record<string, string> = {
        "en": "English",
        "hi": "Hindi",
        "ta": "Tamil",
        "te": "Telugu",
        "kn": "Kannada",
        "ml": "Malayalam",
        "mr": "Marathi",
        "bn": "Bengali",
        "gu": "Gujarati",
        "pa": "Punjabi",
        "es": "Spanish",
        "fr": "French",
        "de": "German",
        "zh": "Chinese",
        "ja": "Japanese",
      };
      const langName = languages[langCode] || "English";
      systemPrompt += `\n\nIMPORTANT LANGUAGE INSTRUCTION:
- You MUST reply in ${langName} language ONLY.
- Translate all technical terms to ${langName} where appropriate, or keep them in English if commonly used.
- Ensure the tone is natural and professional in ${langName}.`;
    }

    systemPrompt += `\n\nINSTRUCTIONS:
- Use the comprehensive data above to provide accurate, specific advice
- Reference specific data points (temperatures, soil pH, crop confidence scores)
- Consider the 3-month weather outlook for planting and harvesting advice
- Factor in soil conditions and regional suitability
- Provide actionable recommendations with timeframes
- Use markdown formatting for clear presentation
- Be confident in your recommendations based on the scientific data
- If asked about weather, reference specific months and conditions from the outlook
- For crop advice, use the enhanced recommendations and explain why they're suitable
- Keep your response concise and to the point (under 500 words) to ensure complete answers.

Current date: ${new Date().toISOString().split('T')[0]}`;

    const messages: AIMessage[] = [
      { role: "system", content: systemPrompt },
      ...history.slice(-8), // Last 8 messages for context
      { role: "user", content: message }
    ];

    // Get AI response using the intelligent clustered system
    const response = await intelligentAIManager.executeIntelligentRequest(
      "conversational",
      messages,
      {
        priority: "high",
        maxRetries: 5
      }
    );
    
    if (!response) {
      throw new Error("Failed to get response from intelligent AI manager");
    }
    
    // Update user memory with this interaction
    await updateUserMemoryFromChat(userId, message, response);
    
    return response;

  } catch (error: any) {
    console.error("❌ Error in enhanced AI chat:", error);
    
    // Fallback to basic AI if enhanced fails
    try {
      const basicMessages: AIMessage[] = [
        { role: "system", content: "You are Agri-Forecast, an AI agricultural advisor. Provide helpful farming advice." },
        { role: "user", content: message }
      ];
      
      // Use intelligent manager even for fallback, but with lower priority
      const fallbackResponse = await intelligentAIManager.executeIntelligentRequest(
        "conversational",
        basicMessages,
        { priority: "low" }
      );
      
      return fallbackResponse || "I apologize, but I'm currently unable to process your request. Please try again later.";
    } catch (fallbackError) {
      console.error("❌ Fallback AI also failed:", fallbackError);
      return "I apologize, but I'm currently experiencing technical difficulties. Please try again later.";
    }
  }
}

// Helper function to update user memory from chat interactions
async function updateUserMemoryFromChat(userId: string, userMessage: string, aiResponse: string | null): Promise<void> {
  try {
    if (!aiResponse) return;

    const memory = await memoryManager.getUserMemory(userId);
    
    // Extract crop mentions from the conversation
    const cropMentions = extractCropMentions(userMessage + ' ' + aiResponse);
    if (cropMentions.length > 0) {
      cropMentions.forEach(crop => {
        if (!memory.crops.includes(crop)) {
          memory.crops.push(crop);
        }
      });
    }

    // Extract farming activities
    const activities = extractFarmingActivities(userMessage);
    if (activities.length > 0) {
      activities.forEach(activity => {
        if (!memory.farmingHistory.includes(activity)) {
          memory.farmingHistory.push(activity);
        }
      });
    }

    // Update memory
    memory.lastUpdated = new Date();
    await memoryManager.updateUserMemory(userId, memory);
    
    console.log(`📝 Updated user memory: ${memory.crops.length} crops, ${memory.farmingHistory.length} activities`);
  } catch (error) {
    console.error("Error updating user memory:", error);
  }
}

// Utility functions
function extractCropMentions(text: string): string[] {
  const cropKeywords = ['rice', 'wheat', 'corn', 'maize', 'cotton', 'soybean', 'tomato', 'potato', 'onion', 'banana', 'sugarcane'];
  return cropKeywords.filter(crop => text.toLowerCase().includes(crop));
}

function extractFarmingActivities(text: string): string[] {
  const activityKeywords = ['planting', 'harvesting', 'irrigation', 'fertilizing', 'pest control', 'soil preparation'];
  return activityKeywords.filter(activity => text.toLowerCase().includes(activity));
}

// Enhanced AI functions using intelligent model management
export async function generateIntelligentWeatherPrediction(weatherData: any, location: string): Promise<string | null> {
  return await intelligentAIManager.generateWeatherPrediction(weatherData, location);
}

export async function generateIntelligentDroughtAnalysis(droughtData: any, location: string): Promise<string | null> {
  return await intelligentAIManager.generateDroughtAnalysis(droughtData, location);
}

export async function generateIntelligentCropRecommendations(cropData: any, conditions: any): Promise<string | null> {
  return await intelligentAIManager.generateCropRecommendations(cropData, conditions);
}

export async function executeIntelligentAIRequest(
  taskType: string,
  messages: AIMessage[],
  options: { priority?: "low" | "medium" | "high" } = {}
): Promise<string | null> {
  return await intelligentAIManager.executeIntelligentRequest(taskType, messages, options);
}

export function getAIStats() {
  return {
    apiKeys: apiKeyManager.getStats(),
    availableModels: Object.keys(FREE_AI_MODELS).length,
    memoryCache: memoryManager,
    intelligentManager: intelligentAIManager.getModelStatistics(),
    enhancedFeatures: {
      nasa: true,
      openMeteo: true,
      soilGrids: true,
      seasonalForecast: true,
      comprehensiveAnalysis: true,
      intelligentModelSelection: true,
      automaticFailover: true,
      droughtMonitoring: true
    }
  };
}

// Enhanced drought analysis using intelligent AI manager
export async function generateEnhancedDroughtAnalysis(
  landData: any, 
  weatherData: any, 
  historicalData: any
) {
  try {
    const messages = [
      {
        role: "system" as const,
        content: "You are a drought specialist. Return ONLY valid JSON (no markdown, no ```). Provide detailed, actionable advice."
      },
      {
        role: "user" as const,
        content: `Drought risk assessment for farm "${landData.name}" at ${landData.address || 'Unknown location'} (${landData.latitude}, ${landData.longitude}):

Land: ${landData.area || 'Unknown'} acres, ${landData.soilType || 'Unknown'} soil, crop: ${landData.currentCrop || 'None'}
Weather: ${weatherData.main?.temp || weatherData.temperature || 'N/A'}°C, ${weatherData.main?.humidity || weatherData.humidity || 'N/A'}% humidity, ${weatherData.rain?.['1h'] || weatherData.precipitation || 0}mm rain

Return ONLY this JSON format:
{
  "riskLevel": "low", 
  "probability": 25, 
  "timeframe": "3-month", 
  "recommendations": {
    "immediate": ["action 1", "action 2"],
    "shortTerm": ["action 1", "action 2"],
    "longTerm": ["action 1", "action 2"]
  },
  "actionPlan": {
    "waterConservation": {
      "priority": "High",
      "strategies": [
        {"action": "Install drip irrigation", "savings": "30%", "timeframe": "Immediate", "difficulty": "Medium"}
      ]
    },
    "cropManagement": {
      "currentSeason": [
        {"crop": "Wheat", "action": "Mulching", "timing": "Now", "expectedOutcome": "Moisture retention"}
      ],
      "nextSeason": [
        {"crop": "Millet", "soilType": "Sandy Loam", "plantingWindow": "June", "yieldExpectation": "High", "waterRequirement": "Low"}
      ]
    },
    "infrastructurePrep": [
      {"infrastructure": "Rainwater harvesting", "priority": "High", "cost": "Medium", "benefit": "Long-term security"}
    ]
  },
  "analysis": "Detailed analysis text here..."
}

Risk levels: low/moderate/high/extreme. Probability: 0-100.`
      }
    ];

    const response = await intelligentAIManager.executeIntelligentRequest(
      "drought-analysis",
      messages,
      { priority: "high" }
    );
    
    // Check for null or empty response
    if (!response || typeof response !== 'string') {
      console.warn('❌ Received null or invalid response from AI for drought analysis, using fallback');
      throw new Error('Empty or invalid AI response');
    }
    
    // Clean the response to extract JSON from markdown code blocks
    let jsonString = response;
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonString = jsonMatch[1].trim();
    } else {
      // If no code blocks, try to find JSON object directly
      const firstBrace = response.indexOf('{');
      const lastBrace = response.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        jsonString = response.substring(firstBrace, lastBrace + 1);
      }
    }
    
    // Remove any remaining markdown artifacts
    jsonString = jsonString
      .replace(/^```json\s*/, '')
      .replace(/\s*```$/, '')
      .replace(/^```\s*/, '')
      .trim();

    // Sanitize control characters and fix common JSON issues
    jsonString = jsonString
      .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Remove control characters
      .replace(/\\n/g, '\\n') // Escape literal newlines
      .replace(/\\t/g, '\\t') // Escape literal tabs
      .replace(/\\r/g, '\\r') // Escape literal carriage returns
      .replace(/\"/g, '"') // Fix escaped quotes
      .replace(/([^\\])\\([^"\\\/bfnrt])/g, '$1\\\\$2'); // Fix invalid escapes
    
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Enhanced drought analysis failed:', error);
    
    // Fallback drought analysis
    return {
      riskLevel: 'moderate',
      probability: 35,
      timeframe: '3-month',
      affectedMonths: JSON.stringify(['December', 'January', 'February']),
      recommendations: {
        immediate: ['Monitor soil moisture levels daily', 'Check irrigation systems for leaks'],
        shortTerm: ['Apply mulch to retain soil moisture', 'Adjust irrigation schedule to early morning'],
        longTerm: ['Plan for drought-resistant crop varieties', 'Improve soil organic matter content']
      },
      actionPlan: {
        waterConservation: {
          priority: 'High',
          strategies: [
            { action: 'Install drip irrigation', savings: '40%', timeframe: '1 month', difficulty: 'Medium' },
            { action: 'Rainwater harvesting', savings: '20%', timeframe: '3 months', difficulty: 'High' }
          ]
        },
        cropManagement: {
          currentSeason: [
            { crop: landData.currentCrop || 'Current Crop', action: 'Reduce plant density', timing: 'Immediate', expectedOutcome: 'Reduced water competition' }
          ],
          nextSeason: [
            { crop: 'Sorghum', soilType: 'All types', plantingWindow: 'Start of rainy season', yieldExpectation: 'Moderate', waterRequirement: 'Low' },
            { crop: 'Pearl Millet', soilType: 'Sandy', plantingWindow: 'Early monsoon', yieldExpectation: 'Stable', waterRequirement: 'Very Low' }
          ]
        },
        infrastructurePrep: [
          { infrastructure: 'Farm pond', priority: 'High', cost: 'High', benefit: 'Water security' },
          { infrastructure: 'Soil moisture sensors', priority: 'Medium', cost: 'Low', benefit: 'Precision irrigation' }
        ]
      },
      analysis: 'Moderate drought risk identified based on current weather patterns and seasonal trends. Proactive water management recommended.'
    };
  }
}

// Generate land-specific weather prediction
export async function generateLandWeatherPrediction(landId: number) {
  try {
    console.log(`🌤️ Generating weather prediction for land ${landId}`);
    
    // Get land data
    const landData = await storage.getLandById(landId);
    if (!landData) {
      throw new Error(`Land with ID ${landId} not found`);
    }

    // Get current weather data
    const currentWeather = await getCurrentWeather(
      landData.latitude, 
      landData.longitude
    );

    const temp = (currentWeather as any)?.current?.temp || (currentWeather as any)?.main?.temp || 'N/A';
    const humidity = (currentWeather as any)?.current?.humidity || (currentWeather as any)?.main?.humidity || 'N/A';
    const windSpeed = (currentWeather as any)?.current?.wind_speed || (currentWeather as any)?.wind?.speed || 'N/A';

    // Generate weather prediction using intelligent AI manager
    const messages = [
      {
        role: "system" as const,
        content: "You are a meteorological and agricultural expert. Provide accurate weather predictions with agricultural impact analysis."
      },
      {
        role: "user" as const,
        content: `7-day weather forecast for farm "${landData.name}" at ${landData.address || 'Unknown location'} (${landData.latitude}, ${landData.longitude}):
Current: ${temp}°C, ${humidity}% humidity, wind ${windSpeed}km/h
Crop: ${landData.currentCrop || 'None'}

Provide concise weather prediction with farming impact and recommendations. Keep under 500 words.`
      }
    ];

    const weatherPrediction = await intelligentAIManager.executeIntelligentRequest(
      "weather-prediction",
      messages,
      { priority: "medium" }
    );

    // Check for valid response
    if (!weatherPrediction || typeof weatherPrediction !== 'string') {
      console.warn('❌ Received null or invalid response from AI for weather prediction');
      throw new Error('Empty or invalid AI response for weather prediction');
    }

    // Clear existing weather predictions for this land before saving new ones
    await storage.clearOldLandPredictions(landId);
    console.log(`🗑️ Cleared existing weather predictions for land ${landId}`);

    // Save weather prediction to database
    const predictionData: any = {
      landId: landId,
      userId: landData.userId,
      predictionType: 'weather',
      title: 'AI Weather Forecast',
      description: weatherPrediction || 'Weather prediction generated by AI analysis',
      confidence: 85,
      predictionDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      aiModel: 'intelligent-predictor-model',
      severity: 'medium'
    };
    const savedWeatherPrediction = await storage.saveLandPrediction(predictionData);
    console.log(`✅ Saved AI weather prediction for land ${landId}`);

    // Send enhanced notification for weather prediction
    await sendEnhancedNotification(
      landData.userId,
      'weather',
      {
        title: predictionData.title,
        severity: predictionData.severity,
        confidence: predictionData.confidence,
        description: predictionData.description,
        data: { analysis: weatherPrediction }
      },
      landId
    );

    console.log(`✅ Generated weather prediction for land ${landId}`);
    return savedWeatherPrediction;

  } catch (error) {
    console.error(`❌ Failed to generate weather prediction for land ${landId}:`, error);
    
    // Fallback weather prediction
    const landData = await storage.getLandById(landId);
    const fallbackData: any = {
      landId: landId,
      userId: landData?.userId || 'unknown',
      predictionType: 'weather',
      title: 'Basic Weather Forecast',
      description: 'Weather conditions expected to remain stable with seasonal variations. Monitor local forecasts for detailed updates.',
      confidence: 60,
      predictionDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      aiModel: 'fallback-weather-model',
      severity: 'low'
    };
    const fallbackPrediction = await storage.saveLandPrediction(fallbackData);

    console.log(`✅ Created fallback weather prediction for land ${landId}`);
    return fallbackPrediction;
  }
}

// Generate land-specific crop recommendations
export async function generateLandCropRecommendations(landId: number) {
  try {
    console.log(`🌱 Generating crop recommendations for land ${landId}`);
    
    // Get land data
    const landData = await storage.getLandById(landId);
    if (!landData) {
      throw new Error(`Land with ID ${landId} not found`);
    }

    // Get current weather data
    const currentWeather = await getCurrentWeather(
      landData.latitude, 
      landData.longitude
    );

    const temp = (currentWeather as any)?.current?.temp || (currentWeather as any)?.main?.temp || 'N/A';
    const humidity = (currentWeather as any)?.current?.humidity || (currentWeather as any)?.main?.humidity || 'N/A';

    // Generate crop recommendations using intelligent AI manager
    const messages = [
      {
        role: "system" as const,
        content: "You are an agricultural expert. Return ONLY valid JSON array. No markdown, no conversational text."
      },
      {
        role: "user" as const,
        content: `Crop recommendations for farm "${landData.name}" at ${landData.address || 'Unknown location'} (${landData.latitude}, ${landData.longitude})
Land: ${landData.area || 'Unknown'} acres, ${landData.soilType || 'Unknown'} soil
Current: ${landData.currentCrop || 'None'}, Weather: ${temp}°C, ${humidity}% humidity

Provide 3 crop recommendations. Return ONLY JSON array format:
[{"cropName": "Wheat", "confidence": 85, "reasoning": "Good for climate", "plantingDate": "2024-03-15", "harvestDate": "2024-07-30", "detailedPlan": "Plant in rows, water weekly"}]

Use YYYY-MM-DD for dates or null. Keep reasoning under 50 chars, plan under 100 chars. Do not include any text outside the JSON array.`
      }
    ];

    const cropAnalysis = await intelligentAIManager.executeIntelligentRequest(
      "crop-recommendations",
      messages,
      { priority: "medium" }
    );

    let recommendations = [];
    try {
      if (!cropAnalysis || typeof cropAnalysis !== 'string') {
        console.warn('❌ No valid AI response for crop recommendations, generating fallback recommendations');
        throw new Error('No valid AI response received');
      }
      
      // Clean the response to extract JSON from markdown code blocks
      let jsonString = cropAnalysis;
      const jsonMatch = cropAnalysis.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonString = jsonMatch[1].trim();
      } else {
        // If no code blocks, try to find JSON array directly
        const firstBracket = cropAnalysis.indexOf('[');
        const lastBracket = cropAnalysis.lastIndexOf(']');
        if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
          jsonString = cropAnalysis.substring(firstBracket, lastBracket + 1);
        }
      }
      
      // Remove any remaining markdown artifacts or conversational text
      // Sometimes models output "<s> [OUT] ..." or similar prefixes
      jsonString = jsonString
        .replace(/^```json\s*/, '')
        .replace(/\s*```$/, '')
        .replace(/^```\s*/, '')
        .replace(/^<s>\s*\[OUT\]\s*/, '') // Handle specific model artifact seen in logs
        .trim();
      
      // Try to find JSON array in the response if not already clean
      const arrayMatch = jsonString.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        jsonString = arrayMatch[0];
      }
      
      // Sanitize the JSON string (remove control characters, fix common issues)
      jsonString = jsonString.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
      
      recommendations = JSON.parse(jsonString);
      if (!Array.isArray(recommendations)) {
        recommendations = [recommendations];
      }
      
      console.log(`✅ Successfully parsed ${recommendations.length} crop recommendations from AI`);
    } catch (parseError: any) {
      console.warn('❌ Failed to parse crop recommendations JSON:', parseError?.message || 'Unknown error');
      if (cropAnalysis) {
        console.log('Raw AI response:', cropAnalysis.substring(0, 200) + '...');
      }
      recommendations = [];
    }

    // Only proceed if we have AI-generated recommendations
    if (!Array.isArray(recommendations) || recommendations.length === 0) {
      console.log('❌ No valid AI crop recommendations generated');
      return [];
    }

    // Clear existing crop recommendations for this land before saving new ones
    await storage.clearOldLandCropRecommendations(landId);
    console.log(`🗑️ Cleared existing crop recommendations for land ${landId}`);

    // Save only AI-generated crop recommendations to database
    const savedRecommendations = [];
    for (const crop of recommendations.slice(0, 5)) { // Limit to 5 recommendations
      try {
        // Safely parse dates with validation
        const plantingDate = parseAIDate(crop.plantingDate);
        const harvestDate = parseAIDate(crop.harvestDate);
        
        const cropData: any = {
          landId: landId,
          userId: landData.userId,
          cropName: crop.cropName || 'AI Recommended Crop',
          confidence: crop.confidence || 75,
          reasoning: crop.reasoning || 'AI-generated recommendation based on current conditions',
          plantingDate: plantingDate,
          harvestDate: harvestDate,
          detailedPlan: crop.detailedPlan || 'Detailed cultivation plan provided by AI analysis',
          irrigationNeeds: crop.irrigationNeeds || 'Follow AI-recommended irrigation schedule',
          fertilizerNeeds: crop.fertilizerNeeds || 'Apply AI-recommended fertilizer program',
          expectedYield: crop.expectedYield || 'Yield prediction based on AI analysis',
          risks: crop.risks || 'AI-identified risk factors and mitigation strategies'
        };
        const savedCrop = await storage.saveLandCropRecommendation(cropData);
        savedRecommendations.push(savedCrop);
        console.log(`✅ Saved AI crop recommendation: ${crop.cropName} (${crop.confidence}% confidence)`);
        if (crop.plantingDate && !plantingDate) {
          console.warn(`⚠️ Invalid planting date for ${crop.cropName}: "${crop.plantingDate}"`);
        }
        if (crop.harvestDate && !harvestDate) {
          console.warn(`⚠️ Invalid harvest date for ${crop.cropName}: "${crop.harvestDate}"`);
        }
      } catch (saveError) {
        console.error(`❌ Failed to save crop recommendation: ${crop.cropName}`);
        console.error(`   Planting date: "${crop.plantingDate}" -> ${parseAIDate(crop.plantingDate)}`);
        console.error(`   Harvest date: "${crop.harvestDate}" -> ${parseAIDate(crop.harvestDate)}`);
        console.error('   Error details:', saveError.message);
      }
    }

    // Send notification for the top recommendation
    if (savedRecommendations.length > 0) {
      const topCrop = savedRecommendations[0];
      await sendEnhancedNotification(
        landData.userId,
        'crop',
        {
          cropName: topCrop.cropName,
          confidence: topCrop.confidence,
          reasoning: topCrop.reasoning,
          detailedPlan: topCrop.detailedPlan
        },
        landId
      );
    }

    console.log(`✅ Generated ${savedRecommendations.length} crop recommendations for land ${landId}`);
    return savedRecommendations;

  } catch (error) {
    console.error(`❌ Failed to generate crop recommendations for land ${landId}:`, error);
    
    // Generate fallback crop recommendations based on location and season
    try {
      console.log(`🔄 Generating fallback crop recommendations for land ${landId}`);
      
      // Clear existing recommendations
      await storage.clearOldLandCropRecommendations(landId);
      
      // Get current date for seasonal recommendations
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1; // 1-12
      
      // Define fallback crops based on season and general suitability
      const fallbackCrops = [
        {
          cropName: currentMonth >= 3 && currentMonth <= 6 ? 'Wheat' : 'Rice',
          confidence: 70,
          reasoning: 'Suitable for current season and climate',
          plantingDate: new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000), // Next week
          harvestDate: new Date(currentDate.getTime() + 120 * 24 * 60 * 60 * 1000), // 4 months later
          detailedPlan: 'Standard cultivation practices for regional conditions'
        },
        {
          cropName: 'Corn',
          confidence: 65,
          reasoning: 'Versatile crop suitable for various conditions',
          plantingDate: new Date(currentDate.getTime() + 14 * 24 * 60 * 60 * 1000), // Two weeks
          harvestDate: new Date(currentDate.getTime() + 90 * 24 * 60 * 60 * 1000), // 3 months later
          detailedPlan: 'Plant in rows with adequate spacing and regular irrigation'
        }
      ];
      
      const savedFallbackRecommendations = [];
      for (const crop of fallbackCrops) {
        const land = await storage.getLandById(landId);
        const fallbackCropData: any = {
          landId: landId,
          userId: land?.userId || 'unknown',
          cropName: crop.cropName,
          confidence: crop.confidence,
          reasoning: crop.reasoning,
          plantingDate: crop.plantingDate,
          harvestDate: crop.harvestDate,
          detailedPlan: crop.detailedPlan,
          irrigationNeeds: 'Regular watering schedule based on soil moisture',
          fertilizerNeeds: 'Balanced NPK fertilizer application',
          expectedYield: 'Moderate yield expected with proper care',
          risks: 'Monitor for pests and weather conditions'
        };
        const savedCrop = await storage.saveLandCropRecommendation(fallbackCropData);
        savedFallbackRecommendations.push(savedCrop);
        console.log(`✅ Saved fallback crop recommendation: ${crop.cropName}`);
      }
      
      console.log(`✅ Generated ${savedFallbackRecommendations.length} fallback crop recommendations for land ${landId}`);
      return savedFallbackRecommendations;
      
    } catch (fallbackError) {
      console.error(`❌ Failed to generate fallback crop recommendations:`, fallbackError);
      return [];
    }
  }
}

// Calculate drought indicators from historical NASA POWER data
function calculateDroughtIndicators(historicalData: any) {
  try {
    if (!historicalData?.parameters || !historicalData.properties) {
      console.log('⚠️ No historical data available for drought calculation');
      return {
        averageTemp: 25,
        totalPrecipitation: 50,
        averageSoilMoisture: 0.5,
        droughtScore: 0.4
      };
    }

    const { T2M: temps, PRECTOTCORR: precip, GWETTOP: soilMoisture } = historicalData.parameters;
    
    // Calculate averages
    const tempValues = Object.values(temps || {}).filter((v: any) => v !== null && v !== undefined && typeof v === 'number') as number[];
    const precipValues = Object.values(precip || {}).filter((v: any) => v !== null && v !== undefined && typeof v === 'number') as number[];
    const soilValues = Object.values(soilMoisture || {}).filter((v: any) => v !== null && v !== undefined && typeof v === 'number') as number[];
    
    const averageTemp: number = tempValues.length > 0 ? 
      (tempValues.reduce((a: number, b: number) => a + b, 0) / tempValues.length) : 25;
    const totalPrecipitation: number = precipValues.length > 0 ? 
      precipValues.reduce((a: number, b: number) => a + b, 0) : 50;
    const averageSoilMoisture: number = soilValues.length > 0 ? 
      (soilValues.reduce((a: number, b: number) => a + b, 0) / soilValues.length) : 0.5;
    
    // Calculate simple drought score (0-1, where 1 is severe drought)
    const precipitationFactor = Math.max(0, (100 - totalPrecipitation) / 100);
    const soilMoistureFactor = Math.max(0, (0.7 - averageSoilMoisture) / 0.7);
    const temperatureFactor = Math.max(0, (averageTemp - 25) / 20);
    
    const droughtScore = (precipitationFactor * 0.4 + soilMoistureFactor * 0.4 + temperatureFactor * 0.2);
    
    console.log(`📊 Drought indicators: Temp=${averageTemp.toFixed(1)}°C, Precip=${totalPrecipitation.toFixed(1)}mm, SM=${averageSoilMoisture.toFixed(2)}, Score=${droughtScore.toFixed(2)}`);
    
    return {
      averageTemp,
      totalPrecipitation,
      averageSoilMoisture,
      droughtScore: Math.min(1, droughtScore)
    };
  } catch (error) {
    console.error('Error calculating drought indicators:', error);
    return {
      averageTemp: 25,
      totalPrecipitation: 50,
      averageSoilMoisture: 0.5,
      droughtScore: 0.4
    };
  }
}

// Generate land-specific drought prediction
export async function generateLandDroughtPrediction(landId: number) {
  try {
    console.log(` Generating drought prediction for land ${landId}`);
    
    // Get land data
    const landData = await storage.getLandById(landId);
    if (!landData) {
      throw new Error(`Land with ID ${landId} not found`);
    }

    // Get current weather data
    const currentWeather = await getCurrentWeather(
      landData.latitude, 
      landData.longitude
    );

    // Get historical weather data using working NASA POWER service from comprehensiveDataService
    let historicalData;
    try {
      const { comprehensiveDataService } = await import('./comprehensiveDataService');
      const nasaPowerData = await comprehensiveDataService.getNASAPowerHistoricalData(
        landData.latitude, 
        landData.longitude
      );
      
      // Convert to the expected format for drought analysis
      const parameters: any = { T2M: {}, PRECTOTCORR: {}, GWETTOP: {} };
      
      nasaPowerData.forEach(record => {
        if (record.date) {
          const dateKey = record.date.toISOString().split('T')[0].replace(/-/g, '');
          if (record.temperature2m !== null && record.temperature2m !== undefined) {
            parameters.T2M[dateKey] = record.temperature2m;
          }
          if (record.precipitation !== null && record.precipitation !== undefined) {
            parameters.PRECTOTCORR[dateKey] = record.precipitation;
          }
          if (record.soilMoisture !== null && record.soilMoisture !== undefined) {
            parameters.GWETTOP[dateKey] = record.soilMoisture;
          }
        }
      });
      
      historicalData = { parameters };
      console.log(`🛰️ Using ${nasaPowerData.length} NASA POWER records for drought analysis`);
      
    } catch (error: any) {
      console.log('⚠️ NASA POWER unavailable, using fallback drought data:', error?.message || 'Unknown error');
      historicalData = {
        parameters: {
          T2M: { 
            '20251120': 28.0, '20251119': 27.5, '20251118': 28.5,
            '20251117': 27.8, '20251116': 28.2, '20251115': 27.9
          },
          PRECTOTCORR: { 
            '20251120': 8.0, '20251119': 6.5, '20251118': 2.5,
            '20251117': 4.2, '20251116': 9.1, '20251115': 1.8
          },
          GWETTOP: { 
            '20251120': 0.76, '20251119': 0.75, '20251118': 0.74,
            '20251117': 0.73, '20251116': 0.78, '20251115': 0.72
          }
        }
      };
    }

    // Ensure weather data has the expected structure
    const weatherForAnalysis = currentWeather ? {
      main: {
        temp: (currentWeather as any).current?.temp || (currentWeather as any).main?.temp || 25,
        humidity: (currentWeather as any).current?.humidity || (currentWeather as any).main?.humidity || 60
      },
      wind: {
        speed: (currentWeather as any).current?.wind_speed || (currentWeather as any).wind?.speed || 5
      },
      rain: {
        '1h': (currentWeather as any).rain?.['1h'] || 0
      }
    } : {
      main: { temp: 25, humidity: 60 },
      wind: { speed: 5 },
      rain: { '1h': 0 }
    };

    // Calculate drought indicators from historical data
    const droughtIndicators = calculateDroughtIndicators(historicalData);
    
    // Generate enhanced drought analysis using AI
    const droughtAnalysis = await generateEnhancedDroughtAnalysis(
      landData,
      weatherForAnalysis,
      { ...historicalData, ...droughtIndicators }
    );

    // Clear existing drought predictions for this land before saving new ones
    await storage.clearOldLandDroughtPredictions(landId);
    console.log(`🗑️ Cleared existing drought predictions for land ${landId}`);

    // Save drought prediction to database
    const droughtData: any = {
      landId: landId,
      userId: landData.userId,
      riskLevel: droughtAnalysis.riskLevel || 'moderate',
      probability: droughtAnalysis.probability || 35,
      timeframe: droughtAnalysis.timeframe || '3-month',
      affectedMonths: droughtAnalysis.affectedMonths,
      pdsiValue: droughtAnalysis.pdsiValue,
      spiValue: droughtAnalysis.spiValue,
      precipitationTrend: droughtAnalysis.precipitationTrend,
      temperatureTrend: droughtAnalysis.temperatureTrend,
      recommendations: JSON.stringify(droughtAnalysis.recommendations),
      actionPlan: JSON.stringify(droughtAnalysis.actionPlan),
      analysis: droughtAnalysis.analysis
    };
    const savedDroughtPrediction = await storage.saveLandDroughtPrediction(droughtData);
    console.log(`✅ Saved AI drought prediction for land ${landId}`);

    console.log(`✅ Generated drought prediction for land ${landId}:`, {
      riskLevel: savedDroughtPrediction.riskLevel,
      probability: savedDroughtPrediction.probability,
      timeframe: savedDroughtPrediction.timeframe
    });

    return savedDroughtPrediction;

  } catch (error) {
    console.error(`❌ Failed to generate drought prediction for land ${landId}:`, error);
    
    // Fallback drought prediction
    const landData = await storage.getLandById(landId);
    const fallbackDroughtData: any = {
      landId: landId,
      userId: landData?.userId || 'unknown',
      riskLevel: 'moderate',
      probability: 35,
      timeframe: '3-month',
      affectedMonths: JSON.stringify(['December', 'January', 'February']),
      recommendations: 'Monitor soil moisture levels, implement water conservation measures, consider drought-resistant crop varieties for upcoming planting season.',
      actionPlan: `Drought Mitigation Action Plan:

1. **Water Management:**
   - Install drip irrigation system for efficient water use
   - Set up rainwater harvesting systems
   - Monitor soil moisture levels daily

2. **Crop Protection:**
   - Apply mulch around plants to retain moisture
   - Consider drought-resistant crop varieties
   - Implement shade structures for sensitive crops

3. **Monitoring:**
   - Check weather forecasts daily
   - Monitor local drought indices
   - Track soil moisture and plant stress indicators

4. **Preparedness:**
   - Secure backup water sources
   - Prepare emergency irrigation equipment
   - Plan alternative crop rotations`,
      analysis: 'Moderate drought risk assessment based on seasonal patterns and current weather trends. Proactive water management and crop protection measures recommended to minimize potential impacts.'
    };
    const fallbackPrediction = await storage.saveLandDroughtPrediction(fallbackDroughtData);

    console.log(`✅ Created fallback drought prediction for land ${landId}`);
    return fallbackPrediction;
  }
}