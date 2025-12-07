import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLand } from "@/contexts/LandContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapComponent } from "@/components/map-component";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Mail, Phone, MapPin, Calendar, Bell, Globe } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useTranslation } from "@/lib/translations";
import { TranslatedText } from "@/components/TranslatedText";
import type { CropRecommendation } from "@shared/schema";

export default function Profile() {
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const { lands } = useLand();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const languages = [
    { code: "en", name: "English", flag: "🇺🇸" },
    { code: "hi", name: "Hindi", flag: "🇮🇳" },
    { code: "ta", name: "Tamil", flag: "🇮🇳" },
    { code: "te", name: "Telugu", flag: "🇮🇳" },
    { code: "kn", name: "Kannada", flag: "🇮🇳" },
    { code: "ml", name: "Malayalam", flag: "🇮🇳" },
    { code: "mr", name: "Marathi", flag: "🇮🇳" },
    { code: "bn", name: "Bengali", flag: "🇧🇩" },
    { code: "gu", name: "Gujarati", flag: "🇮🇳" },
    { code: "pa", name: "Punjabi", flag: "🇮🇳" },
    { code: "es", name: "Spanish", flag: "🇪🇸" },
    { code: "fr", name: "French", flag: "🇫🇷" },
    { code: "de", name: "German", flag: "🇩🇪" },
    { code: "zh", name: "Chinese", flag: "🇨🇳" },
    { code: "ja", name: "Japanese", flag: "🇯🇵" },
  ];

  const updateSettingsMutation = useMutation({
    mutationFn: async (newLanguage: string) => {
      return await apiRequest("PATCH", "/api/settings", {
        smsNotifications: user?.smsNotifications ?? true,
        emailNotifications: user?.emailNotifications ?? true,
        language: newLanguage,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Settings Updated",
        description: "Your language preference has been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update settings.",
        variant: "destructive",
      });
    },
  });

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

  // Fetch crop history from all user's lands
  const { data: crops = [] } = useQuery<CropRecommendation[]>({
    queryKey: ["/api/crops/history", lands.map(l => l.id)],
    queryFn: async () => {
      if (!lands || lands.length === 0) return [];
      
      // Fetch crops from all lands
      const allCrops: CropRecommendation[] = [];
      
      for (const land of lands) {
        try {
          const response = await fetch(`/api/lands/${land.id}/crops`, {
            credentials: 'include',
          });
          
          if (response.ok) {
            const landCrops = await response.json();
            // Add land information to each crop for context
            const enrichedCrops = landCrops.map((crop: any) => ({
              ...crop,
              landName: land.name,
              landAddress: land.address
            }));
            allCrops.push(...enrichedCrops);
          }
        } catch (error) {
          console.warn(`Failed to fetch crops for land ${land.id}:`, error);
        }
      }
      
      // Sort by creation date (newest first)
      return allCrops.sort((a, b) => 
        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
    },
    enabled: !!user && lands.length > 0,
  });

  if (authLoading || !user) {
    return (
      <div className="p-4 md:p-8 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-6 w-64" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Skeleton className="h-96 w-full" />
          </div>
          <div className="lg:col-span-2">
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const getUserInitials = () => {
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    return user.email?.[0]?.toUpperCase() || "U";
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground"><TranslatedText text="Profile" /></h1>
          <p className="text-lg text-muted-foreground"><TranslatedText text="Your account details" /></p>
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card className="lg:col-span-1 shadow-sm border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl text-foreground"><TranslatedText text="Personal Information" /></CardTitle>
            <CardDescription className="text-muted-foreground"><TranslatedText text="Your account details" /></CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center text-center">
              <Avatar className="w-28 h-28 mb-6 shadow-lg border-4 border-primary/20">
                <AvatarImage src={user.profileImageUrl || undefined} alt={user.firstName || "User"} />
                <AvatarFallback className="bg-primary text-primary-foreground text-3xl font-bold">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              <h3 className="text-2xl font-bold text-foreground mb-2" data-testid="text-profile-name">
                {user.firstName && user.lastName
                  ? `${user.firstName} ${user.lastName}`
                  : "Farmer"}
              </h3>
              <p className="text-sm text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
                Member since {new Date(user.createdAt || Date.now()).toLocaleDateString()}
              </p>
            </div>

            <div className="space-y-6">
              {user.email && (
                <div className="flex items-start gap-4 p-3 rounded-lg bg-muted/30 border border-border/30">
                  <Mail className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Email</p>
                    <p className="text-foreground break-all" data-testid="text-profile-email">{user.email}</p>
                  </div>
                </div>
              )}

              {user.phoneNumber && (
                <div className="flex items-start gap-4 p-3 rounded-lg bg-muted/30 border border-border/30">
                  <Phone className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Phone</p>
                    <p className="text-foreground" data-testid="text-profile-phone">{user.phoneNumber}</p>
                  </div>
                </div>
              )}

              {user.address && (
                <div className="flex items-start gap-4 p-3 rounded-lg bg-muted/30 border border-border/30">
                  <MapPin className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Address</p>
                    <p className="text-foreground leading-relaxed" data-testid="text-profile-address">{user.address}</p>
                  </div>
                </div>
              )}

              <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
                <div className="flex items-start gap-4">
                  <Globe className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-muted-foreground mb-2"><TranslatedText text="Language" /></p>
                    <Select 
                      value={user.language || "en"} 
                      onValueChange={(val) => updateSettingsMutation.mutate(val)}
                      disabled={updateSettingsMutation.isPending}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Language" />
                      </SelectTrigger>
                      <SelectContent>
                        {languages.map((lang) => (
                          <SelectItem key={lang.code} value={lang.code}>
                            <span className="mr-2">{lang.flag}</span>
                            {lang.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
                <div className="flex items-start gap-4">
                  <Bell className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground mb-2"><TranslatedText text="Notifications" /></p>
                    <div className="flex flex-wrap gap-2">
                      {user.smsNotifications && <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">SMS</Badge>}
                      {user.emailNotifications && <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">Email</Badge>}
                      {!user.smsNotifications && !user.emailNotifications && (
                        <span className="text-sm text-muted-foreground">No notifications enabled</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Farm Location */}
        <Card className="lg:col-span-2 shadow-sm border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl text-foreground"><TranslatedText text="Farm Location" /></CardTitle>
            <CardDescription className="text-muted-foreground"><TranslatedText text="Your registered farm coordinates and map view" /></CardDescription>
          </CardHeader>
          <CardContent>
            {user.latitude && user.longitude ? (
              <div className="relative">
                <MapComponent
                  latitude={user.latitude}
                  longitude={user.longitude}
                  address={user.address || undefined}
                  className="h-96 rounded-lg border border-border/50 shadow-sm"
                />
              </div>
            ) : (
              <div className="h-96 flex items-center justify-center bg-muted/50 rounded-lg border border-border/50">
                <div className="text-center p-8">
                  <MapPin className="w-16 h-16 mx-auto mb-6 text-muted-foreground/60" />
                  <p className="text-lg text-muted-foreground"><TranslatedText text="No location data available" /></p>
                  <p className="text-sm text-muted-foreground/80 mt-2">Add your farm location to see it on the map</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Crop History */}
      <Card className="shadow-sm border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl text-foreground"><TranslatedText text="Crop History" /></CardTitle>
          <CardDescription className="text-muted-foreground"><TranslatedText text="Your previously recommended crops" /></CardDescription>
        </CardHeader>
        <CardContent>
          {crops && crops.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {crops.map((crop: any) => (
                <div
                  key={`${crop.landId}-${crop.id}`}
                  className="p-6 rounded-lg border border-border/50 shadow-sm hover:shadow-md transition-shadow bg-card"
                  data-testid={`crop-history-${crop.id}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="font-semibold text-lg text-foreground">{crop.cropName}</h4>
                    <Badge variant="outline" className="ml-2 text-xs">
                      {Math.round(crop.confidence)}%
                    </Badge>
                  </div>
                  
                  {(crop.landName || crop.landAddress) && (
                    <div className="mb-3 p-2 bg-muted/30 rounded">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <span>{crop.landName}</span>
                      </p>
                      {crop.landAddress && (
                        <p className="text-xs text-muted-foreground/70 mt-1">
                          {crop.landAddress.split(',').slice(0, 2).join(', ')}
                        </p>
                      )}
                    </div>
                  )}
                  
                  <div className="space-y-2 text-sm">
                    {crop.reasoning && (
                      <p className="text-muted-foreground text-xs line-clamp-2">
                        {crop.reasoning}
                      </p>
                    )}
                    {crop.plantingDate && (
                      <p className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(crop.plantingDate).toLocaleDateString()}</span>
                      </p>
                    )}
                    {crop.createdAt && (
                      <p className="text-xs text-muted-foreground/70">
                        Recommended on {new Date(crop.createdAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="max-w-sm mx-auto">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
                  <Calendar className="w-8 h-8 text-muted-foreground/60" />
                </div>
                <p className="text-lg text-muted-foreground mb-2"><TranslatedText text="No crop recommendations yet" /></p>
                <p className="text-sm text-muted-foreground/80">
                  {lands.length === 0 
                    ? "Add your first land area to get started with crop recommendations"
                    : "Generate crop recommendations from the Predictions page to see your history here"
                  }
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
