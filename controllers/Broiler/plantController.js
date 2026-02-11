const { query } = require("../../config/db");

// -------------------------------------------------
// GET ALL PLANTS
// -------------------------------------------------
exports.getAllPlants = async (req, res) => {
  try {
    const result = await query("SELECT * FROM plants ORDER BY plant_id ASC");
    res.json({ success: true, data: result });
  } catch (err) {
    console.error("Get All Plants Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// -------------------------------------------------
// GET BY plant_id
// -------------------------------------------------
exports.getByPlantId = async (req, res) => {
  const { plant_id } = req.params;

  try {
    const result = await query(
      "SELECT * FROM plants WHERE plant_id = $1",
      [plant_id]
    );

    if (!result || result.length === 0) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    res.json({ success: true, data: result[0] });
  } catch (err) {
    console.error("Get By Plant ID Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// -------------------------------------------------
// BULK INSERT WITHOUT DUPLICATES (UPSERT)
// -------------------------------------------------
exports.insertAllPlants = async (req, res) => {
  const plants = req.body;

  if (!Array.isArray(plants)) {
    return res.status(400).json({ success: false, message: "Invalid input" });
  }

  try {
    for (const p of plants) {
      if (!p.plant_id || !p.name) continue;

      await query(
        `
        INSERT INTO plants (plant_id, name)
        VALUES ($1, $2)
        ON CONFLICT (plant_id)
        DO UPDATE SET name = EXCLUDED.name;
        `,
        [p.plant_id, p.name]
      );
    }

    res.json({ success: true, message: "Inserted/Updated successfully" });
  } catch (err) {
    console.error("Bulk Insert Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
