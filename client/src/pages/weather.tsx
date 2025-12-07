import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLand, useSelectedLandCoordinates } from "@/contexts/LandContext";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useTranslation } from "@/lib/translations";
import { TranslatedText } from "@/components/TranslatedText";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Cloud, Droplets, Wind, Eye, Gauge, Sun, Moon, TrendingUp, BarChart3, Activity, Thermometer, CloudRain, Zap, AlertTriangle } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area, ComposedChart } from "recharts";
import DroughtMonitoring from "@/components/drought-monitoring";

interface WeatherResponse {
  current: {
    temp: number;
    feels_like: number;
    humidity: number;
    wind_speed: number;
    pressure: number;
    visibility: number;
    uvi: number;
    weather: Array<{ main: string; description: string; icon: string }>;
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
    pop?: number;
    visibility?: number;
  }>;
  daily: Array<{
    dt: number;
    temp: { min: number; max: number; day: number };
    weather: Array<{ main: string; description: string }>;
    pop: number;
    humidity: number;
    wind_speed?: number;
    pressure?: number;
    dewPoint?: number;
    evapotranspiration?: number;
    growingDegreeDays?: number;
    chillHours?: number;
  }>;
  agriculturalIndices?: {
    heatIndex: number;
    windChillIndex: number;
    comfortIndex: string;
    uvRisk: string;
    frostRisk: string;
    irrigationNeed: string;
    pestPressure: string;
  };
  locationName?: string;
  landId?: number | null;
}

interface ComprehensiveAnalysis {
  analysisId: string;
  location: { latitude: number; longitude: number; address?: string };
  generatedAt: Date;
  landId?: number;
  dataSources: {
    nasaPower: { status: string; confidence: number; recordsCount: number; timeRange: { start: Date; end: Date } };
    openMeteo: { status: string; confidence: number; forecastMonths: number };
    openWeather: { status: string; confidence: number; forecastDays: number };
  };
  historicalAnalysis: {
    climaticNormals: {
      temperature: { annual: { min: number; max: number; avg: number } };
      precipitation: { annual: { total: number; avg: number } };
      solarRadiation: { annual: { avg: number; peak: number } };
    };
    extremeEvents: Array<{ type: string; year: number; severity: string; impact: string; duration: number }>;
    trends: { temperatureTrend: number; precipitationTrend: number; solarRadiationTrend: number };
  };
  seasonalForecast: {
    confidence: number;
    model: string;
    monthlyOutlook: Array<{
      month: number;
      year: number;
      temperature: { anomaly: number; expected: { min: number; max: number; avg: number } };
      precipitation: { anomaly: number; expected: number };
      soilMoisture: { surface: number; rootZone: number; deep: number };
      evapotranspiration: number;
      confidence: number;
    }>;
  };
}

export default function Weather() {
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const { selectedLand } = useLand();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("current");

  useEffect(() => {
    if (!authLoading && !user) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [user, authLoading, toast]);

  // Enhanced weather data with agricultural metrics
  const { data: weather, isLoading: weatherLoading, error: weatherError } = useQuery<WeatherResponse>({
    queryKey: ["weather-enhanced", selectedLand?.id || "user"],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedLand) {
        params.append('landId', selectedLand.id.toString());
      }
      params.append('enhanced', 'true');
      
      const response = await fetch(`/api/weather/current?${params}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch enhanced weather data');
      }
      
      return response.json();
    },
    enabled: !!user,
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes
  });

  // Comprehensive analysis data
  const { data: comprehensiveAnalysis, isLoading: analysisLoading } = useQuery<ComprehensiveAnalysis>({
    queryKey: ["comprehensive-weather-analysis", selectedLand?.id],
    queryFn: async () => {
      if (!selectedLand) return null;
      
      const response = await fetch('/api/enhanced-analysis/complete', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: selectedLand.latitude,
          longitude: selectedLand.longitude,
          landId: selectedLand.id,
          useGPS: false,
          forceRefresh: false
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch comprehensive analysis');
      }
      
      return response.json();
    },
    enabled: !!selectedLand && !!user,
    staleTime: 60 * 60 * 1000, // 1 hour cache
  });

  // Historical weather data (only if comprehensive analysis is not available)
  const { data: historicalData, isLoading: historicalLoading } = useQuery({
    queryKey: ["historical-weather", selectedLand?.latitude, selectedLand?.longitude],
    queryFn: async () => {
      if (!selectedLand) return null;
      
      const response = await fetch(
        `/api/weather/historical/${selectedLand.latitude}/${selectedLand.longitude}?years=10&parameters=temperature,precipitation,solarRadiation`,
        { credentials: 'include' }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch historical data');
      }
      
      return response.json();
    },
    enabled: !!selectedLand && !!user && !comprehensiveAnalysis?.historicalAnalysis,
    staleTime: 24 * 60 * 60 * 1000, // 24 hour cache for historical data
  });

  // Seasonal forecast data (only if comprehensive analysis is not available)  
  const { data: seasonalData, isLoading: seasonalLoading } = useQuery({
    queryKey: ["seasonal-forecast", selectedLand?.latitude, selectedLand?.longitude],
    queryFn: async () => {
      if (!selectedLand) return null;
      
      const response = await fetch(
        `/api/weather/seasonal/${selectedLand.latitude}/${selectedLand.longitude}`,
        { credentials: 'include' }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch seasonal forecast');
      }
      
      return response.json();
    },
    enabled: !!selectedLand && !!user && !comprehensiveAnalysis?.seasonalForecast,
    staleTime: 6 * 60 * 60 * 1000, // 6 hour cache for seasonal data
  });

  if (authLoading || !user) {
    return <div className="p-4 md:p-8"><Skeleton className="h-96" /></div>;
  }

  const hourlyData = weather?.hourly.slice(0, 12).map((hour) => ({
    time: new Date(hour.dt * 1000).toLocaleTimeString("en-US", { hour: "numeric" }),
    temp: Math.round(hour.temp),
  })) || [];

  const dailyData = weather?.daily.slice(0, 7).map((day) => ({
    day: new Date(day.dt * 1000).toLocaleDateString("en-US", { weekday: "short" }),
    high: Math.round(day.temp.max),
    low: Math.round(day.temp.min),
    rainfall: Math.round(day.pop * 100),
  })) || [];

  return (
    <div className="p-3 sm:p-4 md:p-8 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">{t("weather_dashboard")}</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            {selectedLand ? (
              <><TranslatedText text="Advanced agricultural weather analysis for" /> <strong>{selectedLand.name}</strong></>
            ) : (
              t("real_time_weather_data_description")
            )}
          </p>
        </div>
        {weather?.locationName && (
          <div className="text-left sm:text-right text-xs sm:text-sm text-muted-foreground">
            <div className="font-medium"> {weather.locationName}</div>
            <div>Updated: {new Date().toLocaleTimeString()}</div>
            {comprehensiveAnalysis && (
              <div className="text-xs mt-1">
                Analysis ID: {comprehensiveAnalysis.analysisId?.slice(-8)}
              </div>
            )}
          </div>
        )}
      </div>

     

      {/* Current Weather */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{t("current_conditions")}</CardTitle>
          <CardDescription>
            
            {weather?.nasaPower && (
              <span className="ml-2 text-blue-600">+ NASA POWER satellite data</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {weatherLoading ? (
            <Skeleton className="h-32" />
          ) : weather ? (
            <>
              {/* Mobile: Professional cards without icons */}
              <div className="sm:hidden grid grid-cols-2 gap-3">
              <div className="p-4 rounded-lg border border-border bg-card">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">{t("temperature")}</div>
                <div className="text-2xl font-bold text-foreground" data-testid="text-current-temp">
                  {Math.round(weather.current.temp)}°C
                </div>
                <div className="text-xs text-muted-foreground mt-1">Feels {Math.round(weather.current.feels_like)}°C</div>
              </div>
              <div className="p-4 rounded-lg border border-border bg-card">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">{t("humidity")}</div>
                <div className="text-2xl font-bold text-foreground">{weather.current.humidity}%</div>
                <div className="text-xs text-muted-foreground mt-1">Relative Humidity</div>
              </div>
              <div className="p-4 rounded-lg border border-border bg-card">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">{t("wind_speed")}</div>
                <div className="text-2xl font-bold text-foreground">{Math.round(weather.current.wind_speed)}</div>
                <div className="text-xs text-muted-foreground mt-1">km/h</div>
              </div>
              <div className="p-4 rounded-lg border border-border bg-card">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">{t("pressure")}</div>
                <div className="text-2xl font-bold text-foreground">{weather.current.pressure}</div>
                <div className="text-xs text-muted-foreground mt-1">hPa</div>
              </div>
            </div>
            
            {/* Desktop: Original design with icons */}
            <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-gradient-to-r from-chart-2/5 to-chart-2/10">
                <div className="p-2 rounded-md bg-chart-2/20">
                  <Sun className="w-5 h-5 sm:w-6 sm:h-6 text-chart-2" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">{t("temperature")}</p>
                  <p className="text-xl sm:text-2xl font-bold" data-testid="text-current-temp">
                    {Math.round(weather.current.temp)}°C
                  </p>
                  <p className="text-xs text-muted-foreground truncate">Feels {Math.round(weather.current.feels_like)}°C</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-gradient-to-r from-chart-3/5 to-chart-3/10">
                <div className="p-2 rounded-md bg-chart-3/20">
                  <Droplets className="w-5 h-5 sm:w-6 sm:h-6 text-chart-3" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">{t("humidity")}</p>
                  <p className="text-xl sm:text-2xl font-bold">{weather.current.humidity}%</p>
                  <p className="text-xs text-muted-foreground">Relative</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-gradient-to-r from-chart-4/5 to-chart-4/10">
                <div className="p-2 rounded-md bg-chart-4/20">
                  <Wind className="w-5 h-5 sm:w-6 sm:h-6 text-chart-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">{t("wind_speed")}</p>
                  <p className="text-xl sm:text-2xl font-bold">{Math.round(weather.current.wind_speed)}</p>
                  <p className="text-xs text-muted-foreground">km/h</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-gradient-to-r from-chart-1/5 to-chart-1/10">
                <div className="p-2 rounded-md bg-chart-1/20">
                  <Gauge className="w-5 h-5 sm:w-6 sm:h-6 text-chart-1" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">{t("pressure")}</p>
                  <p className="text-xl sm:text-2xl font-bold">{weather.current.pressure}</p>
                  <p className="text-xs text-muted-foreground">hPa</p>
                </div>
              </div>
            </div>
            </>
          ) : (
            <p className="text-center text-muted-foreground py-8">No weather data available</p>
          )}
        </CardContent>
      </Card>

      

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
        <div className="w-full">
          {/* Mobile: Professional Scrollable tabs */}
          <div className="sm:hidden">
            <div className="border-b border-border bg-background">
              <div className="flex overflow-x-auto scrollbar-hide">
                <TabsList className="flex w-max h-auto bg-transparent p-0">
                  <TabsTrigger 
                    value="current" 
                    className="text-sm font-medium px-6 py-3 whitespace-nowrap border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent bg-transparent hover:bg-muted/50 transition-all duration-200"
                  >
                    Current Conditions
                  </TabsTrigger>
                  <TabsTrigger 
                    value="hourly" 
                    className="text-sm font-medium px-6 py-3 whitespace-nowrap border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent bg-transparent hover:bg-muted/50 transition-all duration-200"
                  >
                    Hourly Forecast
                  </TabsTrigger>
                  <TabsTrigger 
                    value="seasonal" 
                    className="text-sm font-medium px-6 py-3 whitespace-nowrap border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent bg-transparent hover:bg-muted/50 transition-all duration-200"
                  >
                    Seasonal Trends
                  </TabsTrigger>
                  <TabsTrigger 
                    value="historical" 
                    className="text-sm font-medium px-6 py-3 whitespace-nowrap border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent bg-transparent hover:bg-muted/50 transition-all duration-200"
                  >
                    Historical Data
                  </TabsTrigger>
                  <TabsTrigger 
                    value="agricultural" 
                    className="text-sm font-medium px-6 py-3 whitespace-nowrap border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent bg-transparent hover:bg-muted/50 transition-all duration-200"
                  >
                    Agricultural Index
                  </TabsTrigger>
                  <TabsTrigger 
                    value="drought" 
                    className="text-sm font-medium px-6 py-3 whitespace-nowrap border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent bg-transparent hover:bg-muted/50 transition-all duration-200"
                  >
                    Drought Analysis
                  </TabsTrigger>
                  <TabsTrigger 
                    value="analytics" 
                    className="text-sm font-medium px-6 py-3 whitespace-nowrap border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent bg-transparent hover:bg-muted/50 transition-all duration-200"
                  >
                    Advanced Analytics
                  </TabsTrigger>
                </TabsList>
              </div>
            </div>
          </div>
          {/* Desktop: Grid layout */}
          <div className="hidden sm:block">
            <TabsList className="grid w-full grid-cols-7 h-auto">
              <TabsTrigger value="current" className="text-sm px-4 py-2">{t("current")}</TabsTrigger>
              <TabsTrigger value="hourly" className="text-sm px-4 py-2">{t("hourly")}</TabsTrigger>
              <TabsTrigger value="seasonal" className="text-sm px-4 py-2">{t("seasonal")}</TabsTrigger>
              <TabsTrigger value="historical" className="text-sm px-4 py-2">{t("historical")}</TabsTrigger>
              <TabsTrigger value="agricultural" className="text-sm px-4 py-2">{t("agricultural")}</TabsTrigger>
              <TabsTrigger value="drought" className="text-sm px-4 py-2">{t("drought")}</TabsTrigger>
              <TabsTrigger value="analytics" className="text-sm px-4 py-2">{t("analytics")}</TabsTrigger>
            </TabsList>
          </div>
        </div>

        <TabsContent value="current" className="space-y-4 sm:space-y-6">
          {weatherLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : weatherError ? (
            <Card className="border-destructive">
              <CardContent className="p-6">
                <div className="text-center text-destructive">
                  <Cloud className="w-12 h-12 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Unable to load weather data</h3>
                  <p className="text-sm">Please check your internet connection and try again.</p>
                </div>
              </CardContent>
            </Card>
          ) : weather ? (
            <>
              {/* Enhanced Current Weather Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                <Card className="col-span-1">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{t("temperature")}</CardTitle>
                    <Thermometer className="w-4 h-4 text-chart-1" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl sm:text-3xl font-bold">{Math.round(weather.current.temp)}°C</div>
                    <p className="text-xs text-muted-foreground">
                      {t("feels_like")} {Math.round(weather.current.feels_like)}°C
                    </p>
                    <div className="text-xs text-muted-foreground mt-1">
                      <TranslatedText 
                        text={weather.current.weather[0]?.description || ""} 
                        fallback={weather.current.weather[0]?.description}
                      />
                    </div>
                    {weather.current.dewPoint && (
                      <div className="text-xs text-blue-600 mt-1">
                        Dew Point: {weather.current.dewPoint.toFixed(1)}°C
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{t("humidity_and_pressure")}</CardTitle>
                    <Droplets className="w-4 h-4 text-chart-2" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{weather.current.humidity}%</div>
                    <p className="text-xs text-muted-foreground">
                      {t("pressure")}: {weather.current.pressure} hPa
                    </p>
                    {weather.current.cloudCover !== undefined && (
                      <div className="text-xs text-gray-600 mt-1">
                        Cloud Cover: {weather.current.cloudCover}%
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Wind & Visibility</CardTitle>
                    <Wind className="w-4 h-4 text-chart-3" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{Math.round(weather.current.wind_speed)} km/h</div>
                    <p className="text-xs text-muted-foreground">
                      Visibility: {Math.round(weather.current.visibility / 1000)} km
                    </p>
                    <div className="text-xs text-muted-foreground mt-1">
                      {t("uv_index")}: {weather.current.uvi}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{t("air_quality")}</CardTitle>
                    <Activity className="w-4 h-4 text-chart-4" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {weather.current.airQualityIndex ? 
                        ['Good', 'Fair', 'Moderate', 'Poor', 'Very Poor'][weather.current.airQualityIndex - 1] || 'Unknown' :
                        'Good'
                      }
                    </div>
                    <p className="text-xs text-muted-foreground">
                      AQI: {weather.current.airQualityIndex || 1}
                    </p>
                    {weather.current.sunrise && weather.current.sunset && (
                      <div className="text-xs text-muted-foreground mt-1">
                        🌅 {new Date(weather.current.sunrise).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        🌇 {new Date(weather.current.sunset).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Agricultural Weather Indices */}
              {weather.agriculturalIndices && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                       {t("agricultural_weather_indices")}
                      <Badge variant="outline">{t("real_time")}</Badge>
                    </CardTitle>
                    <CardDescription>
                      {t("agricultural_specific_weather_metrics")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Thermometer className="w-4 h-4 text-orange-600" />
                          <span className="text-sm font-medium">{t("heat_index")}</span>
                        </div>
                        <div className="text-xl font-bold text-orange-700">
                          {weather.agriculturalIndices.heatIndex.toFixed(1)}°C
                        </div>
                        <div className="text-xs text-orange-600">
                          {t("comfort")}: {weather.agriculturalIndices.comfortIndex}
                        </div>
                      </div>

                      <div className={`p-4 rounded-lg border ${
                        weather.agriculturalIndices.irrigationNeed === 'critical' ? 'bg-red-50 border-red-200' :
                        weather.agriculturalIndices.irrigationNeed === 'high' ? 'bg-orange-50 border-orange-200' :
                        weather.agriculturalIndices.irrigationNeed === 'medium' ? 'bg-yellow-50 border-yellow-200' :
                        'bg-green-50 border-green-200'
                      }`}>
                        <div className="flex items-center gap-2 mb-2">
                          <Droplets className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-medium">{t("irrigation_need")}</span>
                        </div>
                        <div className={`text-xl font-bold capitalize ${
                          weather.agriculturalIndices.irrigationNeed === 'critical' ? 'text-red-700' :
                          weather.agriculturalIndices.irrigationNeed === 'high' ? 'text-orange-700' :
                          weather.agriculturalIndices.irrigationNeed === 'medium' ? 'text-yellow-700' :
                          'text-green-700'
                        }`}>
                          {weather.agriculturalIndices.irrigationNeed}
                        </div>
                      </div>

                      <div className={`p-4 rounded-lg border ${
                        weather.agriculturalIndices.frostRisk === 'high' ? 'bg-blue-50 border-blue-200' :
                        weather.agriculturalIndices.frostRisk === 'medium' ? 'bg-yellow-50 border-yellow-200' :
                        'bg-green-50 border-green-200'
                      }`}>
                        <div className="flex items-center gap-2 mb-2">
                          <CloudRain className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-medium">{t("frost_risk")}</span>
                        </div>
                        <div className={`text-xl font-bold capitalize ${
                          weather.agriculturalIndices.frostRisk === 'high' ? 'text-blue-700' :
                          weather.agriculturalIndices.frostRisk === 'medium' ? 'text-yellow-700' :
                          'text-green-700'
                        }`}>
                          {weather.agriculturalIndices.frostRisk}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          UV Risk: {weather.agriculturalIndices.uvRisk}
                        </div>
                      </div>

                      <div className={`p-4 rounded-lg border ${
                        weather.agriculturalIndices.pestPressure === 'high' ? 'bg-red-50 border-red-200' :
                        weather.agriculturalIndices.pestPressure === 'medium' ? 'bg-yellow-50 border-yellow-200' :
                        'bg-green-50 border-green-200'
                      }`}>
                        <div className="flex items-center gap-2 mb-2">
                          <Activity className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-medium">{t("pest_pressure")}</span>
                        </div>
                        <div className={`text-xl font-bold capitalize ${
                          weather.agriculturalIndices.pestPressure === 'high' ? 'text-red-700' :
                          weather.agriculturalIndices.pestPressure === 'medium' ? 'text-yellow-700' :
                          'text-green-700'
                        }`}>
                          {weather.agriculturalIndices.pestPressure}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              </>
            ) : (
              <Card>
                <CardContent className="p-6 text-center">
                  <Cloud className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No weather data available</h3>
                  <p className="text-sm text-muted-foreground">Please check your location settings.</p>
                </CardContent>
              </Card>
            )}
        </TabsContent>

        <TabsContent value="hourly" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Next 12 Hours</CardTitle>
              <CardDescription>{t("temperature_trends_for_today")}</CardDescription>
            </CardHeader>
            <CardContent>
              {weatherLoading ? (
                <Skeleton className="h-64" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={hourlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "6px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="temp"
                      stroke="hsl(var(--chart-2))"
                      strokeWidth={2}
                      dot={{ fill: "hsl(var(--chart-2))" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seasonal" className="space-y-6">
          {seasonalLoading || analysisLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-48" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
              </div>
            </div>
          ) : (seasonalData?.success && seasonalData?.data?.length > 0) || comprehensiveAnalysis?.seasonalForecast ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                   {t("seasonal_forecast")}
                    <Badge variant="outline">{seasonalData?.model || comprehensiveAnalysis?.seasonalForecast?.model || 'ECMWF_SEAS5'}</Badge>
                  </CardTitle>
                  <CardDescription>
                    {t("six_month_seasonal_outlook")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">{t("forecast_confidence")}</h4>
                      <Badge variant="secondary">{seasonalData?.data?.[0]?.confidence || comprehensiveAnalysis?.seasonalForecast?.confidence || 75}%</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {t("based_on_ensemble_model")}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(seasonalData?.data || comprehensiveAnalysis?.seasonalForecast?.monthlyOutlook || []).slice(0, 6).map((forecast: any, index: number) => {
                      const date = new Date();
                      date.setMonth(date.getMonth() + index);
                      const monthName = date.toLocaleDateString('en-US', { month: 'long' });
                      
                      return (
                        <Card key={index} className="hover-elevate">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-lg">{monthName}</CardTitle>
                              <Badge variant="outline">{forecast.confidence || 75}%</Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-sm text-muted-foreground">Temperature</span>
                                <span className="font-medium">{((forecast.rawData?.temperature || 20) + (forecast.temperatureAnomaly || 0)).toFixed(1)}°C</span>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {t("based_on_ecmwf_seas5")}
                              </div>
                              <div className={`text-xs font-medium mt-1 ${
                                (forecast.temperatureAnomaly || 0) > 1 ? 'text-red-600' :
                                (forecast.temperatureAnomaly || 0) < -1 ? 'text-blue-600' :
                                'text-gray-600'
                              }`}>
                                Anomaly: {(forecast.temperatureAnomaly || 0) > 0 ? '+' : ''}{(forecast.temperatureAnomaly || 0).toFixed(1)}°C
                              </div>
                            </div>

                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-sm text-muted-foreground">Precipitation</span>
                                <span className="font-medium">{((forecast.rawData?.precipitation || 50) + (forecast.precipitationAnomaly || 0)).toFixed(0)}mm</span>
                              </div>
                              <div className={`text-xs font-medium ${
                                (forecast.precipitationAnomaly || 0) > 20 ? 'text-blue-600' :
                                (forecast.precipitationAnomaly || 0) < -20 ? 'text-red-600' :
                                'text-gray-600'
                              }`}>
                                {(forecast.precipitationAnomaly || 0) > 0 ? '+' : ''}{(forecast.precipitationAnomaly || 0).toFixed(0)}% from normal
                              </div>
                            </div>

                            <div className="pt-2 border-t">
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <span className="text-muted-foreground">Soil Moisture:</span>
                                  <div className="font-medium">{((forecast.soilMoisture0_7cm || 0.3) * 100).toFixed(0)}%</div>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">ET0:</span>
                                  <div className="font-medium">{(forecast.evapotranspiration || 3.5).toFixed(1)}mm/day</div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>

                  {/* Seasonal Trends Chart */}
                  <Card className="mt-6">
                    <CardHeader>
                      <CardTitle className="text-lg">Seasonal Temperature and Precipitation Trends</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart
                            data={(seasonalData?.data || comprehensiveAnalysis?.seasonalForecast?.monthlyOutlook || []).slice(0, 6).map((forecast: any, index: number) => ({
                              month: forecast.validDate ? new Date(forecast.validDate).toLocaleDateString('en-US', { month: 'short' }) : 
                                     new Date(2024, forecast.month - 1).toLocaleDateString('en-US', { month: 'short' }),
                              temperature: forecast.rawData?.temperature ? 
                                          (forecast.rawData.temperature + (forecast.temperatureAnomaly || 0)) :
                                          (forecast.temperature?.expected?.avg || 20),
                              precipitation: forecast.rawData?.precipitation ? 
                                           (forecast.rawData.precipitation + (forecast.precipitationAnomaly || 0)) :
                                           (forecast.precipitation?.expected || 50),
                              tempAnomaly: forecast.temperatureAnomaly || forecast.temperature?.anomaly || 0,
                              precipAnomaly: forecast.precipitationAnomaly || forecast.precipitation?.anomaly || 0
                            }))}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis yAxisId="temp" orientation="left" />
                            <YAxis yAxisId="precip" orientation="right" />
                            <Tooltip />
                            <Legend />
                            <Line yAxisId="temp" type="monotone" dataKey="temperature" stroke="#ef4444" strokeWidth={2} name="Temperature (°C)" />
                            <Bar yAxisId="precip" dataKey="precipitation" fill="#3b82f6" name="Precipitation (mm)" opacity={0.6} />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                {/* <Cloud className="w-12 h-12 mx-auto mb-4 text-muted-foreground" /> */}
                <h3 className="text-lg font-semibold mb-2">Seasonal Forecast Unavailable</h3>
                <p className="text-sm text-muted-foreground">Please select a land area to view seasonal weather forecasts.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="historical" className="space-y-6">
          {historicalLoading || analysisLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-48" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
              </div>
            </div>
          ) : comprehensiveAnalysis?.historicalAnalysis || (historicalData?.success && historicalData?.data?.length > 0) ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Daily Weather Data
                    
                  </CardTitle>
                  <CardDescription>
                    Daily historical weather data from NASA POWER satellite observations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {historicalData?.success && historicalData?.data?.length > 0 ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                          Showing {historicalData.data.length} days of data
                        </div>
                        <Badge variant="outline">
                          {historicalData.dataSource || 'NASA POWER'}
                        </Badge>
                      </div>
                      
                      <div className="max-h-96 overflow-y-auto border rounded-lg">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/50 sticky top-0">
                            <tr>
                              <th className="text-left p-3 font-medium">Date</th>
                              <th className="text-center p-3 font-medium">Temperature (°C)</th>
                              <th className="text-center p-3 font-medium">Precipitation (mm)</th>
                              <th className="text-center p-3 font-medium">Solar Radiation (MJ/m²)</th>
                              <th className="text-center p-3 font-medium">Soil Moisture</th>
                            </tr>
                          </thead>
                          <tbody>
                            {historicalData.data
                              .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
                              .slice(0, 30) // Show last 30 days
                              .map((record: any, index: number) => (
                                <tr key={index} className="border-t hover:bg-muted/30">
                                  <td className="p-3">
                                    {new Date(record.date).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric'
                                    })}
                                  </td>
                                  <td className="p-3 text-center">
                                    {record.temperature2m !== null && record.temperature2m !== undefined
                                      ? record.temperature2m.toFixed(1)
                                      : '-'
                                    }
                                  </td>
                                  <td className="p-3 text-center">
                                    {record.precipitation !== null && record.precipitation !== undefined
                                      ? record.precipitation.toFixed(1)
                                      : '-'
                                    }
                                  </td>
                                  <td className="p-3 text-center">
                                    {record.solarRadiation !== null && record.solarRadiation !== undefined
                                      ? record.solarRadiation.toFixed(1)
                                      : '-'
                                    }
                                  </td>
                                  <td className="p-3 text-center">
                                    {record.soilMoisture !== null && record.soilMoisture !== undefined
                                      ? (record.soilMoisture * 100).toFixed(1) + '%'
                                      : '-'
                                    }
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                      
                      {historicalData.data.length > 30 && (
                        <div className="text-center text-sm text-muted-foreground">
                          Showing last 30 days. Total {historicalData.data.length} days available.
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <BarChart3 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">Daily data not available</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Climate Normals Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Climate Normals
                    
                  </CardTitle>
                  <CardDescription>
                    Long-term climate averages and trends from satellite data
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                      <div className="flex items-center gap-2 mb-3">
                        <Thermometer className="w-5 h-5 text-red-600" />
                        <h4 className="font-medium">Temperature</h4>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Average:</span>
                          <span className="font-bold">
                            {comprehensiveAnalysis?.historicalAnalysis ? 
                              comprehensiveAnalysis.historicalAnalysis.climaticNormals.temperature.annual.avg.toFixed(1) :
                              historicalData?.data && historicalData.data.length > 0 ? 
                                (historicalData.data.reduce((sum: number, d: any) => sum + (d.temperature2m || 0), 0) / historicalData.data.filter((d: any) => d.temperature2m !== null).length).toFixed(1) :
                                '0.0'
                            }°C
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Range:</span>
                          <span className="text-sm">
                            {comprehensiveAnalysis?.historicalAnalysis ? 
                              `${comprehensiveAnalysis.historicalAnalysis.climaticNormals.temperature.annual.min.toFixed(1)}°C - ${comprehensiveAnalysis.historicalAnalysis.climaticNormals.temperature.annual.max.toFixed(1)}°C` :
                              historicalData?.data && historicalData.data.length > 0 ?
                                `${Math.min(...historicalData.data.map((d: any) => d.temperature2m).filter((t: any) => t !== null)).toFixed(1)}°C - ${Math.max(...historicalData.data.map((d: any) => d.temperature2m).filter((t: any) => t !== null)).toFixed(1)}°C` :
                                '0.0°C - 0.0°C'
                            }
                          </span>
                        </div>
                        <div className="pt-2 border-t border-red-200">
                          <span className="text-xs text-muted-foreground">Trend: </span>
                          <span className={`text-xs font-medium text-gray-600`}>
                            {comprehensiveAnalysis?.historicalAnalysis ? 
                              `${comprehensiveAnalysis.historicalAnalysis.trends.temperatureTrend > 0 ? '+' : ''}${comprehensiveAnalysis.historicalAnalysis.trends.temperatureTrend.toFixed(2)}°C/decade` :
                              'Analysis in progress...'
                            }
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-2 mb-3">
                        <CloudRain className="w-5 h-5 text-blue-600" />
                        <h4 className="font-medium">Precipitation</h4>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Annual Total:</span>
                          <span className="font-bold">
                            {comprehensiveAnalysis?.historicalAnalysis?.climaticNormals?.precipitation?.annual?.total ? 
                              comprehensiveAnalysis.historicalAnalysis.climaticNormals.precipitation.annual.total.toFixed(0) :
                              historicalData?.data && historicalData.data.length > 0 ? 
                                historicalData.data.reduce((sum: number, d: any) => sum + (d.precipitation || 0), 0).toFixed(0) :
                                '0'
                            }mm
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Monthly Avg:</span>
                          <span className="text-sm">
                            {comprehensiveAnalysis?.historicalAnalysis?.climaticNormals?.precipitation?.annual?.avg ? 
                              comprehensiveAnalysis.historicalAnalysis.climaticNormals.precipitation.annual.avg.toFixed(0) :
                              historicalData?.data && historicalData.data.length > 0 ? 
                                (historicalData.data.reduce((sum: number, d: any) => sum + (d.precipitation || 0), 0) / historicalData.data.filter((d: any) => d.precipitation !== null).length).toFixed(0) :
                                '0'
                            }mm
                          </span>
                        </div>
                        <div className="pt-2 border-t border-blue-200">
                          <span className="text-xs text-muted-foreground">Trend: </span>
                          <span className={`text-xs font-medium ${
                            (comprehensiveAnalysis?.historicalAnalysis?.trends?.precipitationTrend || 0) > 5 ? 'text-blue-600' :
                            (comprehensiveAnalysis?.historicalAnalysis?.trends?.precipitationTrend || 0) < -5 ? 'text-red-600' :
                            'text-gray-600'
                          }`}>
                            {(comprehensiveAnalysis?.historicalAnalysis?.trends?.precipitationTrend || 0) > 0 ? '+' : ''}
                            {(comprehensiveAnalysis?.historicalAnalysis?.trends?.precipitationTrend || 0).toFixed(1)}mm/decade
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <div className="flex items-center gap-2 mb-3">
                        <Zap className="w-5 h-5 text-yellow-600" />
                        <h4 className="font-medium">Solar Radiation</h4>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Average:</span>
                          <span className="font-bold">
                            {comprehensiveAnalysis?.historicalAnalysis?.climaticNormals?.solarRadiation?.annual?.avg ? 
                              comprehensiveAnalysis.historicalAnalysis.climaticNormals.solarRadiation.annual.avg.toFixed(1) :
                              historicalData?.data && historicalData.data.length > 0 ? 
                                (historicalData.data.reduce((sum: number, d: any) => sum + (d.solarRadiation || 0), 0) / historicalData.data.filter((d: any) => d.solarRadiation !== null).length).toFixed(1) :
                                '0.0'
                            } MJ/m²/day
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Peak:</span>
                          <span className="text-sm">
                            {comprehensiveAnalysis?.historicalAnalysis?.climaticNormals?.solarRadiation?.annual?.peak ? 
                              comprehensiveAnalysis.historicalAnalysis.climaticNormals.solarRadiation.annual.peak.toFixed(1) :
                              historicalData?.data && historicalData.data.length > 0 ? 
                                Math.max(...historicalData.data.map((d: any) => d.solarRadiation || 0)).toFixed(1) :
                                '0.0'
                            } MJ/m²/day
                          </span>
                        </div>
                        <div className="pt-2 border-t border-yellow-200">
                          <span className="text-xs text-muted-foreground">Trend: </span>
                          <span className={`text-xs font-medium ${
                            (comprehensiveAnalysis?.historicalAnalysis?.trends?.solarRadiationTrend || 0) > 0.1 ? 'text-green-600' :
                            (comprehensiveAnalysis?.historicalAnalysis?.trends?.solarRadiationTrend || 0) < -0.1 ? 'text-orange-600' :
                            'text-gray-600'
                          }`}>
                            {(comprehensiveAnalysis?.historicalAnalysis?.trends?.solarRadiationTrend || 0) > 0 ? '+' : ''}
                            {(comprehensiveAnalysis?.historicalAnalysis?.trends?.solarRadiationTrend || 0).toFixed(2)} MJ/decade
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Extreme Events */}
              {comprehensiveAnalysis?.historicalAnalysis?.extremeEvents && comprehensiveAnalysis.historicalAnalysis.extremeEvents.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      ⚠️ Historical Extreme Weather Events
                      <Badge variant="outline">{comprehensiveAnalysis?.historicalAnalysis?.extremeEvents?.length || 0} events</Badge>
                    </CardTitle>
                    <CardDescription>
                      Notable weather extremes that could impact agricultural planning
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {(comprehensiveAnalysis?.historicalAnalysis?.extremeEvents || []).slice(0, 12).map((event: any, idx: number) => (
                        <div key={idx} className={`p-4 rounded-lg border ${
                          event.severity === 'extreme' ? 'border-red-300 bg-red-50' :
                          event.severity === 'high' ? 'border-orange-300 bg-orange-50' :
                          event.severity === 'medium' ? 'border-yellow-300 bg-yellow-50' :
                          'border-gray-300 bg-gray-50'
                        }`}>
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-medium capitalize text-sm">{event.type}</span>
                            <Badge variant="outline" className="text-xs">{event.year}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{event.impact}</p>
                          <div className="flex justify-between text-xs">
                            <span className={`capitalize font-medium ${
                              event.severity === 'extreme' ? 'text-red-600' :
                              event.severity === 'high' ? 'text-orange-600' :
                              event.severity === 'medium' ? 'text-yellow-600' :
                              'text-gray-600'
                            }`}>{event.severity}</span>
                            <span className="text-muted-foreground">{event.duration} days</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                {/* <BarChart3 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" /> */}
                <h3 className="text-lg font-semibold mb-2">Historical Data Unavailable</h3>
                <p className="text-sm text-muted-foreground">Please select a land area to view historical climate analysis.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="agricultural" className="space-y-6">
          {weather?.daily ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                     Agricultural Weather Metrics
                    <Badge variant="outline">7-Day Outlook</Badge>
                  </CardTitle>
                  <CardDescription>
                    Specialized agricultural weather parameters for crop management
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {weather.daily.slice(0, 7).map((day: any, index: number) => {
                      const date = new Date(day.dt * 1000);
                      return (
                        <div key={index} className="p-4 border rounded-lg hover:bg-gray-50">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <h4 className="font-medium">
                                {index === 0 ? 'Today' : 
                                 index === 1 ? 'Tomorrow' :
                                 date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {day.weather[0]?.description}
                              </p>
                            </div>
                            <div className="text-right">
                              <div className="text-xl font-bold">
                                {Math.round(day.temp.max)}° / {Math.round(day.temp.min)}°
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Rain: {(day.pop * 100).toFixed(0)}%
                              </div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            {day.evapotranspiration && (
                              <div>
                                <span className="text-muted-foreground">ET0:</span>
                                <div className="font-medium">{day.evapotranspiration.toFixed(1)} mm/day</div>
                              </div>
                            )}
                            
                            {day.growingDegreeDays !== undefined && (
                              <div>
                                <span className="text-muted-foreground">GDD:</span>
                                <div className="font-medium">{day.growingDegreeDays.toFixed(1)} °C·day</div>
                              </div>
                            )}
                            
                            {day.dewPoint && (
                              <div>
                                <span className="text-muted-foreground">Dew Point:</span>
                                <div className="font-medium">{day.dewPoint.toFixed(1)}°C</div>
                              </div>
                            )}
                            
                            {day.chillHours !== undefined && (
                              <div>
                                <span className="text-muted-foreground">Chill Hours:</span>
                                <div className="font-medium">{day.chillHours} hrs</div>
                              </div>
                            )}
                            
                            <div>
                              <span className="text-muted-foreground">Humidity:</span>
                              <div className="font-medium">{day.humidity}%</div>
                            </div>
                            
                            {day.wind_speed && (
                              <div>
                                <span className="text-muted-foreground">Wind:</span>
                                <div className="font-medium">{day.wind_speed.toFixed(1)} km/h</div>
                              </div>
                            )}
                            
                            {day.pressure && (
                              <div>
                                <span className="text-muted-foreground">{t("pressure")}:</span>
                                <div className="font-medium">{day.pressure.toFixed(0)} hPa</div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <Activity className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Agricultural Metrics Unavailable</h3>
                <p className="text-sm text-muted-foreground">Weather data is required to display agricultural metrics.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="drought" className="mt-6">
          <DroughtMonitoring isActive={activeTab === 'drought'} />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Temperature Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Temperature Trends</CardTitle>
                <CardDescription>7-day temperature forecast with historical comparison</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={weather?.daily?.slice(0, 7).map((day: any, index: number) => ({
                        day: index === 0 ? 'Today' : 
                             index === 1 ? 'Tomorrow' :
                             new Date(day.dt * 1000).toLocaleDateString('en-US', { weekday: 'short' }),
                        max: day.temp.max,
                        min: day.temp.min,
                        avg: day.temp.day || ((day.temp.max + day.temp.min) / 2)
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Area type="monotone" dataKey="max" stackId="1" stroke="#ef4444" fill="#fecaca" name="Max Temp (°C)" />
                      <Area type="monotone" dataKey="avg" stackId="2" stroke="#f59e0b" fill="#fde68a" name="Avg Temp (°C)" />
                      <Area type="monotone" dataKey="min" stackId="3" stroke="#3b82f6" fill="#bfdbfe" name="Min Temp (°C)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Precipitation Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Precipitation Probability</CardTitle>
                <CardDescription>7-day precipitation forecast</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={weather?.daily?.slice(0, 7).map((day: any, index: number) => ({
                        day: index === 0 ? 'Today' : 
                             index === 1 ? 'Tomorrow' :
                             new Date(day.dt * 1000).toLocaleDateString('en-US', { weekday: 'short' }),
                        precipitation: (day.pop * 100),
                        humidity: day.humidity
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="precipitation" fill="#3b82f6" name="Rain Probability (%)" />
                      <Line type="monotone" dataKey="humidity" stroke="#06b6d4" name="Humidity (%)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Wind and Pressure Analytics */}
          {weather?.daily && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Wind Speed and Atmospheric Pressure</CardTitle>
                <CardDescription>Environmental conditions affecting crop growth</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={weather.daily.slice(0, 7).map((day: any, index: number) => ({
                        day: index === 0 ? 'Today' : 
                             index === 1 ? 'Tomorrow' :
                             new Date(day.dt * 1000).toLocaleDateString('en-US', { weekday: 'short' }),
                        windSpeed: day.wind_speed || 0,
                        pressure: day.pressure || 1013,
                        visibility: weather.current.visibility / 1000 // Convert to km
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis yAxisId="wind" orientation="left" />
                      <YAxis yAxisId="pressure" orientation="right" />
                      <Tooltip />
                      <Legend />
                      <Bar yAxisId="wind" dataKey="windSpeed" fill="#10b981" name="Wind Speed (km/h)" />
                      <Line yAxisId="pressure" type="monotone" dataKey="pressure" stroke="#8b5cf6" strokeWidth={2} name="Pressure (hPa)" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
