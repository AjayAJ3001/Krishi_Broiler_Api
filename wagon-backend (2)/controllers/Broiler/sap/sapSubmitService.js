const axios = require("axios");
const qs = require("qs");
const broilerDataEntry = require("./broilerDataEntry.json");


const formatDataToSap = (sapName, data) => {
  const config = broilerDataEntry[sapName];
  if (!config) {
    console.warn('No configuration found for feed_transfer');
    return {};
  }

  const mappedRow = {};

  config.fields.forEach(({ sap, body_key }) => {
    if (data[body_key] !== undefined) {
      mappedRow[sap] = data[body_key];
    } else {
      console.warn(`Missing field: ${body_key}`);
    }
  });

  return mappedRow;
};


const sapSubmit = async (sapName, data) => {
    try {

        const sapPayload = formatDataToSap(sapName, data);
        console.log("sap submit payload : ", sapPayload);


        const qsString = qs.stringify(
            { "sap-client": "500", ...sapPayload },
            { encode: true }
        );

        const finalUrl = `${process.env.BROILER_SAP_BASE_URL}${broilerDataEntry[sapName].sapEndpoint}?${qsString}`;

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

        const response = await axios.request(config);
        // console.log("Background SAP Response:", response);

        if(response.status !== 200) {
            console.log("sap failed")
            console.log(response.reason)
            return {status: false, data: "sap error"}
        }
        console.log("Background SAP Response:", response.data);
        // console.log("Background SAP Response:", response.status);
        // console.log("Background SAP Response:", response.statusText);

        return {status: true, data: response}
    } catch (error) {
        return {status: false, data: error}
    }
}

module.exports = {sapSubmit};