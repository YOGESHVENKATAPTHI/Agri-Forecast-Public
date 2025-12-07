import {
  users,
  weatherData,
  predictions,
  cropRecommendations,
  chatHistory,
  notifications,
  type User,
  type UpsertUser,
  type WeatherData,
  type InsertWeatherData,
  type Prediction,
  type InsertPrediction,
  type CropRecommendation,
  type InsertCropRecommendation,
  type ChatMessage,
  type InsertChatMessage,
  type Notification,
  type InsertNotification,
  landAreas,
  landPredictions,
  landCropRecommendations,
  landDroughtPredictions,
  landMemory,
  type LandArea,
  type InsertLandArea,
  type LandPrediction,
  type InsertLandPrediction,
  type LandCropRecommendation,
  type InsertLandCropRecommendation,
  type LandDroughtPrediction,
  type InsertLandDroughtPrediction,
  type LandMemory,
  type InsertLandMemory,
} from "../shared/schema";
import { db } from "./db";
import { eq, and, gte, desc, lt, or } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserLocation(userId: string, latitude: number, longitude: number, address?: string): Promise<void>;
  updateUserPhone(userId: string, phoneNumber: string): Promise<void>;
  updateUserSettings(userId: string, smsNotifications: boolean, emailNotifications: boolean, language?: string): Promise<void>;

  // Weather data operations
  getWeatherData(latitude: number, longitude: number, source: string): Promise<WeatherData | undefined>;
  saveWeatherData(data: InsertWeatherData): Promise<void>;
  cleanupExpiredWeather(): Promise<void>;

  // Predictions operations
  getPredictions(userId: string): Promise<Prediction[]>;
  savePrediction(prediction: InsertPrediction): Promise<Prediction>;

  // Crop recommendations operations
  getCropRecommendations(userId: string): Promise<CropRecommendation[]>;
  saveCropRecommendation(crop: InsertCropRecommendation): Promise<CropRecommendation>;

  // Chat history operations
  getChatHistory(userId: string, landId?: number): Promise<ChatMessage[]>;
  saveChatMessage(message: InsertChatMessage): Promise<ChatMessage>;

  // Notifications operations
  saveNotification(notification: InsertNotification): Promise<Notification>;
  getPendingNotifications(): Promise<Notification[]>;
  markNotificationSent(id: string): Promise<void>;

  // Land Area operations
  createLandArea(land: InsertLandArea): Promise<LandArea>;
  getLandAreas(userId: string): Promise<LandArea[]>;
  getLandArea(id: number): Promise<LandArea | undefined>;
  updateLandArea(id: number, updates: Partial<InsertLandArea>): Promise<LandArea>;
  deleteLandArea(id: number): Promise<void>;

  // Land specific operations
  getLandById(landId: number): Promise<LandArea | undefined>;
  getLandAreaById(landId: number): Promise<LandArea | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  saveLandPrediction(prediction: InsertLandPrediction): Promise<LandPrediction>;
  clearOldLandPredictions(landId: number): Promise<void>;
  getLandPredictions(landId: number): Promise<LandPrediction[]>;
  saveLandCropRecommendation(crop: InsertLandCropRecommendation): Promise<LandCropRecommendation>;
  clearOldLandCropRecommendations(landId: number): Promise<void>;
  getLandCropRecommendations(landId: number): Promise<LandCropRecommendation[]>;
  saveLandDroughtPrediction(drought: InsertLandDroughtPrediction): Promise<LandDroughtPrediction>;
  clearOldLandDroughtPredictions(landId: number): Promise<void>;
  getLandDroughtPredictions(landId: number): Promise<LandDroughtPrediction[]>;
  getDroughtAlerts(landId: number): Promise<LandDroughtPrediction[]>;
  getLandMemory(landId: number): Promise<LandMemory[]>;
  saveLongTermPrediction(prediction: { landId: number; data: any; generatedAt: Date; expiresAt: Date }): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserLocation(userId: string, latitude: number, longitude: number, address?: string): Promise<void> {
    await db
      .update(users)
      .set({ latitude, longitude, address, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async updateUserPhone(userId: string, phoneNumber: string): Promise<void> {
    await db
      .update(users)
      .set({ phoneNumber, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async updateUserSettings(userId: string, smsNotifications: boolean, emailNotifications: boolean, language?: string): Promise<void> {
    const updates: any = { smsNotifications, emailNotifications, updatedAt: new Date() };
    if (language) {
      updates.language = language;
    }
    await db
      .update(users)
      .set(updates)
      .where(eq(users.id, userId));
  }

  // Weather data operations
  async getWeatherData(latitude: number, longitude: number, source: string): Promise<WeatherData | undefined> {
    const now = new Date();
    const [data] = await db
      .select()
      .from(weatherData)
      .where(
        and(
          eq(weatherData.latitude, latitude),
          eq(weatherData.longitude, longitude),
          eq(weatherData.source, source),
          gte(weatherData.expiresAt, now)
        )
      )
      .limit(1);
    return data;
  }

  async saveWeatherData(data: InsertWeatherData): Promise<void> {
    await db.insert(weatherData).values(data);
  }

  async cleanupExpiredWeather(): Promise<void> {
    const now = new Date();
    await db.delete(weatherData).where(lt(weatherData.expiresAt, now));
  }

  // Predictions operations
  async getPredictions(userId: string): Promise<Prediction[]> {
    return await db
      .select()
      .from(predictions)
      .where(eq(predictions.userId, userId))
      .orderBy(desc(predictions.createdAt))
      .limit(50);
  }

  async savePrediction(prediction: InsertPrediction): Promise<Prediction> {
    const [saved] = await db.insert(predictions).values(prediction).returning();
    return saved;
  }

  // Crop recommendations operations
  async getCropRecommendations(userId: string): Promise<CropRecommendation[]> {
    return await db
      .select()
      .from(cropRecommendations)
      .where(eq(cropRecommendations.userId, userId))
      .orderBy(desc(cropRecommendations.createdAt))
      .limit(20);
  }

  async saveCropRecommendation(crop: InsertCropRecommendation): Promise<CropRecommendation> {
    const [saved] = await db.insert(cropRecommendations).values(crop).returning();
    return saved;
  }

  // Chat history operations
  async getChatHistory(userId: string, landId?: number): Promise<ChatMessage[]> {
    const conditions = [eq(chatHistory.userId, userId)];
    if (landId) {
      conditions.push(eq(chatHistory.landId, landId));
    }
    
    return await db
      .select()
      .from(chatHistory)
      .where(and(...conditions))
      .orderBy(chatHistory.timestamp)
      .limit(100);
  }

  async saveChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const [saved] = await db.insert(chatHistory).values(message).returning();
    return saved;
  }

  // Notifications operations
  async saveNotification(notification: InsertNotification): Promise<Notification> {
    const [saved] = await db.insert(notifications).values(notification).returning();
    return saved;
  }

  async getPendingNotifications(): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.status, "pending"))
      .limit(100);
  }

  async markNotificationSent(id: string): Promise<void> {
    await db
      .update(notifications)
      .set({ status: "sent", sentAt: new Date() } as any)
      .where(eq(notifications.id, id));
  }

  // Land-specific operations
  async getLandById(landId: number): Promise<LandArea | undefined> {
    const [land] = await db
      .select()
      .from(landAreas)
      .where(eq(landAreas.id, landId))
      .limit(1);
    return land;
  }

  async getLandAreaById(landId: number): Promise<LandArea | undefined> {
    return this.getLandById(landId);
  }

  async getLandArea(landId: number): Promise<LandArea | undefined> {
    return this.getLandById(landId);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return user;
  }

  async saveLandPrediction(prediction: InsertLandPrediction): Promise<LandPrediction> {
    const [saved] = await db.insert(landPredictions).values(prediction).returning();
    return saved;
  }

  async clearOldLandPredictions(landId: number): Promise<void> {
    await db.delete(landPredictions).where(eq(landPredictions.landId, landId));
  }

  async getLandPredictions(landId: number): Promise<LandPrediction[]> {
    return await db
      .select()
      .from(landPredictions)
      .where(eq(landPredictions.landId, landId))
      .orderBy(desc(landPredictions.createdAt))
      .limit(50);
  }

  async saveLandCropRecommendation(crop: InsertLandCropRecommendation): Promise<LandCropRecommendation> {
    const [saved] = await db.insert(landCropRecommendations).values(crop).returning();
    return saved;
  }

  async clearOldLandCropRecommendations(landId: number): Promise<void> {
    await db.delete(landCropRecommendations).where(eq(landCropRecommendations.landId, landId));
  }

  async getLandCropRecommendations(landId: number): Promise<LandCropRecommendation[]> {
    return await db
      .select()
      .from(landCropRecommendations)
      .where(eq(landCropRecommendations.landId, landId))
      .orderBy(desc(landCropRecommendations.createdAt))
      .limit(50);
  }

  async saveLandDroughtPrediction(drought: InsertLandDroughtPrediction): Promise<LandDroughtPrediction> {
    const [saved] = await db.insert(landDroughtPredictions).values(drought).returning();
    return saved;
  }

  async clearOldLandDroughtPredictions(landId: number): Promise<void> {
    await db.delete(landDroughtPredictions).where(eq(landDroughtPredictions.landId, landId));
  }

  async getLandDroughtPredictions(landId: number): Promise<LandDroughtPrediction[]> {
    return await db
      .select()
      .from(landDroughtPredictions)
      .where(eq(landDroughtPredictions.landId, landId))
      .orderBy(desc(landDroughtPredictions.createdAt))
      .limit(50);
  }

  async getDroughtAlerts(landId: number): Promise<LandDroughtPrediction[]> {
    return await db
      .select()
      .from(landDroughtPredictions)
      .where(
        and(
          eq(landDroughtPredictions.landId, landId),
          or(
            eq(landDroughtPredictions.riskLevel, "high"),
            eq(landDroughtPredictions.riskLevel, "extreme")
          )
        )
      )
      .orderBy(desc(landDroughtPredictions.createdAt))
      .limit(10);
  }

  async getLandMemory(landId: number): Promise<LandMemory[]> {
    return await db
      .select()
      .from(landMemory)
      .where(eq(landMemory.landId, landId))
      .orderBy(desc(landMemory.createdAt))
      .limit(10);
  }

  async saveLongTermPrediction(prediction: { landId: number; data: any; generatedAt: Date; expiresAt: Date }): Promise<void> {
    await db.insert(weatherData).values({
      source: `long_term_${prediction.landId}`,
      latitude: 0, // Will be filled from land data
      longitude: 0, // Will be filled from land data
      data: prediction.data,
      expiresAt: prediction.expiresAt
    });
  }

  // Land Area operations implementation
  async createLandArea(land: InsertLandArea): Promise<LandArea> {
    const [saved] = await db.insert(landAreas).values(land).returning();
    return saved;
  }

  async getLandAreas(userId: string): Promise<LandArea[]> {
    return await db
      .select()
      .from(landAreas)
      .where(eq(landAreas.userId, userId))
      .orderBy(desc(landAreas.createdAt));
  }

  async updateLandArea(id: number, updates: Partial<InsertLandArea>): Promise<LandArea> {
    const [updated] = await db
      .update(landAreas)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(landAreas.id, id))
      .returning();
    return updated;
  }

  async deleteLandArea(id: number): Promise<void> {
    await db.delete(landAreas).where(eq(landAreas.id, id));
  }
}

export const storage = new DatabaseStorage();
