import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface LocationSetupProps {
  open: boolean;
  onComplete: () => void;
}

export function LocationSetup({ open, onComplete }: LocationSetupProps) {
  const { toast } = useToast();
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const updateLocationMutation = useMutation({
    mutationFn: async (coords: { latitude: number; longitude: number }) => {
      return await apiRequest("POST", "/api/location/update", coords);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Location Saved",
        description: "Your farm location has been set successfully!",
      });
      onComplete();
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to save location. Please try again.",
        variant: "destructive",
      });
      setIsGettingLocation(false);
    },
  });

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Not Supported",
        description: "Geolocation is not supported by your browser.",
        variant: "destructive",
      });
      return;
    }

    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        updateLocationMutation.mutate({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        setIsGettingLocation(false);
        toast({
          title: "Location Error",
          description: "Unable to get your location. Please enable location access and try again.",
          variant: "destructive",
        });
        console.error("Geolocation error:", error);
      }
    );
  };

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md border-none shadow-2xl bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
            Set Your Farm Location
          </DialogTitle>
          <DialogDescription className="text-base pt-2">
            To provide accurate weather data and crop recommendations, we need to know your farm's location.
            Your location will only be used to fetch relevant agricultural information.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center py-8 space-y-4">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 flex items-center justify-center animate-pulse">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-200 to-emerald-200 dark:from-green-800/40 dark:to-emerald-800/40 flex items-center justify-center">
               <span className="text-3xl">📍</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground text-center max-w-xs">
            Click the button below to automatically detect your location using GPS
          </p>
        </div>
        <DialogFooter>
          <Button
            onClick={handleGetLocation}
            disabled={isGettingLocation || updateLocationMutation.isPending}
            className="w-full h-12 text-lg font-medium bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg shadow-green-500/20 transition-all duration-300 hover:scale-[1.02]"
            data-testid="button-get-location"
          >
            {isGettingLocation || updateLocationMutation.isPending ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Getting Location...
              </>
            ) : (
              "Get My Location"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
