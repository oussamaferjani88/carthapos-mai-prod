import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Button } from '../../../ui/button';
import { CreditCard, Banknote, Smartphone, Gift, CheckCircle } from 'lucide-react';
import { POSConfiguration } from '../../../../config/POSConfiguration';

export const POSSplitPayments = ({ config }) => {
  const [payments, setPayments] = useState([]);
  const [remaining, setRemaining] = useState(125.50);
  const totalAmount = 125.50;

  const paymentMethods = [
    { id: 'cash', name: 'Espèces', icon: Banknote, color: 'bg-green-100 text-green-700' },
    { id: 'card', name: 'Carte Bancaire', icon: CreditCard, color: 'bg-blue-100 text-blue-700' },
    { id: 'mobile', name: 'Paiement Mobile', icon: Smartphone, color: 'bg-purple-100 text-purple-700' },
    { id: 'voucher', name: 'Bon/Coupon', icon: Gift, color: 'bg-orange-100 text-orange-700' }
  ];

  const addPayment = (method, amount) => {
    if (amount > 0 && amount <= remaining) {
      setPayments([...payments, { method, amount, time: new Date().toLocaleTimeString() }]);
      setRemaining(remaining - amount);
    }
  };

  const styles = POSConfiguration.getStyles(config);

  return (
    <div className="h-full flex flex-col py-6 bg-gray-50" style={{ fontFamily: config.fontFamily }}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2" style={{ color: config.textColor }}>
            <CreditCard className="h-8 w-8" />
            Paiements Multiples
          </h1>
          <p className="text-gray-500">Combinez plusieurs modes de paiement</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
        {/* Left Side - Transaction Summary */}
        <div className="space-y-4">
          <Card style={styles.card}>
            <CardHeader>
              <CardTitle>R\u00e9capitulatif de la Transaction</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between text-lg">
                  <span>Montant Total:</span>
                  <span className="font-bold">{totalAmount.toFixed(2)}€</span>
                </div>
                <div className="flex justify-between text-lg">
                  <span>D\u00e9j\u00e0 Pay\u00e9:</span>
                  <span className="font-bold text-green-600">{(totalAmount - remaining).toFixed(2)}€</span>
                </div>
                <div className="border-t pt-4">
                  <div className="flex justify-between text-2xl">
                    <span className="font-semibold">Reste \u00e0 Payer:</span>
                    <span className="font-bold" style={{ color: remaining > 0 ? config.primaryColor : '#10b981' }}>
                      {remaining.toFixed(2)}€
                    </span>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="mt-4">
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="h-3 rounded-full transition-all duration-300" 
                      style={{ 
                        width: `${((totalAmount - remaining) / totalAmount) * 100}%`,
                        backgroundColor: config.primaryColor 
                      }}
                    />
                  </div>
                  <p className="text-sm text-gray-500 mt-2 text-center">
                    {((totalAmount - remaining) / totalAmount * 100).toFixed(0)}% pay\u00e9
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment History */}
          <Card style={styles.card}>
            <CardHeader>
              <CardTitle>Paiements Enregistr\u00e9s</CardTitle>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Aucun paiement enregistr\u00e9</p>
              ) : (
                <div className="space-y-3">
                  {payments.map((payment, idx) => {
                    const method = paymentMethods.find(m => m.id === payment.method);
                    const Icon = method.icon;
                    return (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded ${method.color}`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="font-semibold">{method.name}</div>
                            <div className="text-xs text-gray-500">{payment.time}</div>
                          </div>
                        </div>
                        <div className="font-bold text-lg">{payment.amount.toFixed(2)}€</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {remaining === 0 && (
            <Card style={styles.card} className="bg-green-50 border-green-200">
              <CardContent className="p-6 text-center">
                <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-3" />
                <h3 className="text-xl font-bold text-green-700 mb-2">Paiement Complet!</h3>
                <p className="text-green-600">La transaction est termin\u00e9e avec succ\u00e8s</p>
                <Button className="mt-4" style={{ backgroundColor: config.primaryColor }}>
                  Valider la Vente
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Side - Payment Methods */}
        <div className="space-y-4">
          <Card style={styles.card}>
            <CardHeader>
              <CardTitle>S\u00e9lectionner un Mode de Paiement</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3">
                {paymentMethods.map(method => {
                  const Icon = method.icon;
                  return (
                    <div key={method.id} className="border rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`p-3 rounded-lg ${method.color}`}>
                          <Icon className="h-6 w-6" />
                        </div>
                        <span className="font-semibold text-lg">{method.name}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          onClick={() => addPayment(method.id, 20)}
                          disabled={remaining === 0}
                        >
                          20€
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => addPayment(method.id, 50)}
                          disabled={remaining === 0}
                        >
                          50€
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => addPayment(method.id, remaining)}
                          disabled={remaining === 0}
                          className="col-span-2"
                        >
                          Reste ({remaining.toFixed(2)}€)
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default POSSplitPayments;
