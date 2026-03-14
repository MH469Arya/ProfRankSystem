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
    // GET CURRENT CLASS LINKINGS
    const snapshotSql = `
      SELECT 
        p.id AS teacher_id,
        p.name AS teacher,
        s.name AS subject
      FROM class_linkings cl
      JOIN classes c ON cl.class_id = c.id
      JOIN proffs p ON cl.proff_id = p.id
      JOIN subs s ON cl.sub_id = s.id
      JOIN depts d ON c.dept_id = d.id
      WHERE CONCAT(LOWER(d.code), '-', LOWER(c.year), '-', LOWER(c.division)) = ?
    `;

    db.query(snapshotSql, [division], (err2, rows2) => {
      if (err2) {
        console.error(err2);
        return res.status(500).json({ message: "Snapshot fetch error" });
      }

      if (rows2.length === 0) {
        return res.status(400).json({
          message: "No teachers assigned to this class",
        });
      }

      const snapshot = rows2.map((r) => ({
        teacher_id: r.teacher_id,
        teacher: r.teacher,
        subject: r.subject,
      }));

      const insertSql = `
        INSERT INTO voting_sessions
        (division, ts_snap, start_time, end_time)
        VALUES (?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 5 MINUTE))
      `;

      db.query(
        insertSql,
        [division, JSON.stringify(snapshot)],
        (err3, result) => {
          if (err3) {
            console.error(err3);
            return res.status(500).json({ message: "DB error" });
          }

          res.json({
            session_id: result.insertId,
            remaining_seconds: 300,
          });
        },
      );
    });
  });
});

app.post("/api/voting-sessions/:id/expire", authenticate, (req, res) => {
  const { role } = req.user;
  const { id } = req.params;

  if (role !== "SUPER_ADMIN") {
    return res.status(403).json({ message: "Unauthorized" });
  }

  const sql = `
    UPDATE voting_sessions
    SET is_active = FALSE
    WHERE id = ? AND is_active = TRUE
  `;

  db.query(sql, [id], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "DB error" });
    }

    res.json({ message: "Session expired" });
  });
});

app.post("/api/vote", async (req, res) => {
  const { class_session, rankings, fingerprint } = req.body;

  if (!class_session || !rankings || !fingerprint) {
    return res.status(400).json({ message: "Missing voting data" });
  }

  const sessionId = class_session;

  const voteSessionId = uuidv4();
  const deviceHash = crypto
    .createHash("sha256")
    .update(fingerprint)
    .digest("hex");

  // const checkSql = `
  //   SELECT *
  //   FROM voting_sessions
  //   WHERE id = ?
  //   LIMIT 1
  // `;

  const checkSql = `SELECT *,
      TIMESTAMPDIFF(SECOND, NOW(), end_time) AS remaining_seconds
      FROM voting_sessions
      WHERE id = ?
      LIMIT 1
    `;

  db.query(checkSql, [sessionId], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "DB error" });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: "Voting session not found" });
    }

    const session = results[0];

    // Check active
    if (!session.is_active) {
      return res.status(403).json({ message: "Voting session closed" });
    }

    // Check expiry
    if (session.remaining_seconds <= 0) {
      db.query("UPDATE voting_sessions SET is_active = FALSE WHERE id = ?", [
        sessionId,
      ]);

      return res.status(403).json({ message: "Voting session expired" });
    }

    // Check vote limit
    if (session.votes_cast >= session.max_votes) {
      db.query("UPDATE voting_sessions SET is_active = FALSE WHERE id = ?", [
        sessionId,
      ]);

      return res.status(403).json({ message: "Maximum votes reached" });
    }

    const duplicateCheck = `SELECT id
          FROM voting_results
          WHERE session_id = ?
          AND device_hash = ?
          LIMIT 1
            `;

    db.query(duplicateCheck, [sessionId, deviceHash], (err2, rows) => {
      if (err2) {
        return res.status(500).json({ message: "DB error" });
      }

      if (rows.length > 0) {
        return res.status(403).json({
          message: "Device already voted",
        });
      }

      const insertSql = `
          INSERT INTO voting_results
          (session_id, vote_session_id, device_hash, rankings)
          VALUES (?, ?, ?, ?)
        `;

      db.query(
        insertSql,
        [sessionId, voteSessionId, deviceHash, JSON.stringify(rankings)],
        (err3) => {
          if (err3) {
            console.error(err3);
            return res
              .status(500)
              .json({ message: "Database error during voting" });
          }

          const updateSql = `
          UPDATE voting_sessions
          SET votes_cast = votes_cast + 1
          WHERE id = ?
        `;

          db.query(updateSql, [sessionId]);

          res.json({
            message: "Vote cast successfully",
            vote_session_id: voteSessionId,
          });
        },
      );
    });
  });
});

//fetch active qr sessions
app.get("/api/voting-sessions/active", authenticate, (req, res) => {
  const { role } = req.user;

  if (role !== "SUPER_ADMIN") {
    return res.status(403).json({ message: "Unauthorized" });
  }

  const sql = `SELECT *,
        TIMESTAMPDIFF(SECOND, NOW(), end_time) AS remaining_seconds
        FROM voting_sessions
        WHERE is_active = TRUE
        AND end_time > NOW()
        ORDER BY start_time DESC
        LIMIT 1
      `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "DB error" });
    }

    if (results.length === 0) {
      return res.json({ active: false });
    }

    res.json({
      active: true,
      session: results[0],
    });
  });
});

app.post("/api/check_vote", (req, res) => {
  const { vote_session_id, session_id } = req.body;

  if (!vote_session_id || !session_id) {
    return res.status(400).json({ message: "Missing session details" });
  }

  const sql = `
    SELECT id
    FROM voting_results
    WHERE vote_session_id = ?
    AND session_id = ?
    LIMIT 1
  `;

  db.query(sql, [vote_session_id, session_id], (err, results) => {
    if (err) {
      console.error("Check Vote Error:", err.message);
      return res.status(500).json({ message: "DB error checking vote" });
    }

    res.json({
      has_voted: results.length > 0,
    });
  });
});

//check device hash
app.post("/api/check_device", (req, res) => {
  const { session_id, fingerprint } = req.body;

  if (!session_id || !fingerprint) {
    return res.status(400).json({ message: "Missing data" });
  }

  const deviceHash = crypto
    .createHash("sha256")
    .update(fingerprint)
    .digest("hex");

  const sql = `
    SELECT id
    FROM voting_results
    WHERE session_id = ?
    AND device_hash = ?
    LIMIT 1
  `;

  db.query(sql, [session_id, deviceHash], (err, rows) => {
    if (err) {
      return res.status(500).json({ message: "DB error" });
    }

    res.json({
      already_voted: rows.length > 0,
    });
  });
});

//get session details
app.get("/api/voting-sessions/:id", (req, res) => {
  console.log("SESSION FETCH HIT", req.params.id);
  const { id } = req.params;

  const sql = `
    SELECT *,
    TIMESTAMPDIFF(SECOND, NOW(), end_time) AS remaining_seconds
    FROM voting_sessions
    WHERE id = ?
    LIMIT 1
  `;

  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "DB error" });
    }

    if (results.length === 0) {
      console.log("SESSION NOT FOUND");
      return res.status(404).json({ message: "Session not found" });
    }

    const session = results[0];
    console.log("SESSION ACTIVE FLAG:", session.is_active);
    console.log("SESSION END TIME:", session.end_time);
    console.log("REMAINING SECONDS:", session.remaining_seconds);

    // THE ONLY CHECK
    if (!session.is_active) {
      console.log("SESSION MARKED INACTIVE");
      return res.status(403).json({ message: "Session expired" });
    }

    console.log("SESSION VALID");
    res.json(session);
  });
});

// to get proffs for votings
app.get("/api/teachers", (req, res) => {
  const { session } = req.query;

  if (!session) {
    return res.status(400).json({ message: "Session id required" });
  }

  const sql = "SELECT ts_snap FROM voting_sessions WHERE id = ? LIMIT 1";

  db.query(sql, [session], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "DB error" });
    }

    if (rows.length === 0) {
      return res.status(404).json({ message: "Session not found" });
    }

    const snapshot =
      typeof rows[0].ts_snap === "string"
        ? JSON.parse(rows[0].ts_snap)
        : rows[0].ts_snap;

    const teachers = snapshot.map((t) => ({
      id: t.teacher_id,
      name: t.teacher,
      subject: t.subject,
    }));

    res.json(teachers);
  });
});

//get acadmeic years
app.get("/api/academic-years", (req, res) => {
  const { department, year, division } = req.query;

  if (!department || !year || !division) {
    return res.status(400).json({ message: "Missing filters" });
  }

  const fullDivision = `${department}-${year}-${division}`.toUpperCase();

  const sql = `
    SELECT DISTINCT
    CASE
      WHEN MONTH(vr.submitted_at) >= 7
        THEN CONCAT(YEAR(vr.submitted_at), '-', RIGHT(YEAR(vr.submitted_at)+1,2))
      ELSE
        CONCAT(YEAR(vr.submitted_at)-1, '-', RIGHT(YEAR(vr.submitted_at),2))
    END AS academic_year
    FROM voting_results vr
    JOIN voting_sessions vs ON vr.session_id = vs.id
    WHERE UPPER(vs.division) = UPPER(?)
    ORDER BY academic_year DESC
  `;

  db.query(sql, [fullDivision], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "DB error" });
    }

    res.json(results.map((r) => r.academic_year));
  });
});

// borda results
app.get("/api/results", (req, res) => {
  const { department, year, division, academic_year } = req.query;

  if (!department || !year || !division || !academic_year) {
    return res.status(400).json({ message: "Missing filters" });
  }

  const fullDivision = `${department}-${year}-${division}`.toUpperCase();

  const voteSql = `
    SELECT vr.rankings, vr.session_id
    FROM voting_results vr
    JOIN voting_sessions vs ON vr.session_id = vs.id
    WHERE UPPER(vs.division) = UPPER(?)
    AND (
      CASE
        WHEN MONTH(vr.submitted_at) >= 7
          THEN CONCAT(YEAR(vr.submitted_at), '-', RIGHT(YEAR(vr.submitted_at)+1,2))
        ELSE
          CONCAT(YEAR(vr.submitted_at)-1, '-', RIGHT(YEAR(vr.submitted_at),2))
      END
    ) = ?
  `;

  db.query(voteSql, [fullDivision, academic_year], (err, votes) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Server Error" });
    }

    const totalVotes = votes.length;

    if (totalVotes === 0) {
      return res.json({
        rankings: [],
        totalVotes: 0,
      });
    }

    const sessionId = votes[0].session_id;

    db.query(
      "SELECT ts_snap FROM voting_sessions WHERE id = ?",
      [sessionId],
      (snapErr, snapRows) => {
        if (snapErr) {
          console.error(snapErr);
          return res.status(500).json({ message: "Snapshot fetch error" });
        }

        const snapshot =
          typeof snapRows[0].ts_snap === "string"
            ? JSON.parse(snapRows[0].ts_snap)
            : snapRows[0].ts_snap;

        const snapshotMap = {};
        snapshot.forEach((item) => {
          snapshotMap[item.teacher_id] = item;
        });

        const scoreMap = {};
        const distributionMap = {};

        votes.forEach((vote) => {
          const rankingArray =
            typeof vote.rankings === "string"
              ? JSON.parse(vote.rankings)
              : vote.rankings;

          const totalTeachers = rankingArray.length;

          rankingArray.forEach((teacherId, index) => {
            const points = totalTeachers - index - 1;

            if (!scoreMap[teacherId]) {
              scoreMap[teacherId] = 0;
            }
            scoreMap[teacherId] += points;

            // Track distribution
            if (!distributionMap[teacherId]) {
              distributionMap[teacherId] = {
                1: 0,
                2: 0,
                3: 0,
                4: 0,
                "5plus": 0,
              };
            }

            const rank = index + 1;
            if (rank <= 4) {
              distributionMap[teacherId][rank]++;
            } else {
              distributionMap[teacherId]["5plus"]++;
            }
          });
        });

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
        const finalRanking = sortedTeachers.map((teacher, index) => {
          const snap = snapshotMap[teacher.teacherId];
          const dist = distributionMap[teacher.teacherId];

          return {
            rank: index + 1,
            teacher: snap?.teacher || "Unknown",
            subject: snap?.subject || "Unknown",
            score: teacher.score,
            distribution: dist || { 1: 0, 2: 0, 3: 0, 4: 0, "5plus": 0 },
          };
        });

        res.json({
          rankings: finalRanking,
          totalVotes,
        });
      },
    );
});

app.listen(5000, () => console.log("Server running on http://localhost:5000"));
