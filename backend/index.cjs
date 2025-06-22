const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = 5000;
const SECRET_KEY = "your_secret_key";

app.use(cors());
app.use(express.json());

const db = new sqlite3.Database("./users.db", (err) => {
  if (err) {
    console.error("❌ DB connection failed:", err);
  } else {
    console.log("✅ Connected to SQLite DB");
  }
});

// JWT Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// Signup
app.post("/signup", (req, res) => {
  const { username, password, role } = req.body;
  const hashedPassword = bcrypt.hashSync(password, 10);

  db.run(
    `INSERT INTO users (username, password, role) VALUES (?, ?, ?)`,
    [username, hashedPassword, role],
    function (err) {
      if (err) {
        console.error("❌ Signup error:", err);
        return res.status(400).json({ message: "User already exists" });
      }
      res.json({ message: "Signup successful", userId: this.lastID });
    }
  );
});

// Login
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, user) => {
    if (err || !user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isPasswordValid = bcrypt.compareSync(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      SECRET_KEY,
      { expiresIn: "1h" }
    );

    res.json({ message: "Login successful", token, role: user.role, userId: user.id });
  });
});

// Add Medication
app.post("/medications", authenticateToken, (req, res) => {
  const { name, dosage, frequency, date, time } = req.body;
  const user_id = req.user.id;

  if (!name || !dosage || !frequency || !date || !time) {
    return res.status(400).json({ message: "All fields are required" });
  }

  db.run(
    `INSERT INTO medications (name, dosage, frequency, user_id, date, time, active, taken)
     VALUES (?, ?, ?, ?, ?, ?, 1, 0)`,
    [name, dosage, frequency, user_id, date, time],
    function (err) {
      if (err) {
        console.error("❌ Error adding medication:", err);
        return res.status(500).json({ message: "Failed to add medication" });
      }
      res.json({ message: "Medication added", id: this.lastID });
    }
  );
});

// Get Medications by Date
app.get("/medications", authenticateToken, (req, res) => {
  const { date } = req.query;
  const user_id = req.user.id;

  db.all(
    `SELECT * FROM medications WHERE date = ? AND user_id = ? AND active = 1`,
    [date, user_id],
    (err, rows) => {
      if (err) {
        console.error("❌ Fetch error:", err);
        return res.status(500).json({ message: "Error fetching meds" });
      }
      res.json(rows);
    }
  );
});

// Get all patients (for caretakers)
app.get("/patients", authenticateToken, (req, res) => {
  if (req.user.role !== "caretaker") {
    return res.status(403).json({ message: "Access denied" });
  }

  db.all(
    `SELECT id, username FROM users WHERE role = 'patient'`,
    (err, rows) => {
      if (err) {
        console.error("❌ Error fetching patients:", err);
        return res.status(500).json({ message: "Error fetching patients" });
      }
      res.json(rows);
    }
  );
});

// Mark Medication as Taken
app.put("/medications/:id/taken", authenticateToken, (req, res) => {
  const { id } = req.params;
  const user_id = req.user.id;

  db.run(
    `UPDATE medications SET taken = 1 WHERE id = ? AND user_id = ?`,
    [id, user_id],
    function (err) {
      if (err) {
        console.error("❌ Mark taken error:", err);
        return res.status(500).json({ message: "Error marking as taken" });
      }
      res.json({ message: "Medication marked as taken" });
    }
  );
});

// Soft Delete Medication
app.delete("/medications/:id", authenticateToken, (req, res) => {
  const { id } = req.params;
  const user_id = req.user.id;

  db.run(
    `UPDATE medications SET active = 0 WHERE id = ? AND user_id = ?`,
    [id, user_id],
    function (err) {
      if (err) {
        console.error("❌ Delete error:", err);
        return res.status(500).json({ message: "Error deleting medication" });
      }
      res.json({ message: "Medication deleted" });
    }
  );
});

// Caretaker fetches meds for a patient by user_id + date
app.post("/caretaker/medications", authenticateToken, (req, res) => {
  const { user_id, date } = req.body;

  // Only caretakers are allowed
  if (req.user.role !== "caretaker") {
    return res.status(403).json({ message: "Access denied" });
  }

  if (!user_id || !date) {
    return res.status(400).json({ message: "user_id and date are required" });
  }

  db.all(
    `SELECT * FROM medications WHERE date = ? AND user_id = ? AND active = 1`,
    [date, user_id],
    (err, rows) => {
      if (err) {
        console.error("❌ Error fetching caretaker meds:", err);
        return res.status(500).json({ message: "Error fetching medications" });
      }
      res.json(rows);
    }
  );
});

const { startOfMonth, endOfMonth, format, parseISO, isBefore, isAfter } = require("date-fns");

app.post("/medications/summary", authenticateToken, (req, res) => {
  const { user_id, date } = req.body;

  if (!user_id || !date) {
    return res.status(400).json({ message: "user_id and date are required" });
  }

  // Only caretakers or the user themselves can access
  if (req.user.role !== "caretaker" && req.user.id !== user_id) {
    return res.status(403).json({ message: "Access denied" });
  }

  const startDate = format(startOfMonth(parseISO(date)), "yyyy-MM-dd");
  const endDate = format(endOfMonth(parseISO(date)), "yyyy-MM-dd");

  db.all(
    `SELECT * FROM medications WHERE user_id = ? AND date BETWEEN ? AND ? AND active = 1 ORDER BY date ASC`,
    [user_id, startDate, endDate],
    (err, rows) => {
      if (err) {
        console.error("❌ Error fetching summary:", err);
        return res.status(500).json({ message: "Error fetching medications" });
      }

      const medsByDate = {};

      let totalTaken = 0;
      let totalMeds = 0;

      for (const row of rows) {
        const day = row.date;
        if (!medsByDate[day]) medsByDate[day] = [];

        medsByDate[day].push(row);

        totalMeds++;
        if (row.taken === 1) totalTaken++;
      }

      // 🔁 Streak Calculation
      const sortedDates = Object.keys(medsByDate)
        .filter(d => isBefore(parseISO(d), parseISO(date)) || d === date)
        .sort();

      let streak = 0;
      for (let i = sortedDates.length - 1; i >= 0; i--) {
        const dayMeds = medsByDate[sortedDates[i]];
        const allTaken = dayMeds.every(med => med.taken === 1);
        if (allTaken) {
          streak++;
        } else {
          break;
        }
      }

      const totalMissed = totalMeds - totalTaken;
      const adherenceRate = totalMeds > 0 ? ((totalTaken / totalMeds) * 100).toFixed(2) : "0.00";

      res.json({
        streak,
        totalTaken,
        totalMissed,
        adherenceRate: `${adherenceRate}%`,
        days: medsByDate, // optional: remove if not needed
      });
    }
  );
});

app.post("/medications/calendar-summary", authenticateToken, async (req, res) => {
  try {
    const { user_id } = req.body;
    if (!user_id) return res.status(400).json({ error: "User ID missing" });

    const result = await new Promise((resolve, reject) => {
      db.all(
        `SELECT date, 
                SUM(CASE WHEN taken = 1 THEN 1 ELSE 0 END) as taken_count,
                COUNT(*) as total
         FROM medications
         WHERE user_id = ? AND active = 1
         GROUP BY date`,
        [user_id],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    const summary = {};
    for (const row of result) {
      summary[row.date] = row.taken_count === row.total ? "taken" : "missed";
    }

    res.json(summary);
  } catch (err) {
    console.error("❌ Error in /medications/calendar-summary:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});


// Start Server
app.listen(PORT, () =>
  console.log(`🚀 Server running at http://localhost:${PORT}`)
);
