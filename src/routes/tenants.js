const express = require("express");
const prisma = require("../db");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

function createSlug(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Create a new business (tenant) for the logged-in user
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { name } = req.body;
    const { userId } = req.user;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ message: "Business name is required" });
    }

    let slug = createSlug(name);

    // Make slug unique
    const existingSlug = await prisma.tenant.findUnique({ where: { slug } });
    if (existingSlug) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: name.trim(),
          slug,
        },
      });

      await tx.membership.create({
        data: {
          userId,
          tenantId: tenant.id,
          role: "owner",
        },
      });

      return tenant;
    });

    res.status(201).json({
      id: result.id,
      name: result.name,
      slug: result.slug,
      role: "owner",
      themeColor: result.themeColor || "#0D9488",
      themeMode: result.themeMode || "light",
    });
  } catch (error) {
    console.error("Create tenant error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get all tenants of the logged-in user
router.get("/my", authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;

    const memberships = await prisma.membership.findMany({
      where: { userId },
      include: {
        tenant: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const tenants = memberships.map((m) => ({
      id: m.tenant.id,
      name: m.tenant.name,
      slug: m.tenant.slug,
      role: m.role,
      themeColor: m.tenant.themeColor || "#0D9488",
      themeMode: m.tenant.themeMode || "light",
    }));

    res.json(tenants);
  } catch (error) {
    console.error("Get tenants error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;