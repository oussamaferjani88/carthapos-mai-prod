import React, { memo } from 'react';
import { Package, Edit, Trash2, Copy, Barcode, Calendar, Truck, Tag, Percent, DollarSign, Box, FileText } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './ui/sheet';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import { getImageStyle } from '../utils/imageSettings';

const ProductQuickView = memo(function ProductQuickView({
  open,
  onOpenChange,
  product,
  onEdit,
  onDelete,
  onDuplicate,
  onPrintBarcode,
  formatPrice,
  config
}) {
  if (!product) return null;

  const margin = product.cost_price > 0
    ? ((product.price - product.cost_price) / product.cost_price * 100).toFixed(1)
    : null;

  const getStockStatus = () => {
    if (product.stock === 0) return { label: 'Rupture', variant: 'destructive', color: '#ef4444' };
    if (product.min_stock > 0 && product.stock <= product.min_stock) return { label: 'Stock faible', variant: 'outline', color: '#f59e0b' };
    return { label: 'En stock', variant: 'default', color: '#22c55e' };
  };
  const stockStatus = getStockStatus();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[420px] sm:w-[480px] p-0 flex flex-col">
        {/* Product Image */}
        <div className="relative h-56 bg-muted flex-shrink-0">
          {product.image ? (
            <img src={product.image} alt={product.name} className="w-full h-full" style={getImageStyle(product.image_settings)} loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="h-16 w-16 text-muted-foreground/30" />
            </div>
          )}
          <div className="absolute top-3 right-3">
            <Badge variant={stockStatus.variant} className="text-xs font-semibold shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full mr-1" style={{ backgroundColor: stockStatus.color }} />
              {stockStatus.label}
            </Badge>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-5">
            {/* Title & Family */}
            <div>
              <SheetHeader className="p-0 text-left">
                <SheetTitle className="text-xl font-bold">{product.name}</SheetTitle>
                <SheetDescription className="flex items-center gap-2 mt-1">
                  {product.family && (
                    <Badge variant="secondary" className="text-xs">
                      <Tag className="h-3 w-3 mr-1" />
                      {product.family}
                    </Badge>
                  )}
                  {product.price_type && (
                    <Badge variant="outline" className="text-xs">
                      {product.price_type === 'ht' ? 'HT' : 'TTC'}
                    </Badge>
                  )}
                </SheetDescription>
              </SheetHeader>
            </div>

            <Separator />

            {/* Description */}
            {product.description && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Description</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>
              </div>
            )}

            {/* Pricing */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Tarification</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">Prix de vente</p>
                  <p className="text-lg font-bold" style={{ color: config?.primaryColor }}>{formatPrice(product.price)}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">Prix d'achat</p>
                  <p className="text-lg font-bold">{formatPrice(product.cost_price || 0)}</p>
                </div>
                {margin !== null && (
                  <div className="col-span-2 p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">Marge</p>
                    <p className="text-lg font-bold" style={{ color: parseFloat(margin) > 0 ? '#22c55e' : '#ef4444' }}>
                      {margin}%
                    </p>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              {product.barcode && (
                <div className="flex items-center gap-2">
                  <Barcode className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Code-barres</p>
                    <p className="font-mono text-xs">{product.barcode}</p>
                  </div>
                </div>
              )}
              {product.unit && (
                <div className="flex items-center gap-2">
                  <Box className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Unité</p>
                    <p className="font-medium">{product.unit}</p>
                  </div>
                </div>
              )}
              {product.supplier && (
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Fournisseur</p>
                    <p className="font-medium">{product.supplier}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Box className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Stock</p>
                  <p className="font-medium">{product.stock ?? 0} unités</p>
                </div>
              </div>
              {product.created_at && (
                <div className="flex items-center gap-2 col-span-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Créé le</p>
                    <p className="font-medium">
                      {new Date(product.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 p-4 border-t bg-background flex-shrink-0">
          <Button variant="default" size="sm" className="flex-1" onClick={() => { onEdit(product); onOpenChange(false); }}>
            <Edit className="h-4 w-4 mr-1" /> Modifier
          </Button>
          <Button variant="outline" size="sm" onClick={() => onDuplicate(product)}>
            <Copy className="h-4 w-4" />
          </Button>
          {product.barcode && (
            <Button variant="outline" size="sm" onClick={() => onPrintBarcode(product)}>
              <Barcode className="h-4 w-4" />
            </Button>
          )}
          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => { onDelete(product); onOpenChange(false); }}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
});

export default ProductQuickView;
