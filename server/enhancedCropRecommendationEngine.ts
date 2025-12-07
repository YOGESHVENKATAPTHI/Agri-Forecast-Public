import { dataAggregationService, LongTermWeatherPrediction } from "./dataAggregationService";
import { storage } from "./storage";
import { comprehensiveDataService, ComprehensiveWeatherAnalysis } from "./comprehensiveDataService";

export interface EnhancedCropRecommendation {
  cropName: string;
  confidence: number;
  reasoning: string;
  detailedPlan: string;
  plantingWindow: {
    optimal: { start: Date; end: Date };
    acceptable: { start: Date; end: Date };
  };
  harvestPeriod: {
    expected: Date;
    latest: Date;
  };
  yieldPrediction: {
    expected: string;
    range: { min: number; max: number };
    unit: string;
  };
  riskAssessment: {
    overall: "Low" | "Medium" | "High";
    factors: string[];
    mitigation: string[];
  };
  economicAnalysis: {
    estimatedRevenue: string;
    inputCosts: string;
    profitMargin: string;
    marketDemand: "Low" | "Medium" | "High";
  };
  sustainabilityScore: {
    score: number; // 1-10
    factors: string[];
  };
  monthlyGuidance: Array<{
    month: number;
    year: number;
    activity: string;
    priority: "High" | "Medium" | "Low";
    weatherConsideration: string;
  }>;
}

export interface CropDatabase {
  [cropName: string]: {
    category: string;
    growthPeriod: number; // days
    optimalTemp: { min: number; max: number };
    waterRequirement: "Low" | "Medium" | "High";
    soilType: string[];
    season: string[];
    marketValue: "Low" | "Medium" | "High";
    sustainability: number;
    commonDiseases: string[];
    companions: string[];
    climateZones: number[];
  };
}

export const CROP_DATABASE: CropDatabase = {
  "Rice": {
    category: "Cereal",
    growthPeriod: 120,
    optimalTemp: { min: 20, max: 35 },
    waterRequirement: "High",
    soilType: ["Clay", "Loam"],
    season: ["Monsoon", "Winter"],
    marketValue: "High",
    sustainability: 6,
    commonDiseases: ["Blast", "Sheath rot"],
    companions: ["Legumes"],
    climateZones: [1, 2, 3]
  },
  "Wheat": {
    category: "Cereal",
    growthPeriod: 110,
    optimalTemp: { min: 15, max: 25 },
    waterRequirement: "Medium",
    soilType: ["Loam", "Sandy loam"],
    season: ["Winter", "Spring"],
    marketValue: "High",
    sustainability: 7,
    commonDiseases: ["Rust", "Smut"],
    companions: ["Legumes", "Mustard"],
    climateZones: [2, 3, 4]
  },
  "Maize": {
    category: "Cereal",
    growthPeriod: 90,
    optimalTemp: { min: 18, max: 32 },
    waterRequirement: "Medium",
    soilType: ["Loam", "Sandy loam", "Clay loam"],
    season: ["Summer", "Monsoon"],
    marketValue: "Medium",
    sustainability: 8,
    commonDiseases: ["Borer", "Leaf blight"],
    companions: ["Beans", "Squash"],
    climateZones: [1, 2, 3, 4]
  },
  "Cotton": {
    category: "Cash crop",
    growthPeriod: 180,
    optimalTemp: { min: 21, max: 35 },
    waterRequirement: "Medium",
    soilType: ["Black cotton", "Alluvial"],
    season: ["Summer"],
    marketValue: "High",
    sustainability: 5,
    commonDiseases: ["Bollworm", "Wilt"],
    companions: ["Marigold", "Basil"],
    climateZones: [1, 2, 3]
  },
  "Soybean": {
    category: "Legume",
    growthPeriod: 100,
    optimalTemp: { min: 20, max: 30 },
    waterRequirement: "Medium",
    soilType: ["Well-drained", "Loam"],
    season: ["Monsoon"],
    marketValue: "High",
    sustainability: 9,
    commonDiseases: ["Rust", "Pod borer"],
    companions: ["Cereals"],
    climateZones: [2, 3, 4]
  },
  "Sugarcane": {
    category: "Cash crop",
    growthPeriod: 365,
    optimalTemp: { min: 20, max: 35 },
    waterRequirement: "High",
    soilType: ["Heavy loam", "Clay"],
    season: ["Year-round"],
    marketValue: "Medium",
    sustainability: 6,
    commonDiseases: ["Red rot", "Smut"],
    companions: ["Intercropping with legumes"],
    climateZones: [1, 2, 3]
  },
  "Tomato": {
    category: "Vegetable",
    growthPeriod: 75,
    optimalTemp: { min: 18, max: 27 },
    waterRequirement: "Medium",
    soilType: ["Well-drained", "Loam"],
    season: ["Winter", "Summer"],
    marketValue: "High",
    sustainability: 7,
    commonDiseases: ["Blight", "Wilt"],
    companions: ["Basil", "Marigold"],
    climateZones: [2, 3, 4]
  },
  "Potato": {
    category: "Vegetable",
    growthPeriod: 70,
    optimalTemp: { min: 15, max: 25 },
    waterRequirement: "Medium",
    soilType: ["Sandy loam", "Loam"],
    season: ["Winter"],
    marketValue: "Medium",
    sustainability: 8,
    commonDiseases: ["Blight", "Black scurf"],
    companions: ["Beans", "Corn"],
    climateZones: [3, 4, 5]
  },
  "Onion": {
    category: "Vegetable",
    growthPeriod: 120,
    optimalTemp: { min: 13, max: 24 },
    waterRequirement: "Low",
    soilType: ["Well-drained", "Sandy loam"],
    season: ["Winter"],
    marketValue: "High",
    sustainability: 8,
    commonDiseases: ["Purple blotch", "Thrips"],
    companions: ["Carrots", "Tomatoes"],
    climateZones: [3, 4, 5]
  },
  "Banana": {
    category: "Fruit",
    growthPeriod: 300,
    optimalTemp: { min: 26, max: 30 },
    waterRequirement: "High",
    soilType: ["Rich loam", "Alluvial"],
    season: ["Year-round"],
    marketValue: "High",
    sustainability: 7,
    commonDiseases: ["Panama disease", "Sigatoka"],
    companions: ["Coconut", "Arecanut"],
    climateZones: [1, 2, 3]
  }
};

export class EnhancedCropRecommendationEngine {
  async generateRecommendations(
    latitude: number,
    longitude: number,
    userId: string,
    landId?: number
  ): Promise<EnhancedCropRecommendation[]> {
    try {
      console.log(` Generating enhanced crop recommendations using comprehensive analysis for: ${latitude}, ${longitude}`);
      
      // First ensure comprehensive data is fetched and stored
      const comprehensiveDataService = new (await import('./comprehensiveDataService')).ComprehensiveDataService();
      
      // Get stored comprehensive analysis for AI processing
      const storedAnalysis = await comprehensiveDataService.getStoredAnalysisForAI(latitude, longitude);
      
      if (!storedAnalysis || !storedAnalysis.analysis) {
        console.warn("Failed to get stored comprehensive analysis, falling back to basic method");
        return await this.generateBasicRecommendations(latitude, longitude, userId, landId);
      }
      
      console.log(`✅ Using stored data: ${storedAnalysis.dataStats.historicalRecords} historical records, ${storedAnalysis.dataStats.forecastRecords} forecast records`);

      // Get land history if available
      const landHistory = landId ? await this.getLandHistory(landId) : null;
      
      // Generate recommendations for top crops using comprehensive data
      const recommendations: EnhancedCropRecommendation[] = [];
      const suitableCrops = this.findSuitableCropsFromComprehensiveAnalysis(
        storedAnalysis.analysis, 
        latitude
      );
      
      for (const cropName of suitableCrops.slice(0, 8)) { // Top 8 recommendations with comprehensive data
        const recommendation = await this.generateComprehensiveCropRecommendation(
          cropName,
          storedAnalysis.analysis,
          landHistory,
          latitude,
          longitude
        );
        recommendations.push(recommendation);
      }

      // Sort by comprehensive score (confidence + sustainability + risk assessment)
      recommendations.sort((a, b) => {
        const scoreA = a.confidence * 0.4 + 
                      a.sustainabilityScore.score * 3 + 
                      (a.riskAssessment.overall === 'Low' ? 20 : 
                       a.riskAssessment.overall === 'Medium' ? 10 : 0) +
                      (a.economicAnalysis.marketDemand === 'High' ? 15 : 
                       a.economicAnalysis.marketDemand === 'Medium' ? 8 : 3);
        const scoreB = b.confidence * 0.4 + 
                      b.sustainabilityScore.score * 3 + 
                      (b.riskAssessment.overall === 'Low' ? 20 : 
                       b.riskAssessment.overall === 'Medium' ? 10 : 0) +
                      (b.economicAnalysis.marketDemand === 'High' ? 15 : 
                       b.economicAnalysis.marketDemand === 'Medium' ? 8 : 3);
        return scoreB - scoreA;
      });

      console.log(`✅ Generated ${recommendations.length} comprehensive crop recommendations`);
      return recommendations;

    } catch (error) {
      console.error("Error generating enhanced crop recommendations:", error);
      // Fallback to basic recommendations if comprehensive analysis fails
      return await this.generateBasicRecommendations(latitude, longitude, userId, landId);
    }
  }

  // Fallback method using existing logic
  private async generateBasicRecommendations(
    latitude: number,
    longitude: number,
    userId: string,
    landId?: number
  ): Promise<EnhancedCropRecommendation[]> {
    console.log(`🔄 Using basic recommendation method for ${latitude}, ${longitude}`);
    
    // Get 6-month weather prediction
    const longTermPrediction = await dataAggregationService.get6MonthPrediction(
      latitude, 
      longitude, 
      landId
    );

    // Get land history if available
    const landHistory = landId ? await this.getLandHistory(landId) : null;
    
    // Get soil type estimate based on location
    const soilType = await this.estimateSoilType(latitude, longitude);
    
    // Generate recommendations for top crops
    const recommendations: EnhancedCropRecommendation[] = [];
    const suitableCrops = this.findSuitableCrops(longTermPrediction, soilType, latitude);
    
    for (const cropName of suitableCrops.slice(0, 5)) { // Top 5 recommendations
      const recommendation = await this.generateCropRecommendation(
        cropName,
        longTermPrediction,
        soilType,
        landHistory,
        latitude,
        longitude
      );
      recommendations.push(recommendation);
    }

    // Sort by confidence and sustainability
    recommendations.sort((a, b) => {
      const scoreA = a.confidence * 0.6 + a.sustainabilityScore.score * 4;
      const scoreB = b.confidence * 0.6 + b.sustainabilityScore.score * 4;
      return scoreB - scoreA;
    });

    return recommendations;
  }

  private async getLandHistory(landId: number): Promise<any> {
    try {
      const landArea = await storage.getLandAreaById(landId);
      return landArea?.cropHistory || [];
    } catch (error) {
      console.error("Error fetching land history:", error);
      return [];
    }
  }

  private async estimateSoilType(latitude: number, longitude: number): Promise<string> {
    // Enhanced soil type estimation based on geographical location
    // In a real implementation, you'd use soil database APIs
    
    // Simple heuristic based on latitude (can be enhanced with actual soil data APIs)
    if (latitude > 30) return "Sandy loam";      // Northern regions
    if (latitude > 20) return "Loam";            // Temperate regions  
    if (latitude > 10) return "Clay loam";       // Subtropical regions
    return "Alluvial";                           // Tropical regions
  }

  private findSuitableCrops(
    prediction: LongTermWeatherPrediction, 
    soilType: string, 
    latitude: number
  ): string[] {
    const suitable: Array<{ crop: string; score: number }> = [];
    
    for (const [cropName, cropData] of Object.entries(CROP_DATABASE)) {
      let score = 0;
      
      // Temperature compatibility
      const avgTemp = prediction.monthlyData.reduce((sum, month) => sum + month.temperature.avg, 0) / 6;
      if (avgTemp >= cropData.optimalTemp.min && avgTemp <= cropData.optimalTemp.max) {
        score += 30;
      } else {
        const tempDiff = Math.min(
          Math.abs(avgTemp - cropData.optimalTemp.min),
          Math.abs(avgTemp - cropData.optimalTemp.max)
        );
        score += Math.max(0, 30 - tempDiff * 2);
      }
      
      // Precipitation compatibility
      const avgPrecip = prediction.monthlyData.reduce((sum, month) => sum + month.precipitation.total, 0) / 6;
      if (cropData.waterRequirement === "High" && avgPrecip > 80) score += 25;
      else if (cropData.waterRequirement === "Medium" && avgPrecip > 40 && avgPrecip < 120) score += 25;
      else if (cropData.waterRequirement === "Low" && avgPrecip < 60) score += 25;
      else score += Math.max(0, 15 - Math.abs(avgPrecip - 60) / 4);
      
      // Soil compatibility
      if (cropData.soilType.some(soil => soil.toLowerCase().includes(soilType.toLowerCase()))) {
        score += 20;
      }
      
      // Climate zone compatibility (rough estimate)
      const climateZone = this.getClimateZone(latitude);
      if (cropData.climateZones.includes(climateZone)) {
        score += 15;
      }
      
      // Market value and sustainability bonus
      if (cropData.marketValue === "High") score += 5;
      score += cropData.sustainability;
      
      suitable.push({ crop: cropName, score });
    }
    
    return suitable
      .sort((a, b) => b.score - a.score)
      .map(item => item.crop);
  }

  private getClimateZone(latitude: number): number {
    if (latitude > 35) return 5;      // Temperate
    if (latitude > 25) return 4;      // Warm temperate
    if (latitude > 15) return 3;      // Subtropical
    if (latitude > 5) return 2;       // Tropical
    return 1;                         // Equatorial
  }

  private async generateCropRecommendation(
    cropName: string,
    prediction: LongTermWeatherPrediction,
    soilType: string,
    landHistory: any,
    latitude: number,
    longitude: number
  ): Promise<EnhancedCropRecommendation> {
    const cropData = CROP_DATABASE[cropName];
    const currentDate = new Date();
    
    // Calculate planting windows
    const plantingWindow = this.calculatePlantingWindow(cropData, prediction, currentDate);
    const harvestPeriod = this.calculateHarvestPeriod(plantingWindow.optimal.start, cropData.growthPeriod);
    
    // Calculate confidence based on weather alignment
    const confidence = this.calculateCropConfidence(cropData, prediction, soilType, latitude);
    
    // Generate monthly guidance
    const monthlyGuidance = this.generateMonthlyGuidance(cropData, prediction, plantingWindow.optimal.start);
    
    // Risk assessment
    const riskAssessment = this.assessRisks(cropData, prediction, landHistory);
    
    // Economic analysis
    const economicAnalysis = this.performEconomicAnalysis(cropName, cropData, prediction);
    
    // Yield prediction
    const yieldPrediction = this.predictYield(cropData, prediction, soilType);
    
    return {
      cropName,
      confidence,
      reasoning: this.generateReasoning(cropData, prediction, soilType, confidence),
      detailedPlan: this.generateDetailedPlan(cropData, prediction, monthlyGuidance),
      plantingWindow,
      harvestPeriod,
      yieldPrediction,
      riskAssessment,
      economicAnalysis,
      sustainabilityScore: {
        score: cropData.sustainability,
        factors: this.getSustainabilityFactors(cropData, prediction)
      },
      monthlyGuidance
    };
  }

  private calculatePlantingWindow(cropData: any, prediction: LongTermWeatherPrediction, currentDate: Date): any {
    const optimalStart = new Date(currentDate);
    optimalStart.setDate(currentDate.getDate() + 14); // 2 weeks from now
    
    const optimalEnd = new Date(optimalStart);
    optimalEnd.setDate(optimalStart.getDate() + 30); // 30-day window
    
    const acceptableStart = new Date(optimalStart);
    acceptableStart.setDate(optimalStart.getDate() - 14);
    
    const acceptableEnd = new Date(optimalEnd);
    acceptableEnd.setDate(optimalEnd.getDate() + 30);
    
    return {
      optimal: { start: optimalStart, end: optimalEnd },
      acceptable: { start: acceptableStart, end: acceptableEnd }
    };
  }

  private calculateHarvestPeriod(plantingDate: Date, growthPeriod: number): any {
    const expected = new Date(plantingDate);
    expected.setDate(plantingDate.getDate() + growthPeriod);
    
    const latest = new Date(expected);
    latest.setDate(expected.getDate() + 14); // Allow 2 weeks flexibility
    
    return { expected, latest };
  }

  private calculateCropConfidence(cropData: any, prediction: LongTermWeatherPrediction, soilType: string, latitude: number): number {
    let confidence = 50; // Base confidence
    
    // Temperature alignment
    const avgTemp = prediction.monthlyData.reduce((sum, month) => sum + month.temperature.avg, 0) / 6;
    const tempRange = cropData.optimalTemp.max - cropData.optimalTemp.min;
    const tempAlignment = Math.max(0, 1 - Math.abs(avgTemp - (cropData.optimalTemp.min + tempRange / 2)) / tempRange);
    confidence += tempAlignment * 30;
    
    // Precipitation alignment  
    const avgPrecip = prediction.monthlyData.reduce((sum, month) => sum + month.precipitation.total, 0) / 6;
    const waterScore = this.getWaterAlignmentScore(cropData.waterRequirement, avgPrecip);
    confidence += waterScore * 15;
    
    // Climate zone match
    const climateZone = this.getClimateZone(latitude);
    if (cropData.climateZones.includes(climateZone)) confidence += 5;
    
    return Math.min(95, Math.max(30, Math.round(confidence)));
  }

  private getWaterAlignmentScore(requirement: string, avgPrecip: number): number {
    switch (requirement) {
      case "High": return avgPrecip > 80 ? 1 : Math.max(0, 1 - (80 - avgPrecip) / 40);
      case "Medium": return avgPrecip > 40 && avgPrecip < 120 ? 1 : Math.max(0, 1 - Math.abs(avgPrecip - 80) / 40);
      case "Low": return avgPrecip < 60 ? 1 : Math.max(0, 1 - (avgPrecip - 60) / 40);
      default: return 0.5;
    }
  }

  private generateMonthlyGuidance(cropData: any, prediction: LongTermWeatherPrediction, plantingDate: Date): any[] {
    const guidance = [];
    const currentDate = new Date(plantingDate);
    
    for (let i = 0; i < 6; i++) {
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();
      const monthData = prediction.monthlyData[i];
      
      let activity = "";
      let priority: "High" | "Medium" | "Low" = "Medium";
      let weatherConsideration = "";
      
      if (i === 0) {
        activity = "Land preparation and planting";
        priority = "High";
        weatherConsideration = `Optimal temperature ${monthData.temperature.avg}°C. ${monthData.conditions}`;
      } else if (i === Math.floor(cropData.growthPeriod / 30) - 1) {
        activity = "Harvest preparation";
        priority = "High";
        weatherConsideration = `Monitor for ${monthData.conditions.toLowerCase()} conditions`;
      } else if (i < Math.floor(cropData.growthPeriod / 30)) {
        activity = "Growth monitoring and care";
        priority = "Medium";
        weatherConsideration = `Irrigation needs: ${prediction.agriculturalMetrics.irrigationNeeds[i]}`;
      } else {
        activity = "Post-harvest activities";
        priority = "Low";
        weatherConsideration = "Plan for next season";
      }
      
      guidance.push({
        month,
        year,
        activity,
        priority,
        weatherConsideration
      });
      
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
    
    return guidance;
  }

  private assessRisks(cropData: any, prediction: LongTermWeatherPrediction, landHistory: any): any {
    const risks = [];
    const mitigation = [];
    
    // Weather-based risks
    const extremeTemp = prediction.monthlyData.some(month => 
      month.temperature.max > 40 || month.temperature.min < 5
    );
    if (extremeTemp) {
      risks.push("Extreme temperature stress");
      mitigation.push("Use shade nets or protective covering during extreme weather");
    }
    
    const drought = prediction.monthlyData.some(month => month.precipitation.total < 20);
    if (drought) {
      risks.push("Drought stress");
      mitigation.push("Install drip irrigation system for water efficiency");
    }
    
    const flooding = prediction.monthlyData.some(month => month.precipitation.total > 200);
    if (flooding) {
      risks.push("Waterlogging");
      mitigation.push("Ensure proper drainage systems are in place");
    }
    
    // Pest and disease risks
    const highHumidity = prediction.monthlyData.some(month => month.humidity > 80);
    if (highHumidity) {
      risks.push("Fungal disease pressure");
      mitigation.push("Regular monitoring and organic fungicide application");
    }
    
    // Determine overall risk level
    let overall: "Low" | "Medium" | "High" = "Low";
    if (risks.length > 3) overall = "High";
    else if (risks.length > 1) overall = "Medium";
    
    return { overall, factors: risks, mitigation };
  }

  private performEconomicAnalysis(cropName: string, cropData: any, prediction: LongTermWeatherPrediction): any {
    // Simplified economic analysis - in production, use real market data
    const baseRevenue = cropData.marketValue === "High" ? 50000 : 
                       cropData.marketValue === "Medium" ? 30000 : 15000;
    
    const inputCosts = cropData.category === "Cash crop" ? 20000 : 
                      cropData.category === "Cereal" ? 15000 : 10000;
    
    const weatherBonus = prediction.confidence > 80 ? 1.2 : 
                        prediction.confidence > 60 ? 1.0 : 0.8;
    
    const estimatedRevenue = Math.round(baseRevenue * weatherBonus);
    const profitMargin = Math.round(((estimatedRevenue - inputCosts) / estimatedRevenue) * 100);
    
    return {
      estimatedRevenue: `₹${estimatedRevenue.toLocaleString()}`,
      inputCosts: `₹${inputCosts.toLocaleString()}`,
      profitMargin: `${profitMargin}%`,
      marketDemand: cropData.marketValue as "Low" | "Medium" | "High"
    };
  }

  private predictYield(cropData: any, prediction: LongTermWeatherPrediction, soilType: string): any {
    // Simplified yield prediction - in production, use ML models
    const baseYield = cropData.category === "Cereal" ? 25 :
                     cropData.category === "Cash crop" ? 15 :
                     cropData.category === "Vegetable" ? 30 : 20;
    
    const weatherFactor = prediction.confidence / 100;
    const expectedYield = Math.round(baseYield * weatherFactor * 10) / 10;
    
    return {
      expected: `${expectedYield} quintals per hectare`,
      range: { min: expectedYield * 0.8, max: expectedYield * 1.2 },
      unit: "quintals/hectare"
    };
  }

  private generateReasoning(cropData: any, prediction: LongTermWeatherPrediction, soilType: string, confidence: number): string {
    const avgTemp = prediction.monthlyData.reduce((sum, month) => sum + month.temperature.avg, 0) / 6;
    const avgPrecip = prediction.monthlyData.reduce((sum, month) => sum + month.precipitation.total, 0) / 6;
    
    return `${cropData.category} crop suitable for ${soilType.toLowerCase()} soil. ` +
           `Average temperature of ${avgTemp.toFixed(1)}°C aligns well with optimal range ${cropData.optimalTemp.min}-${cropData.optimalTemp.max}°C. ` +
           `Expected precipitation of ${avgPrecip.toFixed(0)}mm/month meets ${cropData.waterRequirement.toLowerCase()} water requirements. ` +
           `High sustainability score of ${cropData.sustainability}/10 ensures environmental benefits. ` +
           `Market demand is ${cropData.marketValue.toLowerCase()} with good economic potential.`;
  }

  private generateDetailedPlan(cropData: any, prediction: LongTermWeatherPrediction, monthlyGuidance: any[]): string {
    return `DETAILED CULTIVATION PLAN:\n\n` +
           `PREPARATION: Land preparation 2 weeks before planting. Soil testing and organic matter addition.\n` +
           `PLANTING: ${cropData.category} seeds with ${cropData.growthPeriod}-day growth cycle.\n` +
           `IRRIGATION: ${cropData.waterRequirement} water requirement - adjust based on monthly rainfall.\n` +
           `FERTILIZATION: Organic fertilizers preferred. NPK ratio based on soil test results.\n` +
           `PEST MANAGEMENT: Regular monitoring for ${cropData.commonDiseases.join(', ')}.\n` +
           `COMPANION PLANTING: Consider ${cropData.companions.join(', ')} for natural pest control.\n` +
           `HARVEST: Expected in ${Math.round(cropData.growthPeriod / 30)} months with proper timing crucial.\n` +
           `POST-HARVEST: Proper storage and market timing for best prices.\n\n` +
           `MONTHLY ACTIVITIES:\n${monthlyGuidance.map(g => `Month ${g.month}: ${g.activity}`).join('\n')}`;
  }

  private getSustainabilityFactors(cropData: any, prediction: LongTermWeatherPrediction): string[] {
    const factors = [];
    
    if (cropData.category === "Legume") factors.push("Nitrogen fixation improves soil");
    if (cropData.sustainability > 7) factors.push("Low environmental impact");
    if (cropData.waterRequirement === "Low") factors.push("Water-efficient crop");
    if (cropData.companions.length > 0) factors.push("Supports companion planting");
    
    const lowPestRisk = prediction.agriculturalMetrics.pestRisk.filter(risk => risk === "Low").length;
    if (lowPestRisk > 3) factors.push("Reduced pesticide need");
    
    return factors;
  }

  // New comprehensive analysis methods
  private findSuitableCropsFromComprehensiveAnalysis(
    analysis: ComprehensiveWeatherAnalysis,
    latitude: number
  ): string[] {
    const suitable: Array<{ crop: string; score: number }> = [];
    
    for (const [cropName, cropData] of Object.entries(CROP_DATABASE)) {
      let score = 0;
      
      // Historical climate compatibility (30-year data from NASA POWER)
      const climaticNormals = analysis.historicalAnalysis?.climaticNormals;
      const historicalTemp = climaticNormals?.temperature?.annual?.avg;
      if (historicalTemp && historicalTemp >= cropData.optimalTemp.min && historicalTemp <= cropData.optimalTemp.max) {
        score += 35; // Higher weight for historical stability
      } else if (historicalTemp) {
        const tempDiff = Math.min(
          Math.abs(historicalTemp - cropData.optimalTemp.min),
          Math.abs(historicalTemp - cropData.optimalTemp.max)
        );
        score += Math.max(0, 35 - tempDiff * 3);
      } else {
        // No historical data, use basic score
        score += 20;
      }
      
      // Seasonal forecast compatibility (ECMWF SEAS5 6-month outlook)
      const monthlyOutlook = analysis.seasonalForecast?.monthlyOutlook;
      const seasonalPrecip = monthlyOutlook && Array.isArray(monthlyOutlook) 
        ? monthlyOutlook.reduce((sum, month) => sum + (month?.precipitation?.expected || 50), 0) / monthlyOutlook.length
        : 50; // Default moderate precipitation
      
      if (cropData.waterRequirement === "High" && seasonalPrecip > 80) score += 30;
      else if (cropData.waterRequirement === "Medium" && seasonalPrecip > 40 && seasonalPrecip < 120) score += 30;
      else if (cropData.waterRequirement === "Low" && seasonalPrecip < 60) score += 30;
      else score += Math.max(0, 20 - Math.abs(seasonalPrecip - 60) / 3);
      
      // Soil compatibility (enhanced soil analysis)
      const soilType = analysis.agriculturalAnalysis?.soilConditions?.type || "Loam";
      if (cropData.soilType.some(soil => soil.toLowerCase().includes(soilType.toLowerCase()))) {
        score += 25;
      }
      
      // Soil moisture from ECMWF SEAS5
      const avgSoilMoisture = analysis.seasonalForecast.monthlyOutlook.reduce(
        (sum, month) => sum + (month.soilMoisture.rootZone || 0.25), 0
      ) / analysis.seasonalForecast.monthlyOutlook.length;
      
      if (cropData.waterRequirement === "High" && avgSoilMoisture > 0.3) score += 15;
      else if (cropData.waterRequirement === "Medium" && avgSoilMoisture > 0.2) score += 15;
      else if (cropData.waterRequirement === "Low" && avgSoilMoisture > 0.15) score += 15;
      
      // Climate zone and extreme events resistance
      const climateZone = this.getClimateZone(latitude);
      if (cropData.climateZones.includes(climateZone)) {
        score += 20;
      }
      
      // Extreme weather resilience bonus
      const extremeEvents = analysis.historicalAnalysis?.extremeEvents || [];
      const droughtEvents = extremeEvents.filter(e => e?.type === 'drought').length;
      const floodEvents = extremeEvents.filter(e => e?.type === 'flood').length;
      
      if (droughtEvents > 2 && cropData.waterRequirement === "Low") score += 10;
      if (floodEvents > 2 && cropData.soilType.includes("Well-drained")) score += 10;
      
      // Market value and sustainability bonus
      if (cropData.marketValue === "High") score += 8;
      score += cropData.sustainability * 1.5;
      
      // Solar radiation compatibility (NASA POWER data)
      const avgSolarRadiation = analysis.historicalAnalysis?.climaticNormals?.solarRadiation?.annual?.avg || 0;
      if (avgSolarRadiation > 15 && ["Rice", "Maize", "Cotton", "Sugarcane"].includes(cropName)) {
        score += 10; // High solar radiation crops
      }
      
      suitable.push({ crop: cropName, score });
    }
    
    return suitable
      .sort((a, b) => b.score - a.score)
      .map(item => item.crop);
  }
  
  private async generateComprehensiveCropRecommendation(
    cropName: string,
    analysis: ComprehensiveWeatherAnalysis,
    landHistory: any,
    latitude: number,
    longitude: number
  ): Promise<EnhancedCropRecommendation> {
    const cropData = CROP_DATABASE[cropName];
    const currentDate = new Date();
    
    // Calculate planting windows using comprehensive data
    const plantingWindow = this.calculateComprehensivePlantingWindow(
      cropData, 
      analysis, 
      currentDate
    );
    const harvestPeriod = this.calculateHarvestPeriod(
      plantingWindow.optimal.start, 
      cropData.growthPeriod
    );
    
    // Calculate confidence based on comprehensive weather data
    const confidence = this.calculateComprehensiveCropConfidence(
      cropData, 
      analysis, 
      latitude
    );
    
    // Generate monthly guidance using seasonal forecast
    const monthlyGuidance = this.generateComprehensiveMonthlyGuidance(
      cropData, 
      analysis, 
      plantingWindow.optimal.start
    );
    
    // Enhanced risk assessment using all data sources
    const riskAssessment = this.assessComprehensiveRisks(
      cropData, 
      analysis, 
      landHistory
    );
    
    // Enhanced economic analysis
    const economicAnalysis = this.performComprehensiveEconomicAnalysis(
      cropName, 
      cropData, 
      analysis
    );
    
    // Enhanced yield prediction
    const yieldPrediction = this.predictComprehensiveYield(
      cropData, 
      analysis
    );
    
    return {
      cropName,
      confidence,
      reasoning: this.generateComprehensiveReasoning(
        cropData, 
        analysis, 
        confidence
      ),
      detailedPlan: this.generateComprehensiveDetailedPlan(
        cropData, 
        analysis, 
        monthlyGuidance
      ),
      plantingWindow,
      harvestPeriod,
      yieldPrediction,
      riskAssessment,
      economicAnalysis,
      sustainabilityScore: {
        score: this.calculateComprehensiveSustainabilityScore(cropData, analysis),
        factors: this.getComprehensiveSustainabilityFactors(cropData, analysis)
      },
      monthlyGuidance
    };
  }
  
  private calculateComprehensivePlantingWindow(
    cropData: any, 
    analysis: ComprehensiveWeatherAnalysis, 
    currentDate: Date
  ): any {
    // Use seasonal forecast to optimize planting timing
    const seasonalOutlook = analysis.seasonalForecast.monthlyOutlook;
    const nextMonth = seasonalOutlook.find(month => 
      new Date(month.year, month.month - 1) > currentDate
    );
    
    let daysOffset = 14; // Default 2 weeks
    
    // Adjust based on seasonal forecast
    if (nextMonth) {
      if (nextMonth.precipitation.anomaly < -20) {
        daysOffset += 7; // Delay if very dry
      } else if (nextMonth.precipitation.anomaly > 30) {
        daysOffset -= 7; // Advance if very wet expected
      }
      
      if (nextMonth.temperature.anomaly > 3) {
        daysOffset += 5; // Delay if much warmer
      } else if (nextMonth.temperature.anomaly < -2) {
        daysOffset -= 5; // Advance if cooler
      }
    }
    
    const optimalStart = new Date(currentDate);
    optimalStart.setDate(currentDate.getDate() + daysOffset);
    
    const optimalEnd = new Date(optimalStart);
    optimalEnd.setDate(optimalStart.getDate() + 21); // 3-week window
    
    const acceptableStart = new Date(optimalStart);
    acceptableStart.setDate(optimalStart.getDate() - 10);
    
    const acceptableEnd = new Date(optimalEnd);
    acceptableEnd.setDate(optimalEnd.getDate() + 21);
    
    return {
      optimal: { start: optimalStart, end: optimalEnd },
      acceptable: { start: acceptableStart, end: acceptableEnd }
    };
  }
  
  private calculateComprehensiveCropConfidence(
    cropData: any, 
    analysis: ComprehensiveWeatherAnalysis, 
    latitude: number
  ): number {
    let confidence = 60; // Higher base confidence with comprehensive data
    
    // Historical temperature alignment (30-year NASA POWER data)
    const historicalTemp = analysis.historicalAnalysis?.climaticNormals?.temperature?.annual?.avg || 25;
    const tempOptimal = (cropData.optimalTemp.min + cropData.optimalTemp.max) / 2;
    const tempDiff = Math.abs(historicalTemp - tempOptimal);
    
    if (tempDiff < 2) confidence += 15;
    else if (tempDiff < 5) confidence += 8;
    else if (tempDiff > 10) confidence -= 15;
    
    // Seasonal forecast reliability (ECMWF SEAS5 confidence)
    const seasonalConfidence = (analysis.seasonalForecast?.confidence || 70) / 100;
    confidence *= (0.8 + (seasonalConfidence * 0.4));
    
    // Data source quality bonus
    const dataQuality = (
      (analysis.dataSources?.nasaPower?.confidence || 0) +
      (analysis.dataSources?.openMeteo?.confidence || 0) +
      (analysis.dataSources?.openWeather?.confidence || 0)
    ) / 300; // Average of all three
    
    confidence += dataQuality * 15;
    
    // Climate stability bonus (low extreme events)
    const extremeEvents = (analysis.historicalAnalysis?.extremeEvents || []).filter(
      e => e.severity === 'high' || e.severity === 'extreme'
    ).length;
    
    if (extremeEvents < 3) confidence += 8;
    else if (extremeEvents < 6) confidence += 4;
    
    return Math.min(98, Math.max(40, Math.round(confidence)));
  }
  
  // Additional comprehensive analysis methods...
  private generateComprehensiveMonthlyGuidance(
    cropData: any, 
    analysis: ComprehensiveWeatherAnalysis, 
    plantingDate: Date
  ): any[] {
    const guidance = [];
    const currentDate = new Date(plantingDate);
    
    for (let i = 0; i < 6; i++) {
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();
      const monthlyForecast = analysis.seasonalForecast?.monthlyOutlook?.[i];
      
      let activity = "";
      let priority: "High" | "Medium" | "Low" = "Medium";
      let weatherConsideration = "";
      
      if (i === 0) {
        activity = "Land preparation and planting";
        priority = "High";
        weatherConsideration = `Seasonal forecast: ${monthlyForecast?.precipitation.anomaly > 0 ? 'Above normal' : 'Normal'} rainfall expected. Soil moisture: ${(monthlyForecast?.soilMoisture.rootZone || 0.25).toFixed(2)}`;
      } else if (i === Math.floor(cropData.growthPeriod / 30) - 1) {
        activity = "Harvest preparation";
        priority = "High";
        weatherConsideration = `Monitor weather patterns. Expected conditions: ${monthlyForecast?.temperature.anomaly > 2 ? 'warmer' : 'normal'} temperatures`;
      } else if (i < Math.floor(cropData.growthPeriod / 30)) {
        activity = "Growth monitoring and care";
        priority = "Medium";
        weatherConsideration = `Irrigation planning: ET0 ${(monthlyForecast?.evapotranspiration || 4.5).toFixed(1)} mm/day expected`;
      } else {
        activity = "Post-harvest activities";
        priority = "Low";
        weatherConsideration = "Plan for next season based on seasonal patterns";
      }
      
      guidance.push({
        month,
        year,
        activity,
        priority,
        weatherConsideration
      });
      
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
    
    return guidance;
  }
  
  private assessComprehensiveRisks(
    cropData: any, 
    analysis: ComprehensiveWeatherAnalysis, 
    landHistory: any
  ): any {
    const risks = [];
    const mitigation = [];
    
    // Historical extreme events analysis
    const recentExtremes = (analysis.historicalAnalysis?.extremeEvents || []).filter(
      e => e.year > new Date().getFullYear() - 10
    );
    
    recentExtremes.forEach(event => {
      if (event.type === 'drought' && cropData.waterRequirement === 'High') {
        risks.push(`Drought risk based on ${event.year} event`);
        mitigation.push("Install efficient irrigation system with soil moisture monitoring");
      }
      if (event.type === 'flood' && !cropData.soilType.includes('Well-drained')) {
        risks.push(`Waterlogging risk based on ${event.year} event`);
        mitigation.push("Implement raised bed cultivation and drainage systems");
      }
    });
    
    // Seasonal forecast risks
    const seasonalAnomalies = (analysis.seasonalForecast?.monthlyOutlook || []).filter(
      month => Math.abs(month.temperature.anomaly) > 2 || Math.abs(month.precipitation.anomaly) > 25
    );
    
    if (seasonalAnomalies.length > 2) {
      risks.push("Seasonal weather variability above normal");
      mitigation.push("Use climate-resilient varieties and flexible planting dates");
    }
    
    // Soil moisture stress
    const lowSoilMoisture = (analysis.seasonalForecast?.monthlyOutlook || []).filter(
      month => month.soilMoisture.rootZone < 0.2
    ).length;
    
    if (lowSoilMoisture > 2) {
      risks.push("Soil moisture stress periods expected");
      mitigation.push("Apply mulching and water-conserving practices");
    }
    
    // Climate change trends
    if ((analysis.historicalAnalysis?.trends?.temperatureTrend || 0) > 0.2) {
      risks.push("Long-term warming trend affecting crop suitability");
      mitigation.push("Consider heat-tolerant varieties and adjust planting times");
    }
    
    // Determine overall risk level
    let overall: "Low" | "Medium" | "High" = "Low";
    if (risks.length > 4) overall = "High";
    else if (risks.length > 2) overall = "Medium";
    
    return { overall, factors: risks, mitigation };
  }
  
  private performComprehensiveEconomicAnalysis(
    cropName: string, 
    cropData: any, 
    analysis: ComprehensiveWeatherAnalysis
  ): any {
    // Enhanced economic analysis using comprehensive data
    const baseRevenue = cropData.marketValue === "High" ? 65000 : 
                       cropData.marketValue === "Medium" ? 40000 : 22000;
    
    const inputCosts = cropData.category === "Cash crop" ? 25000 : 
                      cropData.category === "Cereal" ? 18000 : 12000;
    
    // Weather impact on revenue
    let weatherMultiplier = 1.0;
    
    // Historical stability bonus
    const extremeEvents = (analysis.historicalAnalysis?.extremeEvents || []).filter(
      e => e.severity === 'high' || e.severity === 'extreme'
    ).length;
    if (extremeEvents < 3) weatherMultiplier += 0.15;
    
    // Seasonal forecast impact
    const seasonalConfidence = (analysis.seasonalForecast?.confidence || 70) / 100;
    weatherMultiplier += (seasonalConfidence - 0.7) * 0.3;
    
    // Soil conditions impact
    const soilQuality = analysis.agriculturalAnalysis?.soilConditions?.fertility || 'medium';
    if (soilQuality === 'high') weatherMultiplier += 0.12;
    else if (soilQuality === 'low') weatherMultiplier -= 0.08;
    
    const estimatedRevenue = Math.round(baseRevenue * weatherMultiplier);
    const profitMargin = Math.round(((estimatedRevenue - inputCosts) / estimatedRevenue) * 100);
    
    return {
      estimatedRevenue: `₹${estimatedRevenue.toLocaleString()}`,
      inputCosts: `₹${inputCosts.toLocaleString()}`,
      profitMargin: `${profitMargin}%`,
      marketDemand: cropData.marketValue as "Low" | "Medium" | "High",
      weatherImpactFactor: weatherMultiplier.toFixed(2),
      riskAdjustedReturn: `₹${Math.round((estimatedRevenue - inputCosts) * 0.85).toLocaleString()}`
    };
  }
  
  private predictComprehensiveYield(
    cropData: any, 
    analysis: ComprehensiveWeatherAnalysis
  ): any {
    // Enhanced yield prediction using comprehensive data
    const baseYield = cropData.category === "Cereal" ? 28 :
                     cropData.category === "Cash crop" ? 18 :
                     cropData.category === "Vegetable" ? 35 :
                     cropData.category === "Fruit" ? 25 : 22;
    
    let yieldMultiplier = 1.0;
    
    // Historical climate suitability
    const historicalTemp = analysis.historicalAnalysis?.climaticNormals?.temperature?.annual?.avg || 25;
    const tempOptimal = (cropData.optimalTemp.min + cropData.optimalTemp.max) / 2;
    const tempDeviation = Math.abs(historicalTemp - tempOptimal) / tempOptimal;
    
    yieldMultiplier *= Math.max(0.7, 1 - tempDeviation);
    
    // Seasonal forecast impact
    const monthlyOutlook = analysis.seasonalForecast?.monthlyOutlook || [];
    const avgSeasonalPrecip = monthlyOutlook.length > 0 ? monthlyOutlook.reduce(
      (sum, month) => sum + month.precipitation.expected, 0
    ) / monthlyOutlook.length : 100;
    
    const waterMatch = this.getWaterAlignmentScore(cropData.waterRequirement, avgSeasonalPrecip);
    yieldMultiplier *= (0.8 + waterMatch * 0.4);
    
    // Soil conditions
    const soilFertility = analysis.agriculturalAnalysis?.soilConditions?.fertility || 'medium';
    if (soilFertility === 'high') yieldMultiplier *= 1.15;
    else if (soilFertility === 'low') yieldMultiplier *= 0.9;
    
    // Solar radiation (from NASA POWER)
    const solarRadiation = analysis.historicalAnalysis?.climaticNormals?.solarRadiation?.annual?.avg;
    if (solarRadiation > 18 && ["Rice", "Maize", "Cotton"].includes(cropData.category)) {
      yieldMultiplier *= 1.08;
    }
    
    const expectedYield = Math.round(baseYield * yieldMultiplier * 10) / 10;
    
    return {
      expected: `${expectedYield} quintals per hectare`,
      range: { 
        min: Math.round(expectedYield * 0.75 * 10) / 10, 
        max: Math.round(expectedYield * 1.25 * 10) / 10 
      },
      unit: "quintals/hectare",
      yieldFactor: yieldMultiplier.toFixed(2),
      optimalConditions: yieldMultiplier > 1.1
    };
  }
  
  private generateComprehensiveReasoning(
    cropData: any, 
    analysis: ComprehensiveWeatherAnalysis, 
    confidence: number
  ): string {
    const historicalTemp = analysis.historicalAnalysis?.climaticNormals?.temperature?.annual?.avg || 25;
    const seasonalPrecip = (analysis.seasonalForecast?.monthlyOutlook || []).reduce(
      (sum, month) => sum + month.precipitation.expected, 0
    ) / 6 || 100;
    const soilType = analysis.agriculturalAnalysis?.soilConditions?.type || 'Loam';
    
    return `${cropData.category} crop with ${confidence}% suitability confidence based on comprehensive 30-year climate analysis. ` +
           `Historical average temperature of ${historicalTemp.toFixed(1)}°C aligns ${historicalTemp >= cropData.optimalTemp.min && historicalTemp <= cropData.optimalTemp.max ? 'perfectly' : 'reasonably'} with optimal range ${cropData.optimalTemp.min}-${cropData.optimalTemp.max}°C. ` +
           `ECMWF SEAS5 seasonal forecast indicates ${seasonalPrecip.toFixed(0)}mm/month precipitation, ${this.getWaterCompatibilityText(cropData.waterRequirement, seasonalPrecip)}. ` +
           `Soil analysis shows ${soilType.toLowerCase()} soil with ${analysis.agriculturalAnalysis?.soilConditions?.fertility || 'medium'} fertility, ${cropData.soilType.some((s: string) => s.toLowerCase().includes(soilType.toLowerCase())) ? 'well-suited' : 'moderately suited'} for this crop. ` +
           `NASA POWER data shows stable solar radiation at ${analysis.historicalAnalysis?.climaticNormals?.solarRadiation?.annual?.avg?.toFixed(1) || 0} MJ/m²/day. ` +
           `Sustainability score of ${cropData.sustainability}/10 with ${analysis.agriculturalAnalysis?.riskAssessment?.overall?.toLowerCase() || 'low'} risk profile ensures sustainable production.`;
  }
  
  private getWaterCompatibilityText(requirement: string, precipitation: number): string {
    switch (requirement) {
      case "High":
        return precipitation > 80 ? "excellent for high water needs" : "may require supplemental irrigation";
      case "Medium":
        return precipitation > 40 && precipitation < 120 ? "optimal for moderate water needs" : "manageable with proper water management";
      case "Low":
        return precipitation < 60 ? "ideal for drought-tolerant crop" : "well-suited with good drainage";
      default:
        return "suitable for crop water requirements";
    }
  }
  
  private generateComprehensiveDetailedPlan(
    cropData: any, 
    analysis: ComprehensiveWeatherAnalysis, 
    monthlyGuidance: any[]
  ): string {
    const soilConditions = analysis.agriculturalAnalysis?.soilConditions || { type: 'Loam', pH: 6.5, fertility: 'Medium', organicMatter: 2.5 };
    const seasonalOutlook = analysis.seasonalForecast?.seasonalSummary || { dominantPattern: 'Normal', keyFeatures: ['Average rainfall', 'Normal temperatures'] };
    
    return `COMPREHENSIVE CULTIVATION PLAN (Based on 30-year NASA POWER data + ECMWF SEAS5 seasonal forecast):\n\n` +
           `LAND PREPARATION: Optimize for ${soilConditions.type.toLowerCase()} soil (pH: ${soilConditions.pH}, Fertility: ${soilConditions.fertility}). ` +
           `Organic matter enhancement recommended due to ${soilConditions.organicMatter}% current levels.\n` +
           `PLANTING STRATEGY: ${cropData.category} with ${cropData.growthPeriod}-day cycle. Timing optimized using seasonal forecast anomalies.\n` +
           `WATER MANAGEMENT: ${cropData.waterRequirement} requirement crop. ${(analysis.agriculturalAnalysis?.waterManagement?.irrigationNeed || 'Standard').toUpperCase()} irrigation priority. ` +
           `Monitor soil moisture at 0-7cm (surface) and 7-28cm (root zone) depths.\n` +
           `FERTILIZATION: NPK based on soil test + ${soilConditions.fertility} fertility status. Organic amendments for ${soilConditions.organicMatter}% OM improvement.\n` +
           `PEST & DISEASE: Historical data shows ${(analysis.historicalAnalysis?.extremeEvents || []).filter(e => e.type === 'heatwave').length} heat stress events. ` +
           `Monitor for ${cropData.commonDiseases.join(', ')} during high humidity periods.\n` +
           `CLIMATE ADAPTATION: ${seasonalOutlook.dominantPattern}. Key features: ${seasonalOutlook.keyFeatures.join(', ')}.\n` +
           `COMPANION CROPS: ${cropData.companions.join(', ')} for enhanced sustainability and pest management.\n` +
           `HARVEST TIMING: ${Math.round(cropData.growthPeriod / 30)} months with weather-optimized scheduling based on seasonal patterns.\n\n` +
           `MONTHLY ACTIVITIES (Weather-Informed):\n${monthlyGuidance.map(g => `Month ${g.month}: ${g.activity} - ${g.weatherConsideration}`).join('\n')}\n\n` +
           `RISK MITIGATION: ${(analysis.agriculturalAnalysis?.riskAssessment?.weatherRisks || []).length} identified weather risks with specific adaptation strategies included.`;
  }
  
  private calculateComprehensiveSustainabilityScore(cropData: any, analysis: ComprehensiveWeatherAnalysis): number {
    let score = cropData.sustainability; // Base score
    
    // Climate resilience bonus
    if ((analysis.historicalAnalysis?.extremeEvents || []).length < 5) score += 1;
    
    // Water efficiency
    if (cropData.waterRequirement === "Low") score += 1;
    
    // Soil health impact
    if (cropData.category === "Legume") score += 1;
    
    // Carbon footprint (based on growth period)
    if (cropData.growthPeriod < 100) score += 0.5;
    
    return Math.min(10, score);
  }
  
  private getComprehensiveSustainabilityFactors(cropData: any, analysis: ComprehensiveWeatherAnalysis): string[] {
    const factors = [];
    
    if (cropData.category === "Legume") factors.push("Nitrogen fixation improves soil health");
    if (cropData.sustainability > 7) factors.push("Low environmental impact crop");
    if (cropData.waterRequirement === "Low") factors.push("Water-efficient cultivation");
    if (cropData.companions.length > 0) factors.push("Supports companion planting systems");
    if ((analysis.historicalAnalysis?.extremeEvents || []).length < 5) factors.push("Climate-resilient choice");
    
    const monthlyOutlook = analysis.seasonalForecast?.monthlyOutlook || [];
    const avgSoilMoisture = monthlyOutlook.length > 0 ? monthlyOutlook.reduce(
      (sum, month) => sum + (month.soilMoisture.rootZone || 0.25), 0
    ) / monthlyOutlook.length : 0.25;
    
    if (avgSoilMoisture > 0.25) factors.push("Good soil moisture retention expected");
    if ((analysis.agriculturalAnalysis?.soilConditions?.organicMatter || 0) > 3) factors.push("Enhances existing soil organic matter");
    
    return factors;
  }
}

export const enhancedCropRecommendationEngine = new EnhancedCropRecommendationEngine();