const express = require('express');
const router = express.Router();
const Reservation = require('../models/Reservation');

const TOTAL_TABLES = 20;
const DINING_WINDOW_HOURS = 2;

// Smart table assignment — finds first available table at requested date/time
async function assignTable(date, time) {
  const [hours, minutes] = time.split(':').map(Number);
  const requestedMinutes = hours * 60 + minutes;

  console.log(`[AssignTable] Checking: Date=${date}, Time=${time} (${requestedMinutes} mins)`);

  const reservationsOnDate = await Reservation.find({ date, status: 'Confirmed' });
  console.log(`[AssignTable] Found ${reservationsOnDate.length} confirmed reservations on this date.`);

  const occupiedTables = new Set();
  for (const res of reservationsOnDate) {
    const [rh, rm] = res.time.split(':').map(Number);
    const resMinutes = rh * 60 + rm;

    // 2-hour dining window overlap check
    const diff = Math.abs(requestedMinutes - resMinutes);
    const overlap = diff < DINING_WINDOW_HOURS * 60;
    
    console.log(`- Table ${res.tableNumber} at ${res.time} (${resMinutes} mins). Diff: ${diff}m. Overlap: ${overlap}`);

    if (overlap) {
      occupiedTables.add(Number(res.tableNumber));
    }
  }

  console.log(`[AssignTable] Occupied:`, Array.from(occupiedTables));

  for (let t = 1; t <= TOTAL_TABLES; t++) {
    if (!occupiedTables.has(t)) {
      console.log(`[AssignTable] Result: Table ${t}`);
      return t;
    }
  }
  return null; // Fully booked
}

// POST /api/reservations
router.post('/', async (req, res) => {
  try {
    const { userEmail, name, email, phone, date, time, guests, specialRequests } = req.body;

    if (!name || !email || !date || !time || !guests) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const tableNumber = await assignTable(date, time);
    if (!tableNumber) {
      return res.status(409).json({ message: 'Sorry, no tables available at this time slot. Please try a different time.' });
    }

    // Reservation expires 2 hours after scheduled time
    const [h, m] = time.split(':').map(Number);
    const expiresAt = new Date(date);
    expiresAt.setHours(h + DINING_WINDOW_HOURS, m, 0, 0);

    const reservation = await Reservation.create({
      userEmail: (userEmail || email).toLowerCase(),
      name,
      email,
      phone,
      tableNumber,
      date,
      time,
      guests,
      specialRequests: specialRequests || '',
      expiresAt
    });

    res.status(201).json(reservation);
  } catch (err) {
    console.error('Create reservation error:', err);
    res.status(500).json({ message: 'Failed to create reservation' });
  }
});

// GET /api/reservations/user/:email
router.get('/user/:email', async (req, res) => {
  try {
    const reservations = await Reservation.find({
      userEmail: req.params.email.toLowerCase(),
      status: 'Confirmed'
    }).sort({ createdAt: -1 });
    res.json(reservations);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch reservations' });
  }
});

// GET /api/reservations — all (manager)
router.get('/', async (req, res) => {
  try {
    const reservations = await Reservation.find().sort({ createdAt: -1 });
    res.json(reservations);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch reservations' });
  }
});

// PATCH /api/reservations/:id/status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    console.log(`Updating reservation ${req.params.id} to status: ${status}`);
    if (!['Confirmed', 'Cancelled', 'Completed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const reservation = await Reservation.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!reservation) return res.status(404).json({ message: 'Reservation not found' });
    res.json(reservation);
  } catch (err) {
    console.error('Update reservation status error:', err);
    res.status(500).json({ message: 'Failed to update reservation status' });
  }
});

// DELETE /api/reservations/:id
router.delete('/:id', async (req, res) => {
  try {
    const res_ = await Reservation.findByIdAndDelete(req.params.id);
    if (!res_) return res.status(404).json({ message: 'Reservation not found' });
    res.json({ message: 'Reservation cancelled' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to cancel reservation' });
  }
});

module.exports = router;
