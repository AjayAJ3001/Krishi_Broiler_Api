const qs = require('qs');
const { format, parse } = require('date-fns');
const { query } = require("../../config/db");

const broilerDataEntry = require("./sap/broilerDataEntry.json");
const { sapSubmit } = require("./sap/sapSubmitService");

const TABLE_NAME = "shed_ready"; 

// ================= CREATE =================
exports.create = async (req, res) => {
    try {
        const data = req.body;

        const response = await sapSubmit(TABLE_NAME, data);
        console.log("controller response : ", response);

        if (!response.status) {
            return res.status(500).json({
                status: false,
                message: "SAP upload error",
                error: response
            });
        }

        const {
            date,
            plant,
            farmer,
            batch,
            farm_length,
            farm_width,
            chick_house_capacity,
            chick_excess_housed,
            sell   // ✅ NEW
        } = data;

        const user_id = "test";

        // ✅ MAIN LOGIC
        const finalFarmer = sell === 'X' ? null : farmer;

        const parsedDate = parse(date, 'd/M/yyyy', new Date());
        const formattedDate = format(parsedDate, 'yyyy-MM-dd');

        const insertQuery = `
            INSERT INTO broiler.${broilerDataEntry[TABLE_NAME].pgTable} (
                date, plant, farmer, batch,
                farm_length, farm_width,
                chick_house_capacity, chick_excess_housed, user_id
            ) 
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
            ON CONFLICT (plant, farmer, batch)
            DO UPDATE SET
                date = EXCLUDED.date,
                farm_length = EXCLUDED.farm_length,
                farm_width = EXCLUDED.farm_width,
                chick_house_capacity = EXCLUDED.chick_house_capacity,
                chick_excess_housed = EXCLUDED.chick_excess_housed,
                user_id = EXCLUDED.user_id
            RETURNING *;
        `;

        const values = [
            formattedDate, 
            plant,
            finalFarmer,   // ✅ applied
            batch,
            farm_length,
            farm_width,
            chick_house_capacity,
            chick_excess_housed,
            user_id
        ];

        const dbResult = await query(insertQuery, values);

        // ✅ Hide farmer in response
        if (sell === 'X' && dbResult.rows) {
            dbResult.rows.forEach(row => row.farmer = null);
        }

        const isUpdate = dbResult.command === 'UPDATE';

        return res.status(201).json({
            status: true,
            message: `Shed readiness record ${isUpdate ? "updated" : "created"} successfully`,
            data: dbResult
        });

    } catch (error) {
        console.error("Error creating shed readiness record:", error);
        res.status(500).json({
            status: false,
            message: "Error creating shed readiness record",
            error: error.message
        });
    }
};

// ================= GET ALL =================
exports.getAll = async (req, res) => {
    try {
        const result = await query(
            `SELECT * FROM broiler.${broilerDataEntry[TABLE_NAME].pgTable} ORDER BY id DESC, created_at DESC`
        );

        // ✅ Hide farmer if sell = X
        result.forEach(row => {
            if (row.sell === 'X') {
                row.farmer = null;
            }
        });

        if (result.length === 0) {
            return res.status(200).json({
                status: true,
                message: "The shed readiness list is empty",
                data: []
            });
        }

        res.status(200).json({ status: true, data: result });

    } catch (error) {
        console.error("Error fetching shed readiness records:", error);
        res.status(500).json({
            status: false,
            message: "Error fetching shed readiness records",
            error: error.message
        });
    }
};

// ================= GET ONE =================
exports.getOne = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await query(
            'SELECT * FROM shed_readiness WHERE id = $1',
            [id]
        );

        if (result.length === 0) {
            return res.status(404).json({
                status: false,
                message: `Record with ID ${id} not found`
            });
        }

        const row = result[0];

        // ✅ Hide farmer
        if (row.sell === 'X') {
            row.farmer = null;
        }

        res.status(200).json({ status: true, data: row });

    } catch (error) {
        console.error("Error fetching record:", error);
        res.status(500).json({
            status: false,
            message: "Error fetching record",
            error: error.message
        });
    }
};

// ================= UPDATE =================
exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;

        // ✅ APPLY LOGIC HERE ALSO
        if (data.sell === 'X') {
            data.farmer = null;
        }

        const columns = Object.keys(data);

        const setClauses = columns
            .map((col, index) => `"${col}" = $${index + 1}`)
            .join(', ');

        const values = columns.map(col => data[col]);
        values.push(id);

        const sql = `
            UPDATE shed_readiness
            SET ${setClauses}, "updated_at" = CURRENT_TIMESTAMP
            WHERE id = $${values.length}
            RETURNING *;
        `;

        const result = await query(sql, values);

        if (result.length === 0) {
            return res.status(404).json({
                status: false,
                message: `Record with ID ${id} not found`
            });
        }

        // ✅ Hide farmer in response
        if (result[0].sell === 'X') {
            result[0].farmer = null;
        }

        res.status(200).json({
            status: true,
            message: "Record updated successfully",
            data: result[0]
        });

    } catch (error) {
        console.error("Error updating record:", error);
        res.status(500).json({
            status: false,
            message: "Error updating record",
            error: error.message
        });
    }
};

// ================= DELETE =================
exports.remove = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await query(
            'DELETE FROM shed_readiness WHERE id = $1 RETURNING id',
            [id]
        );

        if (result.length === 0) {
            return res.status(404).json({
                status: false,
                message: `Record with ID ${id} not found`
            });
        }

        res.status(200).json({
            status: true,
            message: `Record deleted successfully`
        });

    } catch (error) {
        console.error("Error deleting record:", error);
        res.status(500).json({
            status: false,
            message: "Error deleting record",
            error: error.message
        });
    }
};