const express = require("express");
const router = express.Router();
const {
    getAllFarmer,
    getAllFarmerByPlant
} = require("../../controllers/Broiler/farmerController");

router.get("/getAll", getAllFarmer);
router.get("/get/:plant_id", getAllFarmerByPlant);

module.exports = router;
