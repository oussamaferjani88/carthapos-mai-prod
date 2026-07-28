import { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  Plus, 
  User, 
  Phone,
  CheckCircle,
  XCircle,
  AlertCircle,
  Edit2,
  Trash2
} from 'lucide-react';

// Components
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../components/ui/table';
import { getCurrencySymbol } from '../utils/currency';

export default function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [formData, setFormData] = useState({
    customer_id: '',
    service_name: '',
    appointment_date: '',
    duration: 60,
    price: 0,
    notes: ''
  });

  const formatCurrency = (amount) => {
    const val = parseFloat(amount) || 0;
    return `${val.toFixed(2)} ${getCurrencySymbol('TND')}`;
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadAppointments(selectedDate);
  }, [selectedDate]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      if (window.electronAPI) {
        const [appointmentsRes, customersRes, servicesRes] = await Promise.all([
          window.electronAPI.getAppointments(),
          window.electronAPI.getCustomers(),
          window.electronAPI.getServices()
        ]);
        
        setAppointments(appointmentsRes);
        setCustomers(customersRes);
        setServices(servicesRes);
      } else {
        // Fallback pour le développement web
        setCustomers([
          { id: 1, name: 'Marie Dubois', phone: '0123456789' },
          { id: 2, name: 'Pierre Martin', phone: '0987654321' }
        ]);
        
        setServices([
          { id: 1, name: 'Coupe Homme', duration: 30, price: 25, category: 'Coiffure' },
          { id: 2, name: 'Coupe Femme', duration: 45, price: 35, category: 'Coiffure' },
          { id: 3, name: 'Coloration', duration: 120, price: 80, category: 'Coloration' }
        ]);
        
        setAppointments([
          {
            id: 1,
            customer_id: 1,
            customer_name: 'Marie Dubois',
            customer_phone: '0123456789',
            service_name: 'Coupe Femme',
            appointment_date: new Date().toISOString(),
            duration: 45,
            status: 'scheduled',
            price: 35,
            notes: 'Préfère les cheveux courts'
          },
          {
            id: 2,
            customer_id: 2,
            customer_name: 'Pierre Martin',
            customer_phone: '0987654321',
            service_name: 'Coupe Homme',
            appointment_date: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
            duration: 30,
            status: 'scheduled',
            price: 25,
            notes: ''
          }
        ]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAppointments = async (date) => {
    try {
      if (window.electronAPI) {
        const appointments = await window.electronAPI.getAppointments(date);
        setAppointments(appointments);
      }
    } catch (error) {
      console.error('Error loading appointments:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.customer_id || !formData.service_name || !formData.appointment_date) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      if (editingAppointment) {
        // Pour la mise à jour, on utiliserait updateAppointment si disponible
        console.log('Update appointment:', formData);
      } else {
        if (window.electronAPI) {
          await window.electronAPI.addAppointment(formData);
        }
      }
      
      setDialogOpen(false);
      setEditingAppointment(null);
      setFormData({ customer_id: '', service_name: '', appointment_date: '', duration: 60, price: 0, notes: '' });
      loadAppointments(selectedDate);
    } catch (error) {
      console.error('Error saving appointment:', error);
      alert('Erreur lors de la sauvegarde');
    }
  };

  const openCreateDialog = () => {
    setEditingAppointment(null);
    setFormData({ 
      customer_id: '', 
      service_name: '', 
      appointment_date: selectedDate + 'T09:00', 
      duration: 60, 
      price: 0, 
      notes: '' 
    });
    setDialogOpen(true);
  };

  const updateAppointmentStatus = async (appointmentId, newStatus) => {
    try {
      if (window.electronAPI) {
        await window.electronAPI.updateAppointmentStatus(appointmentId, newStatus);
      }
      loadAppointments(selectedDate);
    } catch (error) {
      console.error('Error updating appointment status:', error);
      alert('Erreur lors de la mise à jour');
    }
  };

  const onServiceChange = (serviceId) => {
    const service = services.find(s => s.id === parseInt(serviceId));
    if (service) {
      setFormData({
        ...formData,
        service_name: service.name,
        duration: service.duration,
        price: service.price
      });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-500 text-white';
      case 'confirmed':
        return 'bg-green-500 text-white';
      case 'in_progress':
        return 'bg-yellow-500 text-white';
      case 'completed':
        return 'bg-gray-500 text-white';
      case 'cancelled':
        return 'bg-red-500 text-white';
      case 'no_show':
        return 'bg-orange-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'scheduled':
        return 'Programmé';
      case 'confirmed':
        return 'Confirmé';
      case 'in_progress':
        return 'En cours';
      case 'completed':
        return 'Terminé';
      case 'cancelled':
        return 'Annulé';
      case 'no_show':
        return 'Absent';
      default:
        return 'Inconnu';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'scheduled':
        return <Calendar className="h-4 w-4" />;
      case 'confirmed':
        return <CheckCircle className="h-4 w-4" />;
      case 'in_progress':
        return <Clock className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      case 'no_show':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  const todayAppointments = appointments.filter(apt => 
    new Date(apt.appointment_date).toDateString() === new Date(selectedDate).toDateString()
  );

  const statusStats = {
    scheduled: todayAppointments.filter(a => a.status === 'scheduled').length,
    confirmed: todayAppointments.filter(a => a.status === 'confirmed').length,
    completed: todayAppointments.filter(a => a.status === 'completed').length,
    cancelled: todayAppointments.filter(a => a.status === 'cancelled').length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            <Calendar className="mr-3 h-8 w-8" />
            Rendez-vous
          </h1>
          <p className="text-muted-foreground">
            Gestion du planning et des rendez-vous clients
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau rendez-vous
        </Button>
      </div>

      {/* Date Selector */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <Label htmlFor="selected-date">Date sélectionnée:</Label>
            <Input
              id="selected-date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-auto"
            />
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
              >
                Aujourd'hui
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  const tomorrow = new Date();
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  setSelectedDate(tomorrow.toISOString().split('T')[0]);
                }}
              >
                Demain
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Calendar className="h-4 w-4 text-blue-500" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Programmés</p>
                <p className="text-2xl font-bold">{statusStats.scheduled}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Confirmés</p>
                <p className="text-2xl font-bold">{statusStats.confirmed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 text-gray-500" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Terminés</p>
                <p className="text-2xl font-bold">{statusStats.completed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <XCircle className="h-4 w-4 text-red-500" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Annulés</p>
                <p className="text-2xl font-bold">{statusStats.cancelled}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Appointments Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Rendez-vous du {new Date(selectedDate).toLocaleDateString('fr-FR', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </CardTitle>
          <CardDescription>
            {todayAppointments.length} rendez-vous programmé(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {todayAppointments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Heure</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Durée</TableHead>
                  <TableHead>Prix</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {todayAppointments
                  .sort((a, b) => new Date(a.appointment_date) - new Date(b.appointment_date))
                  .map((appointment) => (
                    <TableRow key={appointment.id}>
                      <TableCell className="font-medium">
                        {new Date(appointment.appointment_date).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{appointment.customer_name}</div>
                            {appointment.customer_phone && (
                              <div className="text-xs text-muted-foreground flex items-center">
                                <Phone className="h-3 w-3 mr-1" />
                                {appointment.customer_phone}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{appointment.service_name}</div>
                          {appointment.notes && (
                            <div className="text-xs text-muted-foreground italic">
                              {appointment.notes}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm">
                          <Clock className="h-3 w-3 mr-1" />
                          {appointment.duration}min
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">
                          {formatCurrency(appointment.price)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(appointment.status)}>
                          <div className="flex items-center space-x-1">
                            {getStatusIcon(appointment.status)}
                            <span>{getStatusLabel(appointment.status)}</span>
                          </div>
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-1">
                          {appointment.status === 'scheduled' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateAppointmentStatus(appointment.id, 'confirmed')}
                            >
                              <CheckCircle className="h-3 w-3" />
                            </Button>
                          )}
                          {appointment.status === 'confirmed' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateAppointmentStatus(appointment.id, 'in_progress')}
                            >
                              <Clock className="h-3 w-3" />
                            </Button>
                          )}
                          {appointment.status === 'in_progress' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateAppointmentStatus(appointment.id, 'completed')}
                            >
                              <CheckCircle className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateAppointmentStatus(appointment.id, 'cancelled')}
                          >
                            <XCircle className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Aucun rendez-vous</h3>
              <p className="text-muted-foreground mb-4">
                Aucun rendez-vous programmé pour cette date
              </p>
              <Button onClick={openCreateDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Créer un rendez-vous
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingAppointment ? 'Modifier le rendez-vous' : 'Nouveau rendez-vous'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="customer">Client *</Label>
              <Select 
                value={formData.customer_id.toString()} 
                onValueChange={(value) => setFormData({ ...formData, customer_id: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez un client" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id.toString()}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="service">Service *</Label>
              <Select 
                value={services.find(s => s.name === formData.service_name)?.id?.toString() || ''} 
                onValueChange={onServiceChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez un service" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.id.toString()}>
                      {service.name} - {service.duration}min - {formatCurrency(service.price)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="appointment_date">Date et heure *</Label>
              <Input
                id="appointment_date"
                type="datetime-local"
                value={formData.appointment_date}
                onChange={(e) => setFormData({ ...formData, appointment_date: e.target.value })}
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="duration">Durée (min)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 60 })}
                  min="15"
                  max="480"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="price">Prix ({getCurrencySymbol('TND')})</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  min="0"
                />
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Notes ou instructions spéciales"
                rows={3}
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Annuler
              </Button>
              <Button type="submit">
                {editingAppointment ? 'Modifier' : 'Créer'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
