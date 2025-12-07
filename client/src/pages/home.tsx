import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLand } from "@/contexts/LandContext";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useTranslation } from "@/lib/translations";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MapComponent } from "@/components/map-component";
import { LocationSetup } from "@/components/location-setup";
import { AdaptiveLogo } from "@/components/adaptive-logo";
import { Cloud, Droplets, Wind, Thermometer, TrendingUp, AlertTriangle, Sprout, Calendar } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github.css';
import type { User, Prediction, CropRecommendation } from "@shared/schema";

interface WeatherResponse {
  current: {
    temp: number;
    feels_like: number;
    humidity: number;
    wind_speed: number;
    weather: Array<{ main: string; description: string; icon: string }>;
  };
  daily: Array<{
    dt: number;
    temp: { min: number; max: number };
    weather: Array<{ main: string; description: string }>;
    pop: number;
  }>;
  locationName?: string;
  landId?: number | null;
}

export default function Home() {
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const { selectedLand, lands } = useLand();
  const [showLocationSetup, setShowLocationSetup] = useState(false);
  const { t } = useTranslation();

  // Redirect to login if unauthorized
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

  // Show location setup if user doesn't have location
  useEffect(() => {
    if (user && !user.latitude && !user.longitude) {
      setShowLocationSetup(true);
    }
  }, [user]);

  const { data: weather, isLoading: weatherLoading } = useQuery<WeatherResponse>({
    queryKey: ["/api/weather/current", selectedLand?.id],
    queryFn: async () => {
      const url = selectedLand 
        ? `/api/weather/current?landId=${selectedLand.id}`
        : '/api/weather/current';
      
      const response = await fetch(url, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch weather data');
      }
      
      return response.json();
    },
    enabled: !!user,
  });

  // Comprehensive weather analysis from NASA POWER, Open-Meteo, and OpenWeather
  const { data: enhancedAnalysis, isLoading: analysisLoading, error: analysisError } = useQuery({
    queryKey: ["comprehensive-analysis", selectedLand?.id],
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
        console.warn('Comprehensive analysis failed, using fallback data');
        // Return fallback data structure
        return {
          dataSources: {
            nasaPower: { confidence: 0, status: 'failed' },
            openMeteo: { confidence: 0, status: 'failed' },
            openWeather: { confidence: 0, status: 'failed' }
          },
          historicalAnalysis: null,
          seasonalForecast: null,
          agriculturalAnalysis: null,
          cropRecommendations: [],
          aiInsights: null
        };
      }
      
      const data = await response.json();
      
      // Ensure all required properties exist with fallbacks
      return {
        dataSources: data.dataSources || {
          nasaPower: { confidence: 0, status: 'failed' },
          openMeteo: { confidence: 0, status: 'failed' },
          openWeather: { confidence: 0, status: 'failed' }
        },
        historicalAnalysis: data.historicalAnalysis || null,
        seasonalForecast: data.seasonalForecast || null,
        agriculturalAnalysis: data.agriculturalAnalysis || null,
        cropRecommendations: data.cropRecommendations || [],
        aiInsights: data.aiInsights || null,
        ...data
      };
    },
    enabled: !!selectedLand && !!user,
    staleTime: 60 * 60 * 1000, // 1 hour cache for comprehensive analysis
    gcTime: 2 * 60 * 60 * 1000, // Keep in cache for 2 hours
    retry: (failureCount, error) => {
      // Only retry on network errors, not on 404/500 etc.
      return failureCount < 2 && !error?.message?.includes('Failed to fetch');
    }
  });  const { data: predictions, isLoading: predictionsLoading } = useQuery<Prediction[]>({
    queryKey: ["/api/predictions", selectedLand?.id],
    queryFn: async () => {
      const url = selectedLand 
        ? `/api/lands/${selectedLand.id}/predictions`
        : '/api/predictions';
      
      const response = await fetch(url, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch predictions');
      }
      
      return response.json();
    },
    enabled: !!user,
  });

  const { data: crops, isLoading: cropsLoading } = useQuery<CropRecommendation[]>({
    queryKey: ["/api/crops/recommendations", selectedLand?.id],
    queryFn: async () => {
      const url = selectedLand 
        ? `/api/lands/${selectedLand.id}/crops`
        : '/api/crops/recommendations';
      
      const response = await fetch(url, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch crop recommendations');
      }
      
      return response.json();
    },
    enabled: !!user,
  });

  if (authLoading || !user) {
    return (
      <div className="p-4 md:p-8 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  const weatherCards = [
    {
      title: t("temperature"),
      value: weather ? `${Math.round(weather.current.temp)}°C` : "--",
      subtitle: weather ? `${t("feels_like")} ${Math.round(weather.current.feels_like)}°C` : "",
      icon: Thermometer,
      color: "text-chart-2",
    },
    {
      title: t("humidity"),
      value: weather ? `${weather.current.humidity}%` : "--",
      subtitle: t("relative_humidity"),
      icon: Droplets,
      color: "text-chart-3",
    },
    {
      title: t("wind_speed"),
      value: weather ? `${Math.round(weather.current.wind_speed)} km/h` : "--",
      subtitle: t("current_wind"),
      icon: Wind,
      color: "text-chart-4",
    },
    {
      title: t("conditions"),
      value: weather?.current.weather[0]?.main || "--",
      subtitle: weather?.current.weather[0]?.description || "",
      icon: Cloud,
      color: "text-chart-1",
    },
  ];

  return (
    <>
      <LocationSetup
        open={showLocationSetup}
        onComplete={() => setShowLocationSetup(false)}
      />
      <div className="p-4 md:p-8 space-y-6">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-background to-accent/10 p-8 border border-primary/20 shadow-sm">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-2 h-8 bg-primary rounded-full"></div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                {t("welcome_back")}, {user.firstName || user.email}
              </h1>
            </div>
            <p className="text-muted-foreground">
              {selectedLand ? (
                <>
                  {t("agri_overview")} <strong>{selectedLand.name}</strong>
                  {selectedLand.address && (
                    <span className="block text-sm text-muted-foreground/80 mt-1">
                       {selectedLand.address.split(',').slice(0, 2).join(', ')}
                    </span>
                  )}
                </>
              ) : lands.length === 0 ? (
                "Add your first land area to get started with personalized insights"
              ) : (
                "Here's your agricultural overview for today"
              )}
            </p>
          </div>
          {/* Logo in top right */}
          <div className="absolute top-4 right-4 opacity-15">
            <AdaptiveLogo size="lg" />
          </div>
          {/* Subtle background pattern */}
          <div className="absolute bottom-0 right-0 w-24 h-24 opacity-5">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <pattern id="dots" width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="10" cy="10" r="1.5" fill="currentColor"/>
              </pattern>
              <rect width="100" height="100" fill="url(#dots)" />
            </svg>
          </div>
        </div>

      {/* Weather Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {weatherCards.map((card, index) => (
          <Card key={index} className="hover-elevate" data-testid={`card-weather-${card.title.toLowerCase().replace(/\s+/g, '-')}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </CardHeader>
            <CardContent>
              {weatherLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="text-2xl font-bold" data-testid={`text-${card.title.toLowerCase().replace(/\s+/g, '-')}-value`}>
                    {card.value}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{card.subtitle}</p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

        
        

        {selectedLand && enhancedAnalysis && (
          <div className="space-y-6">
           

          {/* Seasonal Forecast (6 months) from ECMWF SEAS5 */}
          {enhancedAnalysis?.seasonalForecast?.monthlyOutlook && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  🌍 Seasonal Weather Forecast
                  <Badge variant="outline">ECMWF SEAS5 Model</Badge>
                </CardTitle>
                <CardDescription>
                  6-month seasonal outlook using world's best long-range weather model
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium">Seasonal Summary</span>
                      <Badge variant="secondary">{enhancedAnalysis?.seasonalForecast?.confidence || 80}% Confidence</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {enhancedAnalysis?.seasonalForecast?.seasonalSummary?.dominantPattern || 'Normal seasonal patterns expected'}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {enhancedAnalysis?.seasonalForecast?.seasonalSummary?.keyFeatures?.map((feature: string, idx: number) => (
                        <Badge key={idx} variant="outline" className="text-xs">{feature}</Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {enhancedAnalysis?.seasonalForecast?.monthlyOutlook?.slice(0, 6)?.map((month: any, index: number) => {
                      const date = new Date();
                      date.setMonth(date.getMonth() + index);
                      const monthName = date.toLocaleDateString('en-US', { month: 'long' });
                      
                      return (
                        <div key={index} className="p-4 rounded-lg border hover-elevate">
                          <div className="flex items-center justify-between mb-3">
                            <span className="font-medium">{monthName}</span>
                            <Badge variant="secondary">{month.confidence}%</Badge>
                          </div>
                          
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground">Temperature:</span>
                              <div className="text-right">
                                <span className="font-medium">{month.temperature.expected.avg.toFixed(1)}°C</span>
                                <div className="text-xs text-muted-foreground">
                                  {month.temperature.anomaly > 0 ? '+' : ''}{month.temperature.anomaly.toFixed(1)}°C from normal
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground">Precipitation:</span>
                              <div className="text-right">
                                <span className="font-medium">{month.precipitation.expected.toFixed(0)}mm</span>
                                <div className="text-xs text-muted-foreground">
                                  {month.precipitation.anomaly > 0 ? '+' : ''}{month.precipitation.anomaly.toFixed(0)}% from normal
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground">Soil Moisture:</span>
                              <div className="text-right">
                                <span className="font-medium">{(month.soilMoisture.rootZone * 100).toFixed(0)}%</span>
                                <div className="text-xs text-muted-foreground">Root zone</div>
                              </div>
                            </div>
                            
                            <div className="pt-2 border-t">
                              <div className="flex justify-between text-xs">
                                <span>ET0: {month.evapotranspiration.toFixed(1)}mm/day</span>
                                <span className={`px-1 rounded ${
                                  month.temperature.anomaly > 1 ? 'bg-red-100 text-red-700' :
                                  month.temperature.anomaly < -1 ? 'bg-blue-100 text-blue-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {month.temperature.anomaly > 1 ? 'Warmer' : 
                                   month.temperature.anomaly < -1 ? 'Cooler' : 'Normal'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <h4 className="font-medium mb-2">Agricultural Implications</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {enhancedAnalysis?.seasonalForecast?.seasonalSummary?.agriculturalImplications?.map((implication: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-green-600 mt-1">•</span>
                          {implication}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Historical Climate Analysis (30-year NASA POWER data) */}
          {enhancedAnalysis?.historicalAnalysis?.climaticNormals && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  📈 Historical Climate Analysis
                  <Badge variant="outline">30-Year NASA POWER Data</Badge>
                </CardTitle>
                <CardDescription>
                  Long-term climate trends and patterns from satellite data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium flex items-center gap-2">
                      🌡️ Temperature Normals
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Annual Average:</span>
                        <span className="font-medium">{enhancedAnalysis?.historicalAnalysis?.climaticNormals?.temperature?.annual?.avg?.toFixed(1) || 'N/A'}°C</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Annual Range:</span>
                        <span className="font-medium">
                          {enhancedAnalysis?.historicalAnalysis?.climaticNormals?.temperature?.annual?.min?.toFixed(1) || 'N/A'}°C to {enhancedAnalysis?.historicalAnalysis?.climaticNormals?.temperature?.annual?.max?.toFixed(1) || 'N/A'}°C
                        </span>
                      </div>
                      <div className="pt-2 border-t">
                        <span className="text-xs text-muted-foreground">Trend: </span>
                        <span className={`text-xs font-medium ${
                          (enhancedAnalysis?.historicalAnalysis?.trends?.temperatureTrend || 0) > 0.1 ? 'text-red-600' :
                          (enhancedAnalysis?.historicalAnalysis?.trends?.temperatureTrend || 0) < -0.1 ? 'text-blue-600' :
                          'text-gray-600'
                        }`}>
                          {(enhancedAnalysis?.historicalAnalysis?.trends?.temperatureTrend || 0) > 0 ? '+' : ''}{enhancedAnalysis?.historicalAnalysis?.trends?.temperatureTrend?.toFixed(2) || '0.00'}°C/decade
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="font-medium flex items-center gap-2">
                      🌧️ Precipitation Patterns
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Annual Total:</span>
                        <span className="font-medium">{enhancedAnalysis?.historicalAnalysis?.climaticNormals?.precipitation?.annual?.total?.toFixed(0) || 'N/A'}mm</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Monthly Average:</span>
                        <span className="font-medium">{enhancedAnalysis?.historicalAnalysis?.climaticNormals?.precipitation?.annual?.avg?.toFixed(0) || 'N/A'}mm</span>
                      </div>
                      <div className="pt-2 border-t">
                        <span className="text-xs text-muted-foreground">Trend: </span>
                        <span className={`text-xs font-medium ${
                          (enhancedAnalysis?.historicalAnalysis?.trends?.precipitationTrend || 0) > 5 ? 'text-blue-600' :
                          (enhancedAnalysis?.historicalAnalysis?.trends?.precipitationTrend || 0) < -5 ? 'text-red-600' :
                          'text-gray-600'
                        }`}>
                          {(enhancedAnalysis?.historicalAnalysis?.trends?.precipitationTrend || 0) > 0 ? '+' : ''}{enhancedAnalysis?.historicalAnalysis?.trends?.precipitationTrend?.toFixed(1) || '0.0'}mm/decade
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="font-medium flex items-center gap-2">
                      ☀️ Solar Radiation
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Annual Average:</span>
                        <span className="font-medium">{enhancedAnalysis?.historicalAnalysis?.climaticNormals?.solarRadiation?.annual?.avg?.toFixed(1) || 'N/A'} MJ/m²/day</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Peak Radiation:</span>
                        <span className="font-medium">{enhancedAnalysis?.historicalAnalysis?.climaticNormals?.solarRadiation?.annual?.peak?.toFixed(1) || 'N/A'} MJ/m²/day</span>
                      </div>
                      <div className="pt-2 border-t">
                        <span className="text-xs text-muted-foreground">Trend: </span>
                        <span className={`text-xs font-medium ${
                          (enhancedAnalysis?.historicalAnalysis?.trends?.solarRadiationTrend || 0) > 0.1 ? 'text-green-600' :
                          (enhancedAnalysis?.historicalAnalysis?.trends?.solarRadiationTrend || 0) < -0.1 ? 'text-orange-600' :
                          'text-gray-600'
                        }`}>
                          {(enhancedAnalysis?.historicalAnalysis?.trends?.solarRadiationTrend || 0) > 0 ? '+' : ''}{enhancedAnalysis?.historicalAnalysis?.trends?.solarRadiationTrend?.toFixed(2) || '0.00'} MJ/decade
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Extreme Events */}
                {enhancedAnalysis.historicalAnalysis.extremeEvents && enhancedAnalysis.historicalAnalysis.extremeEvents.length > 0 && (
                  <div className="mt-6 pt-6 border-t">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      ⚠️ Historical Extreme Events
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                      {enhancedAnalysis.historicalAnalysis.extremeEvents.slice(0, 8).map((event: any, idx: number) => (
                        <div key={idx} className={`p-3 rounded-lg border text-sm ${
                          event.severity === 'extreme' ? 'border-red-200 bg-red-50' :
                          event.severity === 'high' ? 'border-orange-200 bg-orange-50' :
                          event.severity === 'medium' ? 'border-yellow-200 bg-yellow-50' :
                          'border-gray-200 bg-gray-50'
                        }`}>
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-medium capitalize">{event.type}</span>
                            <Badge variant="outline" className="text-xs">{event.year}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mb-1">{event.impact}</p>
                          <div className="flex justify-between text-xs">
                            <span className="capitalize">{event.severity}</span>
                            <span>{event.duration} days</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Soil and Location Analysis */}
          {enhancedAnalysis?.agriculturalAnalysis && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                     Soil Analysis
                    <Badge variant="outline">Enhanced Analysis</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Soil Type</label>
                      <p className="text-lg">{enhancedAnalysis?.agriculturalAnalysis?.soilConditions?.type || 'Unknown'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">pH Level</label>
                      <p className="text-lg">{enhancedAnalysis?.agriculturalAnalysis?.soilConditions?.pH?.toFixed(1) || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Fertility</label>
                      <p className="text-lg capitalize">{enhancedAnalysis?.agriculturalAnalysis?.soilConditions?.fertility || 'Unknown'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Drainage</label>
                      <p className="text-lg capitalize">{enhancedAnalysis?.agriculturalAnalysis?.soilConditions?.drainage || 'Unknown'}</p>
                    </div>
                    <div className="col-span-2">
                      <label className="text-sm font-medium">Organic Matter</label>
                      <p className="text-lg">{enhancedAnalysis?.agriculturalAnalysis?.soilConditions?.organicMatter?.toFixed(1) || 'N/A'}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    🎯 Agricultural Suitability
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Overall Suitability Score</label>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-3xl font-bold text-green-600">
                        {enhancedAnalysis?.agriculturalAnalysis?.overallSuitability || 75}
                      </p>
                      <span className="text-sm text-muted-foreground">/100</span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Water Management</label>
                    <div className="mt-2 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Irrigation Need:</span>
                        <span className={`capitalize font-medium ${
                          enhancedAnalysis?.agriculturalAnalysis?.waterManagement?.irrigationNeed === 'high' ? 'text-red-600' :
                          enhancedAnalysis?.agriculturalAnalysis?.waterManagement?.irrigationNeed === 'medium' ? 'text-orange-600' :
                          'text-green-600'
                        }`}>
                          {enhancedAnalysis?.agriculturalAnalysis?.waterManagement?.irrigationNeed || 'Medium'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Risk Assessment</label>
                    <div className="mt-2">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Overall Risk:</span>
                        <span className={`capitalize font-medium ${
                          enhancedAnalysis?.agriculturalAnalysis?.riskAssessment?.overall === 'high' ? 'text-red-600' :
                          enhancedAnalysis?.agriculturalAnalysis?.riskAssessment?.overall === 'medium' ? 'text-orange-600' :
                          'text-green-600'
                        }`}>
                          {enhancedAnalysis?.agriculturalAnalysis?.riskAssessment?.overall || 'Medium'}
                        </span>
                      </div>
                      {enhancedAnalysis?.agriculturalAnalysis?.riskAssessment?.weatherRisks?.slice(0, 3)?.map((risk: any, idx: number) => (
                        <div key={idx} className="text-xs p-2 bg-gray-50 rounded mb-1">
                          {risk.type}: {risk.probability}% probability
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* AI-Enhanced Crop Recommendations with Comprehensive Analysis */}
          {enhancedAnalysis?.cropRecommendations && enhancedAnalysis.cropRecommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  AI-Enhanced Crop Recommendations
                  <Badge variant="outline">{enhancedAnalysis?.cropRecommendations?.length || 0} crops analyzed</Badge>
                </CardTitle>
                <CardDescription>
                  Based on 30-year NASA POWER data, ECMWF SEAS5 seasonal forecast, current conditions, and AI analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {enhancedAnalysis?.cropRecommendations?.slice(0, 4).map((crop: any, index: number) => (
                    <div key={index} className="p-6 rounded-lg border hover-elevate bg-gradient-to-r from-green-50 to-blue-50">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-bold text-xl text-green-800">{crop.cropName}</h4>
                            {index === 0 && <Badge className="bg-green-600">Recommended</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed">{crop.reasoning}</p>
                        </div>
                        <div className="text-right ml-4">
                          <Badge variant="secondary" className="text-lg px-3 py-1">
                            {crop.confidence}% match
                          </Badge>
                          <div className="mt-2 space-y-1 text-xs">
                            <div className="flex items-center gap-1">
                              <span></span>
                              <span>Sustainability: {crop.sustainabilityScore?.score || 7}/10</span>
                            </div>
                            {crop.economicAnalysis?.weatherImpactFactor && (
                              <div className="flex items-center gap-1">
                                <span>🌦️</span>
                                <span>Weather factor: {crop.economicAnalysis.weatherImpactFactor}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                        <div className="bg-white/70 p-3 rounded-lg">
                          <label className="font-medium text-green-700">Expected Yield</label>
                          <p className="font-semibold">{crop.yieldPrediction?.expected || 'Varies'}</p>
                          {crop.yieldPrediction?.optimalConditions && (
                            <p className="text-xs text-green-600 mt-1">✓ Optimal conditions</p>
                          )}
                        </div>
                        
                        <div className="bg-white/70 p-3 rounded-lg">
                          <label className="font-medium text-blue-700">Risk Assessment</label>
                          <p className={`font-semibold ${crop.riskAssessment?.overall === 'Low' ? 'text-green-600' : 
                                       crop.riskAssessment?.overall === 'High' ? 'text-red-600' : 'text-orange-600'}`}>
                            {crop.riskAssessment?.overall || 'Medium'} Risk
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {crop.riskAssessment?.factors?.length || 0} risk factors
                          </p>
                        </div>
                        
                        <div className="bg-white/70 p-3 rounded-lg">
                          <label className="font-medium text-purple-700">Economic Analysis</label>
                          <p className="font-semibold text-green-600">{crop.economicAnalysis?.profitMargin || '20%'} margin</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Revenue: {crop.economicAnalysis?.estimatedRevenue || 'N/A'}
                          </p>
                        </div>
                        
                        <div className="bg-white/70 p-3 rounded-lg">
                          <label className="font-medium text-orange-700">Planting Window</label>
                          <p className="font-semibold">
                            {crop.plantingWindow?.optimal?.start 
                              ? new Date(crop.plantingWindow.optimal.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                              : 'Soon'
                            }
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Growth: {crop.monthlyGuidance?.length || 0} months
                          </p>
                        </div>
                      </div>
                      
                      {/* Sustainability Factors */}
                      {crop.sustainabilityScore?.factors && crop.sustainabilityScore.factors.length > 0 && (
                        <div className="mt-4 p-3 bg-white/50 rounded-lg">
                          <label className="text-xs font-medium text-green-700 mb-2 block">🌿 Sustainability Benefits</label>
                          <div className="flex flex-wrap gap-2">
                            {crop.sustainabilityScore.factors.slice(0, 3).map((factor: string, idx: number) => (
                              <Badge key={idx} variant="outline" className="text-xs text-green-700 bg-green-50">
                                {factor}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Monthly Guidance Preview */}
                      {crop.monthlyGuidance && crop.monthlyGuidance.length > 0 && (
                        <div className="mt-4 p-3 bg-white/50 rounded-lg">
                          <label className="text-xs font-medium text-blue-700 mb-2 block">📅 Next Steps</label>
                          <p className="text-sm">
                            <span className="font-medium">{crop.monthlyGuidance[0]?.activity || 'Land preparation'}:</span>
                            <span className="text-muted-foreground ml-2">
                              {crop.monthlyGuidance[0]?.weatherConsideration || 'Monitor weather conditions'}
                            </span>
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* AI Insights and Recommendations */}
      {selectedLand && enhancedAnalysis?.aiInsights && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              AI-Powered Insights & Recommendations
              <Badge variant="outline">Comprehensive Analysis</Badge>
            </CardTitle>
            <CardDescription>
              Intelligent recommendations based on historical data, seasonal forecasts, and agricultural best practices
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Key Findings */}
              {enhancedAnalysis.aiInsights?.keyFindings && enhancedAnalysis.aiInsights.keyFindings.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    Key Findings
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {enhancedAnalysis.aiInsights?.keyFindings?.map((finding: string, idx: number) => (
                      <div key={idx} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm text-blue-900">{finding}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Actionable Recommendations */}
              {enhancedAnalysis.aiInsights?.recommendations && enhancedAnalysis.aiInsights.recommendations.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    ⚙️ Actionable Recommendations
                  </h4>
                  <div className="space-y-3">
                    {enhancedAnalysis.aiInsights?.recommendations?.map((rec: any, idx: number) => (
                      <div key={idx} className={`p-4 rounded-lg border ${
                        rec.priority === 'urgent' ? 'border-red-200 bg-red-50' :
                        rec.priority === 'high' ? 'border-orange-200 bg-orange-50' :
                        rec.priority === 'medium' ? 'border-yellow-200 bg-yellow-50' :
                        'border-gray-200 bg-gray-50'
                      }`}>
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="capitalize text-xs">
                              {rec.category}
                            </Badge>
                            <Badge 
                              variant={rec.priority === 'urgent' || rec.priority === 'high' ? 'destructive' : 'secondary'}
                              className="text-xs"
                            >
                              {rec.priority} priority
                            </Badge>
                          </div>
                          <span className="text-xs text-muted-foreground">{rec.timeline}</span>
                        </div>
                        <p className="text-sm font-medium mb-1">{rec.description}</p>
                        <p className="text-xs text-muted-foreground">
                          Expected benefit: {rec.expectedBenefit}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Sustainability Score */}
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium flex items-center gap-2">
                     Sustainability Assessment
                  </h4>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600">
                      {enhancedAnalysis.aiInsights.sustainabilityScore?.score || 70}/100
                    </div>
                    <div className="text-xs text-muted-foreground">Sustainability Score</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h5 className="text-sm font-medium text-green-700 mb-2">Positive Factors</h5>
                    <ul className="space-y-1">
                      {enhancedAnalysis.aiInsights?.sustainabilityScore?.factors?.slice(0, 3)?.map((factor: string, idx: number) => (
                        <li key={idx} className="text-xs text-green-600 flex items-start gap-2">
                          <span className="mt-1">✓</span>
                          {factor}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div>
                    <h5 className="text-sm font-medium text-orange-700 mb-2">Improvement Areas</h5>
                    <ul className="space-y-1">
                      {enhancedAnalysis.aiInsights?.sustainabilityScore?.improvements?.slice(0, 3)?.map((improvement: string, idx: number) => (
                        <li key={idx} className="text-xs text-orange-600 flex items-start gap-2">
                          <span className="mt-1">•</span>
                          {improvement}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
              
              {/* Marketing Suggestions */}
              {enhancedAnalysis.aiInsights?.marketingSuggestions && enhancedAnalysis.aiInsights.marketingSuggestions.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    💰 Market Opportunities
                  </h4>
                  <div className="space-y-2">
                    {enhancedAnalysis.aiInsights?.marketingSuggestions?.map((suggestion: string, idx: number) => (
                      <div key={idx} className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                        <p className="text-sm text-purple-900">{suggestion}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Map Section - Show selected land or user location */}
      {((selectedLand?.latitude && selectedLand?.longitude) || (user.latitude && user.longitude)) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {/* <Cloud className="w-5 h-5" /> */}
              {selectedLand ? `${selectedLand.name} Location` : 'Your Farm Location'}
            </CardTitle>
            <CardDescription>
              {selectedLand ? (
                <>
                  {selectedLand.address || `${selectedLand.latitude.toFixed(4)}, ${selectedLand.longitude.toFixed(4)}`}
                  {selectedLand.soilType && (
                    <div className="text-xs text-muted-foreground mt-1">
                       {selectedLand.soilType}
                    </div>
                  )}
                </>
              ) : (
                user.address || `${user.latitude.toFixed(4)}, ${user.longitude.toFixed(4)}`
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MapComponent
              latitude={selectedLand?.latitude || user.latitude}
              longitude={selectedLand?.longitude || user.longitude}
              address={selectedLand?.address || user.address || undefined}
            />
          </CardContent>
        </Card>
      )}

        {/* Comprehensive Analysis Loading State */}
        

        {/* Analysis Error State */}
        {selectedLand && !analysisLoading && (analysisError || (!enhancedAnalysis && !analysisLoading)) && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-700">
                <AlertTriangle className="w-5 h-5" />
                Limited Analysis Available
              </CardTitle>
              <CardDescription className="text-yellow-600">
                {analysisError ? 
                  'Comprehensive analysis temporarily unavailable. Showing basic weather data.' :
                  'Loading comprehensive analysis data. This may take a moment for first-time analysis.'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                <p>• Current weather data is still available above</p>
                <p>• Historical analysis will be populated once data is processed</p>
                <p>• AI crop recommendations are being generated in the background</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* AI Predictions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {/* <AlertTriangle className="w-5 h-5" /> */}
              {t("recent_predictions")}
            </CardTitle>
            <CardDescription>AI-powered weather and farming insights</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {predictionsLoading ? (
              <>
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </>
            ) : predictions && predictions.length > 0 ? (
              predictions.slice(0, 3).map((prediction) => (
                <div
                  key={prediction.id}
                  className="p-4 rounded-md border border-border hover-elevate"
                  data-testid={`prediction-${prediction.id}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-foreground">{prediction.title}</h4>
                    {prediction.severity && (
                      <Badge
                        variant={
                          prediction.severity === "critical" || prediction.severity === "high"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {prediction.severity}
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown
                      remarkPlugins={[remarkMath, remarkGfm]}
                      rehypePlugins={[rehypeKatex, rehypeHighlight]}
                      components={{
                        h1: ({children}) => <h1 className="text-lg font-bold text-foreground mb-2">{children}</h1>,
                        h2: ({children}) => <h2 className="text-md font-semibold text-foreground mb-2 mt-3">{children}</h2>,
                        h3: ({children}) => <h3 className="text-sm font-medium text-foreground mb-1 mt-2">{children}</h3>,
                        p: ({children}) => <p className="mb-2 last:mb-0">{children}</p>,
                        ul: ({children}) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                        ol: ({children}) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                        li: ({children}) => <li className="text-sm">{children}</li>,
                        table: ({children}) => <div className="overflow-x-auto my-2"><table className="min-w-full border-collapse border border-border">{children}</table></div>,
                        th: ({children}) => <th className="border border-border bg-muted px-2 py-1 text-left font-semibold text-xs">{children}</th>,
                        td: ({children}) => <td className="border border-border px-2 py-1 text-sm">{children}</td>,
                        code: ({inline, children}) => inline 
                          ? <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">{children}</code>
                          : <code className="block bg-muted p-2 rounded text-xs font-mono overflow-x-auto">{children}</code>
                      }}
                    >
                      {prediction.description}
                    </ReactMarkdown>
                  </div>
                  {prediction.confidence && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Confidence: {Math.round(prediction.confidence)}%
                    </p>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <TrendingUp className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">{t("no_predictions_available")}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {t("check_back_soon")}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Crop Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {/* <Sprout className="w-5 h-5" /> */}
              {t("crop_recommendations")}
            </CardTitle>
            <CardDescription>Best crops for your location and season</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {cropsLoading ? (
              <>
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </>
            ) : crops && crops.length > 0 ? (
              crops.slice(0, 3).map((crop) => (
                <div
                  key={crop.id}
                  className="p-4 rounded-md border border-border hover-elevate"
                  data-testid={`crop-${crop.id}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-foreground">{crop.cropName}</h4>
                    <Badge variant="secondary">{Math.round(crop.confidence)}% match</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{crop.reasoning}</p>
                  {crop.plantingDate && (
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      Plant by: {new Date(crop.plantingDate).toLocaleDateString()}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Sprout className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">{t("no_crop_recommendations")}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {t("ai_analyze_location")}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
    </>
  );
}
