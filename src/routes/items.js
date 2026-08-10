const express = require("express");
const prisma = require("../db");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

// Helper: verify user belongs to tenant
async function getMembership(userId, tenantId) {
  if (!tenantId) return null;
  return prisma.membership.findUnique({
    where: { userId_tenantId: { userId, tenantId } },
  });
}

// GET all items for current tenant
router.get("/", authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;
    const tenantId = parseInt(req.headers["x-tenant-id"]);

    const membership = await getMembership(userId, tenantId);
    if (!membership) {
      return res.status(403).json({ message: "Access denied" });
    }

    const items = await prisma.item.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });

    res.json(items);
  } catch (error) {
    console.error("Get items error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// CREATE item
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;
    const tenantId = parseInt(req.headers["x-tenant-id"]);
    const { title } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: "Title is required" });
    }

    const membership = await getMembership(userId, tenantId);
    if (!membership) {
      return res.status(403).json({ message: "Access denied" });
    }

    const item = await prisma.item.create({
      data: {
        title: title.trim(),
        tenantId,
      },
    });

    res.status(201).json(item);
  } catch (error) {
    console.error("Create item error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// UPDATE item
router.patch("/:id", authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;
    const tenantId = parseInt(req.headers["x-tenant-id"]);
    const itemId = parseInt(req.params.id);
    const { title } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: "Title is required" });
    }

    const membership = await getMembership(userId, tenantId);
    if (!membership) {
      return res.status(403).json({ message: "Access denied" });
    }

    const existing = await prisma.item.findFirst({
      where: { id: itemId, tenantId },
    });

    if (!existing) {
      return res.status(404).json({ message: "Item not found" });
    }

    const item = await prisma.item.update({
      where: { id: itemId },
      data: { title: title.trim() },
    });

    res.json(item);
  } catch (error) {
    console.error("Update item error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE item
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;
    const tenantId = parseInt(req.headers["x-tenant-id"]);
    const itemId = parseInt(req.params.id);

    const membership = await getMembership(userId, tenantId);
    if (!membership) {
      return res.status(403).json({ message: "Access denied" });
    }

    const existing = await prisma.item.findFirst({
      where: { id: itemId, tenantId },
    });

    if (!existing) {
      return res.status(404).json({ message: "Item not found" });
    }

    await prisma.item.delete({ where: { id: itemId } });

    res.json({ message: "Item deleted" });
  } catch (error) {
    console.error("Delete item error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;