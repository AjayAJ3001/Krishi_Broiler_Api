const axios = require("axios");
const { query } = require("../../config/db");

// -------------------------------------------------
// GET ALL FARMER
// -------------------------------------------------
exports.getAllFarmer = async (req, res) => {
    try {
        const result = await query("SELECT * FROM broiler.farmer");
        res.json({ success: true, data: result });
    } catch (err) {
        console.error("Get All farmer Error:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// -------------------------------------------------
// GET ALL FARMER BY PLANT
// -------------------------------------------------
exports.getAllFarmerByPlant = async (req, res) => {
    const { plant_id } = req.params;

    try {
        const result = await query(
            "SELECT * FROM broiler.farmer WHERE plant = $1",
            [plant_id]
        );

        if (!result || result.length === 0) {
            return res.status(404).json({ success: false, message: "Not found" });
        }

        res.json({ success: true, data: result });

    } catch (err) {
        console.error("Get All farmer Error:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

exports.getFarmer = async (req, res) => {
  try {
    const { plant } = req.query;

    if (!plant) {
      return res.status(400).json({
        success: false,
        message: "plant is required"
      });
    }

    let url = `${process.env.BROILER_SAP_BASE_URL}/zdaily_mor?sap-client=500&werks=${plant}`;

    let config = {
      method: "get",
      maxBodyLength: Infinity,
      url: url,
      auth: {
        username: process.env.BROILER_SAP_USERNAME,
        password: process.env.BROILER_SAP_PASSWORD
      }
    };

    // console.log("get url", url);

    const response = await axios.request(config);

    if (response.status !== 200) {
      return res.status(500).json({
        success: false,
        message: "SAP error"
      });
    }

    const formattedData =
      response.data?.map(({ werks, lifnr, name1 }) => ({
        plant_id: werks,
        farmer_supplier: lifnr,
        farmer_name: name1
      })) || [];

    // console.log("Extracted Data:", formattedData);

    const suppliers = formattedData.map(f => f.farmer_supplier);
    const result = await query(
        `SELECT farmer_supplier, farmer_no, farm_length, farm_width, farm_chick_house_capacity
        FROM broiler.farmer 
        WHERE farmer_supplier = ANY($1)`,
        [suppliers]
    );

    const farmerMap = {};
    result.forEach(row => {
        farmerMap[row.farmer_supplier] = row;
    });

    const enrichedData = formattedData.map(farmer => ({
        ...farmer,
        ...farmerMap[farmer.farmer_supplier]
    }));

    // console.log(enrichedData)

    return res.json({
      success: true,
      data: enrichedData
    });

  } catch (error) {
    console.error("Error in getFarmer:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};