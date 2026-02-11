// controllers/masterSync.js

const axios = require("axios");
const { query, pool } = require("../../../config/db");
const uniqueKeys = require("./uniqueKeys");
const MAX_CHUNK = 1000;

// SAP Configuration
const SAP_BASE_URL = process.env.SAP_BASE_URL;
const SAP_CLIENT = process.env.SAP_CLIENT;
const SAP_USERNAME = process.env.SAP_USERNAME;
const SAP_PASSWORD = process.env.SAP_PASSWORD;

function normalizePayload(body) {
    if (!body) return [];

    if (Array.isArray(body)) {
        // If array contains flat data objects (values are scalars), return them directly
        const directObjects = body.filter(v => typeof v === "object" && v !== null && !Array.isArray(v));
        if (directObjects.length > 0) {
            const firstObj = directObjects[0];
            const allScalar = Object.values(firstObj).every(v => typeof v !== "object" || v === null);
            if (allScalar) return directObjects;
        }
        // Legacy: merge array elements for nested structures
        const merged = Object.assign({}, ...body.filter(Boolean));
        return Object.values(merged).filter(v => typeof v === "object");
    }
    else if (typeof body === "object") {
        // if keys are numeric and values objects, map them
        // If body has top-level keys like created_at,id, ignore them
        const rows = [];
        for (const k of Object.keys(body)) {
            if (/^\d+$/.test(k) && typeof body[k] === "object") rows.push(body[k]);
        }

        if (rows.length) return rows;

        const vals = Object.values(body).filter(v => typeof v === "object");
        if (vals.length > 0) return vals;
        return [body];
    }

    return [];
}

/**
 * Normalize SAP API response into a rows array
 */
function normalizeSapResponse(sapData) {
    let rows = [];

    if (Array.isArray(sapData)) {
        rows = sapData;
    } else if (typeof sapData === "object" && sapData !== null) {
        const values = Object.values(sapData);
        if (values.length > 0 && typeof values[0] === "object") {
            rows = values.filter((v) => typeof v === "object" && v !== null);
        } else {
            rows = [sapData];
        }
    }

    return rows;
}

/**
 * Helper to call a SAP API endpoint
 */
async function fetchFromSap(endpoint) {
    const sapUrl = `${SAP_BASE_URL}${endpoint}?sap-client=${SAP_CLIENT}`;
    console.log("Fetching from SAP:", sapUrl);

    const sapResponse = await axios.get(sapUrl, {
        auth: {
            username: SAP_USERNAME,
            password: SAP_PASSWORD,
        },
        headers: {
            "Accept": "application/json",
        },
        timeout: 30000,
    });

    return sapResponse.data;
}

/**
 * Handle SAP-related errors in a consistent way
 */
function handleSapError(res, err, masterName) {
    console.error(`SAP ${masterName} sync error:`, err.message);

    if (err.response) {
        return res.status(502).json({
            status: false,
            error: `SAP API returned error: ${err.response.status} - ${err.response.statusText}`,
        });
    } else if (err.code === "ECONNREFUSED" || err.code === "ETIMEDOUT") {
        return res.status(502).json({
            status: false,
            error: "Cannot connect to SAP server. Please check the SAP URL and network connectivity.",
        });
    }

    res.status(500).json({
        status: false,
        error: `Error syncing ${masterName} data from SAP`,
        details: err.message,
    });
}

function buildUpsertQuery(table, rows, keyFields) {

    // Deduplicate rows by key fields - keep last occurrence
    const deduped = new Map();
    rows.forEach(r => {
        const key = keyFields.map(k => String(r[k] ?? '')).join('|');
        deduped.set(key, r);
    });
    const uniqueRows = [...deduped.values()];

    const colsSet = new Set();
    uniqueRows.forEach(r => Object.keys(r).forEach(c => colsSet.add(c)));
    const cols = [...colsSet];

    const values = [];
    const rowPlaceholders = uniqueRows.map((r, rowIndex) => {
        const ph = cols.map((c, colIndex) => {
            values.push(r[c] === undefined ? null : r[c]);
            return `$${values.length}`;
        });
        return `(${ph.join(", ")})`;
    });

    const conflictCols = keyFields.map(c => `"${c}"`).join(", ");

    // update clause: update all non-key columns
    const nonKeyCols = cols.filter(c => !keyFields.includes(c));
    const updateClause = nonKeyCols.length
        ? nonKeyCols.map(c => `"${c}" = EXCLUDED."${c}"`).join(", ") + ", updated_at = CURRENT_TIMESTAMP"
        : 'updated_at = CURRENT_TIMESTAMP';

    const columnList2 = cols.map(c => `"${c}"`).join(", ");
    const sql2 = `
    INSERT INTO "${table}" (${columnList2})
    VALUES ${rowPlaceholders.join(", ")}
    ON CONFLICT (${conflictCols})
    DO UPDATE SET ${updateClause}
  `;

    return { sql: sql2, values, cols };
}

exports.broilerMasterInsert = async (req, res) => {
    const { name } = req.params;
    if (!uniqueKeys[name]) {
        return res.status(400).json({ error: "Invalid API call. Unknown master name." });
    }

    const rows = normalizePayload(req.body);
    if (!rows.length) return res.status(400).json({ error: "No valid records found in payload." });

    const keyFields = uniqueKeys[name];

    for (const r of rows) {
        for (const k of keyFields) {
            if (!(k in r)) {
                return res.status(400).json({ error: `Missing key field '${k}' in one or more rows for ${name}` });
            }
        }
    }

    try {
        await pool.query("BEGIN");
        // insert in chunks
        for (let i = 0; i < rows.length; i += MAX_CHUNK) {
            const chunk = rows.slice(i, i + MAX_CHUNK);
            const { sql, values } = buildUpsertQuery(name, chunk, keyFields);
            // execute
            await pool.query(sql, values);
        }
        await pool.query("COMMIT");
        res.json({ message: `${rows.length} records processed for ${name}` });
    } catch (err) {
        try { await pool.query("ROLLBACK"); } catch (_) { }
        console.error("Master sync error:", err.message);
        console.error("Full error:", err);
        res.status(500).json({ error: "Database error while processing", details: err.message });
    }
};


exports.getAllBroilerMaster = async (req, res) => {
    const { name } = req.params;

    // Validate master name
    if (!uniqueKeys[name]) {
        return res.status(400).json({ status: false, error: "Invalid API call. Unknown master name." });
    }

    try {
        const result = await query(`SELECT * FROM ${name} ORDER BY id ASC`);

        if (!result || result.length === 0) {
            return res.status(404).json({ status: false, message: `No records found for ${name}` });
        }

        res.status(200).json({
            status: true,
            message: `${result.length} records fetched from ${name}`,
            data: result
        });
    } catch (error) {
        console.error(`Error fetching data for ${name}:`, error);
        res.status(500).json({
            status: false,
            error: "Database error while fetching records."
        });
    }
};


// ========================================================
// SAP Sync Functions - Mortality Reason
// ========================================================

/**
 * Fetch mortality reason data from SAP API and sync to broiler_mortality_reason table
 */
exports.syncMortalityReason = async (req, res) => {
    try {
        const sapData = await fetchFromSap("/sap/bc/masters/mm_b_reason");
        const rows = normalizeSapResponse(sapData);

        if (!rows.length) {
            return res.status(200).json({
                status: false,
                message: "No records found in SAP response",
            });
        }

        // Map SAP fields to DB columns (mandt, rsCode, rsTxt)
        const mappedRows = rows.map((row) => ({
            mandt: row.mandt || row.MANDT || row.Mandt || SAP_CLIENT || "500",
            rsCode: row.rsCode || row.RSCODE || row.RsCode || row.rs_code || row.RS_CODE || row.reason_code || "",
            rsTxt: row.rsTxt || row.RSTXT || row.RsTxt || row.rs_txt || row.RS_TXT || row.reason_text || row.description || "",
        }));

        // Filter out rows without rsCode
        const validRows = mappedRows.filter((r) => r.rsCode && r.rsCode.toString().trim() !== "");

        if (!validRows.length) {
            return res.status(200).json({
                status: false,
                message: "No valid mortality reason records found in SAP data",
                rawSample: rows.slice(0, 3),
            });
        }

        // Upsert into broiler_mortality_reason table
        await query("BEGIN");

        const SAP_CHUNK = 500;
        let totalProcessed = 0;

        for (let i = 0; i < validRows.length; i += SAP_CHUNK) {
            const chunk = validRows.slice(i, i + SAP_CHUNK);

            const values = [];
            const rowPlaceholders = chunk.map((row) => {
                values.push(row.mandt, row.rsCode, row.rsTxt);
                const base = values.length - 2;
                return `($${base}, $${base + 1}, $${base + 2})`;
            });

            const sql = `
                INSERT INTO "broiler_mortality_reason" ("mandt", "rsCode", "rsTxt")
                VALUES ${rowPlaceholders.join(", ")}
                ON CONFLICT ("mandt", "rsCode")
                DO UPDATE SET "rsTxt" = EXCLUDED."rsTxt", "updated_at" = CURRENT_TIMESTAMP
            `;

            await query(sql, values);
            totalProcessed += chunk.length;
        }

        await query("COMMIT");

        res.status(200).json({
            status: true,
            message: `Successfully synced ${totalProcessed} mortality reason records from SAP`,
            count: totalProcessed,
        });
    } catch (err) {
        try { await query("ROLLBACK"); } catch (_) { }
        handleSapError(res, err, "Mortality Reason");
    }
};

/**
 * Get all mortality reason records from the database
 */
exports.getMortalityReason = async (req, res) => {
    try {
        const result = await query(
            'SELECT * FROM "broiler_mortality_reason" ORDER BY id ASC'
        );

        if (!result || result.length === 0) {
            return res.status(200).json({
                status: true,
                message: "No mortality reason records found",
                data: [],
            });
        }

        res.status(200).json({
            status: true,
            message: `${result.length} mortality reason records fetched`,
            data: result,
        });
    } catch (error) {
        console.error("Error fetching mortality reason:", error);
        res.status(500).json({
            status: false,
            error: "Database error while fetching mortality reason records",
        });
    }
};


// ========================================================
// SAP Sync Functions - Standard Body
// ========================================================

/**
 * Fetch standard body data from SAP API and sync to standard_body_master table
 */
exports.syncStandardBody = async (req, res) => {
    try {
        const sapData = await fetchFromSap("/sap/bc/masters/bro_sbw");
        const rows = normalizeSapResponse(sapData);

        if (!rows.length) {
            return res.status(200).json({
                status: false,
                message: "No records found in SAP response",
            });
        }

        // Map SAP fields to DB columns (mandt, zzAge, zsfiKg, zstdBw)
        const mappedRows = rows.map((row) => ({
            mandt: row.mandt || row.MANDT || row.Mandt || SAP_CLIENT || "500",
            zzAge: row.zzAge || row.ZZAGE || row.ZzAge || row.zz_age || row.age || null,
            zsfiKg: row.zsfiKg || row.ZSFIKG || row.ZsfiKg || row.zsfi_kg || null,
            zstdBw: row.zstdBw || row.ZSTDBW || row.ZstdBw || row.zstd_bw || null,
        }));

        // Filter out rows without zzAge (it's the unique key)
        const validRows = mappedRows.filter((r) => r.zzAge !== null && r.zzAge !== undefined && r.zzAge.toString().trim() !== "");

        if (!validRows.length) {
            return res.status(200).json({
                status: false,
                message: "No valid standard body records found in SAP data",
                rawSample: rows.slice(0, 3),
            });
        }

        // Upsert into standard_body_master table
        await query("BEGIN");

        const SAP_CHUNK = 500;
        let totalProcessed = 0;

        for (let i = 0; i < validRows.length; i += SAP_CHUNK) {
            const chunk = validRows.slice(i, i + SAP_CHUNK);

            const values = [];
            const rowPlaceholders = chunk.map((row) => {
                values.push(row.mandt, row.zzAge, row.zsfiKg, row.zstdBw);
                const base = values.length - 3;
                return `($${base}, $${base + 1}, $${base + 2}, $${base + 3})`;
            });

            const sql = `
                INSERT INTO "standard_body_master" ("mandt", "zzAge", "zsfiKg", "zstdBw")
                VALUES ${rowPlaceholders.join(", ")}
                ON CONFLICT ("mandt", "zzAge")
                DO UPDATE SET "zsfiKg" = EXCLUDED."zsfiKg", "zstdBw" = EXCLUDED."zstdBw", "updated_at" = CURRENT_TIMESTAMP
            `;

            await query(sql, values);
            totalProcessed += chunk.length;
        }

        await query("COMMIT");

        res.status(200).json({
            status: true,
            message: `Successfully synced ${totalProcessed} standard body records from SAP`,
            count: totalProcessed,
        });
    } catch (err) {
        try { await query("ROLLBACK"); } catch (_) { }
        handleSapError(res, err, "Standard Body");
    }
};

/**
 * Get all standard body records from the database
 */
exports.getStandardBody = async (req, res) => {
    try {
        const result = await query(
            'SELECT * FROM "standard_body_master" ORDER BY id ASC'
        );

        if (!result || result.length === 0) {
            return res.status(200).json({
                status: true,
                message: "No standard body records found",
                data: [],
            });
        }

        res.status(200).json({
            status: true,
            message: `${result.length} standard body records fetched`,
            data: result,
        });
    } catch (error) {
        console.error("Error fetching standard body:", error);
        res.status(500).json({
            status: false,
            error: "Database error while fetching standard body records",
        });
    }
};


// ========================================================
// SAP Sync Functions - Earned RC
// ========================================================

/**
 * Fetch earned RC data from SAP API and sync to earned_rc_master table
 */
exports.syncEarnedRc = async (req, res) => {
    try {
        const sapData = await fetchFromSap("/sap/bc/masters/bro_eer");
        const rows = normalizeSapResponse(sapData);

        if (!rows.length) {
            return res.status(200).json({
                status: false,
                message: "No records found in SAP response",
            });
        }

        // Map SAP fields to DB columns (mandt, zerc, znewGc, zsel)
        const mappedRows = rows.map((row) => ({
            mandt: row.mandt || row.MANDT || row.Mandt || SAP_CLIENT || "500",
            zerc: row.zerc || row.ZERC || row.Zerc || row.z_erc || null,
            znewGc: row.znewGc || row.ZNEWGC || row.ZnewGc || row.znew_gc || row.z_new_gc || null,
            zsel: row.zsel || row.ZSEL || row.Zsel || row.z_sel || "",
        }));

        // Filter out rows without zerc (it's the unique key along with mandt)
        const validRows = mappedRows.filter((r) => r.zerc !== null && r.zerc !== undefined && r.zerc.toString().trim() !== "");

        if (!validRows.length) {
            return res.status(200).json({
                status: false,
                message: "No valid earned RC records found in SAP data",
                rawSample: rows.slice(0, 3),
            });
        }

        // Upsert into earned_rc_master table
        await pool.query("BEGIN");

        const SAP_CHUNK = 500;
        let totalProcessed = 0;

        for (let i = 0; i < validRows.length; i += SAP_CHUNK) {
            const chunk = validRows.slice(i, i + SAP_CHUNK);
            const { sql, values } = buildUpsertQuery("earned_rc_master", chunk, ["mandt", "zerc"]);

            await pool.query(sql, values);
            totalProcessed += chunk.length;
        }

        await pool.query("COMMIT");

        res.status(200).json({
            status: true,
            message: `Successfully synced ${totalProcessed} earned RC records from SAP`,
            count: totalProcessed,
        });
    } catch (err) {
        try { await pool.query("ROLLBACK"); } catch (_) { }
        handleSapError(res, err, "Earned RC");
    }
};

/**
 * Get all earned RC records from the database
 */
exports.getEarnedRc = async (req, res) => {
    try {
        const result = await query(
            'SELECT * FROM "earned_rc_master" ORDER BY id ASC'
        );

        if (!result || result.length === 0) {
            return res.status(200).json({
                status: true,
                message: "No earned RC records found",
                data: [],
            });
        }

        res.status(200).json({
            status: true,
            message: `${result.length} earned RC records fetched`,
            data: result,
        });
    } catch (error) {
        console.error("Error fetching earned RC:", error);
        res.status(500).json({
            status: false,
            error: "Database error while fetching earned RC records",
        });
    }
};

/**
 * Fetch earned RC 1 data from SAP API (zbro_cfcr) and sync to earned_rc_master1 table
 */
exports.syncEarnedRc1 = async (req, res) => {
    try {
        const sapData = await fetchFromSap("/sap/bc/masters/zbro_cfcr");
        const rows = normalizeSapResponse(sapData);

        if (!rows.length) {
            return res.status(200).json({
                status: false,
                message: "No records found in SAP response",
            });
        }

        // Map SAP fields to DB columns
        const mappedRows = rows.map((row) => ({
            mandt: row.mandt || row.MANDT || row.Mandt || SAP_CLIENT || "500",
            zerc: row.zerc || row.ZERC || row.Zerc || row.z_erc || null,
            znewGc: row.znewGc || row.ZNEWGC || row.ZnewGc || row.znew_gc || row.z_new_gc || null,
            zsel: row.zsel || row.ZSEL || row.Zsel || row.z_sel || "",
        }));

        const validRows = mappedRows.filter((r) => r.zerc !== null && r.zerc !== undefined && r.zerc.toString().trim() !== "");

        if (!validRows.length) {
            return res.status(200).json({
                status: false,
                message: "No valid earned RC 1 records found in SAP data",
                rawSample: rows.slice(0, 3),
            });
        }

        await pool.query("BEGIN");
        const SAP_CHUNK = 500;
        let totalProcessed = 0;

        for (let i = 0; i < validRows.length; i += SAP_CHUNK) {
            const chunk = validRows.slice(i, i + SAP_CHUNK);
            // Use buildUpsertQuery for deduplication
            const { sql, values } = buildUpsertQuery("earned_rc_master1", chunk, ["mandt", "zerc"]);

            await pool.query(sql, values);
            totalProcessed += chunk.length;
        }

        await pool.query("COMMIT");

        res.status(200).json({
            status: true,
            message: `Successfully synced ${totalProcessed} earned RC 1 records from SAP`,
            count: totalProcessed,
        });
    } catch (err) {
        try { await pool.query("ROLLBACK"); } catch (_) { }
        handleSapError(res, err, "Earned RC 1");
    }
};

/**
 * Get all earned RC 1 records from the database
 */
exports.getEarnedRc1 = async (req, res) => {
    try {
        const result = await query(
            'SELECT * FROM "earned_rc_master1" ORDER BY id ASC'
        );

        if (!result || result.length === 0) {
            return res.status(200).json({
                status: true,
                message: "No earned RC 1 records found",
                data: [],
            });
        }

        res.status(200).json({
            status: true,
            message: `${result.length} earned RC 1 records fetched`,
            data: result,
        });
    } catch (error) {
        console.error("Error fetching earned RC 1:", error);
        res.status(500).json({
            status: false,
            error: "Database error while fetching earned RC 1 records",
        });
    }
};


// ========================================================
// SAP Sync Functions - Earned RC 2 (Plant Level - zbro_cfcr_p)
// ========================================================

/**
 * Fetch earned RC 2 data from SAP API (zbro_cfcr_p) and sync to earned_rc_master2 table
 */
exports.syncEarnedRc2 = async (req, res) => {
    try {
        const sapData = await fetchFromSap("/sap/bc/masters/zbro_cfcr_p");
        const rows = normalizeSapResponse(sapData);

        if (!rows.length) {
            return res.status(200).json({
                status: false,
                message: "No records found in SAP response",
            });
        }

        // Map SAP fields to DB columns (mandt, werks, zerc, znewGc, zsel)
        const mappedRows = rows.map((row) => ({
            mandt: row.mandt || row.MANDT || row.Mandt || SAP_CLIENT || "500",
            werks: row.werks || row.WERKS || row.Werks || row.plant || "",
            zerc: row.zerc || row.ZERC || row.Zerc || row.z_erc || null,
            znewGc: row.znewGc || row.ZNEWGC || row.ZnewGc || row.znew_gc || row.z_new_gc || null,
            zsel: row.zsel || row.ZSEL || row.Zsel || row.z_sel || "",
        }));

        const validRows = mappedRows.filter((r) => r.zerc !== null && r.zerc !== undefined && r.zerc.toString().trim() !== "");

        if (!validRows.length) {
            return res.status(200).json({
                status: false,
                message: "No valid earned RC 2 records found in SAP data",
                rawSample: rows.slice(0, 3),
            });
        }

        await pool.query("BEGIN");
        const SAP_CHUNK = 500;
        let totalProcessed = 0;

        for (let i = 0; i < validRows.length; i += SAP_CHUNK) {
            const chunk = validRows.slice(i, i + SAP_CHUNK);
            const { sql, values } = buildUpsertQuery("earned_rc_master2", chunk, ["mandt", "werks", "zerc"]);

            await pool.query(sql, values);
            totalProcessed += chunk.length;
        }

        await pool.query("COMMIT");

        res.status(200).json({
            status: true,
            message: `Successfully synced ${totalProcessed} earned RC 2 records from SAP`,
            count: totalProcessed,
        });
    } catch (err) {
        try { await pool.query("ROLLBACK"); } catch (_) { }
        handleSapError(res, err, "Earned RC 2");
    }
};

/**
 * Get all earned RC 2 records from the database
 */
exports.getEarnedRc2 = async (req, res) => {
    try {
        const result = await query(
            'SELECT * FROM "earned_rc_master2" ORDER BY id ASC'
        );

        if (!result || result.length === 0) {
            return res.status(200).json({
                status: true,
                message: "No earned RC 2 records found",
                data: [],
            });
        }

        res.status(200).json({
            status: true,
            message: `${result.length} earned RC 2 records fetched`,
            data: result,
        });
    } catch (error) {
        console.error("Error fetching earned RC 2:", error);
        res.status(500).json({
            status: false,
            error: "Database error while fetching earned RC 2 records",
        });
    }
};


// ========================================================
// SAP Sync Functions - Earned RC 3 (Plant Level - zbro_eer_p)
// ========================================================

/**
 * Fetch earned RC 3 data from SAP API (zbro_eer_p) and sync to earned_rc_master3 table
 */
exports.syncEarnedRc3 = async (req, res) => {
    try {
        const sapData = await fetchFromSap("/sap/bc/masters/zbro_eer_p");
        const rows = normalizeSapResponse(sapData);

        if (!rows.length) {
            return res.status(200).json({
                status: false,
                message: "No records found in SAP response",
            });
        }

        // Map SAP fields to DB columns (mandt, werks, zerc, znewGc, zsel)
        const mappedRows = rows.map((row) => ({
            mandt: row.mandt || row.MANDT || row.Mandt || SAP_CLIENT || "500",
            werks: row.werks || row.WERKS || row.Werks || row.plant || "",
            zerc: row.zerc || row.ZERC || row.Zerc || row.z_erc || null,
            znewGc: row.znewGc || row.ZNEWGC || row.ZnewGc || row.znew_gc || row.z_new_gc || null,
            zsel: row.zsel || row.ZSEL || row.Zsel || row.z_sel || "",
        }));

        const validRows = mappedRows.filter((r) => r.zerc !== null && r.zerc !== undefined && r.zerc.toString().trim() !== "");

        if (!validRows.length) {
            return res.status(200).json({
                status: false,
                message: "No valid earned RC 3 records found in SAP data",
                rawSample: rows.slice(0, 3),
            });
        }

        await pool.query("BEGIN");
        const SAP_CHUNK = 500;
        let totalProcessed = 0;

        for (let i = 0; i < validRows.length; i += SAP_CHUNK) {
            const chunk = validRows.slice(i, i + SAP_CHUNK);
            const { sql, values } = buildUpsertQuery("earned_rc_master3", chunk, ["mandt", "werks", "zerc"]);

            await pool.query(sql, values);
            totalProcessed += chunk.length;
        }

        await pool.query("COMMIT");

        res.status(200).json({
            status: true,
            message: `Successfully synced ${totalProcessed} earned RC 3 records from SAP`,
            count: totalProcessed,
        });
    } catch (err) {
        try { await pool.query("ROLLBACK"); } catch (_) { }
        handleSapError(res, err, "Earned RC 3");
    }
};

/**
 * Get all earned RC 3 records from the database
 */
exports.getEarnedRc3 = async (req, res) => {
    try {
        const result = await query(
            'SELECT * FROM "earned_rc_master3" ORDER BY id ASC'
        );

        if (!result || result.length === 0) {
            return res.status(200).json({
                status: true,
                message: "No earned RC 3 records found",
                data: [],
            });
        }

        res.status(200).json({
            status: true,
            message: `${result.length} earned RC 3 records fetched`,
            data: result,
        });
    } catch (error) {
        console.error("Error fetching earned RC 3:", error);
        res.status(500).json({
            status: false,
            error: "Database error while fetching earned RC 3 records",
        });
    }
};


// ========================================================
// SAP Sync Functions - Egg Code List (zbre_egg_code)
// ========================================================

/**
 * Fetch egg code list data from SAP API (zbre_egg_code) and sync to egg_code_list table
 */
exports.syncEggCodeList = async (req, res) => {
    try {
        const sapData = await fetchFromSap("/sap/bc/masters/zbre_egg_code");
        const rows = normalizeSapResponse(sapData);

        if (!rows.length) {
            return res.status(200).json({
                status: false,
                message: "No records found in SAP response",
            });
        }

        // Map SAP fields to DB columns (mandt, matnr, maktx)
        const mappedRows = rows.map((row) => ({
            mandt: row.mandt || row.MANDT || row.Mandt || SAP_CLIENT || "500",
            matnr: row.matnr || row.MATNR || row.Matnr || row.material || "",
            maktx: row.maktx || row.MAKTX || row.Maktx || row.material_text || row.description || "",
        }));

        const validRows = mappedRows.filter((r) => r.matnr && r.matnr.toString().trim() !== "");

        if (!validRows.length) {
            return res.status(200).json({
                status: false,
                message: "No valid egg code records found in SAP data",
                rawSample: rows.slice(0, 3),
            });
        }

        await pool.query("BEGIN");
        const SAP_CHUNK = 500;
        let totalProcessed = 0;

        for (let i = 0; i < validRows.length; i += SAP_CHUNK) {
            const chunk = validRows.slice(i, i + SAP_CHUNK);
            const { sql, values } = buildUpsertQuery("egg_code_list", chunk, ["mandt", "matnr"]);

            await pool.query(sql, values);
            totalProcessed += chunk.length;
        }

        await pool.query("COMMIT");

        res.status(200).json({
            status: true,
            message: `Successfully synced ${totalProcessed} egg code records from SAP`,
            count: totalProcessed,
        });
    } catch (err) {
        try { await pool.query("ROLLBACK"); } catch (_) { }
        handleSapError(res, err, "Egg Code List");
    }
};

/**
 * Get all egg code list records from the database
 */
exports.getEggCodeList = async (req, res) => {
    try {
        const result = await query(
            'SELECT * FROM "egg_code_list" ORDER BY id ASC'
        );

        if (!result || result.length === 0) {
            return res.status(200).json({
                status: true,
                message: "No egg code records found",
                data: [],
            });
        }

        res.status(200).json({
            status: true,
            message: `${result.length} egg code records fetched`,
            data: result,
        });
    } catch (error) {
        console.error("Error fetching egg code list:", error);
        res.status(500).json({
            status: false,
            error: "Database error while fetching egg code records",
        });
    }
};


// ========================================================
// SAP Sync Functions - FCR Grade Master (fcr_grade)
// ========================================================

/**
 * Fetch FCR Grade data from SAP API (fcr_grade) and sync to fcr_grade_master table
 */
exports.syncFcrGrade = async (req, res) => {
    try {
        const sapData = await fetchFromSap("/sap/bc/masters/fcr_grade");
        const rows = normalizeSapResponse(sapData);

        if (!rows.length) {
            return res.status(200).json({
                status: false,
                message: "No records found in SAP response",
            });
        }

        // Map SAP fields to DB columns (mandt, zsel, zerc, zerc1, zgrade)
        const mappedRows = rows.map((row) => ({
            mandt: row.mandt || row.MANDT || row.Mandt || SAP_CLIENT || "500",
            zsel: row.zsel || row.ZSEL || row.Zsel || row.z_sel || "",
            zerc: row.zerc || row.ZERC || row.Zerc || row.z_erc || null,
            zerc1: row.zerc1 || row.ZERC1 || row.Zerc1 || row.z_erc1 || null,
            zgrade: row.zgrade || row.ZGRADE || row.Zgrade || row.z_grade || "",
        }));

        // Filter out rows without zgrade (it's part of the unique key)
        const validRows = mappedRows.filter((r) => r.zgrade && r.zgrade.toString().trim() !== "");

        if (!validRows.length) {
            return res.status(200).json({
                status: false,
                message: "No valid FCR Grade records found in SAP data",
                rawSample: rows.slice(0, 3),
            });
        }

        await pool.query("BEGIN");
        const SAP_CHUNK = 500;
        let totalProcessed = 0;

        for (let i = 0; i < validRows.length; i += SAP_CHUNK) {
            const chunk = validRows.slice(i, i + SAP_CHUNK);
            const { sql, values } = buildUpsertQuery("fcr_grade_master", chunk, ["mandt", "zgrade"]);

            await pool.query(sql, values);
            totalProcessed += chunk.length;
        }

        await pool.query("COMMIT");

        res.status(200).json({
            status: true,
            message: `Successfully synced ${totalProcessed} FCR Grade records from SAP`,
            count: totalProcessed,
        });
    } catch (err) {
        try { await pool.query("ROLLBACK"); } catch (_) { }
        handleSapError(res, err, "FCR Grade");
    }
};

/**
 * Get all FCR Grade records from the database
 */
exports.getFcrGrade = async (req, res) => {
    try {
        const result = await query(
            'SELECT * FROM "fcr_grade_master" ORDER BY id ASC'
        );

        if (!result || result.length === 0) {
            return res.status(200).json({
                status: true,
                message: "No FCR Grade records found",
                data: [],
            });
        }

        res.status(200).json({
            status: true,
            message: `${result.length} FCR Grade records fetched`,
            data: result,
        });
    } catch (error) {
        console.error("Error fetching FCR Grade:", error);
        res.status(500).json({
            status: false,
            error: "Database error while fetching FCR Grade records",
        });
    }
};


// ========================================================
// SAP Sync Functions - FCR Grade Master 1 (zfcr_grade_blk)
// ========================================================

/**
 * Fetch FCR Grade 1 data from SAP API (zfcr_grade_blk) and sync to fcr_grade_master1 table
 */
exports.syncFcrGrade1 = async (req, res) => {
    try {
        const sapData = await fetchFromSap("/sap/bc/masters/zfcr_grade_blk");
        const rows = normalizeSapResponse(sapData);

        if (!rows.length) {
            return res.status(200).json({
                status: false,
                message: "No records found in SAP response",
            });
        }

        // Map SAP fields to DB columns (mandt, zerc)
        const mappedRows = rows.map((row) => ({
            mandt: row.mandt || row.MANDT || row.Mandt || SAP_CLIENT || "500",
            zerc: row.zerc || row.ZERC || row.Zerc || row.z_erc || null,
        }));

        // Filter out rows without zerc (it's part of the unique key)
        const validRows = mappedRows.filter((r) => r.zerc !== null && r.zerc !== undefined && r.zerc.toString().trim() !== "");

        if (!validRows.length) {
            return res.status(200).json({
                status: false,
                message: "No valid FCR Grade 1 records found in SAP data",
                rawSample: rows.slice(0, 3),
            });
        }

        await pool.query("BEGIN");
        const SAP_CHUNK = 500;
        let totalProcessed = 0;

        for (let i = 0; i < validRows.length; i += SAP_CHUNK) {
            const chunk = validRows.slice(i, i + SAP_CHUNK);
            const { sql, values } = buildUpsertQuery("fcr_grade_master1", chunk, ["mandt", "zerc"]);

            await pool.query(sql, values);
            totalProcessed += chunk.length;
        }

        await pool.query("COMMIT");

        res.status(200).json({
            status: true,
            message: `Successfully synced ${totalProcessed} FCR Grade 1 records from SAP`,
            count: totalProcessed,
        });
    } catch (err) {
        try { await pool.query("ROLLBACK"); } catch (_) { }
        handleSapError(res, err, "FCR Grade 1");
    }
};

/**
 * Get all FCR Grade 1 records from the database
 */
exports.getFcrGrade1 = async (req, res) => {
    try {
        const result = await query(
            'SELECT * FROM "fcr_grade_master1" ORDER BY id ASC'
        );

        if (!result || result.length === 0) {
            return res.status(200).json({
                status: true,
                message: "No FCR Grade 1 records found",
                data: [],
            });
        }

        res.status(200).json({
            status: true,
            message: `${result.length} FCR Grade 1 records fetched`,
            data: result,
        });
    } catch (error) {
        console.error("Error fetching FCR Grade 1:", error);
        res.status(500).json({
            status: false,
            error: "Database error while fetching FCR Grade 1 records",
        });
    }
};
