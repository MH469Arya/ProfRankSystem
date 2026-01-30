require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const authenticate = require("./middleware/auth");

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

//login
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

//fetch deartment subs
app.get("/api/subjects", authenticate, (req, res) => {
  const { role, dept} = req.user;
  let sql = `
    SELECT s.id, s.name, s.sem
    FROM subs s
    JOIN depts d ON s.dept_id = d.id
  `;
  const params = [];

  if (role === "DEPT_ADMIN") {
    sql += " WHERE d.code = ?";
    params.push(dept);
  }

  sql += " ORDER BY s.sem, s.name";
  db.query(sql, params, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "DB error" });
    }

    res.json(results);
  });
});

//edit sub
app.put("/api/subjects/:id", authenticate, (req, res) => {
  const { role, dept } = req.user;
  const { id } = req.params;
  const { name, sem } = req.body;

  if (!name || !sem) {
    return res.status(400).json({ message: "Name and semester required" });
  }

  const sql = `
    UPDATE subs s
    JOIN depts d ON s.dept_id = d.id
    SET s.name = ?, s.sem = ?
    WHERE s.id = ? AND d.code = ?
  `;

  db.query(sql, [name, sem, id, dept], (err, result) => {
    if (err) return res.status(500).json({ message: "DB error" });

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Subject not found or unauthorized" });
    }

    res.json({ message: "Subject updated successfully" });
  });
});

//delete sub
app.delete("/api/subjects/:id", authenticate, (req, res) => {
  const { dept } = req.user;
  const { id } = req.params;

  const sql = `
    DELETE s FROM subs s
    JOIN depts d ON s.dept_id = d.id
    WHERE s.id = ? AND d.code = ?
  `;

  db.query(sql, [id, dept], (err, result) => {
    if (err) return res.status(500).json({ message: "DB error" });

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Subject not found or unauthorized" });
    }

    res.json({ message: "Subject deleted successfully" });
  });
});

// add subject
app.post("/api/subjects", authenticate, (req, res) => {
  const { role, dept } = req.user;
  const { name, sem } = req.body;

  if (!name || !sem) {
    return res.status(400).json({ message: "Name and semester required" });
  }

  // Only DEPT_ADMIN should add subjects
  if (role !== "DEPT_ADMIN") {
    return res.status(403).json({ message: "Unauthorized" });
  }

  const sql = `
    INSERT INTO subs (name, sem, dept_id)
    SELECT ?, ?, d.id
    FROM depts d
    WHERE d.code = ?
  `;

  db.query(sql, [name, sem, dept], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "DB error" });
    }

    res.status(201).json({ message: "Subject added successfully" });
  });
});

app.listen(5000, () => console.log("Server running on http://localhost:5000"));
