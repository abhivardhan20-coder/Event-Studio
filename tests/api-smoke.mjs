import assert from "node:assert/strict";
const base = process.env.TEST_BASE_URL ?? "http://127.0.0.1:5173";
const input = {
  name: "API smoke celebration",
  type: "Wedding",
  date: "2027-06-20",
  location: "Bengaluru",
  budget: 200000,
  guestCount: 80,
  vibe: "Seasonal and personal",
};
async function post(body, headers = {}) {
  return fetch(`${base}/api/plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}
const status = await fetch(`${base}/api/plan`);
assert.equal(status.status, 200);
const config = await status.json();
assert.equal(typeof config.configured, "boolean");
assert.equal(
  (await post({ action: "plan", event: { ...input, budget: -1 } })).status,
  400,
);
assert.equal(
  (
    await post(
      { action: "plan", event: input },
      { Origin: "https://example.org" },
    )
  ).status,
  403,
);
assert.equal((await post("{")).status, 400);
assert.equal((await post("x".repeat(25000))).status, 413);
if (!config.configured) {
  for (const type of ["Wedding", "Birthday", "Community"]) {
    const response = await post({ action: "plan", event: { ...input, type } });
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.event.type, type);
    assert.ok(data.event.tasks.length >= 8);
    assert.ok(data.event.vendors.length >= 3);
    assert.equal(data.event.source, "built-in");
  }
  const chat = await post({
    action: "chat",
    event: input,
    spending: 2500,
    tasks: [],
    messages: [{ role: "user", text: "Help with my budget" }],
  });
  assert.equal(chat.status, 200);
  const reply = await chat.json();
  assert.equal(reply.source, "built-in");
  assert.ok(reply.text.includes("1,97,500"));
  console.log(
    "API smoke checks passed: validation, origin check, size limit, all three event types, contextual chat.",
  );
} else
  console.log(
    "API validation checks passed. Live Gemini generation was not called by this smoke test.",
  );
