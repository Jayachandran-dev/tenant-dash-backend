// Simple in-memory OTP store (for development only)
// Key: mobile, Value: { otp, expiresAt }

const otpStore = new Map();

function saveOtp(mobile, otp) {
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
  otpStore.set(mobile, { otp, expiresAt });
}

function verifyOtp(mobile, otp) {
  const record = otpStore.get(mobile);
  if (!record) return false;

  if (Date.now() > record.expiresAt) {
    otpStore.delete(mobile);
    return false;
  }

  if (record.otp !== otp) return false;

  // OTP used → delete it
  otpStore.delete(mobile);
  return true;
}

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit
}

module.exports = { saveOtp, verifyOtp, generateOtp };