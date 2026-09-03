import React from 'react';
import UserManagementAdvanced from '../components/UserManagementAdvanced';
import { useAppConfig } from '../hooks/useAppConfig';
import { POSConfiguration } from '../lib/POSConfiguration';

const UserAdmin = () => {
  const { config: electronConfig } = useAppConfig();
  
  // Theme configuration integration
  const getConfig = () => {
    if (electronConfig && electronConfig.theme) {
      return POSConfiguration.createConfig(electronConfig.theme);
    }
    return POSConfiguration.createConfig({
      primaryColor: '#3b82f6',
      backgroundColor: '#ffffff',
      textColor: '#1f2937'
    });
  };
  const config = getConfig();

  return <UserManagementAdvanced config={config} />;
};

export default UserAdmin;
