export const ENV = {
  API_URL:
    process.env.NEXT_PUBLIC_API_URL ||
    (typeof window !== "undefined"
      ? `http://${window.location.hostname}:4000/api`
      : "https://folders-laid-commercial-councils.trycloudflare.com/api"),
  IS_PROD:
    process.env.NODE_ENV === "production" ||
    process.env.NEXT_PUBLIC_ENVIRONMENT === "production",
};
