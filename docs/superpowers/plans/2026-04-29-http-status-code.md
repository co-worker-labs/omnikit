# HTTP Status Code Reference Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browser-based HTTP status code reference tool displaying ~80 IANA official codes plus unofficial platform extensions (Nginx, Cloudflare, IIS) in a searchable, filterable table with expandable detail rows.

**Architecture:** Static data in `libs/httpstatus.ts` with TypeScript interfaces. Single page component (`httpstatus-page.tsx`) with pill-based category filters (NOT NeonTabs), search, and a responsive table with hover/click expandable detail rows. Follows existing reference tool patterns (ASCII Table, HTML Code).

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind CSS 4, React Compiler (no manual memoization), next-intl (3 locales: en, zh-CN, zh-TW)

---

### Task 1: Create the data layer (`libs/httpstatus.ts`)

**Files:**

- Create: `libs/httpstatus.ts`

- [ ] **Step 1: Create the data file with complete status code data**

Write `libs/httpstatus.ts`:

```typescript
export type StatusCategory = "1xx" | "2xx" | "3xx" | "4xx" | "5xx" | "unofficial";

export interface HttpStatusCode {
  code: number;
  name: string;
  description: string;
  spec?: string;
  source?: string;
  popular?: boolean;
  details?: {
    usage: string;
    commonCauses: string[];
  };
}

/**
 * Derive the display category from a status code.
 * Non-IANA codes (Nginx, Cloudflare, IIS) go to "unofficial".
 */
export function getCategory(code: HttpStatusCode): StatusCategory {
  if (code.source && code.source !== "IANA") return "unofficial";
  const n = code.code;
  if (n >= 100 && n < 200) return "1xx";
  if (n >= 200 && n < 300) return "2xx";
  if (n >= 300 && n < 400) return "3xx";
  if (n >= 400 && n < 500) return "4xx";
  if (n >= 500 && n < 600) return "5xx";
  return "unofficial";
}

export function getStatusCodes(): HttpStatusCode[] {
  return [
    // ===== 1xx Informational (IANA) =====
    {
      code: 100,
      name: "Continue",
      description:
        "The server has received the request headers and the client should proceed to send the request body.",
      spec: "RFC 9110",
      source: "IANA",
    },
    {
      code: 101,
      name: "Switching Protocols",
      description:
        "The server is switching protocols as requested by the client, for example to WebSocket.",
      spec: "RFC 9110",
      source: "IANA",
    },
    {
      code: 102,
      name: "Processing",
      description:
        "The server is processing the request but no response is available yet. Used in WebDAV.",
      spec: "RFC 2518",
      source: "IANA",
    },
    {
      code: 103,
      name: "Early Hints",
      description:
        "Used to return some response headers before the final HTTP message, enabling preloading.",
      spec: "RFC 8297",
      source: "IANA",
    },

    // ===== 2xx Success (IANA) =====
    {
      code: 200,
      name: "OK",
      description: "The request has succeeded. The meaning depends on the HTTP method.",
      spec: "RFC 9110",
      source: "IANA",
      popular: true,
      details: {
        usage:
          "Standard response for successful HTTP requests: GET returns the resource, POST returns the result, PUT/PATCH returns the updated resource.",
        commonCauses: [
          "Valid resource found or action completed",
          "Successful API call",
          "Page loaded correctly",
        ],
      },
    },
    {
      code: 201,
      name: "Created",
      description:
        "The request has been fulfilled and a new resource has been created as a result.",
      spec: "RFC 9110",
      source: "IANA",
      popular: true,
      details: {
        usage:
          "Returned after a successful POST request that creates a new resource. The Location header usually contains the URL of the new resource.",
        commonCauses: [
          "New record inserted in database",
          "File uploaded successfully",
          "User registration completed",
        ],
      },
    },
    {
      code: 202,
      name: "Accepted",
      description:
        "The request has been accepted for processing but the processing has not been completed.",
      spec: "RFC 9110",
      source: "IANA",
    },
    {
      code: 203,
      name: "Non-Authoritative Information",
      description:
        "The returned metadata is not exactly the same as available from the origin server, but collected from a local or third-party copy.",
      spec: "RFC 9110",
      source: "IANA",
    },
    {
      code: 204,
      name: "No Content",
      description:
        "The server successfully processed the request but is not returning any content.",
      spec: "RFC 9110",
      source: "IANA",
      popular: true,
      details: {
        usage:
          "Common for DELETE operations or updates where no response body is needed. Also used in preflight CORS responses.",
        commonCauses: [
          "Resource deleted successfully",
          "Form submission acknowledged",
          "Successful update with no return data",
        ],
      },
    },
    {
      code: 205,
      name: "Reset Content",
      description:
        "The server successfully processed the request and asks the client to reset the document view.",
      spec: "RFC 9110",
      source: "IANA",
    },
    {
      code: 206,
      name: "Partial Content",
      description:
        "The server is delivering only part of the resource due to a Range header sent by the client.",
      spec: "RFC 9110",
      source: "IANA",
      popular: true,
      details: {
        usage:
          "Used for resumable downloads and streaming media. The server sends only the requested byte range of a resource.",
        commonCauses: [
          "Range header in request",
          "Video/audio seeking",
          "Large file download with resume support",
        ],
      },
    },
    {
      code: 207,
      name: "Multi-Status",
      description:
        "Conveys information about multiple resources, for situations where multiple status codes might be appropriate. Used in WebDAV.",
      spec: "RFC 4918",
      source: "IANA",
    },
    {
      code: 208,
      name: "Already Reported",
      description:
        "The members of a DAV binding have already been enumerated in a previous reply, and are not being included again. Used in WebDAV.",
      spec: "RFC 5842",
      source: "IANA",
    },
    {
      code: 226,
      name: "IM Used",
      description:
        "The server has fulfilled a GET request for the resource, and the response is a representation of the result of one or more instance-manipulations applied to the current instance.",
      spec: "RFC 3229",
      source: "IANA",
    },

    // ===== 3xx Redirection (IANA) =====
    {
      code: 300,
      name: "Multiple Choices",
      description:
        "The request has more than one possible response. The user agent or user should choose one of them.",
      spec: "RFC 9110",
      source: "IANA",
    },
    {
      code: 301,
      name: "Moved Permanently",
      description:
        "The URL of the requested resource has been changed permanently. The new URL is given in the response.",
      spec: "RFC 9110",
      source: "IANA",
      popular: true,
      details: {
        usage:
          "Used for permanent URL redirects. Search engines update their index to the new URL. Browsers cache this redirect.",
        commonCauses: [
          "Domain name change",
          "HTTP to HTTPS migration",
          "Site restructuring with permanent URL changes",
        ],
      },
    },
    {
      code: 302,
      name: "Found",
      description:
        "The requested resource resides temporarily under a different URL. The client should continue to use the original URL.",
      spec: "RFC 9110",
      source: "IANA",
      popular: true,
      details: {
        usage:
          "Used for temporary redirects. Browsers do not cache this. The method may change from POST to GET (use 307 to preserve method).",
        commonCauses: [
          "Temporary maintenance page",
          "A/B testing redirects",
          "Login redirect to authentication page",
        ],
      },
    },
    {
      code: 303,
      name: "See Other",
      description:
        "The server redirects the client to a different URL to retrieve the requested resource using a GET request.",
      spec: "RFC 9110",
      source: "IANA",
    },
    {
      code: 304,
      name: "Not Modified",
      description:
        "The resource has not been modified since the last request. The client can use its cached version.",
      spec: "RFC 9110",
      source: "IANA",
      popular: true,
      details: {
        usage:
          "Used for caching optimization. The client sends If-Modified-Since or If-None-Match headers and the server responds with 304 if unchanged.",
        commonCauses: [
          "Resource unchanged since last fetch",
          "ETag matches current version",
          "Cache still valid",
        ],
      },
    },
    {
      code: 305,
      name: "Use Proxy",
      description:
        "The requested resource is only available through a proxy. Deprecated due to security concerns.",
      spec: "RFC 9110",
      source: "IANA",
    },
    {
      code: 307,
      name: "Temporary Redirect",
      description:
        "The resource resides temporarily under a different URL. Unlike 302, the HTTP method must not be changed.",
      spec: "RFC 9110",
      source: "IANA",
      popular: true,
      details: {
        usage:
          "Like 302 but preserves the HTTP method (POST stays POST). Used when you need a temporary redirect that keeps the original method.",
        commonCauses: [
          "Temporary redirect with method preservation",
          "API endpoint temporarily moved",
          "Load balancer redirect",
        ],
      },
    },
    {
      code: 308,
      name: "Permanent Redirect",
      description:
        "The resource has been permanently moved to a new URL. Unlike 301, the HTTP method must not be changed.",
      spec: "RFC 7538",
      source: "IANA",
    },

    // ===== 4xx Client Error (IANA) =====
    {
      code: 400,
      name: "Bad Request",
      description:
        "The server cannot or will not process the request due to something perceived as a client error.",
      spec: "RFC 9110",
      source: "IANA",
      popular: true,
      details: {
        usage:
          "Returned when the server cannot understand the request due to malformed syntax, invalid request message framing, or deceptive routing.",
        commonCauses: [
          "Malformed JSON in request body",
          "Invalid query parameters",
          "Request too large for server to parse",
          "Invalid HTTP headers",
        ],
      },
    },
    {
      code: 401,
      name: "Unauthorized",
      description: "Authentication is required and has failed or has not yet been provided.",
      spec: "RFC 9110",
      source: "IANA",
      popular: true,
      details: {
        usage:
          "The request requires user authentication. The response must include a WWW-Authenticate header containing a challenge applicable to the requested resource.",
        commonCauses: [
          "Missing or expired authentication token",
          "Invalid username or password",
          "Session timeout",
          "Missing API key",
        ],
      },
    },
    {
      code: 402,
      name: "Payment Required",
      description:
        "Reserved for future use. Originally intended for digital payment systems but not yet standardized.",
      spec: "RFC 9110",
      source: "IANA",
    },
    {
      code: 403,
      name: "Forbidden",
      description:
        "The server understood the request but refuses to authorize it. The client does not have access rights.",
      spec: "RFC 9110",
      source: "IANA",
      popular: true,
      details: {
        usage:
          "Unlike 401, re-authenticating will make no difference. Access is permanently forbidden. Often indicates insufficient permissions.",
        commonCauses: [
          "Insufficient user role or permissions",
          "IP address blocked or not in allowlist",
          "Directory listing disabled",
          "CORS policy denies cross-origin request",
        ],
      },
    },
    {
      code: 404,
      name: "Not Found",
      description:
        "The server cannot find the requested resource. The URL may be invalid or the resource may not exist.",
      spec: "RFC 9110",
      source: "IANA",
      popular: true,
      details: {
        usage:
          "The most common HTTP error. Indicates the server cannot find the requested resource, either because it never existed or was deleted.",
        commonCauses: [
          "Typo in URL path",
          "Resource was deleted or moved without redirect",
          "Missing route configuration",
          "Broken link on a page",
        ],
      },
    },
    {
      code: 405,
      name: "Method Not Allowed",
      description:
        "The request method is known by the server but is not supported by the target resource.",
      spec: "RFC 9110",
      source: "IANA",
      popular: true,
      details: {
        usage:
          "The HTTP method (GET, POST, PUT, DELETE, etc.) is not supported for this endpoint. The response should include an Allow header listing supported methods.",
        commonCauses: [
          "Using POST on a GET-only endpoint",
          "Using DELETE where not implemented",
          "Incorrect HTTP method in API call",
        ],
      },
    },
    {
      code: 406,
      name: "Not Acceptable",
      description:
        "The server cannot produce a response matching the list of acceptable values defined in the request's proactive content negotiation headers.",
      spec: "RFC 9110",
      source: "IANA",
    },
    {
      code: 407,
      name: "Proxy Authentication Required",
      description:
        "Similar to 401 but authentication is needed to use a proxy. The proxy must return a Proxy-Authenticate header.",
      spec: "RFC 9110",
      source: "IANA",
    },
    {
      code: 408,
      name: "Request Timeout",
      description:
        "The server timed out waiting for the request. The client may repeat the request without modifications.",
      spec: "RFC 9110",
      source: "IANA",
      popular: true,
      details: {
        usage:
          "The server closed the connection because the client took too long to send the complete request. Common with slow uploads or network issues.",
        commonCauses: [
          "Slow network connection",
          "Large file upload timing out",
          "Client-side script hung during request",
          "Server configured with very short timeout",
        ],
      },
    },
    {
      code: 409,
      name: "Conflict",
      description:
        "The request could not be completed due to a conflict with the current state of the target resource.",
      spec: "RFC 9110",
      source: "IANA",
      popular: true,
      details: {
        usage:
          "Indicates a request conflict — usually a resource version mismatch. Common in concurrent edit scenarios (optimistic locking).",
        commonCauses: [
          "Concurrent modification of the same resource",
          "Version mismatch in PUT/PATCH request",
          "Duplicate record creation attempt",
        ],
      },
    },
    {
      code: 410,
      name: "Gone",
      description:
        "The requested resource has been permanently deleted from the server, with no forwarding address.",
      spec: "RFC 9110",
      source: "IANA",
    },
    {
      code: 411,
      name: "Length Required",
      description:
        "The server refuses to accept the request without a defined Content-Length header.",
      spec: "RFC 9110",
      source: "IANA",
    },
    {
      code: 412,
      name: "Precondition Failed",
      description:
        "The server does not meet one of the preconditions specified in the request headers (e.g., If-Match).",
      spec: "RFC 9110",
      source: "IANA",
    },
    {
      code: 413,
      name: "Payload Too Large",
      description:
        "The request entity is larger than limits defined by the server. The server may close the connection or return a Retry-After header.",
      spec: "RFC 9110",
      source: "IANA",
    },
    {
      code: 414,
      name: "URI Too Long",
      description:
        "The URI requested by the client is longer than the server is willing to interpret.",
      spec: "RFC 9110",
      source: "IANA",
    },
    {
      code: 415,
      name: "Unsupported Media Type",
      description:
        "The server refuses to accept the request because the payload format is in an unsupported format.",
      spec: "RFC 9110",
      source: "IANA",
    },
    {
      code: 416,
      name: "Range Not Satisfiable",
      description:
        "The server cannot serve the requested byte range. The Range header may be outside the size of the target resource.",
      spec: "RFC 9110",
      source: "IANA",
    },
    {
      code: 417,
      name: "Expectation Failed",
      description: "The server cannot meet the requirements of the Expect request header field.",
      spec: "RFC 9110",
      source: "IANA",
    },
    {
      code: 418,
      name: "I'm a teapot",
      description:
        "The server refuses to brew coffee because it is, permanently, a teapot. An April Fools' joke defined in RFC 2324 (HTCPCP).",
      spec: "RFC 2324",
      source: "IANA",
    },
    {
      code: 421,
      name: "Misdirected Request",
      description:
        "The request was directed at a server that is not able to produce a response. Used in HTTP/2.",
      spec: "RFC 9110",
      source: "IANA",
    },
    {
      code: 422,
      name: "Unprocessable Entity",
      description:
        "The server understands the content type and syntax but was unable to process the contained instructions. Used in WebDAV.",
      spec: "RFC 4918",
      source: "IANA",
    },
    {
      code: 423,
      name: "Locked",
      description: "The resource being accessed is locked. Used in WebDAV.",
      spec: "RFC 4918",
      source: "IANA",
    },
    {
      code: 424,
      name: "Failed Dependency",
      description:
        "The request failed because it depended on another request that also failed. Used in WebDAV.",
      spec: "RFC 4918",
      source: "IANA",
    },
    {
      code: 425,
      name: "Too Early",
      description:
        "The server is unwilling to risk processing a request that might be replayed, which creates potential for replay attacks.",
      spec: "RFC 8470",
      source: "IANA",
    },
    {
      code: 426,
      name: "Upgrade Required",
      description:
        "The server refuses to perform the request using the current protocol but might do so after the client upgrades to a different protocol.",
      spec: "RFC 9110",
      source: "IANA",
    },
    {
      code: 428,
      name: "Precondition Required",
      description:
        "The origin server requires the request to be conditional to prevent the 'lost update' problem.",
      spec: "RFC 6585",
      source: "IANA",
    },
    {
      code: 429,
      name: "Too Many Requests",
      description:
        "The client has sent too many requests in a given amount of time (rate limiting).",
      spec: "RFC 6585",
      source: "IANA",
      popular: true,
      details: {
        usage:
          "Used for rate limiting. The response usually includes a Retry-After header indicating how long to wait before making a new request.",
        commonCauses: [
          "Exceeded API rate limit",
          "Burst of requests from a client",
          "DDoS protection triggered",
          "Scraping bot detected",
        ],
      },
    },
    {
      code: 431,
      name: "Request Header Fields Too Large",
      description:
        "The server is unwilling to process the request because its header fields are too large.",
      spec: "RFC 6585",
      source: "IANA",
    },
    {
      code: 451,
      name: "Unavailable For Legal Reasons",
      description:
        "The server is denying access to the resource as a consequence of a legal demand.",
      spec: "RFC 7725",
      source: "IANA",
    },

    // ===== 5xx Server Error (IANA) =====
    {
      code: 500,
      name: "Internal Server Error",
      description:
        "A generic error message indicating the server encountered an unexpected condition that prevented it from fulfilling the request.",
      spec: "RFC 9110",
      source: "IANA",
      popular: true,
      details: {
        usage:
          "The server encountered an unexpected error. This is a catch-all for server-side issues that don't fit other 5xx codes.",
        commonCauses: [
          "Unhandled exception in server code",
          "Database connection failure",
          "Misconfiguration of server",
          "Memory exhaustion",
        ],
      },
    },
    {
      code: 501,
      name: "Not Implemented",
      description:
        "The server does not support the functionality required to fulfill the request. This is the appropriate response when the server does not recognize the request method.",
      spec: "RFC 9110",
      source: "IANA",
    },
    {
      code: 502,
      name: "Bad Gateway",
      description:
        "The server, while acting as a gateway or proxy, received an invalid response from the upstream server.",
      spec: "RFC 9110",
      source: "IANA",
      popular: true,
      details: {
        usage:
          "Common when using reverse proxies (Nginx, Cloudflare) — the upstream server returned an invalid or malformed response.",
        commonCauses: [
          "Upstream server crashed or returned invalid response",
          "Backend application error under proxy",
          "DNS resolution failure for upstream",
          "Firewall blocking connection",
        ],
      },
    },
    {
      code: 503,
      name: "Service Unavailable",
      description:
        "The server is currently unable to handle the request due to temporary overloading or maintenance.",
      spec: "RFC 9110",
      source: "IANA",
      popular: true,
      details: {
        usage:
          "The server is temporarily unavailable, usually due to overload or maintenance. A Retry-After header should indicate when to retry.",
        commonCauses: [
          "Server under heavy load",
          "Planned maintenance window",
          "Application pool recycling",
          "Database connection pool exhausted",
        ],
      },
    },
    {
      code: 504,
      name: "Gateway Timeout",
      description:
        "The server, while acting as a gateway or proxy, did not receive a timely response from the upstream server.",
      spec: "RFC 9110",
      source: "IANA",
      popular: true,
      details: {
        usage:
          "The upstream server did not respond in time. Common with slow backend processes or overloaded services behind a proxy.",
        commonCauses: [
          "Slow database query timing out",
          "Upstream server overloaded and not responding",
          "Long-running API request behind proxy",
          "Network latency between proxy and upstream",
        ],
      },
    },
    {
      code: 505,
      name: "HTTP Version Not Supported",
      description: "The server does not support the HTTP protocol version used in the request.",
      spec: "RFC 9110",
      source: "IANA",
    },
    {
      code: 506,
      name: "Variant Also Negotiates",
      description:
        "Transparent content negotiation for the request results in a circular reference.",
      spec: "RFC 2295",
      source: "IANA",
    },
    {
      code: 507,
      name: "Insufficient Storage",
      description:
        "The server is unable to store the representation needed to complete the request. Used in WebDAV.",
      spec: "RFC 4918",
      source: "IANA",
    },
    {
      code: 508,
      name: "Loop Detected",
      description:
        "The server detected an infinite loop while processing the request. Used in WebDAV.",
      spec: "RFC 5842",
      source: "IANA",
    },
    {
      code: 510,
      name: "Not Extended",
      description: "Further extensions to the request are required for the server to fulfill it.",
      spec: "RFC 2774",
      source: "IANA",
    },
    {
      code: 511,
      name: "Network Authentication Required",
      description:
        "The client needs to authenticate to gain network access. Used by intercepting proxies to control access to the network.",
      spec: "RFC 6585",
      source: "IANA",
    },

    // ===== Nginx Custom Codes =====
    {
      code: 444,
      name: "Connection Closed Without Response",
      description:
        "Nginx closes the connection without sending any response headers. Used to block malicious requests or drop connections silently.",
      source: "Nginx",
    },
    {
      code: 494,
      name: "Request Header Too Large",
      description:
        "Nginx returns this when the client sent too large a request header or too many headers.",
      source: "Nginx",
    },
    {
      code: 495,
      name: "SSL Certificate Error",
      description: "Nginx returns this when the client SSL certificate verification fails.",
      source: "Nginx",
    },
    {
      code: 496,
      name: "SSL Certificate Required",
      description: "Nginx returns this when the client did not present a required SSL certificate.",
      source: "Nginx",
    },
    {
      code: 497,
      name: "HTTP Request Sent to HTTPS Port",
      description: "Nginx returns this when a plain HTTP request was sent to an HTTPS-only port.",
      source: "Nginx",
    },
    {
      code: 499,
      name: "Client Closed Request",
      description:
        "Nginx logs this when the client closes the connection before the server finishes processing the request. Commonly seen with impatient users or connection drops.",
      source: "Nginx",
    },

    // ===== Cloudflare Custom Codes =====
    {
      code: 520,
      name: "Web Server Returned an Unknown Error",
      description:
        "Cloudflare returns this when the origin server returns an empty, unknown, or unexpected response.",
      source: "Cloudflare",
    },
    {
      code: 521,
      name: "Web Server Is Down",
      description:
        "Cloudflare returns this when the origin server refuses connections from Cloudflare.",
      source: "Cloudflare",
    },
    {
      code: 522,
      name: "Connection Timed Out",
      description:
        "Cloudflare returns this when the TCP connection to the origin server times out.",
      source: "Cloudflare",
    },
    {
      code: 523,
      name: "Origin Is Unreachable",
      description:
        "Cloudflare returns this when the origin server is unreachable (DNS resolution failure or network issue).",
      source: "Cloudflare",
    },
    {
      code: 524,
      name: "A Timeout Occurred",
      description:
        "Cloudflare returns this when it successfully connected to the origin but the origin did not provide a timely HTTP response.",
      source: "Cloudflare",
    },
    {
      code: 525,
      name: "SSL Handshake Failed",
      description:
        "Cloudflare returns this when the SSL/TLS handshake between Cloudflare and the origin server fails.",
      source: "Cloudflare",
    },
    {
      code: 526,
      name: "Invalid SSL Certificate",
      description:
        "Cloudflare returns this when the origin server's SSL certificate is invalid or cannot be validated.",
      source: "Cloudflare",
    },
    {
      code: 527,
      name: "Railgun Error",
      description:
        "Cloudflare returns this when the connection between Cloudflare and the origin Railgun server is interrupted.",
      source: "Cloudflare",
    },
    {
      code: 528,
      name: "Railgun WAN Connection Failed",
      description: "Cloudflare returns this when the Railgun WAN connection times out or fails.",
      source: "Cloudflare",
    },
    {
      code: 529,
      name: "Site is Overloaded",
      description:
        "Cloudflare returns this when the origin web server is overloaded or under heavy load.",
      source: "Cloudflare",
    },
    {
      code: 530,
      name: "Origin DNS Error",
      description:
        "Cloudflare returns this when the DNS lookup for the origin server's hostname fails.",
      source: "Cloudflare",
    },

    // ===== IIS Custom Codes =====
    {
      code: 440,
      name: "Login Time-out",
      description:
        "IIS returns this when the client's login session has expired and re-authentication is required.",
      source: "IIS",
    },
    {
      code: 449,
      name: "Retry With",
      description:
        "IIS returns this when the request should be retried after performing an appropriate action (such as providing additional credentials or metadata).",
      source: "IIS",
    },
  ];
}
```

- [ ] **Step 2: Verify the file has no TypeScript errors**

Run: `npx tsc --noEmit --strict libs/httpstatus.ts`
Expected: No errors

- [ ] **Step 3: Run lint on the file**

Run: `npx eslint libs/httpstatus.ts`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add libs/httpstatus.ts
git commit -m "feat: add HTTP status code data layer with 82 codes"
```

---

### Task 2: Create i18n translation files

**Files:**

- Create: `public/locales/en/httpstatus.json`
- Create: `public/locales/zh-CN/httpstatus.json`
- Create: `public/locales/zh-TW/httpstatus.json`

- [ ] **Step 1: Create English translation file**

Write `public/locales/en/httpstatus.json`:

```json
{
  "description": {
    "text": "Complete HTTP status code reference covering all IANA official codes from RFC 9110 and related specifications — including WebDAV (RFC 4918), additional HTTP status codes (RFC 6585), 308 Permanent Redirect (RFC 7538), 451 Unavailable For Legal Reasons (RFC 7725), and Early Hints (RFC 8297). Also includes unofficial platform extensions from Nginx, Cloudflare, and IIS. Each code shows its description, RFC reference, and commonly used codes include usage scenarios and common causes for quick troubleshooting."
  },
  "tip": "Hover over any row on desktop or tap on mobile to see usage details and common causes.",
  "searchPlaceholder": "Search by code, name, or description...",
  "noResults": "No results found",
  "categories": {
    "all": "All",
    "1xx": "1xx Informational",
    "2xx": "2xx Success",
    "3xx": "3xx Redirection",
    "4xx": "4xx Client Error",
    "5xx": "5xx Server Error",
    "unofficial": "Unofficial"
  },
  "tableHeaders": {
    "code": "Code",
    "name": "Name",
    "description": "Description",
    "spec": "Spec",
    "source": "Source"
  },
  "detailLabels": {
    "usage": "Usage",
    "commonCauses": "Common Causes"
  }
}
```

- [ ] **Step 2: Create Simplified Chinese translation file**

Write `public/locales/zh-CN/httpstatus.json`:

```json
{
  "description": {
    "text": "完整的 HTTP 状态码参考，涵盖 RFC 9110 及相关规范中所有 IANA 官方状态码——包括 WebDAV（RFC 4918）、附加 HTTP 状态码（RFC 6585）、308 永久重定向（RFC 7538）、451 因法律原因不可用（RFC 7725）以及早期提示（RFC 8297）。同时包含 Nginx、Cloudflare 和 IIS 的非官方平台扩展。每个状态码都显示其描述和 RFC 参考，常用状态码还包括使用场景和常见原因，便于快速排查问题。"
  },
  "tip": "桌面端悬停或移动端点击任意行，可查看使用详情和常见原因。",
  "searchPlaceholder": "按状态码、名称或描述搜索...",
  "noResults": "未找到结果",
  "categories": {
    "all": "全部",
    "1xx": "1xx 信息响应",
    "2xx": "2xx 成功",
    "3xx": "3xx 重定向",
    "4xx": "4xx 客户端错误",
    "5xx": "5xx 服务端错误",
    "unofficial": "非官方"
  },
  "tableHeaders": {
    "code": "状态码",
    "name": "名称",
    "description": "描述",
    "spec": "规范",
    "source": "来源"
  },
  "detailLabels": {
    "usage": "使用场景",
    "commonCauses": "常见原因"
  }
}
```

- [ ] **Step 3: Create Traditional Chinese translation file**

Write `public/locales/zh-TW/httpstatus.json`:

```json
{
  "description": {
    "text": "完整的 HTTP 狀態碼參考，涵蓋 RFC 9110 及相關規範中所有 IANA 官方狀態碼——包括 WebDAV（RFC 4918）、附加 HTTP 狀態碼（RFC 6585）、308 永久重新導向（RFC 7538）、451 因法律原因不可用（RFC 7725）以及早期提示（RFC 8297）。同時包含 Nginx、Cloudflare 和 IIS 的非官方平台擴展。每個狀態碼都顯示其描述和 RFC 參考，常用狀態碼還包括使用場景和常見原因，便於快速排查問題。"
  },
  "tip": "桌面端懸停或行動端點擊任意行，可檢視使用詳情和常見原因。",
  "searchPlaceholder": "按狀態碼、名稱或描述搜尋...",
  "noResults": "未找到結果",
  "categories": {
    "all": "全部",
    "1xx": "1xx 資訊回應",
    "2xx": "2xx 成功",
    "3xx": "3xx 重新導向",
    "4xx": "4xx 用戶端錯誤",
    "5xx": "5xx 伺服器錯誤",
    "unofficial": "非官方"
  },
  "tableHeaders": {
    "code": "狀態碼",
    "name": "名稱",
    "description": "描述",
    "spec": "規範",
    "source": "來源"
  },
  "detailLabels": {
    "usage": "使用場景",
    "commonCauses": "常見原因"
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add public/locales/en/httpstatus.json public/locales/zh-CN/httpstatus.json public/locales/zh-TW/httpstatus.json
git commit -m "feat: add i18n translations for HTTP status code tool"
```

---

### Task 3: Register the tool in tools registry and translation files

**Files:**

- Modify: `libs/tools.ts` (add httpstatus entry)
- Modify: `public/locales/en/tools.json` (add httpstatus section)
- Modify: `public/locales/zh-CN/tools.json` (add httpstatus section)
- Modify: `public/locales/zh-TW/tools.json` (add httpstatus section)

- [ ] **Step 1: Add httpstatus to `libs/tools.ts`**

Read `libs/tools.ts` first, then add the entry after the existing `htmlcode` line:

Change:

```typescript
  { key: "htmlcode", path: "/htmlcode" },
  { key: "color", path: "/color" },
```

To:

```typescript
  { key: "htmlcode", path: "/htmlcode" },
  { key: "httpstatus", path: "/httpstatus" },
  { key: "color", path: "/color" },
```

- [ ] **Step 2: Add httpstatus to English `tools.json`**

Read `public/locales/en/tools.json` first, then add the httpstatus section. Add it after the `htmlcode` entry:

```jsonc
// Inside the JSON object, add:
"httpstatus": {
  "title": "HTTP Status Code Reference - Complete Guide",
  "shortTitle": "HTTP Status",
  "description": "Complete HTTP status code reference with descriptions, RFC references, and usage guides. Covers IANA official and unofficial codes."
}
```

- [ ] **Step 3: Add httpstatus to Simplified Chinese `tools.json`**

Add after `htmlcode` entry in `public/locales/zh-CN/tools.json`:

```jsonc
"httpstatus": {
  "title": "HTTP 状态码参考 - 完整指南",
  "shortTitle": "HTTP 状态码",
  "description": "完整的 HTTP 状态码参考，包含描述、RFC 引用和使用指南。涵盖 IANA 官方和非官方状态码。"
}
```

- [ ] **Step 4: Add httpstatus to Traditional Chinese `tools.json`**

Add after `htmlcode` entry in `public/locales/zh-TW/tools.json`:

```jsonc
"httpstatus": {
  "title": "HTTP 狀態碼參考 - 完整指南",
  "shortTitle": "HTTP 狀態碼",
  "description": "完整的 HTTP 狀態碼參考，包含描述、RFC 引用和使用指南。涵蓋 IANA 官方和非官方狀態碼。"
}
```

- [ ] **Step 5: Commit**

```bash
git add libs/tools.ts public/locales/en/tools.json public/locales/zh-CN/tools.json public/locales/zh-TW/tools.json
git commit -m "feat: register HTTP status code tool in registry and i18n"
```

---

### Task 4: Create route entry page

**Files:**

- Create: `app/[locale]/httpstatus/page.tsx`

- [ ] **Step 1: Create the route entry file**

Write `app/[locale]/httpstatus/page.tsx`. Follows the exact same pattern as `app/[locale]/ascii/page.tsx`:

```tsx
import { getTranslations } from "next-intl/server";
import { generatePageMeta } from "../../../libs/seo";
import HttpStatusPage from "./httpstatus-page";

const PATH = "/httpstatus";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "tools" });
  return generatePageMeta({
    locale,
    path: PATH,
    title: t("httpstatus.title"),
    description: t("httpstatus.description"),
  });
}

export default function HttpStatusRoute() {
  return <HttpStatusPage />;
}
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No errors related to this file

- [ ] **Step 3: Commit**

```bash
git add app/[locale]/httpstatus/page.tsx
git commit -m "feat: add HTTP status code route entry with SEO metadata"
```

---

### Task 5: Create the page component

**Files:**

- Create: `app/[locale]/httpstatus/httpstatus-page.tsx`

This is the main component file. It contains: collapsible description, tip box, search bar, category filter pills, expandable status code table, and count display.

- [ ] **Step 1: Create the page component file**

Write `app/[locale]/httpstatus/httpstatus-page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Search, ChevronDown, ChevronUp } from "lucide-react";
import Layout from "../../../components/layout";
import { Badge } from "../../../components/ui/badge";
import { StyledInput } from "../../../components/ui/input";
import { useIsMobile } from "../../../hooks/use-is-mobile";
import { HttpStatusCode, getCategory, getStatusCodes } from "../../../libs/httpstatus";

const statusCodes = getStatusCodes();

const CATEGORIES = ["all", "1xx", "2xx", "3xx", "4xx", "5xx", "unofficial"] as const;

const categoryBadgeVariant: Record<string, "default" | "cyan" | "purple" | "danger"> = {
  "1xx": "default",
  "2xx": "cyan",
  "3xx": "purple",
  "4xx": "danger",
  "5xx": "danger",
  unofficial: "default",
};

const sourceBadgeVariant: Record<string, "default" | "cyan" | "purple"> = {
  IANA: "default",
  Cloudflare: "cyan",
  Nginx: "purple",
  IIS: "purple",
};

function StatusCodeTable() {
  const t = useTranslations("httpstatus");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [expandedCode, setExpandedCode] = useState<number | null>(null);
  const isMobile = useIsMobile();

  // Category filter first, then search filter
  const byCategory =
    category === "all" ? statusCodes : statusCodes.filter((c) => getCategory(c) === category);

  const q = search.trim().toLowerCase();
  const filtered = !q
    ? byCategory
    : byCategory.filter((c) => {
        return (
          c.code.toString().includes(q) ||
          c.name.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q)
        );
      });

  const handleRowHover = (code: number) => {
    if (!isMobile) {
      setExpandedCode(code);
    }
  };

  const handleRowLeave = () => {
    if (!isMobile) {
      setExpandedCode(null);
    }
  };

  const handleRowClick = (code: number) => {
    if (isMobile) {
      setExpandedCode(expandedCode === code ? null : code);
    }
  };

  return (
    <div>
      {/* Search Bar */}
      <div className="relative mb-3">
        <StyledInput
          placeholder={t("searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted pointer-events-none"
          size={16}
        />
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap gap-2 mb-4">
        {CATEGORIES.map((cat) => {
          const isActive = category === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors duration-150 ${
                isActive
                  ? "bg-accent-cyan text-bg-base"
                  : "bg-bg-elevated text-fg-secondary hover:bg-bg-elevated/80"
              }`}
            >
              {t(`categories.${cat}`)}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border-default overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full" role="grid">
            <thead className="bg-bg-elevated/40">
              <tr className="border-b border-border-default">
                <th className="py-2.5 px-3 text-fg-muted text-xs font-mono font-medium uppercase tracking-wider text-left">
                  {t("tableHeaders.code")}
                </th>
                <th className="py-2.5 px-3 text-fg-muted text-xs font-mono font-medium uppercase tracking-wider text-left">
                  {t("tableHeaders.name")}
                </th>
                <th className="py-2.5 px-3 text-fg-muted text-xs font-mono font-medium uppercase tracking-wider text-left">
                  {t("tableHeaders.description")}
                </th>
                <th className="py-2.5 px-3 text-fg-muted text-xs font-mono font-medium uppercase tracking-wider text-left">
                  {t("tableHeaders.spec")}
                </th>
                <th className="py-2.5 px-3 text-fg-muted text-xs font-mono font-medium uppercase tracking-wider text-left">
                  {t("tableHeaders.source")}
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((data, idx) => {
                const isLast = idx === filtered.length - 1;
                const cat = getCategory(data);
                const isExpanded = expandedCode === data.code;
                return (
                  <>
                    <tr
                      key={data.code}
                      role="row"
                      tabIndex={0}
                      aria-expanded={isExpanded}
                      onMouseEnter={() => handleRowHover(data.code)}
                      onMouseLeave={handleRowLeave}
                      onClick={() => handleRowClick(data.code)}
                      onFocus={() => setExpandedCode(data.code)}
                      className={`border-b border-border-default transition-colors duration-150 hover:bg-bg-elevated/60 cursor-pointer outline-none ${
                        isLast ? "border-b-0" : ""
                      } ${isExpanded ? "bg-bg-elevated/60" : ""}`}
                    >
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          {data.popular && (
                            <span
                              className="text-accent-cyan text-[8px] leading-none"
                              aria-hidden="true"
                            >
                              ●
                            </span>
                          )}
                          <Badge
                            variant={categoryBadgeVariant[cat]}
                            className={`font-mono ${cat === "unofficial" ? "italic" : ""}`}
                          >
                            {data.code}
                          </Badge>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-sm text-fg-primary font-medium">
                        {data.name}
                      </td>
                      <td className="py-2.5 px-3 text-sm text-fg-secondary">{data.description}</td>
                      <td className="py-2.5 px-3">
                        {data.spec ? (
                          <span className="font-mono text-accent-cyan text-xs">{data.spec}</span>
                        ) : (
                          <span className="text-fg-muted text-xs">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge variant={sourceBadgeVariant[data.source || "IANA"]}>
                          {data.source || "IANA"}
                        </Badge>
                      </td>
                    </tr>
                    {/* Expandable Detail Row */}
                    {isExpanded && data.details && (
                      <tr
                        key={`${data.code}-detail`}
                        role="row"
                        aria-live="polite"
                        className="bg-bg-elevated/30"
                      >
                        <td colSpan={5} className="py-3 px-6">
                          <div className="space-y-3">
                            <div>
                              <span className="text-xs font-semibold uppercase tracking-wider text-accent-cyan">
                                {t("detailLabels.usage")}
                              </span>
                              <p className="mt-1 text-sm text-fg-secondary leading-relaxed">
                                {data.details.usage}
                              </p>
                            </div>
                            <div>
                              <span className="text-xs font-semibold uppercase tracking-wider text-accent-cyan">
                                {t("detailLabels.commonCauses")}
                              </span>
                              <ul className="mt-1 list-disc list-inside space-y-0.5">
                                {data.details.commonCauses.map((cause, i) => (
                                  <li key={i} className="text-sm text-fg-secondary">
                                    {cause}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-fg-muted text-sm text-center">
                    {t("noResults")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Count Display */}
      <div className="mt-2 text-xs text-fg-muted text-right">
        {filtered.length} / {statusCodes.length} status codes
      </div>
    </div>
  );
}

function Description() {
  const t = useTranslations("httpstatus");
  const tc = useTranslations("common");
  const [expanded, setExpanded] = useState(false);

  return (
    <section id="description" className="py-3">
      <div className="relative">
        <div
          className={`overflow-hidden transition-all duration-300 ${
            expanded ? "max-h-[500px]" : "max-h-20"
          }`}
        >
          <p className="text-fg-secondary text-sm leading-8 indent-12">{t("description.text")}</p>
        </div>
        {!expanded && (
          <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-bg-base to-transparent pointer-events-none" />
        )}
      </div>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="mt-1 flex items-center gap-1 text-xs text-accent-cyan hover:text-accent-cyan/80 transition-colors"
      >
        {expanded ? (
          <>
            <ChevronUp size={14} />
            {tc("showLess")}
          </>
        ) : (
          <>
            <ChevronDown size={14} />
            {tc("showMore")}
          </>
        )}
      </button>
    </section>
  );
}

export default function HttpStatusPage() {
  const t = useTranslations("tools");
  const th = useTranslations("httpstatus");

  return (
    <Layout title={t("httpstatus.shortTitle")}>
      <div className="container mx-auto px-4 pt-3 pb-6">
        <Description />
        <div className="flex items-start gap-2 border-l-2 border-accent-cyan bg-accent-cyan-dim/30 rounded-r-lg p-3 my-4">
          <span className="text-sm text-fg-secondary leading-relaxed">{th("tip")}</span>
        </div>
        <section>
          <StatusCodeTable />
        </section>
      </div>
    </Layout>
  );
}
```

- [ ] **Step 2: Run TypeScript type check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Run ESLint**

Run: `npx eslint app/[locale]/httpstatus/httpstatus-page.tsx --fix`
Expected: No errors

- [ ] **Step 4: Run LSP diagnostics on the new files**

Run: LSP diagnostics on `app/[locale]/httpstatus/`
Expected: No errors or warnings

- [ ] **Step 5: Verify dev server starts**

Run: `npm run dev`
Expected: Dev server starts without errors. Navigate to `http://localhost:3000/httpstatus` and verify the page renders.

- [ ] **Step 6: Commit**

```bash
git add app/[locale]/httpstatus/httpstatus-page.tsx
git commit -m "feat: implement HTTP status code page with search, category filters, and expandable details"
```

---

### Task 6: Final verification

- [ ] **Step 1: Build the project**

Run: `npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 2: Verify all three locales work**

Navigate to:

- `http://localhost:3000/httpstatus` (English)
- `http://localhost:3000/zh-CN/httpstatus` (Simplified Chinese)
- `http://localhost:3000/zh-TW/httpstatus` (Traditional Chinese)

Expected: All three render correctly with proper translations.

- [ ] **Step 3: Manual QA checklist**

- [ ] Search "404" — shows only codes matching 404 in code/name/description
- [ ] Filter to "4xx" + search "not" — shows only 4xx codes matching "not"
- [ ] Filter to "Unofficial" — shows Nginx, Cloudflare, IIS codes
- [ ] Hover over 200 row on desktop — expands detail row
- [ ] Click 200 row on mobile — toggles detail row
- [ ] Tab through rows with keyboard — expands detail of focused row
- [ ] Click "show more" — description expands full text
- [ ] Count display shows correct "{filtered} / {total} status codes"
- [ ] Popular codes show ● indicator next to code badge
- [ ] IANA codes show RFC reference, unofficial codes show "—"
- [ ] Source badges colored correctly (IANA=gray, Cloudflare=cyan, Nginx=purple)
- [ ] Empty search shows "No results found" message
