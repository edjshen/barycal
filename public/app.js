const API = window.location.origin;
let token = localStorage.getItem('token');
let user = null;

// Auth
async function register(username, password, displayName) {
  const res = await fetch(`${API}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, displayName })
  });
  const data = await res.json();
  if (data.token) {
    token = data.token;
    user = data.user;
    localStorage.setItem('token', token);
    showDashboard();
  }
  return data;
}

async function login(username, password) {
  const res = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();
  if (data.token) {
    token = data.token;
    user = data.user;
    localStorage.setItem('token', token);
    showDashboard();
  }
  return data;
}

function logout() {
  token = null;
  user = null;
  localStorage.removeItem('token');
  showAuth();
}

// Views
function showAuth() {
  document.getElementById('app').innerHTML = `
    <div class="min-h-screen flex items-center justify-center p-4">
      <div class="bg-gray-900 rounded-2xl p-8 w-full max-w-md border border-gray-800">
        <h1 class="text-3xl font-bold text-center mb-2">📅 Social Cal</h1>
        <p class="text-gray-400 text-center mb-8">Share your calendar with friends</p>
        
        <div id="authForm">
          <input type="text" id="username" placeholder="Username" class="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 mb-4">
          <input type="text" id="displayName" placeholder="Display Name" class="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 mb-4">
          <input type="password" id="password" placeholder="Password" class="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 mb-6">
          <button onclick="handleLogin()" class="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-semibold py-3 rounded-lg mb-4">Login</button>
          <button onclick="handleRegister()" class="w-full bg-gray-800 hover:bg-gray-700 text-white font-semibold py-3 rounded-lg">Create Account</button>
        </div>
        <p id="authError" class="text-red-400 text-center mt-4 hidden"></p>
      </div>
    </div>
  `;
}

async function handleLogin() {
  const u = document.getElementById('username').value;
  const p = document.getElementById('password').value;
  const data = await login(u, p);
  if (data.error) showError(data.error);
}

async function handleRegister() {
  const u = document.getElementById('username').value;
  const p = document.getElementById('password').value;
  const d = document.getElementById('displayName').value;
  const data = await register(u, p, d);
  if (data.error) showError(data.error);
}

function showError(msg) {
  const el = document.getElementById('authError');
  el.textContent = msg;
  el.classList.remove('hidden');
}

function showDashboard() {
  fetch(`${API}/api/auth/me`, { headers: { 'Authorization': `Bearer ${token}` } })
    .then(r => r.json())
    .then(data => {
      user = data;
      renderDashboard();
    });
}

function renderDashboard() {
  const shareUrl = `${API}/calendar/${user.shareId}`;
  const googleUrl = `${API}/api/calendar/${user.shareId}/google`;
  
  document.getElementById('app').innerHTML = `
    <div class="min-h-screen">
      <header class="bg-gray-900 border-b border-gray-800 p-4">
        <div class="max-w-2xl mx-auto flex items-center justify-between">
          <h1 class="text-2xl font-bold">📅 Social Cal</h1>
          <div class="flex items-center gap-4">
            <span class="text-gray-400">@${user.username}</span>
            <button onclick="logout()" class="text-sm text-gray-400 hover:text-white">Logout</button>
          </div>
        </div>
      </header>
      
      <main class="max-w-2xl mx-auto p-4 space-y-6">
        <!-- Share Card -->
        <div class="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h2 class="text-lg font-semibold mb-4">🔗 Share Your Calendar</h2>
          <p class="text-gray-400 text-sm mb-4">Send this link to friends so they can view your events and add them to Google Calendar:</p>
          
          <div class="flex gap-2 mb-4">
            <input type="text" id="shareLink" value="${shareUrl}" readonly class="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm">
            <button onclick="copyShareLink()" class="bg-cyan-500 hover:bg-cyan-600 text-black font-semibold px-4 py-2 rounded-lg">Copy</button>
          </div>
          
          <div class="flex gap-2">
            <a href="${googleUrl}" target="_blank" class="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg text-center">
              📆 Add to Google Calendar
            </a>
            <button onclick="showSettings()" class="bg-gray-800 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg">
              ⚙️
            </button>
          </div>
        </div>
        
        <!-- Add Event -->
        <div class="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h2 class="text-lg font-semibold mb-4">➕ Add Event</h2>
          <form onsubmit="addEvent(event)" class="space-y-4">
            <input type="text" id="eventTitle" placeholder="Event Title" required class="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3">
            <textarea id="eventDesc" placeholder="Description (optional)" rows="2" class="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3"></textarea>
            <input type="text" id="eventLocation" placeholder="Location" class="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="text-xs text-gray-400">Start</label>
                <input type="datetime-local" id="eventStart" required class="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3">
              </div>
              <div>
                <label class="text-xs text-gray-400">End</label>
                <input type="datetime-local" id="eventEnd" class="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3">
              </div>
            </div>
            <label class="flex items-center gap-2">
              <input type="checkbox" id="eventAllDay" class="w-5 h-5">
              <span>All Day</span>
            </label>
            <label class="flex items-center gap-2">
              <input type="checkbox" id="eventPublic" checked class="w-5 h-5">
              <span>Public (shareable)</span>
            </label>
            <button type="submit" class="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-semibold py-3 rounded-lg">Add Event</button>
          </form>
        </div>
        
        <!-- Events List -->
        <div class="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h2 class="text-lg font-semibold mb-4">📋 Your Events</h2>
          <div id="eventsList" class="space-y-3"></div>
        </div>
      </main>
    </div>
    
    <!-- Settings Modal -->
    <div id="settingsModal" class="hidden fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div class="bg-gray-900 rounded-xl p-6 w-full max-w-md border border-gray-800">
        <h3 class="text-xl font-bold mb-4">⚙️ Settings</h3>
        <div class="space-y-4">
          <div>
            <label class="text-sm text-gray-400">Display Name</label>
            <input type="text" id="settingsDisplayName" value="${user.displayName || ''}" class="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 mt-1">
          </div>
          <label class="flex items-center gap-2">
            <input type="checkbox" id="settingsPublic" ${user.isPublic ? 'checked' : ''} class="w-5 h-5">
            <span>Public Calendar</span>
          </label>
          <button onclick="saveSettings()" class="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-semibold py-3 rounded-lg">Save</button>
          <button onclick="regenerateLink()" class="w-full bg-gray-800 hover:bg-gray-700 text-white font-semibold py-2 rounded-lg text-sm">🔄 Generate New Link</button>
          <button onclick="closeSettings()" class="w-full bg-transparent text-gray-400 py-2">Cancel</button>
        </div>
      </div>
    </div>
  `;
  
  loadEvents();
}

async function loadEvents() {
  const res = await fetch(`${API}/api/events`, { headers: { 'Authorization': `Bearer ${token}` } });
  const events = await res.json();
  
  document.getElementById('eventsList').innerHTML = events.length ? events.map(e => `
    <div class="event-card bg-gray-800 rounded-lg p-4 flex justify-between items-start">
      <div>
        <div class="font-semibold">${e.title}</div>
        <div class="text-sm text-gray-400">${formatDate(e.startTime)}${e.endTime ? ' - ' + formatDate(e.endTime) : ''}</div>
        ${e.location ? `<div class="text-sm text-gray-500">📍 ${e.location}</div>` : ''}
      </div>
      <button onclick="deleteEvent('${e.id}')" class="text-red-400 hover:text-red-300 text-sm">Delete</button>
    </div>
  `).join('') : '<p class="text-gray-500 text-center py-8">No events yet. Add one above!</p>';
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

async function addEvent(e) {
  e.preventDefault();
  const data = {
    title: document.getElementById('eventTitle').value,
    description: document.getElementById('eventDesc').value,
    location: document.getElementById('eventLocation').value,
    startTime: document.getElementById('eventStart').value,
    endTime: document.getElementById('eventEnd').value || null,
    isAllDay: document.getElementById('eventAllDay').checked,
    isPublic: document.getElementById('eventPublic').checked
  };
  
  await fetch(`${API}/api/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(data)
  });
  
  e.target.reset();
  loadEvents();
}

async function deleteEvent(id) {
  if (!confirm('Delete this event?')) return;
  await fetch(`${API}/api/events/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  loadEvents();
}

function copyShareLink() {
  const input = document.getElementById('shareLink');
  input.select();
  navigator.clipboard.writeText(input.value);
  alert('Link copied!');
}

function showSettings() {
  document.getElementById('settingsModal').classList.remove('hidden');
}

function closeSettings() {
  document.getElementById('settingsModal').classList.add('hidden');
}

async function saveSettings() {
  const displayName = document.getElementById('settingsDisplayName').value;
  const isPublic = document.getElementById('settingsPublic').checked;
  
  await fetch(`${API}/api/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ displayName, isPublic })
  });
  
  user.displayName = displayName;
  user.isPublic = isPublic;
  closeSettings();
  renderDashboard();
}

async function regenerateLink() {
  if (!confirm('Generate a new link? The old one will stop working.')) return;
  
  const res = await fetch(`${API}/api/settings/regenerate-shareId`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await res.json();
  user.shareId = data.shareId;
  renderDashboard();
}

// Init
if (token) {
  showDashboard();
} else {
  showAuth();
}
