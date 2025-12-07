import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/lib/translations";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Sprout, 
  Calendar,
  TrendingUp,
  Droplets,
  Sun
} from "lucide-react";
import { MapComponent } from "@/components/map-component";
import type { LandArea } from "@shared/schema";

interface LandFormData {
  name: string;
  latitude: number;
  longitude: number;
  address: string;
  area: number;
  soilType: string;
  notes: string;
}

export default function Lands() {
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedLand, setSelectedLand] = useState<LandArea | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number; address?: string } | null>(null);

  const [formData, setFormData] = useState<LandFormData>({
    name: "",
    latitude: 0,
    longitude: 0,
    address: "",
    area: 0,
    soilType: "",
    notes: "",
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

  const { data: lands, isLoading: landsLoading } = useQuery<LandArea[]>({
    queryKey: ["/api/lands"],
    enabled: !!user,
  });

  const addLandMutation = useMutation({
    mutationFn: async (landData: LandFormData) => {
      const response = await fetch("/api/lands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(landData),
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lands"] });
      setShowAddDialog(false);
      resetForm();
      toast({
        title: "Success",
        description: "Land area added successfully!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to add land: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const updateLandMutation = useMutation({
    mutationFn: async ({ landId, updates }: { landId: string; updates: Partial<LandFormData> }) => {
      const response = await fetch(`/api/lands/${landId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lands"] });
      setShowEditDialog(false);
      setSelectedLand(null);
      resetForm();
      toast({
        title: "Success",
        description: "Land area updated successfully!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update land: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const deleteLandMutation = useMutation({
    mutationFn: async (landId: string) => {
      const response = await fetch(`/api/lands/${landId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lands"] });
      toast({
        title: "Success",
        description: "Land area deleted successfully!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to delete land: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      latitude: 0,
      longitude: 0,
      address: "",
      area: 0,
      soilType: "",
      notes: "",
    });
    setSelectedLocation(null);
  };

  const handleLocationSelect = (data: {
    lat: number;
    lng: number;
    address: string;
    soilType?: string;
    placeName: string;
  }) => {
    setSelectedLocation({ lat: data.lat, lng: data.lng, address: data.address });
    setFormData(prev => ({
      ...prev,
      name: prev.name || data.placeName,
      latitude: data.lat,
      longitude: data.lng,
      address: data.address,
      soilType: prev.soilType || data.soilType || ''
    }));
  };



  const handleEditLand = (land: LandArea) => {
    setSelectedLand(land);
    setFormData({
      name: land.name,
      latitude: land.latitude,
      longitude: land.longitude,
      address: land.address || "",
      area: land.area || 0,
      soilType: land.soilType || "",
      notes: land.notes || "",
    });
    setSelectedLocation({ 
      lat: land.latitude, 
      lng: land.longitude, 
      address: land.address || "" 
    });
    setShowEditDialog(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate that location is selected
    if (!formData.latitude || !formData.longitude) {
      toast({
        title: "Location Required",
        description: "Please search and select a location on the map before submitting.",
        variant: "destructive",
      });
      return;
    }
    
    if (selectedLand) {
      updateLandMutation.mutate({ landId: selectedLand.id, updates: formData });
    } else {
      addLandMutation.mutate(formData);
    }
  };

  if (authLoading || !user) {
    return <div className="p-4 md:p-8"><Skeleton className="h-96" /></div>;
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">🗺️ {t("my_land_areas")}</h1>
          <p className="text-muted-foreground">
            {t("manage_agricultural_lands")}
          </p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {t("add_land")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("add_new_land_area")}</DialogTitle>
              <DialogDescription>
                {t("search_and_select_land_location")}
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Land Location */}
              <div className="space-y-4">
                <Label className="text-base font-medium">{t("land_location")}</Label>
                <MapComponent
                  onLocationSelect={handleLocationSelect}
                  selectedLocation={selectedLocation}
                  height="350px"
                />
                {selectedLocation && (
                  <div className="p-4 bg-muted rounded-lg space-y-2">
                    <p className="text-sm font-medium text-green-700">✓ Location Selected</p>
                    <p className="text-sm text-muted-foreground">
                      <strong>Address:</strong> {selectedLocation.address}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Coordinates: {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                    </p>
                  </div>
                )}
              </div>

              {/* Land Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Land Name</Label>
                  <Input 
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., North Field, Main Farm"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input 
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Auto-filled from map selection"
                    readOnly
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="area">Area (hectares)</Label>
                  <Input 
                    id="area"
                    type="number"
                    step="0.1"
                    value={formData.area || ""}
                    onChange={(e) => setFormData(prev => ({ ...prev, area: parseFloat(e.target.value) || 0 }))}
                    placeholder="0.0"
                  />
                </div>
                <div>
                  <Label htmlFor="soilType">Soil Type</Label>
                  <Input 
                    id="soilType"
                    value={formData.soilType}
                    onChange={(e) => setFormData(prev => ({ ...prev, soilType: e.target.value }))}
                    placeholder="Auto-detected from location"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Soil type is automatically detected when you select a location. You can modify it if needed.
                  </p>
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea 
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any additional notes about this land..."
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={addLandMutation.isPending}>
                  {addLandMutation.isPending ? t("adding") : t("add_land")}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                  {t("cancel")}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lands Grid */}
      {landsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      ) : lands && lands.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lands.map((land) => (
            <Card key={land.id} className="hover:shadow-lg transition-all duration-200">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2 text-xl font-bold text-green-800 dark:text-green-400">
                      {land.name}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {land.address && (
                        <span className="text-xs block mb-1">{land.address}</span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {land.latitude.toFixed(4)}°, {land.longitude.toFixed(4)}°
                      </span>
                    </CardDescription>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEditLand(land)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteLandMutation.mutate(land.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {land.area && (
                    <div className="flex items-center gap-2 text-sm">
                      <TrendingUp className="w-4 h-4 text-blue-500" />
                      <span>{land.area} hectares</span>
                    </div>
                  )}
                  
                  {land.soilType && (
                    <div className="flex items-center gap-2 text-sm">
                      <Sprout className="w-4 h-4 text-brown-500" />
                      <Badge variant="secondary" className="capitalize">
                        {land.soilType} soil
                      </Badge>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>Added {new Date(land.createdAt).toLocaleDateString()}</span>
                  </div>

                  {land.notes && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {land.notes}
                    </p>
                  )}

                  
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-16">
            <div className="text-center flex flex-col items-center">
              {/* <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-6">
                <span className="text-4xl">🌱</span>
              </div> */}
              <h3 className="text-2xl font-bold text-green-800 dark:text-green-400 mb-2">No Land Areas Yet</h3>
              <p className="text-muted-foreground max-w-md mx-auto mb-6">
                Add your first land area to start getting location-specific AI predictions and agricultural insights.
              </p>
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Land
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
            <DialogTitle>{t("edit_land_area")}</DialogTitle>
            <DialogDescription>
              {t("update_land_location_and_details")}
            </DialogDescription>
          </DialogHeader>          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Land Location */}
            <div className="space-y-4">
              <Label className="text-base font-medium">Land Location</Label>
              <MapComponent
                onLocationSelect={handleLocationSelect}
                selectedLocation={selectedLocation}
                height="350px"
              />
              {selectedLocation && (
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <p className="text-sm font-medium text-green-700">✓ Location Selected</p>
                  <p className="text-sm text-muted-foreground">
                    <strong>Address:</strong> {selectedLocation.address}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Coordinates: {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                  </p>
                </div>
              )}
            </div>

            {/* Land Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-name">Land Name</Label>
                <Input 
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., North Field, Main Farm"
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-address">Address</Label>
                <Input 
                  id="edit-address"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Auto-filled from map selection"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-area">Area (hectares)</Label>
                <Input 
                  id="edit-area"
                  type="number"
                  step="0.1"
                  value={formData.area || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, area: parseFloat(e.target.value) || 0 }))}
                  placeholder="0.0"
                />
              </div>
              <div>
                <Label htmlFor="edit-soilType">Soil Type</Label>
                <Input 
                  id="edit-soilType"
                  value={formData.soilType}
                  onChange={(e) => setFormData(prev => ({ ...prev, soilType: e.target.value }))}
                  placeholder="Auto-detected from location"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Soil type is automatically detected when you select a location. You can modify it if needed.
                </p>
              </div>
            </div>

            <div>
              <Label htmlFor="edit-notes">Notes (Optional)</Label>
              <Textarea 
                id="edit-notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Any additional notes about this land..."
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={updateLandMutation.isPending}>
                {updateLandMutation.isPending ? "Updating..." : "Update Land"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}