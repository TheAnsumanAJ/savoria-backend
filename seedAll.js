const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const User = require('./models/User');
const MenuItem = require('./models/MenuItem');
const menuData = require('./data/menuSeed');

dotenv.config();

const seedAll = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri || mongoUri.includes('localhost')) {
      console.warn('⚠️ WARNING: You are about to seed a LOCAL database or MONGO_URI is missing.');
      console.log('Current MONGO_URI:', mongoUri);
    } else {
      console.log('🌐 Seeding ONLINE database:', mongoUri.split('@')[1] || mongoUri);
    }

    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // 1. Seed Admin
    const adminExists = await User.findOne({ email: 'admin@savoria.com' });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await User.create({
        name: 'Manager Admin',
        email: 'admin@savoria.com',
        password: hashedPassword,
        role: 'manager'
      });
      console.log('👤 Admin user seeded: admin@savoria.com / admin123');
    } else {
      console.log('👤 Admin user already exists');
    }

    // 2. Seed Menu
    const menuCount = await MenuItem.countDocuments();
    if (menuCount === 0) {
      await MenuItem.insertMany(menuData);
      console.log(`🍴 Seeded ${menuData.length} menu items`);
    } else {
      console.log(`🍴 Menu already has ${menuCount} items. Skipping initial seed.`);
      console.log('💡 Tip: To force re-seed, use the /api/menu/seed endpoint or clear the collection.');
    }

    console.log('✨ Seeding completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
};

seedAll();
