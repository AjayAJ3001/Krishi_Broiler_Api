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
const chickReceiptRoutes = require("../Broiler/chickReceiptRoutes");

const sapRoutes = require("./sapRoutes")


const router = express.Router();

// group under /api/broiler/*

router.use("/master", broilerMasterRoutes);
router.use("/farm-activity", farmActivityRoutes);
router.use("/shed-readiness", shedReadinessRoutes);
router.use("/issue-medicine", IssueMedicineRoutes);
router.use("/feed-transfer", feedTransferRoutes);
router.use("/feedReturn", feedReturnRoutes);
router.use("/bill-of-supply", broilerSupplyRoutes);
router.use("/feed-request", feedRequestRoutes);
router.use("/feedApproval", feedApprovalRoutes);

router.use("/plant", plantRoutes);
router.use("/farmer", farmerRoutes);
router.use("/chick-receipt", chickReceiptRoutes);

router.use("/sap", sapRoutes);

module.exports = router;
