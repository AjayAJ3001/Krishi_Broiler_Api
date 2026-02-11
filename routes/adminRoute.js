const router = require("express").Router();

const {
    register,
    login,
    getAll,
    updateAdmin,
    getTruckStatusSummary,
    getLoadingStatus,
    getDashboardSummary,
    getMonthlyPoSummary,
    getProjectStatusSummary,
    getAdminSummary,
    getAvailableAdmin
} = require("../controllers/adminController");


// api/admin
router.post("/register", register);
router.post("/login", login);
router.get("/getAll{/:category}", getAll);
router.get("/getAvailableAdmin", getAvailableAdmin);
router.put("/update/:id", updateAdmin);
router.get("/truck-status", getTruckStatusSummary);
router.get("/loading-status", getLoadingStatus);
router.get("/dashboard-summary", getDashboardSummary);
router.get("/monthly-po-summary", getMonthlyPoSummary);
router.get("/project-status-summary", getProjectStatusSummary);
router.get("/getAdminSummary", getAdminSummary);

module.exports = router;