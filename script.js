/* ============================================================
   FusionFX — Main Script
   Covers: Currency converter, Metals converter, Gold Shop
============================================================ */

// ==================== Theme Toggle ====================

const themeToggle = document.getElementById("themeToggle");
if (localStorage.getItem("theme") === "light") {
  document.body.classList.add("light-mode");
}
if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("light-mode");
    localStorage.setItem("theme", document.body.classList.contains("light-mode") ? "light" : "dark");
  });
}

// ==================== Helpers ====================

function showRefresh() {
  const ind = document.getElementById("refreshIndicator");
  if (!ind) return;
  ind.classList.add("spin");
  setTimeout(() => ind.classList.remove("spin"), 900);
}

async function getRates(base = "USD") {
  const res = await fetch(`https://api.exchangerate-api.com/v4/latest/${base}`);
  const data = await res.json();
  return data.rates;
}

// ==================== Currency Converter ====================

let currencyChartObj;

async function convertCurrency() {
  const from   = document.getElementById("fromCurrency")?.value;
  const to     = document.getElementById("toCurrency")?.value;
  const amount = parseFloat(document.getElementById("currencyAmount")?.value);
  const resEl  = document.getElementById("currencyResult");
  const rateEl = document.getElementById("rateDisplay");
  if (!from || !to || !resEl) return;

  try {
    const rates = await getRates(from);
    const rate  = rates[to];
    resEl.textContent  = `${amount.toLocaleString()} ${from} = ${(amount * rate).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:4})} ${to}`;
    if (rateEl) rateEl.textContent = `1 ${from} = ${rate.toFixed(6)} ${to}`;
    loadCurrencyChart("currencyChart", `${from} / ${to}`, rate);
    showRefresh();
  } catch (e) {
    resEl.textContent = "Error fetching rates.";
  }
}

function loadCurrencyChart(canvasId, title, currentRate) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (currencyChartObj) currencyChartObj.destroy();

  const labels   = ["5d ago", "4d ago", "3d ago", "2d ago", "Yesterday", "Live"];
  const mockData = [
    +(currentRate * (1 + (Math.random() - 0.5) * 0.015)).toFixed(6),
    +(currentRate * (1 + (Math.random() - 0.5) * 0.012)).toFixed(6),
    +(currentRate * (1 + (Math.random() - 0.5) * 0.010)).toFixed(6),
    +(currentRate * (1 + (Math.random() - 0.5) * 0.008)).toFixed(6),
    +(currentRate * (1 + (Math.random() - 0.5) * 0.005)).toFixed(6),
    +currentRate.toFixed(6)
  ];

  const isDark = !document.body.classList.contains("light-mode");
  currencyChartObj = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: title,
        data: mockData,
        borderColor: '#c9a84c',
        backgroundColor: 'rgba(201,168,76,0.12)',
        pointBackgroundColor: '#c9a84c',
        pointRadius: 3,
        fill: true,
        tension: 0.45
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: { mode: 'index', intersect: false }
      },
      scales: {
        x: { grid: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }, ticks: { color: isDark ? '#8a90a0' : '#6b7280', font: { size: 11 } } },
        y: { grid: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }, ticks: { color: isDark ? '#8a90a0' : '#6b7280', font: { size: 11 } } }
      }
    }
  });
}

// ==================== Metals Converter ====================

let metalChartObj;

function convertWeight(amount, unit) {
  switch (unit) {
    case "gram": return amount / 31.1035;
    case "kg":   return amount * 32.1507;
    case "lb":   return amount * 14.5833;
    case "oz":   return amount;
    default:     return amount;
  }
}

async function getGoldPriceUSD() {
  try {
    const response = await fetch('https://freegoldapi.com/data/latest.csv');
    const csv      = await response.text();
    const lines    = csv.trim().split('\n');
    const lastLine = lines[lines.length - 1];
    const [date, price] = lastLine.split(',');
    const prevLine  = lines[lines.length - 2];
    const prevPrice = prevLine ? parseFloat(prevLine.split(',')[1]) : parseFloat(price);
    return { date, price: parseFloat(price), prev: prevPrice };
  } catch {
    return null;
  }
}

async function convertMetal() {
  const metal    = document.getElementById("fromMetal")?.value;
  const currency = document.getElementById("toMetal")?.value;
  const amount   = parseFloat(document.getElementById("metalAmount")?.value);
  const unit     = document.getElementById("metalWeight")?.value;
  const resEl    = document.getElementById("metalResult");
  const chgEl    = document.getElementById("metalChange");
  if (!resEl) return;

  if (metal !== "XAU") {
    resEl.textContent = "Only Gold (XAU) supported right now.";
    return;
  }

  const goldData = await getGoldPriceUSD();
  if (!goldData) {
    resEl.textContent = "Error fetching gold price.";
    return;
  }

  const ounces   = convertWeight(amount, unit);
  const totalUSD = ounces * goldData.price;
  let finalValue = totalUSD;

  if (currency !== "USD") {
    const rates  = await getRates("USD");
    finalValue   = totalUSD * rates[currency];
  }

  resEl.textContent = `${amount} ${unit === "oz" ? "troy oz" : unit} XAU = ${finalValue.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})} ${currency}`;

  const changePct = ((goldData.price - goldData.prev) / goldData.prev * 100);
  if (chgEl) {
    chgEl.textContent = `${changePct > 0 ? "▲" : "▼"} ${Math.abs(changePct).toFixed(2)}%`;
    chgEl.className   = changePct >= 0 ? "change-up" : "change-down";
  }

  loadMetalChart("metalChart", `XAU / ${currency}`, finalValue);
  showRefresh();
}

function loadMetalChart(canvasId, title, currentRate) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (metalChartObj) metalChartObj.destroy();

  const labels   = ["5d ago", "4d ago", "3d ago", "2d ago", "Yesterday", "Live"];
  const mockData = [
    +(currentRate * (1 + (Math.random() - 0.5) * 0.02)).toFixed(2),
    +(currentRate * (1 + (Math.random() - 0.5) * 0.015)).toFixed(2),
    +(currentRate * (1 + (Math.random() - 0.5) * 0.012)).toFixed(2),
    +(currentRate * (1 + (Math.random() - 0.5) * 0.01)).toFixed(2),
    +(currentRate * (1 + (Math.random() - 0.5) * 0.005)).toFixed(2),
    +currentRate.toFixed(2)
  ];

  const isDark = !document.body.classList.contains("light-mode");
  metalChartObj = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: title,
        data: mockData,
        borderColor: '#c9a84c',
        backgroundColor: 'rgba(201,168,76,0.12)',
        pointBackgroundColor: '#c9a84c',
        pointRadius: 3,
        fill: true,
        tension: 0.45
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
      scales: {
        x: { grid: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }, ticks: { color: isDark ? '#8a90a0' : '#6b7280', font: { size: 11 } } },
        y: { grid: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }, ticks: { color: isDark ? '#8a90a0' : '#6b7280', font: { size: 11 } } }
      }
    }
  });
}

// ==================== Shop ====================

const PRODUCTS = [
  {
    id: 1, category: "bar",
    name: "1 oz Gold Bar",
    tag: "Bullion Bar",
    weight: "1 troy ounce · 31.1g · .9999 fine",
    ouncesBase: 1,
    premium: 0.025,
    popular: true,
    icon: "bar"
  },
  {
    id: 2, category: "bar",
    name: "10g Gold Bar",
    tag: "Bullion Bar",
    weight: "10 grams · 0.32 troy oz · .9999 fine",
    ouncesBase: 10 / 31.1035,
    premium: 0.03,
    popular: false,
    icon: "bar"
  },
  {
    id: 3, category: "bar",
    name: "1 kg Gold Bar",
    tag: "Bullion Bar",
    weight: "1 kilogram · 32.15 troy oz · .9999 fine",
    ouncesBase: 32.1507,
    premium: 0.018,
    popular: false,
    icon: "bar"
  },
  {
    id: 4, category: "coin",
    name: "American Gold Eagle",
    tag: "Bullion Coin",
    weight: "1 troy oz · 22k gold · US Mint",
    ouncesBase: 1,
    premium: 0.04,
    popular: true,
    icon: "coin"
  },
  {
    id: 5, category: "coin",
    name: "Canadian Maple Leaf",
    tag: "Bullion Coin",
    weight: "1 troy oz · .9999 fine · Royal Canadian Mint",
    ouncesBase: 1,
    premium: 0.035,
    popular: false,
    icon: "coin"
  },
  {
    id: 6, category: "coin",
    name: "South African Krugerrand",
    tag: "Bullion Coin",
    weight: "1 troy oz · 22k gold · South African Mint",
    ouncesBase: 1,
    premium: 0.038,
    popular: false,
    icon: "coin"
  },
  {
    id: 7, category: "etf",
    name: "Gold Certificate (1g)",
    tag: "ETF / Certificate",
    weight: "1 gram allocated gold · paper certificate",
    ouncesBase: 1 / 31.1035,
    premium: 0.005,
    popular: false,
    icon: "cert"
  },
  {
    id: 8, category: "etf",
    name: "Gold Certificate (10g)",
    tag: "ETF / Certificate",
    weight: "10 grams allocated gold · paper certificate",
    ouncesBase: 10 / 31.1035,
    premium: 0.005,
    popular: false,
    icon: "cert"
  }
];

const SVG_ICONS = {
  bar: `<svg viewBox="0 0 90 90" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="10" y="28" width="70" height="34" rx="6" fill="#c9a84c" opacity="0.9"/>
    <rect x="18" y="20" width="54" height="10" rx="3" fill="#e8c96a" opacity="0.8"/>
    <rect x="14" y="62" width="62" height="6" rx="3" fill="#a8832e" opacity="0.6"/>
    <text x="45" y="50" text-anchor="middle" font-size="9" font-weight="700" fill="#0f1117" font-family="DM Sans,sans-serif">FINE GOLD</text>
    <text x="45" y="61" text-anchor="middle" font-size="7" fill="#0f1117" font-family="DM Sans,sans-serif">.9999</text>
  </svg>`,
  coin: `<svg viewBox="0 0 90 90" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="45" cy="45" r="32" fill="#c9a84c" opacity="0.9"/>
    <circle cx="45" cy="45" r="27" fill="none" stroke="#a8832e" stroke-width="1.5"/>
    <circle cx="45" cy="45" r="24" fill="#e8c96a" opacity="0.4"/>
    <text x="45" y="42" text-anchor="middle" font-size="14" font-weight="700" fill="#0f1117" font-family="DM Sans,sans-serif">Au</text>
    <text x="45" y="54" text-anchor="middle" font-size="7" fill="#0f1117" font-family="DM Sans,sans-serif">GOLD · 1 OZ</text>
  </svg>`,
  cert: `<svg viewBox="0 0 90 90" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="12" y="18" width="66" height="54" rx="5" fill="#1c2030" stroke="#c9a84c" stroke-width="1.5"/>
    <rect x="20" y="28" width="25" height="18" rx="3" fill="#c9a84c" opacity="0.8"/>
    <text x="32.5" y="41" text-anchor="middle" font-size="9" font-weight="700" fill="#0f1117" font-family="DM Sans,sans-serif">Au</text>
    <rect x="50" y="30" width="20" height="3" rx="1.5" fill="#c9a84c" opacity="0.4"/>
    <rect x="50" y="36" width="16" height="3" rx="1.5" fill="#c9a84c" opacity="0.25"/>
    <rect x="20" y="54" width="50" height="2" rx="1" fill="#c9a84c" opacity="0.15"/>
    <rect x="20" y="60" width="36" height="2" rx="1" fill="#c9a84c" opacity="0.1"/>
  </svg>`
};

let spotPrice = null; // USD per troy oz
let cart      = [];   // { product, price }
let activeFilter = "all";

async function fetchSpotPrice() {
  const goldData = await getGoldPriceUSD();
  if (goldData) {
    spotPrice = goldData.price;
    const el = document.getElementById("heroSpotPrice");
    if (el) el.textContent = `$${spotPrice.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}`;
    renderProducts();
  } else {
    // Fallback price if API fails
    spotPrice = 3312;
    const el = document.getElementById("heroSpotPrice");
    if (el) el.textContent = `$${spotPrice.toLocaleString()}*`;
    renderProducts();
  }
}

function productPrice(product) {
  if (!spotPrice) return null;
  return spotPrice * product.ouncesBase * (1 + product.premium);
}

function renderProducts() {
  const grid = document.getElementById("productGrid");
  if (!grid) return;

  const filtered = activeFilter === "all"
    ? PRODUCTS
    : PRODUCTS.filter(p => p.category === activeFilter);

  grid.innerHTML = filtered.map(p => {
    const price = productPrice(p);
    const priceStr = price
      ? `$${price.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}`
      : "Loading…";

    return `
    <div class="product-card" data-id="${p.id}">
      <div class="product-img">
        ${SVG_ICONS[p.icon]}
        ${p.popular ? '<span class="badge-popular">Popular</span>' : ''}
      </div>
      <div class="product-info">
        <div class="product-tag">${p.tag}</div>
        <div class="product-name">${p.name}</div>
        <div class="product-weight">${p.weight}</div>
        <div class="product-price-row">
          <div class="product-price"><span class="currency">USD</span>${priceStr}</div>
          <button class="add-to-cart-btn" onclick="addToCart(${p.id})">+ Add</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

function filterProducts(category, btn) {
  activeFilter = category;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderProducts();
}

function addToCart(productId) {
  const product = PRODUCTS.find(p => p.id === productId);
  if (!product) return;
  const price = productPrice(product);
  cart.push({ product, price });
  renderCart();
  // Animate button
  const btns = document.querySelectorAll(`.product-card[data-id="${productId}"] .add-to-cart-btn`);
  btns.forEach(btn => {
    btn.textContent = "✓ Added";
    btn.style.background = "rgba(74,222,128,0.15)";
    btn.style.color = "#4ade80";
    btn.style.borderColor = "rgba(74,222,128,0.3)";
    setTimeout(() => {
      btn.textContent = "+ Add";
      btn.style.background = "";
      btn.style.color = "";
      btn.style.borderColor = "";
    }, 1200);
  });
}

function removeFromCart(index) {
  cart.splice(index, 1);
  renderCart();
}

function renderCart() {
  const itemsEl    = document.getElementById("cartItems");
  const footerEl   = document.getElementById("cartFooter");
  const emptyEl    = document.getElementById("cartEmpty");
  const badgeEl    = document.getElementById("cartBadge");

  if (!itemsEl) return;

  badgeEl.textContent = cart.length;

  if (cart.length === 0) {
    if (emptyEl) emptyEl.style.display = "";
    if (footerEl) footerEl.style.display = "none";
    // Clear injected items
    itemsEl.innerHTML = '';
    itemsEl.appendChild(emptyEl || createEmptyEl());
    return;
  }

  if (emptyEl) emptyEl.style.display = "none";
  if (footerEl) footerEl.style.display = "";

  const subtotal = cart.reduce((s, i) => s + (i.price || 0), 0);
  const premium  = subtotal * 0.025;
  const shipping = 25;
  const total    = subtotal + premium + shipping;

  document.getElementById("subtotalDisplay").textContent  = `$${subtotal.toFixed(2)}`;
  document.getElementById("premiumDisplay").textContent   = `$${premium.toFixed(2)}`;
  document.getElementById("totalDisplay").textContent     = `$${total.toFixed(2)}`;

  const injected = itemsEl.querySelectorAll('.cart-item');
  injected.forEach(el => el.remove());

  cart.forEach((item, idx) => {
    const el = document.createElement('div');
    el.className = 'cart-item';
    el.innerHTML = `
      <div class="cart-item-icon">${item.product.icon === 'coin' ? '🥇' : item.product.icon === 'cert' ? '📜' : '🪙'}</div>
      <div class="cart-item-info">
        <div class="cart-item-name">${item.product.name}</div>
        <div class="cart-item-price">$${item.price ? item.price.toFixed(2) : '—'}</div>
      </div>
      <button class="cart-item-remove" onclick="removeFromCart(${idx})" title="Remove">✕</button>
    `;
    itemsEl.appendChild(el);
  });
}

// ==================== Checkout Modal ====================

function openCheckout() {
  if (cart.length === 0) return;

  // Fill order summary
  const summaryEl = document.getElementById("modalOrderSummary");
  const subtotal  = cart.reduce((s, i) => s + (i.price || 0), 0);
  const premium   = subtotal * 0.025;
  const shipping  = 25;
  const total     = subtotal + premium + shipping;

  summaryEl.innerHTML = `
    ${cart.map(i => `<div class="row"><span>${i.product.name}</span><span>$${i.price ? i.price.toFixed(2) : '—'}</span></div>`).join('')}
    <div class="row"><span>Dealer premium (2.5%)</span><span>$${premium.toFixed(2)}</span></div>
    <div class="row"><span>Shipping</span><span>$${shipping.toFixed(2)}</span></div>
    <div class="row total"><span>Order Total</span><span>$${total.toFixed(2)}</span></div>
  `;

  document.getElementById("checkoutForm").style.display = "";
  document.getElementById("successScreen").classList.remove("show");
  document.getElementById("checkoutModal").classList.add("open");
}

function closeCheckout() {
  document.getElementById("checkoutModal").classList.remove("open");
}

function placeOrder() {
  const name    = document.getElementById("chkName")?.value.trim();
  const email   = document.getElementById("chkEmail")?.value.trim();
  const address = document.getElementById("chkAddress")?.value.trim();
  const card    = document.getElementById("chkCard")?.value.trim();
  const expiry  = document.getElementById("chkExpiry")?.value.trim();

  if (!name || !email || !address || !card || !expiry) {
    alert("Please fill in all fields to continue.");
    return;
  }

  // Simulate order
  document.getElementById("checkoutForm").style.display = "none";
  document.getElementById("successScreen").classList.add("show");

  // Reset cart
  cart = [];
  renderCart();
}

// ==================== Card input formatters ====================

function formatCard(input) {
  let v = input.value.replace(/\D/g, '').substring(0, 16);
  input.value = v.replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(input) {
  let v = input.value.replace(/\D/g, '').substring(0, 4);
  if (v.length >= 3) v = v.substring(0, 2) + ' / ' + v.substring(2);
  input.value = v;
}

// ==================== Modal close on overlay click ====================

document.getElementById("checkoutModal")?.addEventListener("click", function(e) {
  if (e.target === this) closeCheckout();
});

// ==================== Page init ====================

window.addEventListener("DOMContentLoaded", () => {
  const page = document.title;

  if (page.includes("Currency")) {
    convertCurrency();
    setInterval(convertCurrency, 10000);
  }

  if (page.includes("Metals")) {
    convertMetal();
    setInterval(convertMetal, 10000);
  }

  if (page.includes("Shop")) {
    fetchSpotPrice();
    setInterval(fetchSpotPrice, 30000);
    renderCart();
  }
});
