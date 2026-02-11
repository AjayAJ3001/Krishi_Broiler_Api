const router = require('express').Router();

const upload = require('../../config/multer.config');
const { getAll,create,getOne,remove,update } = require("../../controllers/Broiler/farmActivityController");

router.get("/getAll", getAll);
router.post("/create", upload.single('upload_mortality'), create);
router.get("/getOne/:id",getOne);
router.delete("/remove/:id",remove);
router.put("/update/:id", update);

module.exports = router;