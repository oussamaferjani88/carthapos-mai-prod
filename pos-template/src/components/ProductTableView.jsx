import React, { memo } from 'react';
import { Edit, Trash2, Copy, Barcode, Eye, Package } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';

const ProductTableView = memo(function ProductTableView({
  products,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onEdit,
  onDelete,
  onDuplicate,
  onView,
  onGenerateBarcode,
  formatPrice,
  config,
  showBarcode
}) {
  const allSelected = products.length > 0 && products.every(p => selectedIds.has(p.id));
  const someSelected = selectedIds.size > 0;

  const getStockBadge = (product) => {
    const stock = product.stock ?? 0;
    const minStock = product.min_stock ?? 0;
    if (stock === 0) return <Badge variant="destructive" className="text-xs">Rupture</Badge>;
    if (minStock > 0 && stock <= minStock) return <Badge variant="outline" className="text-xs text-orange-600 border-orange-300 bg-orange-50">Faible</Badge>;
    return <Badge variant="default" className="text-xs bg-emerald-100 text-emerald-700 border-emerald-200">{stock}</Badge>;
  };

  const getMargin = (product) => {
    if (!product.cost_price || product.cost_price <= 0) return <span className="text-muted-foreground">—</span>;
    const margin = ((product.price - product.cost_price) / product.cost_price * 100).toFixed(0);
    const color = parseFloat(margin) > 0 ? '#22c55e' : '#ef4444';
    return <span className="font-medium" style={{ color }}>{margin}%</span>;
  };

  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead className="w-10">
              <Checkbox
                checked={allSelected}
                onCheckedChange={(checked) => onSelectAll(checked)}
                aria-label="Tout sélectionner"
              />
            </TableHead>
            <TableHead className="w-12">Img</TableHead>
            <TableHead>Produit</TableHead>
            <TableHead>Famille</TableHead>
            <TableHead className="text-right">Prix</TableHead>
            <TableHead className="text-right">Coût</TableHead>
            <TableHead className="text-right">Marge</TableHead>
            <TableHead className="text-center">Stock</TableHead>
            {showBarcode && <TableHead>Code-barres</TableHead>}
            <TableHead>Fournisseur</TableHead>
            <TableHead className="text-right w-32">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.length === 0 ? (
            <TableRow>
              <TableCell colSpan={showBarcode ? 11 : 10} className="h-32 text-center">
                <Package className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Aucun produit trouvé</p>
              </TableCell>
            </TableRow>
          ) : (
            products.map((product) => (
              <TableRow
                key={product.id}
                className={`cursor-pointer transition-colors ${selectedIds.has(product.id) ? 'bg-muted/50' : 'hover:bg-muted/30'}`}
                onClick={() => onView(product)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds.has(product.id)}
                    onCheckedChange={() => onToggleSelect(product.id)}
                    aria-label={`Sélectionner ${product.name}`}
                  />
                </TableCell>
                <TableCell>
                  {product.image ? (
                    <img src={product.image} alt="" className="w-8 h-8 rounded object-cover" loading="lazy" />
                  ) : (
                    <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                      <Package className="h-4 w-4 text-muted-foreground/30" />
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium text-sm">{product.name}</p>
                    {product.price_type && (
                      <Badge variant="outline" className="text-[10px] mt-0.5 px-1 py-0">
                        {product.price_type === 'ht' ? 'HT' : 'TTC'}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-xs">{product.family || '—'}</Badge>
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">{formatPrice(product.price)}</TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">{formatPrice(product.cost_price || 0)}</TableCell>
                <TableCell className="text-right">{getMargin(product)}</TableCell>
                <TableCell className="text-center">{getStockBadge(product)}</TableCell>
                {showBarcode && (
                  <TableCell>
                    {product.barcode ? (
                      <span className="font-mono text-xs text-muted-foreground">{product.barcode}</span>
                    ) : (
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={(e) => { e.stopPropagation(); onGenerateBarcode(product); }}>
                        <Barcode className="h-3 w-3 mr-1" /> Générer
                      </Button>
                    )}
                  </TableCell>
                )}
                <TableCell className="text-sm text-muted-foreground">{product.supplier || '—'}</TableCell>
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onView(product)}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(product)}>
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDuplicate(product)}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(product)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
});

export default ProductTableView;
