import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import POSPreviewPage from './pages/pos/POSPreviewPage';

// Route de test pour les nouveaux composants POS
const POSTestPage = () => {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">🧪 Test des Composants POS</h1>
      <div className="bg-green-100 p-4 rounded-lg mb-4">
        <p>✅ Si vous voyez ce message, la route de test fonctionne !</p>
        <p>📍 URL: /pos-test</p>
      </div>
      <a href="/pos-preview" className="text-blue-600 hover:underline">
        → Retour au POS Preview
      </a>
    </div>
  );
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/pos-preview" element={<POSPreviewPage />} />
          <Route path="/pos-test" element={<POSTestPage />} />
          <Route path="*" element={<App />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
