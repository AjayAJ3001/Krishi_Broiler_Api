const express = require("express");
const broilerMasterRoutes = require("./masters/masterRoutes");
const farmActivityRoutes = require("./farmActivityRoutes");
const shedReadinessRoutes = require("./shedReadinessRoutes");
const IssueMedicineRoutes = require("../Broiler/IssueMedicineRoutes");
const feedTransferRoutes = require("../Broiler/feedTransferRoutes");
const feedReturnRoutes = require("../Broiler/feedReturnRoutes");
const broilerSupplyRoutes = require("../Broiler/broilerSupplyRoutes");
const feedRequestRoutes = require("../Broiler/feedRequestRoutes");
const feedApprovalRoutes = require("../Broiler/feedApprovalRoutes");

const plantRoutes = require("../Broiler/plantRoutes");
const farmerRoutes = require("../Broiler/farmerRoutes");


const router = express.Router();

// group under /api/broiler/*

router.use("/master", broilerMasterRoutes);
router.use("/farmActivity", farmActivityRoutes);
router.use("/shedReadiness", shedReadinessRoutes);
router.use("/IssueMedicine", IssueMedicineRoutes);
router.use("/feedTransfer", feedTransferRoutes);
router.use("/feedReturn", feedReturnRoutes);
router.use("/broilerSupply", broilerSupplyRoutes);
router.use("/feedRequest", feedRequestRoutes);
router.use("/feedApproval", feedApprovalRoutes);

router.use("/plant", plantRoutes);
router.use("/farmer", farmerRoutes);

module.exports = router;
