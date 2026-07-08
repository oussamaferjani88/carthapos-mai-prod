/**
 * LicenseConfigurator Component
 * License type selection and USB drive configuration
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Input } from '../../ui/input';
import { Button } from '../../ui/button';
import { Separator } from '../../ui/separator';
import { Checkbox } from '../../ui/checkbox';
import { CreditCard, Usb, HardDrive, Monitor, CheckCircle } from 'lucide-react';

export default function LicenseConfigurator({
  licenseType,
  expirationDate,
  onLicenseTypeChange,
  onExpirationDateChange,
  bindingType,
  onBindingTypeChange,
  usbDrives,
  selectedUSB,
  onUSBChange,
  onDetectUSB,
  loading
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <CreditCard className="mr-2 h-5 w-5" />
          Type de licence
        </CardTitle>
        <CardDescription>
          Configurez la licence et sélectionnez la clé USB
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* License Type */}
        <div className="grid gap-2">
          <Label>Type de licence</Label>
          <Select
            value={licenseType}
            onValueChange={onLicenseTypeChange}
            disabled={loading}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="LIFETIME">À vie</SelectItem>
              <SelectItem value="SUBSCRIPTION">Abonnement</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Expiration Date (only for subscription) */}
        {licenseType === 'SUBSCRIPTION' && (
          <div className="grid gap-2">
            <Label htmlFor="expirationDate">Date d'expiration</Label>
            <Input
              id="expirationDate"
              type="date"
              value={expirationDate}
              onChange={(e) => onExpirationDateChange(e.target.value)}
              disabled={loading}
            />
          </div>
        )}

        {/* Binding Type */}
        <div className="grid gap-2">
          <Label>Type de liaison</Label>
          <Select
            value={bindingType || 'MACHINE'}
            onValueChange={onBindingTypeChange}
            disabled={loading}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MACHINE">
                <div className="flex items-center gap-2">
                  <Monitor className="h-4 w-4" />
                  Machine fixe
                </div>
              </SelectItem>
              <SelectItem value="USB">
                <div className="flex items-center gap-2">
                  <Usb className="h-4 w-4" />
                  Clé USB
                </div>
              </SelectItem>
              <SelectItem value="HYBRID">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4" />
                  Hybride (Machine + USB)
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {bindingType === 'MACHINE' && 'La licence est liée à une machine spécifique.'}
            {bindingType === 'USB' && 'La licence est liée à une clé USB.'}
            {bindingType === 'HYBRID' && 'La licence nécessite à la fois une machine et une clé USB.'}
          </p>
        </div>

        <Separator />

        {/* USB Drive Selection */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Support d'installation (Clé USB)</Label>
            {/* Hidden for now - USB detection button 
            <Button
              variant="outline"
              size="sm"
              onClick={onDetectUSB}
              disabled={loading}
            >
              <Usb className="mr-2 h-4 w-4" />
              Détecter
            </Button>
            */}
          </div>

          {usbDrives.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-center">
              <div className="flex justify-center mb-2">
                <Usb className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium mb-1">Mode Cloud / Web</p>
              <p className="text-xs text-muted-foreground mb-3">
                Sur le web, l'accès direct USB est bloqué par sécurité.
              </p>
              <div className="flex items-center justify-center p-2 bg-blue-50 text-blue-700 rounded text-sm font-medium">
                <CheckCircle className="w-4 h-4 mr-2" />
                Téléchargement manuel activé
              </div>
            </div>
          ) : (
            <Select
              value={selectedUSB}
              onValueChange={onUSBChange}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez une clé USB" />
              </SelectTrigger>
              <SelectContent>
                {usbDrives.map((drive, index) => (
                  <SelectItem key={index} value={drive.path}>
                    {drive.label} ({(drive.size / (1024 * 1024 * 1024)).toFixed(1)} GB)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
