/**
 * Step 4: License Configuration
 * License type and USB drive selection
 */

import LicenseConfigurator from '../forms/LicenseConfigurator';

export default function Step4License({
  licenseType,
  expirationDate,
  onLicenseTypeChange,
  onExpirationDateChange,
  usbDrives,
  selectedUSB,
  onUSBChange,
  onDetectUSB,
  forcePortableMode,
  onForcePortableModeChange,
  loading
}) {
  return (
    <LicenseConfigurator
      licenseType={licenseType}
      expirationDate={expirationDate}
      onLicenseTypeChange={onLicenseTypeChange}
      onExpirationDateChange={onExpirationDateChange}
      usbDrives={usbDrives}
      selectedUSB={selectedUSB}
      onUSBChange={onUSBChange}
      onDetectUSB={onDetectUSB}
      forcePortableMode={forcePortableMode}
      onForcePortableModeChange={onForcePortableModeChange}
      loading={loading}
    />
  );
}
