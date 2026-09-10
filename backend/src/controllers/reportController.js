// controllers/reportController.js
//
// NOTE: No AI classification happens here yet — that's Phase 3+. Right now
// a report is just saved as-is with the citizen-selected category and
// status "NEW". The AI pipeline gets wired in on top of this in later phases.

const Report = require("../models/Report");
const { uploadImageBuffer } = require("../utils/imageUpload");
const { distanceKm } = require("../utils/geo");

const NEARBY_RADIUS_KM = 5; // default search radius for "reports near me"

async function createReport(req, res, next) {
  try {
    const { description, category, latitude, longitude, voiceText } = req.body;

    if (!description || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: "description, latitude, and longitude are required" });
    }

    const lat = Number(latitude);
    const lng = Number(longitude);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.status(400).json({ error: "latitude and longitude must be valid numbers" });
    }

    let imageUrl;
    if (req.file) {
      imageUrl = await uploadImageBuffer(req.file.buffer);
    }

    // req.user comes from requireAuth middleware — citizens can only ever
    // create reports as themselves, tied to their own villageId
    const report = await Report.create({
      userId: req.user.id,
      villageId: req.user.villageId,
      description,
      category: category || "other",
      imageUrl,
      voiceText,
      latitude: lat,
      longitude: lng,
      status: "NEW",
    });

    res.status(201).json({ report });
  } catch (err) {
    // Multer file-type/size errors surface here too — give a clean 400 instead of a 500
    if (err.message && err.message.includes("images are allowed")) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
}

/** Reports submitted by the currently logged-in citizen. */
async function getMyReports(req, res, next) {
  try {
    const reports = await Report.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json({ reports });
  } catch (err) {
    next(err);
  }
}

async function getReportById(req, res, next) {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ error: "Report not found" });
    }
    // Citizens can only view their own report; reps/admins can view any
    if (req.user.role === "citizen" && report.userId.toString() !== req.user.id) {
      return res.status(403).json({ error: "You can only view your own reports" });
    }
    res.json({ report });
  } catch (err) {
    next(err);
  }
}

/**
 * Reports within NEARBY_RADIUS_KM of the given lat/lng, in the citizen's
 * own village. Plain distance math for now — no AI/similarity involved yet.
 */
async function getNearbyReports(req, res, next) {
  try {
    const { latitude, longitude } = req.query;
    const lat = Number(latitude);
    const lng = Number(longitude);

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.status(400).json({ error: "latitude and longitude query params are required" });
    }

    // Narrow by village first (cheap DB filter) before doing distance math in JS
    const candidates = await Report.find({ villageId: req.user.villageId }).lean();

    const nearby = candidates
      .map((r) => ({ ...r, distanceKm: distanceKm(lat, lng, r.latitude, r.longitude) }))
      .filter((r) => r.distanceKm <= NEARBY_RADIUS_KM)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    res.json({ reports: nearby });
  } catch (err) {
    next(err);
  }
}

module.exports = { createReport, getMyReports, getReportById, getNearbyReports };
