const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Reservation = require('./models/Reservation');

dotenv.config();

const TOTAL_TABLES = 20;
const DINING_WINDOW_HOURS = 2;

async function assignTable(date, time) {
  const [hours, minutes] = time.split(':').map(Number);
  const requestedMinutes = hours * 60 + minutes;

  console.log(`Checking availability for Date: ${date}, Time: ${time} (${requestedMinutes} mins)`);

  const reservationsOnDate = await Reservation.find({ date, status: 'Confirmed' });
  console.log(`Found ${reservationsOnDate.length} confirmed reservations on this date.`);

  const occupiedTables = new Set();
  for (const res of reservationsOnDate) {
    const [rh, rm] = res.time.split(':').map(Number);
    const resMinutes = rh * 60 + rm;

    const overlap = Math.abs(requestedMinutes - resMinutes) < DINING_WINDOW_HOURS * 60;
    console.log(`- Res at ${res.time} (Table ${res.tableNumber}): Overlap? ${overlap}`);
    
    if (overlap) {
      occupiedTables.add(res.tableNumber);
    }
  }

  console.log('Occupied tables:', Array.from(occupiedTables));

  for (let t = 1; t <= TOTAL_TABLES; t++) {
    if (!occupiedTables.has(t)) {
      console.log(`Assigning Table ${t}`);
      return t;
    }
  }
  return null;
}

async function debug() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    // Test with a date that likely has reservations if the user just tested
    // Or just list recent confirmed ones
    const recent = await Reservation.find({ status: 'Confirmed' }).sort({ createdAt: -1 }).limit(5);
    console.log('Recent confirmed reservations:');
    recent.forEach(r => console.log(`  Table ${r.tableNumber} | Date ${r.date} | Time ${r.time}`));

    if (recent.length > 0) {
        const testDate = recent[0].date;
        const testTime = recent[0].time;
        console.log(`\nTesting assignment for same slot: ${testDate} at ${testTime}`);
        await assignTable(testDate, testTime);
    }

    mongoose.connection.close();
  } catch (err) {
    console.error(err);
  }
}

debug();
