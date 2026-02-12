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

// GET all departments
app.get("/api/departments", (req, res) => {
  const sql = "SELECT id, code FROM depts"; // Fetches ID and the code (which UI uses as name)
  db.query(sql, (err, results) => {
    if (err) {
      console.error("Error fetching departments:", err);
      return res.status(500).json({ message: "Database error" });
    }
    res.json(results);
  });
});

// POST to add or update a department
app.post("/api/departments", (req, res) => {
  const { id, name } = req.body; // 'name' from frontend maps to 'code' in DB

  if (id) {
    // UPDATE existing department
    const sql = "UPDATE depts SET code = ? WHERE id = ?";
    db.query(sql, [name, id], (err, result) => {
      if (err) return res.status(500).json({ message: "Update failed" });
      res.json({ message: "Department updated successfully" });
    });
  } else {
    // INSERT new department
    const sql = "INSERT INTO depts (code) VALUES (?)";
    db.query(sql, [name], (err, result) => {
      if (err) return res.status(500).json({ message: "Insert failed" });
      res.json({
        message: "Department added successfully",
        id: result.insertId,
      });
    });
  }
});

// DELETE a department by ID
app.delete("/api/departments/:id", (req, res) => {
  const { id } = req.params;
  const sql = "DELETE FROM depts WHERE id = ?";

  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error("Delete error:", err);
      return res.status(500).json({ message: "Database error" });
    }
    res.json({ message: "Deleted successfully" });
  });
});

//fetch deartment subs
app.get("/api/subjects", authenticate, (req, res) => {
  const { role, dept } = req.user;
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
      return res
        .status(404)
        .json({ message: "Subject not found or unauthorized" });
    }

    res.json({ message: "Subject updated successfully" });
  });
});

//delete sub
app.delete("/api/subjects/:id", authenticate, (req, res) => {
  const { role, dept } = req.user;
  const { id } = req.params;

  if (role !== "DEPT_ADMIN") {
    return res.status(403).json({ message: "Unauthorized" });
  }

  const checkSql = `
    SELECT c.year, c.division
    FROM class_linkings cl
    JOIN classes c ON cl.class_id = c.id
    JOIN depts d ON c.dept_id = d.id
    WHERE cl.sub_id = ? AND d.code = ?
  `;

  db.query(checkSql, [id, dept], (err, rows) => {
    if (err) return res.status(500).json({ message: "DB error" });

    if (rows.length > 0) {
      return res.status(409).json({
        message: "Subject is assigned to classrooms",
        classrooms: rows.map(r => `${r.year} ${r.division}`)
      });
    }

    const deleteSql = `
      DELETE s FROM subs s
      JOIN depts d ON s.dept_id = d.id
      WHERE s.id = ? AND d.code = ?
    `;

    db.query(deleteSql, [id, dept], (err2) => {
      if (err2) return res.status(500).json({ message: "DB error" });
      res.json({ message: "Subject deleted" });
    });
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

//fetch proffs
app.get("/api/proffs", authenticate, (req, res) => {
  const { role, dept } = req.user;
  if (role !== "DEPT_ADMIN") {
    return res.status(403).json({ message: "Unauthorized" });
  }
  const sql = `
    SELECT p.id, p.name
    FROM proffs p
    JOIN depts d ON p.dept_id = d.id
    WHERE d.code = ?
    ORDER BY p.name
  `;
  db.query(sql, [dept], (err, results) => {
    if (err) return res.status(500).json({ message: "DB error" });
    res.json(results);
  });
});

// ADD teacher
app.post("/api/proffs", authenticate, (req, res) => {
  const { role, dept } = req.user;
  const { name } = req.body;

  if (role !== "DEPT_ADMIN") {
    return res.status(403).json({ message: "Unauthorized" });
  }

  if (!name) {
    return res.status(400).json({ message: "Name required" });
  }

  const sql = `
    INSERT INTO proffs (name, dept_id)
    SELECT ?, d.id
    FROM depts d
    WHERE d.code = ?
  `;

  db.query(sql, [name, dept], (err, result) => {
    if (err) return res.status(500).json({ message: "DB error" });
    res.status(201).json({ id: result.insertId, name });
  });
});

// EDIT proff
app.put("/api/proffs/:id", authenticate, (req, res) => {
  const { role, dept } = req.user;
  const { id } = req.params;
  const { name } = req.body;

  if (role !== "DEPT_ADMIN") {
    return res.status(403).json({ message: "Unauthorized" });
  }

  const sql = `
    UPDATE proffs p
    JOIN depts d ON p.dept_id = d.id
    SET p.name = ?
    WHERE p.id = ? AND d.code = ?
  `;

  db.query(sql, [name, id, dept], (err, result) => {
    if (err) return res.status(500).json({ message: "DB error" });

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Not found or unauthorized" });
    }

    res.json({ message: "Teacher updated" });
  });
});

// DELETE proff
app.delete("/api/proffs/:id", authenticate, (req, res) => {
  const { role, dept } = req.user;
  const { id } = req.params;

  if (role !== "DEPT_ADMIN") {
    return res.status(403).json({ message: "Unauthorized" });
  }

  // Check if proff in use
  const checkSql = `
    SELECT c.year, c.division
    FROM class_linkings cl
    JOIN classes c ON cl.class_id = c.id
    JOIN depts d ON c.dept_id = d.id
    WHERE cl.proff_id = ? AND d.code = ?
  `;

  db.query(checkSql, [id, dept], (err, rows) => {
    if (err) return res.status(500).json({ message: "DB error" });

    // proff in use
    if (rows.length > 0) {
      return res.status(409).json({
        message: "Professor is assigned to classrooms",
        classrooms: rows.map(r => `${r.year} ${r.division}`)
      });
    }

    // delete if not in use
    const deleteSql = `
      DELETE p FROM proffs p
      JOIN depts d ON p.dept_id = d.id
      WHERE p.id = ? AND d.code = ?
    `;

    db.query(deleteSql, [id, dept], (err2, result) => {
      if (err2) return res.status(500).json({ message: "DB error" });
      res.json({ message: "Professor deleted" });
    });
  });
});




// GET classrooms
app.get("/api/classes", authenticate, (req, res) => {
  const { role, dept } = req.user;

  if (role !== "DEPT_ADMIN") {
    return res.status(403).json({ message: "Unauthorized" });
  }

  const sql = `
    SELECT c.id, c.year, c.division
    FROM classes c
    JOIN depts d ON c.dept_id = d.id
    WHERE d.code = ?
    ORDER BY c.year, c.division
  `;

  db.query(sql, [dept], (err, results) => {
    if (err) return res.status(500).json({ message: "DB error" });
    res.json(results);
  });
});

// ADD classroom
app.post("/api/classes", authenticate, (req, res) => {
  const { role, dept } = req.user;
  const { year, division } = req.body;

  if (role !== "DEPT_ADMIN") {
    return res.status(403).json({ message: "Unauthorized" });
  }

  if (!year || !division) {
    return res.status(400).json({ message: "Year and division required" });
  }

  const sql = `
    INSERT INTO classes (year, division, dept_id)
    SELECT ?, ?, d.id
    FROM depts d
    WHERE d.code = ?
  `;

  db.query(sql, [year, division, dept], (err, result) => {
    if (err) {
      // UNIQUE constraint violation
      if (err.code === "ER_DUP_ENTRY") {
        return res.status(409).json({ message: "Classroom already exists" });
      }
      return res.status(500).json({ message: "DB error" });
    }

    res.status(201).json({
      id: result.insertId,
      year,
      division
    });
  });
});

// EDIT classroom
app.put("/api/classes/:id", authenticate, (req, res) => {
  const { role, dept } = req.user;
  const { id } = req.params;
  const { year, division } = req.body;

  if (role !== "DEPT_ADMIN") {
    return res.status(403).json({ message: "Unauthorized" });
  }

  const sql = `
    UPDATE classes c
    JOIN depts d ON c.dept_id = d.id
    SET c.year = ?, c.division = ?
    WHERE c.id = ? AND d.code = ?
  `;

  db.query(sql, [year, division, id, dept], (err, result) => {
    if (err) {
      if (err.code === "ER_DUP_ENTRY") {
        return res.status(409).json({ message: "Duplicate classroom" });
      }
      return res.status(500).json({ message: "DB error" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Not found or unauthorized" });
    }

    res.json({ message: "Classroom updated" });
  });
});

// DELETE classroom
app.delete("/api/classes/:id", authenticate, (req, res) => {
  const { role, dept } = req.user;
  const { id } = req.params;

  if (role !== "DEPT_ADMIN") {
    return res.status(403).json({ message: "Unauthorized" });
  }

  const sql = `
    DELETE c FROM classes c
    JOIN depts d ON c.dept_id = d.id
    WHERE c.id = ? AND d.code = ?
  `;

  db.query(sql, [id, dept], (err, result) => {
    if (err) return res.status(500).json({ message: "DB error" });

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Not found or unauthorized" });
    }

    res.json({ message: "Classroom deleted" });
  });
});


// GET class linkings
app.get("/api/classes/:id/linkings", authenticate, (req, res) => {
  const { role, dept } = req.user;
  const { id } = req.params;

  if (role !== "DEPT_ADMIN") {
    return res.status(403).json({ message: "Unauthorized" });
  }

  const sql = `
    SELECT cl.id,
       cl.sub_id,
       cl.proff_id,
       s.name AS subject,
       p.name AS teacher
    FROM class_linkings cl
    JOIN classes c ON cl.class_id = c.id
    JOIN depts d ON c.dept_id = d.id
    JOIN subs s ON cl.sub_id = s.id
    JOIN proffs p ON cl.proff_id = p.id
    WHERE c.id = ? AND d.code = ?
    ORDER BY s.name
  `;

  db.query(sql, [id, dept], (err, results) => {
    if (err) return res.status(500).json({ message: "DB error" });
    res.json(results);
  });
});

// ADD class linking
app.post("/api/classes/:id/linkings", authenticate, (req, res) => {
  const { role, dept } = req.user;
  const { id } = req.params;
  const { sub_id, proff_id } = req.body;

  if (role !== "DEPT_ADMIN") {
    return res.status(403).json({ message: "Unauthorized" });
  }

  const sql = `
    INSERT INTO class_linkings (class_id, sub_id, proff_id)
    SELECT ?, ?, ?
    FROM classes c
    JOIN depts d ON c.dept_id = d.id
    WHERE c.id = ? AND d.code = ?
  `;

  db.query(sql, [id, sub_id, proff_id, id, dept], (err, result) => {
    if (err) {
      if (err.code === "ER_DUP_ENTRY") {
        return res.status(409).json({ message: "Subject already assigned" });
      }
      return res.status(500).json({ message: "DB error" });
    }

    res.status(201).json({ message: "Assignment added" });
  });
});

// EDIT linking
app.put("/api/linkings/:id", authenticate, (req, res) => {
  const { role, dept } = req.user;
  const { id } = req.params;
  const { proff_id } = req.body;

  if (role !== "DEPT_ADMIN") {
    return res.status(403).json({ message: "Unauthorized" });
  }

  const sql = `
    UPDATE class_linkings cl
    JOIN classes c ON cl.class_id = c.id
    JOIN depts d ON c.dept_id = d.id
    SET cl.proff_id = ?
    WHERE cl.id = ? AND d.code = ?
  `;

  db.query(sql, [proff_id, id, dept], (err, result) => {
    if (err) return res.status(500).json({ message: "DB error" });

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Not found or unauthorized" });
    }

    res.json({ message: "Assignment updated" });
  });
});

// DELETE linking
app.delete("/api/linkings/:id", authenticate, (req, res) => {
  const { role, dept } = req.user;
  const { id } = req.params;

  if (role !== "DEPT_ADMIN") {
    return res.status(403).json({ message: "Unauthorized" });
  }

  const sql = `
    DELETE cl FROM class_linkings cl
    JOIN classes c ON cl.class_id = c.id
    JOIN depts d ON c.dept_id = d.id
    WHERE cl.id = ? AND d.code = ?
  `;

  db.query(sql, [id, dept], (err, result) => {
    if (err) return res.status(500).json({ message: "DB error" });

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Not found or unauthorized" });
    }

    res.json({ message: "Assignment removed" });
  });
});

//after voting storing of student responses
app.post('/api/vote', (req, res) => { 
    const { token, division, rankings } = req.body;

    // 1. Basic check: Are all fields present?
    if (!token || !division || !rankings) {
        return res.status(400).json({ message: "Missing voting data" });
    }

    // 2. Check if this token has already voted 
    db.execute(
        'SELECT id FROM voting_results WHERE student_token = ?', 
        [token], 
        (err, existing) => {
            if (err) {
                console.error("Duplicate Check Error:", err.message);
                return res.status(500).json({ message: "Database error" });
            }

            if (existing.length > 0) {
                return res.status(403).json({ message: "You have already voted!" });
            }

            // 3. Insert the vote 
            const sql = 'INSERT INTO voting_results (student_token, division, rankings) VALUES (?, ?, ?)';
            db.execute(
                sql, 
                [token, division, JSON.stringify(rankings)], 
                (insertErr, result) => {
                    if (insertErr) {
                        console.error("Insertion Error:", insertErr.message);
                        return res.status(500).json({ message: "Database error during voting" });
                    }

                    res.status(200).json({ message: "Vote cast successfully" });
                }
            );
        }
    );
});
// to get teachers from proffs
app.get('/api/teachers', (req, res) => { 
    const { div } = req.query; 

    if (!div) return res.status(400).json({ message: "Division is required" });

    const deptCode = div.split('-')[0].toUpperCase(); 

    db.execute(
        `SELECT p.id, p.name 
         FROM proffs p
         INNER JOIN depts d ON p.dept_id = d.id
         WHERE d.code = ?`, 
        [deptCode],
        (err, results) => {
            if (err) {
                console.error("Database Error:", err.message);
                return res.status(500).json({ message: "Internal server error" });
            }

            if (results.length === 0) {
                return res.status(404).json({ message: "No teachers found" });
            }

            // Results is the array of teachers
            res.json(results);
        }
    );
});

app.listen(5000, () => console.log("Server running on http://localhost:5000"));
