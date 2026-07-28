import React, { useState, useEffect } from 'react';
import { getCurrencySymbol } from '../utils/currency';
import { Stethoscope, Plus, FileText, User, Calendar, Clock, Search, Filter } from 'lucide-react';
import { useThemeApplier } from '../hooks/useThemeApplier';

const Prescription = () => {
  useThemeApplier();
  const formatCurrency = (v) => `${(parseFloat(v) || 0).toFixed(2)} ${getCurrencySymbol('TND')}`;
  
  const [prescriptions, setPrescriptions] = useState([
    {
      id: 1,
      patientName: 'Marie Dubois',
      patientId: 'P001',
      doctorName: 'Dr. Martin Leblanc',
      doctorId: 'D001',
      prescriptionNumber: 'ORD-2024-001',
      date: '2024-08-17',
      status: 'pending',
      medications: [
        { name: 'Paracétamol 500mg', dosage: '1 comprimé 3x/jour', quantity: 30, price: 8.50 },
        { name: 'Ibuprofène 400mg', dosage: '1 comprimé si douleur', quantity: 20, price: 12.30 }
      ],
      total: 20.80,
      notes: 'À prendre avec de la nourriture',
      insurance: 'CPAM',
      insuranceNumber: '1234567890123'
    },
    {
      id: 2,
      patientName: 'Jean Martin',
      patientId: 'P002',
      doctorName: 'Dr. Sophie Durand',
      doctorId: 'D002',
      prescriptionNumber: 'ORD-2024-002',
      date: '2024-08-16',
      status: 'completed',
      medications: [
        { name: 'Amoxicilline 1g', dosage: '1 comprimé 2x/jour', quantity: 14, price: 25.90 }
      ],
      total: 25.90,
      notes: 'Traitement antibiotique - 7 jours',
      insurance: 'Mutuelle Santé',
      insuranceNumber: '9876543210987'
    },
    {
      id: 3,
      patientName: 'Sophie Laurent',
      patientId: 'P003',
      doctorName: 'Dr. Pierre Rousseau',
      doctorId: 'D003',
      prescriptionNumber: 'ORD-2024-003',
      date: '2024-08-15',
      status: 'partial',
      medications: [
        { name: 'Vitamine D3', dosage: '1 goutte/jour', quantity: 1, price: 15.60, fulfilled: true },
        { name: 'Calcium 500mg', dosage: '1 comprimé/jour', quantity: 60, price: 18.40, fulfilled: false }
      ],
      total: 34.00,
      notes: 'Complément alimentaire',
      insurance: 'CPAM',
      insuranceNumber: '5555666677778'
    }
  ]);

  const [activeTab, setActiveTab] = useState('prescriptions');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [newPrescription, setNewPrescription] = useState({
    patientName: '',
    patientId: '',
    doctorName: '',
    doctorId: '',
    medications: [],
    notes: '',
    insurance: '',
    insuranceNumber: ''
  });
  const [showNewForm, setShowNewForm] = useState(false);

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    partial: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
  };

  const statusLabels = {
    pending: 'En attente',
    partial: 'Partielle',
    completed: 'Terminée',
    cancelled: 'Annulée'
  };

  const filteredPrescriptions = prescriptions.filter(prescription => {
    const matchesSearch = 
      prescription.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prescription.doctorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prescription.prescriptionNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || prescription.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStats = () => {
    return {
      total: prescriptions.length,
      pending: prescriptions.filter(p => p.status === 'pending').length,
      partial: prescriptions.filter(p => p.status === 'partial').length,
      completed: prescriptions.filter(p => p.status === 'completed').length,
      totalValue: prescriptions.reduce((sum, p) => sum + p.total, 0)
    };
  };

  const handleStatusChange = (prescriptionId, newStatus) => {
    setPrescriptions(prescriptions.map(p => 
      p.id === prescriptionId ? { ...p, status: newStatus } : p
    ));
  };

  const handleMedicationFulfill = (prescriptionId, medicationIndex) => {
    setPrescriptions(prescriptions.map(p => {
      if (p.id === prescriptionId) {
        const updatedMedications = [...p.medications];
        updatedMedications[medicationIndex] = {
          ...updatedMedications[medicationIndex],
          fulfilled: true
        };
        
        const allFulfilled = updatedMedications.every(med => med.fulfilled !== false);
        const anyFulfilled = updatedMedications.some(med => med.fulfilled === true);
        
        return {
          ...p,
          medications: updatedMedications,
          status: allFulfilled ? 'completed' : (anyFulfilled ? 'partial' : 'pending')
        };
      }
      return p;
    }));
  };

  const stats = getStats();

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gestion des Ordonnances</h1>
          <p className="text-muted-foreground mt-2">
            Gérez les ordonnances médicales et prescriptions
          </p>
        </div>
        <button
          onClick={() => setShowNewForm(true)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nouvelle Ordonnance
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total</p>
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
            </div>
            <FileText className="w-8 h-8 text-primary" />
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">En Attente</p>
              <p className="text-2xl font-bold text-foreground">{stats.pending}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Partielles</p>
              <p className="text-2xl font-bold text-foreground">{stats.partial}</p>
            </div>
            <Calendar className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Terminées</p>
              <p className="text-2xl font-bold text-foreground">{stats.completed}</p>
            </div>
            <Stethoscope className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Valeur Totale</p>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(stats.totalValue)}</p>
            </div>
            <Stethoscope className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher par patient, médecin ou numéro d'ordonnance..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background"
        >
          <option value="all">Tous les statuts</option>
          <option value="pending">En attente</option>
          <option value="partial">Partielles</option>
          <option value="completed">Terminées</option>
          <option value="cancelled">Annulées</option>
        </select>
      </div>

      {/* New Prescription Form Modal */}
      {showNewForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Nouvelle Ordonnance</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Nom du patient"
                  value={newPrescription.patientName}
                  onChange={(e) => setNewPrescription({...newPrescription, patientName: e.target.value})}
                  className="px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                />
                <input
                  type="text"
                  placeholder="ID Patient"
                  value={newPrescription.patientId}
                  onChange={(e) => setNewPrescription({...newPrescription, patientId: e.target.value})}
                  className="px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Nom du médecin"
                  value={newPrescription.doctorName}
                  onChange={(e) => setNewPrescription({...newPrescription, doctorName: e.target.value})}
                  className="px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                />
                <input
                  type="text"
                  placeholder="ID Médecin"
                  value={newPrescription.doctorId}
                  onChange={(e) => setNewPrescription({...newPrescription, doctorId: e.target.value})}
                  className="px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Assurance"
                  value={newPrescription.insurance}
                  onChange={(e) => setNewPrescription({...newPrescription, insurance: e.target.value})}
                  className="px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                />
                <input
                  type="text"
                  placeholder="Numéro d'assurance"
                  value={newPrescription.insuranceNumber}
                  onChange={(e) => setNewPrescription({...newPrescription, insuranceNumber: e.target.value})}
                  className="px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                />
              </div>
              <textarea
                placeholder="Notes médicales"
                value={newPrescription.notes}
                onChange={(e) => setNewPrescription({...newPrescription, notes: e.target.value})}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                rows="3"
              />
              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => {
                    // Create prescription logic here
                    setShowNewForm(false);
                  }}
                  disabled={!newPrescription.patientName || !newPrescription.doctorName}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
                >
                  Créer l'Ordonnance
                </button>
                <button
                  onClick={() => setShowNewForm(false)}
                  className="flex-1 px-4 py-2 bg-muted text-muted-foreground rounded-md hover:bg-muted/80"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Prescriptions List */}
      <div className="space-y-4">
        {filteredPrescriptions.map((prescription) => (
          <div key={prescription.id} className="bg-card border border-border rounded-lg p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="font-semibold text-foreground flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  {prescription.prescriptionNumber}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {new Date(prescription.date).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm ${statusColors[prescription.status]}`}>
                {statusLabels[prescription.status]}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2 text-sm mb-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Patient:</span>
                  <span>{prescription.patientName} ({prescription.patientId})</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Stethoscope className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Médecin:</span>
                  <span>{prescription.doctorName} ({prescription.doctorId})</span>
                </div>
              </div>
              <div>
                <div className="text-sm mb-2">
                  <span className="font-medium text-muted-foreground">Assurance:</span>
                  <span className="ml-2">{prescription.insurance}</span>
                </div>
                <div className="text-sm">
                  <span className="font-medium text-muted-foreground">N° Assurance:</span>
                  <span className="ml-2 font-mono">{prescription.insuranceNumber}</span>
                </div>
              </div>
            </div>

            {/* Medications */}
            <div className="border-t border-border pt-4 mb-4">
              <h5 className="font-medium mb-3">Médicaments prescrits:</h5>
              <div className="space-y-2">
                {prescription.medications.map((medication, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{medication.name}</p>
                      <p className="text-sm text-muted-foreground">{medication.dosage}</p>
                      <p className="text-sm text-muted-foreground">Quantité: {medication.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-foreground">{formatCurrency(medication.price)}</p>
                      {prescription.status !== 'completed' && (
                        <button
                          onClick={() => handleMedicationFulfill(prescription.id, index)}
                          disabled={medication.fulfilled}
                          className={`mt-1 px-3 py-1 rounded text-xs ${
                            medication.fulfilled
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                              : 'bg-primary text-primary-foreground hover:bg-primary/90'
                          }`}
                        >
                          {medication.fulfilled ? 'Délivré' : 'Délivrer'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {prescription.notes && (
              <div className="bg-muted/50 rounded p-3 mb-4">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">Notes:</span> {prescription.notes}
                </p>
              </div>
            )}

            <div className="flex justify-between items-center pt-4 border-t border-border">
              <div className="text-lg font-semibold text-foreground">
                Total: {formatCurrency(prescription.total)}
              </div>
              {prescription.status === 'pending' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleStatusChange(prescription.id, 'completed')}
                    className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm"
                  >
                    Marquer Terminée
                  </button>
                  <button
                    onClick={() => handleStatusChange(prescription.id, 'cancelled')}
                    className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm"
                  >
                    Annuler
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredPrescriptions.length === 0 && (
        <div className="text-center py-12">
          <Stethoscope className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Aucune ordonnance trouvée</p>
        </div>
      )}
    </div>
  );
};

export default Prescription;
