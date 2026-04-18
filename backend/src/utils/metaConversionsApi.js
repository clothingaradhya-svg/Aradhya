const crypto = require("crypto");

function normalizeString(value) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function normalizeCountryCode(value) {
  const normalized = normalizeString(value)?.toLowerCase() || null;
  if (!normalized) {
    return null;
  }

  if (normalized === "in" || normalized === "india") {
    return "IN";
  }

  return normalized.toUpperCase();
}

function normalizePhoneToMetaE164(value, country = "IN") {
  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }

  const digitsOnly = normalized.replace(/\D/g, "");
  if (!digitsOnly) {
    return null;
  }

  const normalizedCountry = normalizeCountryCode(country) || "IN";

  if (normalizedCountry === "IN") {
    if (digitsOnly.length === 10) {
      return `91${digitsOnly}`;
    }

    if (digitsOnly.length === 11 && digitsOnly.startsWith("0")) {
      return `91${digitsOnly.slice(1)}`;
    }

    if (digitsOnly.length === 12 && digitsOnly.startsWith("91")) {
      return digitsOnly;
    }

    return null;
  }

  if (digitsOnly.length >= 8 && digitsOnly.length <= 15) {
    return digitsOnly;
  }

  return null;
}

function sha256Hex(value) {
  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }

  return crypto.createHash("sha256").update(normalized).digest("hex");
}

function buildMetaUserData({ phone = null, country = "IN" } = {}) {
  const userData = {};
  const normalizedPhone = normalizePhoneToMetaE164(phone, country);

  if (normalizedPhone) {
    userData.ph = sha256Hex(normalizedPhone);
  }

  return userData;
}

module.exports = {
  buildMetaUserData,
  normalizePhoneToMetaE164,
  sha256Hex,
};
