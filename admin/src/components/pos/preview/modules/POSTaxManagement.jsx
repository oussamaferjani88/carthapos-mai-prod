import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Button } from '../../../ui/button';
import { Receipt, Percent, Globe, FileText } from 'lucide-react';
import { POSConfiguration } from '../../../../config/POSConfiguration';

export const POSTaxManagement = ({ config }) => {
  const taxRates = [
    { id: 1, name: 'TVA Standard', rate: 20, category: 'Général', applies: 'Produits standard' },
    { id: 2, name: 'TVA Réduite', rate: 10, category: 'Alimentaire', applies: 'Nourriture, boissons' },
    { id: 3, name: 'TVA Super Réduite', rate: 5.5, category: 'Alimentaire', applies: 'Produits de première nécessité' },
    { id: 4, name: 'TVA Exportation', rate: 0, category: 'Export', applies: 'Ventes hors UE' }
  ];

  const recentSales = [
    { product: 'Café Expresso', price: 2.50, taxRate: 10, taxAmount: 0.23, total: 2.73 },
    { product: 'Croissant', price: 1.80, taxRate: 5.5, taxAmount: 0.09, total: 1.89 },
    { product: 'Accessoire', price: 15.00, taxRate: 20, taxAmount: 2.50, total: 17.50 }
  ];

  const styles = POSConfiguration.getStyles(config);

  return (
    <div className="h-full flex flex-col space-y-4 py-6 bg-gray-50" style={{ fontFamily: config.fontFamily }}>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2" style={{ color: config.textColor }}>
            <Receipt className="h-8 w-8" />
            Gestion des Taxes
          </h1>
          <p className="text-gray-500">Configuration TVA et taxes</p>
        </div>
      </div>

      {/* Tax Rates */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {taxRates.map(tax => (
          <Card key={tax.id} style={styles.card}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <Percent className="h-5 w-5 text-blue-600" />
                <span className="text-2xl font-bold" style={{ color: config.primaryColor }}>
                  {tax.rate}%
                </span>
              </div>
              <h3 className="font-semibold mb-1">{tax.name}</h3>
              <p className="text-xs text-gray-500 mb-2">{tax.category}</p>
              <p className="text-xs text-gray-600">{tax.applies}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1">
        {/* Tax Summary */}
        <Card style={styles.card}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Récapitulatif Journalier
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Ventes HT</span>
                  <span className="text-lg font-bold">1,234.56€</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">TVA 20%</span>
                  <span className="font-semibold">120.45€</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">TVA 10%</span>
                  <span className="font-semibold">45.23€</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">TVA 5.5%</span>
                  <span className="font-semibold">12.34€</span>
                </div>
              </div>
              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Total TTC</span>
                  <span className="text-2xl font-bold" style={{ color: config.primaryColor }}>
                    1,412.58€
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Sales with Tax */}
        <Card style={styles.card}>
          <CardHeader>
            <CardTitle>Ventes Récentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentSales.map((sale, idx) => (
                <div key={idx} className="border-b pb-3">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-medium">{sale.product}</span>
                    <span className="font-bold">{sale.total.toFixed(2)}€</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
                    <div>
                      <div className="text-gray-400">HT</div>
                      <div className="font-medium">{sale.price.toFixed(2)}€</div>
                    </div>
                    <div>
                      <div className="text-gray-400">TVA ({sale.taxRate}%)</div>
                      <div className="font-medium">{sale.taxAmount.toFixed(2)}€</div>
                    </div>
                    <div>
                      <div className="text-gray-400">TTC</div>
                      <div className="font-medium">{sale.total.toFixed(2)}€</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default POSTaxManagement;
