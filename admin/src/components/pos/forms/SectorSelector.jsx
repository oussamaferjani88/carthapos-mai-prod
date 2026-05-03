/**
 * SectorSelector Component
 * Dropdown for selecting a business sector
 */

import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Briefcase } from 'lucide-react';

export default function SectorSelector({ 
  sectors, 
  selectedSectorId, 
  onSectorChange, 
  loading,
  showDescription = true 
}) {
  // Ensure sectors is always an array
  const sectorList = Array.isArray(sectors) ? sectors : [];
  const selectedSector = sectorList.find(s => s.id === selectedSectorId);

  return (
    <div className="grid gap-2">
      <Label htmlFor="sector" className="flex items-center gap-2">
        <Briefcase className="w-4 h-4" />
        Secteur d'activité
      </Label>
      <Select 
        value={selectedSectorId} 
        onValueChange={onSectorChange}
        disabled={loading}
      >
        <SelectTrigger>
          <SelectValue placeholder="Sélectionnez un secteur" />
        </SelectTrigger>
        <SelectContent>
          {sectorList.map((sector) => (
            <SelectItem key={sector.id} value={sector.id}>
              {sector.icon} {sector.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {showDescription && selectedSector && (
        <div className="p-4 bg-muted rounded-lg">
          <h4 className="font-medium mb-2">Description du secteur</h4>
          <p className="text-sm text-muted-foreground">
            {selectedSector.description}
          </p>
        </div>
      )}
    </div>
  );
}
