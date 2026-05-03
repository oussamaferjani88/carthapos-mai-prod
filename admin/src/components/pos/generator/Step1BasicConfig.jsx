/**
 * Step 1: Basic Configuration
 * Client and sector selection
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import ClientSelector from '../forms/ClientSelector';
import SectorSelector from '../forms/SectorSelector';
import { Settings } from 'lucide-react';

export default function Step1BasicConfig({ 
  clients, 
  sectors, 
  clientId, 
  sectorId,
  onClientChange,
  onSectorChange,
  loading,
  isUserMode = false,
  currentUser = null,
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Settings className="mr-2 h-5 w-5" />
          Configuration de base
        </CardTitle>
        <CardDescription>
          Sélectionnez le client et le secteur d'activité
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isUserMode ? (
          <ClientSelector
            clients={clients}
            selectedClientId={clientId}
            onClientChange={onClientChange}
            loading={loading}
          />
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground mb-1">Client lié à ce compte</p>
            <p className="text-lg font-semibold">
              {currentUser?.name || 'Votre entreprise'}
            </p>
            {currentUser?.email && (
              <p className="text-sm text-muted-foreground">{currentUser.email}</p>
            )}
          </div>
        )}

        <SectorSelector
          sectors={sectors}
          selectedSectorId={sectorId}
          onSectorChange={onSectorChange}
          loading={loading}
          showDescription={true}
        />
      </CardContent>
    </Card>
  );
}
