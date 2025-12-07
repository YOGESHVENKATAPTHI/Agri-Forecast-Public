import axios from "axios";

export interface EnhancedLocationData {
  coordinates: {
    latitude: number;
    longitude: number;
    altitude?: number;
    accuracy?: number;
  };
  address: {
    formatted: string;
    components: {
      country?: string;
      state?: string;
      district?: string;
      subDistrict?: string;
      village?: string;
      pincode?: string;
    };
  };
  soilType: {
    primary: string;
    secondary?: string;
    pH: number;
    fertility: "Low" | "Medium" | "High";
    drainage: "Poor" | "Moderate" | "Good";
  };
  climateZone: {
    koppen: string;
    description: string;
    zone: number;
  };
  agriculture: {
    suitability: "Excellent" | "Good" | "Fair" | "Poor";
    primaryCrops: string[];
    waterAvailability: "Abundant" | "Moderate" | "Scarce";
    marketAccess: "High" | "Medium" | "Low";
  };
}

export class EnhancedLocationService {
  private soilApiCache = new Map();
  private climateCache = new Map();

  async getEnhancedLocationData(
    latitude: number, 
    longitude: number,
    useGPS = false
  ): Promise<EnhancedLocationData> {
    try {
      console.log(` Getting enhanced location data for: ${latitude}, ${longitude}`);

      // Get high-precision coordinates if GPS is requested
      let finalCoordinates = { latitude, longitude };
      if (useGPS && typeof navigator !== 'undefined' && navigator.geolocation) {
        try {
          finalCoordinates = await this.getHighPrecisionCoordinates();
        } catch (error) {
          console.warn("High-precision GPS failed, using provided coordinates:", error);
        }
      }

      // Parallel data fetching for efficiency
      const [addressData, soilData, climateData, agricultureData] = await Promise.allSettled([
        this.getDetailedAddress(finalCoordinates.latitude, finalCoordinates.longitude),
        this.getSoilInformation(finalCoordinates.latitude, finalCoordinates.longitude),
        this.getClimateZoneData(finalCoordinates.latitude, finalCoordinates.longitude),
        this.getAgricultureSuitability(finalCoordinates.latitude, finalCoordinates.longitude)
      ]);

      const result: EnhancedLocationData = {
        coordinates: {
          latitude: finalCoordinates.latitude,
          longitude: finalCoordinates.longitude,
        },
        address: addressData.status === 'fulfilled' ? addressData.value : {
          formatted: `${latitude}, ${longitude}`,
          components: {}
        },
        soilType: soilData.status === 'fulfilled' ? soilData.value : {
          primary: "Loam",
          pH: 6.5,
          fertility: "Medium",
          drainage: "Moderate"
        },
        climateZone: climateData.status === 'fulfilled' ? climateData.value : {
          koppen: "Unknown",
          description: "Temperate",
          zone: 3
        },
        agriculture: agricultureData.status === 'fulfilled' ? agricultureData.value : {
          suitability: "Good",
          primaryCrops: ["Rice", "Wheat"],
          waterAvailability: "Moderate",
          marketAccess: "Medium"
        }
      };

      console.log(`✅ Enhanced location data retrieved with ${Object.keys(result).length} components`);
      return result;

    } catch (error) {
      console.error("Error getting enhanced location data:", error);
      throw error;
    }
  }

  private async getHighPrecisionCoordinates(): Promise<{ latitude: number; longitude: number }> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation not supported"));
        return;
      }

      const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000 // 1 minute cache
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          reject(error);
        },
        options
      );
    });
  }

  private async getDetailedAddress(latitude: number, longitude: number): Promise<any> {
    try {
      // Use multiple geocoding services for reliability
      const [nominatimResult, placesResult] = await Promise.allSettled([
        this.getNominatimAddress(latitude, longitude),
        this.getGooglePlacesAddress(latitude, longitude)
      ]);

      // Use the most detailed result available
      if (placesResult.status === 'fulfilled' && placesResult.value) {
        return placesResult.value;
      }
      if (nominatimResult.status === 'fulfilled' && nominatimResult.value) {
        return nominatimResult.value;
      }

      // Fallback to coordinates
      return {
        formatted: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
        components: {}
      };
    } catch (error) {
      console.error("Error getting detailed address:", error);
      return {
        formatted: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
        components: {}
      };
    }
  }

  private async getNominatimAddress(latitude: number, longitude: number): Promise<any> {
    try {
      const response = await axios.get("https://nominatim.openstreetmap.org/reverse", {
        params: {
          lat: latitude,
          lon: longitude,
          format: "json",
          zoom: 18,
          addressdetails: 1
        },
        headers: {
          "User-Agent": "AgriPredict/2.0 (Enhanced Agricultural Platform)"
        },
        timeout: 5000
      });

      const data = response.data;
      return {
        formatted: data.display_name || `${latitude}, ${longitude}`,
        components: {
          country: data.address?.country,
          state: data.address?.state,
          district: data.address?.county || data.address?.district,
          subDistrict: data.address?.municipality || data.address?.city,
          village: data.address?.village || data.address?.town,
          pincode: data.address?.postcode
        }
      };
    } catch (error) {
      console.error("Nominatim geocoding failed:", error);
      return null;
    }
  }

  private async getGooglePlacesAddress(latitude: number, longitude: number): Promise<any> {
    try {
      const apiKey = process.env.GOOGLE_PLACES_API_KEY;
      if (!apiKey) {
        console.log("Google Places API key not configured");
        return null;
      }

      const response = await axios.get("https://maps.googleapis.com/maps/api/geocode/json", {
        params: {
          latlng: `${latitude},${longitude}`,
          key: apiKey,
          result_type: "street_address|locality|administrative_area_level_1"
        },
        timeout: 5000
      });

      const data = response.data;
      if (data.status === "OK" && data.results.length > 0) {
        const result = data.results[0];
        const components: any = {};
        
        result.address_components.forEach((component: any) => {
          if (component.types.includes("country")) components.country = component.long_name;
          if (component.types.includes("administrative_area_level_1")) components.state = component.long_name;
          if (component.types.includes("administrative_area_level_2")) components.district = component.long_name;
          if (component.types.includes("locality")) components.subDistrict = component.long_name;
          if (component.types.includes("sublocality")) components.village = component.long_name;
          if (component.types.includes("postal_code")) components.pincode = component.long_name;
        });

        return {
          formatted: result.formatted_address,
          components
        };
      }
      return null;
    } catch (error) {
      console.error("Google Places geocoding failed:", error);
      return null;
    }
  }

  private async getSoilInformation(latitude: number, longitude: number): Promise<any> {
    try {
      const cacheKey = `soil_${Math.round(latitude * 100)}_${Math.round(longitude * 100)}`;
      const cached = this.soilApiCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) {
        return cached.data;
      }

      // Try multiple soil data sources
      const [isricResult, soilGridsResult, localResult] = await Promise.allSettled([
        this.getISRICSoilData(latitude, longitude),
        this.getSoilGridsData(latitude, longitude),
        this.getLocalSoilEstimate(latitude, longitude)
      ]);

      let soilData = null;
      if (isricResult.status === 'fulfilled') soilData = isricResult.value;
      else if (soilGridsResult.status === 'fulfilled') soilData = soilGridsResult.value;
      else if (localResult.status === 'fulfilled') soilData = localResult.value;

      if (!soilData) {
        // Fallback to geographic estimates
        soilData = this.estimateSoilByLocation(latitude, longitude);
      }

      // Cache the result
      this.soilApiCache.set(cacheKey, {
        data: soilData,
        timestamp: Date.now()
      });

      return soilData;
    } catch (error) {
      console.error("Error getting soil information:", error);
      return this.estimateSoilByLocation(latitude, longitude);
    }
  }

  private async getISRICSoilData(latitude: number, longitude: number): Promise<any> {
    try {
      // ISRIC SoilGrids API requires separate calls for each property
      const baseParams = {
        lon: longitude,
        lat: latitude,
        depth: "0-5cm",
        value: "mean"
      };

      // Try single combined request first (faster), fall back to individual requests if needed
      let clayRes, sandRes, siltRes, phRes, nitrogenRes;
      
      try {
        // Try combined request as in chat.js
        const combinedResponse = await axios.get("https://rest.isric.org/soilgrids/v2.0/properties/query", {
          params: {
            ...baseParams,
            property: "clay,sand,silt,phh2o,nitrogen"
          },
          timeout: 5000
        });
        
        console.log("✅ ISRIC combined request succeeded");
        const layers = combinedResponse.data.properties.layers;
        clayRes = { status: 'fulfilled', value: { data: { properties: { layers: layers.filter(l => l.name === 'clay') } } } };
        sandRes = { status: 'fulfilled', value: { data: { properties: { layers: layers.filter(l => l.name === 'sand') } } } };
        siltRes = { status: 'fulfilled', value: { data: { properties: { layers: layers.filter(l => l.name === 'silt') } } } };
        phRes = { status: 'fulfilled', value: { data: { properties: { layers: layers.filter(l => l.name === 'phh2o') } } } };
        nitrogenRes = { status: 'fulfilled', value: { data: { properties: { layers: layers.filter(l => l.name === 'nitrogen') } } } };
        
      } catch (error) {
        console.log("⚠️ ISRIC combined request failed, using individual requests");
        
        // Fall back to individual requests
        const requests = await Promise.allSettled([
          axios.get("https://rest.isric.org/soilgrids/v2.0/properties/query", {
            params: { ...baseParams, property: "clay" },
            timeout: 5000
          }),
          axios.get("https://rest.isric.org/soilgrids/v2.0/properties/query", {
            params: { ...baseParams, property: "sand" },
            timeout: 5000
          }),
          axios.get("https://rest.isric.org/soilgrids/v2.0/properties/query", {
            params: { ...baseParams, property: "silt" },
            timeout: 5000
          }),
          axios.get("https://rest.isric.org/soilgrids/v2.0/properties/query", {
            params: { ...baseParams, property: "phh2o" },
            timeout: 5000
          }),
          axios.get("https://rest.isric.org/soilgrids/v2.0/properties/query", {
            params: { ...baseParams, property: "nitrogen" },
            timeout: 5000
          })
        ]);
        
        [clayRes, sandRes, siltRes, phRes, nitrogenRes] = requests;
      }

      // Extract values from successful responses with fallbacks
      const clay = clayRes.status === 'fulfilled' 
        ? clayRes.value.data.properties?.layers?.[0]?.depths?.[0]?.values?.mean || 200
        : 200; // Default 20% as 200 g/kg
      
      const sand = sandRes.status === 'fulfilled' 
        ? sandRes.value.data.properties?.layers?.[0]?.depths?.[0]?.values?.mean || 400
        : 400; // Default 40% as 400 g/kg
      
      const silt = siltRes.status === 'fulfilled' 
        ? siltRes.value.data.properties?.layers?.[0]?.depths?.[0]?.values?.mean || 400
        : 400; // Default 40% as 400 g/kg
      
      const phValue = phRes.status === 'fulfilled' 
        ? phRes.value.data.properties?.layers?.[0]?.depths?.[0]?.values?.mean || 65
        : 65; // Default pH 6.5 as 65 (pH*10)
      
      const ph = phValue / 10; // Convert from pH*10 to pH
      
      const nitrogen = nitrogenRes.status === 'fulfilled' 
        ? nitrogenRes.value.data.properties?.layers?.[0]?.depths?.[0]?.values?.mean || 1000
        : 1000; // Default nitrogen in mg/kg

      // Convert units: clay/sand/silt from g/kg to percentage (divide by 10)
      const clayPercent = clay / 10;
      const sandPercent = sand / 10;
      const siltPercent = silt / 10;

      // Determine soil type based on texture
      let soilType = "Loam";
      if (clayPercent > 40) soilType = "Clay";
      else if (sandPercent > 70) soilType = "Sandy";
      else if (siltPercent > 40) soilType = "Silty loam";
      else if (clayPercent > 25) soilType = "Clay loam";
      else if (sandPercent > 50) soilType = "Sandy loam";

      console.log(`✅ ISRIC SoilGrids: Clay ${clayPercent}%, Sand ${sandPercent}%, Silt ${siltPercent}%, pH ${ph.toFixed(1)}`);

      return {
        primary: soilType,
        secondary: this.getSecondaryType(clayPercent, sandPercent, siltPercent),
        pH: ph,
        fertility: this.determineFertility(ph, nitrogen),
        drainage: this.determineDrainage(clayPercent, sandPercent)
      };
    } catch (error) {
      console.error("ISRIC SoilGrids API failed:", error);
      return null;
    }
  }

  private async getSoilGridsData(latitude: number, longitude: number): Promise<any> {
    // Alternative soil data source implementation
    // This would use another soil database API
    return null;
  }

  private async getLocalSoilEstimate(latitude: number, longitude: number): Promise<any> {
    // Local soil database lookup based on region
    // This would use regional soil survey data
    return null;
  }

  private estimateSoilByLocation(latitude: number, longitude: number): any {
    // Geographical soil type estimation
    let soilType = "Loam";
    let pH = 6.5;
    let fertility: "Low" | "Medium" | "High" = "Medium";
    let drainage: "Poor" | "Moderate" | "Good" = "Moderate";

    // India-specific soil patterns (can be extended for other regions)
    if (latitude > 30) { // Northern plains
      soilType = "Alluvial";
      fertility = "High";
      drainage = "Good";
    } else if (latitude > 20) { // Central India
      soilType = "Black cotton soil";
      pH = 7.5;
      fertility = "High";
      drainage = "Poor";
    } else if (latitude > 15) { // Western Ghats
      soilType = "Red laterite";
      pH = 5.5;
      fertility = "Medium";
      drainage = "Good";
    } else { // Southern coastal
      soilType = "Coastal alluvium";
      fertility = "Medium";
      drainage = "Moderate";
    }

    // Coastal adjustments
    if (Math.abs(longitude - 77) < 10) { // Near western coast
      soilType = "Coastal sandy";
      drainage = "Good";
      fertility = "Low";
    }

    return { primary: soilType, pH, fertility, drainage };
  }

  private getSecondaryType(clay: number, sand: number, silt: number): string {
    if (clay > 35) return "Heavy clay";
    if (sand > 60) return "Sandy";
    if (silt > 35) return "Silty";
    return "Well-balanced";
  }

  private determineFertility(ph: number, nitrogen: number): "Low" | "Medium" | "High" {
    let score = 0;
    
    // pH score (optimal 6.0-7.5)
    if (ph >= 6.0 && ph <= 7.5) score += 2;
    else if (ph >= 5.5 && ph <= 8.0) score += 1;
    
    // Nitrogen score (rough estimation)
    if (nitrogen > 2000) score += 2;
    else if (nitrogen > 1000) score += 1;
    
    if (score >= 3) return "High";
    if (score >= 1) return "Medium";
    return "Low";
  }

  private determineDrainage(clay: number, sand: number): "Poor" | "Moderate" | "Good" {
    if (clay > 50) return "Poor";
    if (sand > 70) return "Good";
    return "Moderate";
  }

  private async getClimateZoneData(latitude: number, longitude: number): Promise<any> {
    try {
      const cacheKey = `climate_${Math.round(latitude)}_${Math.round(longitude)}`;
      const cached = this.climateCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < 7 * 24 * 60 * 60 * 1000) {
        return cached.data;
      }

      // Simple Köppen climate classification based on latitude
      let koppen = "Cfa"; // Humid subtropical
      let description = "Humid subtropical";
      let zone = 3;

      if (latitude > 35) {
        koppen = "Cfb";
        description = "Oceanic";
        zone = 5;
      } else if (latitude > 25) {
        koppen = "Cfa";
        description = "Humid subtropical";
        zone = 4;
      } else if (latitude > 15) {
        koppen = "Aw";
        description = "Tropical savanna";
        zone = 2;
      } else {
        koppen = "Am";
        description = "Tropical monsoon";
        zone = 1;
      }

      const result = { koppen, description, zone };
      
      this.climateCache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      return result;
    } catch (error) {
      console.error("Error determining climate zone:", error);
      return {
        koppen: "Unknown",
        description: "Temperate",
        zone: 3
      };
    }
  }

  private async getAgricultureSuitability(latitude: number, longitude: number): Promise<any> {
    try {
      // Agriculture suitability based on location analysis
      let suitability: "Excellent" | "Good" | "Fair" | "Poor" = "Good";
      let primaryCrops: string[] = ["Rice", "Wheat"];
      let waterAvailability: "Abundant" | "Moderate" | "Scarce" = "Moderate";
      let marketAccess: "High" | "Medium" | "Low" = "Medium";

      // India-specific agriculture patterns
      if (latitude > 30 && latitude < 35) { // Punjab, Haryana
        suitability = "Excellent";
        primaryCrops = ["Wheat", "Rice", "Cotton"];
        waterAvailability = "Abundant";
        marketAccess = "High";
      } else if (latitude > 20 && latitude < 25) { // Maharashtra, MP
        suitability = "Good";
        primaryCrops = ["Cotton", "Soybean", "Sugarcane"];
        waterAvailability = "Moderate";
        marketAccess = "High";
      } else if (latitude > 10 && latitude < 20) { // South India
        suitability = "Good";
        primaryCrops = ["Rice", "Millets", "Coconut"];
        waterAvailability = "Moderate";
        marketAccess = "Medium";
      } else if (latitude < 10) { // Extreme south
        suitability = "Excellent";
        primaryCrops = ["Rice", "Coconut", "Spices"];
        waterAvailability = "Abundant";
        marketAccess = "High";
      }

      // Adjust for coastal regions
      if (Math.abs(longitude - 73) < 5 || Math.abs(longitude - 80) < 5) {
        primaryCrops = ["Coconut", "Rice", "Cashew"];
        waterAvailability = "Abundant";
      }

      return {
        suitability,
        primaryCrops,
        waterAvailability,
        marketAccess
      };
    } catch (error) {
      console.error("Error assessing agriculture suitability:", error);
      return {
        suitability: "Good",
        primaryCrops: ["Rice", "Wheat"],
        waterAvailability: "Moderate",
        marketAccess: "Medium"
      };
    }
  }
}

export const enhancedLocationService = new EnhancedLocationService();