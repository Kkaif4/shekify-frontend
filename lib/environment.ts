const getApiUrl = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== "undefined") {
    const isCapacitor =
      (window as any).Capacitor !== undefined ||
      window.location.protocol === "capacitor:";
    if (isCapacitor) {
      // Inside Capacitor native container. If running on emulator, hostname is localhost.
      if (
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1"
      ) {
        return "http://10.0.2.2:4000/api";
      }
    }
    return `http://${window.location.hostname}:4000/api`;
  }
  return "https://cut-scanners-echo-sciences.trycloudflare.com/api";
};

export const ENV = {
  API_URL: getApiUrl(),
  IS_PROD:
    process.env.NODE_ENV === "production" ||
    process.env.NEXT_PUBLIC_ENVIRONMENT === "production",
};
