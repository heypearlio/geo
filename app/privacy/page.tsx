import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | GEO by HeyPearl",
};

export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-[#F7F8FC] text-[#0F1E3A] font-sans">
      <nav className="bg-[#0F1E3A] flex items-center justify-center py-6 px-6 border-b border-white/10">
        <Link href="/">
          <Image src="/geo-logo.png" alt="GEO by HeyPearl" width={120} height={50} />
        </Link>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold mb-2 text-[#0F1E3A]">Privacy Policy</h1>
        <p className="text-[#6B7FA0] text-sm mb-12">Last updated: March 2026</p>

        <div className="space-y-10 text-[#4A5E7A] leading-relaxed">

          <section>
            <h2 className="text-xl font-semibold text-[#0F1E3A] mb-3">1. Who We Are</h2>
            <p>GEO by HeyPearl (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates geo.heypearl.io. This Privacy Policy explains how we collect, use, and protect information you provide when you use our website or request a free AI Visibility Report.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#0F1E3A] mb-3">2. Information We Collect</h2>
            <p className="mb-3">We collect information you voluntarily provide, including:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>First name</li>
              <li>Email address</li>
              <li>Website URL</li>
            </ul>
            <p className="mt-3">We also collect standard technical data automatically, including IP address, browser type, referring URLs, and pages visited, through cookies and analytics tools.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#0F1E3A] mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>To deliver your free AI Visibility Report</li>
              <li>To schedule and conduct your free strategy call</li>
              <li>To send relevant marketing emails (you may unsubscribe at any time)</li>
              <li>To improve our services and website</li>
              <li>To comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#0F1E3A] mb-3">4. Cookies and Tracking</h2>
            <p>We use cookies and similar tracking technologies, including the Facebook Pixel, to measure ad performance and deliver relevant advertising on Meta platforms. You can control cookies through your browser settings. Opting out of Facebook tracking can be done at <a href="https://www.facebook.com/settings/?tab=ads" className="text-blue-400 underline" target="_blank" rel="noopener noreferrer">facebook.com/settings</a>.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#0F1E3A] mb-3">5. Third-Party Services</h2>
            <p>We use the following third-party services that may process your data:</p>
            <ul className="list-disc list-inside space-y-2 ml-2 mt-3">
              <li><strong className="text-white">Flodesk</strong>: email marketing and list management</li>
              <li><strong className="text-white">Calendly</strong>: scheduling strategy calls</li>
              <li><strong className="text-white">Meta (Facebook/Instagram)</strong>: advertising and analytics</li>
              <li><strong className="text-white">Vercel</strong>: website hosting</li>
            </ul>
            <p className="mt-3">Each provider has its own privacy policy governing how they handle data.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#0F1E3A] mb-3">6. Data Sharing</h2>
            <p>We do not sell your personal information. We do not share your data with third parties except as described above or as required by law.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#0F1E3A] mb-3">7. Data Retention</h2>
            <p>We retain your information for as long as necessary to provide our services or as required by law. You may request deletion of your data at any time by contacting us.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#0F1E3A] mb-3">8. Your Rights</h2>
            <p>Depending on your location, you may have the right to access, correct, or delete your personal data, or to opt out of certain uses. To exercise any of these rights, contact us at the email below.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#0F1E3A] mb-3">9. Contact</h2>
            <p>For privacy-related questions or requests, contact us at: <a href="mailto:hello@heypearl.io" className="text-blue-400 underline">hello@heypearl.io</a></p>
          </section>

        </div>

        <div className="mt-16 pt-8 border-t border-[#0F1E3A]/10 text-center">
          <Link href="/" className="text-[#6B7FA0] hover:text-[#0F1E3A] text-sm transition-colors">
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
