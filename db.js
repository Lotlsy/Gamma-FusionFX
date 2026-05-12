/* ============================================================
   FusionFX — Database Layer (IndexedDB)
   Schema:
     Store: "orders"
       keyPath: id (autoIncrement)
       Fields: id, createdAt, status, name, email, address,
               cardLast4, items[], subtotal, premium,
               shipping, total
     Index: createdAt, status, email
============================================================ */

const DB_NAME    = "FusionFXDB";
const DB_VERSION = 1;

let _db = null;

function openDB() {
  return new Promise((resolve, reject) => {
    if (_db) return resolve(_db);

    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = e.target.result;

      // ---- orders store ----
      if (!db.objectStoreNames.contains("orders")) {
        const store = db.createObjectStore("orders", {
          keyPath: "id",
          autoIncrement: true
        });
        store.createIndex("createdAt", "createdAt", { unique: false });
        store.createIndex("status",    "status",    { unique: false });
        store.createIndex("email",     "email",     { unique: false });
      }
    };

    req.onsuccess = (e) => { _db = e.target.result; resolve(_db); };
    req.onerror   = (e) => reject(e.target.error);
  });
}

// ---- Save a new order, returns the new id ----
async function saveOrder(orderData) {
  const db    = await openDB();
  const store = db.transaction("orders", "readwrite").objectStore("orders");
  return new Promise((resolve, reject) => {
    const req = store.add({
      createdAt: new Date().toISOString(),
      status:    "confirmed",
      ...orderData
    });
    req.onsuccess = () => resolve(req.result);   // req.result = new id
    req.onerror   = () => reject(req.error);
  });
}

// ---- Get all orders (newest first) ----
async function getAllOrders() {
  const db    = await openDB();
  const store = db.transaction("orders", "readonly").objectStore("orders");
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result.reverse());
    req.onerror   = () => reject(req.error);
  });
}

// ---- Get single order by id ----
async function getOrderById(id) {
  const db    = await openDB();
  const store = db.transaction("orders", "readonly").objectStore("orders");
  return new Promise((resolve, reject) => {
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

// ---- Update order status ----
async function updateOrderStatus(id, status) {
  const db    = await openDB();
  const tx    = db.transaction("orders", "readwrite");
  const store = tx.objectStore("orders");
  return new Promise((resolve, reject) => {
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const order = getReq.result;
      if (!order) return reject(new Error("Order not found"));
      order.status = status;
      const putReq = store.put(order);
      putReq.onsuccess = () => resolve();
      putReq.onerror   = () => reject(putReq.error);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

// ---- Delete order by id ----
async function deleteOrder(id) {
  const db    = await openDB();
  const store = db.transaction("orders", "readwrite").objectStore("orders");
  return new Promise((resolve, reject) => {
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

// ---- Search orders by name or email ----
async function searchOrders(query) {
  const all = await getAllOrders();
  const q   = query.toLowerCase();
  return all.filter(o =>
    o.name?.toLowerCase().includes(q) ||
    o.email?.toLowerCase().includes(q) ||
    String(o.id).includes(q)
  );
}

// ---- Stats: total revenue, order count, avg order value ----
async function getStats() {
  const all = await getAllOrders();
  const total   = all.reduce((s, o) => s + (o.total || 0), 0);
  const count   = all.length;
  const avgVal  = count ? total / count : 0;
  const statuses = {};
  all.forEach(o => { statuses[o.status] = (statuses[o.status] || 0) + 1; });
  return { total, count, avgVal, statuses };
}

// ---- Seed demo data (only if DB is empty) ----
async function seedDemoData() {
  const all = await getAllOrders();
  if (all.length > 0) return;

  const demoOrders = [
    {
      name: "Sarah Al-Rashid", email: "sarah@example.com",
      address: "12 Jalan Bukit, Georgetown, Penang, MY",
      cardLast4: "4242", status: "confirmed",
      items: [
        { name: "1 oz Gold Bar",         weight: "1 troy oz", price: 3394.05 },
        { name: "American Gold Eagle",   weight: "1 troy oz", price: 3445.70 }
      ],
      subtotal: 6839.75, premium: 170.99, shipping: 25, total: 7035.74
    },
    {
      name: "James Thornton", email: "jthornton@mail.com",
      address: "88 Oxford Street, London, UK",
      cardLast4: "1337", status: "shipped",
      items: [
        { name: "1 kg Gold Bar", weight: "32.15 troy oz", price: 108912.60 }
      ],
      subtotal: 108912.60, premium: 2722.81, shipping: 25, total: 111660.41
    },
    {
      name: "Wei Ming Chen", email: "weiming@corp.sg",
      address: "Orchard Road, Singapore 238888",
      cardLast4: "9900", status: "delivered",
      items: [
        { name: "Canadian Maple Leaf",    weight: "1 troy oz", price: 3428.16 },
        { name: "Gold Certificate (10g)", weight: "10 grams",  price: 1079.93 }
      ],
      subtotal: 4508.09, premium: 112.70, shipping: 25, total: 4645.79
    },
    {
      name: "Amara Diallo", email: "amara.d@example.org",
      address: "Rue des Fleurs 4, Paris, FR",
      cardLast4: "5566", status: "pending",
      items: [
        { name: "South African Krugerrand", weight: "1 troy oz", price: 3437.52 }
      ],
      subtotal: 3437.52, premium: 85.94, shipping: 25, total: 3548.46
    },
    {
      name: "Raj Patel", email: "raj.patel@fintech.in",
      address: "MG Road, Bangalore, Karnataka, IN",
      cardLast4: "7777", status: "confirmed",
      items: [
        { name: "10g Gold Bar",             weight: "10 grams",  price: 1098.37 },
        { name: "Gold Certificate (1g)",    weight: "1 gram",    price: 109.84  },
        { name: "Gold Certificate (1g)",    weight: "1 gram",    price: 109.84  }
      ],
      subtotal: 1318.05, premium: 32.95, shipping: 25, total: 1376.00
    }
  ];

  // Spread demo orders over the past 14 days
  for (let i = 0; i < demoOrders.length; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (i * 3));
    await saveOrder({ ...demoOrders[i], createdAt: d.toISOString() });
  }
}
