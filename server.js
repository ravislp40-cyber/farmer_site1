// ✅ Import dependencies
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// ✅ Create app and database
const app = express();
const db = new sqlite3.Database('./farm.db');

// ✅ Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ✅ Create crops table if not exists
db.run(`CREATE TABLE IF NOT EXISTS crops (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  location TEXT,
  crop TEXT
)`);

// 🟢 ROUTE: Get all crops
app.get('/crops', (req, res) => {
  db.all('SELECT * FROM crops', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// 🟢 ROUTE: Add new crop
app.post('/crops', (req, res) => {
  const { name, location, crop } = req.body;
  if (!name || !location || !crop) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  db.run(
    'INSERT INTO crops (name, location, crop) VALUES (?, ?, ?)',
    [name, location, crop],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});


// 🌱 ROUTE: Get recommended crops by location
app.get('/recommendations/:location', (req, res) => {
  const location = req.params.location.toLowerCase();
  const recommendations = {
    mandya: ["Sugarcane", "Paddy", "Ragi", "Coconut"],
    davangere: ["Maize", "Rice", "Cotton", "Sunflower"],
    mysuru: ["Turmeric", "Maize", "Banana", "Sugarcane"]
  };

  const data = recommendations[location] || [];
  res.json({ location, crops: data });
});


// 💰 ROUTE: Get market rates
app.get('/rates/:location', (req, res) => {
  const location = req.params.location.toLowerCase();
  const rates = {
    mandya: [
      { crop: "Paddy", rate: 2800, unit: "₹/qtl", trend: "↗ Up" },
      { crop: "Sugarcane", rate: 3200, unit: "₹/ton", trend: "→ Stable" },
      { crop: "Ragi", rate: 2700, unit: "₹/qtl", trend: "↘ Down" }
    ],
    mysuru: [
      { crop: "Turmeric", rate: 120000, unit: "₹/ton", trend: "↗ Up" },
      { crop: "Maize", rate: 1700, unit: "₹/qtl", trend: "→ Stable" }
    ]
  };
  res.json({ location, rates: rates[location] || [] });
});


// 📈 ROUTE: Profit / Loss estimation
app.get('/profit/:location', (req, res) => {
  const location = req.params.location.toLowerCase();
  const rates = {
    mandya: [
      { crop: "Paddy", rate: 2800 },
      { crop: "Sugarcane", rate: 3200 },
      { crop: "Ragi", rate: 1700 }
    ],
    mysuru: [
      { crop: "Turmeric", rate: 120000 },
      { crop: "Maize", rate: 1700 }
    ]
  };

  const data = (rates[location] || []).map(r => ({
    crop: r.crop,
    status: r.rate > 2500 ? "Profitable 👍" : r.rate < 2000 ? "Loss Risk ⚠️" : "Average ⚖️"
  }));

  res.json({ location, profitData: data });
});


// 🧪 ROUTE: Fertilizers and sprayers
app.get('/fertilizers/:crop', (req, res) => {
  const crop = req.params.crop.toLowerCase();
  const data = {
    paddy: {
      fertilizers: "Urea, DAP, MOP",
      sprayer: "Knapsack 16L Sprayer",
      note: "Apply Nitrogen 120kg/ha, Phosphorus 60kg/ha, Potash 40kg/ha"
    },
    sugarcane: {
      fertilizers: "NPK + Micronutrients (Zn, B)",
      sprayer: "Boom Sprayer",
      note: "Use organic manure and periodic NPK application"
    },
    maize: {
      fertilizers: "Urea, DAP, Zinc Sulphate",
      sprayer: "Battery Sprayer",
      note: "Apply split doses; ensure good drainage"
    }
  };

  res.json(data[crop] || { message: "No data available" });
});


// 🐛 ROUTE: Crop diseases
app.get('/diseases/:crop', (req, res) => {
  const crop = req.params.crop.toLowerCase();
  const data = {
    paddy: [
      { name: "Blast", solution: "Use Tricyclazole; avoid excess nitrogen" },
      { name: "Brown Spot", solution: "Use Mancozeb and maintain soil health" }
    ],
    maize: [
      { name: "Fall Armyworm", solution: "Use Spinosad or biological control" }
    ],
    sugarcane: [
      { name: "Red Rot", solution: "Use disease-free setts; crop rotation" }
    ]
  };

  res.json(data[crop] || []);
});


// 🏁 Default route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


// ✅ Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
