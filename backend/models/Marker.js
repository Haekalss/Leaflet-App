const mongoose = require('mongoose');

const markerSchema = new mongoose.Schema({
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Marker', markerSchema);