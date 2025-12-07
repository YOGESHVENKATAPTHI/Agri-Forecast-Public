import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { getCurrentWeather, reverseGeocode, getEnhancedCurrentWeather } from "./weatherService";
import { ComprehensiveDataService } from "./comprehensiveDataService";
import { enhancedLocationService } from "./enhancedLocationService";
import { dataAggregationService } from "./dataAggregationService";
import { generateCropRecommendations, generateWeatherPredictions, chatWithAI, chatWithEnhancedAI, generateLandDroughtPrediction, generateLandWeatherPrediction, generateLandCropRecommendations } from "./aiService";
import { droughtMonitoringService } from "./droughtMonitoringService";
import { sendWeatherAlert, sendManualSMS } from "./notificationService";
import { translationService } from "./translationService";
import { insertLandAreaSchema } from "../shared/schema";
import { handleHealthCheck, handlePing } from "./keepAliveService";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Translation routes for dynamic content
  app.post('/api/translate', async (req, res) => {
    try {
      const { text, targetLanguage, sourceLanguage = 'en' } = req.body;
      
      if (!text || !targetLanguage) {
        return res.status(400).json({ error: 'Text and target language are required' });
      }
      
      const translatedText = await translationService.translateText(text, targetLanguage, sourceLanguage);
      res.json({ 
        translatedText,
        sourceLanguage,
        targetLanguage 
      });
    } catch (error) {
      console.error('Translation error:', error);
      res.status(500).json({ error: 'Translation failed' });
    }
  });

  app.post('/api/translate/batch', async (req, res) => {
    try {
      const { texts, targetLanguage, sourceLanguage = 'en' } = req.body;
      
      if (!texts || !Array.isArray(texts) || !targetLanguage) {
        return res.status(400).json({ error: 'Texts array and target language are required' });
      }
      
      const translatedTexts = await translationService.translateBatch(texts, targetLanguage, sourceLanguage);
      res.json({ 
        translatedTexts,
        sourceLanguage,
        targetLanguage 
      });
    } catch (error) {
      console.error('Batch translation error:', error);
      res.status(500).json({ error: 'Batch translation failed' });
    }
  });

  // Weather routes
  app.get('/api/weather/current', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || !user.latitude || !user.longitude) {
        return res.status(400).json({ message: "User location not set" });
      }

      const weather = await getCurrentWeather(user.latitude, user.longitude);
      if (!weather) {
        return res.status(500).json({ message: "Failed to fetch weather data" });
      }

      res.json(weather);
    } catch (error) {
      console.error("Error fetching weather:", error);
      res.status(500).json({ message: "Failed to fetch weather data" });
    }
  });

  // Historical weather data route (NASA POWER)
  app.get('/api/weather/historical/:latitude/:longitude', isAuthenticated, async (req: any, res) => {
    try {
      const { latitude, longitude } = req.params;
      const { years = 10, parameters = 'temperature,precipitation,solarRadiation' } = req.query;

      if (!latitude || !longitude) {
        return res.status(400).json({ message: "Coordinates are required" });
      }

      console.log(`📊 Fetching ${years} years of historical data for ${latitude}, ${longitude}`);
      
      const comprehensiveDataService = new ComprehensiveDataService();
      const historicalData = await comprehensiveDataService.getNASAPowerHistoricalData(
        parseFloat(latitude), 
        parseFloat(longitude)
      );

      res.json({
        success: true,
        coordinates: { latitude: parseFloat(latitude), longitude: parseFloat(longitude) },
        years: parseInt(years as string),
        parameters: (parameters as string).split(','),
        data: historicalData,
        dataSource: 'NASA_POWER',
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error fetching historical weather data:", error);
      res.status(500).json({ 
        message: "Failed to fetch historical weather data",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Seasonal forecast route (Open-Meteo ECMWF SEAS5)
  app.get('/api/weather/seasonal/:latitude/:longitude', isAuthenticated, async (req: any, res) => {
    try {
      const { latitude, longitude } = req.params;
      const { months = 6 } = req.query;

      if (!latitude || !longitude) {
        return res.status(400).json({ message: "Coordinates are required" });
      }

      console.log(`🌍 Fetching ${months}-month seasonal forecast for ${latitude}, ${longitude}`);
      
      const comprehensiveDataService = new ComprehensiveDataService();
      const seasonalData = await comprehensiveDataService.getOpenMeteoSeasonalForecast(
        parseFloat(latitude),
        parseFloat(longitude)
      );

      res.json({
        success: true,
        coordinates: { latitude: parseFloat(latitude), longitude: parseFloat(longitude) },
        forecastMonths: parseInt(months as string),
        data: seasonalData,
        model: 'ECMWF_SEAS5',
        dataSource: 'Open-Meteo',
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error fetching seasonal forecast:", error);
      res.status(500).json({ 
        message: "Failed to fetch seasonal forecast",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Enhanced current weather with agricultural indices
  app.get('/api/weather/enhanced/:latitude/:longitude', isAuthenticated, async (req: any, res) => {
    try {
      const { latitude, longitude } = req.params;

      if (!latitude || !longitude) {
        return res.status(400).json({ message: "Coordinates are required" });
      }

      console.log(` Fetching enhanced weather with agricultural data for ${latitude}, ${longitude}`);
      
      const enhancedWeather = await getEnhancedCurrentWeather(
        parseFloat(latitude), 
        parseFloat(longitude)
      );

      res.json({
        success: true,
        coordinates: { latitude: parseFloat(latitude), longitude: parseFloat(longitude) },
        data: enhancedWeather,
        dataSource: 'OpenWeather_Enhanced',
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error fetching enhanced weather:", error);
      res.status(500).json({ 
        message: "Failed to fetch enhanced weather data",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Comprehensive Weather Analysis Route
  app.get("/api/weather/comprehensive", async (req, res) => {
    try {
      const { latitude, longitude } = req.query;
      
      if (!latitude || !longitude) {
        return res.status(400).json({ message: "Coordinates are required" });
      }

      console.log(`🌍 Generating comprehensive weather analysis for ${latitude}, ${longitude}`);
      
      const comprehensiveDataService = new ComprehensiveDataService();
      const analysis = await comprehensiveDataService.generateComprehensiveAnalysis(
        parseFloat(latitude as string),
        parseFloat(longitude as string)
      );

      res.json({
        success: true,
        coordinates: { latitude: parseFloat(latitude as string), longitude: parseFloat(longitude as string) },
        analysis,
        generatedAt: new Date().toISOString()
      });

    } catch (error) {
      console.error("❌ Comprehensive analysis error:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to generate comprehensive analysis",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Route to get stored data for AI analysis
  app.get("/api/weather/stored-analysis", async (req, res) => {
    try {
      const { latitude, longitude } = req.query;
      
      if (!latitude || !longitude) {
        return res.status(400).json({ message: "Coordinates are required" });
      }

      console.log(`📊 Retrieving stored analysis for ${latitude}, ${longitude}`);
      
      const comprehensiveDataService = new ComprehensiveDataService();
      const storedAnalysis = await comprehensiveDataService.getStoredAnalysisForAI(
        parseFloat(latitude as string),
        parseFloat(longitude as string)
      );

      res.json({
        success: true,
        coordinates: { latitude: parseFloat(latitude as string), longitude: parseFloat(longitude as string) },
        ...storedAnalysis,
        retrievedAt: new Date().toISOString()
      });

    } catch (error) {
      console.error("❌ Stored analysis retrieval error:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to retrieve stored analysis",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Combined analysis route - gets everything for a land
  app.post('/api/enhanced-analysis/complete', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { latitude, longitude, landId, useGPS = false } = req.body;

      if (!latitude || !longitude) {
        return res.status(400).json({ message: "Coordinates are required" });
      }

      console.log(`🚀 Performing complete enhanced analysis for land ${landId || 'unknown'}`);
      
      // Run location and weather analyses only (crop recommendations moved to manual-only)
      const [locationData, longTermPrediction] = await Promise.allSettled([
        enhancedLocationService.getEnhancedLocationData(latitude, longitude, useGPS),
        dataAggregationService.get6MonthPrediction(latitude, longitude, landId)
      ]);

      const result = {
        success: true,
        analysisId: `analysis_${Date.now()}`,
        landId,
        coordinates: { latitude, longitude },
        locationData: locationData.status === 'fulfilled' ? locationData.value : null,
        weatherPrediction: longTermPrediction.status === 'fulfilled' ? longTermPrediction.value : null,
        cropRecommendations: [], // Crop recommendations only available via manual predict button
        generatedAt: new Date().toISOString(),
        confidence: {
          location: locationData.status === 'fulfilled' ? 95 : 0,
          weather: longTermPrediction.status === 'fulfilled' ? longTermPrediction.value?.confidence || 0 : 0,
          crops: 0 // No automatic crop analysis
        }
      };

      res.json(result);
    } catch (error) {
      console.error("Error performing complete enhanced analysis:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to analyze location",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Predictions routes
  app.get('/api/predictions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const predictions = await storage.getPredictions(userId);
      res.json(predictions);
    } catch (error) {
      console.error("Error fetching predictions:", error);
      res.status(500).json({ message: "Failed to fetch predictions" });
    }
  });

  app.post('/api/predictions/generate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || !user.latitude || !user.longitude) {
        return res.status(400).json({ message: "User location not set" });
      }

      const weather = await getCurrentWeather(user.latitude, user.longitude);
      if (!weather) {
        return res.status(500).json({ message: "Failed to fetch weather data" });
      }

      const predictions = await generateWeatherPredictions(weather);

      // Save predictions to database
      for (const pred of predictions) {
        const predictionDate = new Date();
        predictionDate.setDate(predictionDate.getDate() + 3); // Predict for 3 days ahead

        const predictionData: any = {
          userId,
          predictionType: "weather",
          title: pred.title,
          description: pred.description,
          confidence: pred.confidence,
          predictionDate,
          aiModel: "gemini",
          severity: pred.severity,
        };
        await storage.savePrediction(predictionData);

        // Send alert if severity is high or critical
        if (pred.severity === "high" || pred.severity === "critical") {
          await sendWeatherAlert(userId, pred.title, pred.description);
        }
      }

      const savedPredictions = await storage.getPredictions(userId);
      res.json(savedPredictions);
    } catch (error) {
      console.error("Error generating predictions:", error);
      res.status(500).json({ message: "Failed to generate predictions" });
    }
  });

  // Drought Monitoring Routes
  app.post('/api/drought/analyze', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { latitude, longitude, landId } = req.body;

      if (!latitude || !longitude) {
        return res.status(400).json({ message: "Coordinates are required" });
      }

      console.log(` Analyzing drought conditions for location: ${latitude}, ${longitude}`);

      let droughtAnalysis;
      
      if (landId) {
        // Check for existing predictions
        const savedDroughtPredictions = await storage.getLandDroughtPredictions(landId);
        let latestPrediction;

        if (savedDroughtPredictions && savedDroughtPredictions.length > 0) {
          latestPrediction = savedDroughtPredictions[0];
          const predictionDate = new Date(latestPrediction.createdAt);
          const now = new Date();
          const diffTime = Math.abs(now.getTime() - predictionDate.getTime());
          const diffDays = diffTime / (1000 * 60 * 60 * 24);

          if (diffDays > 2) {
             console.log(`Cached prediction too old (${diffDays.toFixed(1)} days). Generating new analysis...`);
             latestPrediction = await generateLandDroughtPrediction(landId);
          } else {
             console.log(`Using cached drought prediction (Age: ${diffDays.toFixed(1)} days)`);
          }
        } else {
           console.log(`No existing prediction. Generating new analysis...`);
           latestPrediction = await generateLandDroughtPrediction(landId);
        }

        if (latestPrediction) {
          // Helper to parse action plan
          let parsedActionPlan;
          try {
            if (typeof latestPrediction.actionPlan === 'string') {
              if (latestPrediction.actionPlan.trim().startsWith('{')) {
                parsedActionPlan = JSON.parse(latestPrediction.actionPlan);
              } else {
                // Convert text description to object structure
                parsedActionPlan = {
                  waterConservation: { 
                    priority: "High", 
                    strategies: [{ action: latestPrediction.actionPlan, savings: "Variable", timeframe: "Immediate", difficulty: "Medium" }] 
                  },
                  cropManagement: { currentSeason: [], nextSeason: [] },
                  infrastructurePrep: []
                };
              }
            } else {
              parsedActionPlan = latestPrediction.actionPlan;
            }
          } catch (e) {
            console.warn("Failed to parse action plan", e);
          }

          // Helper to parse recommendations
          let parsedRecommendations;
          try {
            if (typeof latestPrediction.recommendations === 'string') {
              if (latestPrediction.recommendations.trim().startsWith('{')) {
                parsedRecommendations = JSON.parse(latestPrediction.recommendations);
              } else {
                // Convert text to array structure
                parsedRecommendations = {
                  immediate: [latestPrediction.recommendations],
                  shortTerm: [],
                  longTerm: []
                };
              }
            } else {
              parsedRecommendations = latestPrediction.recommendations;
            }
          } catch (e) {
            console.warn("Failed to parse recommendations", e);
          }

          // Map DB format to frontend expected format
          droughtAnalysis = {
            analysisId: `db-${latestPrediction.id}`,
            location: { latitude, longitude },
            currentConditions: {
              pdsi: latestPrediction.pdsiValue || -1.5,
              spi: latestPrediction.spiValue || -1.0,
              soilMoisture: 0.35, // Default estimate if not in DB
              precipitationDeficit: 15, // Default estimate
              temperatureAnomaly: 1.2 // Default estimate
            },
            riskLevel: latestPrediction.riskLevel,
            confidenceScore: 85,
            prediction: {
              timeline: latestPrediction.timeframe,
              probability: latestPrediction.probability,
              peakRisk: "Next Month",
              duration: latestPrediction.timeframe
            },
            recommendations: parsedRecommendations || {
              immediate: ["Monitor soil moisture daily", "Repair irrigation leaks"],
              shortTerm: ["Mulch crops to retain moisture", "Schedule irrigation at night"],
              longTerm: ["Consider drought-resistant varieties", "Improve soil organic matter"]
            },
            actionPlan: parsedActionPlan || {
              waterConservation: { priority: "High", strategies: [] },
              cropManagement: { currentSeason: [], nextSeason: [] },
              infrastructurePrep: []
            },
            dataQuality: {
              nasaPower: { status: 'success', confidence: 0.85, lastUpdate: new Date().toISOString() },
              openMeteo: { status: 'success', confidence: 0.90, forecastRange: '6 months' },
              modelReliability: 0.88
            },
            generatedAt: latestPrediction.createdAt
          };
        }
      }

      // Fallback to drought monitoring service if no saved predictions
      if (!droughtAnalysis) {
        try {
          const serviceAnalysis = await droughtMonitoringService.analyzeDroughtConditions(
            latitude,
            longitude,
            landId
          );
          
          // Map service format to frontend expected format
          droughtAnalysis = {
            analysisId: serviceAnalysis.analysisId,
            location: serviceAnalysis.location,
            currentConditions: {
              pdsi: serviceAnalysis.currentConditions.pdsiValue,
              spi: serviceAnalysis.currentConditions.spiValue,
              soilMoisture: serviceAnalysis.currentConditions.soilMoisturePercent / 100,
              precipitationDeficit: serviceAnalysis.currentConditions.precipitationDeficit,
              temperatureAnomaly: serviceAnalysis.currentConditions.temperatureAnomaly
            },
            riskLevel: serviceAnalysis.currentConditions.severity.toLowerCase(),
            confidenceScore: Math.round(serviceAnalysis.historicalContext.confidence * 100),
            prediction: {
              timeline: "6 months",
              probability: 0.75,
              peakRisk: serviceAnalysis.futureOutlook.peakDroughtMonth ? `Month ${serviceAnalysis.futureOutlook.peakDroughtMonth}` : "None",
              duration: "Seasonal"
            },
            recommendations: {
              immediate: serviceAnalysis.aiRecommendations.immediatActions.slice(0, 3).map((a: any) => a.action),
              shortTerm: serviceAnalysis.aiRecommendations.waterConservation.techniques.slice(0, 3),
              longTerm: serviceAnalysis.aiRecommendations.cropManagement.plantingAdjustments.slice(0, 3)
            },
            actionPlan: serviceAnalysis.aiRecommendations.immediatActions.map((a: any) => ({
              action: a.action,
              priority: a.priority,
              timeline: a.timeline
            })),
            dataQuality: {
              nasaPower: { status: 'success', confidence: serviceAnalysis.historicalContext.confidence, lastUpdate: new Date().toISOString() },
              openMeteo: { status: 'success', confidence: serviceAnalysis.futureOutlook.confidence, forecastRange: '6 months' },
              modelReliability: (serviceAnalysis.historicalContext.confidence + serviceAnalysis.futureOutlook.confidence) / 2
            },
            generatedAt: serviceAnalysis.analysisDate
          };
        } catch (nasaError) {
          console.log('⚠️ NASA POWER unavailable, using fallback drought analysis');
          droughtAnalysis = {
            analysisId: 'fallback-001',
            location: { latitude, longitude },
            currentConditions: {
              pdsi: -1.2,
              spi: -0.8,
              soilMoisture: 0.4,
              precipitationDeficit: 10,
              temperatureAnomaly: 0.5
            },
            riskLevel: 'moderate',
            confidenceScore: 60,
            prediction: {
              timeline: '1-3 months',
              probability: 0.4,
              peakRisk: 'Unknown',
              duration: 'Seasonal'
            },
            recommendations: {
              immediate: ['Monitor local weather reports'],
              shortTerm: ['Prepare for potential dry spells'],
              longTerm: ['Plan for water conservation']
            },
            actionPlan: {
              waterConservation: { priority: 'Medium', strategies: [] },
              cropManagement: { currentSeason: [], nextSeason: [] },
              infrastructurePrep: []
            },
            dataQuality: {
              nasaPower: { status: 'failed', confidence: 0, lastUpdate: new Date().toISOString() },
              openMeteo: { status: 'failed', confidence: 0, forecastRange: '0' },
              modelReliability: 0.4
            },
            generatedAt: new Date()
          };
        }
      }

      if (!droughtAnalysis) {
        return res.status(500).json({ message: "Failed to analyze drought conditions" });
      }

      res.json({ success: true, analysis: droughtAnalysis });
    } catch (error: any) {
      console.error("Error analyzing drought conditions:", error);
      res.status(500).json({ success: false, error: error.message || "Failed to analyze drought conditions" });
    }
  });

  app.get('/api/drought/alerts', isAuthenticated, async (req: any, res) => {
    try {
      const { landId } = req.query;
      if (!landId) return res.json([]);

      const alerts = await storage.getDroughtAlerts(parseInt(landId));
      res.json(alerts);
    } catch (error) {
      console.error("Error fetching drought alerts:", error);
      res.status(500).json({ message: "Failed to fetch drought alerts" });
    }
  });

  // Crop recommendations routes
  app.get('/api/crops/recommendations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const crops = await storage.getCropRecommendations(userId);
      res.json(crops);
    } catch (error) {
      console.error("Error fetching crop recommendations:", error);
      res.status(500).json({ message: "Failed to fetch crop recommendations" });
    }
  });

  app.post('/api/crops/generate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || !user.latitude || !user.longitude) {
        return res.status(400).json({ message: "User location not set" });
      }

      const weather = await getCurrentWeather(user.latitude, user.longitude);
      if (!weather) {
        return res.status(500).json({ message: "Failed to fetch weather data" });
      }

      const recommendations = await generateCropRecommendations(
        user.latitude,
        user.longitude,
        weather
      );

      // Save crop recommendations to database
      for (const crop of recommendations) {
        const plantingDate = new Date();
        plantingDate.setDate(plantingDate.getDate() + 14); // 2 weeks from now

        const cropData: any = {
          userId,
          cropName: crop.cropName,
          confidence: crop.confidence,
          reasoning: crop.reasoning,
          plantingDate,
        };
        await storage.saveCropRecommendation(cropData);
      }

      const savedCrops = await storage.getCropRecommendations(userId);
      res.json(savedCrops);
    } catch (error) {
      console.error("Error generating crop recommendations:", error);
      res.status(500).json({ message: "Failed to generate crop recommendations" });
    }
  });

  // Chat routes
  app.get('/api/chat/history', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const history = await storage.getChatHistory(userId);
      res.json(history);
    } catch (error) {
      console.error("Error fetching chat history:", error);
      res.status(500).json({ message: "Failed to fetch chat history" });
    }
  });

  app.get('/api/chat/history/:landId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const landId = parseInt(req.params.landId);
      const history = await storage.getChatHistory(userId, landId);
      res.json(history);
    } catch (error) {
      console.error("Error fetching chat history:", error);
      res.status(500).json({ message: "Failed to fetch chat history" });
    }
  });

  app.post('/api/chat/send', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { message, landId } = req.body;

      console.log(`📨 Chat request received - User: ${userId}, LandId: ${landId} (${typeof landId})`);

      if (!message || typeof message !== "string") {
        return res.status(400).json({ message: "Message is required" });
      }

      // Parse landId safely
      const parsedLandId = landId ? parseInt(String(landId)) : undefined;
      console.log(`🔢 Parsed LandId: ${parsedLandId}`);

      // Save user message
      const userMessage: any = {
        userId,
        landId: parsedLandId,
        role: "user",
        message,
      };
      await storage.saveChatMessage(userMessage);

      // Get chat history for context (last 10 messages)
      const history = await storage.getChatHistory(userId, parsedLandId);
      const recentHistory = history.slice(-10).map(msg => ({
        role: msg.role as "user" | "assistant",
        content: msg.message,
      }));

      // Get user language preference
      const user = await storage.getUser(userId);
      const userLanguage = user?.language || 'en';

      // Get AI response
      const aiResponse = await chatWithEnhancedAI(message, recentHistory, userId, parsedLandId, userLanguage);

      if (!aiResponse) {
        return res.status(500).json({ message: "Failed to get AI response" });
      }

      // Save AI response
      const aiMessage: any = {
        userId,
        landId: parsedLandId,
        role: "assistant",
        message: aiResponse,
        aiModel: "gemini",
      };
      await storage.saveChatMessage(aiMessage);

      // Return updated history
      const updatedHistory = await storage.getChatHistory(userId, parsedLandId);
      res.json(updatedHistory);
    } catch (error) {
      console.error("Error in chat:", error);
      res.status(500).json({ message: "Failed to process chat message" });
    }
  });

  app.post('/api/enhanced-predictions', isAuthenticated, async (req: any, res) => {
    try {
      const { landId } = req.body;
      console.log(`🚀 Enhanced predictions requested for land ${landId}`);

      if (!landId) {
        return res.status(400).json({ error: 'Land ID is required' });
      }

      // Generate enhanced weather prediction
      const weatherPrediction = await generateLandWeatherPrediction(landId);
      
      // Generate enhanced crop recommendations  
      const cropRecommendations = await generateLandCropRecommendations(landId);
      
      // Generate drought prediction
      const droughtPrediction = await generateLandDroughtPrediction(landId);

      console.log(`✅ Enhanced predictions generated for land ${landId}:`, {
        weather: weatherPrediction ? 'Generated' : 'Failed',
        crops: cropRecommendations ? `${cropRecommendations.length} recommendations` : 'Failed',
        drought: droughtPrediction ? `${droughtPrediction.riskLevel} risk` : 'Failed'
      });

      res.json({
        success: true,
        weatherPrediction,
        cropRecommendations,
        droughtPrediction,
        message: 'Enhanced predictions with drought analysis generated successfully'
      });
    } catch (error: any) {
      console.error('Enhanced predictions error:', error);
      res.status(500).json({ error: 'Failed to generate enhanced predictions' });
    }
  });

  // Settings routes
  app.patch('/api/settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { smsNotifications, emailNotifications, language } = req.body;

      if (typeof smsNotifications !== "boolean" || typeof emailNotifications !== "boolean") {
        return res.status(400).json({ message: "Invalid settings format" });
      }

      await storage.updateUserSettings(userId, smsNotifications, emailNotifications, language);

      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error updating settings:", error);
      res.status(500).json({ message: "Failed to update settings" });
    }
  });

  // Location update routes
  app.post('/api/location/update', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { latitude, longitude } = req.body;

      if (typeof latitude !== "number" || typeof longitude !== "number") {
        return res.status(400).json({ message: "Invalid location format" });
      }

      // Get address from coordinates using Nominatim
      const address = await reverseGeocode(latitude, longitude);

      await storage.updateUserLocation(userId, latitude, longitude, address || undefined);

      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error updating location:", error);
      res.status(500).json({ message: "Failed to update location" });
    }
  });

  app.post('/api/phone/update', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { phoneNumber } = req.body;

      if (!phoneNumber || typeof phoneNumber !== "string") {
        return res.status(400).json({ message: "Phone number is required" });
      }

      await storage.updateUserPhone(userId, phoneNumber);

      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error updating phone:", error);
      res.status(500).json({ message: "Failed to update phone number" });
    }
  });

  // Land Area routes
  app.get('/api/lands', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const lands = await storage.getLandAreas(userId);
      res.json(lands);
    } catch (error) {
      console.error("Error fetching lands:", error);
      res.status(500).json({ message: "Failed to fetch land areas" });
    }
  });

  app.post('/api/lands', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const landData = insertLandAreaSchema.parse({
        ...req.body,
        userId,
      });

      const land = await storage.createLandArea(landData);
      res.status(201).json(land);
    } catch (error) {
      console.error("Error creating land:", error);
      res.status(400).json({ message: "Invalid land data" });
    }
  });

  app.put('/api/lands/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const landId = parseInt(req.params.id);
      
      const existingLand = await storage.getLandArea(landId);
      if (!existingLand || existingLand.userId !== userId) {
        return res.status(404).json({ message: "Land area not found" });
      }

      const updates = insertLandAreaSchema.partial().parse(req.body);
      const updatedLand = await storage.updateLandArea(landId, updates);
      res.json(updatedLand);
    } catch (error) {
      console.error("Error updating land:", error);
      res.status(400).json({ message: "Invalid update data" });
    }
  });

  app.delete('/api/lands/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const landId = parseInt(req.params.id);
      
      const existingLand = await storage.getLandArea(landId);
      if (!existingLand || existingLand.userId !== userId) {
        return res.status(404).json({ message: "Land area not found" });
      }

      await storage.deleteLandArea(landId);
      res.sendStatus(204);
    } catch (error) {
      console.error("Error deleting land:", error);
      res.status(500).json({ message: "Failed to delete land area" });
    }
  });

  // Land-specific predictions
  app.get('/api/lands/:id/predictions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const landId = parseInt(req.params.id);
      const predictions = await storage.getLandPredictions(landId);
      console.log(`📊 Fetching predictions for land ${landId}: found ${predictions.length} records`);
      res.json(predictions);
    } catch (error) {
      console.error("Error fetching land predictions:", error);
      res.status(500).json({ message: "Failed to fetch land predictions" });
    }
  });

  app.post('/api/lands/:id/predictions', isAuthenticated, async (req: any, res) => {
    try {
      const landId = parseInt(req.params.id);
      await generateLandWeatherPrediction(landId);
      const predictions = await storage.getLandPredictions(landId);
      res.json(predictions);
    } catch (error) {
      console.error("Error generating land predictions:", error);
      res.status(500).json({ message: "Failed to generate land predictions" });
    }
  });

  // Land-specific crops
  app.get('/api/lands/:id/crops', isAuthenticated, async (req: any, res) => {
    try {
      const landId = parseInt(req.params.id);
      const crops = await storage.getLandCropRecommendations(landId);
      res.json(crops);
    } catch (error) {
      console.error("Error fetching land crops:", error);
      res.status(500).json({ message: "Failed to fetch land crops" });
    }
  });

  app.post('/api/lands/:id/crops', isAuthenticated, async (req: any, res) => {
    try {
      const landId = parseInt(req.params.id);
      await generateLandCropRecommendations(landId);
      const crops = await storage.getLandCropRecommendations(landId);
      res.json(crops);
    } catch (error) {
      console.error("Error generating land crops:", error);
      res.status(500).json({ message: "Failed to generate land crops" });
    }
  });

  // Land-specific drought - GET endpoint for fetching existing predictions
  app.get('/api/lands/:id/drought', isAuthenticated, async (req: any, res) => {
    try {
      const landId = parseInt(req.params.id);
      const drought = await storage.getLandDroughtPredictions(landId);
      res.json(drought || []);
    } catch (error) {
      console.error("Error fetching land drought:", error);
      res.status(500).json({ message: "Failed to fetch land drought" });
    }
  });

  // Land-specific drought - POST endpoint for generating new predictions
  app.post('/api/lands/:id/drought', isAuthenticated, async (req: any, res) => {
    try {
      const landId = parseInt(req.params.id);
      const drought = await generateLandDroughtPrediction(landId);
      res.json(drought);
    } catch (error) {
      console.error("Error generating land drought:", error);
      res.status(500).json({ message: "Failed to generate land drought" });
    }
  });

  // Manual SMS Notification Route
  app.post('/api/notifications/sms', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { title, message, landId } = req.body;

      if (!title || !message) {
        return res.status(400).json({ message: "Title and message are required" });
      }

      const success = await sendManualSMS(userId, title, message, landId);
      
      if (success) {
        res.json({ message: "SMS sent successfully" });
      } else {
        res.status(500).json({ message: "Failed to send SMS" });
      }
    } catch (error) {
      console.error("Error sending manual SMS:", error);
      res.status(500).json({ message: "Failed to send SMS" });
    }
  });

  // Keep-alive endpoints for preventing automatic shutdown
  app.get("/health", handleHealthCheck);
  app.get("/api/ping", handlePing);

  const httpServer = createServer(app);
  return httpServer;
}
