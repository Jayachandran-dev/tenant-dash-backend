const express = require("express");
const prisma = require("../db");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

// Get current business profile
router.get("/profile", authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;
    const tenantId = parseInt(req.headers["x-tenant-id"]);

    if (!tenantId) {
      return res.status(400).json({ message: "Tenant ID is required" });
    }

    const membership = await prisma.membership.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
    });

    if (!membership) {
      return res.status(403).json({ message: "Access denied" });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    res.json(tenant);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Update business profile (Owner only)
router.patch("/profile", authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;
    const tenantId = parseInt(req.headers["x-tenant-id"]);

    if (!tenantId) {
      return res.status(400).json({ message: "Tenant ID is required" });
    }

    const membership = await prisma.membership.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
    });

    if (!membership || membership.role !== "owner") {
      return res.status(403).json({ message: "Only owner can update business profile" });
    }

    const {
      name,
      logo,
      phone,
      email,
      tagline,
      visitingCard,
      address,
      website,
      description,
    } = req.body;

    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        ...(name !== undefined && { name }),
        ...(logo !== undefined && { logo }),
        ...(phone !== undefined && { phone }),
        ...(email !== undefined && { email }),
        ...(tagline !== undefined && { tagline }),
        ...(visitingCard !== undefined && { visitingCard }),
        ...(address !== undefined && { address }),
        ...(website !== undefined && { website }),
        ...(description !== undefined && { description }),
      },
    });

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;