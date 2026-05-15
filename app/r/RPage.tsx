"use client";

import { useSearchParams } from "next/navigation";

const MESSAGES: Record<string, { heading: string; body: string }> = {
  still_interested:    { heading: "Good to know.", body: "I will keep your market held and follow up with something useful soon." },
  need_more_time:      { heading: "Completely understood.", body: "I will check back in and make sure you have everything you need when the time is right." },
  yes_want_spot:       { heading: "Your market is still yours.", body: "I will be in touch shortly with next steps." },
  not_right_now:       { heading: "Got it.", body: "I will give you some space. Your market stays open for now." },
  objection_price:     { heading: "Heard you on the investment.", body: "I will send you something that addresses the numbers directly." },
  objection_timing:    { heading: "Timing is real.", body: "I will follow up with something that helps you think through when makes the most sense." },
  objection_unclear:   { heading: "Fair enough.", body: "I will make the offer clearer. Watch for my next email." },
  objection_proof:     { heading: "Proof is coming.", body: "I will share some real results from agents in markets like yours." },
  price_confirmed:     { heading: "Noted.", body: "I will follow up with a way to make the investment feel more manageable." },
  price_not_issue:     { heading: "Good to know.", body: "We will figure out what is actually in the way." },
  affiliate_interested:{ heading: "The partner program is a great option.", body: "I will send you the details on how it works." },
  ready_to_sign:       { heading: "Let's do this.", body: "I will send you the link to get started." },
  goal_visibility:     { heading: "Visibility is the foundation.", body: "I will show you exactly how GEO builds that in your market." },
  goal_leads:          { heading: "Leads are the goal.", body: "I will show you how AI recommendations turn into direct inbound inquiries." },
  goal_both:           { heading: "Both is the right answer.", body: "That is exactly what GEO is built to deliver." },
  diy_considering:     { heading: "I respect that.", body: "I will send you something honest about what it actually takes." },
  diy_not_interested:  { heading: "Done for you is the right call.", body: "I will follow up with what the next step looks like." },
  timing_now:          { heading: "Let's move.", body: "I will reach out with how to get started today." },
  timing_90days:       { heading: "90 days noted.", body: "I will check back in at the right time and make sure your market is still available." },
  timing_unsure:       { heading: "No pressure.", body: "I will keep you posted and give you time to figure it out." },
  comparing_services:  { heading: "That comparison is worth clearing up.", body: "My next email will show you exactly how GEO is different." },
  understands_difference: { heading: "Good.", body: "Then you already know why this matters. I will follow up soon." },
  ready_signup:        { heading: "Let's get your market locked in.", body: "I will send you the link to get started right away." },
  affiliate_path:      { heading: "The partner program works.", body: "I will send you the full details on how to refer friends and get GEO free." },
  final_yes:           { heading: "Let's go.", body: "Your market is yours. I will send you everything you need to get started." },
  final_no:            { heading: "Understood.", body: "The door stays open. Reach out anytime if anything changes." },
};

const DEFAULT = { heading: "Got it.", body: "Thank you for letting me know. I will follow up soon." };

export default function RPage() {
  const params = useSearchParams();
  const answer = params.get("a") ?? "";
  const msg = MESSAGES[answer] ?? DEFAULT;

  return (
    <main style={{
      minHeight: "100vh",
      background: "#F7F8FC",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
      padding: "40px 16px",
    }}>
      <div style={{
        background: "#ffffff",
        borderRadius: 16,
        padding: "56px 48px",
        maxWidth: 480,
        width: "100%",
        textAlign: "center",
        boxShadow: "0 2px 24px rgba(0,0,0,0.06)",
      }}>
        <div style={{ fontSize: 40, marginBottom: 20 }}>✓</div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "#0F1E3A", margin: "0 0 16px", lineHeight: 1.3 }}>
          {msg.heading}
        </h1>
        <p style={{ fontSize: 16, color: "#4A5E7A", margin: 0, lineHeight: 1.7 }}>
          {msg.body}
        </p>
      </div>
    </main>
  );
}
