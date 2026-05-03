import React from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Palette, Paintbrush, Layout, Settings, Type, Sparkles, Grid3X3, MousePointer } from 'lucide-react';

const CustomizerNavigation = ({ 
  selectedTab, 
  setSelectedTab, 
  selectedSubTab, 
  setSelectedSubTab, 
  mode = 'inline' 
}) => {
  const mainTabs = [
    { id: 'design', label: 'Design', icon: Paintbrush },
    { id: 'layout', label: 'Layout', icon: Layout },
    { id: 'advanced', label: 'Avancé', icon: Settings }
  ];

  const designSubTabs = [
    { id: 'themes', label: 'Thèmes', icon: Palette },
    { id: 'colors', label: 'Couleurs', icon: Paintbrush },
    { id: 'typography', label: 'Typo', icon: Type },
    { id: 'effects', label: 'Effets', icon: Sparkles }
  ];

  const layoutSubTabs = [
    { id: 'components', label: 'Composants', icon: Grid3X3 },
    { id: 'drag', label: 'Drag & Drop', icon: MousePointer }
  ];

  return (
    <div className="overflow-hidden bg-transparent">
      <div className="h-auto flex flex-col bg-transparent pb-1">
        {/* Onglets principaux */}
        <div className={`grid grid-cols-3 ${mode === 'full' ? 'm-3 mb-2' : 'm-2 mb-2'} bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-lg p-1 shadow-sm border border-gray-200 dark:border-gray-700`}>
          {mainTabs.map((tab) => (
            <Button
              key={tab.id}
              variant={selectedTab === tab.id ? 'default' : 'ghost'}
              onClick={() => setSelectedTab(tab.id)}
              className={`${mode === 'inline' ? 'text-xs' : 'text-sm'} flex flex-col ${mode === 'inline' ? 'p-1.5 h-10' : 'p-2 h-12'} transition-all duration-200 ${
                selectedTab === tab.id 
                  ? 'shadow-md scale-105 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 !text-gray-900 dark:!text-gray-100' 
                  : 'hover:bg-white/50 dark:hover:bg-gray-700/50 !text-gray-700 dark:!text-gray-300 hover:!text-gray-900 dark:hover:!text-gray-100'
              }`}
            >
              <tab.icon className={`${mode === 'inline' ? 'w-3.5 h-3.5 mb-0.5' : 'w-5 h-5 mb-1'}`} />
              <span className={`${mode === 'inline' ? 'text-[10px]' : ''} font-medium`}>{tab.label}</span>
            </Button>
          ))}
        </div>

        {/* Sous-onglets pour Design */}
        {selectedTab === 'design' && (
          <div className={`${mode === 'full' ? 'mx-3 mb-2' : 'mx-2 mb-2'}`}>
            {mode === 'full' && (
              <div className="mb-1">
                <h3 className="text-[10px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide px-2">
                  Options de Design
                </h3>
              </div>
            )}
            <div className={`flex space-x-0.5 ${mode === 'inline' ? 'p-1' : 'p-1.5'} bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700`}>
              {designSubTabs.map((subTab) => (
                <Button
                  key={subTab.id}
                  variant={selectedSubTab === subTab.id ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setSelectedSubTab(subTab.id)}
                  className={`flex-1 ${mode === 'inline' ? 'text-[10px] py-1 h-7' : 'text-xs py-2'} transition-all duration-200 ${
                    selectedSubTab === subTab.id 
                      ? 'shadow-sm bg-blue-50 dark:bg-blue-900/20 !text-blue-700 dark:!text-blue-300 border border-blue-200 dark:border-blue-700' 
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700 !text-gray-700 dark:!text-gray-300 hover:!text-gray-900 dark:hover:!text-gray-100'
                  }`}
                >
                  <subTab.icon className={`${mode === 'inline' ? 'w-2.5 h-2.5 mr-0.5' : 'w-3 h-3 mr-1'}`} />
                  {subTab.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Sous-onglets pour Layout */}
        {selectedTab === 'layout' && (
          <div className={`${mode === 'full' ? 'mx-3 mb-2' : 'mx-2 mb-2'}`}>
            {mode === 'full' && (
              <div className="mb-1">
                <h3 className="text-[10px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide px-2">
                  Options de Layout
                </h3>
              </div>
            )}
            <div className={`flex space-x-0.5 ${mode === 'inline' ? 'p-1' : 'p-1.5'} bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700`}>
              {layoutSubTabs.map((subTab) => (
                <Button
                  key={subTab.id}
                  variant={selectedSubTab === subTab.id ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setSelectedSubTab(subTab.id)}
                  className={`flex-1 ${mode === 'inline' ? 'text-[10px] py-1 h-7' : 'text-xs py-2'} transition-all duration-200 ${
                    selectedSubTab === subTab.id 
                      ? 'shadow-sm bg-green-50 dark:bg-green-900/20 !text-green-700 dark:!text-green-300 border border-green-200 dark:border-green-700' 
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700 !text-gray-700 dark:!text-gray-300 hover:!text-gray-900 dark:hover:!text-gray-100'
                  }`}
                >
                  <subTab.icon className={`${mode === 'inline' ? 'w-2.5 h-2.5 mr-0.5' : 'w-3 h-3 mr-1'}`} />
                  {subTab.label}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomizerNavigation;
