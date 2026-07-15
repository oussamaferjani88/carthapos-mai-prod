import React, { useState } from 'react';
import { Badge } from '../../../ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../ui/card';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import { Label } from '../../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../ui/dialog';
import { Plus, Search, Barcode, Sparkles, Upload, Scan, X, Filter, Package, Edit, Trash2, AlertTriangle } from 'lucide-react';
import { cn } from '../../../../lib/utils';

export const POSProducts = ({ 
  config, 
  onAddToCart, 
  selectedCategory, 
  onCategoryChange,
  animatingCard,
  selectedCard 
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFamily, setSelectedFamily] = useState('Tout');
  const [formData, setFormData] = useState({
    name: '',
    family: '',
    price: '',
    barcode: '',
    description: ''
  });

  const families = ['Boissons', 'Viennoiseries', 'Sandwichs', 'Salades', 'Pâtisseries', 'Plats chauds', 'Desserts', 'Autres'];
  // Exemple de produits avec nouveaux attributs
  const [products, setProducts] = useState([
    { id: 1, name: 'Café Expresso', family: 'Boissons', price: 2.50, barcode: '1234567890123', description: 'Café italien corsé' },
    { id: 2, name: 'Croissant Nature', family: 'Viennoiseries', price: 1.80, barcode: '1234567891234', description: 'Croissant au beurre artisanal' },
    { id: 3, name: 'Sandwich Jambon Beurre', family: 'Sandwichs', price: 4.50, barcode: '1234567892345', description: 'Pain frais, jambon de qualité' },
    { id: 4, name: 'Eau Minérale 50cl', family: 'Boissons', price: 1.20, barcode: '1234567893456', description: 'Eau minérale naturelle' },
    { id: 5, name: 'Salade César', family: 'Salades', price: 7.90, barcode: '', description: 'Salade verte, croûtons, parmesan' },
    { id: 6, name: 'Muffin Chocolat', family: 'Pâtisseries', price: 2.80, barcode: '1234567895678', description: 'Muffin aux pépites de chocolat' }
  ]);

  const categories = ['Tout', ...families];

  // Fonctions pour gérer le formulaire
  const handleAddProduct = () => {
    setShowAddForm(true);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.family || !formData.price) {
      alert('Veuillez remplir les champs obligatoires');
      return;
    }

    const newProduct = {
      id: Date.now(),
      name: formData.name,
      family: formData.family,
      price: parseFloat(formData.price),
      barcode: formData.barcode,
      description: formData.description
    };

    setProducts([...products, newProduct]);
    setFormData({ name: '', family: '', price: '', barcode: '', description: '' });
    setShowAddForm(false);
  };

  const generateBarcode = () => {
    const barcode = Math.floor(Math.random() * 1000000000000).toString().padStart(12, '0') + '1';
    setFormData({ ...formData, barcode: barcode });
  };

  const handleEdit = (product) => {
    setFormData({ name: product.name, family: product.family, price: product.price.toString(), barcode: product.barcode, description: product.description });
    setShowAddForm(true);
  };

  const handleDelete = (product) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer "${product.name}" ?`)) {
      setProducts(products.filter(p => p.id !== product.id));
    }
  };

  const filteredProducts = selectedFamily === 'Tout' 
    ? products.filter(product => 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.barcode.includes(searchTerm)
      )
    : products.filter(product => 
        product.family === selectedFamily &&
        (product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
         product.barcode.includes(searchTerm))
      );

  const styles = {
    card: {
      backgroundColor: config.backgroundColor,
      borderColor: config.cardBorderColor,
      color: config.textColor,
      fontFamily: config.fontFamily || 'Inter, system-ui, sans-serif',
      fontSize: config.fontSize || '14px',
      fontWeight: config.fontWeight || '400'
    }
  };

  return (
    <div className="h-full flex flex-col space-y-3 bg-gray-50 relative" style={{ fontFamily: config.fontFamily, backgroundColor: config.backgroundColor }}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: config.textColor }}>Produits</h1>
          <p className="text-sm mt-1" style={{ color: config.textMutedColor }}>
            Gérez votre catalogue de produits
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => {}}>
            <Barcode className="mr-2 h-4 w-4" />
            Générer codes-barres
          </Button>
          <Button
            onClick={handleAddProduct}
            style={{ backgroundColor: config.primaryColor }}
            className="text-white hover:opacity-90"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nouveau produit
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card style={{ backgroundColor: config.backgroundColor, borderColor: config.cardBorderColor }}>
        <CardHeader>
          <CardTitle style={{ color: config.textColor }}>Filtres</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Rechercher</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Nom du produit ou code-barres..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full md:w-48">
              <Label htmlFor="family">Famille</Label>
              <Select value={selectedFamily} onValueChange={setSelectedFamily}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Tout">Toutes les familles</SelectItem>
                  {families.map((family) => (
                    <SelectItem key={family} value={family}>
                      {family}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products List with blur effect when form is open */}
      <div className={`flex-1 transition-all duration-300 ${showAddForm ? 'filter blur-sm' : ''}`}>

      {/* Liste des produits */}
      {filteredProducts.length === 0 ? (
        <Card style={styles.card}>
          <CardContent className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2" style={{ color: config.textColor }}>
              {searchTerm || selectedFamily !== 'Tout' ? 'Aucun produit trouvé' : 'Aucun produit'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || selectedFamily !== 'Tout' 
                ? 'Essayez de modifier vos critères de recherche'
                : 'Commencez par créer votre premier produit'
              }
            </p>
            {!searchTerm && selectedFamily === 'Tout' && (
              <Button onClick={handleAddProduct} style={{ backgroundColor: config.primaryColor }}>
                <Plus className="mr-2 h-4 w-4" />
                Créer un produit
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <Card key={product.id} className="hover:shadow-md transition-shadow" style={{ backgroundColor: config.backgroundColor, borderColor: config.cardBorderColor }}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg" style={{ color: config.textColor }}>{product.name}</CardTitle>
                    <CardDescription>{product.family}</CardDescription>
                  </div>
                  <div className="flex space-x-1">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(product)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(product)} className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-2xl font-bold" style={{ color: config.primaryColor }}>{product.price.toFixed(2)}€</span>
                    <Badge variant="outline" className="text-orange-600 border-orange-600">En stock</Badge>
                  </div>

                  <div className="text-sm" style={{ color: config.textMutedColor }}>
                    <p>Stock: 150 unités</p>
                    {product.barcode ? (
                      <div className="flex items-center mt-1">
                        <Barcode className="h-3 w-3 mr-1 text-green-600" />
                        <p>Code-barres: {product.barcode}</p>
                      </div>
                    ) : (
                      <div className="flex items-center mt-1 text-orange-600">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        <p>Aucun code-barres</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      </div>

      {/* Overlay Form with just blur background */}
      {showAddForm && (
        <div className="absolute inset-0 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl border border-gray-200 max-w-[500px] w-full max-h-[80vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Nouveau produit</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Ajoutez un nouveau produit à votre catalogue
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddForm(false)}
                  className="h-8 w-8 p-0 hover:bg-gray-100"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <form onSubmit={handleFormSubmit}>
              <div className="px-6 py-4 space-y-4">
                {/* Nom du produit */}
                <div className="grid gap-2">
                  <Label htmlFor="name">Nom du produit *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Café Expresso, Croissant..."
                    required
                  />
                </div>
                
                {/* Famille du produit */}
                <div className="grid gap-2">
                  <Label htmlFor="family">Famille du produit *</Label>
                  <Select 
                    value={formData.family} 
                    onValueChange={(value) => setFormData({ ...formData, family: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez une famille" />
                    </SelectTrigger>
                    <SelectContent>
                      {families.map((family) => (
                        <SelectItem key={family} value={family}>
                          {family}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Prix de vente */}
                <div className="grid gap-2">
                  <Label htmlFor="price">Prix de vente *</Label>
                  <div className="relative">
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      placeholder="0.00"
                      className="pr-8"
                      required
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                      €
                    </span>
                  </div>
                </div>
                
                {/* Code-barres */}
                <div className="grid gap-2">
                  <Label htmlFor="barcode">Code-barres</Label>
                  <div className="flex gap-2">
                    <Input
                      id="barcode"
                      value={formData.barcode}
                      onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                      placeholder="Code-barres du produit"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="px-3 shrink-0"
                      title="Scanner un code-barres"
                    >
                      <Scan className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={generateBarcode}
                      className="px-3 shrink-0"
                      title="Générer un code-barres automatiquement"
                    >
                      <Sparkles className="h-4 w-4" />
                    </Button>
                  </div>
                  {formData.barcode && (
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Barcode className="h-3 w-3 mr-1" />
                      Code-barres: {formData.barcode}
                    </div>
                  )}
                </div>
                
                {/* Description */}
                <div className="grid gap-2">
                  <Label htmlFor="description">Description (optionnelle)</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Description du produit, ingrédients..."
                  />
                </div>
              </div>
              
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                  Annuler
                </Button>
                <Button type="submit" style={{ backgroundColor: config.primaryColor }}>
                  Créer
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default POSProducts;
