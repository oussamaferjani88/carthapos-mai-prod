import React from 'react';
import { Shield, User, Store } from 'lucide-react';
import { Card, CardContent } from '../ui/card';

const RoleSelection = ({ onRoleSelect, config = {} }) => {
  const roles = [
    {
      id: 'admin',
      title: 'Administrateur',
      description: 'Accès complet au système',
      icon: Shield,
      color: 'bg-red-500',
      hoverColor: 'hover:bg-red-600',
      privileges: ['Gestion complète', 'Utilisateurs', 'Stock', 'Rapports', 'Configuration']
    },
    {
      id: 'cashier',
      title: 'Caissier',
      description: 'Interface de vente',
      icon: User,
      color: 'bg-blue-500',
      hoverColor: 'hover:bg-blue-600',
      privileges: ['Ventes', 'Clients', 'Rapports de base']
    }
  ];

  return (
    <div 
      className={config.isPreviewMode ? "h-full flex items-center justify-center p-4" : "min-h-screen flex items-center justify-center p-4"}
      style={{ 
        background: config.gradientBackgrounds 
          ? `linear-gradient(135deg, ${config.backgroundColor || '#f8fafc'}, ${config.secondaryColor || '#e2e8f0'}20)`
          : config.backgroundColor || '#f8fafc'
      }}
    >
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          {/* Mode Preview Indicator */}
          {config.isPreviewMode && (
            <div 
              className="inline-flex items-center px-4 py-2 mb-4 bg-orange-100 border border-orange-300 text-orange-800 rounded-full text-sm font-medium"
              style={{
                backgroundColor: '#fed7aa',
                borderColor: '#fdba74',
                color: '#9a3412',
              }}
            >
              🎭 MODE PRÉVISUALISATION - Authentification de démonstration
            </div>
          )}
          
          <div className="flex items-center justify-center mb-4">
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ backgroundColor: config.primaryColor || '#3b82f6' }}
            >
              <Store className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 
            className="text-3xl font-bold mb-2"
            style={{ color: config.textColor || '#1f2937' }}
          >
            {config.businessName || 'Système POS'}
          </h1>
          <p 
            className="text-lg"
            style={{ color: config.textMutedColor || '#6b7280' }}
          >
            {config.isPreviewMode 
              ? 'Sélectionnez un rôle pour tester l\'interface (données de démonstration)'
              : 'Sélectionnez votre rôle pour accéder au système'
            }
          </p>
        </div>

        {/* Role Cards */}
        <div className="flex flex-wrap justify-center gap-3 max-w-4xl mx-auto">
          {roles.map((role) => {
            const IconComponent = role.icon;
            return (
              <Card 
                key={role.id}
                className={`cursor-pointer transform transition-all duration-200 hover:scale-105 hover:shadow-xl ${role.hoverColor} flex-1 min-w-0`}
                onClick={() => onRoleSelect(role.id)}
                style={{
                  backgroundColor: config.cardBackgroundColor || '#ffffff',
                  borderColor: config.cardBorderColor || '#e5e7eb',
                  borderRadius: config.borderRadius || '8px',
                  minWidth: '280px',
                  maxWidth: '400px'
                }}
              >
                <CardContent className="p-4 text-center">
                  {/* Icon */}
                  <div className={`w-12 h-12 ${role.color} rounded-full flex items-center justify-center mx-auto mb-3 transition-colors`}>
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>
                  
                  {/* Title and Description */}
                  <h3 
                    className="text-lg font-bold mb-1"
                    style={{ color: config.textColor || '#1f2937' }}
                  >
                    {role.title}
                  </h3>
                  <p 
                    className="text-xs mb-3"
                    style={{ color: config.textMutedColor || '#6b7280' }}
                  >
                    {role.description}
                  </p>
                  
                  {/* Privileges */}
                  <div className="space-y-1">
                    <div className="flex flex-wrap gap-1 justify-center">
                      {role.privileges.slice(0, 3).map((privilege, index) => (
                        <span 
                          key={index}
                          className="px-2 py-0.5 text-xs rounded-full"
                          style={{ 
                            backgroundColor: `${config.primaryColor || '#3b82f6'}20`,
                            color: config.primaryColor || '#3b82f6'
                          }}
                        >
                          {privilege}
                        </span>
                      ))}
                      {role.privileges.length > 3 && (
                        <span 
                          className="px-2 py-0.5 text-xs rounded-full"
                          style={{ 
                            backgroundColor: `${config.primaryColor || '#3b82f6'}20`,
                            color: config.primaryColor || '#3b82f6'
                          }}
                        >
                          +{role.privileges.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Action Button */}
                  <button
                    className="w-full mt-3 py-2 px-3 rounded-lg text-sm font-medium transition-colors"
                    style={{
                      backgroundColor: config.primaryColor || '#3b82f6',
                      color: '#ffffff'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = config.primaryColorHover || '#2563eb';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = config.primaryColor || '#3b82f6';
                    }}
                  >
                    Accéder en tant que {role.title}
                  </button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p 
            className="text-sm"
            style={{ color: config.textMutedColor || '#6b7280' }}
          >
            © 2025 {config.businessName || 'Système POS'}. Tous droits réservés.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RoleSelection;
