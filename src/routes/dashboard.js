const express = require("express");
const prisma = require("../db");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

router.get("/", authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;
    const tenantId = parseInt(req.headers["x-tenant-id"]);

    if (!tenantId) {
      return res.status(400).json({ message: "Tenant ID is required" });
    }

    // Verify user belongs to this tenant
    const membership = await prisma.membership.findUnique({
      where: {
        userId_tenantId: {
          userId,
          tenantId,
        },
      },
      include: {
        tenant: true,
      },
    });

    if (!membership) {
      return res.status(403).json({ message: "You do not have access to this tenant" });
    }

    const items = await prisma.item.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      tenant: membership.tenant,
      role: membership.role,
      items,
      message: `Welcome to ${membership.tenant.name}`,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;