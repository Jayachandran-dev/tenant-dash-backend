const express = require('express');
const prisma = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { tenantId } = req.user;

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    const items = await prisma.item.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      tenant,
      items,
      message: `Welcome to ${tenant.name}`,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;