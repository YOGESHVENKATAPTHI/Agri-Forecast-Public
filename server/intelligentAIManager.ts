import { callMultipleAI, getCentralizedPrediction, callSpecificModel } from "./aiService";

export interface AIModelConfig {
  modelName: string;
  provider: "openrouter" | "custom";
  endpoint?: string;
  specializations: string[];
  rateLimits: {
    requestsPerMinute: number;
    requestsPerDay: number;
    tokensPerMinute?: number;
  };
  costTier: "free" | "low" | "medium" | "high";
  reliability: number; // 0-100
  isActive: boolean;
  lastUsed?: Date;
  errorCount: number;
  consecutiveErrors: number;
  totalRequests: number;
  successfulRequests: number;
}

export interface TaskSpecialization {
  taskType: string;
  preferredModels: string[];
  fallbackModels: string[];
  maxRetries: number;
  requiresContext: boolean;
  estimatedTokens: number;
}

export class IntelligentAIManager {
  private models: Map<string, AIModelConfig> = new Map();
  private taskSpecializations: Map<string, TaskSpecialization> = new Map();
  private requestCounts: Map<string, { count: number; resetTime: Date }> = new Map();
  private modelQueue: Map<string, Date[]> = new Map(); // Track request times
  
  constructor() {
    this.initializeModels();
    this.initializeTaskSpecializations();
    this.startUsageResetTimer();
  }

  /**
   * Initialize available AI models with their configurations
   */
  private initializeModels(): void {
    const modelConfigs: AIModelConfig[] = [
      // Primary Model
      {
        modelName: "amazon/nova-2-lite-v1:free",
        provider: "openrouter",
        specializations: ["general", "weather", "agriculture", "analysis", "reasoning"],
        rateLimits: { requestsPerMinute: 30, requestsPerDay: 500 },
        costTier: "free",
        reliability: 95, // High reliability to ensure it's picked first
        isActive: true,
        errorCount: 0,
        consecutiveErrors: 0,
        totalRequests: 0,
        successfulRequests: 0
      },
      // Free models optimized for different tasks
      {
        modelName: "meta-llama/llama-3.1-8b-instruct:free",
        provider: "openrouter",
        specializations: ["general", "weather", "agriculture", "reasoning"],
        rateLimits: { requestsPerMinute: 20, requestsPerDay: 200 },
        costTier: "free",
        reliability: 85,
        isActive: true,
        errorCount: 0,
        consecutiveErrors: 0,
        totalRequests: 0,
        successfulRequests: 0
      },
      {
        modelName: "microsoft/phi-3-mini-128k-instruct:free",
        provider: "openrouter",
        specializations: ["code", "technical", "analysis", "drought"],
        rateLimits: { requestsPerMinute: 20, requestsPerDay: 200 },
        costTier: "free",
        reliability: 80,
        isActive: true,
        errorCount: 0,
        consecutiveErrors: 0,
        totalRequests: 0,
        successfulRequests: 0
      },
      {
        modelName: "google/gemma-2-9b-it:free",
        provider: "openrouter",
        specializations: ["research", "environmental", "climate", "prediction"],
        rateLimits: { requestsPerMinute: 15, requestsPerDay: 150 },
        costTier: "free",
        reliability: 82,
        isActive: true,
        errorCount: 0,
        consecutiveErrors: 0,
        totalRequests: 0,
        successfulRequests: 0
      },
      {
        modelName: "mistralai/mistral-7b-instruct:free",
        provider: "openrouter",
        specializations: ["crops", "recommendations", "planning", "agricultural"],
        rateLimits: { requestsPerMinute: 20, requestsPerDay: 200 },
        costTier: "free",
        reliability: 78,
        isActive: true,
        errorCount: 0,
        consecutiveErrors: 0,
        totalRequests: 0,
        successfulRequests: 0
      },
      {
        modelName: "huggingfaceh4/zephyr-7b-beta:free",
        provider: "openrouter",
        specializations: ["chat", "conversational", "user-interaction"],
        rateLimits: { requestsPerMinute: 20, requestsPerDay: 200 },
        costTier: "free",
        reliability: 75,
        isActive: true,
        errorCount: 0,
        consecutiveErrors: 0,
        totalRequests: 0,
        successfulRequests: 0
      },
      {
        modelName: "openchat/openchat-7b:free",
        provider: "openrouter",
        specializations: ["notifications", "alerts", "communication"],
        rateLimits: { requestsPerMinute: 20, requestsPerDay: 200 },
        costTier: "free",
        reliability: 77,
        isActive: true,
        errorCount: 0,
        consecutiveErrors: 0,
        totalRequests: 0,
        successfulRequests: 0
      },
      {
        modelName: "nousresearch/nous-capybara-7b:free",
        provider: "openrouter",
        specializations: ["data-analysis", "numerical", "calculations"],
        rateLimits: { requestsPerMinute: 15, requestsPerDay: 150 },
        costTier: "free",
        reliability: 79,
        isActive: true,
        errorCount: 0,
        consecutiveErrors: 0,
        totalRequests: 0,
        successfulRequests: 0
      },
      {
        modelName: "gryphe/mythomist-7b:free",
        provider: "openrouter",
        specializations: ["creative", "description", "reporting"],
        rateLimits: { requestsPerMinute: 20, requestsPerDay: 200 },
        costTier: "free",
        reliability: 73,
        isActive: true,
        errorCount: 0,
        consecutiveErrors: 0,
        totalRequests: 0,
        successfulRequests: 0
      },
      // High Performance Models from aiService
      {
        modelName: "nousresearch/hermes-3-llama-3.1-405b:free",
        provider: "openrouter",
        specializations: ["complex-reasoning", "advanced-analysis"],
        rateLimits: { requestsPerMinute: 10, requestsPerDay: 100 },
        costTier: "free",
        reliability: 90,
        isActive: true,
        errorCount: 0,
        consecutiveErrors: 0,
        totalRequests: 0,
        successfulRequests: 0
      },
      {
        modelName: "alibaba/tongyi-deepresearch-30b-a3b:free",
        provider: "openrouter",
        specializations: ["research", "deep-dive"],
        rateLimits: { requestsPerMinute: 10, requestsPerDay: 100 },
        costTier: "free",
        reliability: 88,
        isActive: true,
        errorCount: 0,
        consecutiveErrors: 0,
        totalRequests: 0,
        successfulRequests: 0
      },
      {
        modelName: "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
        provider: "openrouter",
        specializations: ["uncensored", "creative"],
        rateLimits: { requestsPerMinute: 15, requestsPerDay: 150 },
        costTier: "free",
        reliability: 85,
        isActive: true,
        errorCount: 0,
        consecutiveErrors: 0,
        totalRequests: 0,
        successfulRequests: 0
      },
      {
        modelName: "meta-llama/llama-3.3-70b-instruct:free",
        provider: "openrouter",
        specializations: ["general", "instruction-following"],
        rateLimits: { requestsPerMinute: 10, requestsPerDay: 100 },
        costTier: "free",
        reliability: 92,
        isActive: true,
        errorCount: 0,
        consecutiveErrors: 0,
        totalRequests: 0,
        successfulRequests: 0
      },
      {
        modelName: "qwen/qwen3-235b-a22b:free",
        provider: "openrouter",
        specializations: ["general", "multilingual"],
        rateLimits: { requestsPerMinute: 5, requestsPerDay: 50 },
        costTier: "free",
        reliability: 89,
        isActive: true,
        errorCount: 0,
        consecutiveErrors: 0,
        totalRequests: 0,
        successfulRequests: 0
      },
      {
        modelName: "microsoft/mai-ds-r1:free",
        provider: "openrouter",
        specializations: ["data-science", "reasoning"],
        rateLimits: { requestsPerMinute: 10, requestsPerDay: 100 },
        costTier: "free",
        reliability: 87,
        isActive: true,
        errorCount: 0,
        consecutiveErrors: 0,
        totalRequests: 0,
        successfulRequests: 0
      },
    ];

    modelConfigs.forEach(config => {
      this.models.set(config.modelName, config);
      this.modelQueue.set(config.modelName, []);
    });

    console.log(`🤖 Initialized ${modelConfigs.length} AI models for intelligent task distribution`);
  }

  /**
   * Initialize task specializations and model assignments
   */
  private initializeTaskSpecializations(): void {
    const allFallbackModels = [
      "meta-llama/llama-3.1-8b-instruct:free",
      "microsoft/phi-3-mini-128k-instruct:free",
      "google/gemma-2-9b-it:free",
      "mistralai/mistral-7b-instruct:free",
      "huggingfaceh4/zephyr-7b-beta:free",
      "openchat/openchat-7b:free",
      "nousresearch/nous-capybara-7b:free",
      "gryphe/mythomist-7b:free",
      "nousresearch/hermes-3-llama-3.1-405b:free",
      "alibaba/tongyi-deepresearch-30b-a3b:free",
      "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
      "meta-llama/llama-3.3-70b-instruct:free",
      "qwen/qwen3-235b-a22b:free",
      "microsoft/mai-ds-r1:free"
    ];

    const specializations: TaskSpecialization[] = [
      {
        taskType: "weather-prediction",
        preferredModels: ["amazon/nova-2-lite-v1:free"],
        fallbackModels: allFallbackModels,
        maxRetries: 8,
        requiresContext: true,
        estimatedTokens: 1500
      },
      {
        taskType: "drought-analysis",
        preferredModels: ["amazon/nova-2-lite-v1:free"],
        fallbackModels: allFallbackModels,
        maxRetries: 8,
        requiresContext: true,
        estimatedTokens: 2000
      },
      {
        taskType: "crop-recommendations",
        preferredModels: ["amazon/nova-2-lite-v1:free"],
        fallbackModels: allFallbackModels,
        maxRetries: 8,
        requiresContext: true,
        estimatedTokens: 1800
      },
      {
        taskType: "alert-generation",
        preferredModels: ["amazon/nova-2-lite-v1:free"],
        fallbackModels: allFallbackModels,
        maxRetries: 5,
        requiresContext: false,
        estimatedTokens: 800
      },
      {
        taskType: "data-analysis",
        preferredModels: ["amazon/nova-2-lite-v1:free"],
        fallbackModels: allFallbackModels,
        maxRetries: 5,
        requiresContext: true,
        estimatedTokens: 10000
      },
      {
        taskType: "conversational",
        preferredModels: ["amazon/nova-2-lite-v1:free"],
        fallbackModels: allFallbackModels,
        maxRetries: 5,
        requiresContext: false,
        estimatedTokens: 4100
      },
      {
        taskType: "environmental-analysis",
        preferredModels: ["amazon/nova-2-lite-v1:free"],
        fallbackModels: allFallbackModels,
        maxRetries: 5,
        requiresContext: true,
        estimatedTokens: 10600
      },
      {
        taskType: "report-generation",
        preferredModels: ["amazon/nova-2-lite-v1:free"],
        fallbackModels: allFallbackModels,
        maxRetries: 5,
        requiresContext: true,
        estimatedTokens: 10200
      }
    ];

    specializations.forEach(spec => {
      this.taskSpecializations.set(spec.taskType, spec);
    });

    console.log(`📋 Configured ${specializations.length} task specializations`);
  }

  /**
   * Intelligent model selection based on task type and current availability
   */
  async selectOptimalModel(taskType: string, priority: "low" | "medium" | "high" = "medium"): Promise<string | null> {
    const specialization = this.taskSpecializations.get(taskType);
    
    if (!specialization) {
      console.warn(`⚠️ No specialization found for task type: ${taskType}`);
      return this.selectGeneralModel();
    }

    // Get all candidate models (preferred + fallback)
    const candidateModels = [
      ...specialization.preferredModels,
      ...specialization.fallbackModels
    ];

    // Score each model based on availability, reliability, and performance
    const modelScores = candidateModels
      .map(modelName => {
        const model = this.models.get(modelName);
        if (!model || !model.isActive) return null;

        const score = this.calculateModelScore(model, priority);
        return { modelName, score, model };
      })
      .filter(Boolean)
      .sort((a, b) => b!.score - a!.score);

    if (modelScores.length === 0) {
      console.error(`❌ No available models for task type: ${taskType}`);
      return null;
    }

    const selectedModel = modelScores[0]!;
    console.log(`🎯 Selected model for ${taskType}: ${selectedModel.modelName} (score: ${selectedModel.score.toFixed(2)})`);
    
    return selectedModel.modelName;
  }

  /**
   * Calculate model score based on multiple factors
   */
  private calculateModelScore(model: AIModelConfig, priority: string): number {
    let score = 0;

    // Base reliability score (0-100)
    score += model.reliability;

    // Rate limit availability (higher is better)
    const availabilityScore = this.calculateAvailabilityScore(model);
    score += availabilityScore * 20; // Scale to 0-20

    // Error rate penalty (fewer errors = better)
    const errorRate = model.totalRequests > 0 ? model.errorCount / model.totalRequests : 0;
    score -= errorRate * 50; // Penalty for high error rate

    // Consecutive error penalty (heavily penalize models that are currently failing)
    if (model.consecutiveErrors > 0) {
      score -= model.consecutiveErrors * 15;
    }

    // Recent usage bonus (prefer models that haven't been used recently)
    const lastUsedBonus = this.calculateRecencyBonus(model);
    score += lastUsedBonus * 10;

    // Priority adjustments
    if (priority === "high") {
      // For high priority, prefer most reliable models even if recently used
      score += model.reliability * 0.5;
      score -= (model.consecutiveErrors * 20);
    } else if (priority === "low") {
      // For low priority, prefer less used models to distribute load
      score += lastUsedBonus * 15;
    }

    return Math.max(0, score); // Ensure non-negative score
  }

  /**
   * Calculate availability score based on rate limits
   */
  private calculateAvailabilityScore(model: AIModelConfig): number {
    const now = new Date();
    const queue = this.modelQueue.get(model.modelName) || [];
    
    // Remove old entries (older than 1 minute)
    const recentRequests = queue.filter(
      timestamp => now.getTime() - timestamp.getTime() < 60000
    );
    
    // Update queue
    this.modelQueue.set(model.modelName, recentRequests);
    
    // Calculate availability (1.0 = fully available, 0.0 = at rate limit)
    const currentMinuteRequests = recentRequests.length;
    const availability = Math.max(0, 1 - (currentMinuteRequests / model.rateLimits.requestsPerMinute));
    
    return availability;
  }

  /**
   * Calculate recency bonus (higher score for models used less recently)
   */
  private calculateRecencyBonus(model: AIModelConfig): number {
    if (!model.lastUsed) return 1.0; // Full bonus for never used
    
    const hoursSinceLastUse = (Date.now() - model.lastUsed.getTime()) / (1000 * 60 * 60);
    
    // Give higher bonus for models used less recently (max 1.0)
    return Math.min(1.0, hoursSinceLastUse / 24); // Full bonus after 24 hours
  }

  /**
   * Select a general-purpose model when no specialization is available
   */
  private selectGeneralModel(): string | null {
    const generalModels = Array.from(this.models.values())
      .filter(model => 
        model.isActive && 
        model.specializations.includes("general") &&
        model.consecutiveErrors < 3
      )
      .sort((a, b) => this.calculateModelScore(b, "medium") - this.calculateModelScore(a, "medium"));

    return generalModels.length > 0 ? generalModels[0].modelName : null;
  }

  /**
   * Execute AI request with intelligent model selection and fallback
   */
  async executeIntelligentRequest(
    taskType: string, 
    messages: any[], 
    options: {
      priority?: "low" | "medium" | "high";
      maxRetries?: number;
      requiresContext?: boolean;
    } = {}
  ): Promise<string | null> {
    
    const { priority = "medium", maxRetries = 3 } = options;
    const specialization = this.taskSpecializations.get(taskType);
    const maxAttempts = maxRetries || specialization?.maxRetries || 3;

    console.log(`🚀 Executing intelligent AI request for task: ${taskType} (priority: ${priority})`);

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // Select optimal model for this attempt
        const selectedModel = await this.selectOptimalModel(taskType, priority);
        
        if (!selectedModel) {
          console.error(`❌ No available models for task ${taskType} on attempt ${attempt}`);
          if (attempt === maxAttempts) return null;
          continue;
        }

        // Record the attempt
        this.recordRequestAttempt(selectedModel);

        // Make the AI request
        console.log(`📡 Attempt ${attempt}/${maxAttempts} using model: ${selectedModel}`);
        
        // Use specific model with optimized token limit
        const maxTokens = specialization?.estimatedTokens || 1500;
        const result = await callSpecificModel(messages, selectedModel, maxTokens);
        
        if (result) {
          // Record success
          this.recordRequestSuccess(selectedModel);
          console.log(`✅ Successful AI response from ${selectedModel} on attempt ${attempt}`);
          return result;
        } else {
          throw new Error("Empty response from AI model");
        }

      } catch (error) {
        console.error(`🚫 AI request failed on attempt ${attempt}:`, error);
        
        // Record the error for the model used in this attempt
        const lastAttemptModel = await this.selectOptimalModel(taskType, priority);
        if (lastAttemptModel) {
          this.recordRequestError(lastAttemptModel, error);
        }

        if (attempt === maxAttempts) {
          console.error(`💥 All ${maxAttempts} attempts failed for task: ${taskType}`);
          return null;
        }

        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }

    return null;
  }

  /**
   * Record a request attempt for rate limiting
   */
  private recordRequestAttempt(modelName: string): void {
    const model = this.models.get(modelName);
    if (!model) return;

    const now = new Date();
    
    // Add to queue for rate limiting
    const queue = this.modelQueue.get(modelName) || [];
    queue.push(now);
    this.modelQueue.set(modelName, queue);
    
    // Update model stats
    model.lastUsed = now;
    model.totalRequests++;
  }

  /**
   * Record a successful request
   */
  private recordRequestSuccess(modelName: string): void {
    const model = this.models.get(modelName);
    if (!model) return;

    model.successfulRequests++;
    model.consecutiveErrors = 0; // Reset consecutive error count
    
    // Increase reliability slightly for consistent performers
    if (model.successfulRequests % 10 === 0) {
      model.reliability = Math.min(100, model.reliability + 1);
    }
  }

  /**
   * Record a request error
   */
  private recordRequestError(modelName: string, error: any): void {
    const model = this.models.get(modelName);
    if (!model) return;

    model.errorCount++;
    model.consecutiveErrors++;
    
    // Deactivate model if too many consecutive errors
    if (model.consecutiveErrors >= 5) {
      model.isActive = false;
      console.warn(`⛔ Deactivated model ${modelName} due to consecutive errors`);
      
      // Reactivate after 1 hour
      setTimeout(() => {
        model.isActive = true;
        model.consecutiveErrors = 0;
        console.log(`🔄 Reactivated model ${modelName} after cooldown`);
      }, 60 * 60 * 1000);
    }

    // Decrease reliability for frequent errors
    if (model.errorCount % 5 === 0) {
      model.reliability = Math.max(20, model.reliability - 2);
    }

    console.error(`📊 Model ${modelName} error stats: ${model.errorCount} total, ${model.consecutiveErrors} consecutive`);
  }

  /**
   * Start timer to reset usage counters
   */
  private startUsageResetTimer(): void {
    // Reset daily counters at midnight
    setInterval(() => {
      const now = new Date();
      if (now.getHours() === 0 && now.getMinutes() === 0) {
        this.resetDailyCounters();
      }
    }, 60 * 1000); // Check every minute

    // Reset minute counters every minute
    setInterval(() => {
      this.resetMinuteCounters();
    }, 60 * 1000);
  }

  /**
   * Reset daily usage counters
   */
  private resetDailyCounters(): void {
    console.log("🔄 Resetting daily AI model usage counters");
    // Daily reset logic would be implemented here
    // For now, just log the reset
  }

  /**
   * Reset minute-based rate limiting counters
   */
  private resetMinuteCounters(): void {
    const now = new Date();
    
    // Clean old entries from all model queues
    for (const [modelName, queue] of this.modelQueue.entries()) {
      const filteredQueue = queue.filter(
        timestamp => now.getTime() - timestamp.getTime() < 60000
      );
      this.modelQueue.set(modelName, filteredQueue);
    }
  }

  /**
   * Get model statistics for monitoring
   */
  getModelStatistics(): any {
    const stats = Array.from(this.models.entries()).map(([name, model]) => ({
      name,
      isActive: model.isActive,
      reliability: model.reliability,
      totalRequests: model.totalRequests,
      successRate: model.totalRequests > 0 ? 
        ((model.successfulRequests / model.totalRequests) * 100).toFixed(2) + '%' : 'N/A',
      consecutiveErrors: model.consecutiveErrors,
      specializations: model.specializations,
      lastUsed: model.lastUsed?.toISOString() || 'Never'
    }));

    return {
      totalModels: stats.length,
      activeModels: stats.filter(s => s.isActive).length,
      models: stats
    };
  }

  /**
   * Public method for weather predictions using intelligent model selection
   */
  async generateWeatherPrediction(weatherData: any, location: string): Promise<string | null> {
    const messages = [
      {
        role: "system",
        content: "You are a meteorological expert. Provide accurate weather predictions based on current data."
      },
      {
        role: "user", 
        content: `Analyze this weather data for ${location} and provide a 3-day forecast: ${JSON.stringify(weatherData, null, 2)}`
      }
    ];

    return await this.executeIntelligentRequest("weather-prediction", messages, { 
      priority: "medium",
      requiresContext: true 
    });
  }

  /**
   * Public method for drought analysis using intelligent model selection  
   */
  async generateDroughtAnalysis(droughtData: any, location: string): Promise<string | null> {
    const messages = [
      {
        role: "system",
        content: "You are a drought specialist. Analyze conditions and provide actionable recommendations."
      },
      {
        role: "user",
        content: `Analyze drought conditions for ${location}: ${JSON.stringify(droughtData, null, 2)}`
      }
    ];

    return await this.executeIntelligentRequest("drought-analysis", messages, {
      priority: "high",
      requiresContext: true
    });
  }

  /**
   * Public method for crop recommendations using intelligent model selection
   */
  async generateCropRecommendations(cropData: any, conditions: any): Promise<string | null> {
    const messages = [
      {
        role: "system", 
        content: "You are an agricultural advisor. Provide crop recommendations based on current conditions."
      },
      {
        role: "user",
        content: `Recommend crops based on conditions: ${JSON.stringify(conditions, null, 2)}`
      }
    ];

    return await this.executeIntelligentRequest("crop-recommendations", messages, {
      priority: "medium",
      requiresContext: true
    });
  }
}

// Export singleton instance
export const intelligentAIManager = new IntelligentAIManager();