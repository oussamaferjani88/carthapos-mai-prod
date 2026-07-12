import LicenseConfigurator from '../forms/LicenseConfigurator';

interface Step4LicenseProps {
  licenseType: string;
  expirationDate: string;
  onLicenseTypeChange: (value: string) => void;
  onExpirationDateChange: (value: string) => void;
  bindingType: string;
  onBindingTypeChange: (value: string) => void;
  usbDrives: any[];
  selectedUSB: string;
  onUSBChange: (value: string) => void;
  onDetectUSB: () => void;
  forcePortableMode?: boolean;
  onForcePortableModeChange?: (checked: boolean) => void;
  loading: boolean;
}

export default function Step4License(props: Step4LicenseProps) {
  return <LicenseConfigurator {...props} />;
}
