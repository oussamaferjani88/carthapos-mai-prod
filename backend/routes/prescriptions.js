const express = require('express');
const { PrismaClient } = require('@prisma/client');
const router = express.Router();
const prisma = new PrismaClient();

// GET /api/prescriptions - Get all prescriptions
router.get('/', async (req, res) => {
  try {
    const { status, patient_name, doctor_name, date_from, date_to } = req.query;
    
    let prescriptions = [
      {
        id: 1,
        prescription_number: 'ORD-2024-001',
        patient_name: 'Marie Dubois',
        patient_id: 'P001',
        patient_birth_date: '1985-05-15',
        patient_phone: '+33 1 23 45 67 89',
        doctor_name: 'Dr. Martin Leblanc',
        doctor_id: 'D001',
        doctor_rpps: '12345678901',
        date: '2024-09-25',
        status: 'pending',
        medications: [
          {
            name: 'Paracétamol 500mg',
            dosage: '1 comprimé 3x/jour',
            quantity: 30,
            duration: '10 jours',
            price: 8.50,
            reimbursement_rate: 65
          },
          {
            name: 'Ibuprofène 400mg',
            dosage: '1 comprimé si douleur',
            quantity: 20,
            duration: 'si besoin',
            price: 12.30,
            reimbursement_rate: 65
          }
        ],
        total: 20.80,
        patient_contribution: 7.28,
        insurance_coverage: 13.52,
        notes: 'À prendre avec de la nourriture',
        insurance: 'CPAM',
        insurance_number: '1234567890123',
        pharmacist_notes: ''
      },
      {
        id: 2,
        prescription_number: 'ORD-2024-002',
        patient_name: 'Jean Martin',
        patient_id: 'P002',
        patient_birth_date: '1970-08-22',
        patient_phone: '+33 1 34 56 78 90',
        doctor_name: 'Dr. Sophie Durand',
        doctor_id: 'D002',
        doctor_rpps: '23456789012',
        date: '2024-09-24',
        status: 'completed',
        medications: [
          {
            name: 'Amoxicilline 1g',
            dosage: '1 comprimé 2x/jour',
            quantity: 14,
            duration: '7 jours',
            price: 25.90,
            reimbursement_rate: 65
          }
        ],
        total: 25.90,
        patient_contribution: 9.07,
        insurance_coverage: 16.83,
        notes: 'Traitement antibiotique - 7 jours',
        insurance: 'Mutuelle Santé Plus',
        insurance_number: '9876543210987',
        pharmacist_notes: 'Patient informé des effets secondaires',
        dispensed_at: '2024-09-24T14:30:00Z',
        dispensed_by: 'Pharmacien Dupont'
      }
    ];

    // Apply filters
    if (status) {
      prescriptions = prescriptions.filter(p => p.status === status);
    }
    
    if (patient_name) {
      prescriptions = prescriptions.filter(p => 
        p.patient_name.toLowerCase().includes(patient_name.toLowerCase())
      );
    }
    
    if (doctor_name) {
      prescriptions = prescriptions.filter(p => 
        p.doctor_name.toLowerCase().includes(doctor_name.toLowerCase())
      );
    }

    res.json(prescriptions);
  } catch (error) {
    console.error('Error fetching prescriptions:', error);
    res.status(500).json({ error: 'Failed to fetch prescriptions' });
  }
});

// GET /api/prescriptions/:id - Get prescription by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const prescription = {
      id: parseInt(id),
      prescription_number: 'ORD-2024-001',
      patient_name: 'Marie Dubois',
      patient_id: 'P001',
      patient_birth_date: '1985-05-15',
      patient_phone: '+33 1 23 45 67 89',
      patient_address: '123 Rue de la Santé, 75014 Paris',
      patient_social_security: '285055678901234',
      doctor_name: 'Dr. Martin Leblanc',
      doctor_id: 'D001',
      doctor_rpps: '12345678901',
      doctor_address: '456 Avenue Médicale, 75015 Paris',
      date: '2024-09-25',
      status: 'pending',
      medications: [
        {
          id: 1,
          name: 'Paracétamol 500mg',
          commercial_name: 'Doliprane',
          dosage: '1 comprimé 3x/jour',
          quantity: 30,
          duration: '10 jours',
          price: 8.50,
          reimbursement_rate: 65,
          contraindications: ['Allergie au paracétamol'],
          side_effects: ['Nausées rares']
        },
        {
          id: 2,
          name: 'Ibuprofène 400mg',
          commercial_name: 'Advil',
          dosage: '1 comprimé si douleur',
          quantity: 20,
          duration: 'si besoin',
          price: 12.30,
          reimbursement_rate: 65,
          contraindications: ['Ulcère gastrique', 'Grossesse'],
          side_effects: ['Maux d\'estomac', 'Vertiges']
        }
      ],
      total: 20.80,
      patient_contribution: 7.28,
      insurance_coverage: 13.52,
      notes: 'À prendre avec de la nourriture. Contrôle dans 1 semaine.',
      insurance: 'CPAM',
      insurance_number: '1234567890123',
      pharmacist_notes: '',
      renewal_count: 0,
      max_renewals: 2
    };

    res.json(prescription);
  } catch (error) {
    console.error('Error fetching prescription:', error);
    res.status(500).json({ error: 'Failed to fetch prescription' });
  }
});

// POST /api/prescriptions - Create new prescription
router.post('/', async (req, res) => {
  try {
    const {
      patient_name,
      patient_id,
      patient_birth_date,
      patient_phone,
      doctor_name,
      doctor_id,
      doctor_rpps,
      medications,
      notes,
      insurance,
      insurance_number
    } = req.body;

    if (!patient_name || !doctor_name || !medications || !Array.isArray(medications)) {
      return res.status(400).json({ error: 'Patient name, doctor name, and medications are required' });
    }

    const total = medications.reduce((sum, med) => sum + (med.price || 0), 0);
    const insuranceCoverage = total * 0.65; // 65% coverage
    const patientContribution = total - insuranceCoverage;

    const newPrescription = {
      id: Date.now(),
      prescription_number: `ORD-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`,
      patient_name,
      patient_id,
      patient_birth_date,
      patient_phone,
      doctor_name,
      doctor_id,
      doctor_rpps,
      date: new Date().toISOString().split('T')[0],
      status: 'pending',
      medications,
      total: parseFloat(total.toFixed(2)),
      patient_contribution: parseFloat(patientContribution.toFixed(2)),
      insurance_coverage: parseFloat(insuranceCoverage.toFixed(2)),
      notes: notes || '',
      insurance: insurance || 'CPAM',
      insurance_number: insurance_number || '',
      pharmacist_notes: '',
      created_at: new Date().toISOString()
    };

    res.status(201).json(newPrescription);
  } catch (error) {
    console.error('Error creating prescription:', error);
    res.status(500).json({ error: 'Failed to create prescription' });
  }
});

// PUT /api/prescriptions/:id - Update prescription
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (updateData.medications) {
      const total = updateData.medications.reduce((sum, med) => sum + (med.price || 0), 0);
      const insuranceCoverage = total * 0.65;
      const patientContribution = total - insuranceCoverage;
      
      updateData.total = parseFloat(total.toFixed(2));
      updateData.patient_contribution = parseFloat(patientContribution.toFixed(2));
      updateData.insurance_coverage = parseFloat(insuranceCoverage.toFixed(2));
    }

    const updatedPrescription = {
      id: parseInt(id),
      ...updateData,
      updated_at: new Date().toISOString()
    };

    res.json(updatedPrescription);
  } catch (error) {
    console.error('Error updating prescription:', error);
    res.status(500).json({ error: 'Failed to update prescription' });
  }
});

// POST /api/prescriptions/:id/dispense - Dispense prescription
router.post('/:id/dispense', async (req, res) => {
  try {
    const { id } = req.params;
    const { pharmacist_notes, dispensed_by } = req.body;

    const dispensedPrescription = {
      id: parseInt(id),
      status: 'completed',
      dispensed_at: new Date().toISOString(),
      dispensed_by: dispensed_by || 'Pharmacien',
      pharmacist_notes: pharmacist_notes || '',
      updated_at: new Date().toISOString()
    };

    res.json(dispensedPrescription);
  } catch (error) {
    console.error('Error dispensing prescription:', error);
    res.status(500).json({ error: 'Failed to dispense prescription' });
  }
});

// POST /api/prescriptions/:id/cancel - Cancel prescription
router.post('/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const cancelledPrescription = {
      id: parseInt(id),
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancellation_reason: reason || 'Cancelled by request',
      updated_at: new Date().toISOString()
    };

    res.json(cancelledPrescription);
  } catch (error) {
    console.error('Error cancelling prescription:', error);
    res.status(500).json({ error: 'Failed to cancel prescription' });
  }
});

// GET /api/prescriptions/medications/search - Search medications
router.get('/medications/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    const medications = [
      {
        name: 'Paracétamol 500mg',
        commercial_names: ['Doliprane', 'Efferalgan', 'Dafalgan'],
        dosage_forms: ['Comprimé', 'Gélule', 'Suppositoire'],
        price: 8.50,
        reimbursement_rate: 65,
        prescription_required: false
      },
      {
        name: 'Ibuprofène 400mg',
        commercial_names: ['Advil', 'Nurofen', 'Spedifen'],
        dosage_forms: ['Comprimé', 'Capsule'],
        price: 12.30,
        reimbursement_rate: 65,
        prescription_required: false
      },
      {
        name: 'Amoxicilline 1g',
        commercial_names: ['Clamoxyl', 'Amodex'],
        dosage_forms: ['Gélule', 'Suspension'],
        price: 25.90,
        reimbursement_rate: 65,
        prescription_required: true
      }
    ];

    let results = medications;
    if (q) {
      results = medications.filter(med => 
        med.name.toLowerCase().includes(q.toLowerCase()) ||
        med.commercial_names.some(name => name.toLowerCase().includes(q.toLowerCase()))
      );
    }

    res.json(results);
  } catch (error) {
    console.error('Error searching medications:', error);
    res.status(500).json({ error: 'Failed to search medications' });
  }
});

// GET /api/prescriptions/stats - Get prescription statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = {
      total_prescriptions: 1245,
      pending_prescriptions: 23,
      completed_prescriptions: 1198,
      cancelled_prescriptions: 24,
      total_value: 45678.90,
      insurance_coverage: 29691.29,
      patient_contributions: 15987.61,
      average_prescription_value: 36.70,
      most_prescribed_medications: [
        { name: 'Paracétamol 500mg', count: 156 },
        { name: 'Ibuprofène 400mg', count: 98 },
        { name: 'Amoxicilline 1g', count: 67 }
      ],
      monthly_stats: [
        { month: '2024-07', prescriptions: 89, value: 3456.80 },
        { month: '2024-08', prescriptions: 102, value: 4123.50 },
        { month: '2024-09', prescriptions: 95, value: 3789.20 }
      ],
      top_doctors: [
        { name: 'Dr. Martin Leblanc', prescriptions: 45 },
        { name: 'Dr. Sophie Durand', prescriptions: 38 },
        { name: 'Dr. Pierre Rousseau', prescriptions: 32 }
      ]
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching prescription stats:', error);
    res.status(500).json({ error: 'Failed to fetch prescription stats' });
  }
});

module.exports = router;