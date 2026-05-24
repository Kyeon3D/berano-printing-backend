require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const nodemailer = require('nodemailer'); // Added for emails

const app = express();

// Middleware
app.use(cors({
  origin: ['https://beranosprinting.site', 'https://www.beranosprinting.site'],
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

// Email Sending Function
async function sendStatusEmail(reservation, status) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return; // Skip if no email setup

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  let emailSubject = '';
  let emailText = '';

  switch(status) {
    case 'confirmed':
      emailSubject = '✅ Your Reservation is Confirmed - Berano\'s Printing';
      emailText = `Hello ${reservation.fullName},\n\nGreat news! Your reservation has been CONFIRMED.\n\nService: ${reservation.service}\nQuantity: ${reservation.quantity}\nPickup Date: ${new Date(reservation.pickupDate).toLocaleDateString()}\n\nPlease send your design files to rowelberano@gmail.com and prepare the downpayment.\n\nThank you!`;
      break;
    case 'completed':
      emailSubject = '🎉 Your Order is Ready for Pickup - Berano\'s Printing';
      emailText = `Hello ${reservation.fullName},\n\nYour order is now COMPLETED and ready for pickup!\n\nService: ${reservation.service}\nQuantity: ${reservation.quantity}\n\nShop Address: 212 T. Santiago St. Veinte Reales Valenzuela City\n\nThank you!`;
      break;
    case 'cancelled':
      emailSubject = '❌ Reservation Cancelled - Berano\'s Printing';
      emailText = `Hello ${reservation.fullName},\n\nYour reservation has been CANCELLED.\n\nService: ${reservation.service}\n\nIf you have questions, contact us at 0977 773 5361.`;
      break;
  }

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: reservation.email,
      subject: emailSubject,
      text: emailText
    });
    console.log(`✅ Email sent to ${reservation.email}`);
  } catch (error) {
    console.error('❌ Error sending email:', error);
  }
}

// POST Route - Submit Reservation
app.post('/api/reserve', async (req, res) => {
  try {
    const { fullName, contactNumber, email, service, pickupDate, quantity, notes } = req.body;
    
    if (!fullName || !contactNumber || !service || !pickupDate || !quantity) {
      return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }

    const newReservation = new Reservation({
      fullName, contactNumber, email: email || 'N/A', service, pickupDate, quantity: parseInt(quantity), notes
    });

    await newReservation.save();
    res.status(201).json({ success: true, message: 'Reservation saved successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// GET Route - View All Reservations
app.get('/api/reservations', async (req, res) => {
  try {
    const reservations = await Reservation.find().sort({ createdAt: -1 });
    res.json({ success: true, count: reservations.length, data: reservations });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching reservations' });
  }
});

// PATCH Route - Update Status & Send Email
app.patch('/api/reservations/:id', async (req, res) => {
  try {
    const { status, sendEmail } = req.body;
    const updatedReservation = await Reservation.findByIdAndUpdate(req.params.id, { status }, { new: true });
    
    if (!updatedReservation) return res.status(404).json({ success: false, message: 'Not found' });
    
    if (sendEmail && updatedReservation.email !== 'N/A') {
      await sendStatusEmail(updatedReservation, status);
    }
    
    res.json({ success: true, data: updatedReservation });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE Route - Delete Reservation
app.delete('/api/reservations/:id', async (req, res) => {
  try {
    const deletedReservation = await Reservation.findByIdAndDelete(req.params.id);
    
    if (!deletedReservation) {
      return res.status(404).json({ success: false, message: 'Reservation not found' });
    }
    
    res.json({ success: true, message: 'Reservation deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting reservation:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
