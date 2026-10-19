// Configuration for CryptoSim API and WebSocket endpoints
// Dynamically adapts to EC2 IP/domain, Docker container, localhost, or manual override.
(function () {
    // Optional manual override: If set, this address will be used regardless of browser URL.
    // Example: "54.210.12.34:8000" or "api.mydomain.com"
    const MANUAL_OVERRIDE_HOST = "";

    const isHttp = window.location.protocol.startsWith("http");
    const isHttps = window.location.protocol === "https:";
    const protocolHttp = isHttps ? "https:" : "http:";
    const protocolWs = isHttps ? "wss:" : "ws:";

    let apiBase = "";
    let wsBase = "";

    if (MANUAL_OVERRIDE_HOST && MANUAL_OVERRIDE_HOST.trim() !== "") {
        apiBase = `${protocolHttp}//${MANUAL_OVERRIDE_HOST.trim()}`;
        wsBase = `${protocolWs}//${MANUAL_OVERRIDE_HOST.trim()}`;
    } else if (isHttp) {
        const hostname = window.location.hostname;
        const port = window.location.port;

        // If running via a local frontend dev server (e.g. Live Server on port 5500)
        // redirect backend requests to default FastAPI port 8000
        if (port && port !== "8000" && port !== "80" && port !== "443" && (hostname === "localhost" || hostname === "127.0.0.1")) {
            apiBase = `http://${hostname}:8000`;
            wsBase = `ws://${hostname}:8000`;
        } else {
            // When hosted on an EC2 instance, Docker, or in production:
            // Use window.location.host (hostname + current port if any)
            apiBase = `${protocolHttp}//${window.location.host}`;
            wsBase = `${protocolWs}//${window.location.host}`;
        }
    } else {
        // Fallback when accessed directly via file://
        apiBase = "http://127.0.0.1:8000";
        wsBase = "ws://127.0.0.1:8000";
    }

    const CONFIG = {
        API_BASE_URL: apiBase,
        WS_BASE_URL: wsBase,
    };

    window.APP_CONFIG = CONFIG;
})();

