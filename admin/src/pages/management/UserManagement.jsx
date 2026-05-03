import React from 'react';
import UserManagementAdvanced from '../../components/management/UserManagementAdvanced';

const UserManagement = () => {
  const config = {
    primaryColor: '#0f172a',
    backgroundColor: '#ffffff',
    cardBackgroundColor: '#ffffff',
    cardBorderColor: '#e2e8f0',
    textColor: '#1e293b',
    textMutedColor: '#64748b'
  };

  return <UserManagementAdvanced config={config} />;
};

export default UserManagement;
