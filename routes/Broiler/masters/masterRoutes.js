const router = require("express").Router();
const {
    broilerMasterInsert,
    getAllBroilerMaster,
    syncMortalityReason,
    getMortalityReason,
    syncStandardBody,
    getStandardBody,
    syncEarnedRc,
    getEarnedRc,
    syncEarnedRc1,
    getEarnedRc1,
    syncEarnedRc2,
    getEarnedRc2,
    syncEarnedRc3,
    getEarnedRc3,
    syncEggCodeList,
    getEggCodeList,
    syncFcrGrade,
    getFcrGrade,
    syncFcrGrade1,
    getFcrGrade1
} = require('../../../controllers/Broiler/masters/masterSync')

// SAP Sync routes (must be before parameterized routes)
router.get("/sap-sync/mortality-reason", syncMortalityReason);
router.get("/mortality-reason", getMortalityReason);
router.get("/sap-sync/standard-body", syncStandardBody);
router.get("/standard-body", getStandardBody);
router.get("/sap-sync/earned-rc", syncEarnedRc);
router.get("/earned-rc", getEarnedRc);
router.get("/sap-sync/earned-rc1", syncEarnedRc1);
router.get("/earned-rc1", getEarnedRc1);
router.get("/sap-sync/earned-rc2", syncEarnedRc2);
router.get("/earned-rc2", getEarnedRc2);
router.get("/sap-sync/earned-rc3", syncEarnedRc3);
router.get("/earned-rc3", getEarnedRc3);
router.get("/sap-sync/egg-code-list", syncEggCodeList);
router.get("/egg-code-list", getEggCodeList);
router.get("/sap-sync/fcr-grade", syncFcrGrade);
router.get("/fcr-grade", getFcrGrade);
router.get("/sap-sync/fcr-grade1", syncFcrGrade1);
router.get("/fcr-grade1", getFcrGrade1);

// Generic master routes (parameterized)
router.post("/:name", broilerMasterInsert);
router.get("/getAll/:name", getAllBroilerMaster);

module.exports = router;