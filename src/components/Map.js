'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Modal from './Modal';

// Fix for default markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function MapEvents({ onMapDoubleClick }) {
  useMapEvents({
    dblclick(e) {
      onMapDoubleClick(e.latlng);
    },
  });
  return null;
}

export default function Map() {
  const [markers, setMarkers] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState('create');
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [newMarkerPosition, setNewMarkerPosition] = useState(null);

  useEffect(() => {
    fetchMarkers();
  }, []);

  const fetchMarkers = async () => {
    try {
      const res = await fetch('/api/markers');
      const data = await res.json();
      setMarkers(data);
    } catch (error) {
      console.error('Failed to fetch markers:', error);
    }
  };

  const handleMapDoubleClick = (latlng) => {
    setNewMarkerPosition(latlng);
    setModalType('create');
    setSelectedMarker(null);
    setModalOpen(true);
  };

  const handleMarkerDoubleClick = (marker) => {
    setSelectedMarker(marker);
    setModalType('edit');
    setNewMarkerPosition(null);
    setModalOpen(true);
  };

  const handleCreateMarker = async (markerData) => {
    try {
      const response = await fetch('/api/markers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...markerData,
          lat: newMarkerPosition.lat,
          lng: newMarkerPosition.lng
        })
      });
      
      if (response.ok) {
        await fetchMarkers();
        setModalOpen(false);
      }
    } catch (error) {
      console.error('Failed to create marker:', error);
    }
  };

  const handleUpdateMarker = async (markerData) => {
    try {
      const response = await fetch(`/api/markers/${selectedMarker._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(markerData)
      });
      
      if (response.ok) {
        await fetchMarkers();
        setModalOpen(false);
      }
    } catch (error) {
      console.error('Failed to update marker:', error);
    }
  };

  const handleDeleteMarker = async () => {
    try {
      const response = await fetch(`/api/markers/${selectedMarker._id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        await fetchMarkers();
        setModalOpen(false);
      }
    } catch (error) {
      console.error('Failed to delete marker:', error);
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <MapContainer center={[-6.2, 106.816666]} zoom={5} attributionControl={false} style={{ height: '100vh', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapEvents onMapDoubleClick={handleMapDoubleClick} />
        {markers.map(marker => (
          <Marker 
            key={marker._id || marker.id} 
            position={[marker.lat, marker.lng]}
            eventHandlers={{
              dblclick: () => handleMarkerDoubleClick(marker)
            }}
          >
            <Popup>
              <div>
                <h3 style={{ fontWeight: 'bold', marginBottom: '4px' }}>{marker.title}</h3>
                {marker.description && <p style={{ fontSize: '14px', color: '#4b5563' }}>{marker.description}</p>}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        type={modalType}
        marker={selectedMarker}
        onSave={modalType === 'create' ? handleCreateMarker : handleUpdateMarker}
        onDelete={handleDeleteMarker}
      />
    </div>
  );
}