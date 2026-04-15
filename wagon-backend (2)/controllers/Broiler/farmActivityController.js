const qs = require('qs');
const { format, parse, isValid  } = require('date-fns');

const { query } = require("../../config/db");

const broilerDataEntry = require("./sap/broilerDataEntry.json");
const {sapSubmit} = require("./sap/sapSubmitService");

const TABLE_NAME = "farm_activity"; 


const FARM_ACTIVITY_COLUMNS = [
    "date",
    "plant",
    "running_km",
    "total_farms",
    "vehicle_no",
    "start_km",
    "upload_start_km",

    "farmer",
    "in_time",
    "out_time",
    "batch",
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

    "material",
    "quantity_bags",
    "stock_bags",
    "cum_feed",
    "total_feed",
    "end_km",
    "upload_end_km"
];

function normalizeTimeString(timeStr) {
    if (!timeStr) return null;
    return timeStr.replace(/\u202f|\u00a0/g, ' ').trim();
}

// ✅ CREATE
exports.create = async (req, res) => {
    try {
        const { date, ...rest} = req.body;

        let formattedDate = date;
        if (date) {
            const parsedDate = parse(date, 'd/M/yyyy', new Date());
            formattedDate = format(parsedDate, 'yyyy-MM-dd');
        }

        const user_id = "test"

        const updatedData = {
            ...rest
            // date: formattedDate,
            // sap_status: false,
            // user_id
        };

        if (rest.in_time) {
            const cleanInTime = normalizeTimeString(rest.in_time);
            const parsedInTime = parse(cleanInTime, 'h:mm a', new Date());
            if (!isValid(parsedInTime)) {
                return res.status(400).json({
                    status: false,
                    message: `Invalid in_time format. Got '${rest.in_time}'`
                });
            }
            updatedData.in_time = format(parsedInTime, 'HH:mm:ss'); // PostgreSQL TIME
        }

        if (rest.out_time) {
            const cleanOutTime = normalizeTimeString(rest.out_time);
            const parsedOutTime = parse(cleanOutTime, 'h:mm a', new Date());
            if (!isValid(parsedOutTime)) {
                return res.status(400).json({
                    status: false,
                    message: `Invalid out_time format. Got '${rest.out_time}'`
                });
            }
            updatedData.out_time = format(parsedOutTime, 'HH:mm:ss'); // PostgreSQL TIME
        }

        
        updatedData.date = formattedDate;
        updatedData.sap_status = false;
        updatedData.user_id = user_id;

        console.log(updatedData)
        // Handle file upload (relative path only)
        // if (req.file) {
        //     data.upload_mortality = `uploads/${req.file.filename}`;
        // }
        const columns = Object.keys(updatedData);
        const values = Object.values(updatedData);

        const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");

        const insertQuery = `
            INSERT INTO broiler.${broilerDataEntry[TABLE_NAME].pgTable} (${columns.join(", ")})
            VALUES (${placeholders})
            ON CONFLICT (date, plant, farmer)
            DO NOTHING
            RETURNING *;
        `;


        const dbResult = await query(insertQuery, values);

        if (dbResult.rowCount === 0) {
            return res.status(409).json({
                status: false,
                message: "Record already exists"
            });
        }

        return res.status(201).json({
            status: true,
            message: `Farm activity record saved as draft`,
            data: dbResult
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

exports.submit = async (req, res) => {
    try {
        const { date, plant, total_farms } = req.body;

        // 🔹 Format date
        let formattedDate = date;
        if (date) {
            const parsedDate = parse(date, 'd/M/yyyy', new Date());
            formattedDate = format(parsedDate, 'yyyy-MM-dd');
        }

        // 🔹 Fetch draft records
        const fetchQuery = `
            SELECT * 
            FROM broiler.${broilerDataEntry[TABLE_NAME].pgTable}
            WHERE date = $1 
            AND plant = $2 
            AND sap_status = false;
        `;

        const dbResult = await query(fetchQuery, [formattedDate, plant]);

        if (dbResult.length === 0) {
            return res.status(404).json({
                status: false,
                message: "No draft records found to submit"
            });
        }

        const rows = dbResult;

        if (Number(total_farms) !== rows.length) {
            return res.status(400).json({
                status: false,
                message: `Mismatch: Expected ${total_farms} farms, but found ${rows.length} draft records`
            });
        }

        // 🔹 Send all rows to SAP
        const sapPromises = rows.map(row => {
            return sapSubmit(TABLE_NAME, row);
        });

        const results = await Promise.allSettled(sapPromises);

        // 🔹 Separate success & failed
        const successIds = [];
        const failed = [];

        results.forEach((result, index) => {
            if (result.status) {
                successIds.push(rows[index].id);
            } else {
                failed.push({
                    id: rows[index].id,
                    error: result.reason || result.value
                });
            }
        });

        console.log("success ids : ", successIds)
        console.log("failed ids  : ", failed)

        // 🔹 Update successful records
        if (successIds.length > 0) {
            const updateQuery = `
                UPDATE broiler.${broilerDataEntry[TABLE_NAME].pgTable}
                SET sap_status = true
                WHERE id = ANY($1::int[]);
            `;
            await query(updateQuery, [successIds]);
        }

        // 🔹 Final response
        return res.status(200).json({
            status: true,
            message: "SAP submission completed",
            success_count: successIds.length,
            failed_count: failed.length,
            failed_records: failed
        });

    } catch (error) {
        console.error("Error while submitting farm activity:", error);
        res.status(500).json({
            status: false,
            message: "Error while submitting farm activity",
            error: error.message,
        });
    }
};

exports.getEntries = async (req, res) => {
    try {
        const { date, plant  } = req.query;

        const parsedDate = format(parse(req.query.date, 'd/M/yyyy', new Date()), 'yyyy-MM-dd');

        const sql = `SELECT * FROM broiler.${broilerDataEntry[TABLE_NAME].pgTable} 
        WHERE date = $1 AND plant = $2;
        `;
        const result = await query(sql, [parsedDate, plant]);

        if (result.length === 0) {
            return res.status(404).json({
                status: false,
                message: `Farm activity entries at ${plant} in ${date} not found not found`,
                data: ""
            });
        }

        res.status(200).json({ status: true, data: result });
    } catch (error) {
        console.error("Error while fetching farm activity:", error);
        res.status(500).json({
            status: false,
            message: "Error while fetching farm activity",
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
