const { query } = require("../../config/db"); 
const TABLE_NAME = "issue_medicine"; 

const getInsertUpdateColumns = (body) => {
    const columns = Object.keys(body).filter(key => 
        key !== 'id' && key !== 'created_at' && key !== 'updated_at'
    );
    return columns;
};

exports.create = async (req, res) => {
    try {
        const data = req.body;
        
        const columns = getInsertUpdateColumns(data);
        const values = columns.map(col => data[col]);
        const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
        const columnNames = columns.map(col => `"${col}"`).join(', ');

        const sql = `
            INSERT INTO ${TABLE_NAME} (${columnNames})
            VALUES (${placeholders})
            RETURNING *;
        `;

        const result = await query(sql, values);

        res.status(201).json({ 
            status: true, 
            message: "Medicine issuance record created successfully", 
            data: result[0] 
        });

    } catch (error) {
        console.error("Error creating medicine issuance record:", error);
        res.status(500).json({ 
            status: false, 
            message: "Error creating medicine issuance record", 
            error: error.message 
        });
    }
};

exports.getAll = async (req, res) => {
    try {
        const result = await query(`SELECT * FROM ${TABLE_NAME} ORDER BY created_at DESC`); 

        if (result.length === 0) {
            return res.status(200).json({ status: true, message: "The medicine issuance list is empty", data: [] });
        }

        res.status(200).json({ status: true, data: result });
    } catch (error) {
        console.error("Error fetching medicine issuance records:", error);
        res.status(500).json({ status: false, message: "Error fetching medicine issuance records", error: error.message });
    }
};


exports.getOne = async (req, res) => {
    try {
        const { id } = req.params; 

        const result = await query(`SELECT * FROM ${TABLE_NAME} WHERE id = $1`, [id]);

        if (result.length === 0) {
            return res.status(404).json({ status: false, message: `Medicine issuance record with ID ${id} not found` });
        }

        res.status(200).json({ status: true, data: result[0] });

    } catch (error) {
        console.error("Error fetching single medicine issuance record:", error);
        res.status(500).json({ status: false, message: "Error fetching medicine issuance record", error: error.message });
    }
};

exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;
        
        const columns = getInsertUpdateColumns(data);
        const setClauses = columns.map((col, index) => `"${col}" = $${index + 1}`).join(', ');
        
        const values = columns.map(col => data[col]); 
        // Add the 'id' at the end for the WHERE clause ($${values.length + 1})
        values.push(id); 

        // 2. Build the SQL Query
        // The id placeholder will be the last one in the values array, which is at index values.length
        const sql = `
            UPDATE ${TABLE_NAME}
            SET ${setClauses}, "updated_at" = CURRENT_TIMESTAMP
            WHERE id = $${values.length} 
            RETURNING *; 
        `;
        
        // 3. Execute the Query
        const result = await query(sql, values);

        if (result.length === 0) {
            return res.status(404).json({ status: false, message: `Medicine issuance record with ID ${id} not found for update` });
        }

        res.status(200).json({ 
            status: true, 
            message: "Medicine issuance record updated successfully", 
            data: result[0] 
        });

    } catch (error) {
        console.error("Error updating medicine issuance record:", error);
        res.status(500).json({ 
            status: false, 
            message: "Error updating medicine issuance record", 
            error: error.message 
        });
    }
};


exports.remove = async (req, res) => {
    try {
        const { id } = req.params; // Get ID from URL parameter
        
        // DELETE Query
        const result = await query(`DELETE FROM ${TABLE_NAME} WHERE id = $1 RETURNING id`, [id]);

        if (result.length === 0) {
            return res.status(404).json({ status: false, message: `Medicine issuance record with ID ${id} not found for deletion` });
        }

        res.status(200).json({ status: true, message: `Medicine issuance record with ID ${id} deleted successfully` });

    } catch (error) {
        console.error("Error deleting medicine issuance record:", error);
        res.status(500).json({ status: false, message: "Error deleting medicine issuance record", error: error.message });
    }
};