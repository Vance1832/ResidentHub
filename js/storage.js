/* ============================================================
   storage.js – Data persistence layer

   JS Concepts demonstrated:
   ✦ Ch7 OOP      — class, constructor, extends, super, this
   ✦ Ch5 Array    — reduce, filter, map, find, push, slice
   ✦ Ch5 Object   — spread operator, object accumulator pattern
   ✦ Ch4 Functions — methods, default params, arrow functions
   ✦ Ch3 Operators — arithmetic, comparison, compound assignment
   ✦ Ch2 Data Types — String key, Number rent, Boolean status
   ✦ Ch6 Control   — if guard clauses, for...of loops
   ============================================================ */

// Ch4: Named function — generates a unique short ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/* ─────────────────────────────────────────────────────────────
   Ch7 OOP: Base class — common CRUD shared by all storage types
───────────────────────────────────────────────────────────── */
class BaseStorage {
  // Ch7: constructor runs when 'new' is called
  constructor(storageKey) {
    this._key = storageKey;   // Ch2: String, Ch7: 'this' binds to the instance
  }

  _load() {
    try {
      return JSON.parse(localStorage.getItem(this._key) || '[]');
    } catch {
      return [];
    }
  }

  _save(data) {
    localStorage.setItem(this._key, JSON.stringify(data));
  }

  getAll() {
    return this._load();
  }

  // Ch5: Array.find() — returns first matching element or null
  getById(id) {
    return this._load().find(item => item.id === id) || null;
  }

  // Ch5: Object spread — merges generated fields with provided data
  add(data) {
    const items = this._load();
    const item = {
      id: generateId(),
      createdAt: new Date().toISOString(),
      ...data         // Ch5: spread copies all properties from data object
    };
    items.push(item); // Ch5: Array.push()
    this._save(items);
    return item;
  }

  // Ch5: Array.map() — returns new array with the updated item
  update(id, data) {
    const items = this._load().map(item =>
      item.id === id ? { ...item, ...data } : item
    );
    this._save(items);
  }

  // Ch5: Array.filter() — keeps everything except the deleted item
  delete(id) {
    this._save(this._load().filter(item => item.id !== id));
  }

  count() {
    return this._load().length;   // Ch2: Number type
  }
}

/* ─────────────────────────────────────────────────────────────
   Ch7 OOP: ResidentStorage — inherits from BaseStorage
───────────────────────────────────────────────────────────── */
class ResidentStorageClass extends BaseStorage {
  constructor() {
    super('rh_residents');  // Ch7: super() calls parent constructor
  }

  getByRoom(roomNumber) {
    return this.getAll().filter(r => r.roomNumber === roomNumber);
  }

  // Ch3: Date arithmetic — calculate days between two dates
  // Ch2: Returns a Number (days as integer)
  getLeaseDays(resident) {
    const moveIn    = new Date(resident.moveInDate);
    const today     = new Date();
    const msPerDay  = 1000 * 60 * 60 * 24;   // Ch3: arithmetic operators
    return Math.floor((today - moveIn) / msPerDay);
  }

  // Ch5: Array.reduce() + Ch3: division — average lease duration
  getAverageLeaseDays() {
    const residents = this.getAll();
    if (!residents.length) return 0;
    const total = residents.reduce(
      (sum, r) => sum + this.getLeaseDays(r), 0
    );
    return Math.round(total / residents.length);
  }
}

/* ─────────────────────────────────────────────────────────────
   Ch7 OOP: RoomStorage — inherits from BaseStorage
───────────────────────────────────────────────────────────── */
class RoomStorageClass extends BaseStorage {
  constructor() {
    super('rh_rooms');
  }

  getByNumber(num) {
    return this.getAll().find(r => r.roomNumber === num) || null;
  }

  getOccupied()  { return this.getAll().filter(r => r.status === 'occupied');  }
  getAvailable() { return this.getAll().filter(r => r.status === 'available'); }

  // Ch5: Array.reduce() — sum rent across occupied rooms
  getTotalRevenue() {
    return this.getOccupied().reduce((sum, r) => sum + (r.monthlyRent || 0), 0);
  }

  getPotentialRevenue() {
    return this.getAll().reduce((sum, r) => sum + (r.monthlyRent || 0), 0);
  }

  getAverageRent() {
    const rooms = this.getAll();
    if (!rooms.length) return 0;
    return Math.round(
      rooms.reduce((sum, r) => sum + (r.monthlyRent || 0), 0) / rooms.length
    );
  }

  // Ch5: Array.reduce() with Object accumulator — "groupBy" pattern
  // Groups rooms by type and aggregates count + revenue data
  getRevenueByType() {
    return this.getAll().reduce((acc, room) => {
      const type = room.type || 'Unknown';
      if (!acc[type]) {
        acc[type] = { count: 0, occupied: 0, revenue: 0, potential: 0 };
      }
      acc[type].count++;
      acc[type].potential += room.monthlyRent || 0;
      if (room.status === 'occupied') {
        acc[type].occupied++;
        acc[type].revenue += room.monthlyRent || 0;  // Ch3: += compound assignment
      }
      return acc;   // Ch5: must return accumulator
    }, {});         // {} is the initial accumulator value
  }
}

/* ─────────────────────────────────────────────────────────────
   Ch7 OOP: MaintenanceStorage — inherits from BaseStorage
───────────────────────────────────────────────────────────── */
class MaintenanceStorageClass extends BaseStorage {
  constructor() {
    super('rh_maintenance');
  }

  getPending()    { return this.getAll().filter(m => m.status === 'pending');     }
  getInProgress() { return this.getAll().filter(m => m.status === 'in-progress'); }
  getCompleted()  { return this.getAll().filter(m => m.status === 'completed');   }

  // Ch5: reduce — produces { Plumbing: 2, HVAC: 1, ... }
  getByCategory() {
    return this.getAll().reduce((acc, m) => {
      acc[m.category] = (acc[m.category] || 0) + 1;
      return acc;
    }, {});
  }

  getByPriority() {
    return this.getAll().reduce((acc, m) => {
      acc[m.priority] = (acc[m.priority] || 0) + 1;
      return acc;
    }, {});
  }
}

/* ─────────────────────────────────────────────────────────────
   Ch7 OOP: AnnouncementStorage — inherits from BaseStorage
───────────────────────────────────────────────────────────── */
class AnnouncementStorageClass extends BaseStorage {
  constructor() {
    super('rh_announcements');
  }
}

/* ─────────────────────────────────────────────────────────────
   Ch7 OOP: ActivityStorage — standalone append-only log
───────────────────────────────────────────────────────────── */
class ActivityStorageClass {
  constructor() {
    this._key = 'rh_activity';
  }

  getAll() {
    try {
      return JSON.parse(localStorage.getItem(this._key) || '[]');
    } catch {
      return [];
    }
  }

  // Ch4: Default parameter — color = 'gray' if not provided
  add(type, text, color = 'gray') {
    const items = this.getAll();
    items.unshift({ id: generateId(), type, text, color, timestamp: new Date().toISOString() });
    localStorage.setItem(this._key, JSON.stringify(items.slice(0, 50)));
  }
}

/* ─────────────────────────────────────────────────────────────
   Ch7: Singleton pattern — one shared instance per storage type
───────────────────────────────────────────────────────────── */
const ResidentStorage     = new ResidentStorageClass();
const RoomStorage         = new RoomStorageClass();
const MaintenanceStorage  = new MaintenanceStorageClass();
const AnnouncementStorage = new AnnouncementStorageClass();
const ActivityStorage     = new ActivityStorageClass();

/* ─────────────────────────────────────────────────────────────
   Demo data seeder
   Ch5: Arrays of objects as data source
   Ch6: for...of loops to iterate and insert each item
───────────────────────────────────────────────────────────── */
function seedDemoData() {
  if (RoomStorage.count() > 0) return;   // Ch6: guard clause

  // Ch5: Array of objects — typed demo data (Ch2: mixed types)
  const rooms = [
    { roomNumber: '101', floor: '1', type: 'Studio',    monthlyRent: 850,  status: 'occupied'  },
    { roomNumber: '102', floor: '1', type: '1 Bedroom', monthlyRent: 1100, status: 'occupied'  },
    { roomNumber: '103', floor: '1', type: '1 Bedroom', monthlyRent: 1050, status: 'available' },
    { roomNumber: '201', floor: '2', type: '2 Bedroom', monthlyRent: 1600, status: 'occupied'  },
    { roomNumber: '202', floor: '2', type: '2 Bedroom', monthlyRent: 1550, status: 'available' },
    { roomNumber: '203', floor: '2', type: 'Studio',    monthlyRent: 900,  status: 'occupied'  },
    { roomNumber: '301', floor: '3', type: 'Penthouse', monthlyRent: 2800, status: 'available' },
    { roomNumber: '302', floor: '3', type: '1 Bedroom', monthlyRent: 1200, status: 'occupied'  },
  ];

  for (const room of rooms) { RoomStorage.add(room); }   // Ch6: for...of

  const residents = [
    { name: 'Alice Johnson',  email: 'alice@example.com',  phone: '555-0101', roomNumber: '101', moveInDate: '2023-03-15' },
    { name: 'Bob Martinez',   email: 'bob@example.com',    phone: '555-0102', roomNumber: '102', moveInDate: '2023-07-01' },
    { name: 'Carol Williams', email: 'carol@example.com',  phone: '555-0103', roomNumber: '201', moveInDate: '2022-11-20' },
    { name: 'David Chen',     email: 'david@example.com',  phone: '555-0104', roomNumber: '203', moveInDate: '2024-01-10' },
    { name: 'Eva Nguyen',     email: 'eva@example.com',    phone: '555-0105', roomNumber: '302', moveInDate: '2023-09-05' },
  ];

  for (const resident of residents) { ResidentStorage.add(resident); }

  const maintenance = [
    { residentName: 'Alice Johnson',  roomNumber: '101', category: 'Plumbing',   priority: 'high',   description: 'Leaking pipe under kitchen sink.',  status: 'pending'     },
    { residentName: 'Bob Martinez',   roomNumber: '102', category: 'Electrical', priority: 'medium', description: 'Bathroom outlet not working.',      status: 'in-progress' },
    { residentName: 'Carol Williams', roomNumber: '201', category: 'HVAC',       priority: 'low',    description: 'AC unit making unusual noise.',     status: 'completed'   },
    { residentName: 'David Chen',     roomNumber: '203', category: 'Appliance',  priority: 'medium', description: 'Refrigerator not cooling.',         status: 'pending'     },
  ];

  for (const req of maintenance) { MaintenanceStorage.add(req); }

  const announcements = [
    { title: 'Scheduled Water Shutoff', date: '2024-02-10', description: 'Water will be shut off on Feb 10 from 9 AM–12 PM for plumbing repairs in the east wing.' },
    { title: 'Community BBQ Event',     date: '2024-02-18', description: 'Join us for a community BBQ on the rooftop terrace. Food and drinks provided for all residents.' },
    { title: 'Parking Lot Repaving',    date: '2024-02-25', description: 'The east parking lot will be closed Feb 25–26 for resurfacing. Please use west lot.' },
  ];

  for (const ann of announcements) { AnnouncementStorage.add(ann); }

  // Ch6: for loop with index — seed in reverse so newest appears at top
  const activities = [
    { type: 'resident',     text: '<strong>Eva Nguyen</strong> added to Room 302',                                          color: 'blue'  },
    { type: 'maintenance',  text: 'HVAC request by <strong>Carol Williams</strong> → <strong>Completed</strong>',           color: 'green' },
    { type: 'maintenance',  text: '<strong>Medium</strong> priority request from <strong>Bob Martinez</strong> (Electrical)', color: 'amber' },
    { type: 'announcement', text: 'Announcement posted: <strong>Parking Lot Repaving</strong>',                             color: 'amber' },
  ];

  for (let i = activities.length - 1; i >= 0; i--) {
    ActivityStorage.add(activities[i].type, activities[i].text, activities[i].color);
  }
}
