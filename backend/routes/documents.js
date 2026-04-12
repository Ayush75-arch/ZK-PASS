const express = require("express");
const router  = express.Router();
const { users } = require("../store");
const { validateToken } = require("./oauth");

// GET /documents/aadhaar
// Returns mock Aadhaar data for the authenticated user.
router.get("/aadhaar", (req, res) => {
  const tokenData = validateToken(req, res);
  if (!tokenData) return;

  const user = users[tokenData.userId];
  if (!user) return res.status(404).json({ error: "user_not_found" });

  console.log(`[Docs] Aadhaar fetched  user=${tokenData.userId}`);

  res.json({
    document_type: "Aadhaar",
    issuer:        "UIDAI (Mock)",
    name:          user.name,
    dob:           user.dob,
    isIndian:      user.isIndian,
    fetched_at:    new Date().toISOString(),
    disclaimer:    "⚠️ This is MOCK data — not real Aadhaar.",
  });
});

// GET /documents/list
router.get("/list", (req, res) => {
  const tokenData = validateToken(req, res);
  if (!tokenData) return;

  res.json({
    documents: [
      { id: "aadhaar", name: "Aadhaar Card", issuer: "UIDAI", verified: true  },
      { id: "pan",     name: "PAN Card",     issuer: "CBDT",  verified: false, note: "Not implemented in mock" },
    ],
  });
});

module.exports = router;
