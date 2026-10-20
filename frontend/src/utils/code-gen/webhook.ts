import type { CodeExamples } from './types'

const WEBHOOK_PATH = '/webhooks/qorstack'

/** What Qorstack sends to webhookUrl — the contract every receiver below follows. */
const contract = `# Qorstack sends one POST to your webhookUrl when an async job finishes.
#
# POST ${WEBHOOK_PATH}
# Content-Type: application/json
# User-Agent: QorstackReport-Webhook/2
# X-Qorstack-Event: render.completed
# X-Qorstack-Signature: sha256=<hex>   (only when the server sets WEBHOOK_SIGNING_SECRET)
#
# Success: { "jobId": "6f1c2a8e-…", "status": "success", "downloadUrl": "https://…", "expiresIn": 3600 }
# Failure: { "jobId": "6f1c2a8e-…", "status": "failed", "error": "Template not found" }
#
# Rules for your endpoint:
#  - Answer any 2xx within 10 seconds. Anything else is retried after 10 s and 60 s (3 attempts in total),
#    so the same jobId can arrive more than once — handle it idempotently.
#  - downloadUrl works for expiresIn seconds and needs no API key. Download it, or later ask
#    GET /render/jobs/{jobId} (with your API key) for a fresh link.
#  - Signature: hex HMAC-SHA256 of the raw request body with the shared secret, prefixed "sha256=".
#    Compute it over the exact bytes received (before any JSON parsing) and compare in constant time.`

const api = `${contract}

# Try your endpoint with a signed test call (bash + openssl):
SECRET="same value as WEBHOOK_SIGNING_SECRET on the Qorstack server"
BODY='{"jobId":"6f1c2a8e-0000-0000-0000-000000000000","status":"success","downloadUrl":"https://example.com/file.pdf","expiresIn":3600}'
SIG="sha256=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$SECRET" | sed 's/^.* //')"

curl -X POST "https://your-app.example.com${WEBHOOK_PATH}" \\
  -H "Content-Type: application/json" \\
  -H "X-Qorstack-Event: render.completed" \\
  -H "X-Qorstack-Signature: $SIG" \\
  --data-raw "$BODY"`

const nodejs = `// npm install express
// Webhook receiver for async renders (Express). Set QORSTACK_WEBHOOK_SECRET to the same value as
// WEBHOOK_SIGNING_SECRET on the Qorstack server; leave it empty if the server does not sign webhooks.
import express from 'express';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { writeFile } from 'node:fs/promises';

interface QorstackWebhook {
  jobId: string;
  status: 'success' | 'failed';
  downloadUrl?: string;
  expiresIn?: number;
  error?: string;
}

const secret = process.env.QORSTACK_WEBHOOK_SECRET ?? '';

const isSignatureValid = (rawBody: Buffer, header: string | undefined): boolean => {
  if (!secret) return true; // the server does not sign webhooks
  if (!header) return false;
  const expected = Buffer.from(\`sha256=\${createHmac('sha256', secret).update(rawBody).digest('hex')}\`);
  const received = Buffer.from(header);
  return expected.length === received.length && timingSafeEqual(expected, received);
};

const handleWebhook = async (event: QorstackWebhook): Promise<void> => {
  if (event.status !== 'success' || !event.downloadUrl) {
    console.error(\`Render job \${event.jobId} failed: \${event.error}\`);
    return; // mark your record as failed
  }
  // The same jobId can arrive twice (retries): skip it if you already stored the file.
  const file = await fetch(event.downloadUrl);
  await writeFile(\`\${event.jobId}.pdf\`, Buffer.from(await file.arrayBuffer()));
  // update your record: document ready
};

const app = express();

// express.raw keeps the exact bytes, which the signature is computed over.
app.post('${WEBHOOK_PATH}', express.raw({ type: 'application/json' }), (req, res) => {
  if (!isSignatureValid(req.body, req.get('X-Qorstack-Signature'))) {
    res.sendStatus(401);
    return;
  }
  const event = JSON.parse(req.body.toString('utf8')) as QorstackWebhook;

  // Answer first (Qorstack waits at most 10 s), then do the slow work.
  res.sendStatus(204);
  handleWebhook(event).catch(err => console.error(\`Webhook \${event.jobId}:\`, err));
});

app.listen(3000, () => console.log('Listening on :3000${WEBHOOK_PATH}'));`

const csharp = `// Webhook receiver for async renders (ASP.NET Core minimal API, Program.cs).
// Set Qorstack:WebhookSecret (e.g. env Qorstack__WebhookSecret) to the same value as WEBHOOK_SIGNING_SECRET
// on the Qorstack server; leave it empty if the server does not sign webhooks.
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddHttpClient();
var app = builder.Build();

var json = new JsonSerializerOptions(JsonSerializerDefaults.Web);

app.MapPost("${WEBHOOK_PATH}", async (HttpRequest request, IConfiguration config,
    IHttpClientFactory httpClientFactory, ILogger<Program> logger) =>
{
    // Read the raw body: the signature is computed over these exact bytes.
    using var reader = new StreamReader(request.Body, Encoding.UTF8);
    var body = await reader.ReadToEndAsync();

    var secret = config["Qorstack:WebhookSecret"];
    if (!string.IsNullOrEmpty(secret))
    {
        var hash = HMACSHA256.HashData(Encoding.UTF8.GetBytes(secret), Encoding.UTF8.GetBytes(body));
        var expected = Encoding.ASCII.GetBytes("sha256=" + Convert.ToHexString(hash).ToLowerInvariant());
        var received = Encoding.ASCII.GetBytes(request.Headers["X-Qorstack-Signature"].ToString());
        if (!CryptographicOperations.FixedTimeEquals(expected, received))
            return Results.Unauthorized();
    }

    var evt = JsonSerializer.Deserialize<QorstackWebhook>(body, json);
    if (evt is null) return Results.BadRequest();

    if (evt.Status != "success" || evt.DownloadUrl is null)
    {
        logger.LogError("Render job {JobId} failed: {Error}", evt.JobId, evt.Error);
        return Results.NoContent(); // mark your record as failed
    }

    // The same JobId can arrive twice (retries): skip it if you already stored the file.
    // Keep this under 10 s, or queue the download to a background job and answer right away.
    var http = httpClientFactory.CreateClient();
    var bytes = await http.GetByteArrayAsync(evt.DownloadUrl);
    await File.WriteAllBytesAsync($"{evt.JobId}.pdf", bytes);
    return Results.NoContent();
});

app.Run();

public record QorstackWebhook(Guid JobId, string Status, string? DownloadUrl, int? ExpiresIn, string? Error);`

/** Ready-made receivers for the async render webhook, per language tab. */
export const getWebhookReceiverExamples = (): CodeExamples => ({
  api,
  curl: api,
  json: `{
  "jobId": "6f1c2a8e-0000-0000-0000-000000000000",
  "status": "success",
  "downloadUrl": "https://your-host/api/files/eyJ…",
  "expiresIn": 3600
}`,
  nodejs,
  ts: nodejs,
  csharp,
  dotnet: csharp
})
