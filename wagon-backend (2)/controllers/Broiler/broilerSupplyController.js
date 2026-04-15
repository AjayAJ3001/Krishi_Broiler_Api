const puppeteer = require('puppeteer');
const ejs = require('ejs');
const path = require('path');
const fs = require('fs');
const qs = require('qs');
const { format, parse } = require('date-fns');
const axios = require('axios');

const { query } = require("../../config/db"); 
const broilerDataEntry = require("./sap/broilerDataEntry.json");


const TABLE_NAME = "bill_of_supply"; 

const formatBillOfSupplyDataToSap = (data) => {
  const { load_details = [] } = data;

  const config = broilerDataEntry.bill_of_supply;

  return load_details.map((materialItem) => {
    const combined = {
      ...data,
      ...materialItem,
    };

    const mappedRow = {};

    config.fields.forEach(({ sap, body_key }) => {
      if (combined[body_key] !== undefined) {
        mappedRow[sap] = combined[body_key];
      } else {
        console.warn(`Missing field: ${body_key}`);
      }
    });

    return mappedRow;
  });
};

const generateBillOfSupplyDC = async (data) => {
    try {
        const { 
                date, customer_type, dc_no, customer, sales_type, 
                transport_by, vehicle_no, order_by, dispatch_by, 
                plant, farmer, line_no, farm_shed_no, batch, age, 
                bird_stock, excess, shortage, load_details, driver_name, 
                driver_mobile, rate, average_weight, gross_value, bill_value
        } = data;
        const birds_details = [];
        const user_id = "test";
        const countRes = await query(`SELECT COUNT(*) FROM broiler.${broilerDataEntry[TABLE_NAME].pgTable}`);
        const count = parseInt(countRes?.[0]?.count || 0);
        const doc_no = `BOS/DC/${count + 11001}`;

        // console.log(date)
        const parsedDate = new Date(date);
        const formattedDate = format(parsedDate, 'yyyy-MM-dd');

        const templateData = {
            ...data, 
            date: formattedDate, 
            rate: Number(rate) || 0,
            average_weight: Number(average_weight) || 0,
            gross_value: Number(gross_value) || 0,
            bill_value: Number(bill_value) || 0,
            user_id, 
            doc_no,
            driver_name,
            supervisor_name: "-",
            weight_scale_no: '-',
            driver_mobile,
            start_time: "-",
            end_time: "-"
        };

        // 2. Render HTML using EJS
        const templatePath = path.join(process.cwd(), 'templates', 'broiler', 'bos_dc.ejs');
        const htmlContent = await ejs.renderFile(templatePath, templateData);

        // 3. Setup File Path & Directories
        const reportsDir = path.join(process.cwd(), 'uploads', 'broiler', 'bill_of_supply');
        if (!fs.existsSync(reportsDir)) {
            fs.mkdirSync(reportsDir, { recursive: true });
        }

        const fileName = `DC_${doc_no.replace(/\//g, '-')}_${Date.now()}.pdf`;
        const filePath = path.join(reportsDir, fileName);
        // SERVER_URL should be in your .env (e.g., http://localhost:8001)
        const publicUrl = `${process.env.SERVER_URL}/uploads/broiler/bill_of_supply/${fileName}`;

        // 4. Puppeteer PDF Generation
        const browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

        await page.pdf({
            path: filePath, // Saves to disk
            format: 'A4',
            printBackground: true,
            margin: { top: '30px', bottom: '30px', left: '30px', right: '30px' },
        });
        await browser.close();

        // 5. Save to Database
        const insertQuery = `
            INSERT INTO broiler.${broilerDataEntry[TABLE_NAME].pgTable}
            (
                date, customer_type, dc_no, customer, sales_type, transport_by,
                vehicle_no, order_by, dispatch_by, plant, farmer, line_no,
                farm_shed_no, batch, age, bird_stock, excess, shortage,
                load_details, birds_details, rate, average_weight, gross_value,
                bill_value, user_id, pdf_link
            )
            VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9,
                $10, $11, $12, $13, $14, $15, $16,
                $17, $18, $19, $20, $21, $22, $23,
                $24, $25, $26
            )
        `;

        const values = [ formattedDate, customer_type, dc_no, customer, sales_type, transport_by,
                vehicle_no, order_by, dispatch_by, plant, farmer, line_no,
                farm_shed_no, batch, age, bird_stock, Number(excess) || 0, Number(shortage) || 0,
                JSON.stringify(load_details), JSON.stringify(birds_details), rate, average_weight, gross_value,
                bill_value, user_id, publicUrl
        ];

        const dbResult = await query(insertQuery, values);

        // 6. Response
        return {
            status: true,
            message: 'Bill of Supply DC generated and saved!',
            dc_no: doc_no,
            pdfLink: publicUrl,
            data: dbResult
        };

    } catch (error) {
        console.error('Bill of Supply DC Error:', error);
        return {
            status: false,
            message: 'Failed to generate Bill of Supply DC.',
            error: error.message
        };
    }
};


exports.create = async (req, res) => {
    try {
        const data = req.body;
        
        const sapDataRows = formatBillOfSupplyDataToSap(data);

        let uploadCount = 0;
        if(sapDataRows?.length>0) {
            const requests = sapDataRows.map((row)=> {
                const qsString = qs.stringify(
                            { "sap-client": "500", ...row },
                            { encode: true }
                        );
                
                        const finalUrl = `${process.env.BROILER_SAP_BASE_URL}${broilerDataEntry[TABLE_NAME].sapEndpoint}?${qsString}`;
                
                        console.log("final url : ", finalUrl);
                
                        let config = {
                            method: 'post',
                            maxBodyLength: Infinity,
                            url: finalUrl,
                            auth: {
                                username: process.env.BROILER_SAP_USERNAME,
                                password: process.env.BROILER_SAP_PASSWORD
                            }
                        };
                
                        return axios.request(config);
            })
            const responses = await Promise.allSettled(requests);

            const failed = responses.find(r => r.status === 'rejected');

            if (failed) {
            console.log("SAP ERROR:", failed.reason?.response?.data);

            return res.status(500).json({
                status: false,
                message: "SAP upload error",
                error: failed.reason?.response?.data || failed.reason.message
            });
            }

            responses.forEach((response)=>{
                // console.log("Sap Respsone : ", response);
                // console.log(response.status)
                console.log("Background SAP Response: ", response.data)
                // console.log(response.value.statusText)
                uploadCount++;
            })

            console.log("Sap uploads : ", uploadCount)
        }

        const dcReport = await generateBillOfSupplyDC(data)

        if(dcReport.status) {
            return res.status(201).json({
                status: true,
                message: "Bill of supply record created successfully",
                data: dcReport
            });
        }

        return res.status(500).json(dcReport);

    } catch (error) {
        console.error("Error creating Broiler supply bill record:", error);
        res.status(500).json({ 
            status: false, 
            message: "Error creating Broiler supply bill record", 
            error: error.message 
        });
    }
};

exports.getAll = async (req, res) => {
    try {
        const result = await query(`SELECT * FROM broiler.${broilerDataEntry[TABLE_NAME].pgTable} ORDER BY created_at DESC`); 

        if (result.length === 0) {
            return res.status(200).json({ status: true, message: "The Broiler supply list is empty", data: [] });
        }

        res.status(200).json({ status: true, data: result });
    } catch (error) {
        console.error("Error fetching Broiler supply records:", error);
        res.status(500).json({ status: false, message: "Error fetching Broiler supply records", error: error.message });
    }
};

exports.getOne = async (req, res) => {
    try {
        const { id } = req.params; 

        const result = await query(`SELECT * FROM "${TABLE_NAME}" WHERE id = $1`, [id]);

        if (result.length === 0) {
            return res.status(404).json({ status: false, message: `Broiler supply record with ID ${id} not found` });
        }

        res.status(200).json({ status: true, data: result[0] });

    } catch (error) {
        console.error("Error fetching single Broiler supply record:", error);
        res.status(500).json({ status: false, message: "Error fetching Broiler supply record", error: error.message });
    }
};

exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;
        
        const columns = getInsertUpdateColumns(data);
        const setClauses = columns.map((col, index) => `"${col}" = $${index + 1}`).join(', ');
        
        const values = columns.map(col => data[col]); 
        values.push(id); 

        const sql = `
            UPDATE "${TABLE_NAME}"
            SET ${setClauses}, "updated_at" = CURRENT_TIMESTAMP
            WHERE id = $${values.length} 
            RETURNING *; 
        `;
        
        const result = await query(sql, values);

        if (result.length === 0) {
            return res.status(404).json({ status: false, message: `Broiler supply record with ID ${id} not found for update` });
        }

        res.status(200).json({ 
            status: true, 
            message: "Broiler supply record updated successfully", 
            data: result[0] 
        });

    } catch (error) {
        console.error("Error updating Broiler supply record:", error);
        res.status(500).json({ 
            status: false, 
            message: "Error updating Broiler supply record", 
            error: error.message 
        });
    }
};

exports.remove = async (req, res) => {
    try {
        const { id } = req.params; 
        
        const result = await query(`DELETE FROM "${TABLE_NAME}" WHERE id = $1 RETURNING id`, [id]);

        if (result.length === 0) {
            return res.status(404).json({ status: false, message: `Broiler supply record with ID ${id} not found for deletion` });
        }

        res.status(200).json({ status: true, message: `Broiler supply record with ID ${id} deleted successfully` });

    } catch (error) {
        console.error("Error deleting Broiler supply record:", error);
        res.status(500).json({ status: false, message: "Error deleting Broiler supply record", error: error.message });
    }
};