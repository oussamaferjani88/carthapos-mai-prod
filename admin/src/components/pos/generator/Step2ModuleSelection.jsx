/**
 * Step 2: Module Selection
 * Display and manage module selection
 */

import { Card, CardContent } from '../../ui/card';
import ModuleGrid from '../forms/ModuleGrid';

export default function Step2ModuleSelection({ 
  modulesByCategory, 
  selectedModules, 
  onModuleToggle,
  isModuleRequired 
}) {
  return (
    <Card className="border-0 shadow-none bg-transparent">
      <CardContent className="p-4">
        <ModuleGrid
          modulesByCategory={modulesByCategory}
          selectedModules={selectedModules}
          onModuleToggle={onModuleToggle}
          isModuleRequired={isModuleRequired}
        />
      </CardContent>
    </Card>
  );
}
