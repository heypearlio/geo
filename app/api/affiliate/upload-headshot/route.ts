import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../lib/resend";

export const runtime = "nodejs";
import { getAffiliateFromRequest } from "../../../../lib/affiliate";

export async function POST(req: NextRequest) {
  // Auth: admin cookie, affiliate session cookie, or invite token (setup wizard)
  let affiliateSlug: string | null = null;

  const isAdmin =
    req.cookies.get("admin_auth")?.value === (process.env.ADMIN_TOKEN ?? "geo-admin-authenticated") ||
    req.headers.get("x-admin-key") === process.env.ADMIN_TOKEN;

  if (isAdmin) {
    // Admin uploading for a specific slug passed as query param
    affiliateSlug = req.nextUrl.searchParams.get("slug");
  } else {
    const sessionAffiliate = await getAffiliateFromRequest(req);
    if (sessionAffiliate) {
      affiliateSlug = sessionAffiliate.slug;
    } else {
      // Setup wizard path: validate slug + invite_token
      const slugParam = req.nextUrl.searchParams.get("slug");
      const inviteToken = req.nextUrl.searchParams.get("invite_token");
      if (slugParam && inviteToken) {
        const { data } = await supabase
          .from("affiliates")
          .select("slug, invite_token, invite_used")
          .eq("slug", slugParam)
          .maybeSingle();
        if (data && !data.invite_used && data.invite_token === inviteToken) {
          affiliateSlug = data.slug;
        }
      }
    }
  }

  if (!affiliateSlug) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const MAX_SIZE = 5 * 1024 * 1024; // 5MB
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const ALLOWED_EXTS = new Set(["jpg", "jpeg", "png", "gif", "webp"]);
  if (!ALLOWED_EXTS.has(ext)) {
    return NextResponse.json({ error: "Invalid file type. Allowed: jpg, jpeg, png, gif, webp" }, { status: 400 });
  }

  const path = `${affiliateSlug}/${Date.now()}.${ext}`;
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error } = await supabase.storage
    .from("affiliate-headshots")
    .upload(path, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: urlData } = supabase.storage
    .from("affiliate-headshots")
    .getPublicUrl(path);

  return NextResponse.json({ url: urlData.publicUrl });
}
