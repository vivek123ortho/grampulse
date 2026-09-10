// routes/reportRoutes.js

const express = require("express");
const router = express.Router();
const {
  createReport,
  getMyReports,
  getReportById,
  getNearbyReports,
} = require("../controllers/reportController");
const { requireAuth } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

// All report routes require login. upload.single("image") means the
// frontend form's file input must be named "image" — it's optional
// (a report can be text-only), multer just passes through if no file is sent.
router.post("/", requireAuth, upload.single("image"), createReport);
router.get("/mine", requireAuth, getMyReports);
router.get("/nearby", requireAuth, getNearbyReports);
router.get("/:id", requireAuth, getReportById);

module.exports = router;

