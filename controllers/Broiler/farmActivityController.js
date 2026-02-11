const { query } = require("../../config/db");

// ✅ Define all valid DB columns explicitly
const FARM_ACTIVITY_COLUMNS = [
    "date",
    "in_time",
    "out_time",
    "running_km",
    "total_farms",
    "plant_id",
    "vehicle_number",
    "start_km",
    "end_km",
    "farm_location",
    "batch_no",
    "age",
    "housed",
    "stock",
    "farms_maintenance",
    "litter_quality",
    "drinker_cleaning",
    "body_weight",
    "mortality",
    "upload_mortality",
    "reason",
    "treatment",
    "cum_mortality_count",
    "cum_mortality_percentage",
    "bags_quantity",
    "feed_master",
    "bags_stock",
];

// ✅ CREATE
exports.create = async (req, res) => {
    try {
        const data = req.body;

        // Handle file upload (relative path only)
        if (req.file) {
            data.upload_mortality = `uploads/${req.file.filename}`;
        }

        // Only include known columns
        const columns = FARM_ACTIVITY_COLUMNS.filter(col => data[col] !== undefined);
        const values = columns.map(col => data[col]);
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
        const columnNames = columns.map(col => `"${col}"`).join(", ");

        const sql = `
      INSERT INTO farm_activities (${columnNames})
      VALUES (${placeholders})
      RETURNING *;
    `;

        const result = await query(sql, values);

        res.status(201).json({
            status: true,
            message: "Farm activity created successfully",
            data: result[0],
        });
    } catch (error) {
        console.error("Error while creating farm activity:", error);
        res.status(500).json({
            status: false,
            message: "Error while creating farm activity",
            error: error.message,
        });
    }
};

// ✅ GET ALL
exports.getAll = async (req, res) => {
    try {
        const sql = `
      SELECT * 
      FROM farm_activities 
      ORDER BY date DESC, created_at DESC
    `;
        const result = await query(sql);

        if (result.length === 0) {
            return res.status(200).json({
                status: true,
                message: "The farm activities list is empty",
                data: [],
            });
        }

        res.status(200).json({ status: true, data: result });
    } catch (error) {
        console.error("Error while fetching farm activities:", error);
        res.status(500).json({
            status: false,
            message: "Error while fetching farm activities",
            error: error.message,
        });
    }
};

// ✅ GET ONE
exports.getOne = async (req, res) => {
    try {
        const { id } = req.params;
        const sql = `SELECT * FROM farm_activities WHERE id = $1`;
        const result = await query(sql, [id]);

        if (result.length === 0) {
            return res.status(404).json({
                status: false,
                message: `Farm activity with ID ${id} not found`,
            });
        }

        res.status(200).json({ status: true, data: result[0] });
    } catch (error) {
        console.error("Error while fetching single farm activity:", error);
        res.status(500).json({
            status: false,
            message: "Error while fetching farm activity",
            error: error.message,
        });
    }
};

// ✅ UPDATE
exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;

        const sql = `
      UPDATE farm_activities SET
        "date" = COALESCE($1, "date"),
        "in_time" = COALESCE($2, "in_time"),
        "out_time" = COALESCE($3, "out_time"),
        "running_km" = COALESCE($4, "running_km"),
        "total_farms" = COALESCE($5, "total_farms"),
        "plant_id" = COALESCE($6, "plant_id"),
        "vehicle_number" = COALESCE($7, "vehicle_number"),
        "start_km" = COALESCE($8, "start_km"),
        "end_km" = COALESCE($9, "end_km"),
        "farm_location" = COALESCE($10, "farm_location"),
        "batch_no" = COALESCE($11, "batch_no"),
        "age" = COALESCE($12, "age"),
        "housed" = COALESCE($13, "housed"),
        "stock" = COALESCE($14, "stock"),
        "farms_maintenance" = COALESCE($15, "farms_maintenance"),
        "litter_quality" = COALESCE($16, "litter_quality"),
        "drinker_cleaning" = COALESCE($17, "drinker_cleaning"),
        "body_weight" = COALESCE($18, "body_weight"),
        "mortality" = COALESCE($19, "mortality"),
        "upload_mortality" = COALESCE($20, "upload_mortality"),
        "reason" = COALESCE($21, "reason"),
        "treatment" = COALESCE($22, "treatment"),
        "cum_mortality_count" = COALESCE($23, "cum_mortality_count"),
        "cum_mortality_percentage" = COALESCE($24, "cum_mortality_percentage"),
        "bags_quantity" = COALESCE($25, "bags_quantity"),
        "feed_master" = COALESCE($26, "feed_master"),
        "bags_stock" = COALESCE($27, "bags_stock"),
        "updated_at" = CURRENT_TIMESTAMP
      WHERE id = $28
      RETURNING *;
    `;

        const values = [
            data.date,
            data.in_time,
            data.out_time,
            data.running_km,
            data.total_farms,
            data.plant_id,
            data.vehicle_number,
            data.start_km,
            data.end_km,
            data.farm_location,
            data.batch_no,
            data.age,
            data.housed,
            data.stock,
            data.farms_maintenance,
            data.litter_quality,
            data.drinker_cleaning,
            data.body_weight,
            data.mortality,
            data.upload_mortality,
            data.reason,
            data.treatment,
            data.cum_mortality_count,
            data.cum_mortality_percentage,
            data.bags_quantity,
            data.feed_master,
            data.bags_stock,
            id
        ];

        const result = await query(sql, values);

        if (result.length === 0) {
            return res.status(404).json({ status: false, message: `Farm activity with ID ${id} not found for update` });
        }

        res.status(200).json({
            status: true,
            message: "Farm activity updated successfully",
            data: result[0]
        });

    } catch (error) {
        console.error("Error while updating farm activity:", error);
        res.status(500).json({
            status: false,
            message: "Error while updating farm activity",
            error: error.message
        });
    }
};


// ✅ DELETE
exports.remove = async (req, res) => {
    try {
        const { id } = req.params;
        const sql = `DELETE FROM farm_activities WHERE id = $1 RETURNING id`;
        const result = await query(sql, [id]);

        if (result.length === 0) {
            return res.status(404).json({
                status: false,
                message: `Farm activity with ID ${id} not found for deletion`,
            });
        }

        res.status(200).json({
            status: true,
            message: `Farm activity with ID ${id} deleted successfully`,
        });
    } catch (error) {
        console.error("Error while deleting farm activity:", error);
        res.status(500).json({
            status: false,
            message: "Error while deleting farm activity",
            error: error.message,
        });
    }
};
