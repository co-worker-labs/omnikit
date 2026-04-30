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

export function getCategory(status: HttpStatusCode): StatusCategory {
  if (status.source !== "IANA") {
    return "unofficial";
  }

  if (status.code >= 100 && status.code < 200) {
    return "1xx";
  } else if (status.code >= 200 && status.code < 300) {
    return "2xx";
  } else if (status.code >= 300 && status.code < 400) {
    return "3xx";
  } else if (status.code >= 400 && status.code < 500) {
    return "4xx";
  } else if (status.code >= 500 && status.code < 600) {
    return "5xx";
  }

  return "unofficial";
}

export function getStatusCodes(): HttpStatusCode[] {
  return [
    // 1xx - Informational
    {
      code: 100,
      name: "Continue",
      description:
        "The server has received the request headers and the client should proceed to send the request body.",
      spec: "RFC 9110",
      source: "IANA",
      popular: false,
    },
    {
      code: 101,
      name: "Switching Protocols",
      description: "The server is switching protocols as requested by the client.",
      spec: "RFC 9110",
      source: "IANA",
      popular: false,
    },
    {
      code: 102,
      name: "Processing",
      description:
        "The server has received and is processing the request, but no response is available yet.",
      spec: "RFC 2518",
      source: "IANA",
      popular: false,
    },
    {
      code: 103,
      name: "Early Hints",
      description: "Used to return some response headers before final HTTP message.",
      spec: "RFC 8297",
      source: "IANA",
      popular: false,
    },

    // 2xx - Success
    {
      code: 200,
      name: "OK",
      description: "The request succeeded.",
      spec: "RFC 9110",
      source: "IANA",
      popular: true,
      details: {
        usage: "Standard response for successful HTTP requests",
        commonCauses: [
          "Successfully retrieved a resource via GET request",
          "Successfully updated a resource via PUT or PATCH request",
          "Successfully created a resource via POST request",
          "Successfully deleted a resource via DELETE request",
        ],
      },
    },
    {
      code: 201,
      name: "Created",
      description: "The request succeeded and a new resource was created.",
      spec: "RFC 9110",
      source: "IANA",
      popular: true,
      details: {
        usage: "Response to a POST request that creates a new resource",
        commonCauses: [
          "Creating a new user account",
          "Uploading a new file",
          "Creating a new database record",
          "Submitting a new order",
        ],
      },
    },
    {
      code: 202,
      name: "Accepted",
      description: "The request has been received but not yet acted upon.",
      spec: "RFC 9110",
      source: "IANA",
      popular: false,
    },
    {
      code: 203,
      name: "Non-Authoritative Information",
      description:
        "The request was successful but the transformed metadata is not the definitive set.",
      spec: "RFC 9110",
      source: "IANA",
      popular: false,
    },
    {
      code: 204,
      name: "No Content",
      description:
        "The server successfully processed the request and is not returning any content.",
      spec: "RFC 9110",
      source: "IANA",
      popular: true,
      details: {
        usage: "Response to successful requests that don't require returning a body",
        commonCauses: [
          "Successful DELETE request",
          "Successful PUT request with no response body needed",
          "Updating a resource's status without returning data",
          "Clearing a cache or resetting a state",
        ],
      },
    },
    {
      code: 205,
      name: "Reset Content",
      description:
        "The server successfully processed the request but is not returning any content and requires the requestor to reset the document view.",
      spec: "RFC 9110",
      source: "IANA",
      popular: false,
    },
    {
      code: 206,
      name: "Partial Content",
      description:
        "The server is delivering only part of the resource due to a range header sent by the client.",
      spec: "RFC 9110",
      source: "IANA",
      popular: true,
      details: {
        usage: "Used for range requests, resumable downloads, and streaming media",
        commonCauses: [
          "Video player requesting a specific byte range for buffering",
          "Download managers resuming interrupted downloads",
          "Large file transfers in chunks",
          "HTTP range requests for pagination",
        ],
      },
    },
    {
      code: 207,
      name: "Multi-Status",
      description:
        "The message body that follows is by default an XML message and can contain a number of separate response codes.",
      spec: "RFC 4918",
      source: "IANA",
      popular: false,
    },
    {
      code: 208,
      name: "Already Reported",
      description:
        "The members of a DAV binding have already been enumerated in a preceding part of the multi-status response.",
      spec: "RFC 5842",
      source: "IANA",
      popular: false,
    },
    {
      code: 226,
      name: "IM Used",
      description:
        "The server has fulfilled a GET request for the resource, and the response is a representation of the result of one or more instance-manipulations applied to the current instance.",
      spec: "RFC 3229",
      source: "IANA",
      popular: false,
    },

    // 3xx - Redirection
    {
      code: 300,
      name: "Multiple Choices",
      description: "The request has more than one possible response.",
      spec: "RFC 9110",
      source: "IANA",
      popular: false,
    },
    {
      code: 301,
      name: "Moved Permanently",
      description: "The URL of the requested resource has been changed permanently.",
      spec: "RFC 9110",
      source: "IANA",
      popular: true,
      details: {
        usage: "Permanent redirect for URL changes and content relocation",
        commonCauses: [
          "Website domain change or migration",
          "URL structure redesign for better SEO",
          "Moving content to a new location",
          "HTTP to HTTPS migration",
        ],
      },
    },
    {
      code: 302,
      name: "Found",
      description: "The URL of the requested resource has been changed temporarily.",
      spec: "RFC 9110",
      source: "IANA",
      popular: true,
      details: {
        usage: "Temporary redirect for content that has moved or is under maintenance",
        commonCauses: [
          "Temporary website maintenance",
          "A/B testing redirects",
          "User authentication flow",
          "Temporary content location changes",
        ],
      },
    },
    {
      code: 303,
      name: "See Other",
      description:
        "The response to the request can be found under another URI using the GET method.",
      spec: "RFC 9110",
      source: "IANA",
      popular: false,
    },
    {
      code: 304,
      name: "Not Modified",
      description: "The cached version of the requested resource is still valid.",
      spec: "RFC 9110",
      source: "IANA",
      popular: true,
      details: {
        usage: "Caching optimization to reduce bandwidth and improve performance",
        commonCauses: [
          "Browser cache hit for unchanged static resources",
          "CDN cache serving unchanged content",
          "Conditional GET request with If-None-Match header",
          "Server returning 304 for resources that haven't changed since last request",
        ],
      },
    },
    {
      code: 305,
      name: "Use Proxy",
      description: "The requested resource is only available through a proxy.",
      spec: "RFC 9110",
      source: "IANA",
      popular: false,
    },
    {
      code: 307,
      name: "Temporary Redirect",
      description:
        "The request should be repeated with another URI, but future requests should still use the original URI.",
      spec: "RFC 9110",
      source: "IANA",
      popular: true,
      details: {
        usage: "Temporary redirect that preserves the HTTP method",
        commonCauses: [
          "Redirecting POST requests during maintenance",
          "Temporary URL changes for API endpoints",
          "Load balancing and traffic distribution",
          "Testing new features with temporary redirects",
        ],
      },
    },
    {
      code: 308,
      name: "Permanent Redirect",
      description: "The request and all future requests should be repeated using another URI.",
      spec: "RFC 9110",
      source: "IANA",
      popular: false,
    },

    // 4xx - Client Error
    {
      code: 400,
      name: "Bad Request",
      description: "The server could not understand the request due to invalid syntax.",
      spec: "RFC 9110",
      source: "IANA",
      popular: true,
      details: {
        usage: "Generic client error for malformed requests",
        commonCauses: [
          "Malformed JSON in request body",
          "Missing required request parameters",
          "Invalid request headers or content type",
          "Malformed URL or query parameters",
        ],
      },
    },
    {
      code: 401,
      name: "Unauthorized",
      description: "The client must authenticate itself to get the requested response.",
      spec: "RFC 9110",
      source: "IANA",
      popular: true,
      details: {
        usage: "Authentication required for accessing protected resources",
        commonCauses: [
          "Missing or invalid authentication token",
          "Expired JWT or session token",
          "Failed authentication attempt",
          "Accessing protected API without credentials",
        ],
      },
    },
    {
      code: 402,
      name: "Payment Required",
      description: "This response code is reserved for future use.",
      spec: "RFC 9110",
      source: "IANA",
      popular: false,
    },
    {
      code: 403,
      name: "Forbidden",
      description: "The client does not have access rights to the content.",
      spec: "RFC 9110",
      source: "IANA",
      popular: true,
      details: {
        usage: "Authorization failure for authenticated but unauthorized requests",
        commonCauses: [
          "User lacks permission to access the resource",
          "IP address or region-based blocking",
          "Accessing admin-only features without proper role",
          "Rate limiting exceeded for authenticated user",
        ],
      },
    },
    {
      code: 404,
      name: "Not Found",
      description: "The server can not find the requested resource.",
      spec: "RFC 9110",
      source: "IANA",
      popular: true,
      details: {
        usage: "Resource not found at the specified URL",
        commonCauses: [
          "Typo in the URL or broken link",
          "Resource has been deleted or moved",
          "Incorrect API endpoint path",
          "Database record no longer exists",
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
        usage: "HTTP method not supported for the requested endpoint",
        commonCauses: [
          "Using GET when only POST is allowed",
          "Trying to DELETE a read-only resource",
          "Incorrect HTTP method for API endpoint",
          "Unsupported method on static file resource",
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
      popular: false,
    },
    {
      code: 407,
      name: "Proxy Authentication Required",
      description: "The client must first authenticate itself with a proxy.",
      spec: "RFC 9110",
      source: "IANA",
      popular: false,
    },
    {
      code: 408,
      name: "Request Timeout",
      description: "The server would like to shut down this unused connection.",
      spec: "RFC 9110",
      source: "IANA",
      popular: true,
      details: {
        usage: "Server closed the connection due to client inactivity",
        commonCauses: [
          "Client took too long to send the request body",
          "Network timeout between client and server",
          "Slow client connection causing server timeout",
          "Load balancer timeout exceeded",
        ],
      },
    },
    {
      code: 409,
      name: "Conflict",
      description: "The request conflicts with the current state of the target resource.",
      spec: "RFC 9110",
      source: "IANA",
      popular: true,
      details: {
        usage: "Request conflicts with server state or business rules",
        commonCauses: [
          "Creating a resource that already exists",
          "Concurrent modification conflicts",
          "Invalid state transition for resource",
          "Duplicate unique constraint violation",
        ],
      },
    },
    {
      code: 410,
      name: "Gone",
      description: "The target resource is no longer available at the origin server.",
      spec: "RFC 9110",
      source: "IANA",
      popular: false,
    },
    {
      code: 411,
      name: "Length Required",
      description:
        "The server rejected the request because the Content-Length header field is not defined.",
      spec: "RFC 9110",
      source: "IANA",
      popular: false,
    },
    {
      code: 412,
      name: "Precondition Failed",
      description:
        "The server does not meet one of the preconditions that the requester put on the request header fields.",
      spec: "RFC 9110",
      source: "IANA",
      popular: false,
    },
    {
      code: 413,
      name: "Payload Too Large",
      description: "The request entity is larger than limits defined by the server.",
      spec: "RFC 9110",
      source: "IANA",
      popular: false,
    },
    {
      code: 414,
      name: "URI Too Long",
      description:
        "The URI requested by the client is longer than the server is willing to interpret.",
      spec: "RFC 9110",
      source: "IANA",
      popular: false,
    },
    {
      code: 415,
      name: "Unsupported Media Type",
      description: "The media format of the requested data is not supported by the server.",
      spec: "RFC 9110",
      source: "IANA",
      popular: false,
    },
    {
      code: 416,
      name: "Range Not Satisfiable",
      description: "The range of bytes requested by the client cannot be fulfilled.",
      spec: "RFC 9110",
      source: "IANA",
      popular: false,
    },
    {
      code: 417,
      name: "Expectation Failed",
      description: "The expectation indicated by the Expect request header field cannot be met.",
      spec: "RFC 9110",
      source: "IANA",
      popular: false,
    },
    {
      code: 418,
      name: "I'm a teapot",
      description: "The server refuses to brew coffee because it is, permanently, a teapot.",
      spec: "RFC 2324",
      source: "IANA",
      popular: false,
    },
    {
      code: 421,
      name: "Misdirected Request",
      description: "The request was directed at a server that is not able to produce a response.",
      spec: "RFC 9110",
      source: "IANA",
      popular: false,
    },
    {
      code: 422,
      name: "Unprocessable Entity",
      description:
        "The request was well-formed but was unable to be followed due to semantic errors.",
      spec: "RFC 4918",
      source: "IANA",
      popular: false,
    },
    {
      code: 423,
      name: "Locked",
      description: "The resource that is being accessed is locked.",
      spec: "RFC 4918",
      source: "IANA",
      popular: false,
    },
    {
      code: 424,
      name: "Failed Dependency",
      description: "The request failed because it depended on another request that failed.",
      spec: "RFC 4918",
      source: "IANA",
      popular: false,
    },
    {
      code: 425,
      name: "Too Early",
      description: "The server is unwilling to risk processing a request that might be replayed.",
      spec: "RFC 8470",
      source: "IANA",
      popular: false,
    },
    {
      code: 426,
      name: "Upgrade Required",
      description:
        "The server refuses to perform the request using the current protocol but might be willing to do so after the client upgrades to a different protocol.",
      spec: "RFC 9110",
      source: "IANA",
      popular: false,
    },
    {
      code: 428,
      name: "Precondition Required",
      description: "The origin server requires the request to be conditional.",
      spec: "RFC 6585",
      source: "IANA",
      popular: false,
    },
    {
      code: 429,
      name: "Too Many Requests",
      description: "The user has sent too many requests in a given amount of time.",
      spec: "RFC 6585",
      source: "IANA",
      popular: true,
      details: {
        usage: "Rate limiting to prevent abuse and ensure fair usage",
        commonCauses: [
          "Exceeding API rate limits",
          "Too many requests from the same IP address",
          "Bot or scraper activity detected",
          "User triggered rate limiter with rapid requests",
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
      popular: false,
    },
    {
      code: 451,
      name: "Unavailable For Legal Reasons",
      description:
        "The server is denying access to the resource as a consequence of a legal demand.",
      spec: "RFC 7725",
      source: "IANA",
      popular: false,
    },

    // 5xx - Server Error
    {
      code: 500,
      name: "Internal Server Error",
      description: "The server has encountered a situation it doesn't know how to handle.",
      spec: "RFC 9110",
      source: "IANA",
      popular: true,
      details: {
        usage: "Generic server error for unexpected conditions",
        commonCauses: [
          "Uncaught exception in server code",
          "Database connection failure",
          "Configuration error on the server",
          "Third-party service integration failure",
        ],
      },
    },
    {
      code: 501,
      name: "Not Implemented",
      description: "The request method is not supported by the server and cannot be handled.",
      spec: "RFC 9110",
      source: "IANA",
      popular: false,
    },
    {
      code: 502,
      name: "Bad Gateway",
      description:
        "The server, while working as a gateway to get a response needed to handle the request, got an invalid response.",
      spec: "RFC 9110",
      source: "IANA",
      popular: true,
      details: {
        usage: "Invalid response from upstream server",
        commonCauses: [
          "Upstream server is down or unreachable",
          "Invalid response from backend service",
          "Network connectivity issues between servers",
          "Timeout waiting for upstream response",
        ],
      },
    },
    {
      code: 503,
      name: "Service Unavailable",
      description: "The server is not ready to handle the request.",
      spec: "RFC 9110",
      source: "IANA",
      popular: true,
      details: {
        usage: "Service temporarily unavailable due to maintenance or overload",
        commonCauses: [
          "Scheduled server maintenance",
          "Server overload due to high traffic",
          "Database connection pool exhausted",
          "Dependency service is temporarily down",
        ],
      },
    },
    {
      code: 504,
      name: "Gateway Timeout",
      description: "The server, while working as a gateway, could not get a response in time.",
      spec: "RFC 9110",
      source: "IANA",
      popular: true,
      details: {
        usage: "Timeout waiting for response from upstream server",
        commonCauses: [
          "Upstream server took too long to respond",
          "Slow backend service processing",
          "Network latency between gateway and backend",
          "Database query timeout",
        ],
      },
    },
    {
      code: 505,
      name: "HTTP Version Not Supported",
      description: "The HTTP version used in the request is not supported by the server.",
      spec: "RFC 9110",
      source: "IANA",
      popular: false,
    },
    {
      code: 506,
      name: "Variant Also Negotiates",
      description: "The server has an internal configuration error.",
      spec: "RFC 2295",
      source: "IANA",
      popular: false,
    },
    {
      code: 507,
      name: "Insufficient Storage",
      description:
        "The server is unable to store the representation needed to complete the request.",
      spec: "RFC 4918",
      source: "IANA",
      popular: false,
    },
    {
      code: 508,
      name: "Loop Detected",
      description: "The server detected an infinite loop while processing the request.",
      spec: "RFC 5842",
      source: "IANA",
      popular: false,
    },
    {
      code: 510,
      name: "Not Extended",
      description: "Further extensions to the request are required for the server to fulfill it.",
      spec: "RFC 2774",
      source: "IANA",
      popular: false,
    },
    {
      code: 511,
      name: "Network Authentication Required",
      description: "The client needs to authenticate to gain network access.",
      spec: "RFC 6585",
      source: "IANA",
      popular: false,
    },

    // Nginx Unofficial Codes
    {
      code: 444,
      name: "Connection Closed Without Response",
      description: "Nginx closes the connection without sending any response to the client.",
      source: "Nginx",
      popular: false,
    },
    {
      code: 494,
      name: "Request Header Too Large",
      description: "Nginx rejected the request because the request header was too large.",
      source: "Nginx",
      popular: false,
    },
    {
      code: 495,
      name: "SSL Certificate Error",
      description: "Nginx client SSL certificate verification error.",
      source: "Nginx",
      popular: false,
    },
    {
      code: 496,
      name: "SSL Certificate Required",
      description: "Nginx client did not provide SSL certificate.",
      source: "Nginx",
      popular: false,
    },
    {
      code: 497,
      name: "HTTP Request Sent to HTTPS Port",
      description: "Nginx client sent HTTP request to HTTPS port.",
      source: "Nginx",
      popular: false,
    },
    {
      code: 499,
      name: "Client Closed Request",
      description: "Nginx client closed the connection before the server could send a response.",
      source: "Nginx",
      popular: false,
    },

    // Cloudflare Unofficial Codes
    {
      code: 520,
      name: "Web Server Returned an Unknown Error",
      description: "The origin server returned an unexpected or unknown error.",
      source: "Cloudflare",
      popular: false,
    },
    {
      code: 521,
      name: "Web Server Is Down",
      description: "The origin server refused the connection from Cloudflare.",
      source: "Cloudflare",
      popular: false,
    },
    {
      code: 522,
      name: "Connection Timed Out",
      description: "Cloudflare could not negotiate a TCP handshake with the origin server.",
      source: "Cloudflare",
      popular: false,
    },
    {
      code: 523,
      name: "Origin Is Unreachable",
      description: "Cloudflare could not reach the origin server.",
      source: "Cloudflare",
      popular: false,
    },
    {
      code: 524,
      name: "A Timeout Occurred",
      description:
        "Cloudflare was able to complete a TCP connection to the origin server, but the origin server did not reply with an HTTP response before the connection timed out.",
      source: "Cloudflare",
      popular: false,
    },
    {
      code: 525,
      name: "SSL Handshake Failed",
      description: "Cloudflare could not negotiate a SSL/TLS handshake with the origin server.",
      source: "Cloudflare",
      popular: false,
    },
    {
      code: 526,
      name: "Invalid SSL Certificate",
      description: "Cloudflare could not validate the SSL certificate on the origin server.",
      source: "Cloudflare",
      popular: false,
    },
    {
      code: 527,
      name: "Railgun Error",
      description: "Cloudflare Railgun was unable to reach the origin server.",
      source: "Cloudflare",
      popular: false,
    },
    {
      code: 528,
      name: "Connection Timed Out",
      description: "Cloudflare timed out contacting the origin server.",
      source: "Cloudflare",
      popular: false,
    },
    {
      code: 529,
      name: "Resource Limit Exceeded",
      description: "The origin server has exceeded its resource limits.",
      source: "Cloudflare",
      popular: false,
    },
    {
      code: 530,
      name: "Origin DNS Error",
      description: "Cloudflare could not resolve the DNS for the origin server.",
      source: "Cloudflare",
      popular: false,
    },

    // IIS Unofficial Codes
    {
      code: 440,
      name: "Login Time-out",
      description: "The client's session has expired.",
      source: "IIS",
      popular: false,
    },
    {
      code: 449,
      name: "Retry With",
      description: "The request should be retried after doing the appropriate action.",
      source: "IIS",
      popular: false,
    },
  ];
}
