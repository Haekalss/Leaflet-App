'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import Modal from './Modal';
import RouteModal from './RouteModal';

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
  const [mounted, setMounted] = useState(false);
  
  // Route calculation state
  const [routeMode, setRouteMode] = useState(false);
  const [selectedMarkers, setSelectedMarkers] = useState([]);
  const [routeData, setRouteData] = useState(null);
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [routes, setRoutes] = useState([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [showAllRoutes, setShowAllRoutes] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Fix Leaflet icon only on client side
    if (typeof window !== 'undefined') {
      const L = require('leaflet');
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });
    }
  }, []);

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
    if (routeMode) return; // Disable creating markers in route mode
    setNewMarkerPosition(latlng);
    setModalType('create');
    setSelectedMarker(null);
    setModalOpen(true);
  };

  const handleMarkerDoubleClick = (marker) => {
    if (routeMode) return; // Disable editing in route mode
    setSelectedMarker(marker);
    setModalType('edit');
    setNewMarkerPosition(null);
    setModalOpen(true);
  };

  const handleMarkerClick = (marker) => {
    if (!routeMode) return;
    
    // Toggle marker selection in route mode
    const isSelected = selectedMarkers.find(m => m._id === marker._id);
    
    if (isSelected) {
      setSelectedMarkers(selectedMarkers.filter(m => m._id !== marker._id));
    } else if (selectedMarkers.length < 2) {
      const newSelected = [...selectedMarkers, marker];
      setSelectedMarkers(newSelected);
      
      // Calculate route when 2 markers selected
      if (newSelected.length === 2) {
        calculateRoute(newSelected[0], newSelected[1]);
      }
    }
  };

  const calculateRoute = async (marker1, marker2) => {
    try {
      const allRoutes = [];
      
      // 1. Direct route (best/fastest)
      const directUrl = `https://router.project-osrm.org/route/v1/driving/${marker1.lng},${marker1.lat};${marker2.lng},${marker2.lat}?overview=full&geometries=geojson`;
      const directResponse = await fetch(directUrl);
      const directData = await directResponse.json();
      
      if (directData.code === 'Ok' && directData.routes && directData.routes.length > 0) {
        const route = directData.routes[0];
        allRoutes.push({
          coordinates: route.geometry.coordinates.map(coord => [coord[1], coord[0]]),
          distance: route.distance / 1000,
          duration: route.duration / 60,
          isBest: true,
          name: 'Rute Terbaik'
        });
      }

      // 2. Alternative route with waypoint slightly offset to the north
      const midLat = (marker1.lat + marker2.lat) / 2 + 0.05; // Offset north
      const midLng = (marker1.lng + marker2.lng) / 2;
      const altUrl1 = `https://router.project-osrm.org/route/v1/driving/${marker1.lng},${marker1.lat};${midLng},${midLat};${marker2.lng},${marker2.lat}?overview=full&geometries=geojson`;
      
      try {
        const altResponse1 = await fetch(altUrl1);
        const altData1 = await altResponse1.json();
        
        if (altData1.code === 'Ok' && altData1.routes && altData1.routes.length > 0) {
          const route = altData1.routes[0];
          const routeData = {
            coordinates: route.geometry.coordinates.map(coord => [coord[1], coord[0]]),
            distance: route.distance / 1000,
            duration: route.duration / 60,
            isBest: false,
            name: 'Rute Alternatif 1'
          };
          
          // Only add if significantly different from direct route
          if (routeData.duration > allRoutes[0].duration * 1.05) {
            allRoutes.push(routeData);
          }
        }
      } catch (err) {
        console.log('Alternative route 1 failed');
      }

      // 3. Alternative route with waypoint slightly offset to the south
      const midLat2 = (marker1.lat + marker2.lat) / 2 - 0.05; // Offset south
      const midLng2 = (marker1.lng + marker2.lng) / 2;
      const altUrl2 = `https://router.project-osrm.org/route/v1/driving/${marker1.lng},${marker1.lat};${midLng2},${midLat2};${marker2.lng},${marker2.lat}?overview=full&geometries=geojson`;
      
      try {
        const altResponse2 = await fetch(altUrl2);
        const altData2 = await altResponse2.json();
        
        if (altData2.code === 'Ok' && altData2.routes && altData2.routes.length > 0) {
          const route = altData2.routes[0];
          const routeData = {
            coordinates: route.geometry.coordinates.map(coord => [coord[1], coord[0]]),
            distance: route.distance / 1000,
            duration: route.duration / 60,
            isBest: false,
            name: 'Rute Alternatif 2'
          };
          
          // Only add if significantly different from other routes
          if (routeData.duration > allRoutes[0].duration * 1.05) {
            allRoutes.push(routeData);
          }
        }
      } catch (err) {
        console.log('Alternative route 2 failed');
      }

      console.log('Total routes generated:', allRoutes.length);
      allRoutes.forEach((r, i) => {
        console.log(`${r.name}:`, r.duration.toFixed(1), 'min,', r.distance.toFixed(1), 'km');
      });
      
      setRoutes(allRoutes);
      setSelectedRouteIndex(0);
      setShowAllRoutes(true); // Show all routes immediately
      
      // Use the best route for transportation mode calculation
      const bestRoute = allRoutes[0];
      const distance = bestRoute.distance;
      
      // Determine transportation modes based on distance
      const modes = [];
      
      if (distance < 50) {
        modes.push({ name: 'Motor', speed: 40, icon: '🏍️' });
        modes.push({ name: 'Mobil', speed: 60, icon: '🚗' });
      }
      
      if (distance >= 50 && distance < 500) {
        modes.push({ name: 'Mobil', speed: 80, icon: '🚗' });
        modes.push({ name: 'Bus', speed: 70, icon: '🚌' });
      }
      
      if (distance >= 200 && distance < 1000) {
        modes.push({ name: 'Kereta', speed: 120, icon: '🚆' });
      }
      
      if (distance >= 500) {
        modes.push({ name: 'Pesawat', speed: 800, icon: '✈️' });
      }

      // Calculate duration for each mode
      const modesWithDuration = modes.map(mode => ({
        ...mode,
        duration: distance / mode.speed,
      }));

      setRouteData({
        from: marker1,
        to: marker2,
        distance: distance,
        modes: modesWithDuration,
        routes: allRoutes,
      });
      
      setShowRouteModal(true);
    } catch (error) {
      console.error('Failed to calculate route:', error);
      // Fallback to straight line if routing fails
      calculateStraightLineRoute(marker1, marker2);
    }
  };

  const calculateStraightLineRoute = (marker1, marker2) => {
    // Haversine formula to calculate distance (fallback)
    const R = 6371; // Earth radius in km
    const dLat = (marker2.lat - marker1.lat) * Math.PI / 180;
    const dLon = (marker2.lng - marker1.lng) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(marker1.lat * Math.PI / 180) * Math.cos(marker2.lat * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;

    // Set straight line coordinates
    const straightRoute = {
      coordinates: [
        [marker1.lat, marker1.lng],
        [marker2.lat, marker2.lng]
      ],
      distance,
      duration: 0,
      isBest: true,
    };
    
    setRoutes([straightRoute]);
    setSelectedRouteIndex(0);

    // Determine transportation modes based on distance
    const modes = [];
    
    if (distance < 50) {
      modes.push({ name: 'Motor', speed: 40, icon: '🏍️' });
      modes.push({ name: 'Mobil', speed: 60, icon: '🚗' });
    }
    
    if (distance >= 50 && distance < 500) {
      modes.push({ name: 'Mobil', speed: 80, icon: '🚗' });
      modes.push({ name: 'Bus', speed: 70, icon: '🚌' });
    }
    
    if (distance >= 200 && distance < 1000) {
      modes.push({ name: 'Kereta', speed: 120, icon: '🚆' });
    }
    
    if (distance >= 500) {
      modes.push({ name: 'Pesawat', speed: 800, icon: '✈️' });
    }

    // Calculate duration for each mode
    const modesWithDuration = modes.map(mode => ({
      ...mode,
      duration: distance / mode.speed,
    }));

    setRouteData({
      from: marker1,
      to: marker2,
      distance: distance,
      modes: modesWithDuration,
      routes: [straightRoute],
    });
    
    setShowRouteModal(true);
  };

  const toggleRouteMode = () => {
    setRouteMode(!routeMode);
    setSelectedMarkers([]);
    setRouteData(null);
    setShowRouteModal(false);
    setRoutes([]);
    setSelectedRouteIndex(0);
    setShowAllRoutes(false);
  };

  const clearRoute = () => {
    setSelectedMarkers([]);
    setRouteData(null);
    setShowRouteModal(false);
    setRoutes([]);
    setSelectedRouteIndex(0);
    setShowAllRoutes(false);
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

  if (!mounted) {
    return null;
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Route Mode Toggle Button */}
      <button
        onClick={toggleRouteMode}
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          zIndex: 1000,
          padding: '12px 20px',
          backgroundColor: routeMode ? '#ef4444' : '#3b82f6',
          color: '#ffffff',
          border: 'none',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '600',
          cursor: 'pointer',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          e.target.style.backgroundColor = routeMode ? '#dc2626' : '#2563eb';
          e.target.style.transform = 'translateY(-2px)';
          e.target.style.boxShadow = '0 6px 8px rgba(0, 0, 0, 0.15)';
        }}
        onMouseLeave={(e) => {
          e.target.style.backgroundColor = routeMode ? '#ef4444' : '#3b82f6';
          e.target.style.transform = 'translateY(0)';
          e.target.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
        }}
      >
        {routeMode ? '❌ Exit Route Mode' : '📍 Calculate Route'}
      </button>

      {/* Route Mode Instructions */}
      {routeMode && (
        <div style={{
          position: 'absolute',
          top: '70px',
          right: '20px',
          zIndex: 1000,
          padding: '12px 16px',
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          fontSize: '13px',
          maxWidth: '250px',
        }}>
          <p style={{ margin: 0, fontWeight: '600', marginBottom: '4px' }}>
            🗺️ Route Mode Active
          </p>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '12px' }}>
            Click {selectedMarkers.length === 0 ? 'first' : 'second'} marker to calculate route
            {selectedMarkers.length > 0 && (
              <span style={{ display: 'block', marginTop: '8px' }}>
                <strong>Selected:</strong> {selectedMarkers[0].title}
              </span>
            )}
          </p>
          {selectedMarkers.length > 0 && (
            <button
              onClick={clearRoute}
              style={{
                marginTop: '8px',
                padding: '4px 8px',
                backgroundColor: '#f3f4f6',
                border: 'none',
                borderRadius: '4px',
                fontSize: '11px',
                cursor: 'pointer',
                width: '100%',
              }}
            >
              Clear Selection
            </button>
          )}
        </div>
      )}

      <MapContainer center={[-6.2, 106.816666]} zoom={5} attributionControl={false} style={{ height: '100vh', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapEvents onMapDoubleClick={handleMapDoubleClick} />
        
        {/* Draw route alternatives - render selected route last so it's on top */}
        {routes
          .map((route, index) => ({ route, index, isSelected: index === selectedRouteIndex }))
          .sort((a, b) => a.isSelected ? 1 : b.isSelected ? -1 : 0) // Selected route rendered last (on top)
          .map(({ route, index, isSelected }) => {
            const formatDuration = (minutes) => {
              const hours = Math.floor(minutes / 60);
              const mins = Math.round(minutes % 60);
              if (hours > 0) {
                return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
              }
              return `${mins} min`;
            };

            const routeLabel = route.isBest && index === 0 
              ? `🏆 Rute Terbaik - ${formatDuration(route.duration)} (${route.distance.toFixed(1)} km)`
              : `Rute ${index + 1} - ${formatDuration(route.duration)} (${route.distance.toFixed(1)} km)`;

            return (
              <Polyline
                key={`route-${index}-${isSelected}`}
                positions={route.coordinates}
                pathOptions={{
                  color: isSelected ? '#1e40af' : '#6b7280',
                  weight: isSelected ? 6 : 5,
                  opacity: isSelected ? 0.9 : 0.7,
                }}
                eventHandlers={{
                  click: () => {
                    console.log('Clicked route:', index);
                    setSelectedRouteIndex(index);
                  }
                }}
              >
                <Tooltip 
                  direction="top"
                  offset={[0, -10]}
                  opacity={0.9}
                >
                  <div style={{
                    padding: '3px 8px',
                    fontSize: '10px',
                    fontWeight: '600',
                    whiteSpace: 'nowrap',
                  }}>
                    {isSelected ? '📍 ' : ''}{route.name || `Rute ${index + 1}`} • {formatDuration(route.duration)}
                  </div>
                </Tooltip>
              </Polyline>
            );
          })}
        
        {markers.map(marker => {
          const isSelected = selectedMarkers.find(m => m._id === marker._id);
          
          return (
            <Marker 
              key={marker._id || marker.id} 
              position={[marker.lat, marker.lng]}
              opacity={isSelected ? 0.6 : 1}
              eventHandlers={{
                click: () => handleMarkerClick(marker),
                dblclick: () => handleMarkerDoubleClick(marker)
              }}
            >
              <Popup>
                <div>
                  <h3 style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                    {isSelected ? '✓ ' : ''}{marker.title}
                  </h3>
                  {marker.description && <p style={{ fontSize: '14px', color: '#4b5563' }}>{marker.description}</p>}
                  {isSelected && <p style={{ fontSize: '12px', color: '#3b82f6', fontWeight: 'bold', marginTop: '4px' }}>Selected for route</p>}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
      
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        type={modalType}
        marker={selectedMarker}
        onSave={modalType === 'create' ? handleCreateMarker : handleUpdateMarker}
        onDelete={handleDeleteMarker}
      />

      <RouteModal
        isOpen={showRouteModal}
        onClose={() => setShowRouteModal(false)}
        routeData={routeData}
        routes={routes}
        selectedRouteIndex={selectedRouteIndex}
        onSelectRoute={(index) => {
          setSelectedRouteIndex(index);
        }}
      />
    </div>
  );
}