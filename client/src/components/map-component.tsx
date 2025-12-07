import React, { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Input } from '@/components/ui/input';
import { Search, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// Fix for default marker icons in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Create a custom green marker icon
const greenIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg">
      <path d="M12.5 0C5.6 0 0 5.6 0 12.5c0 12.5 12.5 28.5 12.5 28.5s12.5-16 12.5-28.5C25 5.6 19.4 0 12.5 0z" fill="#22c55e"/>
      <circle cx="12.5" cy="12.5" r="6" fill="white"/>
    </svg>
  `),
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

// Interface for both display-only and interactive map
interface MapComponentProps {
  // For display-only mode (existing usage)
  latitude?: number;
  longitude?: number;
  address?: string;
  className?: string;
  
  // For interactive mode (land selection)
  onLocationSelect?: (data: {
    lat: number;
    lng: number;
    address: string;
    soilType?: string;
    placeName: string;
  }) => void;
  selectedLocation?: { lat: number; lng: number; address?: string } | null;
  height?: string;
}

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  
  return null;
}

function LocationSelector({ onLocationSelect }: { 
  onLocationSelect: (data: {
    lat: number;
    lng: number;
    address: string;
    soilType?: string;
    placeName: string;
  }) => void 
}) {
  const [isSearching, setIsSearching] = useState(false);

  // Fetch address from coordinates using Nominatim
  const fetchAddress = async (lat: number, lng: number): Promise<{ address: string; placeName: string }> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`
      );
      
      if (response.ok) {
        const data = await response.json();
        return {
          address: data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
          placeName: data.address?.village || data.address?.town || data.address?.city || data.address?.county || 'Selected Location'
        };
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    }
    
    return {
      address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
      placeName: 'Selected Location'
    };
  };

  // Use the global estimateSoilTypeByLocation function defined outside

  useMapEvents({
    click: async (e) => {
      const { lat, lng } = e.latlng;
      setIsSearching(true);
      
      try {
        const { address, placeName } = await fetchAddress(lat, lng);
        const soilType = estimateSoilTypeByLocation(lat, lng);
        
        onLocationSelect({
          lat,
          lng,
          address,
          soilType,
          placeName
        });
      } catch (error) {
        console.error('Error processing location selection:', error);
        toast({
          title: "Location Error",
          description: "Failed to fetch location details. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsSearching(false);
      }
    }
  });

  return null;
}

// Enhanced soil type estimation based on geographic location
const estimateSoilTypeByLocation = (lat: number, lng: number): string => {
  // India-specific soil type estimation with more precision
  if (lat >= 8 && lat <= 37 && lng >= 68 && lng <= 97) {
    // Northern plains
    if (lat >= 28) return 'Alluvial soils (Indo-Gangetic plains)';
    // Central plateau
    if (lat >= 20 && lat <= 28) {
      if (lng >= 75 && lng <= 85) return 'Black cotton soils (Deccan plateau)';
      return 'Mixed red and black soils';
    }
    // Southern regions
    if (lat >= 8 && lat <= 20) {
      if (lng >= 77) return 'Red laterite soils (Eastern regions)';
      if (lng >= 73 && lng <= 77) return 'Red soils (Western Ghats)';
      return 'Red soils (Peninsular region)';
    }
    return 'Red soils (Peninsular region)';
  }
  return 'Mixed soil type';
};

export function MapComponent(props: MapComponentProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([20.5937, 78.9629]); // Center of India
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // Determine if this is interactive mode or display mode
  const isInteractive = !!props.onLocationSelect;

  // For display mode, use provided coordinates
  const displayPosition: [number, number] = props.latitude && props.longitude 
    ? [props.latitude, props.longitude] 
    : mapCenter;

  // For interactive mode, use selected location or default center
  const interactiveCenter = props.selectedLocation 
    ? [props.selectedLocation.lat, props.selectedLocation.lng] as [number, number]
    : mapCenter;

  const center = isInteractive ? interactiveCenter : displayPosition;

  // Real-time search with suggestions
  const searchPlaces = async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=in&limit=8&addressdetails=1`
      );
      
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
        setShowResults(data.length > 0);
      }
    } catch (error) {
      console.warn('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Debounce search
    searchTimeoutRef.current = setTimeout(() => {
      searchPlaces(value);
    }, 250);
  };

  const selectSearchResult = (result: any) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    
    // Update map center
    setMapCenter([lat, lng]);
    
    // Get soil type
    const soilType = estimateSoilTypeByLocation(lat, lng);
    
    // Call the location select handler
    if (props.onLocationSelect) {
      props.onLocationSelect({
        lat,
        lng,
        address: result.display_name,
        soilType,
        placeName: result.address?.village || result.address?.town || result.address?.city || result.address?.county || result.name || 'Selected Location'
      });
    }

    // Clear search
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
  };

  if (isInteractive) {
    // Interactive mode for land selection
    return (
      <div className="space-y-4">
        {/* Search Bar with Real-time Results */}
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              type="text"
              placeholder="Search for a place, city, or address..."
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => {
                if (searchResults.length > 0) {
                  setShowResults(true);
                }
              }}
              onBlur={() => setTimeout(() => setShowResults(false), 200)}
              className="pl-10 pr-10"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin" />
            )}
          </div>
          
          {/* Search Results Dropdown */}
          {showResults && searchResults.length > 0 && (
            <div className="absolute top-full mt-1 w-full bg-background border rounded-md shadow-lg max-h-60 overflow-y-auto z-[1000]">
              {searchResults.map((result, index) => (
                <button
                  key={`${result.place_id}-${index}`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectSearchResult(result);
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-muted transition-colors border-b last:border-b-0 flex items-start gap-2"
                >
                  <div className="h-2 w-2 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {result.display_name.split(',').slice(0, 2).join(', ')}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {result.display_name}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
          
          <p className="text-xs text-muted-foreground mt-1">
            🔍 Type to search places or click anywhere on the map to select location
          </p>
        </div>

        {/* Map */}
        <div style={{ height: props.height || "400px" }} className="relative rounded-lg border overflow-hidden">
          <MapContainer
            center={center}
            zoom={6}
            className="w-full h-full"
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapUpdater center={center} />
            <LocationSelector onLocationSelect={props.onLocationSelect!} />
            
            {props.selectedLocation && (
              <Marker 
                position={[props.selectedLocation.lat, props.selectedLocation.lng]}
                icon={greenIcon}
              >
                <Popup>
                  <div className="text-sm">
                    <strong>Selected Location</strong><br />
                    {props.selectedLocation.address || `${props.selectedLocation.lat.toFixed(6)}, ${props.selectedLocation.lng.toFixed(6)}`}
                  </div>
                </Popup>
              </Marker>
            )}
          </MapContainer>
          
          {isSearching && (
            <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-[1000]">
              <div className="flex items-center gap-2 bg-background px-4 py-2 rounded-lg shadow-lg">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Fetching location data...</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  } else {
    // Display mode (existing functionality)
    return (
      <div className={props.className || "h-64 md:h-96"} data-testid="map-container">
        <MapContainer
          center={displayPosition}
          zoom={13}
          scrollWheelZoom={false}
          className="w-full h-full rounded-md"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapUpdater center={displayPosition} />
          <Marker position={displayPosition}>
            <Popup>
              {props.address || `Location: ${props.latitude?.toFixed(4)}, ${props.longitude?.toFixed(4)}`}
            </Popup>
          </Marker>
        </MapContainer>
      </div>
    );
  }
}
