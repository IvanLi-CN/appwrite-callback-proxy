# Appwrite Callback Proxy

A proxy tool that triggers the execution of the Appwrite function.
If a third party cannot call the function in the way Appwrite expects, it can be called through the proxy.

For example, I want to implement an interface for Caddy that restricts the issuance of certificates, which will send an interface to my API with a "domain" query string, like so: ?domain=example.com. But Appwrite can't do that.

Inspired by [Appwrite Webhook Proxy](https://github.com/Meldiron/appwrite-webhook-proxy), but the Deno Edition.

## Usage

Insert the following into docker-compose.yml.
This will use traefik to forward requests from `/v1/webhook-proxy` to our proxy.

```yaml
services:

  callback-proxy:
    image: ivanlichina/appwrite-callback-proxy
    container_name: appwrite-callback-proxy
    restart: unless-stopped
    labels:
      - traefik.enable=true
      - traefik.constraint-label-stack=appwrite
      - traefik.docker.network=appwrite
      - traefik.http.services.appwrite_callback_proxy.loadbalancer.server.port=4444
      # http
      - traefik.http.routers.appwrite_callback_proxy_http.entrypoints=appwrite_web
      - traefik.http.routers.appwrite_callback_proxy_http.rule=PathPrefix(`/v1/webhook-proxy`)
      - traefik.http.routers.appwrite_callback_proxy_http.service=appwrite_callback_proxy
      # https
      - traefik.http.routers.appwrite_callback_proxy_https.entrypoints=appwrite_websecure
      - traefik.http.routers.appwrite_callback_proxy_https.rule=PathPrefix(`/v1/callback-proxy`)
      - traefik.http.routers.appwrite_callback_proxy_https.service=appwrite_callback_proxy
      - traefik.http.routers.appwrite_callback_proxy_https.tls=true
      - traefik.http.routers.appwrite_callback_proxy_https.tls.certresolver=dns
    networks:
      - appwrite
    depends_on:
      - appwrite
    environment:
      - CALLBACK_PROXY_FOR_APPWRITE_FUNCTIONS_URL_PATTERN
      - CALLBACK_PROXY_FOR_APPWRITE_FUNCTIONS_ENDPOINT
      - CALLBACK_PROXY_FOR_APPWRITE_FUNCTIONS_API_KEY
      - CALLBACK_PROXY_FOR_APPWRITE_FUNCTIONS_PROJECT_ID
      - CALLBACK_PROXY_FOR_APPWRITE_FUNCTIONS_FUNCTION_ID
  ...
```

Then add the following environment variables to appwrite's .env file.

```bash
# Appwrite Callback Proxy
CALLBACK_PROXY_FOR_APPWRITE_FUNCTIONS_URL_PATTERN=/v1/webhook-proxy/:projectId/:functionId
# Appwrite API Endpoint
CALLBACK_PROXY_FOR_APPWRITE_FUNCTIONS_ENDPOINT=https://app.appwrite.io/v1
# API Key that allows "execution.write"
CALLBACK_PROXY_FOR_APPWRITE_FUNCTIONS_API_KEY=your-api-key
```

You can then call the function using the following URL:

```bash
curl -L 'https://app.appwrite.io/v1/webhook-proxy/my-first-project/hello-world-function'

# With Params
curl -L 'https://app.appwrite.io/v1/webhook-proxy/my-first-project/hello-world-function?domain=example.com'

# Passing endpoint and apiKey from the request header
curl 'https://app.appwrite.io/v1/webhook-proxy/my-first-project/hello-world-function' \
  -H 'x-appwrite-endpoint: https://app.appwrite.io/v1' \
  -H 'x-appwrite-api-key: your-api-key'

# Passing endpoint and apiKey from the query string
curl 'https://app.appwrite.io/v1/webhook-proxy/my-first-project/hello-world-function?endpoint=https://app.appwrite.io/v1&apiKey=your-api-key'

# Post
curl 'https://app.appwrite.io/v1/webhook-proxy/my-first-project/hello-world-function' \
  -H 'content-type: application/json' \
  --data-raw '{"domain":"example.com"}'
```

Appwrite function will receive following `req.payload`:

```json
{
  "method": "POST",
  "body": { /* json or string */ },
  "params": { /* query params object */ },
  "headers": {
    /* ... */
  }
}

```

## License

[MIT](https://raw.githubusercontent.com/IvanLi-CN/appwrite-callback-proxy/master/LICENSE).