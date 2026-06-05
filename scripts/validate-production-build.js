const API_URL = process.env.NEXT_PUBLIC_API_URL;
const IS_PROD = process.env.NODE_ENV === "production" || process.env.NEXT_PUBLIC_ENVIRONMENT === "production";

if (IS_PROD) {
  if (!API_URL) {
    console.error("❌ CRITICAL SECURITY ERROR: NEXT_PUBLIC_API_URL environment variable is not defined for production.");
    process.exit(1);
  }
  if (!API_URL.startsWith("https://")) {
    console.error(`❌ CRITICAL SECURITY ERROR: Production builds must use HTTPS API endpoint.\n   Current API URL: ${API_URL}`);
    process.exit(1);
  }
}

console.log("✓ Build security validations passed.");
process.exit(0);
