"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

const S = {
  bg: "#F0F2F8", card: "#ffffff", border: "#E2E8F2",
  text: "#0F1E3A", muted: "#8A9AB5", faint: "#4A5E7A",
  pink: "#E8185C", green: "#16a34a", red: "#dc2626",
  inputBg: "#F7F8FC",
};

interface PricingTier {
  name: string;
  price: string;
  stripeLink: string;
  highlight?: boolean;
  features: string;
}

interface Offer {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  funnel_tag: string;
  funnel_type: string;
  email_sequence: string;
  active: boolean;
  created_at: string;
}

const EMPTY_TIER: PricingTier = { name: "", price: "", stripeLink: "", features: "" };

const DEFAULT_TIERS: PricingTier[] = [
  { name: "Starter", price: "", stripeLink: "", features: "" },
  { name: "Growth", price: "", stripeLink: "", highlight: true, features: "" },
  { name: "Pro", price: "", stripeLink: "", features: "" },
];

export default function OffersPage() {
  const router = useRouter();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form state
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [tagline, setTagline] = useState("");
  const [funnelTag, setFunnelTag] = useState("");
  const [funnelType, setFunnelType] = useState("local");
  const [emailSequence, setEmailSequence] = useState("");
  const [tiers, setTiers] = useState<PricingTier[]>(DEFAULT_TIERS);
  const [addPricingNow, setAddPricingNow] = useState(false);
  const [proofPhotos, setProofPhotos] = useState("");
  const [heroHeadline, setHeroHeadline] = useState("");
  const [heroAccent, setHeroAccent] = useState("");
  const [heroSub, setHeroSub] = useState("");
  const [colorPrimary, setColorPrimary] = useState("#E8185C");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/offers");
    if (res.status === 401) { router.push("/admin/login"); return; }
    const data = await res.json();
    setOffers(data.offers ?? []);
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  function autoSlug(n: string) {
    return n.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  }

  function updateTier(index: number, field: keyof PricingTier, value: string | boolean) {
    setTiers(prev => prev.map((t, i) => i === index ? { ...t, [field]: value } : t));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError("");
    setSuccess("");

    // Build pricing_tiers array from form (empty if skipped)
    const pricingTiers = addPricingNow
      ? tiers.map((t, i) => ({
          name: t.name || ["Starter", "Growth", "Pro"][i],
          price: t.price,
          highlight: !!t.highlight,
          features: t.features.split("\n").map((f: string) => f.trim()).filter(Boolean),
          ctaLabel: "Get Started",
          ctaHref: t.stripeLink || "#",
        }))
      : [];

    // Build partial config overrides
    const config: Record<string, unknown> = {};
    if (colorPrimary) config.colorPrimary = colorPrimary;
    if (heroHeadline) config.heroHeadline = heroHeadline;
    if (heroAccent) config.heroHeadlineAccent = heroAccent;
    if (heroSub) config.heroSubheadline = heroSub;

    const photos = proofPhotos.split("\n").map(p => p.trim()).filter(Boolean);

    const res = await fetch("/api/admin/offers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug,
        name,
        tagline,
        funnel_tag: funnelTag,
        funnel_type: funnelType,
        config,
        pricing_tiers: pricingTiers,
        email_sequence: emailSequence,
        proof_photos: photos,
      }),
    });

    const data = await res.json();
    setCreating(false);

    if (!res.ok) { setError(data.error ?? "Failed to create offer"); return; }

    setSuccess(`Offer "${name}" created! Slug: /${slug} — Now add it as an offer option when creating affiliates.`);
    setName(""); setSlug(""); setTagline(""); setFunnelTag(""); setEmailSequence("");
    setTiers(DEFAULT_TIERS); setProofPhotos(""); setHeroHeadline(""); setHeroAccent(""); setHeroSub("");
    setColorPrimary("#E8185C");
    load();
  }

  async function toggleActive(id: string, current: boolean) {
    await fetch("/api/admin/offers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, active: !current }),
    });
    load();
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "9px 12px", borderRadius: 8,
    border: `1px solid ${S.border}`, background: S.inputBg,
    color: S.text, fontSize: 14, boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: S.faint, display: "block", marginBottom: 4 };
  const sectionHeadStyle: React.CSSProperties = { fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: S.muted, marginBottom: 12, paddingBottom: 8, borderBottom: `1px solid ${S.border}` };

  return (
    <div style={{ background: S.bg, minHeight: "100vh", padding: "32px 24px" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>

        <h1 style={{ color: S.text, fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Offers</h1>
        <p style={{ color: S.muted, fontSize: 14, marginBottom: 28 }}>
          Create a new offer funnel. Once created, it becomes available as an option when adding affiliates.
        </p>

        {/* Existing offers */}
        {!loading && offers.length > 0 && (
          <div style={{ background: S.card, borderRadius: 12, border: `1px solid ${S.border}`, padding: 24, marginBottom: 28 }}>
            <p style={sectionHeadStyle}>Active Offers</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {offers.map(o => (
                <div key={o.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: S.bg, borderRadius: 8, border: `1px solid ${S.border}` }}>
                  <div>
                    <span style={{ fontWeight: 700, color: S.text, fontSize: 14 }}>{o.name}</span>
                    <span style={{ color: S.muted, fontSize: 12, marginLeft: 10 }}>/{o.slug}</span>
                    <span style={{ color: S.muted, fontSize: 12, marginLeft: 10 }}>tag: {o.funnel_tag}</span>
                    {o.email_sequence && <span style={{ color: S.muted, fontSize: 12, marginLeft: 10 }}>seq: {o.email_sequence}</span>}
                  </div>
                  <button
                    onClick={() => toggleActive(o.id, o.active)}
                    style={{
                      fontSize: 12, padding: "4px 12px", borderRadius: 6, cursor: "pointer", border: "none",
                      background: o.active ? "#dcfce7" : "#fef2f2",
                      color: o.active ? S.green : S.red, fontWeight: 600,
                    }}
                  >
                    {o.active ? "Active" : "Inactive"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* New Offer Form */}
        <form onSubmit={handleCreate} style={{ background: S.card, borderRadius: 12, border: `1px solid ${S.border}`, padding: 28 }}>
          <p style={{ ...sectionHeadStyle, fontSize: 13, color: S.text, fontWeight: 800 }}>New Offer</p>

          {/* Basic Info */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Offer Name *</label>
              <input
                style={inputStyle} value={name} required
                placeholder="e.g. HeyMedSpa"
                onChange={e => { setName(e.target.value); setSlug(autoSlug(e.target.value)); setFunnelTag(autoSlug(e.target.value)); }}
              />
            </div>
            <div>
              <label style={labelStyle}>Slug (URL) *</label>
              <input
                style={inputStyle} value={slug} required
                placeholder="e.g. medspa"
                onChange={e => setSlug(autoSlug(e.target.value))}
              />
              <p style={{ fontSize: 11, color: S.muted, marginTop: 3 }}>Becomes /medspa, /medspa/schedule, /medspa/pricing</p>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Tagline</label>
              <input style={inputStyle} value={tagline} placeholder="AI-Powered Med Spa Growth" onChange={e => setTagline(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Funnel Tag * (lead source identifier)</label>
              <input
                style={inputStyle} value={funnelTag} required
                placeholder="e.g. medspa"
                onChange={e => setFunnelTag(autoSlug(e.target.value))}
              />
              <p style={{ fontSize: 11, color: S.muted, marginTop: 3 }}>Saved as the lead&apos;s source/tag</p>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
            <div>
              <label style={labelStyle}>Funnel Type</label>
              <select style={inputStyle} value={funnelType} onChange={e => setFunnelType(e.target.value)}>
                <option value="local">Local Services (HeyLocal template)</option>
                <option value="geo">GEO Real Estate</option>
                <option value="v2">GEO v2 Listing Machine</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Email Sequence Name</label>
              <input style={inputStyle} value={emailSequence} placeholder="e.g. medspa_nurture" onChange={e => setEmailSequence(e.target.value)} />
              <p style={{ fontSize: 11, color: S.muted, marginTop: 3 }}>Sequence key for lead enrollment (create in email system)</p>
            </div>
          </div>

          {/* Brand / Hero Customization */}
          <p style={sectionHeadStyle}>Brand &amp; Hero Copy (optional — defaults to HeyLocal copy)</p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>
            <div>
              <label style={labelStyle}>Hero Headline</label>
              <input style={inputStyle} value={heroHeadline} placeholder="e.g. Always on. Say hello to" onChange={e => setHeroHeadline(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Hero Accent (colored part)</label>
              <input style={inputStyle} value={heroAccent} placeholder="e.g. more clients." onChange={e => setHeroAccent(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Accent Color</label>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="color" value={colorPrimary} onChange={e => setColorPrimary(e.target.value)}
                  style={{ width: 40, height: 38, borderRadius: 6, border: `1px solid ${S.border}`, cursor: "pointer", padding: 2 }} />
                <input style={{ ...inputStyle, flex: 1 }} value={colorPrimary} placeholder="#E8185C"
                  onChange={e => setColorPrimary(e.target.value)} />
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Hero Subheadline</label>
            <input style={inputStyle} value={heroSub} placeholder="e.g. More clients. More revenue. All on autopilot." onChange={e => setHeroSub(e.target.value)} />
          </div>

          {/* Pricing Tiers */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, paddingBottom: 8, borderBottom: `1px solid ${S.border}` }}>
            <p style={{ ...sectionHeadStyle, margin: 0, padding: 0, border: "none" }}>Pricing (3 tiers)</p>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input type="checkbox" checked={addPricingNow} onChange={e => setAddPricingNow(e.target.checked)} style={{ accentColor: S.pink, width: 15, height: 15 }} />
              <span style={{ fontSize: 12, color: S.faint, fontWeight: 600 }}>Add pricing now</span>
            </label>
          </div>

          {!addPricingNow && (
            <div style={{ background: S.bg, border: `1px dashed ${S.border}`, borderRadius: 10, padding: "14px 18px", marginBottom: 20 }}>
              <p style={{ color: S.muted, fontSize: 13, margin: 0 }}>Pricing skipped — you can add it later by editing this offer. The /pricing page will not be linked until pricing is set.</p>
            </div>
          )}

          {addPricingNow && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
              {tiers.map((tier, i) => (
                <div key={i} style={{ background: S.bg, borderRadius: 10, padding: 16, border: `1px solid ${S.border}` }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: S.faint, marginBottom: 10 }}>
                    Tier {i + 1}{i === 1 ? " — Most Popular" : ""}
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: 12, marginBottom: 10 }}>
                    <div>
                      <label style={labelStyle}>Tier Name</label>
                      <input style={inputStyle} value={tier.name} placeholder={["Starter", "Growth", "Pro"][i]}
                        onChange={e => updateTier(i, "name", e.target.value)} />
                    </div>
                    <div>
                      <label style={labelStyle}>Price</label>
                      <input style={inputStyle} value={tier.price} placeholder="$1,500"
                        onChange={e => updateTier(i, "price", e.target.value)} />
                    </div>
                    <div>
                      <label style={labelStyle}>Stripe Payment Link</label>
                      <input style={inputStyle} value={tier.stripeLink} placeholder="https://buy.stripe.com/..."
                        onChange={e => updateTier(i, "stripeLink", e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Features (one per line)</label>
                    <textarea style={{ ...inputStyle, resize: "vertical" }} rows={3} value={tier.features}
                      placeholder={"Google Business Profile\nSEO optimization\nMonthly report"}
                      onChange={e => updateTier(i, "features", e.target.value)} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Proof Photos */}
          <p style={sectionHeadStyle}>Proof Photos</p>
          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Photo URLs (one per line)</label>
            <textarea style={{ ...inputStyle, resize: "vertical" }} rows={3} value={proofPhotos}
              placeholder={"https://geo.heypearl.io/proof-medspa-1.jpg\nhttps://geo.heypearl.io/proof-medspa-2.jpg"}
              onChange={e => setProofPhotos(e.target.value)} />
            <p style={{ fontSize: 11, color: S.muted, marginTop: 3 }}>Upload images to the /public folder first, then paste URLs here</p>
          </div>

          {error && (
            <div style={{ background: "#fef2f2", border: `1px solid #fca5a5`, borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: S.red, fontSize: 13 }}>
              {error}
            </div>
          )}

          {success && (
            <div style={{ background: "#f0fdf4", border: `1px solid #86efac`, borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: S.green, fontSize: 13 }}>
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={creating}
            style={{
              background: S.pink, color: "white", fontWeight: 700, fontSize: 14,
              padding: "11px 28px", borderRadius: 8, border: "none", cursor: creating ? "not-allowed" : "pointer",
              opacity: creating ? 0.7 : 1,
            }}
          >
            {creating ? "Creating..." : "Create Offer"}
          </button>
        </form>

      </div>
    </div>
  );
}
