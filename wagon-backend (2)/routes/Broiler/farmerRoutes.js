const express = require("express");
const router = express.Router();
const {
    getAllFarmer,
    getAllFarmerByPlant,
    getFarmer
} = require("../../controllers/Broiler/farmerController");


//  /api/broiler/farmer

router.get("/getAll", getAllFarmer);
router.get("/get-by-plant/:plant_id", getAllFarmerByPlant);
router.get("/get-by-farmer", getFarmer);

module.exports = router;
