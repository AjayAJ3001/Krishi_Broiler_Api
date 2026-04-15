const qs = require('qs');
const axios = require('axios');
const { format, parse } = require('date-fns');

const { query } = require("../../config/db");

const broilerDataEntry = require("./sap/broilerDataEntry.json");
const {sapSubmit} = require("./sap/sapSubmitService");


const TABLE_NAME = "chick_receipt"; 


exports.create = async (req, res) => {
    try {
        const data = req.body;

        const response = await sapSubmit(TABLE_NAME, data);
        console.log("controller resposne : ", response )
       

        if(!response.status) {
            return res.status(500).json({
                status: false,
                message: "SAP upload error",
                error: response
            });
        }

        const { plant, farmer, dc_no, batch, chick_house_quantity, remarks } = data;
        const user_id = "test"

         const insertQuery = `
            INSERT INTO broiler.${broilerDataEntry[TABLE_NAME].pgTable} (
            plant, farmer, dc_no, batch, chick_house_quantity, remarks, user_id) 
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *;
        `;

        const values = [
            plant, farmer, dc_no, batch, chick_house_quantity, remarks, user_id
        ]

        const dbResult = await query(insertQuery, values);

        return res.status(201).json({
            status: true,
            message: `Chick Receipt record created successfully`,
            data: dbResult
        });

    } catch (error) {
        console.error("Error creating chick receipt record:", error);
        res.status(500).json({ 
            status: false, 
            message: "Error creating chick receipt record", 
            error: error.message 
        });
    }
};


exports.getPODetails = async (req, res) => {
    try {
        const { client, plant, farmer_supplier } = req.query;

        const sql = `
            SELECT *
            FROM broiler.chick_receipt
            WHERE client = $1
              AND plant = $2
              AND farmer_supplier = $3
              AND batch_no = (
                  SELECT MAX(batch_no)
                  FROM broiler.chick_receipt
                  WHERE client = $1
                    AND plant = $2
                    AND farmer_supplier = $3
              )
            ORDER BY id ASC;
        `;

        const dbResult  = await query(sql, [client, plant, farmer_supplier]);
        if (!dbResult || dbResult.length === 0) {
        return res.status(404).json({
            status: false,
            message: "No data found"
        });
        }

        const dbData = dbResult[0];

        // ✅ Step 2: Call SAP API
        let url = `http://krishidevqas.krishinutrition.com:8001/sap/bc/zdaily_mort?sap-client=500&werks=${plant}&lifnr=${farmer_supplier}`;

        let config = {
        method: "get",
        maxBodyLength: Infinity,
        url: url,
        auth: {
            username: "vega",
            password: "Vega@1234"
        }
        };

        console.log("SAP URL:", url);

        let sapData = {};

        try {
        const response = await axios.request(config);

        console.log(response)

        if (response.status === 200) {
            const dmcDet = response.data?.[0]?.dmcDet?.[0];

            if (dmcDet) {
            sapData = {
                batch: dmcDet.zshedBat,
                age: dmcDet.zzAge,
                stock: dmcDet.zzchkStk,
                housed: dmcDet.zzchkHoused
            };
            } else {
            console.log("No dmcDet found in SAP response");
            }
        }
        } catch (sapError) {
        console.error("SAP Error:", sapError.message);
        // don't fail API if SAP fails
        }

        // ✅ Step 3: Merge DB + SAP data
        const finalData = {
        ...dbData,
        ...sapData
        };

        console.log(finalData)

        // ✅ Final response
        res.status(200).json({
        status: true,
        message: "PO details fetched successfully",
        data: finalData
        });

    } catch (error) {
        console.error("Error while fetching PO details:", error);
        res.status(500).json({ 
            status: false, 
            message: "Error while fetching PO details", 
            error: error.message 
        });
    }
};

exports.getDeliveryPODetails = async (req, res) => {
    try {

        const sql = `
            SELECT *
            FROM broiler.chick_delivery
            ORDER BY id ASC;
        `;

        const result = await query(sql, []);

        res.status(200).json({ 
            status: true, 
            message: "PO details fetched successfully", 
            data: result
        });

    } catch (error) {
        console.error("Error while fetching PO details:", error);
        res.status(500).json({ 
            status: false, 
            message: "Error while fetching PO details", 
            error: error.message 
        });
    }
};

exports.getDCNumbers = async (req, res) => {
    try {

        const {plant} = req.query;

        const sql = `
            SELECT DISTINCT dc_no
            FROM broiler.chick_delivery
            WHERE plant=$1;
        `;

        const result = await query(sql, [plant]);

        console.log(result)

        res.status(200).json({ 
            status: true, 
            message: "DC numbers fetched successfully", 
            data: result
        });

    } catch (error) {
        console.error("Error while fetching DC number details:", error);
        res.status(500).json({ 
            status: false, 
            message: "Error while fetching Dc number details", 
            error: error.message 
        });
    }
};

exports.getPOByDc = async (req, res) => {
    try {
        const { dc } = req.query;

        const sql = `
            SELECT *
            FROM broiler.chick_delivery
            WHERE dc_no = $1
            ORDER BY id ASC;
        `;

        const result = await query(sql, [dc]);

        res.status(200).json({ 
            status: true, 
            message: "PO details fetched by DC successfully", 
            data: result
        });

    } catch (error) {
        console.error("Error while fetching PO details by DC:", error);
        res.status(500).json({ 
            status: false, 
            message: "Error while fetching PO details by DC", 
            error: error.message 
        });
    }
};