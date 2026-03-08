const admin = require('firebase-admin');

const trimEnvValue = (value) => String(value || '').trim();

const pickFirstEnv = (...keys) => {
  for (const key of keys) {
    const value = trimEnvValue(process.env[key]);
    if (value) return value;
  }
  return '';
};

const tryParseServiceAccountJson = () => {
  const raw = trimEnvValue(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const getFirebaseProjectId = () => {
  const directValue = pickFirstEnv('FIREBASE_PROJECT_ID', 'VITE_FIREBASE_PROJECT_ID');
  if (directValue) return directValue;

  const parsed = tryParseServiceAccountJson();
  return trimEnvValue(parsed?.project_id || parsed?.projectId);
};

const getFirebasePublicConfig = () => {
  const projectId = getFirebaseProjectId();
  const config = {
    apiKey: pickFirstEnv('FIREBASE_WEB_API_KEY', 'VITE_FIREBASE_API_KEY'),
    authDomain:
      pickFirstEnv('FIREBASE_AUTH_DOMAIN', 'VITE_FIREBASE_AUTH_DOMAIN') ||
      (projectId ? `${projectId}.firebaseapp.com` : ''),
    projectId,
    storageBucket: pickFirstEnv(
      'FIREBASE_STORAGE_BUCKET',
      'VITE_FIREBASE_STORAGE_BUCKET',
    ),
    appId: pickFirstEnv('FIREBASE_APP_ID', 'VITE_FIREBASE_APP_ID'),
    messagingSenderId: pickFirstEnv(
      'FIREBASE_MESSAGING_SENDER_ID',
      'VITE_FIREBASE_MESSAGING_SENDER_ID',
    ),
  };

  return Object.fromEntries(
    Object.entries(config).filter(([, value]) => Boolean(value)),
  );
};

const parseServiceAccountFromJson = () => {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    const serviceAccount = {
      projectId: parsed.project_id || parsed.projectId,
      clientEmail: parsed.client_email || parsed.clientEmail,
      privateKey: String(parsed.private_key || parsed.privateKey || '').replace(/\\n/g, '\n'),
    };

    if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
      const parseError = new Error(
        'FIREBASE_SERVICE_ACCOUNT_KEY is missing project_id, client_email, or private_key',
      );
      parseError.code = 'FIREBASE_CONFIG_INVALID';
      throw parseError;
    }

    return serviceAccount;
  } catch (error) {
    if (error?.code === 'FIREBASE_CONFIG_INVALID') {
      throw error;
    }
    const parseError = new Error('FIREBASE_SERVICE_ACCOUNT_KEY must be valid JSON');
    parseError.code = 'FIREBASE_CONFIG_INVALID';
    throw parseError;
  }
};

const parseServiceAccountFromFields = () => {
  const projectId = trimEnvValue(process.env.FIREBASE_PROJECT_ID);
  const clientEmail = trimEnvValue(process.env.FIREBASE_CLIENT_EMAIL);
  const privateKey = String(process.env.FIREBASE_PRIVATE_KEY || '')
    .replace(/\\n/g, '\n')
    .trim();

  if (!projectId || !clientEmail || !privateKey) return null;

  return {
    projectId,
    clientEmail,
    privateKey,
  };
};

const getServiceAccount = () => {
  const fromJson = parseServiceAccountFromJson();
  if (fromJson) return fromJson;
  return parseServiceAccountFromFields();
};

const initFirebaseApp = () => {
  if (admin.apps.length) {
    return admin.app();
  }

  const serviceAccount = getServiceAccount();
  if (!serviceAccount) return null;

  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.projectId,
  });
};

const verifyViaIdentityToolkit = async (idToken) => {
  const apiKey = trimEnvValue(getFirebasePublicConfig().apiKey);

  if (!apiKey) {
    const configError = new Error('Firebase auth is not configured');
    configError.code = 'FIREBASE_NOT_CONFIGURED';
    throw configError;
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ idToken }),
    },
  );

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const tokenError = new Error('Google token is invalid or expired');
    tokenError.code = 'FIREBASE_TOKEN_INVALID';
    tokenError.details = payload;
    throw tokenError;
  }

  const user = Array.isArray(payload?.users) ? payload.users[0] : null;
  if (!user?.email) {
    const tokenError = new Error('Google token is invalid or expired');
    tokenError.code = 'FIREBASE_TOKEN_INVALID';
    throw tokenError;
  }

  return {
    uid: user.localId,
    email: user.email,
    email_verified: user.emailVerified !== false,
    name: user.displayName || undefined,
    picture: user.photoUrl || undefined,
    firebase: {
      sign_in_provider: user.providerUserInfo?.[0]?.providerId || undefined,
    },
  };
};

const verifyFirebaseIdToken = async (idToken) => {
  const app = initFirebaseApp();
  if (app) {
    return admin.auth(app).verifyIdToken(idToken, true);
  }
  return verifyViaIdentityToolkit(idToken);
};

module.exports = {
  getFirebasePublicConfig,
  verifyFirebaseIdToken,
};
