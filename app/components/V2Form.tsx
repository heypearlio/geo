"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitV2Form } from "@/app/v2/actions";

const CTA_BTN =
  "inline-block bg-[#16A34A] hover:bg-[#15803d] text-white font-bold text-base md:text-lg px-6 md:px-8 py-3 md:py-4 rounded-xl transition-all duration-200 shadow-lg shadow-[#16A34A]/25 cursor-pointer";

export default function V2Form({
  scheduleRoute,
  affiliateTag,
}: {
  scheduleRoute?: string;
  affiliateTag?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const inputClass =
    "w-full bg-[#F7F8FC] border border-[#0F1E3A]/12 rounded-xl px-4 py-3 text-[#0F1E3A] placeholder-[#9BACC0] focus:outline-none focus:border-[#16A34A] focus:bg-white transition-colors text-[16px]";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    try {
      const result = await submitV2Form(fd);
      if (result.success) {
        const email = (fd.get("email") as string) ?? "";
        const city = (fd.get("city") as string) ?? "";
        const firstName = (fd.get("firstName") as string) ?? "";
        const lastName = (fd.get("lastName") as string) ?? "";
        const dest = scheduleRoute ?? "/v2schedule";
        router.push(
          `${dest}?email=${encodeURIComponent(email)}&city=${encodeURIComponent(city)}&firstName=${encodeURIComponent(firstName)}&lastName=${encodeURIComponent(lastName)}`
        );
      } else {
        setError(result.error ?? "Something went wrong.");
        setLoading(false);
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input type="hidden" name="affiliateTag" value={affiliateTag ?? ""} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-[#0F1E3A] uppercase tracking-wide mb-1.5">First Name *</label>
          <input name="firstName" required placeholder="Sarah" className={inputClass} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#0F1E3A] uppercase tracking-wide mb-1.5">Last Name *</label>
          <input name="lastName" required placeholder="Johnson" className={inputClass} />
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-[#0F1E3A] uppercase tracking-wide mb-1.5">Email *</label>
        <input name="email" type="email" required placeholder="sarah@brokerage.com" className={inputClass} />
      </div>
      <div>
        <label className="block text-xs font-semibold text-[#0F1E3A] uppercase tracking-wide mb-1.5">Your Market *</label>
        <input name="city" required placeholder="Austin, TX" className={inputClass} />
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <button type="submit" disabled={loading} className={`w-full ${CTA_BTN} text-center`}>
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Checking your market...
          </span>
        ) : (
          "Find Out If My Market Is Available →"
        )}
      </button>
      <div className="flex items-center justify-center gap-6 flex-wrap pt-1">
        {["Free. No credit card.", "30-min strategy call.", "Seller side only."].map((item) => (
          <span key={item} className="flex items-center gap-1.5 text-xs text-[#6B7FA0]">
            <span className="text-green-500 font-bold">✓</span>{item}
          </span>
        ))}
      </div>
    </form>
  );
}
