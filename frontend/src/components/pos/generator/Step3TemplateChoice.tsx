import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LayoutTemplate, Palette } from 'lucide-react';

interface Step3TemplateChoiceProps {
  value: 'template' | 'full' | '';
  onChange: (value: 'template' | 'full') => void;
}

export default function Step3TemplateChoice({ value, onChange }: Step3TemplateChoiceProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card
        className={`cursor-pointer transition-all hover:shadow-md ${value === 'template' ? 'ring-2 ring-primary shadow-md' : ''}`}
        onClick={() => onChange('template')}
      >
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
              <LayoutTemplate className="w-6 h-6" />
            </div>
            <div>
              <CardTitle className="text-lg">Choisir un template</CardTitle>
              <CardDescription>Démarrage rapide</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Sélectionnez un modèle prédéfini pour votre secteur d'activité. 
            Les modules et la configuration de base seront automatiquement paramétrés.
          </p>
          <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
            <li className="flex items-center">✓ Configuration pré-définie</li>
            <li className="flex items-center">✓ Modules adaptés à votre secteur</li>
            <li className="flex items-center">✓ Mise en route immédiate</li>
          </ul>
        </CardContent>
      </Card>

      <Card
        className={`cursor-pointer transition-all hover:shadow-md ${value === 'full' ? 'ring-2 ring-primary shadow-md' : ''}`}
        onClick={() => onChange('full')}
      >
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
              <Palette className="w-6 h-6" />
            </div>
            <div>
              <CardTitle className="text-lg">Personnalisation complète</CardTitle>
              <CardDescription>Contrôle total</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Configurez chaque aspect de votre POS : thème, couleurs, disposition, 
            et paramètres avancés avec un aperçu en temps réel.
          </p>
          <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
            <li className="flex items-center">✓ Personnalisation visuelle complète</li>
            <li className="flex items-center">✓ Aperçu en temps réel</li>
            <li className="flex items-center">✓ Design Studio intégré</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
