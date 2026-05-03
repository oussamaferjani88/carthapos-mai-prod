/**
 * ClientSelector Component
 * Dropdown for selecting a client
 */

import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Building2 } from 'lucide-react';

export default function ClientSelector({ clients, selectedClientId, onClientChange, loading }) {
  // Ensure clients is always an array
  const clientList = Array.isArray(clients) ? clients : [];
  
  return (
    <div className="grid gap-2">
      <Label htmlFor="client" className="flex items-center gap-2">
        <Building2 className="w-4 h-4" />
        Client
      </Label>
      <Select 
        value={selectedClientId} 
        onValueChange={onClientChange}
        disabled={loading}
      >
        <SelectTrigger>
          <SelectValue placeholder="Sélectionnez un client" />
        </SelectTrigger>
        <SelectContent>
          {clientList.map((client) => (
            <SelectItem key={client.id} value={client.id}>
              {client.name} ({client.email})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
