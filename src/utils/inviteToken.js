const crypto = require("crypto");

function generateInviteToken() {
  return crypto.randomBytes(24).toString("hex");
}

module.exports = { generateInviteToken };