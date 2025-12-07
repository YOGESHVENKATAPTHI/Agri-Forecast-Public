import { storage } from "./storage";
import { getCurrentWeather } from "./weatherService";
import { generateWeatherPredictions, generateCropRecommendations } from "./aiService";
import { sendWeatherAlert } from "./notificationService";
import { droughtMonitoringService } from "./droughtMonitoringService";
import { droughtAlertService } from "./droughtAlertService";
import { db } from "./db";
import { users, landAreas } from "../shared/schema";
import { sql } from "drizzle-orm";

export function performBackgroundAnalysis() {
  console.log("🤖 Starting enhanced background analysis system...");

  // Main analysis loop - every 6 hours for regular monitoring
  setInterval(async () => {
    try {
      console.log("📊 Starting comprehensive background analysis...");

      // Get all users with locations and their land areas
      const usersWithData = await getAllUsersWithLocations();
      const landAreasForAnalysis = await getAllLandAreas();

      console.log(`Found ${usersWithData.length} users and ${landAreasForAnalysis.length} land areas for analysis`);

      // Process each user location
      for (const user of usersWithData) {
        try {
          if (!user.latitude || !user.longitude) continue;

          await processUserLocation(user);
          
          // Small delay between users to prevent API rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error) {
          console.error(`Error analyzing user ${user.id}:`, error);
        }
      }

      // Process each land area for detailed drought analysis
      for (const land of landAreasForAnalysis) {
        try {
          if (!land.latitude || !land.longitude) continue;

          await processLandArea(land);
          
          // Small delay between lands to prevent API rate limiting
          await new Promise(resolve => setTimeout(resolve, 1500));

        } catch (error) {
          console.error(`Error analyzing land ${land.id}:`, error);
        }
      }

      console.log("✅ Comprehensive background analysis completed.");
    } catch (error) {
      console.error("💥 Error in background analysis:", error);
    }
  }, 6 * 60 * 60 * 1000); // 6 hours

  // Intensive drought monitoring - every 2 hours during high-risk periods
  setInterval(async () => {
    try {
      console.log("🚨 Starting intensive drought monitoring...");
      await performIntensiveDroughtMonitoring();
    } catch (error) {
      console.error("💥 Error in intensive drought monitoring:", error);
    }
  }, 2 * 60 * 60 * 1000); // 2 hours

  // Daily comprehensive drought analysis
  setInterval(async () => {
    try {
      console.log(" Starting daily comprehensive drought analysis...");
      await performDailyDroughtAnalysis();
    } catch (error) {
      console.error("💥 Error in daily drought analysis:", error);
    }
  }, 24 * 60 * 60 * 1000); // 24 hours
}

/**
 * Process individual user location for weather and basic drought monitoring
 */
async function processUserLocation(user: any): Promise<void> {
  try {
    console.log(`🔍 Processing user location: ${user.id} at ${user.latitude}, ${user.longitude}`);

    // Fetch latest weather data
    const weather = await getCurrentWeather(user.latitude, user.longitude);
    if (!weather) return;

    // Generate weather predictions
    const predictions = await generateWeatherPredictions(weather);

    // Save predictions and check for alerts
    for (const pred of predictions) {
      const predictionDate = new Date();
      predictionDate.setDate(predictionDate.getDate() + 3);

      const predictionData: any = {
        userId: user.id,
        predictionType: "weather",
        title: pred.title,
        description: pred.description,
        confidence: pred.confidence,
        predictionDate,
        aiModel: "background",
        severity: pred.severity,
      };
      await storage.savePrediction(predictionData);

      // Send alert if high severity
      if (pred.severity === "high" || pred.severity === "critical") {
        await sendWeatherAlert(user.id, pred.title, pred.description);
      }
    }

    // Basic drought monitoring for user location
    if (shouldCheckForDrought(weather)) {
      console.log(` Checking drought conditions for user ${user.id}`);
      
      try {
        const droughtAnalysis = await droughtMonitoringService.analyzeDroughtConditions(
          user.latitude,
          user.longitude
        );

        if (droughtAnalysis && shouldSendDroughtAlert(droughtAnalysis)) {
          await droughtAlertService.sendDroughtAlert(droughtAnalysis);
          console.log(`🚨 Drought alert sent for user ${user.id}`);
        }

      } catch (droughtError) {
        console.error(`Error in drought analysis for user ${user.id}:`, droughtError);
      }
    }

    // Regenerate crop recommendations if needed (monthly)
    const lastCropRec = await getLastCropRecommendation(user.id);
    const daysSinceLast = lastCropRec && lastCropRec.createdAt ? 
      (Date.now() - lastCropRec.createdAt.getTime()) / (1000 * 60 * 60 * 24) : 999;

    if (daysSinceLast > 30) {
      console.log(`🌱 Updating crop recommendations for user ${user.id}`);
      
      const recommendations = await generateCropRecommendations(
        user.latitude,
        user.longitude,
        weather
      );

      for (const crop of recommendations) {
        const plantingDate = new Date();
        plantingDate.setDate(plantingDate.getDate() + 14);

        const cropData: any = {
          userId: user.id,
          cropName: crop.cropName,
          confidence: crop.confidence,
          reasoning: crop.reasoning,
          plantingDate,
          irrigationNeeds: crop.detailedPlan?.match(/Irrigation: ([^.]*)/)?.[1] || "Regular irrigation",
          fertilizerNeeds: crop.detailedPlan?.match(/Fertilization: ([^.]*)/)?.[1] || "Balanced fertilizer",
          expectedYield: crop.detailedPlan?.match(/Expected Yield: ([^.]*)/)?.[1] || "Varies",
          risks: "Monitor conditions",
        };
        await storage.saveCropRecommendation(cropData);
      }
    }

  } catch (error) {
    console.error(`Error processing user location ${user.id}:`, error);
  }
}

/**
 * Process individual land area for comprehensive drought analysis
 */
async function processLandArea(land: any): Promise<void> {
  try {
    console.log(`Processing land area: ${land.name} (${land.id}) at ${land.latitude}, ${land.longitude}`);

    // Comprehensive drought analysis for this specific land
    const droughtAnalysis = await droughtMonitoringService.analyzeDroughtConditions(
      land.latitude,
      land.longitude,
      land.id
    );

    if (droughtAnalysis) {
      console.log(`Drought analysis completed for land ${land.name}: ${droughtAnalysis.alertLevel} level`);

      // Send alerts if conditions warrant it
      if (shouldSendDroughtAlert(droughtAnalysis)) {
        await droughtAlertService.sendDroughtAlert(droughtAnalysis);
        console.log(`Drought alert sent for land ${land.name}`);
      }

      // Store analysis results for historical tracking
      const droughtPrediction: any = {
        userId: land.userId,
        landId: land.id,
        predictionType: "drought",
        title: `Drought Analysis - ${droughtAnalysis.alertLevel} Level`,
        description: `${droughtAnalysis.currentConditions.severity} drought conditions detected. Water stress: ${droughtAnalysis.currentConditions.waterStressIndex}/100`,
        confidence: droughtAnalysis.historicalContext.confidence,
        predictionDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Next 24 hours
        aiModel: "drought-monitoring",
        severity: droughtAnalysis.alertLevel.toLowerCase() as any,
      };
      await storage.saveLandPrediction(droughtPrediction);
    }

  } catch (error) {
    console.error(`Error processing land area ${land.id}:`, error);
  }
}

/**
 * Intensive drought monitoring for high-risk areas
 */
async function performIntensiveDroughtMonitoring(): Promise<void> {
  try {
    // Get all land areas that have had recent drought alerts
    const highRiskAreas = await getHighRiskDroughtAreas();
    
    console.log(`🔥 Intensive monitoring for ${highRiskAreas.length} high-risk areas`);

    for (const area of highRiskAreas) {
      try {
        // More frequent analysis for high-risk areas
        const droughtAnalysis = await droughtMonitoringService.analyzeDroughtConditions(
          area.latitude,
          area.longitude,
          area.id
        );

        if (droughtAnalysis && (droughtAnalysis.alertLevel === "Red" || droughtAnalysis.alertLevel === "Emergency")) {
          // Send emergency updates
          await droughtAlertService.sendDroughtAlert(droughtAnalysis);
          console.log(`🚨 URGENT: Emergency drought update sent for ${area.name}`);
        }

      } catch (error) {
        console.error(`Error in intensive monitoring for area ${area.id}:`, error);
      }
    }

  } catch (error) {
    console.error("Error in intensive drought monitoring:", error);
  }
}

/**
 * Daily comprehensive drought analysis across all regions
 */
async function performDailyDroughtAnalysis(): Promise<void> {
  try {
    console.log("🌍 Performing daily comprehensive drought analysis...");

    // Get unique locations for regional analysis
    const uniqueLocations = await getUniqueMonitoringLocations();
    
    console.log(`🗺️ Analyzing ${uniqueLocations.length} unique locations`);

    for (const location of uniqueLocations) {
      try {
        // Comprehensive daily analysis
        const droughtAnalysis = await droughtMonitoringService.analyzeDroughtConditions(
          location.latitude,
          location.longitude
        );

        if (droughtAnalysis) {
          // Log regional drought status
          console.log(`📍 Regional analysis ${location.latitude.toFixed(3)}, ${location.longitude.toFixed(3)}: ${droughtAnalysis.alertLevel} (${droughtAnalysis.currentConditions.severity})`);

          // Send weekly summary reports for persistent drought conditions
          if (droughtAnalysis.alertLevel !== "Green" && isDailyReportDay()) {
            // Generate and send weekly drought summary
            await sendWeeklyDroughtSummary(location, droughtAnalysis);
          }
        }

      } catch (error) {
        console.error(`Error in daily analysis for location:`, error);
      }
    }

  } catch (error) {
    console.error("Error in daily comprehensive drought analysis:", error);
  }
}

// Helper functions
async function getAllUsersWithLocations() {
  return await db.select().from(users).where(
    sql`${users.latitude} IS NOT NULL AND ${users.longitude} IS NOT NULL`
  );
}

async function getAllLandAreas() {
  return await db.select().from(landAreas).where(
    sql`${landAreas.latitude} IS NOT NULL AND ${landAreas.longitude} IS NOT NULL`
  );
}

async function getLastCropRecommendation(userId: string) {
  const recs = await storage.getCropRecommendations(userId);
  return recs.length > 0 ? recs[0] : null;
}

function shouldCheckForDrought(weather: any): boolean {
  // Check various weather indicators for potential drought conditions
  const indicators = [
    weather.precipitation24h < 1, // Low recent precipitation
    weather.humidity < 40, // Low humidity
    weather.temperature > 30, // High temperature
    weather.windSpeed > 15 // High wind speed (increases evaporation)
  ];

  // If 2 or more indicators are present, check for drought
  return indicators.filter(Boolean).length >= 2;
}

function shouldSendDroughtAlert(analysis: any): boolean {
  // Send alerts for Orange, Red, or Emergency levels
  return ["Orange", "Red", "Emergency"].includes(analysis.alertLevel);
}

async function getHighRiskDroughtAreas(): Promise<any[]> {
  // Get land areas that have had recent drought warnings
  // This is a simplified implementation - in production, would query recent alerts
  const allLands = await getAllLandAreas();
  
  // For now, return a subset for intensive monitoring
  return allLands.slice(0, Math.ceil(allLands.length * 0.3)); // Monitor 30% most recent
}

async function getUniqueMonitoringLocations(): Promise<Array<{latitude: number, longitude: number}>> {
  const users = await getAllUsersWithLocations();
  const lands = await getAllLandAreas();
  
  // Combine and deduplicate locations (simplified - rounds to nearest 0.1 degree)
  const locations = new Map();
  
  [...users, ...lands].forEach(item => {
    if (item.latitude && item.longitude) {
      const key = `${Math.round(item.latitude * 10) / 10}_${Math.round(item.longitude * 10) / 10}`;
      locations.set(key, {
        latitude: item.latitude,
        longitude: item.longitude
      });
    }
  });
  
  return Array.from(locations.values());
}

function isDailyReportDay(): boolean {
  // Send weekly reports on Sundays
  return new Date().getDay() === 0;
}

async function sendWeeklyDroughtSummary(location: any, analysis: any): Promise<void> {
  // Implementation for weekly drought summary reports
  console.log(`📊 Weekly drought summary for region ${location.latitude.toFixed(3)}, ${location.longitude.toFixed(3)}: ${analysis.alertLevel}`);
  
  // This would generate and send a comprehensive weekly report
  // For now, just log the summary
}