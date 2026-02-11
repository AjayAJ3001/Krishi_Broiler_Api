const router = require("express").Router();

const {
    getAllRoles,
    addRole,
    updateRole,
    deleteRole
} = require("../controllers/roleController");

// /api/roles/

router.get("/getAll{/:category}", getAllRoles);
router.post("/add", addRole);
router.put("/update/:id", updateRole);
router.delete("/delete/:id", deleteRole);

module.exports = router;