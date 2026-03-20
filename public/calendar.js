const API = window.location.origin;
const shareId = window.location.pathname.split('/').pop();

async function loadCalendar() {
  const res = await fetch(`${API}/api/calendar/${shareId}`);
  if (!res.ok) {
    document.getElementById('app').innerHTML = `
      <div class="flex flex-col items-center justify-center min-h-screen">
        <h1 class="text-2xl font-bold mb-2">Calendar Not Found</h1>
        <p class="text-gray-400">This calendar doesn't exist or is private.</p>
        <a href="${API}" class="mt-4 text-cyan-400 hover:underline">Create your own calendar →</a>
      </div>
    `;
    return;
  }
  
  const data = await res.json();
  const googleUrl = `${API}/api/calendar/${shareId}/google`;
  
  document.getElementById('app').innerHTML = `
    <div class="min-h-screen">
      <header class="bg-gray-900 border-b border-gray-800 p-4">
        <div class="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold">📅 ${data.displayName || data.username}'s Calendar</h1>
            <p class="text-gray-400 text-sm">@${data.username}</p>
          </div>
          <a href="${googleUrl}" target="_blank" class="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg">
            📆 Add to Google Calendar
          </a>
        </div>
      </header>
      
      <main class="max-w-2xl mx-auto p-4">
        ${data.events.length ? data.events.map(e => `
          <div class="event-card bg-gray-900 rounded-xl p-6 border border-gray-800 mb-4">
            <div class="flex justify-between items-start">
              <div>
                <h3 class="text-lg font-semibold">${e.title}</h3>
                <p class="text-gray-400 text-sm">${formatDate(e.startTime)}${e.endTime ? ' - ' + formatDate(e.endTime) : ''}</p>
                ${e.location ? `<p class="text-gray-500 mt-1">📍 ${e.location}</p>` : ''}
                ${e.description ? `<p class="text-gray-400 mt-2">${e.description}</p>` : ''}
              </div>
            </div>
          </div>
        `).join('') : `
          <div class="text-center py-12 text-gray-500">
            No public events yet.
          </div>
        `}
        
        <div class="text-center mt-8">
          <p class="text-gray-400 mb-4">Want your own shared calendar?</p>
          <a href="${API}" class="text-cyan-400 hover:underline">Create Social Cal →</a>
        </div>
      </main>
    </div>
  `;
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

loadCalendar();
