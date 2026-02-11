const { query } = require("../config/db");

exports.getAllRoles = async (req, res) => {
    try {
        const { category } = req.params;
        let sql = "SELECT * FROM user_roles";
        const params = [];

        if (category) {
            sql += " WHERE category = $1";
            params.push(category);
        }

        sql += " ORDER BY created_at DESC;";

        const result = await query(sql, params);

        if (!result || result.length < 1) {
            return res.status(404).json({ status: false, message: "No data found" });
        }

        res.status(200).json({ status: true, data: result });
    } catch (error) {
        console.error("Error while getting roles:", error);
        res.status(500).json({ status: false, message: "Error while getting roles", error });
    }
};


exports.addRole = async (req, res) => {
    const { role_name, status, permissions, category } = req.body;
    console.log(req.body);

    if (!role_name || !status || !permissions || !category) {
        return res.status(400).json({
            status: false,
            message: "Missing required fields: role_name, status, permissions, category"
        });
    }

    try {
        const result = await query(
            "INSERT INTO user_roles (role_name, status, created_at, permissions, category) VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4) RETURNING *;",
            [role_name, status, JSON.stringify(permissions), category]
        );

        res.status(201).json({
            status: true,
            message: "Role added successfully",
            data: result[0]
        });
    } catch (error) {
        console.log("Error while adding role: ", error);
        res.status(500).json({
            status: false,
            message: "Error while adding role",
            error: error
        });
    }
};

exports.updateRole = async (req, res) => {
    const { id } = req.params;
    const { role_name, status, permissions, category } = req.body;

    if (!role_name && !status && !permissions && !category) {
        return res.status(400).json({
            status: false,
            message: "No data to update"
        });
    }

    try {
        const result = await query(
            `UPDATE user_roles SET
                role_name = COALESCE($1, role_name),
                status = COALESCE($2, status),
                permissions = COALESCE($3, permissions),
                category = COALESCE($4, category)
            WHERE id = $5
            RETURNING *;`,
            [role_name, status, JSON.stringify(permissions), category, id]
        );

        if (result.length === 0) {
            return res.status(404).json({
                status: false,
                message: `Role with ID ${id} not found`
            });
        }

        res.status(200).json({
            status: true,
            message: "Role updated successfully",
            data: result[0]
        });
    } catch (error) {
        console.log("Error while updating role: ", error);
        res.status(500).json({
            status: false,
            message: "Error while updating role",
            error: error
        });
    }
};


exports.deleteRole = async (req, res) => {
    const { id } = req.params;

    try {
        const result = await query(
            "DELETE FROM user_roles WHERE id = $1 RETURNING *;",
            [id]
        );

        if (result.length === 0) {
            return res.status(404).json({
                status: false,
                message: `Role with ID ${id} not found`
            });
        }

        res.status(200).json({
            status: true,
            message: "Role deleted successfully",
            data: result[0]
        });
    } catch (error) {
        console.log("Error while deleting role: ", error);
        res.status(500).json({
            status: false,
            message: "Error while deleting role",
            error: error
        });
    }
};

