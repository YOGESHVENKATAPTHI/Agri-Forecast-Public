import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { getCurrentWeather, reverseGeocode, getComprehensiveWeatherAnalysis, getEnhancedCurrentWeather } from "./weatherService";
import { 
  generateEnhancedCropRecommendations, 
  generateEnhancedWeatherPredictions, 
  chatWithEnhancedAI,
  getCentralizedPrediction,
  getAIStats,
  generateLandWeatherPrediction,
  generateLandCropRecommendations,
  generateLandDroughtPrediction
} from "./aiService";
import { ComprehensiveDataService } from "./comprehensiveDataService";
import { sendWeatherAlert, sendCropRecommendationEmail, sendPredictionEmail } from "./notificationService";
import { dataAggregationService } from "./dataAggregationService";
import { enhancedCropRecommendationEngine } from "./enhancedCropRecommendationEngine";
import { enhancedLocationService } from "./enhancedLocationService";
import { translationService } from "./translationService";
import { 
  createTranslationMiddleware, 
  weatherTranslationMiddleware, 
  cropTranslationMiddleware, 
  droughtTranslationMiddleware,
  comprehensiveAnalysisTranslationMiddleware,
  predictionsTranslationMiddleware,
  seasonalForecastTranslationMiddleware,
  universalTranslationMiddleware
} from "./translationMiddleware";
import { droughtMonitoringService } from "./droughtMonitoringService";
import { droughtAlertService } from "./droughtAlertService";
import { intelligentAIManager } from "./intelligentAIManager";
import { keepAliveService, handleHealthCheck, handlePing } from "./keepAliveService";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Apply universal translation middleware to ALL API routes (will check auth inside)
  app.use('/api', universalTranslationMiddleware());

  // Keep-alive and health check routes (no auth required)
  app.get('/api/health', handleHealthCheck);
  app.get('/api/ping', handlePing);
  
  // Keep-alive service status (requires auth)
  app.get('/api/keep-alive/status', isAuthenticated, (req, res) => {
    res.json(keepAliveService.getStatus());
  });

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

  // Enhanced 6-month prediction routes
  app.post('/api/enhanced-predictions/6-month', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { latitude, longitude, landId } = req.body;

      if (!latitude || !longitude) {
        return res.status(400).json({ message: "Coordinates are required" });
      }

      console.log(`🔮 Generating 6-month prediction for land ${landId || 'unknown'}`);
      
      const prediction = await dataAggregationService.get6MonthPrediction(
        latitude, 
        longitude, 
        landId
      );

      res.json({
        success: true,
        prediction,
        generatedAt: new Date().toISOString(),
        validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      });
    } catch (error) {
      console.error("Error generating 6-month prediction:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to generate 6-month prediction",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Enhanced crop recommendations route
  app.post('/api/enhanced-crops/recommendations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { latitude, longitude, landId } = req.body;

      if (!latitude || !longitude) {
        return res.status(400).json({ message: "Coordinates are required" });
      }

      console.log(` Generating enhanced crop recommendations for land ${landId || 'unknown'}`);
      
      const recommendations = await enhancedCropRecommendationEngine.generateRecommendations(
        latitude, 
        longitude, 
        userId,
        landId
      );

      res.json({
        success: true,
        recommendations,
        totalFound: recommendations.length,
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error generating enhanced crop recommendations:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to generate enhanced crop recommendations",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Enhanced location analysis route
  app.post('/api/enhanced-location/analyze', isAuthenticated, async (req: any, res) => {
    try {
      const { latitude, longitude, useGPS = false } = req.body;

      if (!latitude || !longitude) {
        return res.status(400).json({ message: "Coordinates are required" });
      }

      console.log(` Analyzing enhanced location data for: ${latitude}, ${longitude}`);
      
      const locationData = await enhancedLocationService.getEnhancedLocationData(
        latitude, 
        longitude, 
        useGPS
      );

      res.json({
        success: true,
        locationData,
        analysisDate: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error analyzing enhanced location:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to analyze location",
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

      // Automatic email notifications disabled
      // if (landId && result.cropRecommendations && result.cropRecommendations.length > 0) {
      //   try {
      //     const bestCrop = result.cropRecommendations[0];
      //     await sendCropRecommendationEmail(
      //       userId, 
      //       bestCrop.cropName, 
      //       bestCrop.reasoning, 
      //       bestCrop.detailedPlan, 
      //       landId
      //     );
      //   } catch (notificationError) {
      //     console.warn("Failed to send enhanced notification:", notificationError);
      //   }
      // }

      res.json(result);
    } catch (error) {
      console.error("Error performing complete enhanced analysis:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to perform complete analysis",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Weather routes - now supports land-specific weather and enhanced mode
  app.get('/api/weather/current', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { landId, enhanced } = req.query;

      let latitude: number, longitude: number, locationName = "User Location";

      if (landId) {
        // Get weather for specific land
        const land = await storage.getLandAreaById(parseInt(landId as string));
        if (!land || land.userId !== userId) {
          return res.status(404).json({ message: "Land not found" });
        }
        latitude = land.latitude;
        longitude = land.longitude;
        locationName = land.name;
      } else {
        // Fall back to user location
        const user = await storage.getUser(userId);
        if (!user || !user.latitude || !user.longitude) {
          return res.status(400).json({ message: "User location not set" });
        }
        latitude = user.latitude;
        longitude = user.longitude;
      }

      // Use enhanced weather service if enhanced=true
      const weather = enhanced === 'true' 
        ? await getEnhancedCurrentWeather(latitude, longitude)
        : await getCurrentWeather(latitude, longitude);
        
      if (!weather) {
        return res.status(500).json({ message: "Failed to fetch weather data" });
      }

      // Get user language preference for translation
      const user = await storage.getUser(userId);
      const userLanguage = user?.language || 'en';
      
      // Add location context to response
      const weatherWithContext = {
        ...weather,
        locationName,
        landId: landId ? parseInt(landId as string) : null
      };
      
      // Translate weather data if not English
      const translatedWeather = await translationService.translateWeatherData(
        weatherWithContext, 
        userLanguage
      );

      res.json(translatedWeather);
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
      );      res.json({
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

      const predictions = await generateEnhancedWeatherPredictions(weather, userId);

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
          // Get user's main land for notification context
          const userLands = await storage.getLandAreas(userId);
          const mainLand = userLands.find(land => land.isMainLand);
          await sendWeatherAlert(userId, pred.title, pred.description, mainLand?.id);
        }
      }

      const savedPredictions = await storage.getPredictions(userId);
      res.json(savedPredictions);
    } catch (error) {
      console.error("Error generating predictions:", error);
      res.status(500).json({ message: "Failed to generate predictions" });
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

      const recommendations = await generateEnhancedCropRecommendations(
        user.latitude,
        user.longitude,
        weather,
        userId
      );

      // Save crop recommendations to database - use land-specific table if landId is provided
      const { landId } = req.body;
      for (const crop of recommendations) {
        const plantingDate = new Date();
        plantingDate.setDate(plantingDate.getDate() + 14); // 2 weeks from now

        if (landId) {
          // Save to land-specific crop recommendations table
          const landCropData: any = {
            landId: parseInt(landId),
            userId,
            cropName: crop.cropName,
            confidence: crop.confidence,
            reasoning: crop.reasoning,
            detailedPlan: crop.detailedPlan,
            plantingDate,
            irrigationNeeds: crop.detailedPlan?.match(/Irrigation: ([^.]*)/)?.[1] || "Regular irrigation based on soil moisture",
            fertilizerNeeds: crop.detailedPlan?.match(/Fertilization: ([^.]*)/)?.[1] || "Balanced NPK fertilizer",
            expectedYield: crop.detailedPlan?.match(/Expected Yield: ([^.]*)/)?.[1] || "Varies by conditions",
            risks: "Monitor for pests and weather changes",
          };
          await storage.saveLandCropRecommendation(landCropData);
        } else {
          // Save to global crop recommendations table
          const globalCropData: any = {
            userId,
            cropName: crop.cropName,
            confidence: crop.confidence,
            reasoning: crop.reasoning,
            plantingDate,
            irrigationNeeds: crop.detailedPlan?.match(/Irrigation: ([^.]*)/)?.[1] || "Regular irrigation based on soil moisture",
            fertilizerNeeds: crop.detailedPlan?.match(/Fertilization: ([^.]*)/)?.[1] || "Balanced NPK fertilizer",
            expectedYield: crop.detailedPlan?.match(/Expected Yield: ([^.]*)/)?.[1] || "Varies by conditions",
            risks: "Monitor for pests and weather changes",
          };
          await storage.saveCropRecommendation(globalCropData);
        }
      }

      const savedCrops = landId 
        ? await storage.getLandCropRecommendations(parseInt(landId))
        : await storage.getCropRecommendations(userId);
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
      const { landId } = req.params;
      const history = await storage.getLandChatHistory(parseInt(landId));
      res.json(history);
    } catch (error) {
      console.error("Error fetching land chat history:", error);
      res.status(500).json({ message: "Failed to fetch land chat history" });
    }
  });

  app.post('/api/chat/send', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { message, landId } = req.body;

      if (!message || typeof message !== "string") {
        return res.status(400).json({ message: "Message is required" });
      }

      // Save user message
      if (landId) {
          userId,
          landId: parseInt(landId),
          role: "user",
          message,
        });
      } else {
          userId,
          role: "user",
          message,
        });
      }

      // Get chat history for context (last 10 messages)
      let recentHistory;
      if (landId) {
        const history = await storage.getLandChatHistory(parseInt(landId));
        recentHistory = history.slice(-10).map(msg => ({
          role: msg.role as "user" | "assistant",
          content: msg.message,
        }));
      } else {
        const history = await storage.getChatHistory(userId);
        recentHistory = history.slice(-10).map(msg => ({
          role: msg.role as "user" | "assistant",
          content: msg.message,
        }));
      }

      // Get AI response with enhanced context
      const aiResponse = await chatWithEnhancedAI(message, recentHistory, userId, landId ? parseInt(landId) : undefined);

      if (!aiResponse) {
        return res.status(500).json({ message: "Failed to get AI response" });
      }

      // Save AI response
      if (landId) {
          userId,
          landId: parseInt(landId),
          role: "assistant",
          message: aiResponse,
          aiModel: "amazon/nova-2-lite-v1:free",
        });
      } else {
          userId,
          role: "assistant",
          message: aiResponse,
          aiModel: "amazon/nova-2-lite-v1:free",
        });
      }

      // Return updated history
      if (landId) {
        const updatedHistory = await storage.getLandChatHistory(parseInt(landId));
        res.json(updatedHistory);
      } else {
        const updatedHistory = await storage.getChatHistory(userId);
        res.json(updatedHistory);
      }
    } catch (error) {
      console.error("Error in chat:", error);
      res.status(500).json({ message: "Failed to process chat message" });
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

  // Manual SMS sending endpoint
  app.post('/api/send-sms', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { title, message } = req.body;

      if (!title || !message) {
        return res.status(400).json({ message: "Title and message are required" });
      }

      const { sendManualSMS } = await import('./notificationService');
      const { landId } = req.body;
      const sent = await sendManualSMS(userId, title, message, landId);

      if (sent) {
        res.json({ success: true, message: "SMS sent successfully" });
      } else {
        res.status(500).json({ success: false, message: "Failed to send SMS" });
      }
    } catch (error: any) {
      console.error("Error sending manual SMS:", error);
      res.status(500).json({ success: false, message: error.message || "Failed to send SMS" });
    }
  });

  // SMS Testing and Debug endpoint
  app.post('/api/test-sms', isAuthenticated, async (req: any, res) => {
    try {
      const { phoneNumber, testMessage } = req.body;
      
      if (!phoneNumber) {
        return res.status(400).json({ error: 'Phone number is required' });
      }

      console.log(`🧪 Testing SMS to: ${phoneNumber}`);
      
      const { sendSMS, checkSMSStatus } = await import('./notificationService');
      
      // Send test SMS with carrier-friendly content
      const message = testMessage || `AgriPredict Test ${new Date().toLocaleTimeString()}. SMS working!`;
      
      console.log(`📤 Sending test SMS...`);
      const sent = await sendSMS(phoneNumber, message);
      
      if (sent) {
        // Give some tips for debugging
        console.log(`✅ SMS Test Result: API call successful`);
        console.log(`💡 Debugging Tips:`);
        console.log(`   1. Check if your Twilio account is trial (needs verified numbers)`);
        console.log(`   2. Verify India region is enabled in Twilio Console`);
        console.log(`   3. Check your phone for the message (may take 1-2 minutes)`);
        console.log(`   4. Verify your Auth Token is correct (not API Key)`);
        
        res.json({ 
          success: true, 
          message: "SMS API call successful - check your phone and console logs for delivery details",
          tips: [
            "If trial account: Add phone number to verified numbers in Twilio Console",
            "Enable India region in Twilio Console → Messaging → Geo Permissions", 
            "Check phone for message (may take 1-2 minutes)",
            "Verify Auth Token is correct in environment variables"
          ]
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: "SMS API call failed - check server logs for details"
        });
      }
      
    } catch (error: any) {
      console.error("❌ SMS Test Error:", error);
      res.status(500).json({ 
        success: false, 
        message: error.message || "SMS test failed",
        error: error.toString()
      });
    }
  });

  // Enhanced prediction endpoint using multiple AI models
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

  // AI system statistics endpoint
  app.get('/api/ai-stats', isAuthenticated, async (req: any, res) => {
    try {
      const stats = getAIStats();
      res.json({
        success: true,
        stats: {
          apiKeysStatus: stats.apiKeys,
          availableModels: stats.availableModels,
          systemHealth: "operational"
        }
      });
    } catch (error: any) {
      console.error("❌ Error fetching AI stats:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Enhanced predictions with comprehensive analysis including drought
  app.post('/api/enhanced-predictions-v2', isAuthenticated, async (req: any, res) => {
    try {
      const { landId } = req.body;
      console.log(`🚀 Enhanced predictions v2 requested for land ${landId}`);

      if (!landId) {
        return res.status(400).json({ error: 'Land ID is required' });
      }

      // Generate enhanced weather prediction
      const weatherPrediction = await generateLandWeatherPrediction(landId);
      
      // Generate enhanced crop recommendations  
      const cropRecommendations = await generateLandCropRecommendations(landId);
      
      // Generate drought prediction
      const droughtPrediction = await generateLandDroughtPrediction(landId);

      console.log(`✅ Enhanced predictions v2 generated for land ${landId}:`, {
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
      console.error('Enhanced predictions v2 error:', error);
      res.status(500).json({ error: 'Failed to generate enhanced predictions with drought analysis' });
    }
  });

  // Send comprehensive email notifications after predictions generation
  app.post('/api/send-prediction-emails', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { landId, weatherPrediction, cropRecommendations, droughtPrediction } = req.body;
      
      console.log(`📧 Sending prediction emails for user ${userId}, land ${landId}`);
      
      const emailPromises = [];
      
      // Send weather prediction email
      if (weatherPrediction) {
        const weatherEmailPromise = sendPredictionEmail(
          userId,
          `🌤️ Weather Forecast: ${weatherPrediction.title}`,
          `**Weather Prediction Generated**\n\n${weatherPrediction.description}\n\n**Confidence:** ${weatherPrediction.confidence}%\n**Model:** ${weatherPrediction.aiModel}\n**Generated:** ${new Date().toLocaleString()}`,
          landId
        );
        emailPromises.push(weatherEmailPromise);
      }
      
      // Send crop recommendations emails
      if (cropRecommendations && cropRecommendations.length > 0) {
        for (const crop of cropRecommendations) {
          const cropEmailPromise = sendCropRecommendationEmail(
            userId,
            crop.cropName,
            crop.reasoning,
            crop.detailedPlan,
            landId
          );
          emailPromises.push(cropEmailPromise);
        }
      }
      
      // Send drought prediction email
      if (droughtPrediction) {
        const droughtContent = `**Drought Risk Analysis**\n\n**Risk Level:** ${droughtPrediction.riskLevel.toUpperCase()}\n**Probability:** ${droughtPrediction.probability}%\n**Timeframe:** ${droughtPrediction.timeframe}\n\n**Analysis:**\n${droughtPrediction.analysis || 'Comprehensive drought analysis completed.'}\n\n**Recommendations:**\n${droughtPrediction.recommendations || 'Standard drought mitigation practices recommended.'}\n\n**Action Plan:**\n${droughtPrediction.actionPlan || 'Detailed action plan available in your dashboard.'}\n\n**Generated:** ${new Date().toLocaleString()}`;
        
        const droughtEmailPromise = sendPredictionEmail(
          userId,
          ` Drought Alert: ${droughtPrediction.riskLevel.toUpperCase()} Risk`,
          droughtContent,
          landId
        );
        emailPromises.push(droughtEmailPromise);
      }
      
      // Send all emails concurrently
      const emailResults = await Promise.allSettled(emailPromises);
      
      const successCount = emailResults.filter(result => result.status === 'fulfilled' && result.value).length;
      const totalEmails = emailResults.length;
      
      console.log(`📧 Email notifications: ${successCount}/${totalEmails} sent successfully`);
      
      res.json({
        success: true,
        emailsSent: successCount,
        totalEmails: totalEmails,
        message: `${successCount} of ${totalEmails} email notifications sent successfully`
      });
      
    } catch (error: any) {
      console.error("❌ Error sending prediction emails:", error);
      res.status(500).json({ 
        success: false, 
        error: error.message || "Failed to send prediction emails" 
      });
    }
  });

  // Land management routes
  app.get('/api/lands', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const lands = await storage.getLandAreas(userId);
      res.json(lands);
    } catch (error) {
      console.error("Error fetching lands:", error);
      res.status(500).json({ message: "Failed to fetch lands" });
    }
  });

  app.post('/api/lands', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { name, latitude, longitude, area, soilType, currentCrop, description } = req.body;

      if (!name || typeof latitude !== "number" || typeof longitude !== "number") {
        return res.status(400).json({ message: "Name, latitude, and longitude are required" });
      }

      // Get address from coordinates
      const address = await reverseGeocode(latitude, longitude);

        userId,
        name,
        latitude,
        longitude,
        address: address || `${latitude}, ${longitude}`,
        area: area || null,
        soilType: soilType || null,
        currentCrop: currentCrop || null,
        description: description || null
      });

      const land = await storage.getLandAreaById(landId);
      res.json(land);
    } catch (error) {
      console.error("Error creating land:", error);
      res.status(500).json({ message: "Failed to create land" });
    }
  });

  app.put('/api/lands/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const landId = parseInt(req.params.id);
      const { name, latitude, longitude, area, soilType, currentCrop, description } = req.body;

      if (!name || typeof latitude !== "number" || typeof longitude !== "number") {
        return res.status(400).json({ message: "Name, latitude, and longitude are required" });
      }

      // Verify land belongs to user
      const existingLand = await storage.getLandAreaById(landId);
      if (!existingLand || existingLand.userId !== userId) {
        return res.status(404).json({ message: "Land not found" });
      }

      // Get address from coordinates if they changed
      let address = existingLand.address;
      if (latitude !== existingLand.latitude || longitude !== existingLand.longitude) {
        address = await reverseGeocode(latitude, longitude) || `${latitude}, ${longitude}`;
      }

        name,
        latitude,
        longitude,
        address,
        area: area || null,
        soilType: soilType || null,
        currentCrop: currentCrop || null,
        description: description || null
      });

      const updatedLand = await storage.getLandAreaById(landId);
      res.json(updatedLand);
    } catch (error) {
      console.error("Error updating land:", error);
      res.status(500).json({ message: "Failed to update land" });
    }
  });

  app.delete('/api/lands/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const landId = parseInt(req.params.id);

      // Verify land belongs to user
      const existingLand = await storage.getLandAreaById(landId);
      if (!existingLand || existingLand.userId !== userId) {
        return res.status(404).json({ message: "Land not found" });
      }

      await storage.deleteLandArea(landId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting land:", error);
      res.status(500).json({ message: "Failed to delete land" });
    }
  });

  // Get land-specific predictions
  app.get('/api/lands/:id/predictions', isAuthenticated, predictionsTranslationMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const landId = parseInt(req.params.id);

      // Verify land belongs to user
      const land = await storage.getLandAreaById(landId);
      if (!land || land.userId !== userId) {
        return res.status(404).json({ message: "Land not found" });
      }

      const predictions = await storage.getLandPredictions(landId);
      res.json(predictions);
    } catch (error) {
      console.error("Error fetching land predictions:", error);
      res.status(500).json({ message: "Failed to fetch land predictions" });
    }
  });

  // Get land-specific crop recommendations
  app.get('/api/lands/:id/crops', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const landId = parseInt(req.params.id);

      // Verify land belongs to user
      const land = await storage.getLandAreaById(landId);
      if (!land || land.userId !== userId) {
        return res.status(404).json({ message: "Land not found" });
      }

      const crops = await storage.getLandCropRecommendations(landId);
      
      // Get user language preference for translation
      const user = await storage.getUser(userId);
      const userLanguage = user?.language || 'en';
      
      // Translate crop recommendations if not English
      const translatedCrops = await translationService.translateCropRecommendations(
        crops, 
        userLanguage
      );
      
      res.json(translatedCrops);
    } catch (error) {
      console.error("Error fetching land crop recommendations:", error);
      res.status(500).json({ message: "Failed to fetch land crop recommendations" });
    }
  });

  // Land-specific predictions
  app.post('/api/lands/:id/predictions', isAuthenticated, predictionsTranslationMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const landId = parseInt(req.params.id);

      // Verify land belongs to user
      const land = await storage.getLandAreaById(landId);
      if (!land || land.userId !== userId) {
        return res.status(404).json({ message: "Land not found" });
      }

      const weather = await getCurrentWeather(land.latitude, land.longitude);
      if (!weather) {
        return res.status(500).json({ message: "Failed to fetch weather data" });
      }

      const predictions = await generateEnhancedWeatherPredictions(weather, userId, landId);

      // Save land-specific predictions and send email notifications
      for (const pred of predictions) {
        const predictionDate = new Date();
        predictionDate.setDate(predictionDate.getDate() + 3);

          landId,
          predictionType: "weather",
          title: pred.title,
          description: pred.description,
          confidence: pred.confidence,
          predictionDate,
          aiModel: "enhanced-multi-model",
          severity: pred.severity,
        });

        // Send email notification for each weather prediction
        await sendWeatherAlert(userId, pred.title, pred.description, landId);
      }

      const savedPredictions = await storage.getLandPredictions(landId);
      res.json(savedPredictions);
    } catch (error) {
      console.error("Error generating land predictions:", error);
      res.status(500).json({ message: "Failed to generate land predictions" });
    }
  });

  // Land-specific crop recommendations
  app.post('/api/lands/:id/crops', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const landId = parseInt(req.params.id);

      // Verify land belongs to user
      const land = await storage.getLandAreaById(landId);
      if (!land || land.userId !== userId) {
        return res.status(404).json({ message: "Land not found" });
      }

      const weather = await getCurrentWeather(land.latitude, land.longitude);
      if (!weather) {
        return res.status(500).json({ message: "Failed to fetch weather data" });
      }

      const recommendations = await generateEnhancedCropRecommendations(
        land.latitude,
        land.longitude,
        weather,
        userId,
        landId
      );

      // Save land-specific crop recommendations and send email notifications
      for (const crop of recommendations) {
        const plantingDate = new Date();
        plantingDate.setDate(plantingDate.getDate() + 14);

          landId,
          cropName: crop.cropName,
          confidence: crop.confidence,
          reasoning: crop.reasoning,
          plantingDate,
          irrigationNeeds: crop.detailedPlan?.match(/IRRIGATION: ([^.]*)/)?.[1] || "Regular irrigation",
          fertilizerNeeds: crop.detailedPlan?.match(/FERTILIZATION: ([^.]*)/)?.[1] || "Balanced NPK",
          expectedYield: crop.detailedPlan?.match(/EXPECTED YIELD: ([^.]*)/)?.[1] || "Varies by conditions",
          risks: "Monitor weather and pests",
        });

        // Automatic email notifications disabled  
        // await sendCropRecommendationEmail(userId, crop.cropName, crop.reasoning, crop.detailedPlan, landId);
      }

      const savedCrops = await storage.getLandCropRecommendations(landId);
      res.json(savedCrops);
    } catch (error) {
      console.error("Error generating land crop recommendations:", error);
      res.status(500).json({ message: "Failed to generate land crop recommendations" });
    }
  });

  // Get land-specific drought predictions
  app.get('/api/lands/:id/drought', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const landId = parseInt(req.params.id);

      // Verify land belongs to user
      const land = await storage.getLandAreaById(landId);
      if (!land || land.userId !== userId) {
        return res.status(404).json({ message: "Land not found" });
      }

      const droughtPredictions = await storage.getLandDroughtPredictions(landId);
      
      // Get user language preference for translation
      const user = await storage.getUser(userId);
      const userLanguage = user?.language || 'en';
      
      // Translate drought predictions if not English
      const translatedPredictions = await Promise.all(
        droughtPredictions.map(prediction => 
          translationService.translateDroughtAnalysis(prediction, userLanguage)
        )
      );
      
      res.json(translatedPredictions);
    } catch (error) {
      console.error('Get land drought predictions error:', error);
      res.status(500).json({ error: 'Failed to fetch drought predictions' });
    }
  });

  // Generate drought prediction for specific land
  app.post('/api/lands/:id/drought', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const landId = parseInt(req.params.id);

      // Verify land belongs to user
      const land = await storage.getLandAreaById(landId);
      if (!land || land.userId !== userId) {
        return res.status(404).json({ message: "Land not found" });
      }

      const droughtPrediction = await generateLandDroughtPrediction(landId);
      res.json(droughtPrediction);
    } catch (error) {
      console.error('Generate land drought prediction error:', error);
      res.status(500).json({ error: 'Failed to generate drought prediction' });
    }
  });

  // Set main land
  app.post('/api/lands/:id/set-main', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const landId = parseInt(req.params.id);

      // Verify land belongs to user
      const land = await storage.getLandAreaById(landId);
      if (!land || land.userId !== userId) {
        return res.status(404).json({ message: "Land not found" });
      }

      await storage.setMainLand(userId, landId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error setting main land:", error);
      res.status(500).json({ message: "Failed to set main land" });
    }
  });

  // Add crop to history
  app.post('/api/lands/:id/crop-history', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const landId = parseInt(req.params.id);
      const { cropName, plantingDate, harvestDate } = req.body;

      if (!cropName || !plantingDate) {
        return res.status(400).json({ message: "Crop name and planting date are required" });
      }

      // Verify land belongs to user
      const land = await storage.getLandAreaById(landId);
      if (!land || land.userId !== userId) {
        return res.status(404).json({ message: "Land not found" });
      }

      await storage.addCropToHistory(
        landId, 
        cropName, 
        new Date(plantingDate), 
        harvestDate ? new Date(harvestDate) : undefined
      );

      res.json({ success: true });
    } catch (error) {
      console.error("Error adding crop to history:", error);
      res.status(500).json({ message: "Failed to add crop to history" });
    }
  });

  // Land-specific chat
  app.get('/api/lands/:id/chat', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const landId = parseInt(req.params.id);

      // Verify land belongs to user
      const land = await storage.getLandAreaById(landId);
      if (!land || land.userId !== userId) {
        return res.status(404).json({ message: "Land not found" });
      }

      const history = await storage.getLandChatHistory(landId);
      res.json(history);
    } catch (error) {
      console.error("Error fetching land chat history:", error);
      res.status(500).json({ message: "Failed to fetch land chat history" });
    }
  });

  app.post('/api/lands/:id/chat', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const landId = parseInt(req.params.id);
      const { message } = req.body;

      if (!message || typeof message !== "string") {
        return res.status(400).json({ message: "Message is required" });
      }

      // Verify land belongs to user
      const land = await storage.getLandAreaById(landId);
      if (!land || land.userId !== userId) {
        return res.status(404).json({ message: "Land not found" });
      }

      // Save user message
        landId,
        role: "user",
        message,
      });

      // Get chat history for context
      const history = await storage.getLandChatHistory(landId);
      const recentHistory = history.slice(-10).map(msg => ({
        role: msg.role as "user" | "assistant",
        content: msg.message,
      }));

      // Get AI response with land-specific context
      const aiResponse = await chatWithEnhancedAI(message, recentHistory, userId, landId);

      if (!aiResponse) {
        return res.status(500).json({ message: "Failed to get AI response" });
      }

      // Save AI response
        landId,
        role: "assistant",
        message: aiResponse,
        aiModel: "enhanced-multi-model",
      });

      // Return updated history
      const updatedHistory = await storage.getLandChatHistory(landId);
      res.json(updatedHistory);
    } catch (error) {
      console.error("Error in land chat:", error);
      res.status(500).json({ message: "Failed to process land chat message" });
    }
  });

  // Test endpoints for debugging
  app.post('/api/test-ai', isAuthenticated, async (req: any, res) => {
    try {
      const { callAI } = await import('./aiService');
      
      console.log("Testing AI service...");
      console.log("OPENROUTER_API_KEY exists:", !!process.env.OPENROUTER_API_KEY);
      console.log("API Key preview:", process.env.OPENROUTER_API_KEY?.substring(0, 15) + "...");
      
      const testMessage = [
        { role: "system" as const, content: "You are an agricultural AI assistant." },
        { role: "user" as const, content: "Hello, can you help me with farming advice?" }
      ];
      
      const response = await getCentralizedPrediction(testMessage);
      
      if (response) {
        res.json({ success: true, response });
      } else {
        res.status(500).json({ success: false, error: "AI returned null response" });
      }
    } catch (error: any) {
      console.error("AI test error:", error);
      res.status(500).json({ success: false, error: error.message || "Unknown error" });
    }
  });

  app.post('/api/generate-predictions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || !user.latitude || !user.longitude) {
        return res.status(400).json({ message: "User location not set" });
      }

      console.log("Generating predictions for user:", userId);
      console.log("User location:", user.latitude, user.longitude);

      const weather = await getCurrentWeather(user.latitude, user.longitude);
      if (!weather) {
        return res.status(500).json({ message: "Failed to fetch weather data" });
      }

      console.log("Weather data fetched successfully");

      const predictions = await generateEnhancedWeatherPredictions(weather, userId);
      console.log("Generated predictions:", predictions.length);

      // Save predictions to database
      for (const pred of predictions) {
        const predictionDate = new Date();
        predictionDate.setDate(predictionDate.getDate() + 3);

          userId,
          predictionType: "weather",
          title: pred.title,
          description: pred.description,
          confidence: pred.confidence,
          predictionDate,
          aiModel: "gemini",
          severity: pred.severity,
        });

        // Send alert if severity is high or critical
        if (pred.severity === "high" || pred.severity === "critical") {
          // Get user's main land for notification context
          const userLands = await storage.getLandAreas(userId);
          const mainLand = userLands.find(land => land.isMainLand);
          await sendWeatherAlert(userId, pred.title, pred.description, mainLand?.id);
        }
      }

      const savedPredictions = await storage.getPredictions(userId);
      res.json({ success: true, predictions: savedPredictions });
    } catch (error: any) {
      console.error("Error generating predictions:", error);
      res.status(500).json({ success: false, error: error.message || "Failed to generate predictions" });
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

      // Get drought predictions from our database instead of NASA POWER
      let droughtAnalysis;
      if (landId) {
        // Use saved drought predictions from our AI models
        const savedDroughtPredictions = await storage.getLandDroughtPredictions(landId);
        if (savedDroughtPredictions && savedDroughtPredictions.length > 0) {
          const latestPrediction = savedDroughtPredictions[0]; // Most recent
          
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
              immediate: serviceAnalysis.aiRecommendations.immediatActions.slice(0, 3).map(a => a.action),
              shortTerm: serviceAnalysis.aiRecommendations.waterConservation.techniques.slice(0, 3),
              longTerm: serviceAnalysis.aiRecommendations.cropManagement.plantingAdjustments.slice(0, 3)
            },
            actionPlan: serviceAnalysis.aiRecommendations.immediatActions.map(a => ({
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

      // Send alert if conditions warrant it
      if (["Orange", "Red", "Emergency"].includes(droughtAnalysis.alertLevel)) {
        console.log(`🚨 Sending drought alert for ${droughtAnalysis.alertLevel} conditions`);
        await droughtAlertService.sendDroughtAlert(droughtAnalysis);
      }

      res.json({ 
        success: true, 
        analysis: droughtAnalysis,
        alertSent: ["Orange", "Red", "Emergency"].includes(droughtAnalysis.alertLevel)
      });

    } catch (error: any) {
      console.error("Error analyzing drought conditions:", error);
      res.status(500).json({ success: false, error: error.message || "Failed to analyze drought" });
    }
  });

  app.get('/api/drought/alerts/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const requestingUserId = req.user.claims.sub;

      // Security check - users can only access their own alerts
      if (userId !== requestingUserId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const activeAlerts = await droughtAlertService.getActiveDroughtAlerts(userId);
      res.json({ success: true, alerts: activeAlerts });

    } catch (error: any) {
      console.error("Error fetching drought alerts:", error);
      res.status(500).json({ success: false, error: error.message || "Failed to fetch alerts" });
    }
  });

  app.post('/api/drought/preferences', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const preferences = req.body;

      await droughtAlertService.updateAlertPreferences(userId, preferences);
      
      res.json({ 
        success: true, 
        message: "Drought alert preferences updated successfully" 
      });

    } catch (error: any) {
      console.error("Error updating drought preferences:", error);
      res.status(500).json({ success: false, error: error.message || "Failed to update preferences" });
    }
  });

  // AI Model Management Routes
  app.get('/api/ai/models/stats', isAuthenticated, async (req: any, res) => {
    try {
      const stats = intelligentAIManager.getModelStatistics();
      res.json({ success: true, stats });
    } catch (error: any) {
      console.error("Error getting AI model stats:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/ai/intelligent-request', isAuthenticated, async (req: any, res) => {
    try {
      const { taskType, messages, options } = req.body;
      
      if (!taskType || !messages) {
        return res.status(400).json({ message: "Task type and messages are required" });
      }

      const response = await intelligentAIManager.executeIntelligentRequest(
        taskType,
        messages,
        options || {}
      );

      res.json({ success: true, response });

    } catch (error: any) {
      console.error("Error executing intelligent AI request:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Enhanced AI Stats Route
  app.get('/api/ai/comprehensive-stats', isAuthenticated, async (req: any, res) => {
    try {
      const aiStats = getAIStats();
      res.json({ success: true, stats: aiStats });
    } catch (error: any) {
      console.error("Error getting comprehensive AI stats:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
