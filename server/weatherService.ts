import axios from "axios";
import { storage } from "./storage";
import { comprehensiveDataService, ComprehensiveWeatherAnalysis } from "./comprehensiveDataService";

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes

export interface WeatherResponse {
  current: {
    temp: number;
    feels_like: number;
    humidity: number;
    wind_speed: number;
    pressure: number;
    visibility: number;
    uvi: number;
    weather: Array<{ main: string; description: string; icon: string }>;
    // Enhanced agricultural parameters
    dewPoint?: number;
    airQualityIndex?: number;
    cloudCover?: number;
    sunrise?: string;
    sunset?: string;
  };
  hourly: Array<{
    dt: number;
    temp: number;
    weather: Array<{ main: string }>;
    humidity?: number;
    wind_speed?: number;
    pop?: number; // Probability of precipitation
    visibility?: number;
  }>;
  daily: Array<{
    dt: number;
    temp: { min: number; max: number; day: number };
    weather: Array<{ main: string; description: string }>;
    pop: number;
    humidity: number;
    // Enhanced agricultural metrics
    wind_speed?: number;
    pressure?: number;
    dewPoint?: number;
    evapotranspiration?: number;
    growingDegreeDays?: number;
    chillHours?: number;
  }>;
  nasaPower?: {
    temperature: number;
    precipitation: number;
    solarRadiation: number;
  } | null;
  chirps?: {
    precipitation: number;
  } | null;
  gfs?: {
    forecast: Array<{
      dt: number;
      temp: number;
      precipitation: number;
    }>;
  } | null;
  // Enhanced agricultural indices
  agriculturalIndices?: {
    heatIndex: number;
    windChillIndex: number;
    comfortIndex: string;
    uvRisk: string;
    frostRisk: string;
    irrigationNeed: string;
    pestPressure: string;
  };
}

export async function getCurrentWeather(latitude: number, longitude: number): Promise<WeatherResponse | null> {
  if (!OPENWEATHER_API_KEY) {
    console.error("OPENWEATHER_API_KEY not configured");
    return null;
  }

  try {
    // Check cache first
    const cached = await storage.getWeatherData(latitude, longitude, "openweather");
    if (cached) {
      return cached.data as WeatherResponse;
    }

    // Fetch current weather using free 2.5 API
    const currentResponse = await axios.get("https://api.openweathermap.org/data/2.5/weather", {
      params: {
        lat: latitude,
        lon: longitude,
        appid: OPENWEATHER_API_KEY,
        units: "metric",
      },
    });

    // Fetch 5-day forecast using free 2.5 API
    const forecastResponse = await axios.get("https://api.openweathermap.org/data/2.5/forecast", {
      params: {
        lat: latitude,
        lon: longitude,
        appid: OPENWEATHER_API_KEY,
        units: "metric",
      },
    });

    // Transform to match our expected format
    const current = currentResponse.data;
    const forecast = forecastResponse.data;

    const weatherData: WeatherResponse = {
      current: {
        temp: current.main.temp,
        feels_like: current.main.feels_like,
        humidity: current.main.humidity,
        wind_speed: current.wind.speed,
        pressure: current.main.pressure,
        visibility: current.visibility || 10000,
        uvi: 0, // Not available in free tier
        weather: current.weather,
      },
      hourly: forecast.list.slice(0, 12).map((item: any) => ({
        dt: item.dt,
        temp: item.main.temp,
        weather: item.weather,
      })),
      daily: aggregateDailyForecast(forecast.list),
    };

    // Fetch additional data from other sources
    try {
      weatherData.nasaPower = await getNasaPowerData(latitude, longitude);
    } catch (error) {
      console.error("Error fetching NASA POWER data:", error);
    }

    try {
      weatherData.chirps = await getChirpsData(latitude, longitude);
    } catch (error) {
      console.error("Error fetching CHIRPS data:", error);
    }

    try {
      weatherData.gfs = await getGfsData(latitude, longitude);
    } catch (error) {
      console.error("Error fetching GFS data:", error);
    }

    // Cache the result
    const expiresAt = new Date(Date.now() + CACHE_DURATION_MS);
    await storage.saveWeatherData({
      latitude,
      longitude,
      source: "openweather",
      data: weatherData,
      expiresAt,
    });

    // Cleanup expired cache periodically
    if (Math.random() < 0.1) {
      await storage.cleanupExpiredWeather();
    }

    return weatherData;
  } catch (error: any) {
    console.error("Error fetching weather data:", error.response?.data || error.message);
    return null;
  }
}

// Enhanced helper function to aggregate 3-hour forecast into daily forecasts with agricultural metrics
function aggregateEnhancedDailyForecast(forecastList: any[]): WeatherResponse['daily'] {
  const dailyMap = new Map<string, any[]>();

  // Group forecasts by day
  for (const item of forecastList) {
    const date = new Date(item.dt * 1000).toDateString();
    if (!dailyMap.has(date)) {
      dailyMap.set(date, []);
    }
    dailyMap.get(date)!.push(item);
  }

  // Convert to daily summary with enhanced agricultural metrics
  const daily: WeatherResponse['daily'] = [];
  for (const [date, items] of Array.from(dailyMap.entries()).slice(0, 7)) {
    const temps = items.map(i => i.main.temp);
    const humidities = items.map(i => i.main.humidity);
    const pops = items.map(i => i.pop || 0);
    const windSpeeds = items.map(i => i.wind?.speed || 0);
    const pressures = items.map(i => i.main.pressure);

    daily.push({
      dt: items[0].dt,
      temp: {
        min: Math.min(...temps),
        max: Math.max(...temps),
        day: temps.reduce((a, b) => a + b, 0) / temps.length,
      },
      weather: items[0].weather,
      pop: Math.max(...pops),
      humidity: Math.round(humidities.reduce((a, b) => a + b, 0) / humidities.length),
      // Enhanced agricultural metrics
      wind_speed: windSpeeds.reduce((a, b) => a + b, 0) / windSpeeds.length,
      pressure: pressures.reduce((a, b) => a + b, 0) / pressures.length,
      dewPoint: calculateAverageDewPoint(temps, humidities),
      evapotranspiration: calculateEvapotranspiration(temps, humidities, windSpeeds),
      growingDegreeDays: calculateGrowingDegreeDays(temps),
      chillHours: calculateChillHours(temps)
    });
  }

  return daily;
}

// Helper function to aggregate 3-hour forecast into daily forecasts
function aggregateDailyForecast(forecastList: any[]): WeatherResponse['daily'] {
  const dailyMap = new Map<string, any[]>();

  // Group forecasts by day
  for (const item of forecastList) {
    const date = new Date(item.dt * 1000).toDateString();
    if (!dailyMap.has(date)) {
      dailyMap.set(date, []);
    }
    dailyMap.get(date)!.push(item);
  }

  // Convert to daily summary
  const daily: WeatherResponse['daily'] = [];
  for (const [date, items] of Array.from(dailyMap.entries()).slice(0, 7)) {
    const temps = items.map(i => i.main.temp);
    const humidities = items.map(i => i.main.humidity);
    const pops = items.map(i => i.pop || 0);

    daily.push({
      dt: items[0].dt,
      temp: {
        min: Math.min(...temps),
        max: Math.max(...temps),
        day: temps.reduce((a, b) => a + b, 0) / temps.length,
      },
      weather: items[0].weather,
      pop: Math.max(...pops),
      humidity: Math.round(humidities.reduce((a, b) => a + b, 0) / humidities.length),
    });
  }

  return daily;
}

// Agricultural index calculation functions
function calculateAverageDewPoint(temps: number[], humidities: number[]): number {
  let totalDewPoint = 0;
  for (let i = 0; i < temps.length; i++) {
    const temp = temps[i];
    const humidity = humidities[i];
    const dewPoint = temp - ((100 - humidity) / 5); // Simplified Magnus formula
    totalDewPoint += dewPoint;
  }
  return totalDewPoint / temps.length;
}

function calculateEvapotranspiration(temps: number[], humidities: number[], windSpeeds: number[]): number {
  // Simplified Penman-Monteith equation approximation
  const avgTemp = temps.reduce((a, b) => a + b, 0) / temps.length;
  const avgHumidity = humidities.reduce((a, b) => a + b, 0) / humidities.length;
  const avgWind = windSpeeds.reduce((a, b) => a + b, 0) / windSpeeds.length;
  
  // Simplified ET calculation (mm/day)
  return Math.max(0, (avgTemp * 0.1) + (avgWind * 0.05) - (avgHumidity * 0.02));
}

function calculateGrowingDegreeDays(temps: number[], baseTemp: number = 10): number {
  // Calculate growing degree days with base temperature
  const avgTemp = temps.reduce((a, b) => a + b, 0) / temps.length;
  return Math.max(0, avgTemp - baseTemp);
}

function calculateChillHours(temps: number[]): number {
  // Count hours between 0-7°C (chill hours for fruit trees)
  return temps.filter(temp => temp >= 0 && temp <= 7).length;
}

function calculateAgriculturalIndices(weatherData: WeatherResponse): any {
  const current = weatherData.current;
  
  return {
    heatIndex: calculateHeatIndex(current.temp, current.humidity),
    windChillIndex: calculateWindChill(current.temp, current.wind_speed),
    comfortIndex: calculateComfortIndex(current.temp, current.humidity, current.wind_speed),
    uvRisk: getUvRiskLevel(current.uvi),
    frostRisk: current.temp <= 2 ? 'high' : current.temp <= 5 ? 'medium' : 'low',
    irrigationNeed: calculateIrrigationNeed(current.temp, current.humidity, current.wind_speed),
    pestPressure: calculatePestPressure(current.temp, current.humidity)
  };
}

function calculateHeatIndex(temp: number, humidity: number): number {
  // Return temp as-is if conditions don't warrant heat index calculation
  if (temp < 27) return temp;
  
  console.log(`🌡️ Calculating heat index: temp=${temp}°C, humidity=${humidity}%`);
  
  // Convert Celsius to Fahrenheit for heat index formula (designed for Fahrenheit)
  const tempF = (temp * 9/5) + 32;
  
  // Standard heat index formula coefficients (for Fahrenheit)
  const c1 = -42.379;
  const c2 = 2.04901523;
  const c3 = 10.14333127;
  const c4 = -0.22475541;
  const c5 = -0.00683783;
  const c6 = -0.05481717;
  const c7 = 0.00122874;
  const c8 = 0.00085282;
  const c9 = -0.00000199;
  
  const heatIndexF = c1 + (c2 * tempF) + (c3 * humidity) + (c4 * tempF * humidity) +
                     (c5 * tempF * tempF) + (c6 * humidity * humidity) +
                     (c7 * tempF * tempF * humidity) + (c8 * tempF * humidity * humidity) +
                     (c9 * tempF * tempF * humidity * humidity);
  
  // Convert result back to Celsius
  const heatIndexC = (heatIndexF - 32) * 5/9;
  
  console.log(`🌡️ Heat index calculation: ${tempF}°F + ${humidity}% = ${heatIndexF}°F (${heatIndexC.toFixed(1)}°C)`);
  
  // Return the higher of actual temperature or heat index
  return Math.max(temp, heatIndexC);
}

function calculateWindChill(temp: number, windSpeed: number): number {
  if (temp > 10 || windSpeed < 4.8) return temp;
  
  console.log(`❄️ Calculating wind chill: temp=${temp}°C, windSpeed=${windSpeed}km/h`);
  
  const windChill = 13.12 + 0.6215 * temp - 11.37 * Math.pow(windSpeed, 0.16) +
                    0.3965 * temp * Math.pow(windSpeed, 0.16);
  
  console.log(`❄️ Wind chill result: ${windChill.toFixed(1)}°C`);
  
  return windChill;
}

function calculateComfortIndex(temp: number, humidity: number, windSpeed: number): string {
  const heatIndex = calculateHeatIndex(temp, humidity);
  const windChill = calculateWindChill(temp, windSpeed);
  const effectiveTemp = temp < 10 ? windChill : (temp > 27 ? heatIndex : temp);
  
  if (effectiveTemp < 16) return 'cold';
  if (effectiveTemp < 24) return 'comfortable';
  if (effectiveTemp < 29) return 'warm';
  if (effectiveTemp < 32) return 'hot';
  return 'extreme';
}

function getUvRiskLevel(uvIndex: number): string {
  if (uvIndex < 3) return 'low';
  if (uvIndex < 6) return 'moderate';
  if (uvIndex < 8) return 'high';
  if (uvIndex < 11) return 'very_high';
  return 'extreme';
}

function calculateIrrigationNeed(temp: number, humidity: number, windSpeed: number): string {
  const et = calculateEvapotranspiration([temp], [humidity], [windSpeed]);
  
  if (et < 2) return 'low';
  if (et < 4) return 'medium';
  if (et < 6) return 'high';
  return 'critical';
}

function calculatePestPressure(temp: number, humidity: number): string {
  // High temperature + high humidity = high pest pressure
  const pestIndex = (temp > 25 ? 1 : 0) + (humidity > 70 ? 1 : 0);
  
  switch (pestIndex) {
    case 0: return 'low';
    case 1: return 'medium';
    case 2: return 'high';
    default: return 'medium';
  }
}

export async function reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
  try {
    // Use Nominatim for reverse geocoding (free, no API key needed)
    const response = await axios.get("https://nominatim.openstreetmap.org/reverse", {
      params: {
        lat: latitude,
        lon: longitude,
        format: "json",
      },
      headers: {
        "User-Agent": "Agri-Forecast/1.0 (Agricultural Platform)",
      },
      timeout: 5000, // 5 second timeout
    });

    return response.data.display_name || null;
  } catch (error: any) {
    console.warn("Error reverse geocoding:", error.message);
    // Return formatted coordinates as fallback
    return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
  }
}

// Fetch NASA POWER data
export async function getNasaPowerData(latitude: number, longitude: number): Promise<{ temperature: number; precipitation: number; solarRadiation: number } | null> {
  try {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    
    const startDate = yesterday.toISOString().split('T')[0].replace(/-/g, '');
    const endDate = startDate;

    const response = await axios.get("https://power.larc.nasa.gov/api/temporal/daily/point", {
      params: {
        parameters: "T2M,PRECTOTCORR,ALLSKY_SFC_SW_DWN",
        community: "RE",
        longitude: longitude,
        latitude: latitude,
        start: startDate,
        end: endDate,
        format: "JSON",
      },
    });

    const data = response.data.properties.parameter;
    const date = Object.keys(data.T2M)[0];
    
    // Filter out NASA POWER missing data indicators (-999.0, etc.)
    const filterNASAMissingData = (value: number | null, fieldName: string): number | null => {
      if (value === null || value === undefined) {
        console.log(`🛰️ NASA POWER ${fieldName} is null/undefined for ${date}`);
        return null;
      }
      // NASA POWER uses -999.0 for missing data
      if (value <= -998 || value === -999.0 || value >= 9999) {
        console.log(`🛰️ NASA POWER filtered invalid ${fieldName} value: ${value} for ${date}`);
        return null;
      }
      // Additional range checks
      if (fieldName === 'temperature' && (value < -50 || value > 60)) {
        console.log(`🛰️ NASA POWER filtered unreasonable temperature: ${value}°C for ${date}`);
        return null;
      }
      if (fieldName === 'precipitation' && value < 0) {
        console.log(`🛰️ NASA POWER filtered negative precipitation: ${value}mm for ${date}`);
        return null;
      }
      if (fieldName === 'solarRadiation' && value < 0) {
        console.log(`🛰️ NASA POWER filtered negative solar radiation: ${value} W/m² for ${date}`);
        return null;
      }
      return value;
    };
    
    const temp = filterNASAMissingData(data.T2M[date], 'temperature');
    const precip = filterNASAMissingData(data.PRECTOTCORR[date], 'precipitation');
    const solar = filterNASAMissingData(data.ALLSKY_SFC_SW_DWN[date], 'solarRadiation');
    
    // Only return data if at least one value is valid
    if (temp === null && precip === null && solar === null) {
      console.log(`🛰️ NASA POWER: No valid data available for ${date}`);
      return null;
    }
    
    console.log(`🛰️ NASA POWER valid data for ${date}: T=${temp}°C, P=${precip}mm, S=${solar}W/m²`);
    
    return {
      temperature: temp,
      precipitation: precip,
      solarRadiation: solar,
    };
  } catch (error: any) {
    console.error("Error fetching NASA POWER data:", error.message);
    return null;
  }
}

// Fetch CHIRPS precipitation data
export async function getChirpsData(latitude: number, longitude: number): Promise<{ precipitation: number } | null> {
  try {
    // CHIRPS data via Open-Meteo (which aggregates CHIRPS)
    const response = await axios.get("https://api.open-meteo.com/v1/forecast", {
      params: {
        latitude: latitude,
        longitude: longitude,
        daily: "precipitation_sum",
        past_days: 1,
        forecast_days: 0,
      },
    });

    const data = response.data.daily;
    const precipitation = data.precipitation_sum[data.precipitation_sum.length - 1];

    return { precipitation };
  } catch (error: any) {
    console.error("Error fetching CHIRPS data:", error.message);
    return null;
  }
}

// Fetch GFS forecast data
export async function getGfsData(latitude: number, longitude: number): Promise<{ forecast: Array<{ dt: number; temp: number; precipitation: number }> } | null> {
  try {
    // GFS data via Open-Meteo
    const response = await axios.get("https://api.open-meteo.com/v1/forecast", {
      params: {
        latitude: latitude,
        longitude: longitude,
        hourly: "temperature_2m,precipitation",
        forecast_days: 7,
      },
    });

    const data = response.data.hourly;
    const forecast = [];

    for (let i = 0; i < data.time.length; i += 24) { // Daily aggregation
      const temps = data.temperature_2m.slice(i, i + 24);
      const precips = data.precipitation.slice(i, i + 24);
      
      forecast.push({
        dt: new Date(data.time[i]).getTime() / 1000,
        temp: temps.reduce((a: number, b: number) => a + b, 0) / temps.length,
        precipitation: precips.reduce((a: number, b: number) => a + b, 0),
      });
    }

    return { forecast };
  } catch (error: any) {
    console.error("Error fetching GFS data:", error.message);
    return null;
  }
}

/**
 * Get enhanced current weather with agricultural indices
 */
export async function getEnhancedCurrentWeather(latitude: number, longitude: number): Promise<WeatherResponse | null> {
  try {
    const weather = await getCurrentWeather(latitude, longitude);
    if (!weather) return null;

    // Calculate agricultural indices
    const agriculturalIndices = calculateAgriculturalIndices(weather);
    
    // Enhanced response with agricultural data
    return {
      ...weather,
      agriculturalIndices
    };
  } catch (error: any) {
    console.error("Error fetching enhanced weather:", error.message);
    return null;
  }
}

/**
 * Get comprehensive weather analysis using all data sources
 */
export async function getComprehensiveWeatherAnalysis(
  latitude: number, 
  longitude: number, 
  landId?: number
): Promise<ComprehensiveWeatherAnalysis | null> {
  try {
    console.log(`🔄 Starting comprehensive weather analysis for ${latitude}, ${longitude}`);
    
    const analysis = await comprehensiveDataService.generateComprehensiveAnalysis(
      latitude,
      longitude,
      landId
    );

    return analysis;
  } catch (error: any) {
    console.error("Error in comprehensive weather analysis:", error.message);
    return null;
  }
}


