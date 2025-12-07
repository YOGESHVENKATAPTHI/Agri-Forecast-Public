import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';

export interface LandArea {
  id: number;
  userId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  soilType?: string | null;
  area?: number | null;
  currentCrop?: string | null;
  description?: string | null;
  isMainLand?: boolean;
  cropHistory?: string | null;
  notes?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface LandContextType {
  lands: LandArea[];
  selectedLand: LandArea | null;
  setSelectedLand: (land: LandArea | null) => void;
  isLoading: boolean;
  error: Error | null;
  refetchLands: () => void;
}

const LandContext = createContext<LandContextType | undefined>(undefined);

interface LandProviderProps {
  children: ReactNode;
}

export function LandProvider({ children }: LandProviderProps) {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [selectedLand, setSelectedLand] = useState<LandArea | null>(null);

  // Fetch lands from API
  const { data: lands = [], isLoading, error, refetch } = useQuery({
    queryKey: ['/api/lands'],
    queryFn: async (): Promise<LandArea[]> => {
      const response = await fetch('/api/lands', {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch lands');
      }
      
      return response.json();
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Auto-select main land or first land when lands are loaded
  useEffect(() => {
    if (lands.length > 0 && !selectedLand) {
      // Find main land first
      const mainLand = lands.find(land => land.isMainLand);
      if (mainLand) {
        setSelectedLand(mainLand);
      } else {
        // If no main land, select the first one and mark it as main
        const firstLand = lands[0];
        setSelectedLand({ ...firstLand, isMainLand: true });
        // Update the land to be main land in the backend
        updateMainLand(firstLand.id);
      }
    }
  }, [lands, selectedLand]);

  // Update main land in backend
  const updateMainLand = async (landId: number) => {
    try {
      await fetch(`/api/lands/${landId}/set-main`, {
        method: 'POST',
        credentials: 'include',
      });
      // Refetch lands to get updated data
      refetch();
    } catch (error) {
      console.error('Failed to set main land:', error);
    }
  };

  // Handle land selection change
  const handleLandChange = (land: LandArea | null) => {
    setSelectedLand(land);
    // Invalidate queries that depend on selected land
    queryClient.invalidateQueries({ queryKey: ['weather'] });
    queryClient.invalidateQueries({ queryKey: ['predictions'] });
    queryClient.invalidateQueries({ queryKey: ['crops'] });
    queryClient.invalidateQueries({ queryKey: ['chat-history'] });
  };

  const value: LandContextType = {
    lands,
    selectedLand,
    setSelectedLand: handleLandChange,
    isLoading,
    error: error as Error | null,
    refetchLands: refetch,
  };

  return <LandContext.Provider value={value}>{children}</LandContext.Provider>;
}

export function useLand() {
  const context = useContext(LandContext);
  if (context === undefined) {
    throw new Error('useLand must be used within a LandProvider');
  }
  return context;
}

// Hook to get selected land coordinates for API calls
export function useSelectedLandCoordinates() {
  const { selectedLand } = useLand();
  
  return {
    latitude: selectedLand?.latitude,
    longitude: selectedLand?.longitude,
    landId: selectedLand?.id,
    landName: selectedLand?.name,
    hasLocation: !!(selectedLand?.latitude && selectedLand?.longitude),
  };
}