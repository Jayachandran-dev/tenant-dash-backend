const express = require("express");
const prisma = require("../db");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

// Get all users of current tenant
router.get("/", authMiddleware, async (req, res) => {
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

    const members = await prisma.membership.findMany({
      where: { tenantId },
      include: {
        user: {
          select: {
            id: true,
            mobile: true,
            name: true,
            avatar: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const result = members.map((m) => ({
      id: m.user.id,
      mobile: m.user.mobile,
      name: m.user.name,
      avatar: m.user.avatar,
      role: m.role,
      membershipId: m.id,
      joinedAt: m.createdAt,
    }));

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Add user to current tenant
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { mobile, name, role = "employee" } = req.body;
    const { userId } = req.user;
    const tenantId = parseInt(req.headers["x-tenant-id"]);

    if (!tenantId) return res.status(400).json({ message: "Tenant ID is required" });
    if (!mobile) return res.status(400).json({ message: "Mobile number is required" });

    const currentMembership = await prisma.membership.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
    });

    if (!currentMembership || currentMembership.role !== "owner") {
      return res.status(403).json({ message: "Only owner can add users" });
    }

    if (!["owner", "employee"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    let user = await prisma.user.findUnique({ where: { mobile } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          mobile,
          name: name || null,
          passwordHash: null,
        },
      });
    } else if (name && !user.name) {
      // Update name if it was empty
      user = await prisma.user.update({
        where: { id: user.id },
        data: { name },
      });
    }

    const existingMembership = await prisma.membership.findUnique({
      where: {
        userId_tenantId: { userId: user.id, tenantId },
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
      name: user.name,
      avatar: user.avatar,
      role: membership.role,
      membershipId: membership.id,
      joinedAt: membership.createdAt,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Update own profile (name + avatar only)
router.patch("/me", authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;
    const { name, avatar } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name !== undefined && { name }),
        ...(avatar !== undefined && { avatar }),
      },
      select: {
        id: true,
        mobile: true,
        name: true,
        avatar: true,
      },
    });

    res.json(updatedUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Remove member from current tenant (owner only)
router.delete("/:membershipId", authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;
    const tenantId = parseInt(req.headers["x-tenant-id"]);
    const membershipId = parseInt(req.params.membershipId);

    if (!tenantId) {
      return res.status(400).json({ message: "Tenant ID is required" });
    }

    const currentMembership = await prisma.membership.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
    });

    if (!currentMembership || currentMembership.role !== "owner") {
      return res.status(403).json({ message: "Only owner can remove users" });
    }

    const target = await prisma.membership.findFirst({
      where: { id: membershipId, tenantId },
      include: {
        user: { select: { id: true, name: true, mobile: true } },
      },
    });

    if (!target) {
      return res.status(404).json({ message: "Member not found" });
    }

    // Cannot remove yourself
    if (target.userId === userId) {
      return res.status(400).json({ message: "You cannot remove yourself" });
    }

    // Prevent removing the last owner
    if (target.role === "owner") {
      const ownerCount = await prisma.membership.count({
        where: { tenantId, role: "owner" },
      });
      if (ownerCount <= 1) {
        return res
          .status(400)
          .json({ message: "Cannot remove the last owner of this business" });
      }
    }

    await prisma.membership.delete({
      where: { id: membershipId },
    });

    res.json({ message: "Member removed successfully" });
  } catch (error) {
    console.error("Remove member error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
module.exports = router;