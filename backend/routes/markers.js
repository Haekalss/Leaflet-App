const express = require('express');
const router = express.Router();
const Marker = require('../models/Marker');

// Get all markers
router.get('/markers', async (req, res) => {
  try {
    const markers = await Marker.find();
    res.json(markers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a new marker
router.post('/markers', async (req, res) => {
  const marker = new Marker({
    lat: req.body.lat,
    lng: req.body.lng,
    title: req.body.title,
    description: req.body.description
  });

  try {
    const newMarker = await marker.save();
    res.status(201).json(newMarker);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update a marker
router.put('/markers/:id', async (req, res) => {
  try {
    const updatedMarker = await Marker.findByIdAndUpdate(
      req.params.id,
      {
        title: req.body.title,
        description: req.body.description
      },
      { new: true }
    );
    
    if (!updatedMarker) {
      return res.status(404).json({ message: 'Marker not found' });
    }
    
    res.json(updatedMarker);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete a marker
router.delete('/markers/:id', async (req, res) => {
  try {
    await Marker.findByIdAndDelete(req.params.id);
    res.json({ message: 'Marker deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;