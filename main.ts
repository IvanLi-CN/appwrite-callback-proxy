import { handler } from "./src/app.ts";
import { httpServer } from "./src/deps.ts";

httpServer.serve(handler, {
  port: +(Deno.env.get('CALLBACK_PROXY_FOR_APPWRITE_FUNCTIONS_URL_PORT') || '4444'),
});