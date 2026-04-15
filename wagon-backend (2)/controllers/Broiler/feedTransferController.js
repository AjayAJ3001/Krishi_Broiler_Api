const puppeteer = require('puppeteer');
const ejs = require('ejs');
const path = require('path');
const fs = require('fs');
const axios = require("axios");
const qs = require("qs");
const { format, parse } = require('date-fns');

const { query } = require("../../config/db");

const TABLE_NAME = "feed_transfer";

/* --------------------------------------------------
   ✅ SAP SUBMIT FUNCTION
-------------------------------------------------- */
const sapSubmit = async (payload) => {
    try {
        const SAP_URL = process.env.SAP_URL;

        const response = await axios.get(SAP_URL, {
            params: payload,
            paramsSerializer: params => qs.stringify(params),
            timeout: 10000
        });

        console.log("SAP RESPONSE:", response.data);

        return {
            status: true,
            data: response.data
        };

    } catch (error) {
        console.error("SAP ERROR:", error?.response?.data || error.message);

        return {
            status: false,
            data: error?.response?.data || error.message
        };
    }
};

/* --------------------------------------------------
   ✅ BUILD SAP PAYLOAD
-------------------------------------------------- */
const buildSapPayload = (data) => {
    return {
        mandt: "500",
        indType: "FT",

        werks: data.plant,
        lifnr: data.from_farmer,
        ztoFarmer: data.to_farmer,

        matnr: data.material,
        menge: data.transfer_quantity,
        budat: data.date,

        vehicleNo: data.vehicle_no,
        fromBatch: data.from_batch,
        toBatch: data.to_batch,

        fromAge: data.from_age,
        toAge: data.to_age
    };
};

/* --------------------------------------------------
   ✅ GENERATE PDF + SAVE DB
-------------------------------------------------- */
const generateFeedTransferDC = async (data) => {
    try {
        const {
            date, plant, transfer_type, vehicle_no,
            ift_charges, from_farmer, to_farmer,
            from_batch, to_batch, from_bird_stock,
            to_bird_stock, from_age, to_age,
            material, transfer_quantity
        } = data;

        const user_id = "test";

        // Generate doc number
        const countRes = await query(`SELECT COUNT(*) FROM broiler.feed_transfer`);
        const count = parseInt(countRes?.[0]?.count || 0);
        const doc_no = `FT/DC/${count + 11001}`;

        const templateData = {
            branch: plant,
            doc_no,
            date,
            user_id,
            from_farmer,
            to_farmer,
            from_age,
            to_age,
            transfer_type,
            vehicle_no,
            transfer_quantity,
            totalKgs: transfer_quantity
        };

        // Render HTML
        const templatePath = path.join(process.cwd(), 'templates', 'broiler', 'feed_transfer_dc.ejs');
        const htmlContent = await ejs.renderFile(templatePath, templateData);

        // Create folder
        const reportsDir = path.join(process.cwd(), 'uploads', 'broiler', 'feed_transfer');
        if (!fs.existsSync(reportsDir)) {
            fs.mkdirSync(reportsDir, { recursive: true });
        }

        const fileName = `DC_${doc_no.replace(/\//g, '-')}_${Date.now()}.pdf`;
        const filePath = path.join(reportsDir, fileName);
        const publicUrl = `${process.env.SERVER_URL}/uploads/broiler/feed_transfer/${fileName}`;

        // Generate PDF
        const browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox']
        });

        const page = await browser.newPage();
        await page.setContent(htmlContent);
        await page.pdf({ path: filePath, format: 'A4' });
        await browser.close();

        // Save DB
        const insertQuery = `
            INSERT INTO broiler.feed_transfer_dc (
                date, plant, transfer_type, vehicle_no, ift_charges,
                from_farmer, to_farmer, from_batch, to_batch,
                from_bird_stock, to_bird_stock, from_age, to_age,
                material, transfer_quantity, user_id, pdf_url, doc_no
            ) VALUES (
                $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18
            )
        `;

        const values = [
            date, plant, transfer_type, vehicle_no, ift_charges,
            from_farmer, to_farmer, from_batch, to_batch,
            from_bird_stock, to_bird_stock, from_age, to_age,
            material, transfer_quantity, user_id, publicUrl, doc_no
        ];

        await query(insertQuery, values);

        return {
            status: true,
            dc_no: doc_no,
            pdfLink: publicUrl
        };

    } catch (error) {
        console.error("PDF ERROR:", error);
        return { status: false, error: error.message };
    }
};

/* --------------------------------------------------
   ✅ CREATE API (MAIN)
-------------------------------------------------- */
exports.create = async (req, res) => {
    try {
        const { date, ...rest } = req.body;

        // Format date
        let formattedDate = date;
        if (date) {
            const parsedDate = parse(date, 'd/M/yyyy', new Date());
            formattedDate = format(parsedDate, 'yyyy-MM-dd');
        }

        const updatedData = {
            ...rest,
            date: formattedDate,
            indType: "FT"
        };

        // Convert camelCase → snake_case
        const toSnakeCase = (str) =>
            str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

        const data = Object.fromEntries(
            Object.entries(updatedData).map(([k, v]) => [toSnakeCase(k), v])
        );

        /* ---------------- SAP CALL ---------------- */
        const sapPayload = buildSapPayload(data);

        console.log("SAP REQUEST:", sapPayload);

        const sapResponse = await sapSubmit(sapPayload);

        if (!sapResponse || sapResponse.status === false) {
            return res.status(500).json({
                status: false,
                message: "SAP FAILED",
                error: sapResponse?.data
            });
        }

        if (sapResponse?.data?.msgType && sapResponse.data.msgType !== "S") {
            return res.status(400).json({
                status: false,
                message: "SAP BUSINESS ERROR",
                sap: sapResponse.data
            });
        }

        /* ---------------- PDF + DB ---------------- */
        const dc = await generateFeedTransferDC(data);

        if (!dc.status) {
            return res.status(500).json(dc);
        }

        return res.status(201).json({
            status: true,
            message: "SUCCESS: SAP + DB + PDF DONE",
            sap: sapResponse.data,
            dc
        });

    } catch (error) {
        console.error("MAIN ERROR:", error);

        return res.status(500).json({
            status: false,
            message: "Internal Error",
            error: error.message
        });
    }
};