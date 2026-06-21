(function () {
  "use strict";

  var storageKey = "ks_attribution_last_visit_v1";
  var utmParams = [
    ["utm_source", "source", 80],
    ["utm_medium", "medium", 80],
    ["utm_campaign", "campaign", 120],
    ["utm_content", "content", 120],
    ["utm_term", "term", 120],
  ];

  function sanitizeValue(value, maxLength) {
    if (typeof value !== "string") return "";
    return value
      .trim()
      .slice(0, maxLength)
      .replace(/[^a-zA-Z0-9_.:/@+\-\s]/g, "")
      .trim();
  }

  function referrerHost() {
    if (!document.referrer) return null;
    try {
      return new URL(document.referrer).host || null;
    } catch (_error) {
      return null;
    }
  }

  function endpointUrl() {
    if (window.location.hostname === "kriegspiel.org" || window.location.hostname.endsWith(".kriegspiel.org")) {
      return "https://app.kriegspiel.org/api/analytics/visit";
    }
    return "/api/analytics/visit";
  }

  function buildPayload() {
    var params = new URLSearchParams(window.location.search || "");
    var utm = {};

    utmParams.forEach(function (entry) {
      var value = sanitizeValue(params.get(entry[0]) || "", entry[2]);
      if (value) utm[entry[1]] = value;
    });

    if (!Object.keys(utm).length) return null;

    return {
      landing_path: window.location.pathname + window.location.search + window.location.hash,
      referrer_host: referrerHost(),
      utm: utm,
    };
  }

  function readSignature() {
    try {
      return window.sessionStorage.getItem(storageKey);
    } catch (_error) {
      return null;
    }
  }

  function writeSignature(signature) {
    try {
      window.sessionStorage.setItem(storageKey, signature);
    } catch (_error) {
      // Ignore storage denial; attribution capture should never block browsing.
    }
  }

  var payload = buildPayload();
  if (!payload || typeof window.fetch !== "function") return;

  var signature = JSON.stringify(payload);
  if (readSignature() === signature) return;

  window.fetch(endpointUrl(), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: signature,
  }).then(function () {
    writeSignature(signature);
  }).catch(function () {});
}());
