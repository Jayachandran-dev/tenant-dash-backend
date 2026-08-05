const express = require("express");
const jwt = require("jsonwebtoken");
const prisma = require("../db");
const { saveOtp, verifyOtp, generateOtp } = require("../utils/otpStore");

const router = express.Router();

function createSlug(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// ====================== SEND OTP ======================
router.post("/send-otp", async (req, res) => {
  try {
    const { mobile } = req.body;

    if (!mobile) {
      return res.status(400).json({ message: "Mobile number is required" });
    }

    const otp = generateOtp();
    saveOtp(mobile, otp);

    // In development we return the OTP so frontend can show it in Alert
    console.log(`OTP for ${mobile}: ${otp}`);

    res.json({
      message: "OTP sent successfully",
      otp, // ← only for development
    });
  } catch (error) {
    console.error("Send OTP error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ====================== VERIFY OTP (Login) ======================
router.post("/verify-otp", async (req, res) => {
  try {
    const { mobile, otp } = req.body;

    if (!mobile || !otp) {
      return res.status(400).json({ message: "Mobile and OTP are required" });
    }

    const isValid = verifyOtp(mobile, otp);
    if (!isValid) {
      return res.status(401).json({ message: "Invalid or expired OTP" });
    }

    const user = await prisma.user.findUnique({
      where: { mobile },
      include: {
        memberships: {
          include: { tenant: true },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found. Please signup first to create a business.",
      });
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const tenants = user.memberships.map((m) => ({
      id: m.tenant.id,
      name: m.tenant.name,
      slug: m.tenant.slug,
      role: m.role,
    }));

    res.json({
      token,
      user: {
        id: user.id,
        mobile: user.mobile,
      },
      tenants,
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ====================== SIGNUP ======================
router.post("/signup", async (req, res) => {
  try {
    const { tenantName, mobile } = req.body;

    if (!tenantName || !mobile) {
      return res.status(400).json({ message: "Business name and mobile are required" });
    }

    // Check if mobile already exists
    const existingUser = await prisma.user.findUnique({
      where: { mobile },
    });

    if (existingUser) {
      return res.status(400).json({
        message: "Mobile already registered. Please login or try a new number to create a business",
      });
    }

    let slug = createSlug(tenantName);
    const existingSlug = await prisma.tenant.findUnique({ where: { slug } });
    if (existingSlug) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          mobile,
          passwordHash: "", // no longer used
        },
      });

      const tenant = await tx.tenant.create({
        data: {
          name: tenantName,
          slug,
        },
      });

      await tx.membership.create({
        data: {
          userId: user.id,
          tenantId: tenant.id,
          role: "owner",
        },
      });

      return { user, tenant };
    });

    const token = jwt.sign(
      { userId: result.user.id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      token,
      user: {
        id: result.user.id,
        mobile: result.user.mobile,
      },
      tenants: [
        {
          id: result.tenant.id,
          name: result.tenant.name,
          slug: result.tenant.slug,
          role: "owner",
        },
      ],
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;