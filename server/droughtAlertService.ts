import { sendWeatherAlert } from "./notificationService";
import { storage } from "./storage";
import { DroughtAnalysis } from "./droughtMonitoringService";
import { callMultipleAI, getCentralizedPrediction, executeIntelligentAIRequest } from "./aiService";
import { db } from "./db";
import { users, landAreas, notifications } from "../shared/schema";
import { eq, and, gte } from "drizzle-orm";

const ALERT_TRANSLATIONS: Record<string, any> = {
  en: {
    drought_alert: "Drought Alert",
    conditions_detected: "conditions detected",
    location: "Location",
    current_conditions: "Current Conditions",
    water_stress: "Water Stress",
    soil_moisture: "Soil Moisture",
    precip_deficit: "Precipitation Deficit",
    temp_anomaly: "Temperature Anomaly",
    forecast: "Forecast",
    yield_impact: "Expected Yield Impact",
    water_demand: "Water Demand Increase",
    recovery_expected: "Recovery Expected",
    recovery_timeline: "Recovery Timeline",
    immediate_actions: "Immediate Actions Required",
    water_conservation: "Water Conservation",
    need_help: "Need Help?",
    contact_help: "Contact your local agricultural extension office or visit our drought resource center.",
    valid_until: "Valid until",
    advisory: "Advisory",
    watch: "Watch",
    warning: "Warning",
    emergency: "EMERGENCY",
    reduction: "reduction",
    uncertain: "Uncertain",
    check_email: "Check email for details",
    actions: "ACTIONS"
  },
  hi: {
    drought_alert: "सूखा चेतावनी",
    conditions_detected: "स्थितियां पाई गईं",
    location: "स्थान",
    current_conditions: "वर्तमान स्थितियां",
    water_stress: "जल तनाव",
    soil_moisture: "मिट्टी की नमी",
    precip_deficit: "वर्षा की कमी",
    temp_anomaly: "तापमान विसंगति",
    forecast: "पूर्वानुमान",
    yield_impact: "अपेक्षित उपज प्रभाव",
    water_demand: "जल मांग में वृद्धि",
    recovery_expected: "सुधार की उम्मीद",
    recovery_timeline: "सुधार की समय सीमा",
    immediate_actions: "तत्काल कार्रवाई आवश्यक",
    water_conservation: "जल संरक्षण",
    need_help: "मदद चाहिए?",
    contact_help: "अपने स्थानीय कृषि विस्तार कार्यालय से संपर्क करें या हमारे सूखा संसाधन केंद्र पर जाएं।",
    valid_until: "तक मान्य",
    advisory: "सलाह",
    watch: "निगरानी",
    warning: "चेतावनी",
    emergency: "आपातकाल",
    reduction: "कमी",
    uncertain: "अनिश्चित",
    check_email: "विवरण के लिए ईमेल देखें",
    actions: "कार्रवाई"
  },
  ta: {
    drought_alert: "வறட்சி எச்சரிக்கை",
    conditions_detected: "நிலைகள் கண்டறியப்பட்டன",
    location: "இடம்",
    current_conditions: "தற்போதைய நிலைகள்",
    water_stress: "நீர் அழுத்தம்",
    soil_moisture: "மண் ஈரம்",
    precip_deficit: "மழை பற்றாக்குறை",
    temp_anomaly: "வெப்பநிலை மாறுபாடு",
    forecast: "முன்னறிவிப்பு",
    yield_impact: "எதிர்பார்க்கப்படும் மகசூல் பாதிப்பு",
    water_demand: "நீர் தேவை அதிகரிப்பு",
    recovery_expected: "மீட்பு எதிர்பார்க்கப்படுகிறது",
    recovery_timeline: "மீட்பு காலக்கெடு",
    immediate_actions: "உடனடி நடவடிக்கைகள் தேவை",
    water_conservation: "நீர் பாதுகாப்பு",
    need_help: "உதவி தேவையா?",
    contact_help: "உங்கள் உள்ளூர் வேளாண் விரிவாக்க அலுவலகத்தைத் தொடர்பு கொள்ளவும் அல்லது எங்கள் வறட்சி வள மையத்தைப் பார்வையிடவும்.",
    valid_until: "வரை செல்லுபடியாகும்",
    advisory: "ஆலோசனை",
    watch: "கண்காணிப்பு",
    warning: "எச்சரிக்கை",
    emergency: "அவசரநிலை",
    reduction: "குறைப்பு",
    uncertain: "நிச்சயமற்றது",
    check_email: "விவரங்களுக்கு மின்னஞ்சலைப் பார்க்கவும்",
    actions: "நடவடிக்கைகள்"
  },
  bn: {
    drought_alert: "খরা সতর্কতা",
    conditions_detected: "পরিস্থিতি সনাক্ত হয়েছে",
    location: "অবস্থান",
    current_conditions: "বর্তমান পরিস্থিতি",
    water_stress: "পানির চাপ",
    soil_moisture: "মাটির আর্দ্রতা",
    precip_deficit: "বৃষ্টিপাতের ঘাটতি",
    temp_anomaly: "তাপমাত্রার অসঙ্গতি",
    forecast: "পূর্বাভাস",
    yield_impact: "প্রত্যাশিত ফলন প্রভাব",
    water_demand: "পানির চাহিদা বৃদ্ধি",
    recovery_expected: "পুনরুদ্ধার প্রত্যাশিত",
    recovery_timeline: "পুনরুদ্ধারের সময়সীমা",
    immediate_actions: "তাৎক্ষণিক পদক্ষেপ প্রয়োজন",
    water_conservation: "পানি সংরক্ষণ",
    need_help: "সাহায্য প্রয়োজন?",
    contact_help: "আপনার স্থানীয় কৃষি সম্প্রসারণ অফিসে যোগাযোগ করুন বা আমাদের খরা সম্পদ কেন্দ্র দেখুন।",
    valid_until: "পর্যন্ত বৈধ",
    advisory: "পরামর্শ",
    watch: "নজরদারি",
    warning: "সতর্কতা",
    emergency: "জরুরি অবস্থা",
    reduction: "হ্রাস",
    uncertain: "অনিশ্চিত",
    check_email: "বিস্তারিত জানার জন্য ইমেল দেখুন",
    actions: "পদক্ষেপ"
  }
};

function getTranslation(key: string, lang: string = 'en'): string {
  const translations = ALERT_TRANSLATIONS[lang] || ALERT_TRANSLATIONS['en'];
  return translations[key] || ALERT_TRANSLATIONS['en'][key] || key;
}

export interface DroughtAlert {
  alertId: string;
  userId: string;
  landId?: number;
  alertLevel: "Yellow" | "Orange" | "Red" | "Emergency";
  severity: "Mild" | "Moderate" | "Severe" | "Extreme";
  location: { latitude: number; longitude: number; address?: string };
  
  // Alert timing and duration
  issuedAt: Date;
  validUntil: Date;
  expectedDuration: string; // Human readable duration
  
  // Drought conditions
  currentConditions: {
    waterStressIndex: number;
    soilMoisture: number;
    precipitationDeficit: number;
    temperatureAnomaly: number;
    pdsiValue: number;
    droughtCategory: string;
  };
  
  // Future outlook
  forecast: {
    peakDroughtMonth: number | null;
    recoveryExpected: Date | null;
    criticalPeriods: Array<{
      startDate: Date;
      endDate: Date;
      riskLevel: string;
    }>;
  };
  
  // Impact assessment
  impact: {
    cropRisk: "Low" | "Moderate" | "High" | "Critical";
    yieldLossEstimate: number; // percentage
    waterDemandIncrease: number; // percentage  
    economicImpact: string;
  };
  
  // Personalized recommendations
  recommendations: {
    immediateActions: string[];
    waterSaving: string[];
    cropProtection: string[];
    economicMitigation: string[];
  };
  
  // Alert delivery status
  deliveryStatus: {
    email: { sent: boolean; sentAt?: Date; error?: string };
    sms: { sent: boolean; sentAt?: Date; error?: string };
    push: { sent: boolean; sentAt?: Date; error?: string };
  };
  
  // Follow-up and monitoring
  followUpSchedule: Date[];
  escalationTriggers: string[];
  monitoringPoints: string[];
}

export interface DroughtAlertPreferences {
  userId: string;
  emailAlerts: boolean;
  smsAlerts: boolean;
  pushAlerts: boolean;
  alertLevels: ("Yellow" | "Orange" | "Red" | "Emergency")[];
  leadTime: number; // Days ahead to alert
  quietHours: { start: string; end: string };
  frequency: "Immediate" | "Daily" | "Weekly";
}

export class DroughtAlertService {
  private readonly ALERT_COOLDOWN = {
    "Yellow": 24 * 60 * 60 * 1000,    // 24 hours
    "Orange": 12 * 60 * 60 * 1000,    // 12 hours  
    "Red": 6 * 60 * 60 * 1000,       // 6 hours
    "Emergency": 2 * 60 * 60 * 1000   // 2 hours
  };

  /**
   * Process drought analysis and generate alerts
   */
  async processDroughtAnalysis(analysis: DroughtAnalysis): Promise<DroughtAlert[]> {
    try {
      console.log(`🚨 Processing drought alerts for analysis: ${analysis.analysisId}`);
      
      // Get affected users
      const affectedUsers = await this.getAffectedUsers(analysis);
      
      if (affectedUsers.length === 0) {
        console.log(`No users found for location ${analysis.location.latitude}, ${analysis.location.longitude}`);
        return [];
      }

      const alerts: DroughtAlert[] = [];

      for (const user of affectedUsers) {
        // Check if user should receive alerts
        const shouldAlert = await this.shouldSendAlert(user, analysis);
        
        if (!shouldAlert) {
          console.log(`Skipping alert for user ${user.id} - conditions not met`);
          continue;
        }

        // Generate personalized alert
        const alert = await this.generatePersonalizedAlert(user, analysis);
        
        // Send alert through preferred channels
        await this.deliverAlert(alert, user);
        
        // Save alert to database
        await this.saveAlert(alert);
        
        alerts.push(alert);
      }

      console.log(`✅ Generated ${alerts.length} drought alerts`);
      return alerts;

    } catch (error) {
      console.error("Error processing drought alerts:", error);
      throw error;
    }
  }

  /**
   * Generate personalized alert for a specific user
   */
  private async generatePersonalizedAlert(
    user: any,
    analysis: DroughtAnalysis
  ): Promise<DroughtAlert> {
    
    // Get user's land information for context
    const landContext = analysis.landId ? 
      await storage.getLandAreaById(analysis.landId) : 
      null;

    // Generate AI-powered personalized recommendations
    const recommendations = await this.generatePersonalizedRecommendations(
      user,
      analysis,
      landContext
    );

    // Calculate expected duration and recovery
    const expectedDuration = this.calculateAlertDuration(analysis);
    const validUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const alert: DroughtAlert = {
      alertId: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: user.id,
      landId: analysis.landId,
      alertLevel: analysis.alertLevel as any,
      severity: analysis.currentConditions.severity as "Mild" | "Moderate" | "Severe" | "Extreme",
      location: {
        latitude: analysis.location.latitude,
        longitude: analysis.location.longitude,
        address: landContext?.address || analysis.location.address
      },
      
      issuedAt: new Date(),
      validUntil,
      expectedDuration,
      
      currentConditions: {
        waterStressIndex: analysis.currentConditions.waterStressIndex,
        soilMoisture: analysis.currentConditions.soilMoisturePercent,
        precipitationDeficit: analysis.currentConditions.precipitationDeficit,
        temperatureAnomaly: analysis.currentConditions.temperatureAnomaly,
        pdsiValue: analysis.currentConditions.pdsiValue,
        droughtCategory: analysis.currentConditions.droughtCategory
      },
      
      forecast: {
        peakDroughtMonth: analysis.futureOutlook.peakDroughtMonth,
        recoveryExpected: analysis.futureOutlook.recoveryProjection.expectedRecovery,
        criticalPeriods: analysis.agriculturalImpact.criticalPeriods
      },
      
      impact: {
        cropRisk: analysis.agriculturalImpact.cropStressLevel,
        yieldLossEstimate: analysis.agriculturalImpact.yieldReductionEstimate,
        waterDemandIncrease: analysis.agriculturalImpact.waterDemandIncrease,
        economicImpact: this.calculateEconomicImpact(analysis)
      },
      
      recommendations,
      
      deliveryStatus: {
        email: { sent: false },
        sms: { sent: false },
        push: { sent: false }
      },
      
      followUpSchedule: this.generateFollowUpSchedule(analysis.alertLevel),
      escalationTriggers: this.getEscalationTriggers(analysis.alertLevel),
      monitoringPoints: analysis.monitoringParameters
    };

    return alert;
  }

  /**
   * Generate AI-powered personalized recommendations
   */
  private async generatePersonalizedRecommendations(
    user: any,
    analysis: DroughtAnalysis,
    landContext: any
  ): Promise<DroughtAlert['recommendations']> {
    
    const systemPrompt = `You are a drought management advisor specializing in personalized farmer guidance. Generate specific, actionable recommendations based on the user's situation, location, and drought conditions.

Focus on:
1. Immediate actions (next 24-48 hours)
2. Water conservation techniques
3. Crop protection strategies
4. Economic mitigation measures

Provide concise, implementable advice tailored to the specific drought severity and local conditions.`;

    const userPrompt = `DROUGHT ALERT CONTEXT:

USER INFORMATION:
- Location: ${analysis.location.latitude}, ${analysis.location.longitude}
- Land Area: ${landContext?.name || 'User location'}
- Current Crops: ${landContext?.currentCrop || 'Various crops'}
- Soil Type: ${landContext?.soilType || 'Mixed'}
- Farm Size: ${landContext?.area || 'Small to medium'} hectares

DROUGHT CONDITIONS:
- Alert Level: ${analysis.alertLevel}
- Severity: ${analysis.currentConditions.severity}
- Water Stress: ${analysis.currentConditions.waterStressIndex}/100
- Soil Moisture: ${analysis.currentConditions.soilMoisturePercent}%
- Precipitation Deficit: ${analysis.currentConditions.precipitationDeficit}mm
- Temperature Anomaly: +${analysis.currentConditions.temperatureAnomaly}°C

FUTURE OUTLOOK:
- Peak Drought Expected: Month ${analysis.futureOutlook.peakDroughtMonth || 'Unknown'}
- Recovery Expected: ${analysis.futureOutlook.recoveryProjection.expectedRecovery?.toLocaleDateString() || 'Uncertain'}
- Water Demand Increase: ${analysis.agriculturalImpact.waterDemandIncrease}%

IMPACT ASSESSMENT:
- Crop Risk Level: ${analysis.agriculturalImpact.cropStressLevel}
- Expected Yield Loss: ${analysis.agriculturalImpact.yieldReductionEstimate}%

Generate specific recommendations in 4 categories: immediate actions, water saving, crop protection, and economic mitigation.`;

    try {
      // Use intelligent AI manager for alert generation
      const response = await executeIntelligentAIRequest(
        "alert-generation",
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        { priority: "high" }
      );

      if (response) {
        return this.parseRecommendations(response);
      }

    } catch (error) {
      console.error("Error generating AI recommendations:", error);
    }

    // Fallback recommendations
    return this.getFallbackRecommendations(analysis);
  }

  /**
   * Parse AI-generated recommendations
   */
  private parseRecommendations(aiResponse: string): DroughtAlert['recommendations'] {
    // Simplified parsing - in production, implement proper NLP
    return {
      immediateActions: [
        "Check and repair irrigation systems",
        "Apply mulch around crops immediately",
        "Reduce non-essential water usage",
        "Monitor soil moisture levels daily"
      ],
      waterSaving: [
        "Switch to drip irrigation if possible",
        "Water early morning or late evening only",
        "Install rainwater harvesting system",
        "Use greywater for irrigation where appropriate"
      ],
      cropProtection: [
        "Install shade nets for sensitive crops",
        "Increase organic matter in soil",
        "Consider anti-transpirant sprays",
        "Plant windbreaks to reduce water loss"
      ],
      economicMitigation: [
        "Review crop insurance policies",
        "Consider drought-resistant varieties for next season",
        "Diversify income sources",
        "Contact agricultural extension services for support"
      ]
    };
  }

  /**
   * Get fallback recommendations based on drought severity
   */
  private getFallbackRecommendations(analysis: DroughtAnalysis): DroughtAlert['recommendations'] {
    const severity = analysis.currentConditions.severity;
    
    const baseRecommendations = {
      immediateActions: [
        "Assess current water reserves",
        "Implement water conservation measures",
        "Monitor crop stress levels"
      ],
      waterSaving: [
        "Reduce irrigation frequency",
        "Use mulching to retain moisture",
        "Fix any water leaks immediately"
      ],
      cropProtection: [
        "Provide shade for sensitive crops",
        "Apply organic matter to improve soil water retention"
      ],
      economicMitigation: [
        "Review insurance coverage",
        "Plan for reduced yield scenarios"
      ]
    };

    // Add severity-specific recommendations
    if (["Severe", "Extreme"].includes(severity)) {
      baseRecommendations.immediateActions.push(
        "Consider emergency water sourcing",
        "Prepare for potential crop losses"
      );
      baseRecommendations.waterSaving.push(
        "Implement emergency water rationing",
        "Switch to drought-resistant crops immediately"
      );
    }

    return baseRecommendations;
  }

  /**
   * Get users affected by drought in the analysis area
   */
  private async getAffectedUsers(analysis: DroughtAnalysis): Promise<any[]> {
    try {
      // If specific land area
      if (analysis.landId) {
        const landArea = await storage.getLandAreaById(analysis.landId);
        if (landArea && landArea.userId) {
          const user = await storage.getUser(landArea.userId);
          return user ? [user] : [];
        }
      }

      // Find users within reasonable distance (simplified approach)
      const nearbyUsers = await db
        .select()
        .from(users)
        .where(
          and(
            gte(users.latitude, analysis.location.latitude - 0.1),
            gte(users.longitude, analysis.location.longitude - 0.1)
          )
        );

      // Also find users with lands in the area
      const landsInArea = await db
        .select()
        .from(landAreas)
        .where(
          and(
            gte(landAreas.latitude, analysis.location.latitude - 0.1),
            gte(landAreas.longitude, analysis.location.longitude - 0.1)
          )
        );

      const landOwners = await Promise.all(
        landsInArea.map(land => 
          land.userId ? storage.getUser(land.userId) : null
        )
      );

      // Combine and deduplicate users
      const allUsers = [...nearbyUsers, ...landOwners.filter(Boolean)];
      const uniqueUsers = Array.from(
        new Map(allUsers.map(user => [user!.id, user])).values()
      );

      return uniqueUsers;

    } catch (error) {
      console.error("Error getting affected users:", error);
      return [];
    }
  }

  /**
   * Check if user should receive alert based on preferences and cooldown
   */
  private async shouldSendAlert(user: any, analysis: DroughtAnalysis): Promise<boolean> {
    try {
      // Check user notification preferences
      if (!user.emailNotifications && !user.smsNotifications) {
        return false;
      }

      // Check alert cooldown
      const recentAlert = await this.getRecentAlert(user.id, analysis.location);
      if (recentAlert) {
        const timeSinceAlert = Date.now() - recentAlert.issuedAt.getTime();
        const cooldownPeriod = this.ALERT_COOLDOWN[analysis.alertLevel as keyof typeof this.ALERT_COOLDOWN];
        
        if (timeSinceAlert < cooldownPeriod) {
          console.log(`Alert cooldown active for user ${user.id}`);
          return false;
        }
      }

      // Check if alert level meets user preferences (simplified)
      const minLevel = this.getMinimumAlertLevel(user);
      if (this.getAlertLevelPriority(analysis.alertLevel) < this.getAlertLevelPriority(minLevel)) {
        return false;
      }

      return true;

    } catch (error) {
      console.error("Error checking alert conditions:", error);
      return false;
    }
  }

  /**
   * Deliver alert through user's preferred channels
   */
  private async deliverAlert(alert: DroughtAlert, user: any): Promise<void> {
    try {
      console.log(`📤 Delivering ${alert.alertLevel} drought alert to user ${user.id}`);

      // Generate alert messages
      const messages = this.generateAlertMessages(alert, user);

      // Send email alert
      if (user.emailNotifications && user.email) {
        try {
          await this.sendEmailAlert(alert, user, messages.email);
          alert.deliveryStatus.email = { sent: true, sentAt: new Date() };
        } catch (error) {
          alert.deliveryStatus.email = { 
            sent: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          };
        }
      }

      // Send SMS alert
      if (user.smsNotifications && user.phoneNumber) {
        try {
          await this.sendSMSAlert(alert, user, messages.sms);
          alert.deliveryStatus.sms = { sent: true, sentAt: new Date() };
        } catch (error) {
          alert.deliveryStatus.sms = { 
            sent: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          };
        }
      }

      // Log delivery status
      const successfulDeliveries = Object.values(alert.deliveryStatus).filter(status => status.sent).length;
      console.log(`✅ Alert delivered through ${successfulDeliveries} channels`);

    } catch (error) {
      console.error("Error delivering alert:", error);
    }
  }

  /**
   * Generate alert messages for different channels
   */
  private generateAlertMessages(alert: DroughtAlert, user: any): {
    email: { subject: string; html: string; text: string };
    sms: string;
  } {
    const lang = user.language || 'en';
    const t = (key: string) => getTranslation(key, lang);
    
    const locationText = alert.location.address || 
      `${alert.location.latitude.toFixed(4)}, ${alert.location.longitude.toFixed(4)}`;

    const urgencyKey = {
      "Yellow": "advisory",
      "Orange": "watch", 
      "Red": "warning",
      "Emergency": "emergency"
    }[alert.alertLevel];
    
    const urgencyText = t(urgencyKey || "advisory").toUpperCase();

    // Email message
    const emailSubject = `🚨 ${t('drought_alert')} ${urgencyText}: ${alert.severity} ${t('conditions_detected')}`;
    
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: ${this.getAlertColor(alert.alertLevel)}; color: white; padding: 20px; text-align: center;">
          <h1>${t('drought_alert')} ${urgencyText}</h1>
          <h2>${alert.severity} ${t('drought_alert')}</h2>
        </div>
        
        <div style="padding: 20px;">
          <h3>📍 ${t('location')}: ${locationText}</h3>
          
          <h3>📊 ${t('current_conditions')}:</h3>
          <ul>
            <li>${t('water_stress')}: <strong>${alert.currentConditions.waterStressIndex}/100</strong></li>
            <li>${t('soil_moisture')}: <strong>${alert.currentConditions.soilMoisture.toFixed(1)}%</strong></li>
            <li>${t('precip_deficit')}: <strong>${alert.currentConditions.precipitationDeficit.toFixed(0)}mm</strong></li>
            <li>${t('temp_anomaly')}: <strong>+${alert.currentConditions.temperatureAnomaly.toFixed(1)}°C</strong></li>
          </ul>
          
          <h3>🔮 ${t('forecast')}:</h3>
          <ul>
            <li>${t('yield_impact')}: <strong>${alert.impact.yieldLossEstimate.toFixed(0)}% ${t('reduction')}</strong></li>
            <li>${t('water_demand')}: <strong>+${alert.impact.waterDemandIncrease.toFixed(0)}%</strong></li>
            ${alert.forecast.recoveryExpected ? 
              `<li>${t('recovery_expected')}: <strong>${alert.forecast.recoveryExpected.toLocaleDateString()}</strong></li>` : 
              `<li>${t('recovery_timeline')}: <strong>${t('uncertain')}</strong></li>`
            }
          </ul>
          
          <h3>⚡ ${t('immediate_actions')}:</h3>
          <ul>
            ${alert.recommendations.immediateActions.map(action => `<li>${action}</li>`).join('')}
          </ul>
          
          <h3>💧 ${t('water_conservation')}:</h3>
          <ul>
            ${alert.recommendations.waterSaving.map(action => `<li>${action}</li>`).join('')}
          </ul>
          
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin-top: 20px;">
            <h4>📞 ${t('need_help')}</h4>
            <p>${t('contact_help')}</p>
            <p><small>${t('valid_until')} ${alert.validUntil.toLocaleDateString()}.</small></p>
          </div>
        </div>
      </div>
    `;

    const emailText = `
${t('drought_alert')} ${urgencyText}: ${alert.severity} ${t('conditions_detected')} at ${locationText}

${t('current_conditions')}:
- ${t('water_stress')}: ${alert.currentConditions.waterStressIndex}/100
- ${t('soil_moisture')}: ${alert.currentConditions.soilMoisture.toFixed(1)}%
- ${t('precip_deficit')}: ${alert.currentConditions.precipitationDeficit.toFixed(0)}mm

${t('immediate_actions')}:
${alert.recommendations.immediateActions.map(action => `• ${action}`).join('\n')}

${t('water_conservation')}:
${alert.recommendations.waterSaving.map(action => `• ${action}`).join('\n')}

${t('valid_until')}: ${alert.validUntil.toLocaleDateString()}
    `;

    // SMS message (short and concise)
    const smsMessage = `🚨 ${t('drought_alert').toUpperCase()} ${urgencyText}: ${alert.severity} ${t('conditions_detected')} at ${locationText}. ${t('water_stress')} ${alert.currentConditions.waterStressIndex}/100, ${t('soil_moisture')} ${alert.currentConditions.soilMoisture.toFixed(0)}%. ${t('actions')}: ${alert.recommendations.immediateActions[0]}. ${t('check_email')}.`;

    return {
      email: { subject: emailSubject, html: emailHtml, text: emailText },
      sms: smsMessage
    };
  }

  /**
   * Send email alert
   */
  private async sendEmailAlert(
    alert: DroughtAlert, 
    user: any, 
    message: { subject: string; html: string; text: string }
  ): Promise<void> {
    
    await sendWeatherAlert(
      user.id,
      message.subject,
      message.html
    );

    console.log(`📧 Email drought alert sent to ${user.email}`);
  }

  /**
   * Send SMS alert
   */
  private async sendSMSAlert(alert: DroughtAlert, user: any, message: string): Promise<void> {
    
    await sendWeatherAlert(
      user.id,
      `Drought Alert - ${alert.alertLevel}`,
      message
    );

    console.log(`📱 SMS drought alert sent to ${user.phoneNumber}`);
  }

  /**
   * Save alert to database
   */
  private async saveAlert(alert: DroughtAlert): Promise<void> {
    try {
      // Save to notifications table
      const notificationData: any = {
        type: 'email', // Primary notification type
        message: JSON.stringify({
          alertId: alert.alertId,
          alertLevel: alert.alertLevel,
          severity: alert.severity,
          currentConditions: alert.currentConditions,
          recommendations: alert.recommendations,
          validUntil: alert.validUntil
        }),
        sentAt: new Date()
      };
      await db.insert(notifications).values(notificationData);

      console.log(`💾 Saved drought alert ${alert.alertId} to database`);

    } catch (error) {
      console.error("Error saving alert to database:", error);
    }
  }

  // Utility methods
  private calculateAlertDuration(analysis: DroughtAnalysis): string {
    const severity = analysis.currentConditions.severity;
    const recoveryDate = analysis.futureOutlook.recoveryProjection.expectedRecovery;
    
    if (recoveryDate) {
      const daysToRecovery = Math.ceil(
        (recoveryDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
      );
      return `${daysToRecovery} days (recovery expected ${recoveryDate.toLocaleDateString()})`;
    }

    // Fallback duration estimates
    const durations = {
      "Mild": "1-2 weeks",
      "Moderate": "3-6 weeks", 
      "Severe": "2-4 months",
      "Extreme": "4-8 months",
      "None": "No drought expected"
    };

    return durations[severity as keyof typeof durations] || "Duration uncertain";
  }

  private calculateEconomicImpact(analysis: DroughtAnalysis): string {
    const yieldLoss = analysis.agriculturalImpact.yieldReductionEstimate;
    
    if (yieldLoss < 10) return "Minimal economic impact expected";
    if (yieldLoss < 25) return "Moderate economic impact - consider crop insurance";
    if (yieldLoss < 50) return "Significant economic impact - financial assistance may be needed";
    return "Severe economic impact - emergency support recommended";
  }

  private generateFollowUpSchedule(alertLevel: string): Date[] {
    const now = Date.now();
    const schedule = [];
    
    switch (alertLevel) {
      case "Emergency":
        // Daily follow-ups for 1 week, then every 3 days
        for (let i = 1; i <= 7; i++) {
          schedule.push(new Date(now + i * 24 * 60 * 60 * 1000));
        }
        for (let i = 10; i <= 21; i += 3) {
          schedule.push(new Date(now + i * 24 * 60 * 60 * 1000));
        }
        break;
        
      case "Red":
        // Every 3 days for 3 weeks
        for (let i = 3; i <= 21; i += 3) {
          schedule.push(new Date(now + i * 24 * 60 * 60 * 1000));
        }
        break;
        
      case "Orange":
        // Weekly for 1 month
        for (let i = 7; i <= 28; i += 7) {
          schedule.push(new Date(now + i * 24 * 60 * 60 * 1000));
        }
        break;
        
      case "Yellow":
        // Bi-weekly
        schedule.push(new Date(now + 14 * 24 * 60 * 60 * 1000));
        schedule.push(new Date(now + 28 * 24 * 60 * 60 * 1000));
        break;
    }
    
    return schedule;
  }

  private getEscalationTriggers(alertLevel: string): string[] {
    const baseTriggers = [
      "Soil moisture drops below 15%",
      "Water stress index exceeds 80",
      "No rainfall for 21+ days"
    ];

    switch (alertLevel) {
      case "Yellow":
        return [
          "Water stress index exceeds 40",
          "Soil moisture drops below 30%"
        ];
      case "Orange":
        return [
          "Water stress index exceeds 60", 
          "Soil moisture drops below 25%",
          "Crop stress becomes visible"
        ];
      case "Red":
        return baseTriggers;
      case "Emergency":
        return [
          "Complete crop failure imminent",
          "Water reserves critically low",
          "Emergency assistance required"
        ];
      default:
        return baseTriggers;
    }
  }

  private getAlertColor(alertLevel: string): string {
    const colors = {
      "Yellow": "#FFA500",
      "Orange": "#FF8C00", 
      "Red": "#FF4500",
      "Emergency": "#DC143C"
    };
    return colors[alertLevel as keyof typeof colors] || "#999999";
  }

  private async getRecentAlert(userId: string, location: any): Promise<any | null> {
    try {
      // Check for recent alerts in database
      // Simplified implementation - would query notifications table
      return null;
    } catch (error) {
      return null;
    }
  }

  private getMinimumAlertLevel(user: any): string {
    // Default to Yellow - could be user preference
    return "Yellow";
  }

  private getAlertLevelPriority(level: string): number {
    const priorities = { "Yellow": 1, "Orange": 2, "Red": 3, "Emergency": 4 };
    return priorities[level as keyof typeof priorities] || 0;
  }

  /**
   * Public method to send drought alert for analysis
   */
  async sendDroughtAlert(analysis: DroughtAnalysis): Promise<DroughtAlert[]> {
    return await this.processDroughtAnalysis(analysis);
  }

  /**
   * Get active drought alerts for a user
   */
  async getActiveDroughtAlerts(userId: string): Promise<DroughtAlert[]> {
    try {
      // Query database for active alerts
      const activeAlerts = await db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, userId),
            eq(notifications.type, 'email'),
            gte(notifications.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) // Last 7 days
          )
        );

      // Parse and return as DroughtAlert objects
      return activeAlerts
        .map(notification => {
          try {
            const alertData = JSON.parse(notification.message);
            if (alertData.alertId) {
              return alertData as DroughtAlert;
            }
          } catch (error) {
            console.error("Error parsing alert data:", error);
          }
          return null;
        })
        .filter(Boolean) as DroughtAlert[];

    } catch (error) {
      console.error("Error getting active drought alerts:", error);
      return [];
    }
  }

  /**
   * Update alert preferences for a user
   */
  async updateAlertPreferences(
    userId: string, 
    preferences: Partial<DroughtAlertPreferences>
  ): Promise<void> {
    try {
      // Update user notification preferences in database
      await db
        .update(users)
        .set({
          emailNotifications: preferences.emailAlerts ?? true,
          smsNotifications: preferences.smsAlerts ?? true,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));

      console.log(`✅ Updated alert preferences for user ${userId}`);

    } catch (error) {
      console.error("Error updating alert preferences:", error);
      throw error;
    }
  }
}

export const droughtAlertService = new DroughtAlertService();