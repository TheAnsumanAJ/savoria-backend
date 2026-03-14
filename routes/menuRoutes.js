const express = require('express');
const router = express.Router();
const MenuItem = require('../models/MenuItem');
const menuData = require('../data/menuSeed');

// GET /api/menu — fetch all items
router.get('/', async (req, res) => {
  try {
    const items = await MenuItem.find();
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch menu' });
  }
});

// POST /api/menu/seed — seed initial menu data (run once)
router.post('/seed', async (req, res) => {
  try {
    await MenuItem.deleteMany({});
    const items = await MenuItem.insertMany(menuData);
    res.json({ message: `Seeded ${items.length} menu items` });
  } catch (err) {
    res.status(500).json({ message: 'Seeding failed', error: err.message });
  }
});

// PUT /api/menu/:id — update item (manager only)
router.put('/:id', async (req, res) => {
  try {
    const item = await MenuItem.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!item) return res.status(404).json({ message: 'Item not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update item' });
  }
});

// POST /api/menu — add new item (manager only)
router.post('/', async (req, res) => {
  try {
    const item = await MenuItem.create(req.body);
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create item' });
  }
});

// DELETE /api/menu/:id — delete item (manager only)
router.delete('/:id', async (req, res) => {
  try {
    await MenuItem.findByIdAndDelete(req.params.id);
    res.json({ message: 'Item deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete item' });
  }
});

module.exports = router;
