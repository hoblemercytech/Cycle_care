<script>
const SUPABASE_URL = 'https://ssyaklpnjhoxukfanyxb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzeWFrbHBuamhveHVrZmFueXhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExNjA2NzUsImV4cCI6MjA5NjczNjY3NX0.H95B092ZXEAQz3l6-QefzWt44RZLpp5PdiEbLktstGE';

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

console.log("Supabase Loaded:", !!window.supabase);
console.log("Client:", supabaseClient);

window.TABLES = {
  PROFILE: 'cycle_profile',
  PERIOD_LOGS: 'cycle_period_logs',
  CYCLE_STATS: 'cycle_cycle_stats',
  SYMPTOMS: 'cycle_symptoms',
  NOTIFICATIONS: 'cycle_notifications',
  REMINDERS: 'cycle_reminders',
  SETTINGS: 'cycle_settings'
};

const DEMO = {
  profile: {
    full_name: 'Sarah Johnson',
    email: 'sarah@cyclecare.app',
    age: 28,
    goal: 'Trying to Conceive',
    joined_at: '2024-01-15',
    cycles_logged: 6,
    average_cycle_length: 28
  },
  cycle_stats: {
    average_cycle_length: 28,
    average_period_length: 5,
    consistency: 'High',
    current_cycle_day: 12,
    ovulation_date: 'May 20',
    next_period_days: 8,
    fertility_score: 75,
    fertile_window_start: 'May 18',
    fertile_window_end: 'May 24',
    current_phase: 'Fertile Window'
  },
  symptoms: [
    { name: 'Cramps', type: 'cramps', logged_at: new Date() },
    { name: 'Fatigue', type: 'fatigue', logged_at: new Date() },
    { name: 'Bloating', type: 'bloating', logged_at: new Date() },
    { name: 'Mood Changes', type: 'mood', logged_at: new Date() },
    { name: 'Headache', type: 'headache', logged_at: new Date() },
    { name: 'Breast Tenderness', type: 'breast', logged_at: new Date() }
  ],
  period_logs: [
    { start_date: '2024-05-06', end_date: '2024-05-10', period_length: 5, cycle_length: 28 },
    { start_date: '2024-04-08', end_date: '2024-04-12', period_length: 5, cycle_length: 29 },
    { start_date: '2024-03-10', end_date: '2024-03-14', period_length: 5, cycle_length: 28 }
  ],
  reminders: [
    { title: 'Upcoming Period', note: 'In 8 days — May 28', type: 'period', active: true },
    { title: 'Ovulation Reminder', note: 'Peak day — May 20', type: 'ovulation', active: true },
    { title: 'Prenatal Vitamin', note: 'Daily at 8:00 AM', type: 'medication', active: true },
    { title: 'Hydration Reminder', note: 'Every 2 hours', type: 'water', active: false }
  ],
  notifications: [
    { message: 'You are in your <strong>fertile window</strong> — May 18 to 24.', time: '2 min ago', read: false },
    { message: 'Ovulation predicted for <strong>May 20, 2024</strong>.', time: '1 hour ago', read: false }
  ]
};

function el(id) {
  return document.getElementById(id);
}

function setText(id, val) {
  const n = el(id);
  if (n) n.textContent = val;
}

function setHTML(id, val) {
  const n = el(id);
  if (n) n.innerHTML = val;
}

function setCss(id, prop, val) {
  const n = el(id);
  if (n) n.style[prop] = val;
}

function showToast(msg, type = 'info') {
  const c = el('toastContainer');
  if (!c) return;

  const t = document.createElement('div');
  const icons = {
    success: 'fa-circle-check',
    error: 'fa-circle-xmark',
    info: 'fa-circle-info'
  };

  t.className = `toast ${type}`;
  t.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i> ${msg}`;
  c.appendChild(t);

  setTimeout(() => t.classList.add('show'), 10);

  setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => t.remove(), 400);
  }, 3500);
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function setupScreenNavigation() {
  const screenTriggers = document.querySelectorAll('[data-screen]');
  const appScreens = document.querySelectorAll('.app-screen');

  screenTriggers.forEach(trigger => {
    trigger.addEventListener('click', () => {
      const target = trigger.dataset.screen;

      appScreens.forEach(screen => screen.classList.remove('active'));

      const activeScreen = el(target);
      if (activeScreen) activeScreen.classList.add('active');

      screenTriggers.forEach(btn => btn.classList.remove('active'));

      document.querySelectorAll(`[data-screen="${target}"]`).forEach(btn => {
        btn.classList.add('active');
      });

      el('sidebar')?.classList.remove('open');
      el('sidebarOverlay')?.classList.remove('active');

      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

async function checkAuth() {
  if (!supabaseClient) return;

  const { data } = await supabaseClient.auth.getSession();
  
  if (!data.session) {
    window.location.href = 'auth.html';
  }
}

function setGreeting() {
  const h = new Date().getHours();
  const g = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';

  setText('greetingTime', g);

  setText('todayDate', new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }));
}

async function loadProfile() {
  let data = DEMO.profile;

  if (supabaseClient) {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;

      const { data: profile } = await supabase
        .from(window.TABLES.PROFILE)
        .select('*')
        .eq('id', userId)
        .single();

      if (profile) data = profile;
    } catch (e) {
      console.warn('Using demo profile');
    }
  }

  const first = (data.full_name || 'User').split(' ')[0];
  const initials = (data.full_name || 'U')
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase();

  setText('greetingName', first);
  setText('headerAvatar', initials);
  setText('sidebarAvatarText', initials);
  setText('sidebarName', data.full_name || 'User');
  setText('sidebarEmail', data.email || 'user@cyclecare.app');
  setText('profileAvatarLg', initials);
  setText('profileName', data.full_name || 'User');
  setText('profileEmail', data.email || 'user@cyclecare.app');
  setText('profileGoal', data.goal || 'Track Cycle');
  setText('profileAge', data.age || '—');
  setText('profileCycleLen', (data.average_cycle_length || 28) + ' days');
  setText('profileCyclesLogged', data.cycles_logged || '—');

  if (data.joined_at || data.created_at) {
    setText('profileJoined', new Date(data.joined_at || data.created_at).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric'
    }));
  }
}

async function loadCycleStats() {
  let d = DEMO.cycle_stats;

  if (supabaseClient) {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;

      const { data } = await supabase
        .from(window.TABLES.CYCLE_STATS)
        .select('*')
        .eq('user_id', userId)
        .single();

      if (data) d = data;
    } catch (e) {
      console.warn('Using demo cycle stats');
    }
  }

  setText('heroTitle', d.current_phase || 'Fertile Window');
  setText('heroPhase', d.current_phase || 'Fertile Window');
  setText('heroSub', 'High chance of getting pregnant');
  setText('heroDates', `${d.fertile_window_start || 'May 18'} – ${d.fertile_window_end || 'May 24'}`);

  const score = d.fertility_score || 75;

  setText('heroRingPct', score + '%');

  const ring = el('heroRingProgress');
  if (ring) {
    const circumference = 2 * Math.PI * 55;
    ring.style.strokeDasharray = circumference;
    ring.style.strokeDashoffset = circumference * (1 - score / 100);
  }

  setText('statOvulation', d.ovulation_date || 'May 20');
  setText('statOvulationNote', 'Estimated ovulation');
  setText('statPeriod', (d.next_period_days || 8) + ' Days');
  setText('statPeriodNote', 'Until next period');
  setText('statCycleDay', 'Day ' + (d.current_cycle_day || 12));
  setText('statCycleDayNote', 'of ' + (d.average_cycle_length || 28) + '-day cycle');
  setText('statFertility', score >= 70 ? 'High' : score >= 40 ? 'Medium' : 'Low');
  setText('statFertilityNote', 'Fertility estimate');
  setText('greetingCycleDay', 'Cycle Day ' + (d.current_cycle_day || 12));

  setHTML('insAvgCycle', `${d.average_cycle_length || 28} <span class="insight-unit">days</span>`);
  setHTML('insAvgPeriod', `${d.average_period_length || 5} <span class="insight-unit">days</span>`);
  setText('insConsistency', d.consistency || 'High');
  setText('fertilityScorePct', score + '%');
  setCss('fertilityScoreBar', 'width', score + '%');
}

let calDate = new Date();

const PERIOD_DAYS = [1, 2, 3, 4, 5];
const FERTILE_DAYS = [15, 16, 17, 18, 19, 20, 21, 22, 23];
const OVULATION_DAY = 17;

async function loadCalendar() {
  renderCalendar();

  el('calPrev')?.addEventListener('click', () => {
    calDate.setMonth(calDate.getMonth() - 1);
    renderCalendar();
  });

  el('calNext')?.addEventListener('click', () => {
    calDate.setMonth(calDate.getMonth() + 1);
    renderCalendar();
  });
}

function renderCalendar() {
  const grid = el('calGrid');
  if (!grid) return;

  grid.innerHTML = '';

  const monthLabel = calDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });

  setText('calMonthLabel', monthLabel);

  ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].forEach(day => {
    const label = document.createElement('div');
    label.className = 'cal-day-label';
    label.textContent = day;
    grid.appendChild(label);
  });

  const year = calDate.getFullYear();
  const month = calDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement('div');
    empty.className = 'cal-cell empty';
    grid.appendChild(empty);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const cell = document.createElement('div');
    cell.textContent = d;

    let cls = 'cal-cell';

    if (year === today.getFullYear() && month === today.getMonth() && d === today.getDate()) {
      cls += ' today';
    } else if (d === OVULATION_DAY) {
      cls += ' ovulation';
    } else if (FERTILE_DAYS.includes(d)) {
      cls += ' fertile';
    } else if (PERIOD_DAYS.includes(d)) {
      cls += ' period';
    }

    cell.className = cls;

    cell.addEventListener('click', () => {
      document.querySelectorAll('.cal-cell.selected').forEach(c => c.classList.remove('selected'));
      cell.classList.add('selected');
      showToast(`Selected ${monthLabel} ${d}`, 'info');
    });

    grid.appendChild(cell);
  }
}

async function loadSymptoms() {
  let symptoms = DEMO.symptoms;

  if (supabaseClient) {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;

      const { data } = await supabase
        .from(window.TABLES.SYMPTOMS)
        .select('*')
        .eq('user_id', userId)
        .order('logged_at', { ascending: false })
        .limit(8);

      if (data && data.length) symptoms = data;
    } catch (e) {
      console.warn('Using demo symptoms');
    }
  }

  const iconMap = {
    cramps: { icon: 'fa-face-dizzy', label: 'Cramps' },
    headache: { icon: 'fa-head-side-virus', label: 'Headache' },
    mood: { icon: 'fa-face-meh', label: 'Mood Changes' },
    breast: { icon: 'fa-heart', label: 'Breast Tenderness' },
    bloating: { icon: 'fa-circle', label: 'Bloating' },
    fatigue: { icon: 'fa-battery-quarter', label: 'Fatigue' }
  };

  const container = el('symptomTags');
  if (!container) return;

  container.innerHTML = '';

  symptoms.forEach(s => {
    const type = s.type || s.symptom_type || 'fatigue';
    const info = iconMap[type] || { icon: 'fa-circle-dot', label: s.name || type };

    const tag = document.createElement('span');
    tag.className = `symptom-tag ${type} active`;
    tag.innerHTML = `<i class="fa-solid ${info.icon}"></i> ${info.label}`;
    container.appendChild(tag);
  });

  const addBtn = document.createElement('span');
  addBtn.className = 'add-symptom-btn';
  addBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Add symptom';
  addBtn.addEventListener('click', () => showToast('Symptom logger coming soon', 'info'));
  container.appendChild(addBtn);

  if (symptoms.length) {
    const first = symptoms[0];
    const type = first.type || first.symptom_type || 'fatigue';
    const info = iconMap[type] || { icon: 'fa-circle-dot', label: first.name || type };

    setText('insMostSymptom', info.label);

    const tag = el('recentSymptomTag');
    if (tag) {
      tag.className = `symptom-tag ${type}`;
      tag.innerHTML = `<i class="fa-solid ${info.icon}"></i> ${info.label}`;
    }
  }
}

async function loadPeriodHistory() {
  let logs = DEMO.period_logs;

  if (supabaseClient) {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;

      const { data } = await supabase
        .from(window.TABLES.PERIOD_LOGS)
        .select('*')
        .eq('user_id', userId)
        .order('start_date', { ascending: false })
        .limit(12);

      if (data && data.length) logs = data;
    } catch (e) {
      console.warn('Using demo period logs');
    }
  }

  const tbody = el('periodTableBody');
  if (!tbody) return;

  tbody.innerHTML = '';

  logs.forEach(log => {
    const cl = log.cycle_length || 28;
    const badgeClass = cl < 25 ? 'short' : cl > 35 ? 'long' : 'normal';
    const badgeLabel = cl < 25 ? 'Short' : cl > 35 ? 'Long' : 'Normal';

    const row = document.createElement('tr');
    row.innerHTML = `
      <td><strong>${formatDate(log.start_date)}</strong></td>
      <td>${formatDate(log.end_date)}</td>
      <td>${log.period_length || '—'} days</td>
      <td>${cl} days</td>
      <td><span class="badge ${badgeClass}">${badgeLabel}</span></td>
    `;

    tbody.appendChild(row);
  });
}

async function loadReminders() {
  let reminders = DEMO.reminders;

  const container = el('reminderList');
  if (!container) return;

  container.innerHTML = '';

  const iconMap = {
    period: { icon: 'fa-calendar-days', cls: 'period' },
    ovulation: { icon: 'fa-circle-dot', cls: 'ovulation' },
    medication: { icon: 'fa-pills', cls: 'medication' },
    water: { icon: 'fa-droplet', cls: 'water' }
  };

  reminders.forEach(r => {
    const info = iconMap[r.type] || iconMap.period;

    const item = document.createElement('div');
    item.className = 'reminder-item';
    item.innerHTML = `
      <div class="reminder-icon ${info.cls}"><i class="fa-solid ${info.icon}"></i></div>
      <div class="reminder-text">
        <div class="reminder-title">${r.title}</div>
        <div class="reminder-time">${r.note || ''}</div>
      </div>
      <div class="reminder-toggle ${r.active ? 'on' : 'off'}"></div>
    `;

    container.appendChild(item);
  });
}

async function loadNotifications() {
  let notifs = DEMO.notifications;

  const unread = notifs.filter(n => !n.read).length;
  setCss('notifDot', 'display', unread === 0 ? 'none' : '');

  const container = el('notifList');
  if (!container) return;

  container.innerHTML = '';

  notifs.forEach(n => {
    const item = document.createElement('div');
    item.className = 'notif-item';
    item.innerHTML = `
      <div class="notif-dot-ind ${n.read ? 'read' : ''}"></div>
      <div class="notif-message">${n.message || n.body || ''}</div>
      <div class="notif-ts">${n.time || ''}</div>
    `;

    container.appendChild(item);
  });
}

function setupUI() {
  el('hamburgerBtn')?.addEventListener('click', () => {
    el('sidebar')?.classList.add('open');
    el('sidebarOverlay')?.classList.add('active');
  });

  el('sidebarOverlay')?.addEventListener('click', () => {
    el('sidebar')?.classList.remove('open');
    el('sidebarOverlay')?.classList.remove('active');
  });

  el('logPeriodBtn')?.addEventListener('click', () => {
    showToast('Period logger coming soon', 'info');
  });

  el('addSymptomsBtn')?.addEventListener('click', () => {
    showToast('Symptom tracker opened', 'info');
    document.querySelector('[data-screen="symptomsScreen"]')?.click();
  });

  el('signOutBtn')?.addEventListener('click', async () => {
    if (supabaseClient) {
      await supabase.auth.signOut();
      window.location.href = 'auth.html';
    } else {
      showToast('Signed out in demo mode', 'info');
    }
  });

  document.querySelectorAll('.card-action').forEach(btn => {
    if (btn.textContent.trim() === 'Mark all read') {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.notif-dot-ind').forEach(d => d.classList.add('read'));
        setCss('notifDot', 'display', 'none');
        showToast('All notifications marked as read', 'success');
      });
    }
  });
}

async function init() {
  setupScreenNavigation();
  setupUI();
  setGreeting();
  await checkAuth();

  await Promise.all([
    loadProfile(),
    loadCycleStats(),
    loadCalendar(),
    loadSymptoms(),
    loadPeriodHistory(),
    loadReminders(),
    loadNotifications()
  ]);

  showToast('Dashboard loaded', 'success');
}

window.addEventListener('DOMContentLoaded', init);
</script>