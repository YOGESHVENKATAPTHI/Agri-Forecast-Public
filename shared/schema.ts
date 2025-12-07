import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  real,
  text,
  integer,
  serial,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table - mandatory for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table - mandatory for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  phoneNumber: varchar("phone_number"),
  password: varchar("password"), // For local development authentication
  latitude: real("latitude"),
  longitude: real("longitude"),
  address: text("address"),
  language: varchar("language").default("en"),
  smsNotifications: boolean("sms_notifications").default(true),
  emailNotifications: boolean("email_notifications").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Weather data cache table
export const weatherData = pgTable("weather_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  source: varchar("source").notNull(), // 'openweather', 'nasa', 'chirps', 'gfs'
  data: jsonb("data").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
});

// AI predictions table
export const predictions = pgTable("predictions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  predictionType: varchar("prediction_type").notNull(), // 'weather', 'crop', 'alert'
  title: text("title").notNull(),
  description: text("description").notNull(),
  confidence: real("confidence"), // 0-100
  predictionDate: timestamp("prediction_date").notNull(),
  aiModel: varchar("ai_model"), // which model generated this
  data: jsonb("data"), // additional prediction data
  severity: varchar("severity"), // 'low', 'medium', 'high', 'critical'
  createdAt: timestamp("created_at").defaultNow(),
});

// Crop recommendations table
export const cropRecommendations = pgTable("crop_recommendations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  cropName: varchar("crop_name").notNull(),
  confidence: real("confidence").notNull(), // 0-100
  reasoning: text("reasoning").notNull(),
  detailedPlan: text("detailed_plan"), // Complete markdown plan
  plantingDate: timestamp("planting_date"),
  harvestDate: timestamp("harvest_date"),
  irrigationNeeds: text("irrigation_needs"),
  fertilizerNeeds: text("fertilizer_needs"),
  expectedYield: text("expected_yield"),
  risks: text("risks"),
  imageUrl: varchar("image_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Chat history table
export const chatHistory = pgTable("chat_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  landId: integer("land_id").references(() => landAreas.id),
  role: varchar("role").notNull(), // 'user' or 'assistant'
  message: text("message").notNull(),
  aiModel: varchar("ai_model"),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Notifications table
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  type: varchar("type").notNull(), // 'sms', 'email'
  subject: text("subject"),
  message: text("message").notNull(),
  status: varchar("status").default('pending'), // 'pending', 'sent', 'failed'
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// User land areas table
export const landAreas = pgTable("land_areas_v2", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: varchar("user_id").references(() => users.id),
  name: varchar("name").notNull(), // User-given name for the land
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  address: text("address"),
  area: real("area"), // Area in hectares/acres
  soilType: varchar("soil_type"), // Clay, loam, sandy, etc.
  currentCrop: varchar("current_crop"), // Currently planted crop
  cropHistory: jsonb("crop_history"), // Historical crops grown
  notes: text("notes"), // User notes about the land
  isMainLand: boolean("is_main_land").default(false), // Main/home land marker
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Land-specific predictions table
export const landPredictions = pgTable("land_predictions_v2", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  landId: integer("land_id").references(() => landAreas.id),
  userId: varchar("user_id").references(() => users.id),
  predictionType: varchar("prediction_type").notNull(), // 'weather', 'crop', 'alert'
  title: text("title").notNull(),
  description: text("description").notNull(),
  confidence: real("confidence"), // 0-100
  predictionDate: timestamp("prediction_date").notNull(),
  aiModel: varchar("ai_model"), // which model generated this
  data: jsonb("data"), // additional prediction data
  severity: varchar("severity"), // 'low', 'medium', 'high', 'critical'
  createdAt: timestamp("created_at").defaultNow(),
});

// Land-specific crop recommendations table
export const landCropRecommendations = pgTable("land_crop_recommendations_v2", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  landId: integer("land_id").references(() => landAreas.id),
  userId: varchar("user_id").references(() => users.id),
  cropName: varchar("crop_name").notNull(),
  confidence: real("confidence").notNull(), // 0-100
  reasoning: text("reasoning").notNull(),
  detailedPlan: text("detailed_plan"), // Complete markdown plan
  plantingDate: timestamp("planting_date"),
  harvestDate: timestamp("harvest_date"),
  irrigationNeeds: text("irrigation_needs"),
  fertilizerNeeds: text("fertilizer_needs"),
  expectedYield: text("expected_yield"),
  risks: text("risks"),
  imageUrl: varchar("image_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Land-specific drought predictions table
export const landDroughtPredictions = pgTable("land_drought_predictions_v2", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  landId: integer("land_id").references(() => landAreas.id),
  userId: varchar("user_id").references(() => users.id),
  riskLevel: varchar("risk_level").notNull(), // 'low', 'moderate', 'high', 'extreme'
  probability: real("probability").notNull(), // 0-100
  timeframe: varchar("timeframe").notNull(), // '1-month', '3-month', '6-month'
  affectedMonths: text("affected_months"), // JSON array of month names
  pdsiValue: real("pdsi_value"),
  spiValue: real("spi_value"),
  precipitationTrend: text("precipitation_trend"),
  temperatureTrend: text("temperature_trend"),
  recommendations: text("recommendations"),
  actionPlan: text("action_plan"),
  analysis: text("analysis"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Land-specific chat history table
export const landChatHistory = pgTable("land_chat_history_v2", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  landId: integer("land_id").references(() => landAreas.id),
  userId: varchar("user_id").references(() => users.id),
  role: varchar("role").notNull(), // 'user' or 'assistant'
  message: text("message").notNull(),
  aiModel: varchar("ai_model"),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Land memory for AI analysis
export const landMemory = pgTable("land_memory_v2", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  landId: integer("land_id").references(() => landAreas.id),
  userId: varchar("user_id").references(() => users.id),
  season: varchar("season"), // Spring, Summer, Fall, Winter
  year: integer("year"),
  cropsCultivated: jsonb("crops_cultivated"), // Array of crops with details
  yieldData: jsonb("yield_data"), // Harvest yields and quality
  weatherEvents: jsonb("weather_events"), // Significant weather impacts
  fertilizationHistory: jsonb("fertilization_history"), // Fertilizer usage
  irrigationData: jsonb("irrigation_data"), // Irrigation patterns
  pestDiseaseHistory: jsonb("pest_disease_history"), // Pest/disease incidents
  notes: text("notes"), // Farmer observations
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// NASA POWER historical data (30+ years)
export const nasaPowerData = pgTable("nasa_power_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  date: timestamp("date").notNull(),
  temperature2m: real("temperature_2m"), // T2M
  temperatureMax: real("temperature_max"), // T2M_MAX
  temperatureMin: real("temperature_min"), // T2M_MIN
  precipitation: real("precipitation"), // PRECTOTCORR
  solarRadiation: real("solar_radiation"), // ALLSKY_SFC_SW_DWN
  windSpeed: real("wind_speed"), // WS2M
  humidity: real("humidity"), // RH2M
  pressure: real("pressure"), // PS
  evapotranspiration: real("evapotranspiration"), // PET
  soilMoisture: real("soil_moisture"), // GWETTOP
  frost: real("frost_days"), // FROST_DAYS
  rawData: jsonb("raw_data"), // Complete NASA POWER response
  createdAt: timestamp("created_at").defaultNow(),
});

// Open-Meteo seasonal forecast data (ECMWF SEAS5)
export const openMeteoSeasonalData = pgTable("openmeteo_seasonal_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  forecastDate: timestamp("forecast_date").notNull(),
  validDate: timestamp("valid_date").notNull(),
  temperatureAnomaly: real("temperature_anomaly"), // Temperature anomaly from normal
  precipitationAnomaly: real("precipitation_anomaly"), // Precipitation anomaly
  soilMoisture0_7cm: real("soil_moisture_0_7cm"), // Surface soil moisture
  soilMoisture7_28cm: real("soil_moisture_7_28cm"), // Root zone soil moisture
  soilMoisture28_100cm: real("soil_moisture_28_100cm"), // Deep soil moisture
  soilTemperature0_7cm: real("soil_temperature_0_7cm"), // Surface soil temperature
  soilTemperature7_28cm: real("soil_temperature_7_28cm"), // Root zone soil temperature
  evapotranspiration: real("evapotranspiration"), // Reference ET0
  leafAreaIndex: real("leaf_area_index"), // Vegetation index
  confidence: real("confidence"), // Forecast confidence (0-100)
  rawData: jsonb("raw_data"), // Complete Open-Meteo response
  createdAt: timestamp("created_at").defaultNow(),
});

// Enhanced weather analysis reports
export const weatherAnalysisReports = pgTable("weather_analysis_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  landId: integer("land_id").references(() => landAreas.id),
  userId: varchar("user_id").references(() => users.id),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  analysisType: varchar("analysis_type").notNull(), // 'complete', 'historical', 'seasonal', 'current'
  reportDate: timestamp("report_date").notNull(),
  
  // Data source confidences
  nasaPowerConfidence: real("nasa_power_confidence"),
  openMeteoConfidence: real("openmeteo_confidence"),
  openWeatherConfidence: real("openweather_confidence"),
  
  // Historical analysis (30+ years from NASA POWER)
  historicalSummary: jsonb("historical_summary"), // 30-year averages and trends
  climateNormals: jsonb("climate_normals"), // Long-term climate data
  extremeEvents: jsonb("extreme_events"), // Historical extreme weather events
  
  // Seasonal forecast (6 months from Open-Meteo ECMWF SEAS5)
  seasonalForecast: jsonb("seasonal_forecast"), // 6-month outlook
  anomalyPredictions: jsonb("anomaly_predictions"), // Expected deviations from normal
  
  // Current conditions (OpenWeather)
  currentWeather: jsonb("current_weather"), // Real-time data
  shortTermForecast: jsonb("short_term_forecast"), // 5-day forecast
  
  // Agricultural metrics
  soilAnalysis: jsonb("soil_analysis"), // Soil conditions and health
  cropSuitability: jsonb("crop_suitability"), // Crop-specific analysis
  irrigationNeeds: jsonb("irrigation_needs"), // Water management recommendations
  growingSeasonAnalysis: jsonb("growing_season_analysis"), // Season-specific insights
  riskAssessment: jsonb("risk_assessment"), // Weather and agricultural risks
  
  // AI analysis results
  aiInsights: jsonb("ai_insights"), // Machine learning predictions
  recommendedActions: jsonb("recommended_actions"), // Actionable recommendations
  
  overallScore: real("overall_score"), // Composite agricultural suitability score (0-100)
  processingTimeMs: integer("processing_time_ms"), // Analysis performance metric
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// NASA POWER historical data table
export const nasaPowerHistoricalData = pgTable("nasa_power_historical_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  date: timestamp("date").notNull(),
  temperature2m: real("temperature_2m"),
  temperatureMax: real("temperature_max"),
  temperatureMin: real("temperature_min"),
  precipitation: real("precipitation"),
  solarRadiation: real("solar_radiation"),
  windSpeed: real("wind_speed"),
  humidity: real("humidity"),
  pressure: real("pressure"),
  evapotranspiration: real("evapotranspiration"),
  soilMoisture: real("soil_moisture"),
  frostDays: real("frost_days"),
  rawData: jsonb("raw_data"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Open-Meteo seasonal forecast data table
export const openMeteoSeasonalForecast = pgTable("open_meteo_seasonal_forecast", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  forecastDate: timestamp("forecast_date").notNull(),
  validDate: timestamp("valid_date").notNull(),
  temperatureAnomaly: real("temperature_anomaly"),
  precipitationAnomaly: real("precipitation_anomaly"),
  soilMoisture0_7cm: real("soil_moisture_0_7cm"),
  soilMoisture7_28cm: real("soil_moisture_7_28cm"),
  soilMoisture28_100cm: real("soil_moisture_28_100cm"),
  soilTemperature0_7cm: real("soil_temperature_0_7cm"),
  soilTemperature7_28cm: real("soil_temperature_7_28cm"),
  evapotranspiration: real("evapotranspiration"),
  leafAreaIndex: real("leaf_area_index"),
  confidence: real("confidence"),
  rawData: jsonb("raw_data"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Comprehensive weather analysis table
export const comprehensiveWeatherAnalysis = pgTable("comprehensive_weather_analysis", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  currentWeather: jsonb("current_weather"),
  historicalSummary: jsonb("historical_summary"),
  seasonalForecast: jsonb("seasonal_forecast"),
  soilData: jsonb("soil_data"),
  analysisTimestamp: timestamp("analysis_timestamp").notNull(),
  dataQuality: jsonb("data_quality"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Comprehensive agricultural data aggregation table
export const agriculturalDataPoints = pgTable("agricultural_data_points", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  landId: integer("land_id").references(() => landAreas.id),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  recordDate: timestamp("record_date").notNull(),
  dataSource: varchar("data_source").notNull(), // 'nasa_power', 'openmeteo', 'openweather', 'computed'
  
  // Core meteorological data
  temperature: real("temperature"),
  temperatureMax: real("temperature_max"),
  temperatureMin: real("temperature_min"),
  precipitation: real("precipitation"),
  humidity: real("humidity"),
  windSpeed: real("wind_speed"),
  solarRadiation: real("solar_radiation"),
  pressure: real("pressure"),
  
  // Agricultural-specific metrics
  evapotranspiration: real("evapotranspiration"),
  soilMoisture: real("soil_moisture"),
  soilTemperature: real("soil_temperature"),
  growingDegreeDays: real("growing_degree_days"),
  chillHours: real("chill_hours"),
  
  // Computed indices
  heatStressIndex: real("heat_stress_index"),
  droughtStressIndex: real("drought_stress_index"),
  cropSuitabilityIndex: real("crop_suitability_index"),
  
  // Quality metrics
  dataQuality: real("data_quality"), // 0-100 quality score
  confidence: real("confidence"), // 0-100 confidence level
  
  createdAt: timestamp("created_at").defaultNow(),
});

// Types and schemas
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export type WeatherData = typeof weatherData.$inferSelect;
export type InsertWeatherData = typeof weatherData.$inferInsert;

export type Prediction = typeof predictions.$inferSelect;
export type InsertPrediction = typeof predictions.$inferInsert;

export type CropRecommendation = typeof cropRecommendations.$inferSelect;
export type InsertCropRecommendation = typeof cropRecommendations.$inferInsert;

export type ChatMessage = typeof chatHistory.$inferSelect;
export type InsertChatMessage = typeof chatHistory.$inferInsert;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

export type LandArea = typeof landAreas.$inferSelect;
export type InsertLandArea = typeof landAreas.$inferInsert;

export type LandPrediction = typeof landPredictions.$inferSelect;
export type InsertLandPrediction = typeof landPredictions.$inferInsert;

export type LandCropRecommendation = typeof landCropRecommendations.$inferSelect;
export type InsertLandCropRecommendation = typeof landCropRecommendations.$inferInsert;

export type LandDroughtPrediction = typeof landDroughtPredictions.$inferSelect;
export type InsertLandDroughtPrediction = typeof landDroughtPredictions.$inferInsert;

export type LandChatMessage = typeof landChatHistory.$inferSelect;
export type InsertLandChatMessage = typeof landChatHistory.$inferInsert;

export type LandMemory = typeof landMemory.$inferSelect;
export type InsertLandMemory = typeof landMemory.$inferInsert;

export type NasaPowerHistoricalData = typeof nasaPowerHistoricalData.$inferSelect;
export type InsertNasaPowerHistoricalData = typeof nasaPowerHistoricalData.$inferInsert;

export type OpenMeteoSeasonalForecast = typeof openMeteoSeasonalForecast.$inferSelect;
export type InsertOpenMeteoSeasonalForecast = typeof openMeteoSeasonalForecast.$inferInsert;

export type ComprehensiveWeatherAnalysis = typeof comprehensiveWeatherAnalysis.$inferSelect;
export type InsertComprehensiveWeatherAnalysis = typeof comprehensiveWeatherAnalysis.$inferInsert;

export type AgriculturalDataPoint = typeof agriculturalDataPoints.$inferSelect;
export type InsertAgriculturalDataPoint = typeof agriculturalDataPoints.$inferInsert;

// Zod schemas for validation
export const upsertUserSchema = createInsertSchema(users);

export const insertWeatherDataSchema = createInsertSchema(weatherData);
export const insertPredictionSchema = createInsertSchema(predictions);
export const insertCropRecommendationSchema = createInsertSchema(cropRecommendations);
export const insertChatMessageSchema = createInsertSchema(chatHistory);
export const insertNotificationSchema = createInsertSchema(notifications);
export const insertLandAreaSchema = createInsertSchema(landAreas);
export const insertLandPredictionSchema = createInsertSchema(landPredictions);
export const insertLandCropRecommendationSchema = createInsertSchema(landCropRecommendations);
export const insertLandDroughtPredictionSchema = createInsertSchema(landDroughtPredictions);
export const insertLandChatMessageSchema = createInsertSchema(landChatHistory);
export const insertLandMemorySchema = createInsertSchema(landMemory);
export const insertNasaPowerDataSchema = createInsertSchema(nasaPowerData);
export const insertOpenMeteoSeasonalDataSchema = createInsertSchema(openMeteoSeasonalData);
export const insertWeatherAnalysisReportSchema = createInsertSchema(weatherAnalysisReports);
export const insertAgriculturalDataPointSchema = createInsertSchema(agriculturalDataPoints);

// System heartbeat table for keep-alive functionality
export const systemHeartbeat = pgTable("system_heartbeat", {
  id: serial("id").primaryKey(),
  lastPing: timestamp("last_ping").defaultNow(),
  status: varchar("status").default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSystemHeartbeatSchema = createInsertSchema(systemHeartbeat);
