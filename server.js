const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Database setup
const dbPath = path.join(__dirname, 'students.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database');
    // Create table if it doesn't exist
    db.run(`CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_name TEXT NOT NULL,
      roll_no TEXT UNIQUE NOT NULL,
      fees REAL NOT NULL,
      mobile_no TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) {
        console.error('Error creating table:', err.message);
      } else {
        console.log('Students table ready');
      }
    });
  }
});

// Routes

// Get all students
app.get('/api/students', (req, res) => {
  db.all('SELECT * FROM students ORDER BY id DESC', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get student by ID
app.get('/api/students/:id', (req, res) => {
  const id = req.params.id;
  db.get('SELECT * FROM students WHERE id = ?', [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Student not found' });
      return;
    }
    res.json(row);
  });
});

// Search students
app.get('/api/students/search/:query', (req, res) => {
  const query = `%${req.params.query}%`;
  db.all(
    `SELECT * FROM students 
     WHERE student_name LIKE ? 
     OR roll_no LIKE ? 
     OR mobile_no LIKE ? 
     ORDER BY id DESC`,
    [query, query, query],
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(rows);
    }
  );
});

// Create new student
app.post('/api/students', (req, res) => {
  const { student_name, roll_no, fees, mobile_no } = req.body;

  if (!student_name || !roll_no || fees === undefined || !mobile_no) {
    res.status(400).json({ error: 'All fields are required' });
    return;
  }

  db.run(
    'INSERT INTO students (student_name, roll_no, fees, mobile_no) VALUES (?, ?, ?, ?)',
    [student_name, roll_no, fees, mobile_no],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint')) {
          res.status(400).json({ error: 'Roll number already exists' });
        } else {
          res.status(500).json({ error: err.message });
        }
        return;
      }
      res.json({
        id: this.lastID,
        student_name,
        roll_no,
        fees,
        mobile_no,
        message: 'Student added successfully'
      });
    }
  );
});

// Update student
app.put('/api/students/:id', (req, res) => {
  const id = req.params.id;
  const { student_name, roll_no, fees, mobile_no } = req.body;

  if (!student_name || !roll_no || fees === undefined || !mobile_no) {
    res.status(400).json({ error: 'All fields are required' });
    return;
  }

  db.run(
    'UPDATE students SET student_name = ?, roll_no = ?, fees = ?, mobile_no = ? WHERE id = ?',
    [student_name, roll_no, fees, mobile_no, id],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint')) {
          res.status(400).json({ error: 'Roll number already exists' });
        } else {
          res.status(500).json({ error: err.message });
        }
        return;
      }
      if (this.changes === 0) {
        res.status(404).json({ error: 'Student not found' });
        return;
      }
      res.json({ message: 'Student updated successfully' });
    }
  );
});

// Delete student
app.delete('/api/students/:id', (req, res) => {
  const id = req.params.id;
  db.run('DELETE FROM students WHERE id = ?', [id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Student not found' });
      return;
    }
    res.json({ message: 'Student deleted successfully' });
  });
});

// Export to Excel
app.get('/api/students/export/excel', (req, res) => {
  db.all('SELECT * FROM students ORDER BY id DESC', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    // Prepare data for Excel
    const worksheetData = [
      ['ID', 'Student Name', 'Roll No', 'Fees', 'Mobile No', 'Created At']
    ];

    rows.forEach(row => {
      worksheetData.push([
        row.id,
        row.student_name,
        row.roll_no,
        row.fees,
        row.mobile_no,
        row.created_at
      ]);
    });

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);

    // Set column widths
    ws['!cols'] = [
      { wch: 5 },  // ID
      { wch: 20 }, // Student Name
      { wch: 15 }, // Roll No
      { wch: 12 }, // Fees
      { wch: 15 }, // Mobile No
      { wch: 20 }  // Created At
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Students');

    // Generate Excel file buffer
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=students_report.xlsx');

    res.send(excelBuffer);
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('Database connection closed');
    }
    process.exit(0);
  });
});

