const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/savoria');
    console.log('MongoDB Connected');

    const adminExists = await User.findOne({ email: 'admin@savoria.com' });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await User.create({
        name: 'Manager Admin',
        email: 'admin@savoria.com',
        password: hashedPassword,
        role: 'manager'
      });
      console.log('✅ Admin user seeded: admin@savoria.com / admin123');
    } else {
      console.log('⚠️ Admin user already exists');
    }
    process.exit(0);
  } catch (err) {
    console.error('Error seeding admin:', err);
    process.exit(1);
  }
};

seedAdmin();
