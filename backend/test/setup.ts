// Env read at module load by the controllers — must be set before the app is imported.
process.env.JWT_ACCESS_SECRET = "test-access-secret";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret";
process.env.API_URL = "http://auth.test";
process.env.CLIENT_URL = "http://dashboard.test";
process.env.GOOGLE_CLIENT_ID = "google-client-id";
process.env.GOOGLE_CLIENT_SECRET = "google-client-secret";
