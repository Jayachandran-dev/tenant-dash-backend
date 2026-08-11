const express = require("express");
const prisma = require("../db");
const authMiddleware = require("../middleware/auth");
const { generateInviteToken } = require("../utils/inviteToken");

const router = express.Router();

const INVITE_DAYS = 7;

// Owner creates invite
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;
    const tenantId = parseInt(req.headers["x-tenant-id"]);
    const role = req.body.role || "employee";

    if (!tenantId) {
      return res.status(400).json({ message: "Tenant ID is required" });
    }

    if (!["owner", "employee"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const membership = await prisma.membership.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
    });

    if (!membership || membership.role !== "owner") {
      return res.status(403).json({ message: "Only owner can create invites" });
    }

    const token = generateInviteToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITE_DAYS);

    const invite = await prisma.invite.create({
      data: {
        token,
        tenantId,
        role,
        createdBy: userId,
        expiresAt,
      },
      include: {
        tenant: { select: { id: true, name: true } },
      },
    });

    res.status(201).json({
      token: invite.token,
      role: invite.role,
      expiresAt: invite.expiresAt,
      tenant: invite.tenant,
      // frontend builds full URL
    });
  } catch (error) {
    console.error("Create invite error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Public: validate invite (no auth)
router.get("/:token", async (req, res) => {
  try {
    const { token } = req.params;

    const invite = await prisma.invite.findUnique({
      where: { token },
      include: {
        tenant: { select: { id: true, name: true, logo: true } },
      },
    });

    if (!invite) {
      return res.status(404).json({ message: "Invite not found" });
    }

    if (invite.usedAt) {
      return res.status(400).json({ message: "Invite already used" });
    }

    if (new Date() > invite.expiresAt) {
      return res.status(400).json({ message: "Invite expired" });
    }

    res.json({
      token: invite.token,
      role: invite.role,
      expiresAt: invite.expiresAt,
      tenant: invite.tenant,
    });
  } catch (error) {
    console.error("Get invite error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Accept invite (must be logged in)
router.post("/:token/accept", authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;
    const { token } = req.params;

    const invite = await prisma.invite.findUnique({
      where: { token },
      include: { tenant: true },
    });

    if (!invite) {
      return res.status(404).json({ message: "Invite not found" });
    }

    if (invite.usedAt) {
      return res.status(400).json({ message: "Invite already used" });
    }

    if (new Date() > invite.expiresAt) {
      return res.status(400).json({ message: "Invite expired" });
    }

    const existing = await prisma.membership.findUnique({
      where: {
        userId_tenantId: { userId, tenantId: invite.tenantId },
      },
    });

    if (existing) {
      return res.status(400).json({
        message: "You are already a member of this business",
        tenantId: invite.tenantId,
      });
    }

    const [membership] = await prisma.$transaction([
      prisma.membership.create({
        data: {
          userId,
          tenantId: invite.tenantId,
          role: invite.role,
        },
      }),
      prisma.invite.update({
        where: { id: invite.id },
        data: { usedAt: new Date() },
      }),
    ]);

    res.json({
      message: "Joined successfully",
      tenant: {
        id: invite.tenant.id,
        name: invite.tenant.name,
        slug: invite.tenant.slug,
        role: membership.role,
        themeColor: invite.tenant.themeColor,
        themeMode: invite.tenant.themeMode,
      },
    });
  } catch (error) {
    console.error("Accept invite error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;