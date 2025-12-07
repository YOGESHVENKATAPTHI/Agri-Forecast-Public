import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLand } from "@/contexts/LandContext";
import { useTranslation } from "@/lib/translations";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Droplets, 
  AlertTriangle, 
  TrendingDown, 
  Calendar, 
  Activity,
  CheckCircle,
  XCircle,
  Info,
  Zap
} from "lucide-react";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from "recharts";

interface DroughtAnalysis {
  analysisId: string;
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  currentConditions: {
    pdsi: number;
    spi: number;
    soilMoisture: number;
    precipitationDeficit: number;
    temperatureAnomaly: number;
  };
  riskLevel: 'low' | 'moderate' | 'high' | 'severe' | 'extreme';
  confidenceScore: number;
  prediction: {
    timeline: string;
    probability: number;
    peakRisk: string;
    duration: string;
  };
  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
  actionPlan: {
    waterConservation: {
      priority: string;
      strategies: Array<{
        action: string;
        savings: string;
        timeframe: string;
        difficulty: string;
      }>;
    };
    cropManagement: {
      currentSeason: Array<{
        crop: string;
        action: string;
        timing: string;
        expectedOutcome: string;
      }>;
      nextSeason: Array<{
        crop: string;
        soilType: string;
        plantingWindow: string;
        yieldExpectation: string;
        waterRequirement: string;
      }>;
    };
    infrastructurePrep: Array<{
      infrastructure: string;
      priority: string;
      cost: string;
      benefit: string;
    }>;
  };
  dataQuality: {
    nasaPower: { status: string; confidence: number; lastUpdate: string };
    openMeteo: { status: string; confidence: number; forecastRange: string };
    modelReliability: number;
  };
  generatedAt: string;
}

interface DroughtAlert {
  id: string;
  severity: 'info' | 'warning' | 'critical' | 'emergency';
  title: string;
  message: string;
  recommendations: string[];
  createdAt: string;
  isActive: boolean;
  location: {
    latitude: number;
    longitude: number;
  };
}

interface DroughtMonitoringProps {
  isActive?: boolean;
}

export default function DroughtMonitoring({ isActive = false }: DroughtMonitoringProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { selectedLand } = useLand();
  const [, setLocation] = useLocation();
  const [refreshing, setRefreshing] = useState(false);
  const { t } = useTranslation();

  // Drought analysis query
  const { data: droughtAnalysis, isLoading: analysisLoading, error: analysisError, refetch: refetchAnalysis } = useQuery<DroughtAnalysis>({
    queryKey: ["drought-analysis", selectedLand?.id],
    queryFn: async () => {
      if (!selectedLand) throw new Error('No land selected');
      
      const response = await fetch('/api/drought/analyze', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: selectedLand.latitude,
          longitude: selectedLand.longitude,
          landId: selectedLand.id
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch drought analysis');
      }
      
      const data = await response.json();
      return data.analysis;
    },
    enabled: !!selectedLand && !!user && isActive,
    staleTime: 30 * 60 * 1000, // 30 minutes
    refetchInterval: 60 * 60 * 1000, // 1 hour
  });

  // Drought alerts query
  const { data: droughtAlerts, isLoading: alertsLoading } = useQuery<DroughtAlert[]>({
    queryKey: ["drought-alerts", selectedLand?.id],
    queryFn: async () => {
      if (!selectedLand) return [];
      
      const response = await fetch(`/api/drought/alerts?landId=${selectedLand.id}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch drought alerts');
      }
      
      return response.json();
    },
    enabled: !!selectedLand && !!user,
    refetchInterval: 5 * 60 * 1000, // 5 minutes
  });

  const handleRefreshAnalysis = async () => {
    setRefreshing(true);
    try {
      await refetchAnalysis();
      toast({
        title: "Analysis Refreshed",
        description: "Drought analysis has been updated with latest data."
      });
    } catch (error) {
      toast({
        title: "Refresh Failed",
        description: "Unable to refresh drought analysis. Please try again.",
        variant: "destructive"
      });
    } finally {
      setRefreshing(false);
    }
  };

  if (!selectedLand) {
    return (
      <Card className="border-none shadow-lg bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20">
        <CardContent className="p-12 text-center flex flex-col items-center justify-center min-h-[300px]">
          
          <h3 className="text-2xl font-bold text-amber-800 dark:text-amber-200 mb-3">No Land Selected</h3>
          <p className="text-base text-amber-700/80 dark:text-amber-300/80 max-w-md">
            Please select a land area to view drought monitoring and predictions.
          </p>
        </CardContent>
      </Card>
    );
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-green-500';
      case 'moderate': return 'bg-yellow-500';
      case 'high': return 'bg-orange-500';
      case 'severe': return 'bg-red-500';
      case 'extreme': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case 'info': return <Info className="w-4 h-4" />;
      case 'warning': return <AlertTriangle className="w-4 h-4" />;
      case 'critical': return <XCircle className="w-4 h-4" />;
      case 'emergency': return <Zap className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  if (!droughtAnalysis && !analysisLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">{t("drought_monitoring_prediction")}</h2>
            <p className="text-muted-foreground">
              {t("ai_powered_drought_analysis")} <strong>{selectedLand.name}</strong>
            </p>
          </div>
        </div>
        
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertTriangle className="w-12 h-12 text-yellow-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Drought Analysis Found</h3>
            <p className="text-muted-foreground max-w-md mb-6">
              We couldn't find any existing drought analysis for this land. Please generate a new prediction to see the data.
            </p>
            <Button onClick={() => setLocation('/predictions')}>
              Go to Predictions
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t("drought_monitoring_prediction")}</h2>
          <p className="text-muted-foreground">
            {t("ai_powered_drought_analysis")} <strong>{selectedLand.name}</strong>
          </p>
        </div>
        <Button 
          onClick={handleRefreshAnalysis} 
          disabled={refreshing || analysisLoading}
          variant="outline"
        >
          {refreshing ? t("refreshing") : t("refresh_analysis")}
        </Button>
      </div>

      {/* Active Alerts */}
      {droughtAlerts && droughtAlerts.filter(alert => alert.isActive).length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Active Drought Alerts
          </h3>
          {droughtAlerts.filter(alert => alert.isActive).map((alert) => (
            <Alert key={alert.id} className={`border-l-4 ${
              alert.severity === 'emergency' ? 'border-l-purple-500' :
              alert.severity === 'critical' ? 'border-l-red-500' :
              alert.severity === 'warning' ? 'border-l-orange-500' :
              'border-l-blue-500'
            }`}>
              <div className="flex items-start gap-3">
                {getAlertIcon(alert.severity)}
                <div className="flex-1">
                  <AlertTitle className="flex items-center gap-2">
                    {alert.title}
                    <Badge variant="outline" className="capitalize">{alert.severity}</Badge>
                  </AlertTitle>
                  <AlertDescription className="mt-2">
                    {alert.message}
                  </AlertDescription>
                  {alert.recommendations.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-medium">Immediate Actions:</p>
                      <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                        {alert.recommendations.map((rec, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-blue-500">•</span>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    Alert generated: {new Date(alert.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </Alert>
          ))}
        </div>
      )}

      {/* Main Analysis */}
      {analysisLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : analysisError ? (
        <Card className="border-destructive">
          <CardContent className="p-6">
            <div className="text-center text-destructive">
              <TrendingDown className="w-12 h-12 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Analysis Unavailable</h3>
              <p className="text-sm">Unable to load drought analysis. Please try again later.</p>
            </div>
          </CardContent>
        </Card>
      ) : droughtAnalysis ? (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">{t("overview")}</TabsTrigger>
            <TabsTrigger value="predictions">{t("predictions")}</TabsTrigger>
            <TabsTrigger value="action-plan">{t("action_plan")}</TabsTrigger>
            {/* <TabsTrigger value="data-quality">Data Quality</TabsTrigger> */}
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Current Risk Level */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {t("current_drought_risk")}
                  <div className={`w-3 h-3 rounded-full ${getRiskColor(droughtAnalysis.riskLevel)}`} />
                </CardTitle>
                <CardDescription>
                  Analysis generated: {new Date(droughtAnalysis.generatedAt).toLocaleString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className={`text-4xl font-bold capitalize ${
                      droughtAnalysis.riskLevel === 'low' ? 'text-green-600' :
                      droughtAnalysis.riskLevel === 'moderate' ? 'text-yellow-600' :
                      droughtAnalysis.riskLevel === 'high' ? 'text-orange-600' :
                      droughtAnalysis.riskLevel === 'severe' ? 'text-red-600' :
                      'text-purple-600'
                    }`}>
                      {droughtAnalysis.riskLevel}
                    </div>
                    <p className="text-sm text-muted-foreground">Risk Level</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-3xl font-bold">{droughtAnalysis.confidenceScore}%</div>
                    <p className="text-sm text-muted-foreground">Confidence</p>
                    <Progress value={droughtAnalysis.confidenceScore} className="mt-2" />
                  </div>
                  
                  <div className="text-center">
                    <div className="text-3xl font-bold">{droughtAnalysis.currentConditions?.pdsi?.toFixed(1) || "N/A"}</div>
                    <p className="text-sm text-muted-foreground">PDSI Index</p>
                    <p className="text-xs text-muted-foreground">Palmer Drought Severity</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-3xl font-bold">{droughtAnalysis.currentConditions?.spi?.toFixed(1) || "N/A"}</div>
                    <p className="text-sm text-muted-foreground">SPI Index</p>
                    <p className="text-xs text-muted-foreground">Standardized Precipitation</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Current Conditions */}
            <Card>
              <CardHeader>
                <CardTitle>Current Conditions</CardTitle>
                <CardDescription>Key drought indicators and environmental metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Droplets className="w-5 h-5 text-blue-600" />
                      <span className="font-medium">{t("soil_moisture")}</span>
                    </div>
                    <div className="text-2xl font-bold text-blue-700">
                      {((droughtAnalysis.currentConditions?.soilMoisture || 0) * 100).toFixed(1)}%
                    </div>
                    <Progress 
                      value={(droughtAnalysis.currentConditions?.soilMoisture || 0) * 100} 
                      className="mt-2" 
                    />
                  </div>
                  
                  <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingDown className="w-5 h-5 text-orange-600" />
                      <span className="font-medium">{t("precip_deficit")}</span>
                    </div>
                    <div className="text-2xl font-bold text-orange-700">
                      {(droughtAnalysis.currentConditions?.precipitationDeficit || 0).toFixed(0)}mm
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Below normal</p>
                  </div>
                  
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="w-5 h-5 text-red-600" />
                      <span className="font-medium">{t("temp_anomaly")}</span>
                    </div>
                    <div className="text-2xl font-bold text-red-700">
                      {(droughtAnalysis.currentConditions?.temperatureAnomaly || 0) > 0 ? '+' : ''}
                      {(droughtAnalysis.currentConditions?.temperatureAnomaly || 0).toFixed(1)}°C
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">From average</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="predictions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>6-Month Drought Prediction</CardTitle>
                <CardDescription>AI-powered drought forecasting based on NASA POWER and Open-Meteo data</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">Timeline</h4>
                      <p className="text-lg font-semibold">{droughtAnalysis.prediction?.timeline || "N/A"}</p>
                    </div>
                    
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">Probability</h4>
                      <div className="text-2xl font-bold">{droughtAnalysis.prediction?.probability || 0}%</div>
                      <Progress value={droughtAnalysis.prediction?.probability || 0} className="mt-2" />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">Peak Risk Period</h4>
                      <p className="text-lg font-semibold">{droughtAnalysis.prediction?.peakRisk || "Unknown"}</p>
                    </div>
                    
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">Expected Duration</h4>
                      <p className="text-lg font-semibold">{droughtAnalysis.prediction?.duration || "Unknown"}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="action-plan" className="space-y-6">
            {/* Water Conservation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Droplets className="w-5 h-5 text-blue-600" />
                  Water Conservation Plan
                </CardTitle>
                <CardDescription>
                  Priority: <Badge variant="outline" className="ml-1">
                    {droughtAnalysis.actionPlan?.waterConservation?.priority || "Medium"}
                  </Badge>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(droughtAnalysis.actionPlan?.waterConservation?.strategies || []).map((strategy, idx) => (
                    <div key={idx} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium">{strategy.action}</h4>
                        <Badge variant={
                          strategy.difficulty === 'Easy' ? 'default' :
                          strategy.difficulty === 'Medium' ? 'secondary' : 'destructive'
                        }>
                          {strategy.difficulty}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Water Savings:</span>
                          <div className="font-medium">{strategy.savings}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Timeframe:</span>
                          <div className="font-medium">{strategy.timeframe}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Crop Management */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Current Season Crops</CardTitle>
                  <CardDescription>Immediate actions for existing crops</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(droughtAnalysis.actionPlan?.cropManagement?.currentSeason || []).map((crop, idx) => (
                    <div key={idx} className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">{crop.crop}</h4>
                      <p className="text-sm text-muted-foreground mb-2">{crop.action}</p>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div>Timing: {crop.timing}</div>
                        <div>Expected: {crop.expectedOutcome}</div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Next Season Planning</CardTitle>
                  <CardDescription>Drought-resistant crop recommendations</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(droughtAnalysis.actionPlan?.cropManagement?.nextSeason || []).map((crop, idx) => (
                    <div key={idx} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{crop.crop}</h4>
                        <Badge variant="outline">{crop.soilType}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div>Planting: {crop.plantingWindow}</div>
                        <div>Yield: {crop.yieldExpectation}</div>
                        <div>Water: {crop.waterRequirement}</div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Infrastructure Preparation */}
            <Card>
              <CardHeader>
                <CardTitle>Infrastructure Preparation</CardTitle>
                <CardDescription>Recommended infrastructure investments for drought resilience</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(droughtAnalysis.actionPlan?.infrastructurePrep || []).map((infra, idx) => (
                    <div key={idx} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{infra.infrastructure}</h4>
                        <Badge variant={
                          infra.priority === 'High' ? 'destructive' :
                          infra.priority === 'Medium' ? 'secondary' : 'default'
                        }>
                          {infra.priority}
                        </Badge>
                      </div>
                      <div className="text-sm space-y-2">
                        <div>
                          <span className="text-muted-foreground">Cost:</span>
                          <div className="font-medium">{infra.cost}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Benefit:</span>
                          <div className="font-medium">{infra.benefit}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="data-quality" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Data Sources & Model Reliability</CardTitle>
                <CardDescription>Quality metrics for drought analysis data sources</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`w-3 h-3 rounded-full ${
                        (droughtAnalysis.dataQuality?.nasaPower?.status || 'inactive') === 'active' ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                      <h4 className="font-medium">NASA POWER</h4>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        <Badge variant={(droughtAnalysis.dataQuality?.nasaPower?.status || 'inactive') === 'active' ? 'default' : 'destructive'}>
                          {droughtAnalysis.dataQuality?.nasaPower?.status || 'Unknown'}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Confidence:</span>
                        <span className="font-medium">{droughtAnalysis.dataQuality?.nasaPower?.confidence || 0}%</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Last Update:</span>
                        <div className="text-xs">{droughtAnalysis.dataQuality?.nasaPower?.lastUpdate || 'N/A'}</div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`w-3 h-3 rounded-full ${
                        (droughtAnalysis.dataQuality?.openMeteo?.status || 'inactive') === 'active' ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                      <h4 className="font-medium">Open-Meteo</h4>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        <Badge variant={(droughtAnalysis.dataQuality?.openMeteo?.status || 'inactive') === 'active' ? 'default' : 'destructive'}>
                          {droughtAnalysis.dataQuality?.openMeteo?.status || 'Unknown'}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Confidence:</span>
                        <span className="font-medium">{droughtAnalysis.dataQuality?.openMeteo?.confidence || 0}%</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Forecast Range:</span>
                        <div className="text-xs">{droughtAnalysis.dataQuality?.openMeteo?.forecastRange || 'N/A'}</div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <Activity className="w-4 h-4 text-blue-600" />
                      <h4 className="font-medium">Model Reliability</h4>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600">
                        {droughtAnalysis.dataQuality?.modelReliability || 0}%
                      </div>
                      <Progress value={droughtAnalysis.dataQuality?.modelReliability || 0} className="mt-2" />
                      <p className="text-xs text-muted-foreground mt-2">Overall reliability score</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        <Card>
          <CardContent className="p-6 text-center">
            <TrendingDown className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Drought Analysis Available</h3>
            <p className="text-sm text-muted-foreground">
              Drought monitoring requires location data and may take a few moments to generate.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}