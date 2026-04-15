const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { query } = require("../config/db");

const JWT_SECRET = process.env.JWT_SECRET || 'jdf_6bhfn8+_aj&8Pyjhbf';

exports.register = async (req, res) => {
    try {
        const { first_name, last_name, username, password, email, role, category, status } = req.body;

        if (!first_name || !last_name || !username || !password || !email) {
            return res.status(400).json({ status: false, message: "All fields are required" });
        }
        if (!category || !role) return res.status(400).json({ status: false, message: "Please select role & category" });

        const existingUser = await query(
            `SELECT * FROM Admin WHERE (username = $1 OR email = $2) AND category = $3`,
            [username, email, category]
        );

        if (existingUser.length > 0) {
            return res.status(409).json({
                status: false,
                message: `Username or email already in use in ${category} category`
            });
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const result = await query(
            `INSERT INTO Admin (first_name, last_name, username, password, email, role, category, status, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7,$8, NOW(), NOW())
             RETURNING id, first_name, last_name, username, email, role, category, status`,
            [first_name, last_name, username, hashedPassword, email, role, category, status]
        );

        const user = result[0];

        const token = jwt.sign(
            { id: user.id, username: user.username, role: role, category: category },
            JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.status(201).json({
            status: true,
            message: "Admin registered successfully",
            user,
            token
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: "Error while registering a admin", error: error.message });
    }
};


exports.login = async (req, res) => {
    try {
        const { username, password, category } = req.body;

        if (!username || !password || !category) {
            return res.status(400).json({
                status: false,
                message: "Username, password, and category are required"
            });
        }

        // ✅ Category-based user lookup
        const result = await query(
            "SELECT * FROM Admin WHERE username = $1 AND category = $2",
            [username, category]
        );

        console.log(result)

        if (result.length === 0) {
            return res.status(401).json({
                status: false,
                message: `Invalid credentials for category: ${category}`
            });
        }

        const user = result[0];

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ status: false, message: "Invalid username or password" });
        }

        if (!user.status) {
            return res.status(403).json({ status: false, message: "Inactive user. Contact admin" });
        }

        // 🔹 Fetch role permissions
        const rolePermissionsResult = await query(
            "SELECT permissions FROM public.user_roles WHERE role_name = $1 AND category = $2",
            [user.role, user.category]
        );

        if (rolePermissionsResult.length === 0) {
            return res.status(404).json({ status: false, message: "Role not found" });
        }

        const permissions = rolePermissionsResult[0].permissions;

        // 🔹 Update last login timestamp
        await query("UPDATE public.admin SET last_login = CURRENT_TIMESTAMP WHERE id = $1", [user.id]);

        // 🔹 Fetch location_id (if exists)
        const locationResult = await query(
            "SELECT id FROM public.source_location WHERE admin_id = $1 LIMIT 1",
            [user.id]
        );

        const location_id = locationResult.length > 0 ? locationResult[0].id : null;

        user.location_id = location_id;

        // 🔹 JWT now includes category for verification in protected routes
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role, category: user.category },
            JWT_SECRET,
            { expiresIn: "1h" }
        );

        delete user.password;

        res.status(200).json({
            status: true,
            message: "Login successful",
            user,
            permissions,
            token
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            status: false,
            message: "Error during login",
            error: error.message
        });
    }
};


exports.getAll = async (req, res) => {
    try {
        const { category } = req.params;
        let queryText, queryParams = [];

        if (category) {
            queryText = "SELECT * FROM public.admin WHERE category = $1 ORDER BY created_at DESC;";
            queryParams = [category];
        }
        else {
            queryText = "SELECT * FROM public.admin ORDER BY created_at DESC;";
        }

        const result = await query(queryText, queryParams);

        if (result.length === 0)
            return res.status(404).json({ status: false, message: category ? `No admins found for category: ${category}` : "No admins found" });

        res.status(200).json({ status: true, category: category || "all", count: result.length, data: result });

    }
    catch (error) {
        console.error("Error fetching admins:", error);
        res.status(500).json({ status: false, message: "Error while fetching admins", error: error.message });
    }
};



exports.getAvailableAdmin = async (req, res) => {
    try {
        // Fetch all admins
        const admins = await query(
            "SELECT * FROM public.admin WHERE category = $1 ORDER BY created_at DESC;",
            ['Wagon']
        );


        if (admins.length === 0) {
            return res.status(404).json({ status: false, message: "No admins found" });
        }

        // Fetch all admin_ids from source_location
        const usedAdmins = await query(`
            SELECT admin_id 
            FROM source_location
            WHERE admin_id IS NOT NULL;
        `);

        const usedAdminIds = new Set(usedAdmins.map(a => a.admin_id));

        // Append isAvail flag
        const result = admins.map(admin => ({
            ...admin,
            isAvail: !usedAdminIds.has(admin.id)
        }));

        res.status(200).json({ status: true, data: result });
    } catch (error) {
        console.log(error);
        res.status(500).json({ status: false, message: "Error while fetching admins", error: error.message });
    }
};



exports.updateAdmin = async (req, res) => {
    try {
        const { first_name, last_name, username, password, email, role, status, category } = req.body;
        const { id } = req.params;

        console.log(req.body)

        if (!id) {
            return res.status(400).json({ status: false, message: "Admin ID is required" });
        }

        // ✅ Fetch existing record to compare
        const existingAdmin = await query("SELECT * FROM public.admin WHERE id = $1", [id]);
        if (existingAdmin.length === 0) {
            return res.status(404).json({ status: false, message: "Admin not found" });
        }

        const admin = existingAdmin[0];

        // ✅ Check for duplicate username or email within same category
        if (username) {
            const userCheck = await query(
                "SELECT * FROM public.admin WHERE username = $1 AND category = $2 AND id != $3",
                [username, admin.category, id]
            );
            if (userCheck.length > 0) {
                return res.status(409).json({ status: false, message: "Username already in use in this category" });
            }
        }

        if (email) {
            const emailCheck = await query(
                "SELECT * FROM public.admin WHERE email = $1 AND category = $2 AND id != $3",
                [email, admin.category, id]
            );
            if (emailCheck.length > 0) {
                return res.status(409).json({ status: false, message: "Email already in use in this category" });
            }
        }

        // ✅ Hash password only if provided
        let hashedPassword = admin.password;
        if (password) {
            const saltRounds = 10;
            hashedPassword = await bcrypt.hash(password, saltRounds);
        }

        // ✅ Use COALESCE to update only if new values are provided
        const sql = `
            UPDATE public.admin
            SET
                first_name = COALESCE($1, first_name),
                last_name  = COALESCE($2, last_name),
                username   = COALESCE($3, username),
                password   = COALESCE($4, password),
                email      = COALESCE($5, email),
                role       = COALESCE($6, role),
                category   = COALESCE($7, category),
                status     = COALESCE($8, status),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $9
            RETURNING id, first_name, last_name, username, email, role, category, status, updated_at;
        `;

        const values = [
            first_name || null,
            last_name || null,
            username || null,
            hashedPassword || null,
            email || null,
            role || null,
            category || null,
            status !== undefined ? status : null,
            id
        ];

        const result = await query(sql, values);

        if (result.length === 0) {
            return res.status(404).json({ status: false, message: "Admin not found" });
        }

        const updatedAdmin = result[0];
        res.status(200).json({
            status: true,
            message: "Admin updated successfully",
            data: updatedAdmin
        });

    } catch (error) {
        console.error("Error in updateAdmin:", error);
        res.status(500).json({
            status: false,
            message: "Error while updating admin",
            error: error.message
        });
    }
};










// New function for Loading Status
exports.getLoadingStatus = async (req, res) => {
    try {
        // Query to get SAP Code, Number of Loads, and Total Quantity
        const result = await query(`
            SELECT
                sa.sap_code,
                COUNT(dc.id) AS no_of_load,
                SUM(
                    COALESCE(
                        (SELECT SUM((material_item->>'quantity')::numeric)
                         FROM jsonb_array_elements(dc.materials) AS material_item), 0
                    )
                ) AS total_qty
            FROM
                delivery_challan dc
            JOIN
                shipping_address sa ON dc.ship_to__id = sa.id
            GROUP BY
                sa.sap_code
            ORDER BY
                sa.sap_code;
        `);

        if (result.length === 0) {
            return res.status(200).json({ status: true, message: "No loading status data found", data: [] });
        }

        res.status(200).json({ status: true, data: result });

    } catch (error) {
        console.error('Error fetching loading status:', error);
        res.status(500).json({ status: false, message: "Error while fetching loading status", error: error.message });
    }
};

exports.getDashboardSummary = async (req, res) => {
    try {
        const result = await query(`
            SELECT
                (SELECT COUNT(id) FROM po) AS "totalMasters",
                (SELECT COUNT(id) FROM po) AS "totalPoCount",
                (
                    SELECT COALESCE(SUM((material_item->>'quantity')::numeric), 0)
                    FROM po, jsonb_array_elements(materials) AS material_item
                ) AS "totalMaterialValue",
                (SELECT COUNT(id) FROM delivery_challan WHERE status = 1 OR status = 2) AS "inProgressCount",
                (SELECT COUNT(id) FROM delivery_challan WHERE status = 3) AS "finishedCount"
        `);

        const summaryData = result[0];

        res.status(200).json({
            status: true,
            data: summaryData
        });

    } catch (error) {
        console.error('Error fetching dashboard summary:', error);
        res.status(500).json({ status: false, message: "Error while fetching dashboard summary", error: error.message });
    }
};

exports.getMonthlyPoSummary = async (req, res) => {
    try {
        const result = await query(`
            WITH monthly_po AS (
                SELECT
                    TO_CHAR(p.created_at, 'Mon') AS month,
                    EXTRACT(MONTH FROM p.created_at) AS month_num,
                    COALESCE(SUM((material_item->>'quantity')::numeric), 0) AS master_value,
                    COUNT(p.id) AS po_count
                FROM
                    po p,
                    jsonb_array_elements(p.materials) AS material_item
                WHERE
                    EXTRACT(YEAR FROM p.created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
                GROUP BY
                    month, month_num
            ), monthly_dc AS (
                SELECT
                    TO_CHAR(dc.created_at, 'Mon') AS month,
                    EXTRACT(MONTH FROM dc.created_at) AS month_num,
                    COALESCE(SUM((material_item_dc->>'quantity')::numeric), 0) AS total_value
                FROM
                    delivery_challan dc,
                    jsonb_array_elements(dc.materials) AS material_item_dc
                WHERE
                    EXTRACT(YEAR FROM dc.created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
                GROUP BY
                    month, month_num
            ), all_months AS (
                SELECT generate_series(1, 12) AS month_num
            )
            SELECT
                TO_CHAR(MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::int, am.month_num::int, 1), 'Mon') AS month,
                am.month_num,
                COALESCE(mp.master_value, 0) AS "masterValue",
                COALESCE(mdc.total_value, 0) AS "totalValue",
                COALESCE(mp.po_count, 0) AS "poCount"
            FROM
                all_months am
            LEFT JOIN
                monthly_po mp ON am.month_num = mp.month_num
            LEFT JOIN
                monthly_dc mdc ON am.month_num = mdc.month_num
            ORDER BY
                am.month_num;
        `);

        res.status(200).json({
            status: true,
            data: result
        });

    } catch (error) {
        console.error('Error fetching monthly PO summary:', error);
        res.status(500).json({ status: false, message: "Error while fetching monthly PO summary", error: error.message });
    }
};

exports.getProjectStatusSummary = async (req, res) => {
    try {
        const result = await query(`
            SELECT
                COUNT(CASE WHEN status = 1 THEN 1 END) AS "inProgress",
                COUNT(CASE WHEN status = 3 THEN 1 END) AS "finished",
                COUNT(CASE WHEN status = 2 THEN 1 END) AS "unfinished"
            FROM
                delivery_challan;
        `);

        const projectStatusData = result[0];

        res.status(200).json({
            status: true,
            data: projectStatusData
        });

    } catch (error) {
        console.error('Error fetching project status summary:', error);
        res.status(500).json({ status: false, message: "Error while fetching project status summary", error: error.message });
    }
};


exports.getTruckStatusSummary = async (req, res) => {
    try {
        const { from, to } = req.query;

        let dateFilter = '';
        if (from && to) {
            dateFilter = `WHERE DATE(p.created_at) BETWEEN '${from}' AND '${to}'`;
        }

        const result2 = await query(`
            SELECT
                p.rr_no,
                p.po_no,
                s.name AS supplier_name,
                (
                    SELECT STRING_AGG(material_item->>'name', ', ')
                    FROM jsonb_array_elements(p.materials::jsonb) AS material_item
                ) AS material_names,
                CASE 
                    WHEN EXISTS (
                        SELECT 1 FROM delivery_challan dc WHERE dc.rr_no = p.rr_no
                    )
                    THEN 
                        CASE 
                            WHEN (
                                SELECT COUNT(*) 
                                FROM jsonb_array_elements(p.materials::jsonb) AS item 
                                WHERE (item->>'qty')::int > 0
                            ) = 0
                            THEN 'completed'
                            ELSE 'pending'
                        END
                    ELSE 'pending'
                END AS status,
                CASE 
                    WHEN EXISTS (
                        SELECT 1 FROM delivery_challan dc WHERE dc.rr_no = p.rr_no
                    )
                    THEN true ELSE false
                END AS arrived,
                true AS loaded
            FROM po p
            JOIN supplier s ON p.supplier__id = s.id
            ${dateFilter}
            ORDER BY p.created_at DESC;
        `);

        const result = await query(`
    SELECT
        p.rr_no,
        p.po_no,
        s.name AS supplier_name,

        (
            SELECT STRING_AGG(material_item->>'name', ', ')
            FROM jsonb_array_elements(p.materials::jsonb) AS material_item
        ) AS material_names,

        -- TOTAL DC CREATED (LOADED)
        (
            SELECT COUNT(*)
            FROM delivery_challan dc
            WHERE dc.rr_no = p.rr_no
        ) AS loaded,

        -- ARRIVED COUNT
        (
            SELECT COUNT(*)
            FROM delivery_challan dc
            WHERE dc.rr_no = p.rr_no
              AND dc.is_arrived = true
        ) AS arrived,

        -- PENDING = LOADED - ARRIVED
        (
            SELECT COUNT(*)
            FROM delivery_challan dc
            WHERE dc.rr_no = p.rr_no
              AND dc.is_arrived = false
        ) AS pending

    FROM po p
    JOIN supplier s ON p.supplier__id = s.id
    ${dateFilter}
    ORDER BY p.created_at DESC;
`);


        if (!result || result.length === 0) {
            return res.status(200).json({
                status: true,
                message: "No truck status data found",
                data: []
            });
        }

        return res.status(200).json({
            status: true,
            data: result
        });

    } catch (error) {
        console.error('Error fetching truck status summary:', error);
        return res.status(500).json({
            status: false,
            message: "Error while fetching truck status summary",
            error: error.message
        });
    }
};


exports.getAdminSummary = async (req, res) => {
    try {
        const { from, to } = req.query;
        const dateFilter = from && to ? `WHERE DATE(created_at) BETWEEN '${from}' AND '${to}'` : "";

        const summaryQuery = `
            SELECT
                (SELECT COUNT(*) FROM po ${dateFilter}) AS total_pos,
                (SELECT COUNT(*) FROM delivery_challan ${dateFilter}) AS total_delivery_challans,
                (SELECT COUNT(*) FROM delivery_challan ${dateFilter ? `${dateFilter} AND status != 1` : 'WHERE status != 1'}) AS pending_delivery_challans,
                (SELECT COUNT(*) FROM supplier) AS total_suppliers,
                (SELECT COUNT(*) FROM material WHERE status = 1) AS active_materials,
                (
                    SELECT COUNT(DISTINCT truck_no)
                    FROM delivery_challan
                    ${dateFilter}
                ) AS trucks_used_today
        `;

        // Line Chart: Daily Challan Counts
        let challansOverTimeQuery = `
            SELECT TO_CHAR(created_at, 'YYYY-MM-DD') AS date, COUNT(*) AS count
            FROM delivery_challan
        `;
        if (from && to) {
            challansOverTimeQuery += ` WHERE DATE(created_at) BETWEEN '${from}' AND '${to}'`;
        }
        challansOverTimeQuery += ` GROUP BY date ORDER BY date ASC`;

        // Bar Chart: Challan Count by RR No
        let challansPerRRQuery = `
            SELECT rr_no, COUNT(*) AS count
            FROM delivery_challan
        `;
        if (from && to) {
            challansPerRRQuery += ` WHERE DATE(created_at) BETWEEN '${from}' AND '${to}'`;
        } else {
            challansPerRRQuery += ` WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'`;
        }
        challansPerRRQuery += ` GROUP BY rr_no ORDER BY count DESC LIMIT 5`;

        const [summary] = await query(summaryQuery);
        const challansOverTime = await query(challansOverTimeQuery);
        const challansPerRR = await query(challansPerRRQuery);

        return res.status(200).json({
            status: true,
            message: "Admin summary with chart data fetched successfully.",
            data: {
                summary,
                charts: {
                    challansOverTime,
                    challansPerRR
                }
            }
        });

    } catch (error) {
        console.error("Error while fetching admin summary: ", error);
        res.status(500).json({
            status: false,
            message: "Error while fetching admin dashboard summary",
            error: error.message
        });
    }
};
