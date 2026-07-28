import React, { memo } from 'react';
import { Trash2, Tag, Truck, Percent, Barcode, Copy, Download, X } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

const ProductBulkToolbar = memo(function ProductBulkToolbar({
  selectedCount,
  onDeleteSelected,
  onAssignFamily,
  onAssignSupplier,
  onAssignVat,
  onGenerateBarcodes,
  onDuplicateSelected,
  onExportSelected,
  onClearSelection,
  showSupplier = false
}) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in-0 duration-300">
      <div className="flex items-center gap-3 bg-background border rounded-xl shadow-xl px-5 py-3">
        <Badge variant="default" className="text-sm px-3 py-1">
          {selectedCount} sélectionné{selectedCount > 1 ? 's' : ''}
        </Badge>

        <div className="w-px h-6 bg-border" />

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={onAssignFamily} title="Attribuer une famille">
            <Tag className="h-4 w-4 mr-1" /> Famille
          </Button>
          {showSupplier && (
            <Button variant="ghost" size="sm" onClick={onAssignSupplier} title="Attribuer un fournisseur">
              <Truck className="h-4 w-4 mr-1" /> Fournisseur
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onAssignVat} title="Attribuer un taux de TVA">
            <Percent className="h-4 w-4 mr-1" /> TVA
          </Button>
          <Button variant="ghost" size="sm" onClick={onGenerateBarcodes} title="Générer des codes-barres">
            <Barcode className="h-4 w-4 mr-1" /> Codes-barres
          </Button>
          <Button variant="ghost" size="sm" onClick={onDuplicateSelected} title="Dupliquer">
            <Copy className="h-4 w-4 mr-1" /> Dupliquer
          </Button>
          <Button variant="ghost" size="sm" onClick={onExportSelected} title="Exporter la sélection">
            <Download className="h-4 w-4 mr-1" /> Exporter
          </Button>
        </div>

        <div className="w-px h-6 bg-border" />

        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={onDeleteSelected} title="Supprimer la sélection">
          <Trash2 className="h-4 w-4 mr-1" /> Supprimer
        </Button>

        <div className="w-px h-6 bg-border" />

        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClearSelection} title="Désélectionner tout">
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
});

export default ProductBulkToolbar;
