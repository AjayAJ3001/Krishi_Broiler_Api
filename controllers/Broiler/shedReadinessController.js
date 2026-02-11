const { query } = require("../../config/db");

const getInsertUpdateColumns = (body) => {
    const columns = Object.keys(body).filter(key => 
        key !== 'id' && key !== 'created_at' && key !== 'updated_at'
    );
    return columns;
};

exports.create = async (req, res) => {
    try {
        const data = req.body;

        console.log(data)
        
        const columns = getInsertUpdateColumns(data);
        const values = columns.map(col => data[col]);
        const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
        const columnNames = columns.map(col => `"${col}"`).join(', ');

        const sql = `
            INSERT INTO shed_readiness (${columnNames})
            VALUES (${placeholders})
            RETURNING *;
        `;

        const result = await query(sql, values);

        res.status(201).json({ 
            status: true, 
            message: "Shed readiness record created successfully", 
            data: result[0] 
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

exports.getAll = async (req, res) => {
    try {
        const result = await query("SELECT * FROM shed_readiness ORDER BY date DESC, created_at DESC"); 

        if (result.length === 0) {
            // Return 200 with an empty array if nothing is found (successful, but empty)
            return res.status(200).json({ status: true, message: "The shed readiness list is empty", data: [] });
        }

        res.status(200).json({ status: true, data: result });
    } catch (error) {
        console.error("Error fetching shed readiness records:", error);
        res.status(500).json({ status: false, message: "Error fetching shed readiness records", error: error.message });
    }
};

exports.getOne = async (req, res) => {
    try {
        const { id } = req.params; // Get ID from URL parameter

        const result = await query('SELECT * FROM shed_readiness WHERE id = $1', [id]);

        if (result.length === 0) {
            return res.status(404).json({ status: false, message: `Shed readiness record with ID ${id} not found` });
        }

        res.status(200).json({ status: true, data: result[0] });

    } catch (error) {
        console.error("Error fetching single shed readiness record:", error);
        res.status(500).json({ status: false, message: "Error fetching shed readiness record", error: error.message });
    }
};

exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;
        
        // 1. Prepare SET clauses and Values
        const columns = getInsertUpdateColumns(data);
        const setClauses = columns.map((col, index) => `"${col}" = $${index + 1}`).join(', ');
        
        // Values for SET clauses, plus the 'id' at the end for the WHERE clause
        const values = columns.map(col => data[col]); 
        values.push(id); 

        // 2. Build the SQL Query
        const sql = `
            UPDATE shed_readiness
            SET ${setClauses}, "updated_at" = CURRENT_TIMESTAMP
            WHERE id = $${values.length} 
            RETURNING *; 
        `;
        
        // 3. Execute the Query
        const result = await query(sql, values);

        if (result.length === 0) {
            return res.status(404).json({ status: false, message: `Shed readiness record with ID ${id} not found for update` });
        }

        res.status(200).json({ 
            status: true, 
            message: "Shed readiness record updated successfully", 
            data: result[0] 
        });

    } catch (error) {
        console.error("Error updating shed readiness record:", error);
        res.status(500).json({ 
            status: false, 
            message: "Error updating shed readiness record", 
            error: error.message 
        });
    }
};

exports.remove = async (req, res) => {
    try {
        const { id } = req.params; // Get ID from URL parameter
        
        // DELETE Query
        const result = await query('DELETE FROM shed_readiness WHERE id = $1 RETURNING id', [id]);

        if (result.length === 0) {
            return res.status(404).json({ status: false, message: `Shed readiness record with ID ${id} not found for deletion` });
        }

        res.status(200).json({ status: true, message: `Shed readiness record with ID ${id} deleted successfully` });

    } catch (error) {
        console.error("Error deleting shed readiness record:", error);
        res.status(500).json({ status: false, message: "Error deleting shed readiness record", error: error.message });
    }
};