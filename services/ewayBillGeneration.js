const axios = require('axios');
require("dotenv").config();

const SARAL_BASE = process.env.SARAL_BASE_URL;
const client_id = process.env.SARAL_CLIENT_ID;
const client_secret = process.env.SARAL_CLIENT_SECRET;
const username = process.env.SARAL_USERNAME;
const password = process.env.SARAL_PASSWORD;
const gstin = process.env.SARAL_GSTIN;

async function fetchEWayBillNumber(invoicePayload) {
  try {
    // 1. Authenticate
    const authRes = await axios.get(`${SARAL_BASE}/authentication/Authenticate`, {
      headers: {
        ClientId: client_id,
        ClientSecret: client_secret,
      }
    });

    const { authenticationToken, subscriptionId } = authRes.data;
    console.log("Auth res data : ", authRes.data);

    // 2. Get Invoice Auth
    const invoiceAuthRes = await axios.post(`${SARAL_BASE}/eivital/v1.04/auth`, {}, {
      headers: {
        authenticationToken,
        subscriptionId,
        username,
        password,
        Gstin: gstin,
        Server: 1
      }
    });

    const { authToken, sek } = invoiceAuthRes.data.data;
    console.log("Invoice auth res data : ", invoiceAuthRes.data.data);


    // generate  eway bill:
    const ewaybill = await axios.post(`${SARAL_BASE}/v1.03/ewayapi`, invoicePayload, {
      headers: {
        authenticationToken,
        subscriptionId,
        username,
        Gstin: gstin,
        AuthToken: authToken,
        sek,
        action: "GENEWAYBILL",
        Server: 1
      }
    })

    console.log("eway bille data : ", ewaybill);

    if (ewaybill.data.errorCodes) {
      return { error: `E-Way Error Codes: ${ewaybill.data.errorCodes}` };
    }

    // Check for errors in E-waybill response
    if (!ewaybill.data.ewayBillNo) {
      const errorDetails = ewaybill.data.errorDetails || [];
      const errorMessage = errorDetails.map(e => e.errorMessage).join(', ') || 'Unknown error';
      console.error("🚨 Error generating E-way bill:", errorMessage);
      return { error: errorMessage }; // Return error and stop further execution
    }

    const distance = parseInt(ewaybill.data.alert?.match(/\d+/)?.[0] || 0, 10);

    return {
      ewbNo: ewaybill.data.ewayBillNo,
      ewbDate: ewaybill.data.ewayBillDate,
      ewbValidTill: ewaybill.data.validUpto,
      distance
    };

    {/* 
    // 3. Generate IRN
    const irnRes = await axios.post(`${SARAL_BASE}/eicore/v1.03/Invoice`, invoicePayload, {
      headers: {
        authenticationToken,
        subscriptionId,
        username,
        Gstin: gstin,
        AuthToken: authToken,
        sek,
        Server: 1
      }
    });

    console.log("Irn res data : ", irnRes.data);
  
    // if (irnRes.data.status !== 1 || !irnRes.data.irn) {
    //   const errorDetails = irnRes.data.errorDetails || [];
    //   const errorMessage = errorDetails.map(e => e.errorMessage).join(', ') || 'Unknown error';
    //   console.error("🚨 Error generating IRN:", errorMessage);
    //   return { error: errorMessage };
    // }

    const { irn, ewbNo } = irnRes.data;
  
    // If E-waybill already generated with IRN
    if (ewbNo) return { ewbNo: ewbNo, irn: irn };
  
    // 4. Generate E-way bill
    ewayPayload.Irn = irn;
    const ewayRes = await axios.post(`${SARAL_BASE}/eiewb/v1.03/ewaybill`, ewayPayload, {
      headers: {
        authenticationToken,
        subscriptionId,
        username,
        Gstin: gstin,
        AuthToken: authToken,
        sek,
        action: 'GENEWAYBILL',
        Server: 1
      }
    });

    console.log("E way bill data : ", ewayRes.data);

    // Check for errors in E-waybill response
    if (!ewayRes.data.ewbNo) {
      const errorDetails = ewayRes.data.errorDetails || [];
      const errorMessage = errorDetails.map(e => e.errorMessage).join(', ') || 'Unknown error';
      console.error("🚨 Error generating E-way bill:", errorMessage);
      return { error: errorMessage }; // Return error and stop further execution
    }

    return {
      ewbNo: ewayRes.data.ewbNo,
      ewbDate: ewayRes.data.ewbDt,
      ewbValidTill: ewayRes.data.ewbValidTill,
      distance: parseInt(ewayRes.data.remarks.match(/\d+/)?.[0] || 0, 10),
      irn: irn
    };

*/}

  } catch (error) {
    console.error("🚨 E-Way Bill Generation Failed:");

    if (error.response?.data?.errors) {
      console.error("🛑 Validation Errors:", JSON.stringify(error.response.data.errors, null, 2));
    } else if (error.response?.data) {
      console.error("🛑 Response Data:", error.response.data);
    } else {
      console.error("🛑 Error:", error.message);
    }

    return { error: error.message }; // Return error and stop further execution
  }
}

module.exports = { fetchEWayBillNumber };
