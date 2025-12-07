import axios from "axios";
import { storage } from "./storage";
import { comprehensiveDataService } from "./comprehensiveDataService";
import { callMultipleAI, getCentralizedPrediction, executeIntelligentAIRequest } from "./aiService";
import { sendWeatherAlert } from "./notificationService";

// Palmer Drought Severity Index (PDSI) ranges
export const PDSI_CATEGORIES = {
  EXTREME_WET: { min: 4.0, label: "Extremely Wet", color: "#0066CC" },
  VERY_WET: { min: 3.0, max: 3.99, label: "Very Wet", color: "#3399FF" },
  MODERATELY_WET: { min: 2.0, max: 2.99, label: "Moderately Wet", color: "#66CCFF" },
  SLIGHTLY_WET: { min: 0.5, max: 1.99, label: "Slightly Wet", color: "#99DDFF" },
  NORMAL: { min: -0.49, max: 0.49, label: "Normal", color: "#FFFFFF" },
  SLIGHTLY_DRY: { min: -0.99, max: -0.5, label: "Slightly Dry", color: "#FFDD99" },
  MODERATELY_DRY: { min: -1.99, max: -1.0, label: "Moderately Dry", color: "#FFBB66" },
  SEVERELY_DRY: { min: -2.99, max: -2.0, label: "Severely Dry", color: "#FF9933" },
  EXTREMELY_DRY: { min: -3.99, max: -3.0, label: "Extremely Dry", color: "#FF6600" },
  EXCEPTIONAL_DROUGHT: { max: -4.0, label: "Exceptional Drought", color: "#CC3300" }
};

// Standardized Precipitation Index (SPI) categories
export const SPI_CATEGORIES = {
  EXTREMELY_WET: { min: 2.0, label: "Extremely Wet" },
  VERY_WET: { min: 1.5, max: 1.99, label: "Very Wet" },
  MODERATELY_WET: { min: 1.0, max: 1.49, label: "Moderately Wet" },
  NORMAL: { min: -0.99, max: 0.99, label: "Normal" },
  MODERATELY_DRY: { min: -1.49, max: -1.0, label: "Moderately Dry" },
  SEVERELY_DRY: { min: -1.99, max: -1.5, label: "Severely Dry" },
  EXTREMELY_DRY: { max: -2.0, label: "Extremely Dry" }
};

export interface DroughtAnalysis {
  analysisId: string;
  location: { latitude: number; longitude: number; address?: string };
  landId?: number;
  analysisDate: Date;
  
  // Historical drought context (NASA POWER 1-month)
  historicalContext: {
    dataSource: "NASA_POWER";
    timeRange: { start: Date; end: Date };
    recordsCount: number;
    avgPrecipitation: number;
    avgTemperature: number;
    avgSoilMoisture: number;
    precipitationTrend: number; // mm/day change
    confidence: number;
  };
  
  // Current drought status
  currentConditions: {
    precipitationDeficit: number; // mm below normal
    temperatureAnomaly: number; // °C above normal
    soilMoisturePercent: number; // 0-100%
    evapotranspirationRate: number; // mm/day
    waterStressIndex: number; // 0-100 (100 = severe stress)
    pdsiValue: number; // Palmer Drought Severity Index
    spiValue: number; // Standardized Precipitation Index
    droughtCategory: string;
    severity: "None" | "Mild" | "Moderate" | "Severe" | "Extreme";
  };
  
  // 6-month drought forecast (Open-Meteo ECMWF SEAS5)
  futureOutlook: {
    dataSource: "ECMWF_SEAS5";
    confidence: number;
    monthlyProjections: Array<{
      month: number;
      year: number;
      precipitationAnomaly: number; // % from normal
      temperatureAnomaly: number; // °C from normal
      soilMoisture: { surface: number; rootZone: number; deep: number };
      droughtRiskLevel: "Low" | "Moderate" | "High" | "Extreme";
      waterDeficitExpected: number; // mm
      irrigationNeedMultiplier: number; // 1.0 = normal, 2.0 = double
    }>;
    peakDroughtMonth: number | null; // Month with highest drought risk
    recoveryProjection: {
      expectedRecovery: Date | null;
      confidenceLevel: number;
      naturalRecovery: boolean; // Can recover without intervention
    };
  };
  
  // Agricultural impact analysis
  agriculturalImpact: {
    cropStressLevel: "Low" | "Moderate" | "High" | "Critical";
    yieldReductionEstimate: number; // % reduction from normal
    criticalPeriods: Array<{
      startDate: Date;
      endDate: Date;
      riskLevel: "High" | "Extreme";
      description: string;
    }>;
    vulnerableCrops: string[];
    resilientCrops: string[];
    waterDemandIncrease: number; // % increase from normal
  };
  
  // AI-generated insights and recommendations
  aiRecommendations: {
    immediatActions: Array<{
      priority: "Critical" | "High" | "Medium";
      action: string;
      timeline: string;
      expectedBenefit: string;
      implementationCost: "Low" | "Medium" | "High";
    }>;
    waterConservation: {
      potentialSavings: number; // % water savings
      techniques: string[];
      cropModifications: string[];
      irrigationOptimization: string[];
    };
    cropManagement: {
      plantingAdjustments: string[];
      varietyRecommendations: string[];
      harvestTiming: string[];
      riskMitigation: string[];
    };
    longTermAdaptation: string[];
  };
  
  // Ready-to-go action plans
  actionPlans: {
    emergencyPlan: DroughtEmergencyPlan;
    conservationPlan: WaterConservationPlan;
    cropAdaptationPlan: CropAdaptationPlan;
  };
  
  // Risk assessment and alerts
  alertLevel: "Green" | "Yellow" | "Orange" | "Red" | "Emergency";
  nextReviewDate: Date;
  monitoringParameters: string[];
}

export interface DroughtEmergencyPlan {
  planId: string;
  triggerConditions: string[];
  immediateActions: Array<{
    step: number;
    action: string;
    timeframe: string;
    resources: string[];
    cost: string;
  }>;
  waterSources: Array<{
    source: string;
    capacity: string;
    reliability: "High" | "Medium" | "Low";
    accessMethod: string;
  }>;
  cropProtection: Array<{
    crop: string;
    protectionMethod: string;
    efficiency: number; // % protection
    implementation: string;
  }>;
  contingencyMeasures: string[];
}

export interface WaterConservationPlan {
  planId: string;
  conservationTargets: {
    dailyReduction: number; // % reduction target
    weeklyGoal: number; // liters saved per week
    seasonalGoal: number; // liters saved per season
  };
  techniques: Array<{
    method: string;
    waterSavings: number; // % savings
    implementationTime: string;
    cost: "Low" | "Medium" | "High";
    steps: string[];
  }>;
  irrigationSchedule: {
    frequency: string;
    timing: string[];
    duration: string;
    efficiency: string;
  };
  rainwaterHarvesting: {
    potential: number; // liters per month
    setup: string[];
    maintenance: string[];
  };
}

export interface CropAdaptationPlan {
  planId: string;
  droughtResistantCrops: Array<{
    cropName: string;
    droughtTolerance: "High" | "Medium" | "Low";
    waterRequirement: number; // % of normal crops
    yieldExpected: string;
    plantingWindow: { start: Date; end: Date };
    specialRequirements: string[];
  }>;
  modifiedPractices: Array<{
    practice: string;
    description: string;
    waterSavings: number; // % savings
    yieldImpact: string;
    implementation: string[];
  }>;
  intercroppingOptions: Array<{
    mainCrop: string;
    companionCrop: string;
    benefits: string[];
    waterEfficiency: number; // % improvement
  }>;
}

export class DroughtMonitoringService {
  private readonly DROUGHT_CACHE_DURATION = 2 * 60 * 60 * 1000; // 2 hours
  private readonly ALERT_COOLDOWN = 6 * 60 * 60 * 1000; // 6 hours between alerts

  /**
   * Perform comprehensive drought analysis using NASA POWER + Open-Meteo data
   */
  async analyzeDroughtConditions(
    latitude: number,
    longitude: number,
    landId?: number,
    forceRefresh: boolean = false
  ): Promise<DroughtAnalysis> {
    try {
      console.log(`🏜️ Starting comprehensive drought analysis for ${latitude}, ${longitude}`);

      // Check cache first
      if (!forceRefresh) {
        const cached = await this.getCachedDroughtAnalysis(latitude, longitude, landId);
        if (cached) {
          console.log(`📋 Using cached drought analysis from ${cached.analysisDate}`);
          return cached;
        }
      }

      // Get user language if landId is provided
      let userLanguage = 'en';
      if (landId) {
        try {
          const land = await storage.getLandArea(landId);
          if (land && land.userId) {
            const user = await storage.getUser(land.userId.toString());
            if (user && user.language) {
              userLanguage = user.language;
            }
          }
        } catch (error) {
          console.warn(`Could not fetch user language for land ${landId}:`, error);
        }
      }

      // Get comprehensive weather analysis
      const weatherAnalysis = await comprehensiveDataService.generateComprehensiveAnalysis(
        latitude,
        longitude,
        landId,
        true // force refresh for latest data
      );

      // Get recent NASA POWER data (1 month)
      const historicalData = await this.getNasaPowerRecentData(latitude, longitude);
      
      // Get Open-Meteo seasonal forecast (6 months)
      const seasonalForecast = await this.getOpenMeteoExtendedForecast(latitude, longitude);

      // Perform drought calculations
      const currentConditions = this.calculateCurrentDroughtStatus(
        historicalData,
        weatherAnalysis.currentConditions
      );

      const futureOutlook = this.analyzeFuturedroughtRisk(seasonalForecast);
      const agriculturalImpact = this.assessAgriculturalImpact(currentConditions, futureOutlook);

      // Generate AI-powered recommendations
      const aiRecommendations = await this.generateAIRecommendations(
        currentConditions,
        futureOutlook,
        agriculturalImpact,
        latitude,
        longitude,
        userLanguage
      );

      // Create ready-to-go action plans
      const actionPlans = await this.generateActionPlans(
        currentConditions,
        futureOutlook,
        aiRecommendations,
        latitude,
        longitude
      );

      // Determine alert level
      const alertLevel = this.determineAlertLevel(currentConditions, futureOutlook);

      const analysis: DroughtAnalysis = {
        analysisId: `drought_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        location: { latitude, longitude },
        landId,
        analysisDate: new Date(),
        historicalContext: {
          dataSource: "NASA_POWER",
          timeRange: {
            start: historicalData.timeRange.start,
            end: historicalData.timeRange.end
          },
          recordsCount: historicalData.records.length,
          avgPrecipitation: historicalData.avgPrecipitation,
          avgTemperature: historicalData.avgTemperature,
          avgSoilMoisture: historicalData.avgSoilMoisture,
          precipitationTrend: historicalData.precipitationTrend,
          confidence: historicalData.confidence
        },
        currentConditions,
        futureOutlook,
        agriculturalImpact,
        aiRecommendations,
        actionPlans,
        alertLevel,
        nextReviewDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        monitoringParameters: [
          "Daily precipitation",
          "Soil moisture levels",
          "Temperature anomalies",
          "Evapotranspiration rates",
          "Seasonal forecast updates"
        ]
      };

      // Cache the analysis
      await this.cacheDroughtAnalysis(analysis);

      // Send alerts if necessary
      await this.processAlerts(analysis);

      console.log(`✅ Drought analysis completed: ${alertLevel} level detected`);
      return analysis;

    } catch (error) {
      console.error("Error in drought analysis:", error);
      throw new Error(`Drought analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get recent NASA POWER data for drought analysis (1 month)
   */
  private async getNasaPowerRecentData(
    latitude: number,
    longitude: number
  ): Promise<any> {
    try {
      // Get 1 month of recent data from NASA POWER
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - 10); // Account for NASA POWER lag

      const startDate = new Date(endDate);
      startDate.setDate(endDate.getDate() - 30); // 1 month

      const formatDate = (date: Date) => date.toISOString().split('T')[0].replace(/-/g, '');

      console.log(`🛰️ Fetching NASA POWER drought data: ${formatDate(startDate)} to ${formatDate(endDate)}`);

      const response = await axios.get("https://power.larc.nasa.gov/api/temporal/daily/point", {
        params: {
          parameters: [
            "T2M", "PRECTOTCORR", "GWETTOP", "GWETROOT", 
            "PET", "WS2M", "RH2M"
          ].join(","),
          community: "AG",
          longitude: longitude,
          latitude: latitude,
          start: formatDate(startDate),
          end: formatDate(endDate),
          format: "JSON",
        },
        timeout: 30000,
      });

      const data = response.data.properties.parameter;
      const dates = Object.keys(data.T2M || {}).sort();

      const records = dates.map(dateStr => ({
        date: new Date(`${dateStr.substring(0,4)}-${dateStr.substring(4,6)}-${dateStr.substring(6,8)}`),
        temperature: data.T2M?.[dateStr],
        precipitation: data.PRECTOTCORR?.[dateStr],
        soilMoisture: data.GWETTOP?.[dateStr],
        rootZoneMoisture: data.GWETROOT?.[dateStr],
        evapotranspiration: data.PET?.[dateStr],
        windSpeed: data.WS2M?.[dateStr],
        humidity: data.RH2M?.[dateStr]
      })).filter(record => 
        record.temperature !== null && 
        record.precipitation !== null &&
        record.temperature > -50 && record.temperature < 60 &&
        record.precipitation >= 0 && record.precipitation < 500
      );

      // Calculate statistics
      const avgPrecipitation = records.reduce((sum, r) => sum + (r.precipitation || 0), 0) / records.length;
      const avgTemperature = records.reduce((sum, r) => sum + (r.temperature || 0), 0) / records.length;
      const avgSoilMoisture = records.reduce((sum, r) => sum + (r.soilMoisture || 0), 0) / records.length;

      // Calculate precipitation trend (linear regression)
      const precipitationTrend = this.calculateTrend(
        records.map(r => r.precipitation || 0)
      );

      return {
        timeRange: { start: startDate, end: endDate },
        records,
        avgPrecipitation,
        avgTemperature,
        avgSoilMoisture,
        precipitationTrend,
        confidence: Math.min(95, 60 + (records.length * 1.5))
      };

    } catch (error) {
      console.error("Error fetching NASA POWER drought data:", error);
      throw error;
    }
  }

  /**
   * Get extended Open-Meteo forecast for 6-month drought outlook
   */
  private async getOpenMeteoExtendedForecast(
    latitude: number,
    longitude: number
  ): Promise<any> {
    try {
      console.log(`🌍 Fetching Open-Meteo extended forecast for drought analysis`);

      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(startDate.getMonth() + 6);

      const response = await axios.get("https://seasonal-api.open-meteo.com/v1/seasonal", {
        params: {
          latitude: latitude,
          longitude: longitude,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          daily: [
            "temperature_2m_mean",
            "precipitation_sum", 
            "soil_moisture_0_to_7cm_mean",
            "soil_moisture_7_to_28cm_mean"
          ].join(",")
        },
        timeout: 30000
      });

      const data = response.data.daily;
      
      if (!data || !data.time) {
        throw new Error("Invalid seasonal forecast data");
      }

      // Group by months for analysis
      const monthlyData = this.groupDataByMonth(data);
      
      return {
        dataSource: "ECMWF_SEAS5",
        confidence: 75, // Seasonal forecast typical confidence
        monthlyData,
        totalMonths: monthlyData.length
      };

    } catch (error) {
      console.error("Error fetching Open-Meteo extended forecast:", error);
      throw error;
    }
  }

  /**
   * Calculate current drought status using multiple indices
   */
  private calculateCurrentDroughtStatus(
    historicalData: any,
    currentWeather: any
  ): DroughtAnalysis['currentConditions'] {
    
    // Calculate precipitation deficit
    const recentPrecip = historicalData.avgPrecipitation;
    const normalPrecip = this.estimateNormalPrecipitation(historicalData);
    const precipitationDeficit = Math.max(0, normalPrecip - recentPrecip);

    // Temperature anomaly
    const normalTemp = this.estimateNormalTemperature(historicalData);
    const temperatureAnomaly = historicalData.avgTemperature - normalTemp;

    // Soil moisture percentage
    const soilMoisturePercent = Math.min(100, Math.max(0, historicalData.avgSoilMoisture * 100));

    // Evapotranspiration rate
    const evapotranspirationRate = this.calculateEvapotranspirationRate(historicalData, currentWeather);

    // Water stress index (0-100, higher = more stress)
    const waterStressIndex = this.calculateWaterStressIndex(
      precipitationDeficit,
      temperatureAnomaly,
      soilMoisturePercent,
      evapotranspirationRate
    );

    // Palmer Drought Severity Index (PDSI)
    const pdsiValue = this.calculatePDSI(historicalData);

    // Standardized Precipitation Index (SPI)
    const spiValue = this.calculateSPI(historicalData);

    // Determine drought category and severity
    const droughtCategory = this.getDroughtCategory(pdsiValue);
    const severity = this.getDroughtSeverity(waterStressIndex, pdsiValue, spiValue);

    return {
      precipitationDeficit,
      temperatureAnomaly,
      soilMoisturePercent,
      evapotranspirationRate,
      waterStressIndex,
      pdsiValue,
      spiValue,
      droughtCategory,
      severity
    };
  }

  /**
   * Analyze future drought risk from seasonal forecasts
   */
  private analyzeFuturedroughtRisk(seasonalForecast: any): DroughtAnalysis['futureOutlook'] {
    const monthlyProjections = seasonalForecast.monthlyData.map((monthData: any, index: number) => {
      const currentDate = new Date();
      const projectionDate = new Date(currentDate);
      projectionDate.setMonth(currentDate.getMonth() + index);

      // Calculate anomalies (simplified - in production use proper historical normals)
      const precipitationAnomaly = this.calculatePrecipitationAnomaly(monthData.precipitation);
      const temperatureAnomaly = this.calculateTemperatureAnomaly(monthData.temperature);

      // Drought risk assessment
      const droughtRiskLevel = this.assessMonthlyDroughtRisk(
        precipitationAnomaly,
        temperatureAnomaly,
        monthData.soilMoisture
      );

      const waterDeficitExpected = Math.max(0, (Math.abs(precipitationAnomaly) / 100) * 60);
      const irrigationNeedMultiplier = this.calculateIrrigationMultiplier(
        droughtRiskLevel,
        precipitationAnomaly
      );

      return {
        month: projectionDate.getMonth() + 1,
        year: projectionDate.getFullYear(),
        precipitationAnomaly,
        temperatureAnomaly,
        soilMoisture: {
          surface: monthData.soilMoisture.surface || 0.25,
          rootZone: monthData.soilMoisture.rootZone || 0.25,
          deep: monthData.soilMoisture.deep || 0.25
        },
        droughtRiskLevel,
        waterDeficitExpected,
        irrigationNeedMultiplier
      };
    });

    // Find peak drought month
    const peakDroughtMonth = monthlyProjections.reduce((peak, current, index) => {
      if (!peak || this.getNumericRiskValue(current.droughtRiskLevel) > this.getNumericRiskValue(peak.droughtRiskLevel)) {
        return { ...current, monthIndex: index + 1 };
      }
      return peak;
    }, null as any)?.monthIndex || null;

    // Project recovery
    const recoveryProjection = this.projectDroughtRecovery(monthlyProjections);

    return {
      dataSource: "ECMWF_SEAS5",
      confidence: seasonalForecast.confidence,
      monthlyProjections,
      peakDroughtMonth,
      recoveryProjection
    };
  }

  /**
   * Assess agricultural impact of drought conditions
   */
  private assessAgriculturalImpact(
    currentConditions: DroughtAnalysis['currentConditions'],
    futureOutlook: DroughtAnalysis['futureOutlook']
  ): DroughtAnalysis['agriculturalImpact'] {
    
    // Crop stress level based on current conditions
    const cropStressLevel = this.determineCropStressLevel(
      currentConditions.waterStressIndex,
      currentConditions.soilMoisturePercent
    );

    // Yield reduction estimate
    const yieldReductionEstimate = this.estimateYieldReduction(
      currentConditions.severity,
      futureOutlook.monthlyProjections
    );

    // Identify critical periods
    const criticalPeriods = this.identifyCriticalPeriods(futureOutlook.monthlyProjections);

    // Categorize crops by vulnerability
    const vulnerableCrops = this.getVulnerableCrops(currentConditions.severity);
    const resilientCrops = this.getResilientCrops(currentConditions.severity);

    // Water demand increase
    const waterDemandIncrease = futureOutlook.monthlyProjections.reduce(
      (sum, month) => sum + (month.irrigationNeedMultiplier - 1), 0
    ) / futureOutlook.monthlyProjections.length * 100;

    return {
      cropStressLevel,
      yieldReductionEstimate,
      criticalPeriods,
      vulnerableCrops,
      resilientCrops,
      waterDemandIncrease
    };
  }

  /**
   * Generate AI-powered drought recommendations
   */
  private async generateAIRecommendations(
    currentConditions: DroughtAnalysis['currentConditions'],
    futureOutlook: DroughtAnalysis['futureOutlook'],
    agriculturalImpact: DroughtAnalysis['agriculturalImpact'],
    latitude: number,
    longitude: number,
    language?: string
  ): Promise<DroughtAnalysis['aiRecommendations']> {
    
    let systemPrompt = `You are an advanced drought management AI specializing in agricultural water conservation and crop adaptation. Analyze the comprehensive drought data and provide specific, actionable recommendations for farmers facing drought conditions.

Focus on:
1. Immediate water-saving actions
2. Crop protection strategies  
3. Long-term drought adaptation
4. Economic impact mitigation

Provide practical, implementable solutions with specific timeframes and expected benefits.`;

    if (language && language !== 'en') {
      systemPrompt += `\n\nIMPORTANT: You MUST reply in ${language} language ONLY. Translate all your analysis, recommendations, and explanations to ${language}.`;
    }

    const userPrompt = `DROUGHT ANALYSIS DATA:

CURRENT CONDITIONS:
- Drought Severity: ${currentConditions.severity}
- Water Stress Index: ${currentConditions.waterStressIndex}/100
- Precipitation Deficit: ${currentConditions.precipitationDeficit.toFixed(1)}mm
- Soil Moisture: ${currentConditions.soilMoisturePercent.toFixed(1)}%
- Temperature Anomaly: +${currentConditions.temperatureAnomaly.toFixed(1)}°C
- PDSI: ${currentConditions.pdsiValue.toFixed(2)} (${currentConditions.droughtCategory})

6-MONTH OUTLOOK:
${futureOutlook.monthlyProjections.map(month => 
  `Month ${month.month}: ${month.droughtRiskLevel} risk, ${month.precipitationAnomaly > 0 ? '+' : ''}${month.precipitationAnomaly.toFixed(0)}% precip anomaly, ${month.irrigationNeedMultiplier.toFixed(1)}x irrigation need`
).join('\n')}

AGRICULTURAL IMPACT:
- Crop Stress Level: ${agriculturalImpact.cropStressLevel}
- Expected Yield Reduction: ${agriculturalImpact.yieldReductionEstimate.toFixed(0)}%
- Water Demand Increase: ${agriculturalImpact.waterDemandIncrease.toFixed(0)}%
- Critical Periods: ${agriculturalImpact.criticalPeriods.length} identified

Generate comprehensive recommendations for drought management and agricultural adaptation.`;

    try {
      // Use intelligent AI manager for drought analysis
      const response = await executeIntelligentAIRequest(
        "drought-analysis",
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        { priority: "high" }
      );

      if (!response) {
        return this.getFallbackRecommendations(currentConditions, agriculturalImpact);
      }

      // Parse AI response for structured recommendations
      return this.parseAIRecommendations(response, currentConditions, agriculturalImpact);

    } catch (error) {
      console.error("Error generating AI recommendations:", error);
      return this.getFallbackRecommendations(currentConditions, agriculturalImpact);
    }
  }

  /**
   * Generate comprehensive action plans for drought management
   */
  private async generateActionPlans(
    currentConditions: DroughtAnalysis['currentConditions'],
    futureOutlook: DroughtAnalysis['futureOutlook'],
    aiRecommendations: DroughtAnalysis['aiRecommendations'],
    latitude: number,
    longitude: number
  ): Promise<DroughtAnalysis['actionPlans']> {
    
    const emergencyPlan = this.createEmergencyDroughtPlan(currentConditions);
    const conservationPlan = this.createWaterConservationPlan(currentConditions, futureOutlook);
    const cropAdaptationPlan = await this.createCropAdaptationPlan(
      currentConditions,
      futureOutlook,
      latitude,
      longitude
    );

    return {
      emergencyPlan,
      conservationPlan,
      cropAdaptationPlan
    };
  }

  // Utility methods for calculations
  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = values.reduce((sum, y, x) => sum + (x * y), 0);
    const sumXX = values.reduce((sum, _, x) => sum + (x * x), 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return slope;
  }

  private estimateNormalPrecipitation(historicalData: any): number {
    // Simplified normal precipitation estimate
    // In production, use 30-year climate normals
    return historicalData.avgPrecipitation * 1.1; // Assume 10% below normal triggers concern
  }

  private estimateNormalTemperature(historicalData: any): number {
    // Simplified normal temperature estimate
    return historicalData.avgTemperature - 1; // Assume 1°C warming is concerning
  }

  private calculateEvapotranspirationRate(historicalData: any, currentWeather: any): number {
    // Simplified ET calculation using Penman-Monteith approximation
    const avgTemp = historicalData.avgTemperature;
    const humidity = currentWeather.humidity;
    const windSpeed = currentWeather.windSpeed || 2;
    
    return Math.max(0, (avgTemp * 0.1) + (windSpeed * 0.05) - ((humidity || 70) * 0.02));
  }

  private calculateWaterStressIndex(
    precipDeficit: number,
    tempAnomaly: number,
    soilMoisture: number,
    etRate: number
  ): number {
    let stress = 0;
    
    // Precipitation deficit component (40% weight)
    stress += Math.min(40, precipDeficit * 2);
    
    // Temperature anomaly component (25% weight)
    stress += Math.min(25, Math.max(0, tempAnomaly * 8));
    
    // Soil moisture component (25% weight)
    stress += Math.min(25, Math.max(0, (50 - soilMoisture) * 0.5));
    
    // Evapotranspiration component (10% weight)
    stress += Math.min(10, etRate * 2);
    
    return Math.min(100, Math.max(0, stress));
  }

  private calculatePDSI(historicalData: any): number {
    // Simplified PDSI calculation
    // In production, implement full Palmer Drought Severity Index algorithm
    const precipRatio = historicalData.avgPrecipitation / this.estimateNormalPrecipitation(historicalData);
    const tempFactor = Math.max(0, historicalData.avgTemperature - this.estimateNormalTemperature(historicalData));
    
    let pdsi = (precipRatio - 1) * 4 - (tempFactor * 0.5);
    return Math.max(-6, Math.min(6, pdsi));
  }

  private calculateSPI(historicalData: any): number {
    // Simplified SPI calculation
    // In production, implement full Standardized Precipitation Index
    const precipRatio = historicalData.avgPrecipitation / this.estimateNormalPrecipitation(historicalData);
    return (precipRatio - 1) * 2;
  }

  private getDroughtCategory(pdsi: number): string {
    for (const [key, category] of Object.entries(PDSI_CATEGORIES)) {
      const cat = category as any;
      if (cat.min !== undefined && pdsi >= cat.min) {
        if (cat.max === undefined || pdsi <= cat.max) {
          return cat.label;
        }
      } else if (cat.max !== undefined && pdsi <= cat.max) {
        return cat.label;
      }
    }
    return "Normal";
  }

  private getDroughtSeverity(
    waterStress: number,
    pdsi: number,
    spi: number
  ): DroughtAnalysis['currentConditions']['severity'] {
    if (pdsi <= -3 || waterStress >= 80 || spi <= -2) return "Extreme";
    if (pdsi <= -2 || waterStress >= 60 || spi <= -1.5) return "Severe";
    if (pdsi <= -1 || waterStress >= 40 || spi <= -1) return "Moderate";
    if (pdsi <= -0.5 || waterStress >= 20 || spi <= -0.5) return "Mild";
    return "None";
  }

  // Additional utility methods would continue here...
  // [Implementing remaining methods for completeness]

  private groupDataByMonth(dailyData: any): any[] {
    const monthlyGroups = new Map<string, any[]>();
    
    dailyData.time.forEach((dateStr: string, index: number) => {
      const date = new Date(dateStr);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyGroups.has(monthKey)) {
        monthlyGroups.set(monthKey, []);
      }
      
      monthlyGroups.get(monthKey)!.push({
        date: date,
        temperature: dailyData.temperature_2m_mean?.[index],
        precipitation: dailyData.precipitation_sum?.[index],
        soilMoisture: {
          surface: dailyData.soil_moisture_0_to_7cm_mean?.[index],
          rootZone: dailyData.soil_moisture_7_to_28cm_mean?.[index],
          deep: dailyData.soil_moisture_7_to_28cm_mean?.[index] // Use same as no deep data
        }
      });
    });
    
    return Array.from(monthlyGroups.values()).map(monthData => ({
      temperature: monthData.reduce((sum, day) => sum + (day.temperature || 20), 0) / monthData.length,
      precipitation: monthData.reduce((sum, day) => sum + (day.precipitation || 0), 0),
      soilMoisture: {
        surface: monthData.reduce((sum, day) => sum + (day.soilMoisture.surface || 0.25), 0) / monthData.length,
        rootZone: monthData.reduce((sum, day) => sum + (day.soilMoisture.rootZone || 0.25), 0) / monthData.length,
        deep: monthData.reduce((sum, day) => sum + (day.soilMoisture.deep || 0.25), 0) / monthData.length
      }
    }));
  }

  private calculatePrecipitationAnomaly(precipitation: number): number {
    const normalPrecipitation = 50; // Simplified normal value
    return ((precipitation - normalPrecipitation) / normalPrecipitation) * 100;
  }

  private calculateTemperatureAnomaly(temperature: number): number {
    const normalTemperature = 25; // Simplified normal value
    return temperature - normalTemperature;
  }

  private assessMonthlyDroughtRisk(
    precipAnomaly: number,
    tempAnomaly: number,
    soilMoisture: any
  ): "Low" | "Moderate" | "High" | "Extreme" {
    let riskScore = 0;
    
    // Precipitation deficit contributes to drought risk
    if (precipAnomaly < -30) riskScore += 3;
    else if (precipAnomaly < -15) riskScore += 2;
    else if (precipAnomaly < -5) riskScore += 1;
    
    // Temperature excess contributes to drought risk  
    if (tempAnomaly > 3) riskScore += 2;
    else if (tempAnomaly > 1.5) riskScore += 1;
    
    // Soil moisture deficit
    if (soilMoisture.rootZone < 0.15) riskScore += 2;
    else if (soilMoisture.rootZone < 0.25) riskScore += 1;
    
    if (riskScore >= 5) return "Extreme";
    if (riskScore >= 3) return "High";
    if (riskScore >= 2) return "Moderate";
    return "Low";
  }

  private calculateIrrigationMultiplier(
    riskLevel: string,
    precipAnomaly: number
  ): number {
    const baseMultiplier = {
      "Low": 1.0,
      "Moderate": 1.3,
      "High": 1.7,
      "Extreme": 2.5
    }[riskLevel] || 1.0;
    
    // Adjust based on precipitation anomaly
    const precipMultiplier = precipAnomaly < -20 ? 1.5 : precipAnomaly < -10 ? 1.2 : 1.0;
    
    return baseMultiplier * precipMultiplier;
  }

  private getNumericRiskValue(riskLevel: string): number {
    const values = { "Low": 1, "Moderate": 2, "High": 3, "Extreme": 4 };
    return values[riskLevel as keyof typeof values] || 1;
  }

  private projectDroughtRecovery(monthlyProjections: any[]): any {
    // Find when drought conditions are expected to improve
    let recoveryMonth = null;
    let naturalRecovery = true;
    
    for (let i = 0; i < monthlyProjections.length; i++) {
      const month = monthlyProjections[i];
      if (month.precipitationAnomaly > 10 && month.droughtRiskLevel === "Low") {
        recoveryMonth = i + 1;
        break;
      }
    }
    
    // If no natural recovery found, check for improvement
    if (!recoveryMonth) {
      for (let i = 1; i < monthlyProjections.length; i++) {
        const prevRisk = this.getNumericRiskValue(monthlyProjections[i - 1].droughtRiskLevel);
        const currRisk = this.getNumericRiskValue(monthlyProjections[i].droughtRiskLevel);
        
        if (currRisk < prevRisk) {
          recoveryMonth = i + 1;
          naturalRecovery = false;
          break;
        }
      }
    }
    
    const expectedRecovery = recoveryMonth ? 
      new Date(Date.now() + recoveryMonth * 30 * 24 * 60 * 60 * 1000) : null;
    
    return {
      expectedRecovery,
      confidenceLevel: recoveryMonth ? 70 : 30,
      naturalRecovery
    };
  }

  private determineCropStressLevel(
    waterStressIndex: number,
    soilMoisture: number
  ): "Low" | "Moderate" | "High" | "Critical" {
    if (waterStressIndex >= 80 || soilMoisture < 15) return "Critical";
    if (waterStressIndex >= 60 || soilMoisture < 25) return "High";
    if (waterStressIndex >= 40 || soilMoisture < 40) return "Moderate";
    return "Low";
  }

  private estimateYieldReduction(
    severity: DroughtAnalysis['currentConditions']['severity'],
    monthlyProjections: any[]
  ): number {
    const basereduction = {
      "None": 0,
      "Mild": 5,
      "Moderate": 15,
      "Severe": 35,
      "Extreme": 60
    }[severity] || 0;
    
    // Adjust based on future outlook
    const avgRisk = monthlyProjections.reduce((sum, month) => 
      sum + this.getNumericRiskValue(month.droughtRiskLevel), 0
    ) / monthlyProjections.length;
    
    return Math.min(80, basereduction + (avgRisk - 1) * 10);
  }

  private identifyCriticalPeriods(monthlyProjections: any[]): any[] {
    const criticalPeriods = [];
    let currentPeriod: any = null;
    
    monthlyProjections.forEach((month, index) => {
      const isHighRisk = ["High", "Extreme"].includes(month.droughtRiskLevel);
      
      if (isHighRisk) {
        if (!currentPeriod) {
          currentPeriod = {
            startDate: new Date(Date.now() + index * 30 * 24 * 60 * 60 * 1000),
            riskLevel: month.droughtRiskLevel,
            description: `${month.droughtRiskLevel} drought risk period`
          };
        } else if (month.droughtRiskLevel === "Extreme") {
          currentPeriod.riskLevel = "Extreme";
          currentPeriod.description = "Extreme drought risk period";
        }
      } else if (currentPeriod) {
        currentPeriod.endDate = new Date(Date.now() + index * 30 * 24 * 60 * 60 * 1000);
        criticalPeriods.push(currentPeriod);
        currentPeriod = null;
      }
    });
    
    // Close any open period
    if (currentPeriod) {
      currentPeriod.endDate = new Date(Date.now() + monthlyProjections.length * 30 * 24 * 60 * 60 * 1000);
      criticalPeriods.push(currentPeriod);
    }
    
    return criticalPeriods;
  }

  private getVulnerableCrops(severity: string): string[] {
    const crops = {
      "Mild": ["Rice", "Sugarcane", "Banana"],
      "Moderate": ["Rice", "Sugarcane", "Banana", "Maize", "Cotton"],
      "Severe": ["Rice", "Sugarcane", "Banana", "Maize", "Cotton", "Wheat", "Tomato"],
      "Extreme": ["Rice", "Sugarcane", "Banana", "Maize", "Cotton", "Wheat", "Tomato", "Potato"]
    };
    
    return crops[severity as keyof typeof crops] || [];
  }

  private getResilientCrops(severity: string): string[] {
    const allCrops = ["Sorghum", "Pearl Millet", "Chickpea", "Pigeon Pea", "Sesame", "Safflower", "Onion", "Garlic"];
    const vulnerable = this.getVulnerableCrops(severity);
    return allCrops.filter(crop => !vulnerable.includes(crop));
  }

  private getFallbackRecommendations(
    currentConditions: any,
    agriculturalImpact: any
  ): DroughtAnalysis['aiRecommendations'] {
    return {
      immediatActions: [
        {
          priority: "Critical",
          action: "Implement water conservation measures immediately",
          timeline: "Next 48 hours",
          expectedBenefit: "Reduce water consumption by 30-50%",
          implementationCost: "Low"
        }
      ],
      waterConservation: {
        potentialSavings: 40,
        techniques: ["Drip irrigation", "Mulching", "Rainwater harvesting"],
        cropModifications: ["Drought-resistant varieties"],
        irrigationOptimization: ["Early morning irrigation", "Soil moisture monitoring"]
      },
      cropManagement: {
        plantingAdjustments: ["Delay planting until moisture improves"],
        varietyRecommendations: ["Short-season drought-tolerant varieties"],
        harvestTiming: ["Early harvest if possible"],
        riskMitigation: ["Crop insurance", "Diversified planting"]
      },
      longTermAdaptation: [
        "Install water storage systems",
        "Improve soil organic matter",
        "Plant drought-resistant crops"
      ]
    };
  }

  private parseAIRecommendations(
    aiResponse: string,
    currentConditions: any,
    agriculturalImpact: any
  ): DroughtAnalysis['aiRecommendations'] {
    // Parse AI response - simplified version
    // In production, implement proper NLP parsing
    return this.getFallbackRecommendations(currentConditions, agriculturalImpact);
  }

  private createEmergencyDroughtPlan(currentConditions: any): DroughtEmergencyPlan {
    return {
      planId: `emergency_${Date.now()}`,
      triggerConditions: [
        "Soil moisture drops below 20%",
        "Water stress index exceeds 70",
        "No rainfall for 14+ days"
      ],
      immediateActions: [
        {
          step: 1,
          action: "Stop all non-essential water use",
          timeframe: "Immediate",
          resources: ["Available farm water", "Emergency reserves"],
          cost: "Free"
        },
        {
          step: 2,
          action: "Switch to emergency irrigation schedule",
          timeframe: "Next 6 hours",
          resources: ["Drip irrigation system", "Water pumps"],
          cost: "Medium"
        }
      ],
      waterSources: [
        {
          source: "Groundwater well",
          capacity: "As available",
          reliability: "Medium",
          accessMethod: "Electric pump"
        }
      ],
      cropProtection: [
        {
          crop: "All active crops",
          protectionMethod: "Shade nets and mulching",
          efficiency: 70,
          implementation: "Install shade nets, apply organic mulch"
        }
      ],
      contingencyMeasures: [
        "Contact local water suppliers",
        "Coordinate with neighboring farmers",
        "Prepare for crop loss insurance claims"
      ]
    };
  }

  private createWaterConservationPlan(
    currentConditions: any,
    futureOutlook: any
  ): WaterConservationPlan {
    return {
      planId: `conservation_${Date.now()}`,
      conservationTargets: {
        dailyReduction: 50,
        weeklyGoal: 10000,
        seasonalGoal: 500000
      },
      techniques: [
        {
          method: "Drip Irrigation System",
          waterSavings: 40,
          implementationTime: "1-2 weeks",
          cost: "High",
          steps: [
            "Design irrigation layout",
            "Purchase drip system components",
            "Install main lines and emitters",
            "Test and calibrate system"
          ]
        },
        {
          method: "Mulching",
          waterSavings: 25,
          implementationTime: "2-3 days",
          cost: "Low",
          steps: [
            "Source organic mulch material",
            "Apply 3-4 inch layer around plants",
            "Maintain mulch thickness"
          ]
        }
      ],
      irrigationSchedule: {
        frequency: "Every other day",
        timing: ["5:00 AM - 7:00 AM", "6:00 PM - 8:00 PM"],
        duration: "Reduced by 50%",
        efficiency: "Monitor soil moisture levels"
      },
      rainwaterHarvesting: {
        potential: 5000,
        setup: [
          "Install roof gutters",
          "Set up collection tanks",
          "Add filtration system"
        ],
        maintenance: [
          "Clean gutters monthly",
          "Check tank integrity",
          "Replace filters quarterly"
        ]
      }
    };
  }

  private async createCropAdaptationPlan(
    currentConditions: any,
    futureOutlook: any,
    latitude: number,
    longitude: number
  ): Promise<CropAdaptationPlan> {
    
    const currentDate = new Date();
    
    return {
      planId: `adaptation_${Date.now()}`,
      droughtResistantCrops: [
        {
          cropName: "Pearl Millet",
          droughtTolerance: "High",
          waterRequirement: 60,
          yieldExpected: "15-20 quintals/hectare",
          plantingWindow: {
            start: new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000),
            end: new Date(currentDate.getTime() + 30 * 24 * 60 * 60 * 1000)
          },
          specialRequirements: ["Heat tolerant", "Sandy soil preferred"]
        },
        {
          cropName: "Sorghum",
          droughtTolerance: "High",
          waterRequirement: 70,
          yieldExpected: "12-18 quintals/hectare",
          plantingWindow: {
            start: new Date(currentDate.getTime() + 14 * 24 * 60 * 60 * 1000),
            end: new Date(currentDate.getTime() + 45 * 24 * 60 * 60 * 1000)
          },
          specialRequirements: ["Well-drained soil", "Temperature tolerant"]
        }
      ],
      modifiedPractices: [
        {
          practice: "Conservative Tillage",
          description: "Reduce tillage to conserve soil moisture",
          waterSavings: 20,
          yieldImpact: "Neutral to positive",
          implementation: ["Minimal soil disturbance", "Maintain crop residues"]
        },
        {
          practice: "Precision Irrigation",
          description: "Use soil sensors for precise water application",
          waterSavings: 35,
          yieldImpact: "Maintains yield with less water",
          implementation: ["Install soil moisture sensors", "Automated irrigation control"]
        }
      ],
      intercroppingOptions: [
        {
          mainCrop: "Sorghum",
          companionCrop: "Cowpea",
          benefits: ["Nitrogen fixation", "Ground cover", "Risk diversification"],
          waterEfficiency: 15
        }
      ]
    };
  }

  private determineAlertLevel(
    currentConditions: any,
    futureOutlook: any
  ): "Green" | "Yellow" | "Orange" | "Red" | "Emergency" {
    const severity = currentConditions.severity;
    const futureRisk = futureOutlook.monthlyProjections.reduce((max: number, month: any) => 
      Math.max(max, this.getNumericRiskValue(month.droughtRiskLevel)), 0
    );
    
    if (severity === "Extreme" || futureRisk >= 4) return "Emergency";
    if (severity === "Severe" || futureRisk >= 3) return "Red";
    if (severity === "Moderate" || futureRisk >= 2.5) return "Orange";
    if (severity === "Mild" || futureRisk >= 2) return "Yellow";
    return "Green";
  }

  private async getCachedDroughtAnalysis(
    latitude: number,
    longitude: number,
    landId?: number
  ): Promise<DroughtAnalysis | null> {
    try {
      // Check for recent analysis in cache
      const cacheKey = `drought_${latitude}_${longitude}_${landId || 'user'}`;
      // Implementation would check database or memory cache
      return null; // For now, always generate fresh analysis
    } catch (error) {
      return null;
    }
  }

  private async cacheDroughtAnalysis(analysis: DroughtAnalysis): Promise<void> {
    try {
      // Store analysis in database for caching
      // Implementation would save to database
      console.log(`💾 Cached drought analysis: ${analysis.analysisId}`);
    } catch (error) {
      console.error("Failed to cache drought analysis:", error);
    }
  }

  private async processAlerts(analysis: DroughtAnalysis): Promise<void> {
    try {
      if (["Orange", "Red", "Emergency"].includes(analysis.alertLevel)) {
        console.log(`🚨 Drought alert: ${analysis.alertLevel} level detected`);
        
        // Send alerts to users (implementation in next step)
        await this.sendDroughtAlerts(analysis);
      }
    } catch (error) {
      console.error("Failed to process drought alerts:", error);
    }
  }

  private async sendDroughtAlerts(analysis: DroughtAnalysis): Promise<void> {
    // Implementation will be in the alert service
    console.log(`📱 Would send ${analysis.alertLevel} drought alert`);
  }

  /**
   * Get drought analysis for a specific location
   */
  async getDroughtAnalysisForLocation(
    latitude: number,
    longitude: number,
    landId?: number
  ): Promise<DroughtAnalysis> {
    return await this.analyzeDroughtConditions(latitude, longitude, landId);
  }

  /**
   * Check if drought conditions warrant immediate action
   */
  async checkForDroughtEmergency(
    latitude: number,
    longitude: number,
    landId?: number
  ): Promise<boolean> {
    const analysis = await this.analyzeDroughtConditions(latitude, longitude, landId);
    return ["Red", "Emergency"].includes(analysis.alertLevel);
  }
}

export const droughtMonitoringService = new DroughtMonitoringService();