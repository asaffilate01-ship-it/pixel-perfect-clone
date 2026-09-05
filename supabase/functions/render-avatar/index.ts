import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
};

const allowed = <T extends string>(value: unknown, values: readonly T[], fallback: T) =>
  values.includes(value as T) ? (value as T) : fallback;
const colour = (value: unknown, fallback: string) =>
  typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...headers, "Content-Type": "application/json" },
    });

  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const imageKey = Deno.env.get("OPENAI_API_KEY");
  const auth = request.headers.get("Authorization");
  if (!url || !anon || !serviceKey || !imageKey || !auth) return json({ error: "Unavailable" }, 503);

  const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } });
  const admin = createClient(url, serviceKey);
  const { data: authData } = await userClient.auth.getUser();
  if (!authData.user) return json({ error: "Authentication required" }, 401);

  let job: { id: string; source_path: string; requested_settings: Record<string, unknown> } | null = null;
  let claimedJob = false;
  try {
    const body = await request.json();
    if (typeof body?.jobId !== "string") return json({ error: "Invalid job" }, 400);
    const result = await userClient
      .from("avatar_render_jobs")
      .select("id,source_path,requested_settings,status")
      .eq("id", body.jobId)
      .eq("status", "queued")
      .maybeSingle();
    job = result.data;
    if (!job) return json({ error: "Queued job not found" }, 404);
    const claimed = await admin
      .from("avatar_render_jobs")
      .update({ status: "processing" })
      .eq("id", job.id)
      .eq("status", "queued")
      .select("id")
      .maybeSingle();
    if (!claimed.data) return json({ error: "Job already claimed" }, 409);
    claimedJob = true;

    const source = await admin.storage.from("avatar-sources").download(job.source_path);
    if (source.error) throw new Error("source_download_failed");
    const s = job.requested_settings ?? {};
    const prompt = [
      "Create a premium, friendly 3D-illustrated head-and-shoulders sports-game avatar from this photo.",
      "Preserve the person's recognizable identity, facial proportions, skin tone, age presentation and expression.",
      "Use polished cinematic lighting, clean detail, a transparent background, no text, no logos, no club marks and no trademarks.",
      `Hair: ${allowed(s.hairStyle, ["short", "buzz", "waves", "curls", "afro", "long", "bun", "mohawk", "covered", "bald"], "short")} in ${colour(s.hairColor, "#24170F")}.`,
      `Facial hair: ${allowed(s.facialHair, ["none", "stubble", "moustache", "goatee", "boxed", "beard"], "none")}.`,
      `Glasses: ${s.glasses === true ? allowed(s.glassesStyle, ["round", "square", "sport"], "round") : "none"}.`,
      `Make-up: ${allowed(s.makeup, ["none", "natural", "bold"], "none")}.`,
      `Sportswear: ${allowed(s.outfitStyle, ["tee", "hoodie", "jersey"], "jersey")} in ${colour(s.clothesColor, "#18A66A")} with subtle gold trim.`,
    ].join(" ");
    const form = new FormData();
    form.append("model", "gpt-image-2");
    form.append("image[]", source.data, job.source_path.split("/").at(-1) ?? "source.jpg");
    form.append("prompt", prompt);
    form.append("size", "1024x1024");
    form.append("background", "transparent");
    const generated = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${imageKey}` },
      body: form,
    });
    if (!generated.ok) throw new Error(`image_api_${generated.status}`);
    const payload = await generated.json();
    const encoded = payload?.data?.[0]?.b64_json;
    if (typeof encoded !== "string") throw new Error("image_missing");
    const bytes = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
    const renderedPath = `${authData.user.id}/${job.id}.png`;
    const saved = await admin.storage.from("avatar-renders").upload(renderedPath, bytes, {
      contentType: "image/png",
      upsert: true,
    });
    if (saved.error) throw new Error("render_upload_failed");
    const avatarUrl = admin.storage.from("avatar-renders").getPublicUrl(renderedPath).data.publicUrl;
    await admin.from("profiles").update({ avatar_url: avatarUrl }).eq("id", authData.user.id);
    await admin
      .from("avatar_render_jobs")
      .update({ status: "complete", rendered_path: renderedPath, completed_at: new Date().toISOString() })
      .eq("id", job.id);
    return json({ avatarUrl });
  } catch (error) {
    if (job && claimedJob)
      await admin
        .from("avatar_render_jobs")
        .update({ status: "failed", error_code: error instanceof Error ? error.message : "failed", completed_at: new Date().toISOString() })
        .eq("id", job.id);
    return json({ error: "Portrait rendering failed" }, 502);
  } finally {
    if (job && claimedJob) {
      await admin.storage.from("avatar-sources").remove([job.source_path]);
      await admin
        .from("avatar_render_jobs")
        .update({ source_deleted_at: new Date().toISOString() })
        .eq("id", job.id);
    }
  }
});
