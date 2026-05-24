require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors({
  origin: ['https://beranosprinting.site', 'https://www.beranosprinting.site'], // Allow your domain
  credentials: false
}));
app.use(express.json());

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://berano:beranosprinting@berano.ajdagzu.mongodb.net/?appName=Berano';

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected Successfully'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// Reservation Schema
const reservationSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  contactNumber: { type: String, required: true },
  email: { type: String, default: 'N/A' },
  service: { type: String, required: true },
  pickupDate: { type: Date, required: true },
  quantity: { type: Number, required: true, min: 1 },
  notes: { type: String, default: '' },
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'completed', 'cancelled'], 
    default: 'pending' 
  },
  createdAt: { type: Date, default: Date.now }
});

const Reservation = mongoose.model('Reservation', reservationSchema);

// POST Route - Submit Reservation
app.post('/api/reserve', async (req, res) => {
  try {
    const { fullName, contactNumber, email, service, pickupDate, quantity, notes } = req.body;
    
    // Validation
    if (!fullName || !contactNumber || !service || !pickupDate || !quantity) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please fill in all required fields.' 
      });
    }

    // Create new reservation
    const newReservation = new Reservation({
      fullName,
      contactNumber,
      email: email || 'N/A',
      service,
      pickupDate: new Date(pickupDate),
      quantity: parseInt(quantity),
      notes: notes || ''
    });

    await newReservation.save();
    
    console.log('✅ New Reservation Saved:', newReservation);
    
    res.status(201).json({ 
      success: true, 
      message: 'Reservation submitted successfully!',
      reservationId: newReservation._id
    });
    
  } catch (error) {
    console.error('❌ Error saving reservation:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error. Please try again later.' 
    });
  }
});

// GET Route - View All Reservations (for admin)
app.get('/api/reservations', async (req, res) => {
  try {
    const reservations = await Reservation.find().sort({ createdAt: -1 });
    res.json({ success: true, count: reservations.length, data: reservations });
  } catch (error) {
    console.error('❌ Error fetching reservations:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching reservations' 
    });
  }
});

// GET Route - View Single Reservation
app.get('/api/reservations/:id', async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Reservation not found' });
    }
    res.json({ success: true, data: reservation });
  } catch (error) {
    console.error('❌ Error fetching reservation:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// UPDATE Route - Update Reservation Status
app.patch('/api/reservations/:id', async (req, res) => {
  try {
    const { status } = req.body;
    const updatedReservation = await Reservation.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );
    
    if (!updatedReservation) {
      return res.status(404).json({ success: false, message: 'Reservation not found' });
    }
    
    res.json({ success: true, data: updatedReservation });
  } catch (error) {
    console.error('❌ Error updating reservation:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
