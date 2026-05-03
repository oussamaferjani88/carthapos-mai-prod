    import React from 'react';
    import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
    import { ShoppingCart, Plus, Minus, X } from 'lucide-react';

    export const POSCart = ({ 
    cart, 
    config, 
    onUpdateQuantity, 
    onRemoveFromCart, 
    onClearCart, 
    onProcessPayment,
    setNotification 
    }) => {
    const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const updateQuantity = (id, newQuantity) => {
        if (newQuantity <= 0) {
        onRemoveFromCart(id);
        return;
        }
        onUpdateQuantity(id, newQuantity);
    };

    const removeFromCart = (id) => {
        onRemoveFromCart(id);
        setNotification("🗑️ Article supprimé");
        setTimeout(() => setNotification(null), 2000);
    };

    const processPayment = () => {
        if (cart.length === 0) return;
        onProcessPayment();
    };

    const clearCart = () => {
        onClearCart();
        setNotification("🗑️ Panier vidé");
        setTimeout(() => setNotification(null), 2000);
    };

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
        <Card 
        className="flex-grow transition-all duration-200 shadow-lg"
        style={styles.card}
        >
        <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Commande
            </span>
            <span className="text-sm bg-green-100 px-2 py-1 rounded">
                {cart.reduce((sum, item) => sum + item.quantity, 0)} articles
            </span>
            </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col h-full">
            
            {/* LISTE DES ARTICLES */}
            <div className="flex-grow overflow-y-auto space-y-2 mb-4 max-h-64">
            {cart.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Panier vide</p>
                <p className="text-sm">Sélectionnez des produits</p>
                </div>
            ) : (
                cart.map((item) => (
                <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                    style={{ borderColor: config.cardBorderColor }}
                >
                    <div className="flex-1">
                    <div className="font-semibold text-sm" style={{ color: config.textColor }}>
                        {item.name}
                    </div>
                    <div className="text-xs text-gray-500">
                        {item.price.toFixed(2)}€ × {item.quantity}
                    </div>
                    </div>
                    
                    {/* CONTRÔLES QUANTITÉ */}
                    <div className="flex items-center gap-2">
                    <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs"
                    >
                        <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-8 text-center font-bold">
                        {item.quantity}
                    </span>
                    <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-6 h-6 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center text-xs"
                    >
                        <Plus className="w-3 h-3" />
                    </button>
                    <button
                        onClick={() => removeFromCart(item.id)}
                        className="w-6 h-6 bg-gray-500 hover:bg-gray-600 text-white rounded-full flex items-center justify-center text-xs ml-1"
                    >
                        <X className="w-3 h-3" />
                    </button>
                    </div>
                    
                    {/* PRIX TOTAL */}
                    <div className="font-bold text-right ml-3" style={{ color: config.primaryColor }}>
                    {(item.price * item.quantity).toFixed(2)}€
                    </div>
                </div>
                ))
            )}
            </div>
            
            {/* TOTAL ET PAIEMENT */}
            {cart.length > 0 && (
            <div className="border-t pt-4 space-y-3" style={{ borderColor: config.cardBorderColor }}>
                <div className="flex justify-between items-center font-bold text-xl bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg border-2" style={{ borderColor: config.primaryColor }}>
                <span>TOTAL:</span>
                <span className="text-3xl" style={{ color: config.primaryColor }}>
                    {cartTotal.toFixed(2)}€
                </span>
                </div>
                
                <button
                onClick={processPayment}
                className="w-full py-4 px-4 rounded-lg text-white font-bold text-xl transition-all hover:scale-105 transform shadow-lg"
                style={{ backgroundColor: config.primaryColor }}
                >
                💳 ENCAISSER ({cartTotal.toFixed(2)}€)
                </button>
                
                <button
                onClick={clearCart}
                className="w-full py-2 px-4 rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium transition-all"
                >
                🗑️ Vider le panier
                </button>
            </div>
            )}
        </CardContent>
        </Card>
    );
    };

    export default POSCart;
