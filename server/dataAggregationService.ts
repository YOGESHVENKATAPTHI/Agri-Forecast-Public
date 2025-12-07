import axios from "axios";
import { storage } from "./storage";

// Enhanced data sources for comprehensive weather and agricultural predictions
export interface WeatherDataSources {
  openWeather: any;
  nasaPower: NASAPowerData | null;
  openMeteo: OpenMeteoData | null;
  weatherAPI: WeatherAPIData | null;
  noaa: NOAAData | null;
}

export interface NASAPowerData {
  temperature: {
    min: number[];
    max: number[];
    avg: number[];
  };
  precipitation: number[];
  solarRadiation: number[];
  windSpeed: number[];
  humidity: number[];
  // Agricultural specific data
  agro: {
    cropGrowingDegreeDay: number[];
    soilMoisture: number[];
    evapotranspiration: number[];
  };
}

export interface OpenMeteoData {
  temperature: number[];
  precipitation: number[];
  windSpeed: number[];
  humidity: number[];
  soilTemperature: number[];
  soilMoisture: number[];
  uv: number[];
  
  // Enhanced agricultural data
  evapotranspiration?: number[];
  solarRadiation?: number[];
  dewPoint?: number[];
  windDirection?: number[];
  
  // Deep soil data
  deepSoilTemperature?: number[];
  deepSoilMoisture?: number[];
  
  // Hourly detailed data
  hourlyData?: {
    temperature: number[];
    precipitation: number[];
    windSpeed: number[];
    humidity: number[];
    pressure: number[];
    times: string[];
  };
  
  // Seasonal forecast (ECMWF SEAS5)
  seasonalForecast?: {
    monthly: {
      temperature: number[];
      temperatureAnomaly: number[];
      precipitation: number[];
      precipitationAnomaly: number[];
      soilMoisture: number[];
      times: string[];
    };
  };
  
  // Marine data (for coastal locations)
  marineData?: {
    waveHeight: number[];
    waveDirection: number[];
    currentVelocity: number[];
    currentDirection: number[];
  };
}

export interface WeatherAPIData {
  current: any;
  forecast: any[];
  astronomy: any[];
  marine?: any[];
}

export interface NOAAData {
  temperature: number[];
  precipitation: number[];
  climatology: {
    historical: any[];
    normals: any[];
  };
}

export interface LongTermWeatherPrediction {
  source: string;
  confidence: number;
  timeRange: {
    start: Date;
    end: Date;
  };
  monthlyData: Array<{
    month: number;
    year: number;
    temperature: {
      min: number;
      max: number;
      avg: number;
    };
    precipitation: {
      total: number;
      rainyDays: number;
    };
    humidity: number;
    solarRadiation: number;
    windSpeed: number;
    conditions: string;
    confidence: number;
  }>;
  agriculturalMetrics: {
    soilMoisture: number[];
    growthConditions: string[];
    irrigationNeeds: string[];
    pestRisk: string[];
  };
}

const CACHE_DURATION_HOURS = 6;

export class DataAggregationService {
  private nasaApiCache = new Map();
  private openMeteoCache = new Map();
  
  async get6MonthPrediction(
    latitude: number, 
    longitude: number,
    landId?: number
  ): Promise<LongTermWeatherPrediction> {
    try {
      console.log(`🌍 Fetching 6-month prediction for coordinates: ${latitude}, ${longitude}`);
      
      // Fetch data from multiple sources in parallel
      const [nasaData, openMeteoData, weatherApiData, noaaData] = await Promise.allSettled([
        this.getNASAPowerLongTerm(latitude, longitude),
        this.getOpenMeteoLongTerm(latitude, longitude),
        this.getWeatherAPILongTerm(latitude, longitude),
        this.getNOAAData(latitude, longitude)
      ]);

      // Aggregate and analyze data
      const prediction = await this.aggregateWeatherData({
        nasaPower: nasaData.status === 'fulfilled' ? nasaData.value : null,
        openMeteo: openMeteoData.status === 'fulfilled' ? openMeteoData.value : null,
        weatherAPI: weatherApiData.status === 'fulfilled' ? weatherApiData.value : null,
        noaa: noaaData.status === 'fulfilled' ? noaaData.value : null,
      }, latitude, longitude);

      // Cache the result
      if (landId) {
        await this.cacheLongTermPrediction(landId, prediction);
      }

      console.log(`✅ Generated 6-month prediction with ${prediction.confidence}% confidence`);
      return prediction;

    } catch (error) {
      console.error("Error generating 6-month prediction:", error);
      throw error;
    }
  }

  private async getNASAPowerLongTerm(latitude: number, longitude: number): Promise<NASAPowerData | null> {
    try {
      const cacheKey = `nasa_${latitude}_${longitude}`;
      const cached = this.nasaApiCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION_HOURS * 60 * 60 * 1000) {
        return cached.data;
      }

      // Get historical data for climatology (last 2 years)
      const endDate = new Date();
      const startDate = new Date();
      startDate.setFullYear(endDate.getFullYear() - 2);

      const formatDate = (date: Date) => date.toISOString().split('T')[0].replace(/-/g, '');

      // Enhanced parameters for agricultural analysis
      const parameters = [
        "T2M_MIN", "T2M_MAX", "T2M",           // Temperature
        "PRECTOTCORR",                         // Precipitation
        "ALLSKY_SFC_SW_DWN",                  // Solar radiation
        "WS2M",                               // Wind speed
        "RH2M",                               // Humidity
        "T2MDEW",                             // Dew point
        "GWETROOT", "GWETTOP",                // Soil moisture
        "PET",                                // Potential evapotranspiration
        "PS",                                 // Surface pressure
      ];

      const response = await axios.get("https://power.larc.nasa.gov/api/temporal/daily/point", {
        params: {
          parameters: parameters.join(","),
          community: "AG",  // Agricultural community
          longitude: longitude,
          latitude: latitude,
          start: formatDate(startDate),
          end: formatDate(endDate),
          format: "JSON",
        },
        timeout: 30000, // 30 seconds timeout
      });

      const data = response.data.properties.parameter;
      const dates = Object.keys(data.T2M).sort();

      const result: NASAPowerData = {
        temperature: {
          min: dates.map(date => data.T2M_MIN[date]),
          max: dates.map(date => data.T2M_MAX[date]),
          avg: dates.map(date => data.T2M[date]),
        },
        precipitation: dates.map(date => data.PRECTOTCORR[date]),
        solarRadiation: dates.map(date => data.ALLSKY_SFC_SW_DWN[date]),
        windSpeed: dates.map(date => data.WS2M[date]),
        humidity: dates.map(date => data.RH2M[date]),
        agro: {
          cropGrowingDegreeDay: this.calculateGDD(dates.map(date => data.T2M[date])),
          soilMoisture: dates.map(date => (data.GWETROOT[date] + data.GWETTOP[date]) / 2),
          evapotranspiration: dates.map(date => data.PET[date]),
        },
      };

      // Cache the result
      this.nasaApiCache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
      });

      return result;
    } catch (error: any) {
      console.error("Error fetching NASA POWER data:", error.message);
      return null;
    }
  }

  private async getOpenMeteoLongTerm(latitude: number, longitude: number): Promise<OpenMeteoData | null> {
    try {
      const cacheKey = `openmeteo_${latitude}_${longitude}`;
      const cached = this.openMeteoCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION_HOURS * 60 * 60 * 1000) {
        return cached.data;
      }

      console.log(`🌍 Fetching comprehensive Open-Meteo data for ${latitude}, ${longitude}`);

      // Get multiple data sources from Open-Meteo in parallel
      const [forecastResponse, seasonalResponse, marineResponse] = await Promise.allSettled([
        // Standard forecast (16 days)
        axios.get("https://api.open-meteo.com/v1/forecast", {
          params: {
            latitude: latitude,
            longitude: longitude,
            daily: [
              "temperature_2m_max", "temperature_2m_min", "temperature_2m_mean",
              "precipitation_sum", "precipitation_probability_max",
              "wind_speed_10m_max", "wind_direction_10m_dominant",
              "relative_humidity_2m_mean", "dewpoint_2m_mean",
              "soil_temperature_0_to_7cm_mean", "soil_temperature_7_to_28cm_mean",
              "soil_moisture_0_to_7cm_mean", "soil_moisture_7_to_28cm_mean",
              "uv_index_max", "et0_fao_evapotranspiration",
              "shortwave_radiation_sum", "sunshine_duration"
            ].join(","),
            hourly: [
              "temperature_2m", "precipitation", "wind_speed_10m",
              "relative_humidity_2m", "surface_pressure"
            ].join(","),
            past_days: 30,
            forecast_days: 16,
            timezone: "auto",
          },
          timeout: 30000,
        }),
        
        // Seasonal forecast (ECMWF SEAS5 model - up to 6 months)
        axios.get("https://climate-api.open-meteo.com/v1/climate", {
          params: {
            latitude: latitude,
            longitude: longitude,
            monthly: [
              "temperature_2m_mean", "temperature_2m_anomaly",
              "precipitation_sum", "precipitation_anomaly",
              "soil_moisture_0_to_10cm_mean"
            ].join(","),
            start_date: new Date().toISOString().split('T')[0],
            end_date: new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            models: "ecmwf_seas5",
          },
          timeout: 30000,
        }),

        // Marine forecast (if coastal)
        this.isCoastal(latitude, longitude) ? 
          axios.get("https://marine-api.open-meteo.com/v1/marine", {
            params: {
              latitude: latitude,
              longitude: longitude,
              daily: [
                "wave_height_max", "wave_direction_dominant",
                "ocean_current_velocity", "ocean_current_direction"
              ].join(","),
              forecast_days: 7,
            },
            timeout: 15000,
          }) : Promise.resolve({ data: null })
      ]);

      // Process forecast data
      let forecastData = null;
      if (forecastResponse.status === 'fulfilled') {
        forecastData = forecastResponse.value.data;
      }

      // Process seasonal data
      let seasonalData = null;
      if (seasonalResponse.status === 'fulfilled') {
        seasonalData = seasonalResponse.value.data;
        console.log(`📊 Retrieved ECMWF SEAS5 seasonal forecast for 6 months`);
      }

      // Process marine data
      let marineData = null;
      if (marineResponse.status === 'fulfilled' && marineResponse.value.data) {
        marineData = marineResponse.value.data;
        console.log(`🌊 Retrieved marine forecast data`);
      }

      if (!forecastData) {
        throw new Error("Failed to get basic forecast data");
      }

      const result: OpenMeteoData = {
        // Standard forecast data (16 days)
        temperature: forecastData.daily?.temperature_2m_mean || [],
        precipitation: forecastData.daily?.precipitation_sum || [],
        windSpeed: forecastData.daily?.wind_speed_10m_max || [],
        humidity: forecastData.daily?.relative_humidity_2m_mean || [],
        soilTemperature: forecastData.daily?.soil_temperature_0_to_7cm_mean || [],
        soilMoisture: forecastData.daily?.soil_moisture_0_to_7cm_mean || [],
        uv: forecastData.daily?.uv_index_max || [],
        
        // Enhanced agricultural data
        evapotranspiration: forecastData.daily?.et0_fao_evapotranspiration || [],
        solarRadiation: forecastData.daily?.shortwave_radiation_sum || [],
        dewPoint: forecastData.daily?.dewpoint_2m_mean || [],
        windDirection: forecastData.daily?.wind_direction_10m_dominant || [],
        
        // Deep soil data
        deepSoilTemperature: forecastData.daily?.soil_temperature_7_to_28cm_mean || [],
        deepSoilMoisture: forecastData.daily?.soil_moisture_7_to_28cm_mean || [],
        
        // Hourly data (for detailed analysis)
        hourlyData: forecastData.hourly ? {
          temperature: forecastData.hourly.temperature_2m || [],
          precipitation: forecastData.hourly.precipitation || [],
          windSpeed: forecastData.hourly.wind_speed_10m || [],
          humidity: forecastData.hourly.relative_humidity_2m || [],
          pressure: forecastData.hourly.surface_pressure || [],
          times: forecastData.hourly.time || []
        } : null,
        
        // Seasonal forecast (6 months)
        seasonalForecast: seasonalData ? {
          monthly: {
            temperature: seasonalData.monthly?.temperature_2m_mean || [],
            temperatureAnomaly: seasonalData.monthly?.temperature_2m_anomaly || [],
            precipitation: seasonalData.monthly?.precipitation_sum || [],
            precipitationAnomaly: seasonalData.monthly?.precipitation_anomaly || [],
            soilMoisture: seasonalData.monthly?.soil_moisture_0_to_10cm_mean || [],
            times: seasonalData.monthly?.time || []
          }
        } : null,
        
        // Marine data (if coastal)
        marineData: marineData ? {
          waveHeight: marineData.daily?.wave_height_max || [],
          waveDirection: marineData.daily?.wave_direction_dominant || [],
          currentVelocity: marineData.daily?.ocean_current_velocity || [],
          currentDirection: marineData.daily?.ocean_current_direction || []
        } : null
      };

      // Cache the result
      this.openMeteoCache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
      });

      console.log(`✅ Open-Meteo data cached with ${Object.keys(result).length} components`);
      return result;
    } catch (error: any) {
      console.error("Error fetching Open-Meteo data:", error.message);
      return null;
    }
  }

  private isCoastal(latitude: number, longitude: number): boolean {
    // Simple heuristic to determine if location might be coastal
    // In production, you'd use a proper coastal database
    const coastalRegions = [
      { minLat: 8, maxLat: 38, minLon: 68, maxLon: 98 }, // India coastal
      { minLat: 24, maxLat: 50, minLon: -130, maxLon: -60 }, // US coastal
      { minLat: 35, maxLat: 60, minLon: -10, maxLon: 40 }, // Europe coastal
    ];
    
    return coastalRegions.some(region => 
      latitude >= region.minLat && latitude <= region.maxLat &&
      longitude >= region.minLon && longitude <= region.maxLon
    );
  }

  private async getWeatherAPILongTerm(latitude: number, longitude: number): Promise<WeatherAPIData | null> {
    try {
      // WeatherAPI free tier provides 3-day forecast, but we can use it for current conditions
      // and supplement with their historical data API
      const apiKey = process.env.WEATHERAPI_KEY;
      if (!apiKey) {
        console.log("WeatherAPI key not configured, skipping");
        return null;
      }

      const [currentResponse, forecastResponse] = await Promise.all([
        axios.get(`https://api.weatherapi.com/v1/current.json`, {
          params: { key: apiKey, q: `${latitude},${longitude}`, aqi: "yes" },
          timeout: 10000,
        }),
        axios.get(`https://api.weatherapi.com/v1/forecast.json`, {
          params: { key: apiKey, q: `${latitude},${longitude}`, days: 10, aqi: "yes", alerts: "yes" },
          timeout: 10000,
        })
      ]);

      return {
        current: currentResponse.data.current,
        forecast: forecastResponse.data.forecast.forecastday,
        astronomy: forecastResponse.data.forecast.forecastday.map((day: any) => day.astro),
      };
    } catch (error: any) {
      console.error("Error fetching WeatherAPI data:", error.message);
      return null;
    }
  }

  private async getNOAAData(latitude: number, longitude: number): Promise<NOAAData | null> {
    try {
      // NOAA data through their climate data API (requires specific station lookup)
      // This is a simplified implementation - in production, you'd want to find nearest stations
      
      // For now, we'll use NOAA's global summary data through Open-Meteo's historical API
      const endDate = new Date();
      const startDate = new Date();
      startDate.setFullYear(endDate.getFullYear() - 1); // 1 year of historical data

      const response = await axios.get("https://archive-api.open-meteo.com/v1/era5", {
        params: {
          latitude: latitude,
          longitude: longitude,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          daily: "temperature_2m_mean,precipitation_sum",
          timezone: "auto",
        },
        timeout: 30000,
      });

      const daily = response.data.daily;

      return {
        temperature: daily.temperature_2m_mean,
        precipitation: daily.precipitation_sum,
        climatology: {
          historical: daily,
          normals: this.calculateClimatologyNormals(daily),
        },
      };
    } catch (error: any) {
      console.error("Error fetching NOAA data:", error.message);
      return null;
    }
  }

  private async aggregateWeatherData(
    sources: Partial<WeatherDataSources>,
    latitude: number,
    longitude: number
  ): Promise<LongTermWeatherPrediction> {
    const monthlyData = [];
    const currentDate = new Date();
    
    // Generate 6 months of predictions
    for (let monthOffset = 0; monthOffset < 6; monthOffset++) {
      const targetDate = new Date(currentDate);
      targetDate.setMonth(currentDate.getMonth() + monthOffset);
      
      const monthData = await this.generateMonthPrediction(
        sources,
        targetDate.getMonth() + 1,
        targetDate.getFullYear(),
        latitude,
        longitude
      );
      
      monthlyData.push(monthData);
    }

    // Calculate overall confidence based on available data sources
    const availableSources = Object.values(sources).filter(source => source !== null).length;
    const baseConfidence = Math.min(95, 60 + (availableSources * 10));

    return {
      source: "Multi-Source Aggregation",
      confidence: baseConfidence,
      timeRange: {
        start: new Date(),
        end: new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000), // 6 months
      },
      monthlyData,
      agriculturalMetrics: this.calculateAgriculturalMetrics(sources, monthlyData),
    };
  }

  private async generateMonthPrediction(
    sources: Partial<WeatherDataSources>,
    month: number,
    year: number,
    latitude: number,
    longitude: number
  ): Promise<any> {
    // Aggregate predictions from all available sources
    let tempSum = 0, tempCount = 0;
    let precipSum = 0, precipCount = 0;
    let humiditySum = 0, humidityCount = 0;
    let solarSum = 0, solarCount = 0;
    let windSum = 0, windCount = 0;

    // Process NASA POWER data
    if (sources.nasaPower) {
      const monthlyAvg = this.getMonthlyAverage(sources.nasaPower, month);
      if (monthlyAvg) {
        tempSum += monthlyAvg.temperature;
        tempCount++;
        precipSum += monthlyAvg.precipitation;
        precipCount++;
        humiditySum += monthlyAvg.humidity;
        humidityCount++;
        solarSum += monthlyAvg.solarRadiation;
        solarCount++;
        windSum += monthlyAvg.windSpeed;
        windCount++;
      }
    }

    // Process Open-Meteo data
    if (sources.openMeteo) {
      const monthlyAvg = this.getOpenMeteoMonthlyAverage(sources.openMeteo, month);
      if (monthlyAvg) {
        tempSum += monthlyAvg.temperature;
        tempCount++;
        precipSum += monthlyAvg.precipitation;
        precipCount++;
        humiditySum += monthlyAvg.humidity;
        humidityCount++;
        windSum += monthlyAvg.windSpeed;
        windCount++;
      }
    }

    // Calculate weighted averages
    const avgTemp = tempCount > 0 ? tempSum / tempCount : 20;
    const avgPrecip = precipCount > 0 ? precipSum / precipCount : 50;
    const avgHumidity = humidityCount > 0 ? humiditySum / humidityCount : 65;
    const avgSolar = solarCount > 0 ? solarSum / solarCount : 15;
    const avgWind = windCount > 0 ? windSum / windCount : 10;

    // Determine conditions based on temperature and precipitation
    let conditions = "Mild";
    if (avgTemp > 30) conditions = "Hot";
    else if (avgTemp < 10) conditions = "Cool";
    
    if (avgPrecip > 100) conditions += " and Wet";
    else if (avgPrecip < 25) conditions += " and Dry";

    // Calculate confidence based on data availability
    const confidence = Math.min(95, 50 + (tempCount + precipCount) * 10);

    return {
      month,
      year,
      temperature: {
        min: Math.max(0, avgTemp - 8),
        max: avgTemp + 12,
        avg: avgTemp,
      },
      precipitation: {
        total: avgPrecip,
        rainyDays: Math.min(30, Math.max(1, Math.round(avgPrecip / 5))),
      },
      humidity: avgHumidity,
      solarRadiation: avgSolar,
      windSpeed: avgWind,
      conditions: conditions.trim(),
      confidence,
    };
  }

  private calculateGDD(temperatures: number[], baseTemp: number = 10): number[] {
    return temperatures.map(temp => Math.max(0, temp - baseTemp));
  }

  private calculateClimatologyNormals(dailyData: any): any[] {
    // Calculate 30-year climate normals (simplified)
    const months = new Array(12).fill(null).map(() => ({
      temperature: [],
      precipitation: [],
    }));

    dailyData.time.forEach((dateStr: string, index: number) => {
      const date = new Date(dateStr);
      const month = date.getMonth();
      months[month].temperature.push(dailyData.temperature_2m_mean[index]);
      months[month].precipitation.push(dailyData.precipitation_sum[index]);
    });

    return months.map(month => ({
      avgTemperature: month.temperature.reduce((a, b) => a + b, 0) / month.temperature.length || 0,
      avgPrecipitation: month.precipitation.reduce((a, b) => a + b, 0) / month.precipitation.length || 0,
    }));
  }

  private getMonthlyAverage(nasaData: NASAPowerData, targetMonth: number): any | null {
    // Simplified monthly averaging - in production, you'd want more sophisticated analysis
    const avgIndex = Math.floor(nasaData.temperature.avg.length / 2);
    return {
      temperature: nasaData.temperature.avg[avgIndex] || 20,
      precipitation: nasaData.precipitation[avgIndex] || 50,
      humidity: nasaData.humidity[avgIndex] || 65,
      solarRadiation: nasaData.solarRadiation[avgIndex] || 15,
      windSpeed: nasaData.windSpeed[avgIndex] || 10,
    };
  }

  private getOpenMeteoMonthlyAverage(openMeteoData: OpenMeteoData, targetMonth: number): any | null {
    const avgIndex = Math.floor(openMeteoData.temperature.length / 2);
    return {
      temperature: openMeteoData.temperature[avgIndex] || 20,
      precipitation: openMeteoData.precipitation[avgIndex] || 50,
      humidity: openMeteoData.humidity[avgIndex] || 65,
      windSpeed: openMeteoData.windSpeed[avgIndex] || 10,
    };
  }

  private calculateAgriculturalMetrics(sources: Partial<WeatherDataSources>, monthlyData: any[]): any {
    return {
      soilMoisture: monthlyData.map(month => {
        // Calculate soil moisture based on precipitation and temperature
        const moistureIndex = (month.precipitation.total / (month.temperature.avg + 20)) * 100;
        return Math.min(100, Math.max(10, moistureIndex));
      }),
      growthConditions: monthlyData.map(month => {
        if (month.temperature.avg > 25 && month.precipitation.total > 80) return "Excellent";
        if (month.temperature.avg > 15 && month.precipitation.total > 40) return "Good";
        if (month.temperature.avg > 10 && month.precipitation.total > 20) return "Fair";
        return "Poor";
      }),
      irrigationNeeds: monthlyData.map(month => {
        if (month.precipitation.total < 30) return "High";
        if (month.precipitation.total < 60) return "Moderate";
        return "Low";
      }),
      pestRisk: monthlyData.map(month => {
        if (month.temperature.avg > 25 && month.humidity > 70) return "High";
        if (month.temperature.avg > 20 && month.humidity > 60) return "Moderate";
        return "Low";
      }),
    };
  }

  private async cacheLongTermPrediction(landId: number, prediction: LongTermWeatherPrediction): Promise<void> {
    try {
      // Store in database for future reference
      await storage.saveLongTermPrediction({
        landId,
        data: prediction,
        generatedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      });
    } catch (error) {
      console.error("Error caching long-term prediction:", error);
    }
  }
}

export const dataAggregationService = new DataAggregationService();