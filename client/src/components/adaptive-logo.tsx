import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Enhanced logo component that dynamically adapts colors to match the background gradient in real-time.
 * Provides smooth color transitions every millisecond for perfect blending with the animated background.
 */
interface AdaptiveLogoProps {
  /** Size variant for the logo */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Custom width (overrides size) */
  width?: number;
  /** Custom height (overrides size) */
  height?: number;
  /** Additional CSS classes to apply */
  className?: string;
  /** Optional inline styles */
  style?: React.CSSProperties;
  /** Accessible label for screen readers */
  ariaLabel?: string;
}

const sizeMap = {
  sm: { width: 16, height: 16 },
  md: { width: 24, height: 24 },
  lg: { width: 40, height: 40 },
  xl: { width: 96, height: 96 }
};

interface ColorState {
  hue: number;
  saturation: number;
  lightness: number;
  contrast: number;
  glow: number;
  secondaryLightness: number;
}

export const AdaptiveLogo: React.FC<AdaptiveLogoProps> = ({
  size = 'md',
  width,
  height,
  className,
  style,
  ariaLabel = 'Agri-Forecast Logo'
}) => {
  const logoRef = useRef<HTMLDivElement>(null);
  const [colorState, setColorState] = useState<ColorState>({
    hue: 0,
    saturation: 0,
    lightness: 50,
    contrast: 1,
    glow: 0,
    secondaryLightness: 0
  });
  
  const dimensions = {
    width: width || sizeMap[size].width,
    height: height || sizeMap[size].height
  };

  useEffect(() => {
    let animationId: number;

    const updateLogoColors = () => {
      // Sync with the background using CSS custom properties
      const currentLightness = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--current-lightness') || '0.5');
      const currentCycle = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--current-cycle') || '0');
      
      // Advanced color calculation perfectly synced with background
      let hue = 0;
      let saturation = 0;
      let lightness = 50;
      let contrast = 1;
      let glow = 0;
      
      if (currentCycle < 0.25) { // Sunrise to Noon
        const t = currentCycle / 0.25;
        hue = 220 - (20 * t); // Blue to cyan
        saturation = 20 + (30 * t); // Low to medium saturation
        lightness = 30 + (50 * t); // Dark to bright
        contrast = 1.1 + (0.4 * t);
        glow = 0.1 * (1 - t); // Slight morning glow
      } else if (currentCycle < 0.5) { // Noon to Sunset
        const t = (currentCycle - 0.25) / 0.25;
        hue = 200 - (160 * t); // Cyan to orange
        saturation = 50 + (40 * t); // Medium to high saturation
        lightness = 80 - (25 * t); // Bright to medium-bright
        contrast = 1.5 - (0.1 * t);
        glow = 0.1 + (0.3 * t); // Building sunset glow
      } else if (currentCycle < 0.75) { // Sunset to Midnight
        const t = (currentCycle - 0.5) / 0.25;
        hue = 40 - (50 * t); // Orange to deep purple
        saturation = 90 - (40 * t); // High to medium saturation
        lightness = 55 - (40 * t); // Medium-bright to dark
        contrast = 1.4 + (0.5 * t);
        glow = 0.4 + (0.5 * t); // Strong night glow
      } else { // Midnight to Sunrise
        const t = (currentCycle - 0.75) / 0.25;
        hue = 350 + (230 * t); // Deep purple to blue (wrapping around)
        if (hue > 360) hue -= 360;
        saturation = 50 - (30 * t); // Medium to low saturation
        lightness = 15 + (15 * t); // Very dark to dark
        contrast = 1.9 - (0.8 * t);
        glow = 0.9 - (0.8 * t); // Fading night glow
      }

      // Calculate secondary lightness for the gradient
      // Cycle: 0.25 (Noon) -> Black (0%). 0.75 (Midnight) -> White (100%).
      const cosVal = Math.cos((currentCycle - 0.25) * 2 * Math.PI);
      const targetSecondaryLightness = ((1 - cosVal) / 2) * 100;
      
      // Ultra-smooth interpolation with momentum-based smoothing
      setColorState(prevState => {
        const smoothFactor = 0.98; // Very high for butter-smooth transitions
        const momentum = 0.02; // Small momentum for natural movement
        
        return {
          hue: prevState.hue * smoothFactor + hue * momentum,
          saturation: prevState.saturation * smoothFactor + saturation * momentum,
          lightness: prevState.lightness * smoothFactor + lightness * momentum,
          contrast: prevState.contrast * smoothFactor + contrast * momentum,
          glow: prevState.glow * smoothFactor + glow * momentum,
          secondaryLightness: prevState.secondaryLightness * smoothFactor + targetSecondaryLightness * momentum
        };
      });
      
      animationId = requestAnimationFrame(updateLogoColors);
    };

    updateLogoColors();
    
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, []);



  const gradientId = useRef(`logo-gradient-${Math.random().toString(36).slice(2)}`).current;
  const maskId = useRef(`logo-mask-${Math.random().toString(36).slice(2)}`).current;

  // Generate the glow filter string based on current state
  const getGlowFilter = () => {
    const { hue, saturation, lightness, glow } = colorState;
    if (glow <= 0.1) return '';
    
    const glowColor = `hsl(${hue}, ${saturation}%, ${Math.min(lightness + 20, 80)}%)`;
    let shadows = [`drop-shadow(0 0 ${glow * 5}px ${glowColor})`];
    
    if (glow > 0.3) {
      shadows.push(`drop-shadow(0 0 ${glow * 10}px ${glowColor})`);
    }
    
    return shadows.join(' ');
  };

  const lightGreen = '#90EE90';
  const secondaryColor = `hsl(0, 0%, ${colorState.secondaryLightness}%)`;

  return (
    <div 
      ref={logoRef}
      className={cn("relative overflow-hidden", className)} 
      style={{ 
        width: dimensions.width, 
        height: dimensions.height,
        ...style 
      }}
    >
      <svg 
        width="100%" 
        height="100%" 
        viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
        style={{ overflow: 'visible' }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={secondaryColor} />
            <stop offset="100%" stopColor={lightGreen} />
          </linearGradient>
          
          <mask id={maskId}>
            <image 
              href="/Agri-Forecast-Logo.svg" 
              width={dimensions.width} 
              height={dimensions.height}
              preserveAspectRatio="xMidYMid slice"
            />
          </mask>
        </defs>
        
        <rect 
          width="100%" 
          height="100%" 
          fill={`url(#${gradientId})`} 
          mask={`url(#${maskId})`}
          style={{ 
             filter: getGlowFilter(),
             transition: 'filter 0.1s ease',
             willChange: 'filter'
          }}
        />
      </svg>
    </div>
  );
};

export default AdaptiveLogo;