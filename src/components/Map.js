'use client';

import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import Modal from './Modal';

function MapEvents({ onMapDoubleClick, onMoveEnd, onZoomEnd }) {
  const map = useMap();
  
  useMapEvents({
    dblclick(e) {
      onMapDoubleClick(e.latlng);
    },
    moveend() {
      if (onMoveEnd) {
        const bounds = map.getBounds();
        const zoom = map.getZoom();
        onMoveEnd({
          north: bounds.getNorth(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          west: bounds.getWest(),
        }, zoom);
      }
    },
    zoomend() {
      if (onZoomEnd) {
        const zoom = map.getZoom();
        const bounds = map.getBounds();
        onZoomEnd(zoom, {
          north: bounds.getNorth(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          west: bounds.getWest(),
        });
      }
    },
  });
  return null;
}

function POILoader({ onLoadPOI, mapRef }) {
  const map = useMap();
  
  useEffect(() => {
    mapRef.current = map;
    
    // Auto-load POIs on initial mount if zoom is sufficient
    const zoom = map.getZoom();
    if (zoom >= 11) {
      const bounds = map.getBounds();
      const visibleCategories = zoom >= 15 
        ? ['hospital', 'university', 'school', 'supermarket', 'restaurant', 'bank', 'fuel', 'hotel']
        : zoom >= 13 
        ? ['hospital', 'university', 'school', 'supermarket']
        : ['hospital', 'university'];
        
      onLoadPOI({
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
      }, visibleCategories);
    }
  }, [map, mapRef, onLoadPOI]);
  
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

  const [routes, setRoutes] = useState([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);

  const [routeData, setRouteData] = useState(null);
  const [transportMode, setTransportMode] = useState('driving');
  const [showRoutePanel, setShowRoutePanel] = useState(false);
  const [showAllRoutes, setShowAllRoutes] = useState(false);
  // Fix: Add showRouteModal state
  const [showRouteModal, setShowRouteModal] = useState(false);
  
  // Search and route panel state
  const [searchQuery, setSearchQuery] = useState('');
  const [routeStart, setRouteStart] = useState(null);
  const [routeEnd, setRouteEnd] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [activeInput, setActiveInput] = useState(null); // 'start' or 'end'
  
  // POI state
  const [pois, setPois] = useState([]);
  const [showPOI, setShowPOI] = useState(true);
  const [selectedPOICategories, setSelectedPOICategories] = useState([]); // Empty by default - show all
  const [loadingPOI, setLoadingPOI] = useState(false);
  const mapRef = useRef(null);
  // Persist zoom level in localStorage
  const [currentZoom, setCurrentZoom] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedZoom = window.localStorage.getItem('leafletZoom');
      return savedZoom ? parseInt(savedZoom, 10) : 12;
    }
    return 12;
  });

  // Initial map center: use device location if available
  const [mapCenter, setMapCenter] = useState([-6.9175, 107.6191]);

  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setMapCenter([pos.coords.latitude, pos.coords.longitude]);
        },
        (err) => {
          // fallback to default
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, []);

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

  // Handler klik marker/POI di map
  const handleMarkerClick = (marker) => {
    if (!routeMode) return;
    const markerId = marker._id || marker.id;
    let newSelected = [...selectedMarkers];
    const isSelected = selectedMarkers.find(m => (m._id || m.id) === markerId);
    if (isSelected) {
      newSelected = selectedMarkers.filter(m => (m._id || m.id) !== markerId);
    } else if (selectedMarkers.length === 0) {
      newSelected = [marker];
    } else if (selectedMarkers.length === 1) {
      newSelected = [...selectedMarkers, marker];
    } else if (selectedMarkers.length === 2) {
      newSelected = [selectedMarkers[0], marker];
    }
    setSelectedMarkers(newSelected);
    // Isi otomatis textbox rute
    if (newSelected.length === 1) {
      setRouteStart({ ...newSelected[0], title: newSelected[0].title });
      setRouteEnd(null);
    } else if (newSelected.length === 2) {
      setRouteStart({ ...newSelected[0], title: newSelected[0].title });
      setRouteEnd({ ...newSelected[1], title: newSelected[1].title });
      calculateRoute(newSelected[0], newSelected[1]);
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
      
      // If distance is very short (< 2km), only show best route
      const isShortRoute = allRoutes[0].distance < 2;
      const finalRoutes = isShortRoute ? [allRoutes[0]] : allRoutes;
      setRoutes(finalRoutes);
      setSelectedRouteIndex(0);
      setShowAllRoutes(true); // Show all routes immediately
      // Use the best route for transportation mode calculation
      const bestRoute = finalRoutes[0];
      const distance = bestRoute.distance;
      // Determine transportation modes based on distance
      const modes = [];
      
      // Mobil & Motor
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
      
      // Tambahkan estimasi jalan kaki dan sepeda
      modes.push({ name: 'Jalan', speed: 5, icon: '🚶' }); // 5 km/jam
      modes.push({ name: 'Sepeda', speed: 15, icon: '🚴' }); // 15 km/jam

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
        routes: finalRoutes,
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
  };

  const toggleRouteMode = () => {
    const newMode = !routeMode;
    setRouteMode(newMode);
    setShowRoutePanel(newMode);
    setSelectedMarkers([]);
    setRouteData(null);
    setRoutes([]);
    setSelectedRouteIndex(0);
    setShowAllRoutes(false);
    setRouteStart(null);
    setRouteEnd(null);
  };

  const clearRoute = () => {
    setSelectedMarkers([]);
    setRouteData(null);
    setRoutes([]);
    setSelectedRouteIndex(0);
    setShowAllRoutes(false);
    setRouteStart(null);
    setRouteEnd(null);
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    // Combine markers and POIs for search
    const allLocations = [
      ...markers.map(m => ({ ...m, type: 'marker', lng: m.lng })),
      ...pois.map(p => ({ ...p, type: 'poi', lng: p.lon }))
    ];

    const results = allLocations.filter(loc => 
      loc.title.toLowerCase().includes(query.toLowerCase()) ||
      loc.description?.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 5);

    setSearchResults(results);
  };

  const selectLocation = (location, inputType) => {
    const normalizedLocation = {
      ...location,
      lng: location.lng || location.lon,
      _id: location._id || location.id,
    };

    if (inputType === 'start') {
      setRouteStart(normalizedLocation);
    } else {
      setRouteEnd(normalizedLocation);
    }

    setSearchResults([]);
    setSearchQuery('');
    setActiveInput(null);

    // Auto calculate if both points selected
    if ((inputType === 'start' && routeEnd) || (inputType === 'end' && routeStart)) {
      const start = inputType === 'start' ? normalizedLocation : routeStart;
      const end = inputType === 'end' ? normalizedLocation : routeEnd;
      setSelectedMarkers([start, end]);
      calculateRoute(start, end);
    }
  };

  const fetchPOIs = async (bounds, categoriesToFetch = null) => {
    // Skip if already loading to prevent spam requests
    if (loadingPOI) {
      console.log('Already loading POIs, skipping...');
      return;
    }
    
    setLoadingPOI(true);
    
    // Always fetch all categories, filter will be done on render
    const allCategories = ['hospital', 'university', 'school', 'supermarket'];
    const activeCategories = categoriesToFetch || allCategories;
    
    console.log('Fetching POIs for bounds:', bounds);
    console.log('Active categories for this zoom:', activeCategories);
    
    try {
      const categories = {
        hospital: 'amenity=hospital',
        university: 'amenity=university',
        school: 'amenity=school',
        supermarket: 'shop=supermarket',
        restaurant: 'amenity=restaurant',
        bank: 'amenity=bank',
        fuel: 'amenity=fuel',
        hotel: 'tourism=hotel',
        worship: 'amenity=place_of_worship', // Tambahkan tempat ibadah
      };

      const bbox = `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`;
      
      // Simplified query with lower timeout
      const query = `
        [out:json][timeout:15];
        (
          ${activeCategories.map(cat => `node[${categories[cat]}](${bbox});`).join('\n')}

        );
        out body 100;
      `;

      console.log('Overpass query:', query);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 429) {
          console.warn('Rate limit reached, please wait before loading more POIs');
          return;
        }
        if (response.status === 504) {
          console.warn('Request timeout, try zooming in more or reload later');
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Overpass response:', data);
      
      // Faster mapping - only store essential data
      const poisData = data.elements.map(element => {
        const categoryKey = Object.keys(categories).find(cat => {
          const [key, value] = categories[cat].split('=');
          return element.tags?.[key] === value;
        });
        
        return {
          id: element.id,
          lat: element.lat,
          lon: element.lon,
          title: element.tags?.name || 'Unnamed',
          description: categoryKey || 'other',
          category: categoryKey || 'other',
        };
      });

      setPois(poisData);
      console.log('POIs loaded:', poisData.length);
    } catch (error) {
      if (error.name === 'AbortError') {
        console.warn('Request aborted due to timeout');
      } else {
        console.error('Failed to fetch POIs:', error);
      }
    } finally {
      setLoadingPOI(false);
    }
  };

  const handleLoadPOI = () => {
    console.log('Load POI button clicked');
    if (mapRef.current) {
      const bounds = mapRef.current.getBounds();
      const zoom = mapRef.current.getZoom();
      console.log('Map bounds:', bounds);
      console.log('Current zoom:', zoom);
      fetchPOIs({
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
      });
    } else {
      console.error('Map ref not available');
    }
  };

  const getVisiblePOICategories = (zoom) => {
    if (zoom < 11) {
      return []; // No POIs when zoomed out
    } else if (zoom >= 11 && zoom < 13) {
      return ['hospital', 'university']; // Priority POIs only
    } else if (zoom >= 13 && zoom < 15) {
      return ['hospital', 'university', 'school']; // Add school
    } else {
      return ['hospital', 'university', 'school', 'supermarket']; // Limit to essential POIs only
    }
  };

  const handleZoomEnd = (zoom, bounds) => {
    setCurrentZoom(zoom);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('leafletZoom', zoom);
    }
    console.log('Zoom changed to:', zoom);
    
    const visibleCategories = getVisiblePOICategories(zoom);
    
    // Auto-load POIs based on zoom level for West Java region only
    if (zoom >= 11) {
      // West Java bounds (fixed region)
      const westJavaBounds = {
        north: -5.5,
        south: -7.8,
        east: 108.8,
        west: 106.0,
      };
      
      fetchPOIs(westJavaBounds, visibleCategories);
    } else if (zoom < 11) {
      // Clear POIs when zoomed out too far
      setPois([]);
    }
  };

  const handleMoveEnd = (bounds, zoom) => {
    // Don't auto-reload POIs on move to reduce API calls
    // User can manually reload if needed
  };

  const togglePOI = () => {
    setShowPOI(!showPOI);
  };

  const togglePOICategory = (category) => {
    if (selectedPOICategories.includes(category)) {
      setSelectedPOICategories(selectedPOICategories.filter(c => c !== category));
    } else {
      setSelectedPOICategories([...selectedPOICategories, category]);
    }
  };

  const getPOIIcon = (category) => {
    const icons = {
      hospital: '🏥',
      university: '🎓',
      school: '🏫',
      supermarket: '🏪',
      restaurant: '🍽️',
      bank: '🏛️',
      fuel: '⛽',
      hotel: '🏨',
    };
    return icons[category] || '📍';
  };

  const getPOIColor = (category) => {
    const colors = {
      hospital: '#ef4444',
      university: '#8b5cf6',
      school: '#3b82f6',
      supermarket: '#10b981',
      restaurant: '#f59e0b',
      bank: '#6366f1',
      fuel: '#ec4899',
      hotel: '#14b8a6',
    };
    return colors[category] || '#6b7280';
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

  // Auto zoom to route when route ditentukan
  useEffect(() => {
    if (routes && routes.length > 0 && mapRef.current) {
      const routeCoords = routes[selectedRouteIndex]?.coordinates;
      if (routeCoords && routeCoords.length > 1) {
        const latLngs = routeCoords.map(([lat, lng]) => [lat, lng]);
        const L = require('leaflet');
        const bounds = L.latLngBounds(latLngs);
        mapRef.current.fitBounds(bounds, { maxZoom: 15, padding: [40, 40] });
      }
    }
  }, [routes, selectedRouteIndex]);

  if (!mounted) {
    return null;
  }

  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        maxWidth: '100%',
        maxHeight: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Top Left: Searchbar */}
      <div
        style={{
          position: 'absolute',
          top: '16px',
          left: '4vw',
          zIndex: 1003,
          width: '92vw',
          maxWidth: '400px',
          minWidth: '180px',
          display: 'flex',
          alignItems: 'center',
          background: '#fff',
          borderRadius: '32px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          padding: '4px 12px 4px 8px',
          borderRight: '1px solid #e5e7eb',
        }}
      >
        <input
          type="text"
          placeholder="Cari lokasi, marker, atau POI..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          style={{
            flex: 1,
            padding: '12px 16px',
            fontSize: '14px',
            border: 'none',
            borderRadius: '24px',
            outline: 'none',
            background: 'transparent',
          }}
        />
        <button
          onClick={toggleRouteMode}
          style={{
            marginLeft: '8px',
            background: routeMode ? '#3b82f6' : '#f3f4f6',
            border: 'none',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: routeMode ? '0 2px 8px rgba(59,130,246,0.15)' : 'none',
            transition: 'all 0.2s',
          }}
          title="Hitung Rute"
        >
          <span style={{ fontSize: '22px', color: routeMode ? '#fff' : '#3b82f6' }}>⤴️</span>
        </button>
      </div>
      {/* Top Right: Category Filter Bar + Scroll Buttons (kanan atas, sejajar searchbar) */}
      {currentZoom >= 11 && !showRoutePanel && (
        <div
          style={{
            position: 'absolute',
            top: '16px',
            right: '4vw',
            zIndex: 1002,
            display: 'flex',
            alignItems: 'center',
            background: 'transparent',
            maxWidth: '92vw',
          }}
        >
          <button
            style={{
              width: '44px',
              height: '44px',
              border: 'none',
              background: '#fff',
              borderRadius: '50%',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              cursor: 'pointer',
              marginRight: '4px',
              fontSize: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'box-shadow 0.2s',
            }}
            onClick={() => {
              const el = document.getElementById('category-scroll');
              if (el) el.scrollBy({ left: -120, behavior: 'smooth' });
            }}
            title="Scroll Kiri"
          >
            <span style={{ fontWeight: 'bold', fontSize: '28px', color: '#222' }}>&lt;</span>
          </button>
          <div
            id="category-scroll"
            style={{
              display: 'flex',
              gap: '8px',
              padding: '8px 12px',
              borderRadius: '32px',
              background: 'transparent',
              boxShadow: 'none',
              borderLeft: 'none',
              overflowX: 'auto',
              maxWidth: '40vw',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              scrollBehavior: 'smooth', // smooth scroll
            }}
          >
            {[
              { id: 'hospital', label: '🏥 Rumah Sakit', color: '#ef4444' },
              { id: 'university', label: '🎓 Universitas', color: '#8b5cf6' },
              { id: 'school', label: '🏫 Sekolah', color: '#3b82f6' },
              { id: 'supermarket', label: '🏪 Supermarket', color: '#10b981' },
              { id: 'restaurant', label: '🍽️ Restoran', color: '#f59e0b' },
              { id: 'bank', label: '🏛️ Bank', color: '#6366f1' },
              { id: 'fuel', label: '⛽ SPBU', color: '#ec4899' },
              { id: 'hotel', label: '🏨 Hotel', color: '#14b8a6' },
              { id: 'worship', label: '🕌 Tempat Ibadah', color: '#0ea5e9' },
            ].map(cat => {
              const isActive = selectedPOICategories.includes(cat.id);
              return (
                <button
                  key={cat.id}
                  onClick={() => togglePOICategory(cat.id)}
                  disabled={currentZoom < 11}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: isActive ? cat.color : '#ffffff',
                    color: isActive ? '#ffffff' : '#1f2937',
                    border: `2px solid ${isActive ? cat.color : '#d1d5db'}`,
                    borderRadius: '50px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: currentZoom < 11 ? 'not-allowed' : 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s',
                    opacity: currentZoom < 11 ? 0.5 : 1,
                    boxShadow: isActive ? '0 4px 8px rgba(0,0,0,0.15)' : '0 2px 4px rgba(0,0,0,0.1)',
                  }}
                  onMouseEnter={(e) => {
                    if (currentZoom >= 11 && !isActive) {
                      e.target.style.borderColor = cat.color;
                      e.target.style.color = cat.color;
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (currentZoom >= 11 && !isActive) {
                      e.target.style.borderColor = '#d1d5db';
                      e.target.style.color = '#1f2937';
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                    }
                  }}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
          <button
            style={{
              width: '44px',
              height: '44px',
              border: 'none',
              background: '#fff',
              borderRadius: '50%',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              cursor: 'pointer',
              marginLeft: '4px',
              fontSize: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'box-shadow 0.2s',
            }}
            onClick={() => {
              const el = document.getElementById('category-scroll');
              if (el) el.scrollBy({ left: 120, behavior: 'smooth' });
            }}
            title="Scroll Kanan"
          >
            <span style={{ fontWeight: 'bold', fontSize: '28px', color: '#222' }}>&gt;</span>
          </button>
        </div>
      )}
      {/* Route Panel: di bawah searchbar, ada gap */}
      {showRoutePanel && (
        <div
          style={{
            position: 'absolute',
            top: '70px',
            left: '4vw',
            zIndex: 1003,
            width: '92vw',
            maxWidth: '400px',
            minWidth: '180px',
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            padding: '12px',
          }}
        >
          {/* Transport Mode Icons + Estimasi waktu */}
          <div style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '16px',
            paddingBottom: '12px',
            borderBottom: '2px solid #f3f4f6',
          }}>
            {[
              { mode: 'driving', icon: '🚗', label: 'Mobil' },
              { mode: 'motorcycle', icon: '🏍️', label: 'Motor' },
              { mode: 'walking', icon: '🚶', label: 'Jalan' },
              { mode: 'cycling', icon: '🚴', label: 'Sepeda' },
            ].map(tm => (
              <div key={tm.mode} style={{ flex: 1, textAlign: 'center' }}>
                <button
                  onClick={() => setTransportMode(tm.mode)}
                  style={{
                    width: '44px',
                    height: '44px',
                    backgroundColor: transportMode === tm.mode ? '#3b82f6' : '#f3f4f6',
                    color: transportMode === tm.mode ? '#fff' : '#222',
                    border: 'none',
                    borderRadius: '50%',
                    fontSize: '24px',
                    cursor: 'pointer',
                    marginBottom: '4px',
                  }}
                  title={tm.label}
                >
                  {tm.icon}
                </button>
                {/* Estimasi waktu muncul di bawah icon */}
                {routeData && routeData.modes && (
                  <div style={{ fontSize: '12px', color: '#3b82f6', fontWeight: 600 }}>
                    {(() => {
                      const mode = routeData.modes.find(m => m.name.toLowerCase() === tm.label.toLowerCase());
                      return mode ? `${Math.round(mode.duration * 60)} min` : '-';
                    })()}
                  </div>
                )}
              </div>
            ))}
          </div>
          {/* Textbox Titik Awal & Tujuan */}
          <div style={{ marginBottom: '12px' }}>
            <input
              type="text"
              placeholder="Pilih titik awal, atau klik peta..."
              value={routeStart ? routeStart.title : ''}
              readOnly
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: '13px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                outline: 'none',
                marginBottom: '8px',
              }}
            />
            <input
              type="text"
              placeholder="Pilih tujuan..."
              value={routeEnd ? routeEnd.title : ''}
              readOnly
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: '13px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                outline: 'none',
              }}
            />
          </div>
          {/* Section Best Route & Alternative Route */}
          {routes && routes.length > 0 && (
            <div style={{ marginTop: '8px' }}>
              {routes.map((r, idx) => (
                <div key={idx} style={{
                  background: idx === selectedRouteIndex ? '#3b82f6' : '#f3f4f6',
                  color: idx === selectedRouteIndex ? '#fff' : '#222',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  marginBottom: '8px',
                  boxShadow: idx === selectedRouteIndex ? '0 2px 8px rgba(59,130,246,0.10)' : 'none',
                  fontWeight: idx === selectedRouteIndex ? 700 : 500,
                  cursor: 'pointer',
                }} onClick={() => setSelectedRouteIndex(idx)}>
                  <div style={{ fontSize: '13px', marginBottom: '2px' }}>
                    {idx === selectedRouteIndex ? 'SELECTED ROUTE' : idx === 0 ? 'BEST ROUTE' : `Alternative ${idx}`}
                  </div>
                  <div style={{ fontSize: '12px' }}>
                    {Math.round(r.duration)} min • {r.distance.toFixed(2)} km
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <MapContainer
        center={mapCenter}
        zoom={currentZoom}
        attributionControl={true}
        style={{ height: '100vh', width: '100vw', maxWidth: '100%', maxHeight: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <POILoader mapRef={mapRef} onLoadPOI={fetchPOIs} />
        <MapEvents 
          onMapDoubleClick={handleMapDoubleClick}
          onMoveEnd={handleMoveEnd}
          onZoomEnd={handleZoomEnd}
        />
        
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
        
        {/* Render User Markers - only show when zoomed in enough */}
        {currentZoom >= 11 && markers.map(marker => {
          const isSelected = selectedMarkers.find(m => (m._id || m.id) === (marker._id || marker.id));
          
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

        {/* Render POI Markers - only show when zoomed in enough */}
        {currentZoom >= 11 && pois
          .filter(poi => {
            // If no category selected, show all POIs
            if (selectedPOICategories.length === 0) return true;
            // If categories selected, only show selected ones
            return selectedPOICategories.includes(poi.category);
          })
          .map(poi => {
          if (typeof window === 'undefined') return null;
          
          const L = require('leaflet');
          const isSelected = selectedMarkers.find(m => (m._id || m.id) === poi.id);
          
          // Reuse icon instances for better performance
          const iconHtml = `<div style="
            background-color: ${getPOIColor(poi.category)};
            color: white;
            border-radius: 50%;
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            opacity: ${isSelected ? 0.6 : 1};
          ">${getPOIIcon(poi.category)}</div>`;
          
          const icon = L.divIcon({
            html: iconHtml,
            className: 'poi-marker',
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          });

          // Convert POI to marker-like object for routing
          const poiAsMarker = {
            id: poi.id,
            lat: poi.lat,
            lng: poi.lon,
            title: poi.title,
            description: poi.description,
          };

          return (
            <Marker
              key={`poi-${poi.id}`}
              position={[poi.lat, poi.lon]}
              icon={icon}
              eventHandlers={{
                click: () => handleMarkerClick(poiAsMarker),
                dblclick: (e) => {
                  if (!routeMode) {
                    // Prevent default double-click on POI when not in route mode
                    e.originalEvent.stopPropagation();
                  }
                }
              }}
            >
              <Popup>
                <div>
                  <h3 style={{ fontWeight: 'bold', marginBottom: '4px', fontSize: '13px' }}>
                    {isSelected ? '✓ ' : ''}{poi.title}
                  </h3>
                  {poi.description && <p style={{ fontSize: '11px', color: '#6b7280', margin: 0 }}>{poi.description}</p>}
                  {isSelected && <p style={{ fontSize: '11px', color: '#3b82f6', fontWeight: 'bold', marginTop: '4px' }}>Selected for route</p>}
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


    </div>
  );
}