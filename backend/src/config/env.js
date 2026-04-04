const path = require('node:path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true, quiet: true });

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const env = {
  port: Number(process.env.PORT || 5001),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'dev_secret',
  databaseUrl: process.env.DATABASE_URL,
  frontendUrl: process.env.FRONTEND_URL,
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET,
  cloudinaryFolder: process.env.CLOUDINARY_FOLDER || 'marvelle',
  shiprocketEmail: process.env.SHIPROCKET_EMAIL,
  shiprocketPassword: process.env.SHIPROCKET_PASSWORD,
  shiprocketPickupLocation: process.env.SHIPROCKET_PICKUP_LOCATION || 'Rik Sama',
  shiprocketPickupPincode: process.env.SHIPROCKET_PICKUP_PINCODE || '711403',
  shiprocketDefaultCountry: process.env.SHIPROCKET_DEFAULT_COUNTRY || 'India',
  shiprocketDefaultWeight: toNumber(process.env.SHIPROCKET_DEFAULT_WEIGHT, 0.5),
  shiprocketDefaultLength: toNumber(process.env.SHIPROCKET_DEFAULT_LENGTH, 10),
  shiprocketDefaultBreadth: toNumber(process.env.SHIPROCKET_DEFAULT_BREADTH, 10),
  shiprocketDefaultHeight: toNumber(process.env.SHIPROCKET_DEFAULT_HEIGHT, 10),
};

module.exports = { env };
