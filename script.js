// ------------------ Currency Converter ------------------

async function getRates(base = "USD") {
  const res = await fetch(`https://api.exchangerate-api.com/v4/latest/${base}`);
  const data = await res.json();
  return data.rates;
}

async function convertCurrency() {
  const from = document.getElementById("fromCurrency").value;
  const to = document.getElementById("toCurrency").value;
  const amount = parseFloat(document.getElementById("currencyAmount").value);
  const resultDisplay = document.getElementById("currencyResult");

  const rates = await getRates(from);
  const rate = rates[to];
  const converted = amount * rate;

  resultDisplay.innerText = `${amount} ${from} = ${converted.toFixed(2)} ${to}`;
  loadCurrencyChart("currencyChart", `${from}/${to}`, rate);
}

let currencyChartObj;
function loadCurrencyChart(canvasId, title, currentRate) {
  const ctx = document.getElementById(canvasId).getContext("2d");
  if (currencyChartObj) currencyChartObj.destroy();

  const labels = ["4d", "3d", "2d", "Yesterday", "Live"];
  const mockData = [
    currentRate * 0.98,
    currentRate * 1.01,
    currentRate * 0.99,
    currentRate * 1.02,
    currentRate
  ];

  currencyChartObj = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: title,
        data: mockData,
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99,102,241,0.2)',
        fill: true,
        tension: 0.4
      }]
    },
    options: { responsive: true, plugins: { legend: { display: false } } }
  });
}

// ------------------ Metals Converter ------------------

function convertWeight(amount, unit) {
  switch(unit) {
    case "gram": return amount / 31.1035;
    case "kg":   return amount * 32.1507;
    case "lb":   return amount * 16;
    case "oz":   return amount;
    default:     return amount;
  }
}

async function getGoldPriceUSD() {
  const response = await fetch('https://freegoldapi.com/data/latest.csv');
  const csv = await response.text();
  const lines = csv.trim().split('\n');
  const lastLine = lines[lines.length - 1];
  const [date, price] = lastLine.split(',');
  return { date, price: parseFloat(price) };
}

async function convertMetal() {
  const metal = document.getElementById("fromMetal").value;
  const currency = document.getElementById("toMetal").value;
  const amount = parseFloat(document.getElementById("metalAmount").value);
  const unit = document.getElementById("metalWeight").value;
  const resultDisplay = document.getElementById("metalResult");

  if (metal !== "XAU") {
    resultDisplay.innerText = "Only Gold (XAU) supported with freegoldapi.";
    return;
  }

  const goldData = await getGoldPriceUSD();
  if (!goldData) {
    resultDisplay.innerText = "Error fetching gold price.";
    return;
  }

  const ounces = convertWeight(amount, unit);
  const totalUSD = ounces * goldData.price;

  let finalValue = totalUSD;
  if (currency !== "USD") {
    const rates = await getRates("USD");
    const fxRate = rates[currency];
    finalValue = totalUSD * fxRate;
  }

  resultDisplay.innerText = `${amount} ${unit} ${metal} = ${finalValue.toFixed(2)} ${currency} (Spot ${goldData.date})`;
  loadMetalChart("metalChart", `Gold/${currency}`, finalValue);
}

let metalChartObj;
function loadMetalChart(canvasId, title, currentRate) {
  const ctx = document.getElementById(canvasId).getContext("2d");
  if (metalChartObj) metalChartObj.destroy();

  const labels = ["4d", "3d", "2d", "Yesterday", "Live"];
  const mockData = [
    currentRate * 0.98,
    currentRate * 1.01,
    currentRate * 0.99,
    currentRate * 1.02,
    currentRate
  ];

  metalChartObj = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: title,
        data: mockData,
        borderColor: '#ffd700',
        backgroundColor: 'rgba(255,215,0,0.2)',
        fill: true,
        tension: 0.4
      }]
    },
    options: { responsive: true, plugins: { legend: { display: false } } }
  });
}

// ------------------ Auto Refresh ------------------

// Refresh metals every 10s
setInterval(() => {
  convertMetal();
}, 10000);

// Refresh currency converter every 10s
setInterval(() => {
  convertCurrency();
}, 10000);
