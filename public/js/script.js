/* =============================================
   JEV & JET WEDDING — script.js
   ============================================= */

// -----------------------------------------------
// MUSIC CONTROL
// -----------------------------------------------
const musicBtn   = document.getElementById('musicBtn');
const bgMusic    = document.getElementById('bgMusic');
const soundWaves = document.getElementById('soundWaves');
let isPlaying = false;

musicBtn.addEventListener('click', () => {
  if (isPlaying) {
    bgMusic.pause();
    soundWaves.style.display = 'none';
    isPlaying = false;
  } else {
    bgMusic.play();
    soundWaves.style.display = 'block';
    isPlaying = true;
  }
});

setTimeout(() => {
  bgMusic.play()
    .then(() => { isPlaying = true;  soundWaves.style.display = 'block'; })
    .catch(() => { isPlaying = false; soundWaves.style.display = 'none'; });
}, 1000);


// -----------------------------------------------
// COUNTDOWN TIMER
// -----------------------------------------------
const targetDate = new Date('2026-06-29T00:00:00').getTime();

function updateCountdown() {
  const now        = new Date().getTime();
  const difference = targetDate - now;
  if (difference > 0) {
    renderDigits('days',    Math.floor(difference / (1000 * 60 * 60 * 24)), 3);
    renderDigits('hours',   Math.floor((difference / (1000 * 60 * 60)) % 24), 2);
    renderDigits('minutes', Math.floor((difference / 1000 / 60) % 60), 2);
    renderDigits('seconds', Math.floor((difference / 1000) % 60), 2);
  }
}

function renderDigits(id, value, length) {
  const el = document.getElementById(id);
  el.innerHTML = String(value).padStart(length, '0').split('')
    .map(d => `<div class="flip-digit">${d}</div>`).join('');
}

updateCountdown();
setInterval(updateCountdown, 1000);


// -----------------------------------------------
// CALENDAR
// -----------------------------------------------
function generateCalendar() {
  const calendar       = document.getElementById('calendar');
  const daysOfWeek     = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const firstDay       = 1; // June 1 2026 = Monday
  const daysInMonth    = 30;
  const weddingDay     = 29;

  daysOfWeek.forEach(day => {
    const h = document.createElement('div');
    h.className = 'calendar-day-header';
    h.textContent = day;
    calendar.appendChild(h);
  });

  for (let i = 0; i < firstDay; i++) {
    const e = document.createElement('div');
    e.className = 'calendar-day empty';
    calendar.appendChild(e);
  }

  for (let i = 1; i <= daysInMonth; i++) {
    const d = document.createElement('div');
    d.className = i === weddingDay ? 'calendar-day wedding' : 'calendar-day normal';
    d.textContent = i;
    calendar.appendChild(d);
  }
}

generateCalendar();


// -----------------------------------------------
// RSVP STATE
// -----------------------------------------------
let selectedAttendance = ''; // 'in-person' | 'zoom'

function scrollToRsvp() {
  document.getElementById('rsvp').scrollIntoView({ behavior: 'smooth' });
}

// Step 1 → 2: Yes clicked
function showAttendanceType() {
  hide('rsvpInitial');
  show('rsvpAttendanceType');
}

// Step 2 → 3: attendance type picked
function selectAttendance(type) {
  selectedAttendance = type;
  const label = document.getElementById('attendanceTypeLabel');
  label.textContent = type === 'in-person'
    ? '🏛️ Attending in-person at the venue'
    : '💻 Joining via Zoom';
  hide('rsvpAttendanceType');
  show('rsvpForm');
}

function goBackToAttendance() {
  hide('rsvpForm');
  show('rsvpAttendanceType');
}

function showDecline() {
  hide('rsvpInitial');
  show('rsvpDecline');
}

function resetRsvp() {
  selectedAttendance = '';
  ['rsvpAttendanceType','rsvpForm','rsvpDecline','rsvpSuccess','rsvpNotListed'].forEach(hide);
  document.getElementById('fullName').value = '';
  document.getElementById('email').value    = '';
  document.getElementById('submitBtn').disabled   = false;
  document.getElementById('submitBtn').textContent = 'Submit RSVP ✓';
  show('rsvpInitial');
}


// -----------------------------------------------
// RSVP FORM SUBMISSION → Netlify Function
// -----------------------------------------------
async function submitRsvp(event) {
  console.log("🚀🚀🚀 submitRsvp FUNCTION CALLED 🚀🚀🚀");
  event.preventDefault();
  console.log("✅ preventDefault called");

  const name       = document.getElementById('fullName').value.trim();
  const email      = document.getElementById('email').value.trim();
  const attendance = selectedAttendance;
  const btn        = document.getElementById('submitBtn');

  console.log('=== FRONTEND: Form submitted ===');
  console.log('Name:', name);
  console.log('Email:', email);
  console.log('Attendance:', attendance);
  console.log('Button:', btn);

  if (!name || !email || !attendance) return;

  // Loading state
  btn.disabled     = true;
  btn.textContent  = 'Sending… ✉️';

  console.log('=== FRONTEND: Sending fetch to /api/rsvp ===');

  try {
    const res = await fetch('/api/rsvp', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name, email, attendance }),
    });

    console.log('=== FRONTEND: Response received ===');
    console.log('Status:', res.status);
    console.log('OK:', res.ok);

    const data = await res.json();
    console.log('=== FRONTEND: Data parsed ===');
    console.log('Data:', data);

    if (res.ok && data.success) {
      if (data.onList) {
        // ✅ Guest confirmed
        const tableEl = document.getElementById('confirmedTable');
        if (tableEl) {
          tableEl.textContent = data.table
            ? `Table ${data.table}`
            : 'Details coming soon';
        }
        hide('rsvpForm');
        show('rsvpSuccess');
        showToast(`Welcome, ${name.split(' ')[0]}! Check your email for confirmation. 💙`);
      } else {
        // ⚠️ Not on list
        hide('rsvpForm');
        show('rsvpNotListed');
      }

      // Auto-reset after 8 s
      setTimeout(resetRsvp, 8000);

    } else {
      showToast('Something went wrong. Please try again.');
      btn.disabled    = false;
      btn.textContent = 'Submit RSVP ✓';
    }

  } catch (err) {
    console.error('=== FRONTEND: ERROR ===');
    console.error('Error:', err);
    console.error('Error message:', err.message);
    showToast('Network error. Please check your connection and try again.');
    btn.disabled    = false;
    btn.textContent = 'Submit RSVP ✓';
  }
}


// -----------------------------------------------
// TOAST
// -----------------------------------------------
function showToast(message) {
  const toast   = document.getElementById('toast');
  const msgEl   = document.getElementById('toastMessage');
  msgEl.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 5000);
}


// -----------------------------------------------
// GOOGLE MAPS
// -----------------------------------------------
function openMaps() {
  const address = encodeURIComponent('Maple Grove Manor, 123 Garden Boulevard, Manila');
  window.open(`https://www.google.com/maps/search/?api=1&query=${address}`, '_blank');
}


// -----------------------------------------------
// HELPERS
// -----------------------------------------------
function show(id) { document.getElementById(id).classList.remove('hidden'); }
function hide(id) { document.getElementById(id).classList.add('hidden'); }

// -----------------------------------------------
// GLOBAL ERROR HANDLER
// -----------------------------------------------
window.addEventListener('error', function(e) {
  console.error('💥 GLOBAL ERROR:', e.message, 'at', e.filename, 'line', e.lineno);
});

window.addEventListener('unhandledrejection', function(e) {
  console.error('💥 UNHANDLED PROMISE REJECTION:', e.reason);
});

console.log('✅ Script loaded successfully');
