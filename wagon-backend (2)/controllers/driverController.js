const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { query } = require("../config/db");

const JWT_SECRET = process.env.JWT_SECRET || 'jdf_6bhfn8+_aj&8Pyjhbf';

// ---------------------- REGISTER ----------------------
exports.register = async (req, res) => {
    try {
        const { fullname, username, password, email, mobile, status, role, category, plant_id } = req.body;

        if (!fullname || !username || !password || !mobile || !category) {
            return res.status(400).json({ status: false, message: "All fields including category are required" });
        }

        // Check duplicate by username + mobile + category
        const existingUser = await query(
            "SELECT * FROM driver WHERE (username = $1 OR mobile = $2) AND category = $3",
            [username, mobile, category]
        );

        if (existingUser.length > 0) {
            return res.status(409).json({ status: false, message: "Username or mobile already used in this category" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // If category is Broiler → save plant_id, else NULL
        const finalPlantId = category === "Broiler" ? plant_id || null : null;

        const result = await query(
            `INSERT INTO driver 
                (fullname, username, password, email, mobile, status, role, category, plant_id, created_at, updated_at)
             VALUES 
                ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
             RETURNING id, fullname, username, email, mobile, category, role, plant_id`,
            [
                fullname,
                username,
                hashedPassword,
                email,
                mobile,
                status,
                role,
                category,
                finalPlantId
            ]
        );

        const user = result[0];

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role, category: user.category },
            JWT_SECRET,
            { expiresIn: "1h" }
        );

        res.status(201).json({
            status: true,
            message: "Driver registered successfully",
            user,
            token
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: "Error while registering user", error: error.message });
    }
};



// ---------------------- LOGIN ----------------------
exports.login = async (req, res) => {
    try {
        const { username, password, category } = req.body;

        if (!username || !password || !category) {
            return res.status(400).json({ status: false, message: "Username, password and category are required" });
        }

        const result = await query("SELECT * FROM driver WHERE username = $1 AND category = $2", [username, category]);

        if (result.length === 0) {
            return res.status(401).json({ status: false, message: "Invalid username, category, or password" });
        }

        const user = result[0];

        if (user.status && user.status.toLowerCase() === "inactive") {
            return res.status(403).json({ status: false, message: "You are inactivated by admin" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ status: false, message: "Invalid username or password" });
        }

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
            token
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: "Error during login", error: error.message });
    }
};


// ---------------------- GET ALL ----------------------
exports.getAll = async (req, res) => {
    try {
        const { category } = req.query;

        const baseQuery = `
            SELECT d.*, 
                   p.name AS plant_name
            FROM driver d
            LEFT JOIN plants p ON d.plant_id = p.plant_id
        `;

        let result;

        if (category) {
            result = await query(
                `${baseQuery} WHERE d.category = $1 ORDER BY d.created_at DESC`,
                [category]
            );
        } else {
            result = await query(
                `${baseQuery} ORDER BY d.created_at DESC`
            );
        }

        res.status(200).json({ status: true, data: result });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            status: false,
            message: "Error fetching driver data",
            error: error.message
        });
    }
};



// ---------------------- GET BY ID ----------------------
exports.getById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await query("SELECT * FROM driver WHERE id = $1", [id]);

        if (result.length === 0) {
            return res.status(404).json({ status: false, message: "Driver not found" });
        }

        res.status(200).json({ status: true, data: result[0] });
    } catch (error) {
        res.status(500).json({ status: false, message: "Error fetching driver by ID", error: error.message });
    }
};


exports.getById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await query("select * from driver where id=$1", [id]);
        if (result.length === 0) {
            return res.status(401).json({ status: false, message: "Invalid username or password" });
        }

        const user = result[0];

        res.status(200).json({ status: true, data: user });
    } catch (error) {
        res.status(500).json({ status: false, message: "Error at fetching driver data", error: error });
    }
}

exports.udpateDriver = async (req, res) => {
    try {
        const { id } = req.params;
        const { fullname, username, email, password, status, mobile, role, category, plant_id } = req.body;

        const driverResult = await query("SELECT * FROM driver WHERE id = $1", [id]);

        if (driverResult.length === 0) {
            return res.status(401).json({ status: false, message: "Driver not found!" });
        }

        const existingDriver = driverResult[0];

        const existingUser = await query(
            "SELECT * FROM driver WHERE (username = $1 OR mobile = $2) AND id != $3",
            [username, mobile, id]
        );

        if (existingUser.length > 0) {
            return res.status(409).json({ status: false, message: "Username or mobile already in use" });
        }

        // Use old values if missing
        const newFullname = fullname || existingDriver.fullname;
        const newUsername = username || existingDriver.username;
        const newEmail = email || existingDriver.email;
        const newStatus = status || existingDriver.status;
        const newCategory = category || existingDriver.category;

        // Plant ID logic
        const finalPlantId =
            newCategory === "Broiler"
                ? (plant_id || existingDriver.plant_id || null)
                : null;

        let updatedDriver;

        if (!password || password === "*******") {
            updatedDriver = await query(
                `UPDATE driver 
                 SET username = $1, email = $2, status = $3, fullname = $4, mobile = $5, role = $6, category = $7, plant_id = $8
                 WHERE id = $9
                 RETURNING *`,
                [
                    newUsername,
                    newEmail,
                    newStatus,
                    newFullname,
                    mobile,
                    role,
                    newCategory,
                    finalPlantId,
                    id
                ]
            );
        } else {
            const hashed = await bcrypt.hash(password, 10);

            updatedDriver = await query(
                `UPDATE driver 
                 SET username = $1, email = $2, password = $3, status = $4, fullname = $5, mobile = $6, role = $7, category = $8, plant_id = $9
                 WHERE id = $10
                 RETURNING *`,
                [
                    newUsername,
                    newEmail,
                    hashed,
                    newStatus,
                    newFullname,
                    mobile,
                    role,
                    newCategory,
                    finalPlantId,
                    id
                ]
            );
        }

        res.status(200).json({
            status: true,
            message: "Driver profile updated successfully",
            data: updatedDriver[0]
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            status: false,
            message: "Error occurred while updating the driver data",
            error: error.message
        });
    }
};





exports.deleteDriver = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ status: false, message: "Driver ID is required" });
        }

        const check = await query("SELECT * FROM Driver WHERE id = $1", [id]);
        if (check.length === 0) {
            return res.status(404).json({ status: false, message: "Driver not found" });
        }

        await query("DELETE FROM Driver WHERE id = $1", [id]);

        res.status(200).json({ status: true, message: "Driver deleted successfully" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: "Error occurs while deleting the driver data", error: error.message });
    }
};
