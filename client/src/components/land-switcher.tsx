import React from 'react';
import { Check, ChevronDown } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface LandArea {
  id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  soilType?: string;
  area?: number;
  currentCrop?: string;
  isMainLand?: boolean;
}

interface LandSwitcherProps {
  lands: LandArea[];
  selectedLand: LandArea | null;
  onLandChange: (land: LandArea) => void;
  className?: string;
}

export function LandSwitcher({ lands, selectedLand, onLandChange, className }: LandSwitcherProps) {
  if (!lands || lands.length === 0) {
    return (
      <div className={cn("flex items-center gap-2 text-muted-foreground", className)}>
        <span className="text-sm font-medium">No lands added</span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Select
        value={selectedLand?.id.toString() || ''}
        onValueChange={(value) => {
          const land = lands.find(l => l.id.toString() === value);
          if (land) onLandChange(land);
        }}
      >
        <SelectTrigger className="w-[200px] h-9 bg-white/50 dark:bg-gray-800/50 border-none shadow-sm backdrop-blur-sm">
          <SelectValue placeholder="Select land">
            {selectedLand && (
              <div className="flex items-center gap-2">
                <span className="truncate font-semibold text-green-700 dark:text-green-400">{selectedLand.name}</span>
                {selectedLand.isMainLand && (
                  <Badge variant="secondary" className="text-[10px] h-4 px-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-none">
                    Main
                  </Badge>
                )}
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {lands.map((land) => (
            <SelectItem key={land.id} value={land.id.toString()}>
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-800 dark:text-gray-200">{land.name}</span>
                    <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                      {land.address.split(',').slice(0, 2).join(', ')}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {land.isMainLand && (
                    <Badge variant="secondary" className="text-[10px] h-4 px-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-none">
                      Main
                    </Badge>
                  )}
                  {selectedLand?.id === land.id && (
                    <Check className="h-3 w-3 text-green-600" />
                  )}
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {selectedLand && (
        <div className="hidden md:flex flex-col text-xs text-muted-foreground">
          <span className="truncate max-w-[200px]">
            {selectedLand.address.split(',').slice(0, 2).join(', ')}
          </span>
          {selectedLand.soilType && (
            <span className="truncate max-w-[200px]">
              {selectedLand.soilType}
            </span>
          )}
        </div>
      )}
    </div>
  );
}