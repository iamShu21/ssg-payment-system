const pool = require("../db");

const createFee = async (req, res) => {
  try {
    const { fee_name, description, amount, due_date, status, performed_by } = req.body;

    if (!fee_name || !amount) {
      return res.status(400).json({ message: "Fee name and amount required" });
    }

    const [result] = await pool.query(
      `INSERT INTO fees (fee_name, description, amount, due_date, status)
       VALUES (?, ?, ?, ?, ?)`,
      [fee_name, description || null, amount, due_date || null, status || "active"]
    );

    if (performed_by) {
      await pool.query(
        `
        INSERT INTO audit_logs (user_id, action, target_type, target_id, description)
        VALUES (?, 'CREATE_FEE', 'fee', ?, ?)
        `,
        [performed_by, result.insertId, `Created fee ${result.insertId}`]
      );
    }

    res.status(201).json({
      message: "Fee created successfully",
      fee_id: result.insertId,
    });
  } catch (error) {
    console.error("Create fee error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getFees = async (req, res) => {
  try {
    const [fees] = await pool.query(`
      SELECT * FROM fees
      ORDER BY fee_id DESC
    `);

    res.json(fees);
  } catch (error) {
    console.error("Get fees error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getFeeById = async (req, res) => {
  try {
    const { fee_id } = req.params;
    const [rows] = await pool.query("SELECT * FROM fees WHERE fee_id = ?", [fee_id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Fee not found" });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error("Get fee by id error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const updateFee = async (req, res) => {
  try {
    const { fee_id } = req.params;
    const { fee_name, description, amount, due_date, status, performed_by } = req.body;

    const [existingRows] = await pool.query("SELECT fee_id FROM fees WHERE fee_id = ?", [fee_id]);
    if (existingRows.length === 0) {
      return res.status(404).json({ message: "Fee not found" });
    }

    await pool.query(
      `
      UPDATE fees
      SET
        fee_name = COALESCE(?, fee_name),
        description = ?,
        amount = COALESCE(?, amount),
        due_date = ?,
        status = COALESCE(?, status)
      WHERE fee_id = ?
      `,
      [fee_name || null, description || null, amount || null, due_date || null, status || null, fee_id]
    );

    if (performed_by) {
      await pool.query(
        `
        INSERT INTO audit_logs (user_id, action, target_type, target_id, description)
        VALUES (?, 'UPDATE_FEE', 'fee', ?, ?)
        `,
        [performed_by, fee_id, `Updated fee ${fee_id}`]
      );
    }

    res.json({ message: "Fee updated successfully" });
  } catch (error) {
    console.error("Update fee error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { createFee, getFees, getFeeById, updateFee };
