import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLand } from "@/contexts/LandContext";
import { useTranslation } from "@/lib/translations";
import { TranslatedText } from "@/components/TranslatedText";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Brain, AlertTriangle, TrendingUp, Calendar, RefreshCw, MessageSquare, Sparkles, Wheat, Eye, Info } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';


import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github.css';
import type { Prediction, CropRecommendation } from "@shared/schema";

export default function Predictions() {
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const { selectedLand } = useLand();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const renderActionPlan = (actionPlan: string | any) => {
    if (!actionPlan) return null;

    let data = actionPlan;
    if (typeof actionPlan === 'string') {
      try {
        // Check if it looks like JSON
        if (actionPlan.trim().startsWith('{')) {
          data = JSON.parse(actionPlan);
        } else {
          // Fallback to markdown rendering for plain text
          return (
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown
                remarkPlugins={[remarkMath, remarkGfm]}
                rehypePlugins={[rehypeKatex, rehypeHighlight]}
              >
                {actionPlan}
              </ReactMarkdown>
            </div>
          );
        }
      } catch (e) {
        // If parse fails, return markdown
        return (
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown
              remarkPlugins={[remarkMath, remarkGfm]}
              rehypePlugins={[rehypeKatex, rehypeHighlight]}
            >
              {actionPlan}
            </ReactMarkdown>
          </div>
        );
      }
    }

    // Render structured data
    return (
      <Accordion type="single" collapsible className="w-full">
        {Object.entries(data).map(([key, section]: [string, any]) => (
          <AccordionItem key={key} value={key}>
            <AccordionTrigger className="capitalize">
              {key.replace(/([A-Z])/g, ' $1').trim()}
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 pt-2">
                {/* Strategies (Water Conservation) */}
                {section.strategies && (
                  <div>
                    <h5 className="font-semibold text-sm mb-2">Strategies</h5>
                    <ul className="list-disc list-inside space-y-2">
                      {Array.isArray(section.strategies) 
                        ? section.strategies.map((s: any, i: number) => (
                            <li key={i} className="text-sm">
                              {typeof s === 'object' && s !== null ? (
                                <span className="inline-flex flex-col align-top">
                                  <span className="font-medium">{s.action || JSON.stringify(s)}</span>
                                  <span className="flex gap-2 mt-1 flex-wrap">
                                    {s.savings && <Badge variant="outline" className="text-[10px] h-5 px-1">Savings: {s.savings}</Badge>}
                                    {s.timeframe && <Badge variant="outline" className="text-[10px] h-5 px-1">{s.timeframe}</Badge>}
                                    {s.difficulty && <Badge variant="outline" className="text-[10px] h-5 px-1">Diff: {s.difficulty}</Badge>}
                                  </span>
                                </span>
                              ) : (
                                s
                              )}
                            </li>
                          ))
                        : <li className="text-sm">{typeof section.strategies === 'object' ? JSON.stringify(section.strategies) : section.strategies}</li>
                      }
                    </ul>
                  </div>
                )}

                {/* Crop Management */}
                {section.currentSeason && (
                  <div>
                    <h5 className="font-semibold text-sm mb-2">Current Season</h5>
                    <ul className="list-disc list-inside space-y-2">
                      {Array.isArray(section.currentSeason) && section.currentSeason.map((item: any, i: number) => (
                        <li key={i} className="text-sm">
                          <span className="font-medium">{item.crop || 'Crop'}</span>: {item.action}
                          {item.timing && <div className="text-xs text-muted-foreground ml-4">Timing: {item.timing}</div>}
                          {item.expectedOutcome && <div className="text-xs text-muted-foreground ml-4">Outcome: {item.expectedOutcome}</div>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {section.nextSeason && (
                  <div>
                    <h5 className="font-semibold text-sm mb-2">Next Season</h5>
                    <ul className="list-disc list-inside space-y-2">
                      {Array.isArray(section.nextSeason) && section.nextSeason.map((item: any, i: number) => (
                        <li key={i} className="text-sm">
                          <span className="font-medium">{item.crop || 'Crop'}</span> 
                          {item.soilType && <span className="text-xs text-muted-foreground ml-1">({item.soilType})</span>}
                          {item.yieldExpectation && <div className="text-xs text-muted-foreground ml-4">Yield: {item.yieldExpectation}</div>}
                          {item.waterRequirement && <div className="text-xs text-muted-foreground ml-4">Water: {item.waterRequirement}</div>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Infrastructure Prep (Array sections) */}
                {Array.isArray(section) && (
                   <ul className="list-disc list-inside space-y-2">
                     {section.map((item: any, i: number) => (
                       <li key={i} className="text-sm">
                         {typeof item === 'object' ? (
                           <span className="inline-flex flex-col align-top">
                             <span className="font-medium">{item.infrastructure || item.action || 'Action'}</span>
                             <span className="flex gap-2 mt-1 flex-wrap">
                               {item.priority && <Badge variant="outline" className="text-[10px] h-5 px-1">Priority: {item.priority}</Badge>}
                               {item.cost && <Badge variant="outline" className="text-[10px] h-5 px-1">Cost: {item.cost}</Badge>}
                             </span>
                             {item.benefit && <div className="text-xs text-muted-foreground mt-1">Benefit: {item.benefit}</div>}
                           </span>
                         ) : item}
                       </li>
                     ))}
                   </ul>
                )}

                {section.timeline && (
                  <div>
                    <h5 className="font-semibold text-sm mb-1">Timeline</h5>
                    <p className="text-sm text-muted-foreground">{section.timeline}</p>
                  </div>
                )}
                {section.impact && (
                  <div>
                    <h5 className="font-semibold text-sm mb-1">Expected Impact</h5>
                    <p className="text-sm text-muted-foreground">{section.impact}</p>
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    );
  };

  const renderRecommendations = (recommendations: string | any) => {
    if (!recommendations) return null;

    let data = recommendations;
    if (typeof recommendations === 'string') {
      try {
        if (recommendations.trim().startsWith('{')) {
          data = JSON.parse(recommendations);
        } else {
          return <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">{recommendations}</p>;
        }
      } catch (e) {
        return <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">{recommendations}</p>;
      }
    }

    return (
      <div className="grid gap-4 md:grid-cols-3">
        {Object.entries(data).map(([key, items]: [string, any]) => (
          <Card key={key} className="bg-muted/50">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-medium capitalize">
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <ul className="list-disc list-inside space-y-1">
                {Array.isArray(items) 
                  ? items.map((item: any, i: number) => (
                      <li key={i} className="text-xs">
                        {typeof item === 'object' && item !== null ? (
                           // Fallback for object items in recommendations
                           item.action || item.recommendation || JSON.stringify(item)
                        ) : item}
                      </li>
                    ))
                  : <li className="text-xs">{typeof items === 'object' ? JSON.stringify(items) : String(items)}</li>
                }
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const getRecommendationSummary = (recommendations: string | any) => {
    if (!recommendations) return "";
    
    if (typeof recommendations === 'string') {
      try {
        if (recommendations.trim().startsWith('{')) {
          const data = JSON.parse(recommendations);
          // Try to get immediate recommendations
          if (data.immediate && Array.isArray(data.immediate) && data.immediate.length > 0) {
            return data.immediate[0];
          }
          // Fallback to first available value
          const firstKey = Object.keys(data)[0];
          if (firstKey && data[firstKey]) {
             const val = data[firstKey];
             return Array.isArray(val) ? val[0] : String(val);
          }
          return "View details for recommendations";
        }
        return recommendations;
      } catch (e) {
        return recommendations;
      }
    }
    // If it's already an object
    if (typeof recommendations === 'object') {
       if (recommendations.immediate && Array.isArray(recommendations.immediate) && recommendations.immediate.length > 0) {
          return recommendations.immediate[0];
       }
       return "View details for recommendations";
    }
    
    return String(recommendations);
  };

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

  const { data: predictions, isLoading: predictionsLoading } = useQuery<Prediction[]>({
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
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 0, // Always refetch when component mounts
  });

  const { data: cropRecommendations, isLoading: cropsLoading } = useQuery<CropRecommendation[]>({
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
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 0, // Always refetch when component mounts
  });

  // Add drought predictions query
  const { data: droughtPredictions, isLoading: droughtLoading } = useQuery({
    queryKey: ["/api/drought/predictions", selectedLand?.id],
    queryFn: async () => {
      if (!selectedLand) return [];
      
      const response = await fetch(`/api/lands/${selectedLand.id}/drought`, {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!response.ok) {
        console.warn('Failed to fetch drought predictions, returning empty array');
        return [];
      }
      
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!user && !!selectedLand,
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 0, // Always refetch when component mounts
  });

  // Mutation to generate new predictions
  const generatePredictionsMutation = useMutation({
    mutationFn: async () => {
      if (!selectedLand) throw new Error("No land selected");
      const response = await fetch(`/api/lands/${selectedLand.id}/predictions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/predictions", selectedLand?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/crops/recommendations", selectedLand?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/drought/predictions", selectedLand?.id] });
      toast({
        title: "Success",
        description: "New predictions generated successfully!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to generate predictions: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Enhanced AI predictions with multiple models including drought analysis
  const enhancedPredictionsMutation = useMutation({
    mutationFn: async () => {
      if (!selectedLand) throw new Error("No land selected");
      const response = await fetch("/api/enhanced-predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ 
          landId: selectedLand.id 
        }),
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }
      return response.json();
    },
    onSuccess: async (data) => {
      // Invalidate all related queries to fetch fresh data
      queryClient.invalidateQueries({ queryKey: ["/api/predictions", selectedLand?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/crops/recommendations", selectedLand?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/drought/predictions", selectedLand?.id] });
      
      const weatherGenerated = data.weatherPrediction ? 1 : 0;
      const cropsGenerated = data.cropRecommendations ? data.cropRecommendations.length : 0;
      const droughtGenerated = data.droughtPrediction ? 1 : 0;
      
      // Send email notifications for generated predictions
      try {
        await fetch("/api/send-prediction-emails", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            landId: selectedLand?.id,
            weatherPrediction: data.weatherPrediction,
            cropRecommendations: data.cropRecommendations,
            droughtPrediction: data.droughtPrediction
          }),
        });
        
        toast({
          title: "🌟 Enhanced AI Success!",
          description: `Generated ${weatherGenerated} weather prediction, ${cropsGenerated} crop recommendations, and ${droughtGenerated} drought analysis. Email notifications sent successfully!`,
        });
      } catch (emailError) {
        console.error("Email notification failed:", emailError);
        toast({
          title: "🌟 Enhanced AI Success!",
          description: `Generated ${weatherGenerated} weather prediction, ${cropsGenerated} crop recommendations, and ${droughtGenerated} drought analysis using intelligent AI rotation models!`,
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Enhanced AI Error",
        description: `Failed to generate enhanced predictions: ${error.message}`,
        variant: "destructive",
      });
    },
  });



  // Send SMS for specific prediction
  const sendSMSMutation = useMutation({
    mutationFn: async ({ title, message }: { title: string; message: string }) => {
      const response = await fetch("/api/notifications/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title, message }),
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "SMS Sent",
        description: "SMS notification sent successfully!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "SMS Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (authLoading || !user) {
    return <div className="p-4 md:p-8"><Skeleton className="h-96" /></div>;
  }

  const getSeverityVariant = (severity?: string) => {
    switch (severity) {
      case "critical":
      case "high":
        return "destructive";
      case "medium":
        return "default";
      default:
        return "secondary";
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground">
           {t("ai_predictions")}
          {selectedLand && (
            <span className="text-2xl font-normal text-muted-foreground ml-2">
              - {selectedLand.name}
            </span>
          )}
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          {selectedLand ? (
            <>
              {t("advanced_agricultural_forecasts_for")} <strong>{selectedLand.name}</strong> {t("powered_by_multiple_ai_models")}
              <span className="block text-sm text-muted-foreground/80 mt-1">
                 {selectedLand.address.split(',').slice(0, 2).join(', ')}
              </span>
            </>
          ) : (
            "Advanced agricultural forecasts and crop recommendations powered by multiple AI models analyzing future weather patterns"
          )}
        </p>
      </div>
      
      {/* Action Buttons */}
      <div className="flex justify-center">
        <div className="flex gap-3">
          
          <Button
            onClick={() => enhancedPredictionsMutation.mutate()}
            disabled={enhancedPredictionsMutation.isPending}
            className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
          >
            <Sparkles className={`w-4 h-4 mr-2 ${enhancedPredictionsMutation.isPending ? 'animate-spin' : ''}`} />
            {t("enhanced_ai_predict")}
          </Button>
        </div>
      </div>

      {/* Predictions Content */}
      {predictionsLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : predictions && predictions.length > 0 ? (
        <div className="space-y-4">
          {predictions.map((prediction) => (
            <Card key={prediction.id} className="hover-elevate" data-testid={`prediction-card-${prediction.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Brain className="w-5 h-5 text-primary" />
                      <CardTitle className="text-xl">{prediction.title}</CardTitle>
                    </div>
                    <CardDescription className="flex items-center gap-2 flex-wrap">
                      {prediction.predictionType && (
                        <Badge variant="outline">{prediction.predictionType}</Badge>
                      )}
                      {prediction.aiModel && (
                        <span className="text-xs">Model: {prediction.aiModel}</span>
                      )}
                      {prediction.createdAt && (
                        <span className="text-xs flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(prediction.createdAt).toLocaleDateString()}
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {prediction.severity && (
                      <Badge variant={getSeverityVariant(prediction.severity)}>
                        {prediction.severity}
                      </Badge>
                    )}
                    {prediction.confidence && (
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Confidence</p>
                        <p className="text-sm font-semibold">{Math.round(prediction.confidence)}%</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none dark:prose-invert mb-4">
                  <ReactMarkdown
                    remarkPlugins={[remarkMath, remarkGfm]}
                    rehypePlugins={[rehypeKatex, rehypeHighlight]}
                    components={{
                      h1: ({children}) => <h1 className="text-lg font-bold text-blue-700 dark:text-blue-400 mb-3">{children}</h1>,
                      h2: ({children}) => <h2 className="text-md font-semibold text-blue-600 dark:text-blue-300 mb-2 mt-4">{children}</h2>,
                      h3: ({children}) => <h3 className="text-sm font-medium text-blue-500 dark:text-blue-200 mb-1 mt-3">{children}</h3>,
                      table: ({children}) => <div className="overflow-x-auto my-4"><table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600">{children}</table></div>,
                      th: ({children}) => <th className="border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 px-4 py-2 text-left font-semibold">{children}</th>,
                      td: ({children}) => <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">{children}</td>,
                      code: ({inline, className, children, ...props}) => {
                        if (inline) {
                          return <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm font-mono" {...props}>{children}</code>
                        }
                        return <code className={`${className} block bg-gray-100 dark:bg-gray-900 p-3 rounded-md overflow-x-auto`} {...props}>{children}</code>
                      },
                      pre: ({children}) => <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded-md overflow-x-auto my-4">{children}</pre>,
                      blockquote: ({children}) => <blockquote className="border-l-4 border-blue-500 pl-4 my-4 text-gray-700 dark:text-gray-300 italic">{children}</blockquote>,
                      ul: ({children}) => <ul className="list-disc list-inside my-2 space-y-1">{children}</ul>,
                      ol: ({children}) => <ol className="list-decimal list-inside my-2 space-y-1">{children}</ol>,
                      li: ({children}) => <li className="text-sm">{children}</li>
                    }}
                  >
                    {prediction.description || ''}
                  </ReactMarkdown>
                </div>
                <div className="flex items-center justify-between">
                  {prediction.predictionDate && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <TrendingUp className="w-4 h-4" />
                      <span>
                        Predicted for: {new Date(prediction.predictionDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  <Button
                    onClick={() => sendSMSMutation.mutate({
                      title: prediction.title || "Weather Alert",
                      message: prediction.description || "Check your AgriPredict dashboard for details."
                    })}
                    disabled={sendSMSMutation.isPending}
                    variant="outline"
                    size="sm"
                  >
                    {/* <MessageSquare className="w-4 h-4 mr-2" /> */}
                    Send SMS
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-16">
            <div className="text-center">
              {/* <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-muted-foreground" /> */}
              <h3 className="text-lg font-medium text-foreground mb-2">{t("no_predictions_available")}</h3>
              <p className="text-muted-foreground max-w-md mx-auto mb-6">
                Our AI models are analyzing weather patterns and your location data.
                {t("try_enhanced_ai_predict_button")}
              </p>
              
            </div>
          </CardContent>
        </Card>
      )}

      {/* Crop Recommendations Section */}
      <div className="mt-8">
        <div className="flex items-center gap-2 mb-4">
          {/* <Wheat className="w-6 h-6 text-green-600" /> */}
          <h2 className="text-2xl font-bold text-foreground">{t("smart_crop_recommendations")}</h2>
        </div>
        
        {cropsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        ) : cropRecommendations && cropRecommendations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cropRecommendations.map((crop) => (
              <Card key={crop.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                         <TranslatedText 
                           text={crop.cropName} 
                           fallback={crop.cropName}
                         />
                      </CardTitle>
                      <CardDescription className="mt-1">
                        <Badge variant="secondary" className="mr-2">
                          {Math.round(crop.confidence)}% Confidence
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Planting: {crop.plantingDate ? new Date(crop.plantingDate).toLocaleDateString() : 'TBD'}
                        </span>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-foreground mb-4 line-clamp-3">
                    {crop.reasoning}
                  </p>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Irrigation:</span>
                      <span className="font-medium">{crop.irrigationNeeds}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Expected Yield:</span>
                      <span className="font-medium">{crop.expectedYield}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button className="flex-1" variant="outline">
                          <Eye className="w-4 h-4 mr-2" />
                          View Plan
                        </Button>
                      </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[80vh]">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                           {crop.cropName} - Complete Cultivation Plan
                        </DialogTitle>
                        <DialogDescription>
                          Comprehensive guide for successful {crop.cropName} cultivation
                        </DialogDescription>
                      </DialogHeader>
                      <ScrollArea className="max-h-[60vh] w-full">
                        <div className="prose prose-sm max-w-none dark:prose-invert">
                          <ReactMarkdown
                            remarkPlugins={[remarkMath, remarkGfm]}
                            rehypePlugins={[rehypeKatex, rehypeHighlight]}
                            components={{
                              h1: ({children}) => <h1 className="text-2xl font-bold text-green-700 dark:text-green-400 mb-4">{children}</h1>,
                              h2: ({children}) => <h2 className="text-xl font-semibold text-green-600 dark:text-green-300 mb-3 mt-6">{children}</h2>,
                              h3: ({children}) => <h3 className="text-lg font-medium text-green-500 dark:text-green-200 mb-2 mt-4">{children}</h3>,
                              h4: ({children}) => <h4 className="text-md font-medium text-green-400 dark:text-green-100 mb-2 mt-3">{children}</h4>,
                              h5: ({children}) => <h5 className="text-sm font-medium text-green-300 dark:text-green-50 mb-1 mt-2">{children}</h5>,
                              h6: ({children}) => <h6 className="text-sm font-normal text-green-200 dark:text-green-50 mb-1 mt-2">{children}</h6>,
                              table: ({children}) => <div className="overflow-x-auto my-6"><table className="min-w-full border-collapse border-2 border-green-200 dark:border-green-700 rounded-lg">{children}</table></div>,
                              thead: ({children}) => <thead className="bg-green-50 dark:bg-green-900">{children}</thead>,
                              tbody: ({children}) => <tbody className="divide-y divide-green-200 dark:divide-green-700">{children}</tbody>,
                              th: ({children}) => <th className="px-6 py-4 border border-green-200 dark:border-green-700 text-left text-xs font-semibold text-green-800 dark:text-green-200 uppercase tracking-wider bg-green-100 dark:bg-green-800">{children}</th>,
                              td: ({children}) => <td className="px-6 py-4 border border-green-200 dark:border-green-700 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-green-950">{children}</td>,
                              code: ({inline, children}) => inline 
                                ? <code className="bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 px-2 py-1 rounded text-xs font-mono">{children}</code>
                                : <code className="block bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm font-mono">{children}</code>,
                              pre: ({children}) => <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto my-4 border border-green-600">{children}</pre>,
                              blockquote: ({children}) => <blockquote className="border-l-4 border-green-500 bg-green-50 dark:bg-green-900/20 pl-4 py-2 my-3 text-green-800 dark:text-green-200 italic">{children}</blockquote>,
                              ul: ({children}) => <ul className="list-disc list-inside my-3 space-y-2 text-gray-700 dark:text-gray-300">{children}</ul>,
                              ol: ({children}) => <ol className="list-decimal list-inside my-3 space-y-2 text-gray-700 dark:text-gray-300">{children}</ol>,
                              li: ({children}) => <li className="text-sm leading-relaxed">{children}</li>,
                              p: ({children}) => <p className="my-3 text-sm leading-relaxed text-gray-700 dark:text-gray-300">{children}</p>,
                              strong: ({children}) => <strong className="font-semibold text-green-700 dark:text-green-300">{children}</strong>,
                              em: ({children}) => <em className="italic text-green-600 dark:text-green-400">{children}</em>,
                              a: ({children, href}) => <a href={href} className="text-green-600 dark:text-green-400 underline hover:text-green-800 dark:hover:text-green-300 transition-colors" target="_blank" rel="noopener noreferrer">{children}</a>,
                              hr: () => <hr className="my-6 border-green-300 dark:border-green-600" />
                            }}
                          >
                            {/* Use the detailedPlan if available, otherwise create a basic plan */}
                            {crop.detailedPlan || `# ${crop.cropName} Cultivation Plan\n\n## 📋 Overview\n${crop.reasoning}\n\n## 🔑 Key Requirements\n\n| **Parameter** | **Value** |\n|---------------|-----------|\n| **Irrigation** | ${crop.irrigationNeeds} |\n| **Fertilization** | ${crop.fertilizerNeeds || 'As per soil test'} |\n| **Expected Yield** | ${crop.expectedYield} |\n| **Planting Date** | ${crop.plantingDate ? new Date(crop.plantingDate).toLocaleDateString() : 'TBD'} |\n\n## ⚠️ Risk Management\n${crop.risks || 'Standard agricultural risk mitigation practices recommended.'}`}
                          </ReactMarkdown>
                        </div>
                      </ScrollArea>
                    </DialogContent>
                  </Dialog>
                  <Button
                    onClick={() => sendSMSMutation.mutate({
                      title: `Crop Recommendation: ${crop.cropName}`,
                      message: `Confidence: ${Math.round(crop.confidence)}%\n\nReasoning:\n${crop.reasoning}\n\nPlan:\n${crop.detailedPlan || 'View dashboard for details.'}`
                    })}
                    disabled={sendSMSMutation.isPending}
                    variant="outline"
                    size="icon"
                    title="Send SMS"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </Button>
                </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                {/* <Wheat className="w-12 h-12 mx-auto mb-4 text-muted-foreground" /> */}
                <h3 className="text-lg font-medium text-foreground mb-2">{t("no_crop_recommendations_yet")}</h3>
                <p className="text-muted-foreground max-w-md mx-auto mb-4">
                  {t("use_enhanced_ai_predict_for_crops")}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Drought Predictions Section */}
      <div className="mt-8">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-2xl font-bold text-foreground"> Drought Risk Analysis</h2>
        </div>
        
        {droughtLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        ) : droughtPredictions && droughtPredictions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {droughtPredictions.map((drought: any) => (
              <Card key={drought.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                         Drought Risk: {drought.timeframe}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        <Badge 
                          variant={drought.riskLevel === 'extreme' ? 'destructive' : 
                                 drought.riskLevel === 'high' ? 'destructive' :
                                 drought.riskLevel === 'moderate' ? 'default' : 'secondary'}
                          className="mr-2"
                        >
                          {drought.riskLevel.toUpperCase()} RISK
                        </Badge>
                        <Badge variant="outline" className="mr-2">
                          {Math.round(drought.probability)}% Probability
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(drought.createdAt).toLocaleDateString()}
                        </span>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {drought.precipitationTrend && (
                      <div>
                        <h4 className="text-sm font-medium text-foreground mb-1">Precipitation Trend</h4>
                        <p className="text-sm text-muted-foreground">{drought.precipitationTrend}</p>
                      </div>
                    )}
                    
                    {drought.temperatureTrend && (
                      <div>
                        <h4 className="text-sm font-medium text-foreground mb-1">Temperature Trend</h4>
                        <p className="text-sm text-muted-foreground">{drought.temperatureTrend}</p>
                      </div>
                    )}

                    {drought.recommendations && (
                      <div>
                        <h4 className="text-sm font-medium text-foreground mb-1">Key Recommendations</h4>
                        <p className="text-sm text-muted-foreground line-clamp-2">{getRecommendationSummary(drought.recommendations)}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button className="flex-1" variant="outline">
                          <Info className="w-4 h-4 mr-2" />
                          View Plan
                        </Button>
                      </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[80vh]">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                           Drought Mitigation Plan - {drought.riskLevel.toUpperCase()} Risk
                        </DialogTitle>
                        <DialogDescription>
                          Comprehensive drought preparation and mitigation strategies
                        </DialogDescription>
                      </DialogHeader>
                      <ScrollArea className="max-h-[60vh] w-full">
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <h4 className="font-medium text-foreground mb-2">Risk Assessment</h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span>Risk Level:</span>
                                  <Badge variant={drought.riskLevel === 'extreme' ? 'destructive' : 
                                               drought.riskLevel === 'high' ? 'destructive' :
                                               drought.riskLevel === 'moderate' ? 'default' : 'secondary'}>
                                    {drought.riskLevel.toUpperCase()}
                                  </Badge>
                                </div>
                                <div className="flex justify-between">
                                  <span>Probability:</span>
                                  <span className="font-medium">{Math.round(drought.probability)}%</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Timeframe:</span>
                                  <span className="font-medium">{drought.timeframe}</span>
                                </div>
                                {drought.pdsiValue && (
                                  <div className="flex justify-between">
                                    <span>PDSI Value:</span>
                                    <span className="font-medium">{drought.pdsiValue.toFixed(2)}</span>
                                  </div>
                                )}
                                {drought.spiValue && (
                                  <div className="flex justify-between">
                                    <span>SPI Value:</span>
                                    <span className="font-medium">{drought.spiValue.toFixed(2)}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div>
                              <h4 className="font-medium text-foreground mb-2">Affected Period</h4>
                              {drought.affectedMonths ? (
                                <div className="text-sm">
                                  <p className="text-muted-foreground mb-2">Expected drought conditions during:</p>
                                  <div className="flex flex-wrap gap-1">
                                    {JSON.parse(drought.affectedMonths).map((month: string) => (
                                      <Badge key={month} variant="secondary" className="text-xs">
                                        {month}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground">Assessment period: {drought.timeframe}</p>
                              )}
                            </div>
                          </div>

                          {drought.analysis && (
                            <div>
                              <h4 className="font-medium text-foreground mb-2">Detailed Analysis</h4>
                              <div className="prose prose-sm max-w-none dark:prose-invert">
                                <ReactMarkdown
                                  remarkPlugins={[remarkMath, remarkGfm]}
                                  rehypePlugins={[rehypeKatex, rehypeHighlight]}
                                  components={{
                                    h1: ({children}) => <h1 className="text-xl font-bold text-orange-700 dark:text-orange-400 mb-4">{children}</h1>,
                                    h2: ({children}) => <h2 className="text-lg font-semibold text-orange-600 dark:text-orange-300 mb-3 mt-6">{children}</h2>,
                                    h3: ({children}) => <h3 className="text-md font-medium text-orange-500 dark:text-orange-200 mb-2 mt-4">{children}</h3>,
                                    table: ({children}) => <div className="overflow-x-auto my-6"><table className="min-w-full border-collapse border-2 border-orange-200 dark:border-orange-700 rounded-lg">{children}</table></div>,
                                    th: ({children}) => <th className="px-4 py-3 border border-orange-200 dark:border-orange-700 bg-orange-100 dark:bg-orange-800 text-left font-semibold text-orange-800 dark:text-orange-200 text-xs uppercase">{children}</th>,
                                    td: ({children}) => <td className="px-4 py-3 border border-orange-200 dark:border-orange-700 text-sm">{children}</td>,
                                    code: ({inline, children}) => inline 
                                      ? <code className="bg-orange-100 dark:bg-orange-800 text-orange-800 dark:text-orange-200 px-1 py-0.5 rounded text-xs">{children}</code>
                                      : <code className="block bg-gray-900 text-orange-400 p-3 rounded overflow-x-auto text-sm">{children}</code>,
                                    blockquote: ({children}) => <blockquote className="border-l-4 border-orange-500 bg-orange-50 dark:bg-orange-900/20 pl-4 py-2 my-3 italic">{children}</blockquote>
                                  }}
                                >
                                  {drought.analysis}
                                </ReactMarkdown>
                              </div>
                            </div>
                          )}

                          {drought.actionPlan && (
                            <div>
                              <h4 className="font-medium text-foreground mb-2">Action Plan</h4>
                              {renderActionPlan(drought.actionPlan)}
                            </div>
                          )}

                          {drought.recommendations && (
                            <div>
                              <h4 className="font-medium text-foreground mb-2">Immediate Recommendations</h4>
                              {renderRecommendations(drought.recommendations)}
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </DialogContent>
                  </Dialog>
                  <Button
                    onClick={() => sendSMSMutation.mutate({
                      title: `Drought Alert: ${drought.riskLevel.toUpperCase()}`,
                      message: `Risk: ${drought.riskLevel}\nProbability: ${Math.round(drought.probability)}%\nTimeframe: ${drought.timeframe}\n\nAnalysis:\n${drought.analysis || 'View dashboard for details.'}`
                    })}
                    disabled={sendSMSMutation.isPending}
                    variant="outline"
                    size="icon"
                    title="Send SMS"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </Button>
                </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <div className="text-4xl mb-4"></div>
                <h3 className="text-lg font-medium text-foreground mb-2">No Drought Analysis Available</h3>
                <p className="text-muted-foreground max-w-md mx-auto mb-4">
                  Use the Enhanced AI Predict button to generate comprehensive drought risk analysis using NASA POWER historical data and Open-Meteo seasonal forecasts.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}