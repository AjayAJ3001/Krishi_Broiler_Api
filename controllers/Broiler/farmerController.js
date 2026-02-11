const { query } = require("../../config/db");

// -------------------------------------------------
// GET ALL FARMER
// -------------------------------------------------
exports.getAllFarmer = async (req, res) => {
    try {
        const result = await query("SELECT * FROM farmers ORDER BY farmer_id ASC");
        res.json({ success: true, data: result });
    } catch (err) {
        console.error("Get All farmer Error:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// -------------------------------------------------
// GET ALL FARMER BY PLANT
// -------------------------------------------------
exports.getAllFarmerByPlant = async (req, res) => {
    const { plant_id } = req.params;

    try {
        const result = await query(
            "SELECT * FROM farmers WHERE plant_id = $1",
            [plant_id]
        );

        if (!result || result.length === 0) {
            return res.status(404).json({ success: false, message: "Not found" });
        }

        res.json({ success: true, data: result });

    } catch (err) {
        console.error("Get All farmer Error:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
};