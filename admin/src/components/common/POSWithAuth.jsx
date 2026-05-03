import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';
import RoleSelection from "../auth/RoleSelection";
import AuthenticationForm from "../auth/AuthenticationForm";
import { POSPreview } from "../pos/preview";

const AuthenticatedApp = ({ posComponent: POSComponent, configuration, modules, isDragMode, onComponentSelect }) => {
  const { user, logout, getAuthorizedModules } = useAuth();
  const [currentStep, setCurrentStep] = useState('role-selection'); // 'role-selection', 'authentication', 'app'
  const [selectedRole, setSelectedRole] = useState(null);

  // Réinitialiser le flux d'authentification quand l'utilisateur se déconnecte
  useEffect(() => {
    if (!user) {
      setCurrentStep('role-selection');
      setSelectedRole(null);
    }
  }, [user]);

  if (!user) {
    return (
      <AuthenticationFlow 
        configuration={configuration}
        currentStep={currentStep}
        setCurrentStep={setCurrentStep}
        selectedRole={selectedRole}
        setSelectedRole={setSelectedRole}
      />
    );
  }

  // Utilisateur authentifié - afficher l'app POS
  // Filtrer les modules selon les permissions de l'utilisateur
  const authorizedModules = getAuthorizedModules(modules);
  
  // Ajouter les informations utilisateur à la configuration
  const configWithUser = {
    ...configuration,
    currentUser: user,
    onLogout: logout
  };

  return (
    <POSComponent
      configuration={configWithUser}
      modules={authorizedModules}
      isDragMode={isDragMode}
      onComponentSelect={onComponentSelect}
    />
  );
};

const AuthenticationFlow = ({ 
  configuration, 
  currentStep, 
  setCurrentStep, 
  selectedRole, 
  setSelectedRole 
}) => {
  const { login } = useAuth();

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setCurrentStep('authentication');
  };

  const handleBack = () => {
    setCurrentStep('role-selection');
    setSelectedRole(null);
  };

  const handleAuthenticate = (authData) => {
    login(authData);
    setCurrentStep('app');
  };

  switch (currentStep) {
    case 'role-selection':
      return (
        <RoleSelection 
          onRoleSelect={handleRoleSelect}
          config={configuration}
        />
      );
    
    case 'authentication':
      return (
        <AuthenticationForm
          role={selectedRole}
          onBack={handleBack}
          onAuthenticate={handleAuthenticate}
          config={configuration}
        />
      );
    
    default:
      return null;
  }
};

const POSWithAuth = ({ 
  posComponent = POSPreview, 
  configuration = {}, 
  modules = [], 
  isDragMode = false,
  onComponentSelect,
  isPreviewMode = false // Nouvelle option pour le mode preview
}) => {
  // Configuration adaptée pour le preview avec informations sur le mode demo
  const configWithPreviewMode = {
    ...configuration,
    isPreviewMode: isPreviewMode
  };

  return (
    <AuthProvider>
      <AuthenticatedApp 
        posComponent={posComponent}
        configuration={configWithPreviewMode}
        modules={modules}
        isDragMode={isDragMode}
        onComponentSelect={onComponentSelect}
      />
    </AuthProvider>
  );
};

export default POSWithAuth;
