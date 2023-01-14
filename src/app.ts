import { sdk } from "./deps.ts";

const patternText =
  Deno.env.get("CALLBACK_PROXY_FOR_APPWRITE_FUNCTIONS_URL_PATTERN") ??
    "/v1/webhook-proxy/:projectId/:functionId";
const pattern = new URLPattern({
  pathname: patternText,
});

export async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const match = pattern.exec(url);
  if (!match) {
    return new Response(
      `not match pattern: "${patternText}". your url path: "${url.pathname}"`,
      {
        status: 404,
      },
    );
  }
  const endpoint = req.headers.get('x-appwrite-endpoint') ?? url.searchParams.get("endpoint") ??
    Deno.env.get("CALLBACK_PROXY_FOR_APPWRITE_FUNCTIONS_ENDPOINT");
  const apiKey = req.headers.get('x-appwrite-api-key') ?? url.searchParams.get("apiKey") ??
    Deno.env.get("CALLBACK_PROXY_FOR_APPWRITE_FUNCTIONS_API_KEY");
  const projectId = match.pathname.groups.projectId ??
    Deno.env.get("CALLBACK_PROXY_FOR_APPWRITE_FUNCTIONS_PROJECT_ID");
  const functionId = match.pathname.groups.functionId ??
    Deno.env.get("CALLBACK_PROXY_FOR_APPWRITE_FUNCTIONS_FUNCTION_ID");

  if (!endpoint) {
    return new Response(`missing endpoint!`, {
      status: 400,
    });
  }
  if (!apiKey) {
    return new Response(`missing apiKey!`, {
      status: 400,
    });
  }
  if (!projectId) {
    return new Response(`missing projectId!`, {
      status: 400,
    });
  }
  if (!functionId) {
    return new Response(`missing functionId!`, {
      status: 400,
    });
  }

  const client = new sdk.Client().setEndpoint(endpoint).setKey(apiKey).setProject(projectId)
    .setProject(projectId);
  const functions = new sdk.Functions(client);
  const getBody = async () => {
    const isJSON = req.headers.get("content-type") === "application/json";
    const { value } =
      await req.body?.pipeThrough(new TextDecoderStream()).getReader().read() ??
        {};

    if (isJSON && value) {
      try {
        return JSON.parse(value);
      } catch (error) {
        console.error(`can not parse body as json. ${error}`);
      }
    } else {
      return value;
    }
  };
  const data = {
    method: req.method,
    body: await getBody(),
    params: Object.fromEntries(Array.from(url.searchParams.keys()).map(name => [name, ((arr) => (arr.length > 1 ? arr : arr[0]))(url.searchParams.getAll(name))])),
    headers: Object.fromEntries(req.headers.entries()),
  }
  const execution = await functions.createExecution(functionId, JSON.stringify(data));
  const headers = new Headers();
  if (execution.status === 'failed') {
    return new Response(execution.response ?? 'Failed.', {
      status: 500,
      headers: headers,
    });
  }
  return new Response(execution.response, {
    status: execution.statusCode,
  });
}

