const router = require("express").Router();

const {getAll, addDC, updateDC, generateChallanPDF, generateChallanPDFByData, generateChallanPDFByViewData, cancelDC, getAllById, getTokenNo} = require("../controllers/dcController");

router.get("/getAll{/:location_id}", getAll);
router.get("/getAllById/:user_id", getAllById);
router.get("/getTokenNo", getTokenNo);
router.post("/add", addDC);
router.put("/update/:id", updateDC);
router.post("/getChallan", generateChallanPDFByData);
router.post("/getChallanByView", generateChallanPDFByViewData);
router.put("/cancelDc/:id", cancelDC);

module.exports = router;