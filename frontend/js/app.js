// Initialize map
const map = L.map('map').setView([-6.2, 106.816666], 10); // Jakarta coordinates

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Markers array
let markers = [];

// Modal elements
const modal = document.getElementById('modal');
const closeBtn = document.getElementsByClassName('close')[0];
const editModal = document.getElementById('edit-modal');
const closeEditBtn = document.getElementsByClassName('close-edit')[0];
const deleteBtn = document.getElementById('delete-btn');

// Search elements
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const searchResults = document.getElementById('search-results');

// Store all markers for search
let allMarkers = [];

// Close modal
closeBtn.onclick = function() {
  modal.style.display = 'none';
  clearForm();
}

// Fetch markers from backend
async function fetchMarkers() {
  try {
    const response = await fetch('http://localhost:3000/api/markers');
    const data = await response.json();
    
    // Store all markers data for search
    allMarkers = data;
    
    data.forEach(markerData => {
      const marker = L.marker([markerData.lat, markerData.lng]).addTo(map);
      
      // Store marker data
      marker.markerData = markerData;
      
      // Bind popup
      marker.bindPopup(`<b>${markerData.title}</b><br>${markerData.description}`);
      
      // Show popup on hover
      marker.on('mouseover', function() {
        this.openPopup();
      });
      
      // Hide popup when mouse leaves, but only if not clicked
      marker.on('mouseout', function() {
        if (!this._popupClicked) {
          this.closePopup();
        }
      });
      
      // When clicked, mark popup as clicked so it stays open
      marker.on('click', function() {
        this._popupClicked = true;
        this.openPopup();
      });
      
      // Double-click to edit (for existing markers only)
      marker.on('dblclick', function(e) {
        e.originalEvent.stopPropagation();
        openEditModal(this.markerData);
      });
      
      // Reset clicked state when popup is manually closed
      marker.on('popupclose', function() {
        this._popupClicked = false;
      });
      
      markers.push(marker);
    });
  } catch (error) {
    console.error('Error fetching markers:', error);
  }
}

// Double-click on map to add marker
map.on('dblclick', function(e) {
  const { lat, lng } = e.latlng;
  document.getElementById('lat').value = lat;
  document.getElementById('lng').value = lng;
  modal.style.display = 'block';
});

// Form submission
document.getElementById('marker-form').addEventListener('submit', async function(e) {
  e.preventDefault();
  const title = document.getElementById('title').value;
  const description = document.getElementById('description').value;
  const lat = parseFloat(document.getElementById('lat').value);
  const lng = parseFloat(document.getElementById('lng').value);

  try {
    const response = await fetch('http://localhost:3000/api/markers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ lat, lng, title, description })
    });
    if (response.ok) {
      // Refresh markers
      markers.forEach(m => map.removeLayer(m));
      markers = [];
      fetchMarkers();
      // Close modal and clear form
      modal.style.display = 'none';
      clearForm();
    }
  } catch (error) {
    console.error('Error adding marker:', error);
  }
});

// Clear form
function clearForm() {
  document.getElementById('title').value = '';
  document.getElementById('description').value = '';
  document.getElementById('lat').value = '';
  document.getElementById('lng').value = '';
}

// Close edit modal
closeEditBtn.onclick = function() {
  editModal.style.display = 'none';
  clearEditForm();
}

// Open edit modal
function openEditModal(markerData) {
  console.log('Opening edit modal for marker:', markerData); // Debug log
  document.getElementById('edit-title').value = markerData.title;
  document.getElementById('edit-description').value = markerData.description;
  document.getElementById('edit-id').value = markerData._id;
  editModal.style.display = 'block';
}

// Clear edit form
function clearEditForm() {
  document.getElementById('edit-title').value = '';
  document.getElementById('edit-description').value = '';
  document.getElementById('edit-id').value = '';
}

// Edit form submission
document.getElementById('edit-form').addEventListener('submit', async function(e) {
  e.preventDefault();
  const id = document.getElementById('edit-id').value;
  const title = document.getElementById('edit-title').value;
  const description = document.getElementById('edit-description').value;

  console.log('Updating marker with ID:', id); // Debug log

  try {
    const response = await fetch(`http://localhost:3000/api/markers/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title, description })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('Update successful:', result);
      // Refresh markers
      markers.forEach(m => map.removeLayer(m));
      markers = [];
      fetchMarkers();
      // Close modal and clear form
      editModal.style.display = 'none';
      clearEditForm();
    } else {
      const error = await response.text();
      console.error('Update failed:', error);
      alert('Failed to update marker: ' + error);
    }
  } catch (error) {
    console.error('Error updating marker:', error);
    alert('Error updating marker: ' + error.message);
  }
});

// Delete marker
deleteBtn.onclick = async function() {
  if (confirm('Are you sure you want to delete this marker?')) {
    const id = document.getElementById('edit-id').value;
    
    try {
      const response = await fetch(`http://localhost:3000/api/markers/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        // Refresh markers
        markers.forEach(m => map.removeLayer(m));
        markers = [];
        fetchMarkers();
        // Close modal and clear form
        editModal.style.display = 'none';
        clearEditForm();
      }
    } catch (error) {
      console.error('Error deleting marker:', error);
    }
  }
}

// Search functionality
function searchMarkers(query) {
  const results = allMarkers.filter(marker => 
    marker.title.toLowerCase().includes(query.toLowerCase()) ||
    marker.description.toLowerCase().includes(query.toLowerCase())
  );
  displaySearchResults(results);
}

// Search places using Nominatim API
async function searchPlaces(query) {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`);
    const places = await response.json();
    return places.map(place => ({
      title: place.display_name,
      lat: parseFloat(place.lat),
      lng: parseFloat(place.lon),
      isPlace: true
    }));
  } catch (error) {
    console.error('Error searching places:', error);
    return [];
  }
}

// Display search results
function displaySearchResults(results) {
  searchResults.innerHTML = '';
  
  if (results.length === 0) {
    searchResults.style.display = 'none';
    return;
  }
  
  results.forEach(result => {
    const item = document.createElement('div');
    item.className = 'search-result-item';
    
    if (result.isPlace) {
      item.innerHTML = `
        <div class="result-title">${result.title}</div>
        <div class="result-description">Place</div>
      `;
    } else {
      item.innerHTML = `
        <div class="result-title">${result.title}</div>
        <div class="result-description">${result.description}</div>
      `;
    }
    
    item.addEventListener('click', () => {
      map.setView([result.lat, result.lng], 15);
      searchResults.style.display = 'none';
      searchInput.value = '';
      
      // If it's a marker, find and highlight it
      if (!result.isPlace) {
        const marker = markers.find(m => m.markerData._id === result._id);
        if (marker) {
          marker.openPopup();
        }
      }
    });
    
    searchResults.appendChild(item);
  });
  
  searchResults.style.display = 'block';
}

// Search event listeners
searchBtn.addEventListener('click', async () => {
  const query = searchInput.value.trim();
  if (!query) return;
  
  // Search markers first
  const markerResults = allMarkers.filter(marker => 
    marker.title.toLowerCase().includes(query.toLowerCase()) ||
    marker.description.toLowerCase().includes(query.toLowerCase())
  );
  
  // Search places
  const placeResults = await searchPlaces(query);
  
  // Combine results
  const combinedResults = [...markerResults, ...placeResults];
  displaySearchResults(combinedResults);
});

searchInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    searchBtn.click();
  }
});

// Hide search results when clicking outside
document.addEventListener('click', (e) => {
  if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
    searchResults.style.display = 'none';
  }
});

// Load markers on page load
fetchMarkers();