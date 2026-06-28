/* ============================================================
   storage.js – Local Storage abstraction layer
   Provides get / set / update / delete helpers for each
   data collection: residents, rooms, maintenance, announcements,
   and activities.
   ============================================================ */

const KEYS = {
  residents:     'rh_residents',
  rooms:         'rh_rooms',
  maintenance:   'rh_maintenance',
  announcements: 'rh_announcements',
  activities:    'rh_activities',
};

// ── Generic Helpers ──────────────────────────────────────────

/**
 * Read an array from localStorage. Returns [] if key is missing.
 * @param {string} key
 * @returns {Array}
 */
function storageGet(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn('storageGet error', key, e);
    return [];
  }
}

/**
 * Write an array to localStorage.
 * @param {string} key
 * @param {Array} data
 */
function storageSet(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('storageSet error', key, e);
  }
}

// ── ID Generator ─────────────────────────────────────────────

/**
 * Generate a simple unique ID (timestamp + random suffix).
 * @returns {string}
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ── Residents ────────────────────────────────────────────────

const ResidentStorage = {
  getAll() {
    return storageGet(KEYS.residents);
  },

  getById(id) {
    return this.getAll().find(r => r.id === id) || null;
  },

  add(residentData) {
    const residents = this.getAll();
    const newResident = {
      id:        generateId(),
      createdAt: new Date().toISOString(),
      ...residentData,
    };
    residents.push(newResident);
    storageSet(KEYS.residents, residents);
    return newResident;
  },

  update(id, updates) {
    const residents = this.getAll();
    const index = residents.findIndex(r => r.id === id);
    if (index === -1) return null;
    residents[index] = { ...residents[index], ...updates, updatedAt: new Date().toISOString() };
    storageSet(KEYS.residents, residents);
    return residents[index];
  },

  delete(id) {
    const residents = this.getAll().filter(r => r.id !== id);
    storageSet(KEYS.residents, residents);
  },

  search(query) {
    const q = query.toLowerCase();
    return this.getAll().filter(r =>
      r.name.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      r.phone.toLowerCase().includes(q) ||
      r.roomNumber.toLowerCase().includes(q)
    );
  },
};

// ── Rooms ────────────────────────────────────────────────────

const RoomStorage = {
  getAll() {
    return storageGet(KEYS.rooms);
  },

  getById(id) {
    return this.getAll().find(r => r.id === id) || null;
  },

  getByNumber(roomNumber) {
    return this.getAll().find(r => r.roomNumber === roomNumber) || null;
  },

  add(roomData) {
    const rooms = this.getAll();
    const newRoom = {
      id:        generateId(),
      createdAt: new Date().toISOString(),
      ...roomData,
    };
    rooms.push(newRoom);
    storageSet(KEYS.rooms, rooms);
    return newRoom;
  },

  update(id, updates) {
    const rooms = this.getAll();
    const index = rooms.findIndex(r => r.id === id);
    if (index === -1) return null;
    rooms[index] = { ...rooms[index], ...updates, updatedAt: new Date().toISOString() };
    storageSet(KEYS.rooms, rooms);
    return rooms[index];
  },

  delete(id) {
    const rooms = this.getAll().filter(r => r.id !== id);
    storageSet(KEYS.rooms, rooms);
  },

  getAvailable() {
    return this.getAll().filter(r => r.status === 'available');
  },

  getOccupied() {
    return this.getAll().filter(r => r.status === 'occupied');
  },
};

// ── Maintenance ──────────────────────────────────────────────

const MaintenanceStorage = {
  getAll() {
    return storageGet(KEYS.maintenance);
  },

  getById(id) {
    return this.getAll().find(m => m.id === id) || null;
  },

  add(data) {
    const list = this.getAll();
    const newItem = {
      id:        generateId(),
      status:    'pending',
      createdAt: new Date().toISOString(),
      ...data,
    };
    list.push(newItem);
    storageSet(KEYS.maintenance, list);
    return newItem;
  },

  update(id, updates) {
    const list = this.getAll();
    const index = list.findIndex(m => m.id === id);
    if (index === -1) return null;
    list[index] = { ...list[index], ...updates, updatedAt: new Date().toISOString() };
    storageSet(KEYS.maintenance, list);
    return list[index];
  },

  delete(id) {
    const list = this.getAll().filter(m => m.id !== id);
    storageSet(KEYS.maintenance, list);
  },

  getPending() {
    return this.getAll().filter(m => m.status === 'pending');
  },
};

// ── Announcements ────────────────────────────────────────────

const AnnouncementStorage = {
  getAll() {
    return storageGet(KEYS.announcements);
  },

  getById(id) {
    return this.getAll().find(a => a.id === id) || null;
  },

  add(data) {
    const list = this.getAll();
    const newItem = {
      id:        generateId(),
      createdAt: new Date().toISOString(),
      ...data,
    };
    list.push(newItem);
    storageSet(KEYS.announcements, list);
    return newItem;
  },

  update(id, updates) {
    const list = this.getAll();
    const index = list.findIndex(a => a.id === id);
    if (index === -1) return null;
    list[index] = { ...list[index], ...updates, updatedAt: new Date().toISOString() };
    storageSet(KEYS.announcements, list);
    return list[index];
  },

  delete(id) {
    const list = this.getAll().filter(a => a.id !== id);
    storageSet(KEYS.announcements, list);
  },
};

// ── Activity Log ─────────────────────────────────────────────

const ActivityStorage = {
  getAll() {
    return storageGet(KEYS.activities);
  },

  /**
   * Add an activity entry and keep only the 50 most recent.
   * @param {string} type  - 'resident' | 'room' | 'maintenance' | 'announcement'
   * @param {string} text  - Human-readable description
   * @param {string} color - dot color class
   */
  add(type, text, color = 'blue') {
    const list = this.getAll();
    list.unshift({
      id:        generateId(),
      type,
      text,
      color,
      timestamp: new Date().toISOString(),
    });
    // Keep only last 50
    const trimmed = list.slice(0, 50);
    storageSet(KEYS.activities, trimmed);
    return trimmed[0];
  },

  clear() {
    storageSet(KEYS.activities, []);
  },
};

// ── Seed Demo Data ───────────────────────────────────────────

/**
 * Populate localStorage with demo data if it's empty.
 * Called once from app.js on first load.
 */
function seedDemoData() {
  const rooms = RoomStorage.getAll();
  if (rooms.length > 0) return; // already seeded

  // Seed Rooms
  const demoRooms = [
    { roomNumber: '101', floor: '1', type: 'Studio',    monthlyRent: 650,  status: 'occupied'  },
    { roomNumber: '102', floor: '1', type: 'Studio',    monthlyRent: 650,  status: 'available' },
    { roomNumber: '201', floor: '2', type: '1 Bedroom', monthlyRent: 900,  status: 'occupied'  },
    { roomNumber: '202', floor: '2', type: '1 Bedroom', monthlyRent: 900,  status: 'occupied'  },
    { roomNumber: '203', floor: '2', type: '1 Bedroom', monthlyRent: 900,  status: 'available' },
    { roomNumber: '301', floor: '3', type: '2 Bedroom', monthlyRent: 1200, status: 'occupied'  },
    { roomNumber: '302', floor: '3', type: '2 Bedroom', monthlyRent: 1200, status: 'available' },
    { roomNumber: '401', floor: '4', type: 'Penthouse', monthlyRent: 1800, status: 'occupied'  },
  ];
  demoRooms.forEach(r => RoomStorage.add(r));

  // Seed Residents
  const demoResidents = [
    { name: 'Alice Johnson',  phone: '555-0101', email: 'alice@example.com',  roomNumber: '101', moveInDate: '2024-01-15' },
    { name: 'Bob Martinez',   phone: '555-0102', email: 'bob@example.com',    roomNumber: '201', moveInDate: '2024-03-01' },
    { name: 'Carol Williams', phone: '555-0103', email: 'carol@example.com',  roomNumber: '202', moveInDate: '2023-11-20' },
    { name: 'David Kim',      phone: '555-0104', email: 'david@example.com',  roomNumber: '301', moveInDate: '2024-05-10' },
    { name: 'Emma Davis',     phone: '555-0105', email: 'emma@example.com',   roomNumber: '401', moveInDate: '2024-06-01' },
  ];
  demoResidents.forEach(r => ResidentStorage.add(r));

  // Seed Maintenance
  const demoMaintenance = [
    { residentName: 'Alice Johnson',  roomNumber: '101', category: 'Plumbing',    priority: 'high',   description: 'Leaking faucet in bathroom.',     status: 'pending'     },
    { residentName: 'Bob Martinez',   roomNumber: '201', category: 'Electrical',  priority: 'medium', description: 'Broken light fixture in living room.', status: 'in-progress' },
    { residentName: 'Carol Williams', roomNumber: '202', category: 'HVAC',        priority: 'low',    description: 'AC unit making unusual noise.',    status: 'completed'   },
    { residentName: 'David Kim',      roomNumber: '301', category: 'Appliance',   priority: 'medium', description: 'Dishwasher not draining properly.', status: 'pending'    },
  ];
  demoMaintenance.forEach(m => MaintenanceStorage.add(m));

  // Seed Announcements
  const demoAnnouncements = [
    { title: 'Water Shutdown – July 5th',       description: 'Scheduled maintenance will require a water shutdown from 9 AM to 1 PM on July 5th. Please plan accordingly.',  date: '2025-07-01' },
    { title: 'Parking Lot Resurfacing',         description: 'The east parking lot will be closed for resurfacing from July 10–12. Please use the west lot during this period.', date: '2025-06-28' },
    { title: 'Community BBQ – Saturday',        description: 'Join us for our annual resident barbecue this Saturday at 4 PM in the courtyard. Food and drinks provided!',         date: '2025-06-25' },
  ];
  demoAnnouncements.forEach(a => AnnouncementStorage.add(a));

  // Seed Activity
  ActivityStorage.add('resident',     '<strong>Alice Johnson</strong> moved into Room 101', 'blue');
  ActivityStorage.add('announcement', 'Announcement posted: <strong>Water Shutdown</strong>', 'orange');
  ActivityStorage.add('maintenance',  'Maintenance request submitted by <strong>Bob Martinez</strong>', 'red');
  ActivityStorage.add('room',         'Room <strong>302</strong> marked as available', 'green');
}
