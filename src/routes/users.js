const express = require("express");
const prisma = require("../db");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

// Get all users of the current tenant
router.get("/", authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;
    const tenantId = parseInt(req.headers["x-tenant-id"]);

    if (!tenantId) {
      return res.status(400).json({ message: "Tenant ID is required" });
    }

    // Check if current user belongs to this tenant
    const membership = await prisma.membership.findUnique({
      where: {
        userId_tenantId: { userId, tenantId },
      },
    });

    if (!membership) {
      return res.status(403).json({ message: "Access denied" });
    }

    const members = await prisma.membership.findMany({
      where: { tenantId },
      include: {
        user: {
          select: {
            id: true,
            mobile: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const result = members.map((m) => ({
      id: m.user.id,
      mobile: m.user.mobile,
      role: m.role,
      membershipId: m.id,
      joinedAt: m.createdAt,
    }));

    res.json(result);
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Add a user to the current tenant by mobile number
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { mobile, role = "employee" } = req.body;
    const { userId } = req.user;
    const tenantId = parseInt(req.headers["x-tenant-id"]);

    if (!tenantId) {
      return res.status(400).json({ message: "Tenant ID is required" });
    }

    if (!mobile) {
      return res.status(400).json({ message: "Mobile number is required" });
    }

    // Only owner can add users (for now)
    const currentMembership = await prisma.membership.findUnique({
      where: {
        userId_tenantId: { userId, tenantId },
      },
    });

    if (!currentMembership || currentMembership.role !== "owner") {
      return res.status(403).json({ message: "Only owner can add users" });
    }

    // Allowed roles for now
    if (!["owner", "employee"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { mobile },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          mobile,
          passwordHash: null,
        },
      });
    }

    // Check if already a member
    const existingMembership = await prisma.membership.findUnique({
      where: {
        userId_tenantId: {
          userId: user.id,
          tenantId,
        },
      },
    });

    if (existingMembership) {
      return res.status(400).json({ message: "User is already a member of this business" });
    }

    const membership = await prisma.membership.create({
      data: {
        userId: user.id,
        tenantId,
        role,
      },
    });

    res.status(201).json({
      id: user.id,
      mobile: user.mobile,
      role: membership.role,
      membershipId: membership.id,
      joinedAt: membership.createdAt,
    });
  } catch (error) {
    console.error("Add user error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;