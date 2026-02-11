const router = require('express').Router();

const { getAll, getOne, create, remove, update } = require("../../controllers/Broiler/shedReadinessController")

router.get("/getAll", getAll);
router.get("/getOne/:id", getOne);
router.post("/create",create );
router.put("/update/:id", update );
router.delete("/remove/:id", remove);

module.exports = router;
