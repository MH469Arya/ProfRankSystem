require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.static(path.join(__dirname, "public")));
app.use(cors());
app.use(express.json());
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});

app.get("/", (req, res) => {
  res.send("Backend is running 🚀");
});

app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const sql = `
        SELECT u.id, u.password_hash, u.role, d.code AS dept
        FROM users u
        LEFT JOIN depts d ON u.dept_id = d.id
        WHERE u.username = ?
        LIMIT 1
    `;

  db.query(sql, [email], async (err, results) => {
    if (err) return res.status(500).json({ message: "DB error" });

    if (results.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = results[0];

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      {
        role: user.role,
        dept: user.dept,
      },
      process.env.JWT_SECRET,
      { expiresIn: "2h" },
    );

    res.json({
      token,
      role: user.role,
      dept: user.dept,
    });
  });
});

app.listen(5000, () => console.log("Server running on http://localhost:5000"));
