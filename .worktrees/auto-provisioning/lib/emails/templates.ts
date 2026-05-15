import { emailWrapper, btn, h1, p, sig, responseBtns, proofImg, PINK, NAVY } from "./base";
import { dn } from "./dn";

interface EmailData {
  firstName?: string;
  city?: string;
  auditId?: string;
  email?: string;
  overall?: number;
  seo?: number;
  ai?: number;
  stripeLink?: string;
  packagePrice?: string;
}

// ─── LEAD NURTURE ────────────────────────────────────────────────────────────

export function leadNurture1({ firstName, auditId, email, overall, seo, ai }: EmailData) {
  const display = dn(firstName);
  const hasScores = overall !== undefined && seo !== undefined && ai !== undefined;
  const reportLink = auditId
    ? `https://geo.heypearl.io/report?auditId=${auditId}&email=${encodeURIComponent(email ?? "")}${firstName ? `&firstName=${encodeURIComponent(firstName)}` : ""}${hasScores ? `&overall=${overall}&seo=${seo}&ai=${ai}` : ""}`
    : `https://geo.heypearl.io/report?email=${encodeURIComponent(email ?? "")}${firstName ? `&firstName=${encodeURIComponent(firstName)}` : ""}`;
  return {
    subject: display ? `${display}, I found something in your market` : "I found something in your market",
    html: emailWrapper(`
      ${h1(`Your AI Visibility Score Is Ready${display ? `, ${display}` : ""}`)}
      ${p("The results are in. Your free AI Visibility Report is ready right now.")}
      ${p("This report shows you exactly how visible you are to AI tools like ChatGPT, Perplexity, and Google AI when buyers in your market search for a real estate agent. Most agents score a 0. Let's see where you land.")}
      ${btn("View My AI Visibility Score Report", reportLink)}
      ${p("While you're reviewing it, keep this in mind: there is exactly <strong>one spot available per market</strong>. The moment another agent in your city books their strategy call, your window closes.")}
      ${p("If your score has room to grow, that's actually great news. It means there's an open opportunity in your market right now.")}
      ${sig()}
    `, "lead_nurture"),
  };
}

export function leadNurture2({ firstName, city }: EmailData) {
  const display = dn(firstName);
  const name = display ?? "Hey";
  const location = city ?? "your area";
  return {
    subject: display ? `${display}, this is the part most agents miss` : "This is the part most agents miss",
    html: emailWrapper(`
      ${h1(display ? `${display}, This Is the Part Most Agents Miss` : "This Is the Part Most Agents Miss")}
      ${p("You ran your AI Visibility Score. Most agents look at it, nod, and move on.")}
      ${p("But here's what the report doesn't say out loud:")}
      ${p(`We've already seen agents in ${location} start optimizing for AI visibility. The question is whether you'll be the one AI recommends, or someone else.`)}
      ${p(`We checked — your market is still open. But we can only work with one agent per city. Once someone else claims it, it's gone.`)}
      ${btn("See If My Market Is Available", "https://geo.heypearl.io/schedule")}
      ${p("No pitch. No pressure. Just a 30-minute call to walk through your report together.")}
      ${sig()}
    `, "lead_nurture"),
  };
}

export function leadNurture3({ firstName, city }: EmailData) {
  const display = dn(firstName);
  const name = display ?? "Hey";
  return {
    subject: city ? `Quick question about ${city}` : "Quick question about your market",
    html: emailWrapper(`
      ${h1(`One Agent Per Market. That's the Rule.`)}
      ${p(`${name}, I want to be straight with you.`)}
      ${p("GEO is not a course. It's not a membership. It's not something 50 agents in your city can all use at the same time. It's a done-for-you AI visibility system that makes <em>you</em> the agent AI recommends in your market, and that only works if we're running it for one agent per city.")}
      ${p("Right now, your market is available. That could change today.")}
      ${p("Every week, agents across the country are claiming their markets. Once one agent in your city books a strategy call and moves forward, your spot disappears. Not temporarily. Permanently.")}
      ${p("The agents winning with GEO right now are the ones who acted before someone else in their market did. That's the only difference between them and the agents who missed it.")}
      ${btn("Check My Market", "https://geo.heypearl.io/schedule")}
      ${sig()}
    `, "lead_nurture"),
  };
}

export function leadNurture4({ firstName }: EmailData) {
  const display = dn(firstName);
  const name = display ?? "Hey";
  return {
    subject: display ? `${display}, saw something in your report` : "Saw something in your report",
    html: emailWrapper(`
      ${h1(`This Is the Last Email I'm Sending`)}
      ${p(`${name}, this is it.`)}
      ${p("I've shown you your AI Visibility Score. I've explained what it means. I've told you that markets are filling up. I'm not going to keep emailing you after this.")}
      ${p("Here's what I know: if you're still on the fence, it's probably because you're not sure this works for agents like you. So let me be direct.")}
      <div style="background:#F7F8FC;border-left:4px solid ${PINK};padding:20px 24px;margin:0 0 20px;border-radius:0 8px 8px 0;">
        <p style="margin:0 0 12px;font-weight:700;color:${NAVY};">GEO works for agents who:</p>
        <ul style="margin:0;padding-left:20px;color:#4A5E7A;line-height:2;">
          <li>Are serious about growing their business in 2026</li>
          <li>Don't want to dance on TikTok to get leads</li>
          <li>Want to own their market before a competitor does</li>
          <li>Are willing to invest in a system that works while they sleep</li>
        </ul>
      </div>
      ${p("If that's not you, no hard feelings. But if it is, your market is still open right now and the strategy call is free.")}
      ${btn("Book My Free 30-Min Call", "https://geo.heypearl.io/schedule")}
      ${p("I'll give you some space after this. But if anything changes, you know where to find me.")}
      ${sig()}
    `, "lead_nurture"),
  };
}

export function leadNurture5({ firstName }: EmailData) {
  const display = dn(firstName);
  const name = display ?? "Hey";
  return {
    subject: display ? `${display}, your market just got interesting` : "Your market just got interesting",
    html: emailWrapper(`
      ${h1(`Still Thinking It Over?`)}
      ${p(`${name}, it's been a couple of weeks since you got your AI Visibility Score. I wanted to check in. No pitch, just a genuine question.`)}
      ${p("Has anything changed in your market? Are you still looking at ways to grow without cold calls, door knocking, or dancing on social media?")}
      ${p("If the timing wasn't right before, I get it. But I want to make sure you have the full picture before your market closes.")}
      ${p("Here's what agents who moved forward two weeks ago are doing right now: their AI-optimized content is being published, their authority signals are being built, and their names are starting to appear in AI search results in their city.")}
      ${p("The agents who waited are watching that happen from the sidelines.")}
      ${btn("Claim My Market", "https://geo.heypearl.io/schedule")}
      ${p("If this isn't for you, no hard feelings at all. But if there's any part of you that's still curious, now is the time.")}
      ${sig()}
    `, "lead_nurture"),
  };
}

export function leadNurture6({ firstName, city }: EmailData) {
  const display = dn(firstName);
  const name = display ?? "Hey";
  return {
    subject: city ? `Last thing on ${city}` : "One last thing",
    html: emailWrapper(`
      ${h1(`I Have One Question For You`)}
      ${p(`${name}, I'll keep this short.`)}
      ${p("What would it mean for your business if buyers in your city started seeing your name every time they asked ChatGPT, Perplexity, or Google AI who to call for real estate?")}
      ${p("That's not a hypothetical. That's what GEO does. And it's working right now for agents in markets just like yours.")}
      ${p("I'm not going to keep showing up in your inbox. But I'd feel like I let you down if I didn't give you one last real shot at this.")}
      ${p("Your market is still available. The call is free. It's 30 minutes.")}
      ${btn("One Agent Per Market — Check Yours", "https://geo.heypearl.io/schedule")}
      ${p("Whatever you decide, I'm rooting for you.")}
      ${sig()}
    `, "lead_nurture"),
  };
}

// ─── SCHEDULE ABANDONED ──────────────────────────────────────────────────────

export function scheduleAbandoned1({ firstName, city }: EmailData) {
  const display = dn(firstName);
  const name = display ?? "Hey";
  const location = city ?? "your area";
  return {
    subject: display ? `${display}, forgot to finish?` : "Forgot to finish?",
    html: emailWrapper(`
      ${h1(`You Were This Close`)}
      ${p(`${name}, looks like you started booking your strategy call but didn't finish. No worries — it happens.`)}
      ${p("Here's the link to grab your spot:")}
      ${btn("Book My Free Strategy Call", "https://geo.heypearl.io/schedule")}
      ${p("It's 30 minutes. Free. And I'll build 3 AI authority assets for you live on the call — yours to keep.")}
      ${p(`Your market in ${location} is still open. Can't guarantee how long.`)}
      ${sig()}
    `, "schedule_abandoned"),
  };
}

// ─── POST-BOOKING ────────────────────────────────────────────────────────────

export function postBooking1({ firstName }: EmailData) {
  const display = dn(firstName);
  const name = display ?? "Hey";
  return {
    subject: display ? `${display}, you're all set` : "You're all set",
    html: emailWrapper(`
      ${h1(`You're In. Here's What Happens Next.`)}
      ${p(`${name}, your strategy call is confirmed. Check your calendar. You'll see the invite with all the details.`)}
      ${p("To make your call as valuable as possible, Misti is preparing three free gifts to walk through with you live:")}
      <table cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 24px;">
        ${[
          ["AI-Optimized Bio", "Written in the exact language AI search engines use to recommend agents."],
          ["Google Business Profile Script", "The exact description that ranks you in local AI and map searches."],
          ["3 Market Authority Talking Points", "Use these in your next listing appointment to win on the spot."],
        ].map(([label, desc]) => `
        <tr>
          <td style="padding:14px 0;border-bottom:1px solid #EDF0FA;vertical-align:top;">
            <p style="margin:0 0 4px;font-weight:700;color:${NAVY};">${label}</p>
            <p style="margin:0;font-size:14px;color:#4A5E7A;">${desc}</p>
          </td>
        </tr>`).join("")}
      </table>
      ${p("These are yours. No strings attached. Just for showing up.")}
      ${p("One thing to do before the call: think about your #1 goal for your business in the next 90 days. Misti will build your strategy around that.")}
      ${sig()}
    `, "post_booking"),
  };
}

export function postBooking2({ firstName, email }: EmailData) {
  const display = dn(firstName);
  const name = display ?? "Hey";
  const auditLink = `https://geo.heypearl.io/audit${email ? `?email=${encodeURIComponent(email)}` : ""}`;
  return {
    subject: display ? `See you tomorrow, ${display}` : "See you tomorrow",
    html: emailWrapper(`
      ${h1(`Can't Wait for Tomorrow`)}
      ${p(`${name}, just wanted to pop in — we're on for tomorrow and I'm looking forward to it.`)}
      ${p("To make the most of our 30 minutes together, do these two things before we hop on:")}
      <table cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 24px;">
        ${[
          ["Run your free AI Visibility Score", "Takes 60 seconds. Go to geo.heypearl.io/audit, enter your website and market. Bring your score to the call and I'll walk you through exactly what it means for your market.", auditLink],
          ["Think about your #1 goal for the next 90 days", "More listings? More buyers? A specific neighborhood you want to own? I'll build your strategy around that number on the call.", ""],
        ].map(([label, desc, link]) => `
        <tr>
          <td style="padding:14px 0;border-bottom:1px solid #EDF0FA;vertical-align:top;">
            <p style="margin:0 0 6px;font-weight:700;color:${NAVY};">${label}</p>
            <p style="margin:0;font-size:14px;color:#4A5E7A;">${desc}</p>
            ${link ? `<a href="${link}" style="display:inline-block;margin-top:10px;font-size:14px;font-weight:600;color:#E8185C;">Go now →</a>` : ""}
          </td>
        </tr>`).join("")}
      </table>
      ${p("That's it. I'll have everything pulled up and ready on my end.")}
      ${p("See you tomorrow.")}
      ${sig()}
    `, "post_booking"),
  };
}

export function postBooking3({ firstName, city }: EmailData) {
  const display = dn(firstName);
  const name = display ?? "Hey";
  const location = city ?? "your area";
  return {
    subject: display ? `${display}, quick note before we talk` : "Quick note before we talk",
    html: emailWrapper(`
      ${h1(`Something I Noticed About Your Market`)}
      ${p(`${name}, quick note before we talk.`)}
      ${p(`I pulled your report and I want to share something I noticed about ${location} on our call.`)}
      ${p("Before then, I thought you'd want to hear from someone who was in a similar spot:")}
      <div style="background:#F7F8FC;border-left:4px solid ${PINK};padding:20px 24px;margin:0 0 20px;border-radius:0 8px 8px 0;">
        <p style="margin:0 0 12px;font-size:15px;font-style:italic;color:${NAVY};">"I had no idea how invisible I was. They showed me my score, told me exactly what to fix, and laid out an automation plan I could start that week. Worth every minute."</p>
        <p style="margin:0;font-size:13px;font-weight:700;color:#4A5E7A;">Jennifer R. — Scottsdale, AZ</p>
      </div>
      ${p("See you on the call. I'll have everything pulled up and ready.")}
      ${sig()}
    `, "post_booking"),
  };
}

export function postBooking4({ firstName }: EmailData) {
  const display = dn(firstName);
  const name = display ?? "Hey";
  return {
    subject: display ? `See you soon, ${display}` : "See you soon",
    html: emailWrapper(`
      ${h1(`We're On For Today`)}
      ${p(`${name}, just a quick reminder. Your call with Misti is today.`)}
      ${p("Quick reminder — I'm building 3 things for you live on the call:")}
      <ul style="margin:0 0 20px;padding-left:24px;color:#4A5E7A;line-height:2;">
        <li>Your AI-optimized bio</li>
        <li>Your Google Business Profile script</li>
        <li>3 market authority talking points</li>
      </ul>
      ${p("These are yours to keep regardless of what you decide.")}
      ${p("Here's the link if you need it:")}
      ${btn("Join My Strategy Call", "https://geo.heypearl.io/schedule")}
      ${p("See you soon.")}
      ${sig()}
    `, "post_booking"),
  };
}

export function postBooking5({ firstName }: EmailData) {
  const display = dn(firstName);
  const name = display ?? "Hey";
  return {
    subject: display ? `${display}, great talking today` : "Great talking today",
    html: emailWrapper(`
      ${h1(`Glad We Got to Talk`)}
      ${p(`${name}, it was great talking today.`)}
      ${p("I hope the call gave you a clearer picture of what's possible in your market.")}
      ${p("If any questions came up after we hung up, just reply to this email. I'm here.")}
      ${p("And whenever you're ready to move forward, your market is still open.")}
      ${sig()}
    `, "post_booking"),
  };
}

// ─── NO-SHOW ────────────────────────────────────────────────────────────────

export function noShow1({ firstName }: EmailData) {
  const display = dn(firstName);
  const name = display ?? "Hey";
  return {
    subject: display ? `Hey ${display}, still want to connect?` : "Still want to connect?",
    html: emailWrapper(`
      ${h1(`Let's Find a Better Time`)}
      ${p(`${name}, I know life gets busy. I just wanted to reach out and make sure you still have a chance to grab your market before someone else does.`)}
      ${p("Your spot is still open right now. The call is 30 minutes and completely free. Pick a time that actually works for you and let's talk.")}
      ${btn("Grab a New Time", "https://geo.heypearl.io/schedule")}
      ${sig()}
    `, "no_show"),
  };
}

export function noShow2({ firstName, city }: EmailData) {
  const display = dn(firstName);
  const name = display ?? "Hey";
  const loc = city ?? "your market";
  return {
    subject: city ? `Still thinking about ${city}?` : "Still thinking about your market?",
    html: emailWrapper(`
      ${h1(`Your Market Won't Wait Forever`)}
      ${p(`${name}, I'm still holding ${loc} for you. But I want to be honest — I have agents inquiring about markets that are already taken. Open spots don't stay that way for long.`)}
      ${p("If the timing wasn't right before, let's find something that works. The call is 30 minutes, completely free, and I'll show you exactly where you stand in your market right now.")}
      ${btn("Pick a New Time", "https://geo.heypearl.io/schedule")}
      ${sig()}
    `, "no_show"),
  };
}

export function noShow3({ firstName }: EmailData) {
  const display = dn(firstName);
  const name = display ?? "Hey";
  return {
    subject: display ? `${display}, your market update` : "Your market update",
    html: emailWrapper(`
      ${h1(`Still Here When You're Ready`)}
      ${p(`${name}, you booked a call, and that tells me you saw something worth your time. I don't want you to lose your shot because the timing was off.`)}
      ${p("Was it a question you didn't have answered yet? Something about the offer that didn't feel right? Whatever it is, I'd rather hear it than have you walk away without the full picture.")}
      ${p("Hit reply and tell me what's on your mind, or grab 30 minutes and let's just talk it through.")}
      ${btn("Book a Time", "https://geo.heypearl.io/schedule")}
      ${p("Your market is still open. And I'm still here.")}
      ${sig()}
    `, "no_show"),
  };
}

export function noShow4({ firstName }: EmailData) {
  const display = dn(firstName);
  const name = display ?? "Hey";
  return {
    subject: display ? `${display}, one last thing` : "One last thing",
    html: emailWrapper(`
      ${h1(`Your Window Is Getting Smaller`)}
      ${p(`${name}, I've kept your market open. But I can't do it much longer.`)}
      ${p("Here's what I know from working with agents across the country: the ones who hesitate the longest are usually the ones who call back three months later and say their market is gone.")}
      ${p("I don't want that to be you.")}
      <div style="background:#F7F8FC;border-left:4px solid ${PINK};padding:20px 24px;margin:0 0 20px;border-radius:0 8px 8px 0;">
        <p style="margin:0 0 8px;font-weight:700;color:${NAVY};">What you get on the call, no obligation:</p>
        <ul style="margin:0;padding-left:20px;color:#4A5E7A;line-height:2;">
          <li>Your full AI visibility breakdown for your specific market</li>
          <li>Exactly which agents are outranking you and why</li>
          <li>Your AI-Optimized Bio, Google Business script, and 3 authority talking points. Free, done for you, yours to keep.</li>
        </ul>
      </div>
      ${p("30 minutes. Free. This is it.")}
      ${btn("Rebook in 30 Seconds", "https://geo.heypearl.io/schedule")}
      ${p("After this I'll close your spot. I hope to talk soon.")}
      ${sig()}
    `, "no_show"),
  };
}

// ─── VIDEO WATCHED ───────────────────────────────────────────────────────────

export function videoWatched1({ firstName }: EmailData) {
  const display = dn(firstName);
  const name = display ?? "Hey";
  return {
    subject: display ? `You watched it, ${display}. You know this is real.` : "You watched it. You know this is real.",
    html: emailWrapper(`
      ${h1(`You Saw It. Now Here's Your Next Step.`)}
      ${p(`${name}, you just watched how GEO works. You saw the score. You heard exactly how AI search is changing real estate right now.`)}
      ${p("Most agents never make it through that video. You did. That tells me you're serious.")}
      ${p("So let me be direct: your market is still open. The strategy call is free. And everything you just watched, the AI-Optimized Bio, the Google Business script, the authority talking points, is waiting for you on the other side of a 30-minute conversation.")}
      ${p("There's no better time than right now, while it's all fresh.")}
      ${btn("Book My Free Strategy Call", "https://geo.heypearl.io/schedule")}
      ${p("I'll see you on the call.")}
      ${sig()}
    `, "video_watched"),
  };
}

// ─── VIDEO ABANDONED ─────────────────────────────────────────────────────────

export function videoAbandoned1({ firstName }: EmailData) {
  const display = dn(firstName);
  const name = display ?? "Hey";
  return {
    subject: display ? `You missed the most important part, ${display}` : "You missed the most important part",
    html: emailWrapper(`
      ${h1(`The Part You Didn't See`)}
      ${p(`${name}, you started watching the GEO overview video and something pulled you away.`)}
      ${p("Here's what you missed: the part where Misti shows a real agent's score transformation, before and after GEO, and the exact AI searches that were sending buyers to their competitors instead of them.")}
      ${p("That's the moment most agents say 'I had no idea this was happening in my market.'")}
      ${p("You don't need to watch the whole video to get the same clarity. That's exactly what the strategy call is for.")}
      ${btn("Book My Free Strategy Call", "https://geo.heypearl.io/schedule")}
      ${p("30 minutes. Misti will show you the exact same thing live, for your market, your score, your competition.")}
      ${sig()}
    `, "video_abandoned"),
  };
}

// ─── LONG TERM NURTURE ───────────────────────────────────────────────────────

export function longTermNurture1({ firstName }: EmailData) {
  const display = dn(firstName);
  const name = display ?? "Hey";
  return {
    subject: display ? `Checking in on your market, ${display}` : "Checking in on your market",
    html: emailWrapper(`
      ${h1(`A Lot Can Change in a Month`)}
      ${p(`${name}, it's been about a month since you got your AI Visibility Score. I've been thinking about your market.`)}
      ${p("AI search has grown significantly in the last 30 days. More buyers are using ChatGPT, Perplexity, and Google AI to find real estate agents before they ever pick up the phone. The agents who moved early are already seeing it in their lead flow.")}
      ${p("Your market is still available. I don't say that to pressure you. I say it because I genuinely don't know how much longer that will be true.")}
      ${btn("Book My Free Strategy Call", "https://geo.heypearl.io/schedule")}
      ${p("Still free. Still 30 minutes. Still worth it.")}
      ${sig()}
    `, "long_term_nurture"),
  };
}

export function longTermNurture2({ firstName }: EmailData) {
  const display = dn(firstName);
  const name = display ?? "Hey";
  return {
    subject: display ? `${display}, what agents are saying two months in` : "What agents are saying two months in",
    html: emailWrapper(`
      ${h1(`Here's What's Happening for Agents Who Moved Forward`)}
      ${p(`${name}, two months ago you looked at GEO. Some agents in markets like yours moved forward. Here's what they're experiencing right now:`)}
      <ul style="margin:0 0 20px;padding-left:24px;color:#4A5E7A;line-height:2;">
        <li>Their name is appearing in AI search results in their city</li>
        <li>Buyers are referencing them by name before the first call</li>
        <li>Their Google Business Profile is ranking higher than it ever has</li>
        <li>They are generating qualified leads without cold outreach</li>
      </ul>
      ${p("None of this is magic. It's a system. And your market still has an open spot.")}
      ${btn("Let's Talk. Book My Strategy Call.", "https://geo.heypearl.io/schedule")}
      ${sig()}
    `, "long_term_nurture"),
  };
}

export function longTermNurture3({ firstName }: EmailData) {
  const display = dn(firstName);
  const name = display ?? "Hey";
  return {
    subject: display ? `${display}, AI search just got bigger` : "AI search just got bigger. Here's what it means for you.",
    html: emailWrapper(`
      ${h1(`The AI Search Landscape Just Shifted`)}
      ${p(`${name}, I want to share something that's directly relevant to your market.`)}
      ${p("In the last 90 days, AI-powered search has expanded in ways that make GEO even more important than when you first got your score. More platforms. More searches. More buyers starting their agent search with an AI prompt instead of Google.")}
      ${p("The agents with strong AI visibility right now are compounding their advantage every week. The ones who are invisible are falling further behind.")}
      ${p("I still have your market open. But I need to know if you want it.")}
      ${btn("Claim My Market", "https://geo.heypearl.io/schedule")}
      ${p("Book a call and let's look at what's happening in your specific city right now.")}
      ${sig()}
    `, "long_term_nurture"),
  };
}

export function longTermNurture4({ firstName }: EmailData) {
  const display = dn(firstName);
  const name = display ?? "Hey";
  return {
    subject: display ? `Are you still growing on referrals alone, ${display}?` : "Are you still growing on referrals alone?",
    html: emailWrapper(`
      ${h1(`There Is a Better Way to Grow`)}
      ${p(`${name}, most agents I talk to are still building their business the same way they always have: referrals, open houses, maybe some social media.`)}
      ${p("That still works. But it's slower. And it requires constant output from you.")}
      ${p("GEO is different. Once your AI visibility is built, it runs without you. Buyers find your name. They arrive already knowing who you are. The conversation starts from a position of authority instead of cold outreach.")}
      ${p("That's not a pitch. It's just what the data shows for agents who have it running in their market.")}
      ${btn("Book My Free Strategy Call", "https://geo.heypearl.io/schedule")}
      ${p("Your market is open. The call is free. Come see the numbers for yourself.")}
      ${sig()}
    `, "long_term_nurture"),
  };
}

export function longTermNurture5({ firstName }: EmailData) {
  const display = dn(firstName);
  const name = display ?? "Hey";
  return {
    subject: display ? `Someone in your market might be close, ${display}` : "Someone in your market might be close",
    html: emailWrapper(`
      ${h1(`I Can't Hold Your Market Much Longer`)}
      ${p(`${name}, I want to be honest with you.`)}
      ${p("I've kept your market open for five months. In that time, I've had inquiries from agents in cities near yours. I've held them off because you came first.")}
      ${p("But I can't do that indefinitely. If another agent in your city reaches out and is ready to move forward, I have to respect that.")}
      ${p("If there is any part of you that still wants this, now is the time to say so.")}
      ${btn("I'm Ready. Book My Call.", "https://geo.heypearl.io/schedule")}
      ${p("If the timing genuinely isn't right, I understand. Just know the door is still open today.")}
      ${sig()}
    `, "long_term_nurture"),
  };
}

export function longTermNurture6({ firstName }: EmailData) {
  const display = dn(firstName);
  const name = display ?? "Hey";
  return {
    subject: display ? `${display}, six months later — still here if you want it` : "Six months later. Still here if you want it.",
    html: emailWrapper(`
      ${h1(`Still Here. Still Open.`)}
      ${p(`${name}, six months ago you got your AI Visibility Score. I've stayed in touch because your market has stayed available and I believe in what this does for agents who commit to it.`)}
      ${p("I'm not going to keep showing up in your inbox if this isn't for you. But I'd feel like I let you down if I didn't give you one final, real shot.")}
      ${p("If you're still in real estate and still growing your business, the door is open. The call is 30 minutes and completely free. Your market is available.")}
      ${btn("Book My Free Strategy Call", "https://geo.heypearl.io/schedule")}
      ${p("Whatever you decide, I'm rooting for you.")}
      ${sig()}
    `, "long_term_nurture"),
  };
}

// ─── AUDIT INVITE ────────────────────────────────────────────────────────────

export function auditInvite1({ firstName, city }: EmailData) {
  const display = dn(firstName);
  const name = display ?? "Hey";
  const location = city ? city : "your market";
  return {
    subject: display ? `${display}, I looked you up in AI` : "I looked you up in AI",
    html: emailWrapper(`
      ${h1(`I Searched For You In ChatGPT`)}
      ${p(`${name}, I did something most agents don't think to do. I opened ChatGPT and typed: "Who is the best real estate agent in ${location}?"`)}
      ${p("Your name didn't come up.")}
      ${p("That's not a knock on you. Most agents are invisible to AI right now. The ones who aren't are quietly picking up buyers who never call a referral, never Google anyone, and never ask a neighbor. They just ask AI.")}
      ${p("I built GEO to fix exactly this. It's a done-for-you system that makes you the agent AI recommends when buyers in your market ask. And it's exclusive — one agent per market, no exceptions.")}
      ${p("Your market is still available. Run your free AI Visibility Score and see exactly where you stand right now.")}
      ${btn("See My AI Visibility Score — Free", "https://geo.heypearl.io/audit")}
      ${sig()}
    `, "audit_invite"),
  };
}

export function auditInvite2({ firstName, city }: EmailData) {
  const display = dn(firstName);
  const name = display ?? "Hey";
  const location = city ? city : "your market";
  return {
    subject: display ? `${display}, someone in ${location} is already asking` : "Someone in your market is already asking",
    html: emailWrapper(`
      ${h1(`Buyers Are Asking AI For Agents Right Now`)}
      ${p(`${name}, while you're reading this, buyers in ${location} are asking ChatGPT, Perplexity, and Google AI who to call.`)}
      ${p("AI gives them a name. It's not random. It's based on signals — reviews, content, online presence, authority. The agent who owns those signals owns the recommendation.")}
      ${p("Most agents have no idea this is happening. The ones who do are moving fast to claim their market before someone else does.")}
      ${p("Your market is still available. It takes 60 seconds to see where you stand. No pitch on the other side — just your score and a clear picture of who's winning the AI conversation in your city right now.")}
      ${btn("Run My Free AI Visibility Score", "https://geo.heypearl.io/audit")}
      ${p("Once a market is claimed, it's closed. Your window is still open today.")}
      ${sig()}
    `, "audit_invite"),
  };
}

export function auditInvite3({ firstName }: EmailData) {
  const display = dn(firstName);
  const name = display ?? "Hey";
  return {
    subject: display ? `${display}, closing your market file` : "Closing your market file",
    html: emailWrapper(`
      ${h1(`Last Call For Your Market`)}
      ${p(`${name}, I'm going to stop reaching out after this because I don't want to waste your time if the timing isn't right.`)}
      ${p("But I'd be doing you a disservice if I didn't say this plainly: the agents who claim their market in the next few months are going to have a serious advantage over everyone who waits.")}
      ${p("AI search is not slowing down. Buyers are using it to find agents right now. When they ask, there's always a name that comes up. Right now, it's probably not yours. GEO changes that — but only for one agent per city.")}
      ${p("If there's any part of you that wants to know where you stand, your free score takes 30 seconds. No commitment, no pitch, just clarity.")}
      ${btn("Check If My Market Is Still Open", "https://geo.heypearl.io/audit")}
      ${p("If not now, I get it. I'll still be here when the timing is right.")}
      ${sig()}
    `, "audit_invite"),
  };
}

// ─── AUDIT FAILED ─────────────────────────────────────────────────────────────

export function auditFailed1({ firstName }: EmailData) {
  const display = dn(firstName);
  const name = display ?? "Hey";
  return {
    subject: display ? `Your audit hit a snag, ${display}` : "Your audit hit a snag",
    html: emailWrapper(`
      ${h1(`We Hit a Snag on Your Score`)}
      ${p(`${name}, we tried to run your AI Visibility Score but something on our end didn't connect properly with your website.`)}
      ${p("This happens sometimes with certain site configurations, but your score is absolutely still available. The most common fix is trying again with a slightly different URL.")}
      ${p("For example, if you entered <strong>yourname.com</strong>, try <strong>www.yourname.com</strong> or your full profile page if you're on a brokerage site.")}
      ${btn("Try My Score Again", "https://geo.heypearl.io/audit")}
      ${p("If it happens again, just reply to this email and I'll run it manually for you. Your market exclusivity is still available.")}
      ${sig()}
    `, "audit_failed"),
  };
}

export function auditFailed2({ firstName }: EmailData) {
  const display = dn(firstName);
  const name = display ?? "Hey";
  return {
    subject: display ? `Still want to get your score, ${display}?` : "Still want to get your score?",
    html: emailWrapper(`
      ${h1(`Let's Get Your Score Another Way`)}
      ${p(`${name}, I know your AI Visibility Score didn't load properly the first time. I don't want that to stop you from seeing where you stand.`)}
      ${p("A few things that help: use your primary real estate website, not a brokerage subdomain. If you have a personal domain like yourname.com, that usually works best.")}
      ${p("You can also book a free strategy call and I'll run the audit live with you during the session. You'll get your score, we'll go through it together, and you'll walk away with a clear picture of your AI visibility in your market.")}
      ${btn("Try Again or Book a Call", "https://geo.heypearl.io/audit")}
      ${sig()}
    `, "audit_failed"),
  };
}

export function auditFailed3({ firstName }: EmailData) {
  const display = dn(firstName);
  const name = display ?? "Hey";
  return {
    subject: display ? `I'll run your audit live, ${display}` : "I'll run your audit live",
    html: emailWrapper(`
      ${h1(`Let Me Pull Your Score Directly`)}
      ${p(`${name}, I want to make sure you actually see your AI Visibility Score, even if the automated version didn't work.`)}
      ${p("Book a free 20-minute strategy call and I'll pull your score live during our session. You'll see exactly which agents are being recommended in your city right now, and whether your name is in the conversation.")}
      ${p("No pressure, no pitch until you've seen your results. I just want to make sure you have the information.")}
      ${btn("Book a Free Strategy Call", "https://geo.heypearl.io/schedule")}
      ${p("Your market exclusivity is still available. Once another agent in your city books, that window closes.")}
      ${sig()}
    `, "audit_failed"),
  };
}

// ─── POST-CALL (didn't sign) ─────────────────────────────────────────────────

export function postCall1({ firstName, email, stripeLink }: EmailData) {
  const display = dn(firstName);
  const name = display ?? "Hey";
  const e = email ?? "{{email}}";
  return {
    subject: display ? `Great talking today, ${display}` : "Great talking today",
    html: emailWrapper(`
      ${h1(`Really Enjoyed Our Conversation`)}
      ${p(`${name}, really enjoyed our conversation today. It was clear you understand what's shifting in real estate and you're thinking ahead of most agents in your market.`)}
      ${p("Take some time to sit with it. If questions come up, just hit reply and I'll get back to you personally.")}
      ${p("Your market is still available whenever you're ready.")}
      ${stripeLink
        ? btn("I'm Ready to Move Forward", stripeLink)
        : responseBtns(e, "post_call", 1, [{ label: "I'm ready to move forward", answer: "still_interested" }, { label: "I have a question", answer: "need_more_time" }])}
      ${sig()}
    `, "post_call"),
  };
}

export function postCall2({ firstName, email }: EmailData) {
  const display = dn(firstName);
  const name = display ?? "Hey";
  const e = email ?? "{{email}}";
  return {
    subject: display ? `Is your market still available, ${display}?` : "Is your market still available?",
    html: emailWrapper(`
      ${h1(`Your Market Won't Stay Open Forever`)}
      ${p(`${name}, I want to give you a real picture of what is happening.`)}
      ${p("Every week, agents across the country are claiming their markets. I work with one agent per city. That is not a sales tactic. It is how the system works. Once someone in your market moves forward, that city is locked for the life of their GEO program.")}
      ${p("I have kept your market open since our call. But I want to know if this is still on your radar before someone else asks me about your city.")}
      ${p("One question:")}
      ${responseBtns(e, "post_call", 2, [{ label: "Yes, I still want my spot", answer: "yes_want_spot" }, { label: "Not right now", answer: "not_right_now" }])}
      ${sig()}
    `, "post_call"),
  };
}

export function postCall3({ firstName }: EmailData) {
  const display = dn(firstName);
  const name = display ?? "Hey";
  return {
    subject: display ? `What 90 days looks like, ${display}` : "What 90 days looks like",
    html: emailWrapper(`
      ${h1(`What Actually Happens After 90 Days`)}
      ${p(`${name}, I want to show you something concrete.`)}
      ${p("An agent in a mid-size Texas market came to me with an AI Visibility Score in the low 20s. Her name was not showing up anywhere in AI search. A competitor two miles from her office was getting recommended on ChatGPT every time someone searched for agents in her city.")}
      ${p("90 days after starting GEO, here is what changed:")}
      <ul style="margin:0 0 20px;padding-left:24px;color:#4A5E7A;line-height:2;">
        <li>Her AI Visibility Score went from 22 to 71</li>
        <li>She started appearing in AI recommendations for 4 search variations in her market</li>
        <li>Two buyers mentioned her name before she even introduced herself on their first call</li>
        <li>One of those buyers closed. The commission covered her GEO investment for the entire year.</li>
      </ul>
      ${p("That is not a best-case scenario. That is what consistent AI visibility does for agents in markets where the competition has not caught on yet.")}
      ${p("Your market is one of those markets right now.")}
      ${btn("Let's Talk About Your Market", "https://geo.heypearl.io/schedule")}
      ${sig()}
    `, "post_call"),
  };
}

export function postCall4({ firstName, email }: EmailData) {
  const display = dn(firstName);
  const name = display ?? "Hey";
  const e = email ?? "{{email}}";
  return {
    subject: display ? `Can I ask you something, ${display}?` : "Can I ask you something?",
    html: emailWrapper(`
      ${h1(`What Is Actually In the Way?`)}
      ${p(`${name}, I have been in this long enough to know that when someone has a great strategy call and doesn't move forward, there is usually one real reason.`)}
      ${p("I am not asking to pressure you. I am asking because the answer changes how I can actually help you. And if I know what is in the way, I can address it directly instead of sending you generic follow-ups.")}
      ${p("What is the real hesitation right now?")}
      ${responseBtns(e, "post_call", 4, [
        { label: "The investment", answer: "objection_price" },
        { label: "The timing", answer: "objection_timing" },
        { label: "Still figuring out if this is right for me", answer: "objection_unclear" },
        { label: "I want to see more proof", answer: "objection_proof" },
      ])}
      ${p("Click whichever one is closest to the truth. I will follow up with something actually relevant to where you are.")}
      ${sig()}
    `, "post_call"),
  };
}

export function postCall5({ firstName, email }: EmailData) {
  const display = dn(firstName);
  const name = display ?? "Hey";
  const e = email ?? "{{email}}";
  return {
    subject: display ? `The math on waiting, ${display}` : "The math on waiting",
    html: emailWrapper(`
      ${h1(`What Waiting Actually Costs`)}
      ${p(`${name}, I want to walk through something with you. Not to push, but because I think it reframes the decision.`)}
      ${p("The question is not whether GEO is worth the investment. The question is what it costs you to wait.")}
      <div style="background:#F7F8FC;border-left:4px solid ${PINK};padding:20px 24px;margin:0 0 20px;border-radius:0 8px 8px 0;">
        <p style="margin:0 0 12px;font-weight:700;color:${NAVY};">Think about it this way:</p>
        <ul style="margin:0;padding-left:20px;color:#4A5E7A;line-height:2;">
          <li>AI search is growing every month. More buyers are starting their agent search with ChatGPT or Google AI before they ever call anyone.</li>
          <li>Every month you wait is another month your competitor could claim your market.</li>
          <li>Once a market is claimed, it is permanent. You cannot buy your way back in.</li>
          <li>One closed deal from AI visibility pays for months of GEO service.</li>
        </ul>
      </div>
      ${p("You are not deciding whether to spend money. You are deciding whether to let someone else own the channel your buyers are already using.")}
      ${p("Is the investment still the main thing in the way?")}
      ${responseBtns(e, "post_call", 5, [{ label: "Yes, price is the issue", answer: "price_confirmed" }, { label: "It is something else", answer: "price_not_issue" }])}
      ${sig()}
    `, "post_call"),
  };
}

export function postCall6({ firstName, email }: EmailData) {
  const display = dn(firstName);
  const name = display ?? "Hey";
  const e = email ?? "{{email}}";
  return {
    subject: display ? `What if GEO cost you nothing, ${display}?` : "What if GEO cost you nothing?",
    html: emailWrapper(`
      ${h1(`A Way to Get GEO for Free`)}
      ${p(`${name}, I have been thinking about how to make this easier for agents who believe in what GEO does but are not ready to commit to the full investment right now.`)}
      ${p("So I built something. It is called the GEO Partner Program.")}
      ${p("Here is how it works: refer five agents in other markets who sign up for GEO, and your entire program is free. You do not need to sell them anything. You just introduce us. If they move forward after their own strategy call, it counts toward your five.")}
      ${p("You would be getting the same done-for-you AI visibility system, the same market exclusivity, the same results, at zero cost. And the agents you refer get exactly what you got on our call: a clear picture of their market and a strategy to own it.")}
      ${p("Nobody loses. Markets get claimed faster. You get GEO for free.")}
      ${p("Is this something you would want to explore?")}
      ${responseBtns(e, "post_call", 6, [{ label: "Yes, tell me more", answer: "affiliate_interested" }, { label: "I would rather just sign up", answer: "ready_to_sign" }])}
      ${sig()}
    `, "post_call"),
  };
}

export function postCall7({ firstName, email }: EmailData) {
  const display = dn(firstName);
  const name = display ?? "Hey";
  const e = email ?? "{{email}}";
  return {
    subject: display ? `Visibility or leads, ${display}? Quick question.` : "Visibility or leads? Quick question.",
    html: emailWrapper(`
      ${h1(`What Matters Most to You Right Now?`)}
      ${p(`${name}, every agent comes to GEO for a slightly different reason. Some want to be the name buyers already know before the first call. Some want a direct pipeline of inbound leads. Most want both.`)}
      ${p("I am asking because the answer shapes where GEO has the fastest impact in your market, and I want to make sure you have a clear picture of what that looks like for your specific situation.")}
      ${p("What is most important to you right now?")}
      ${responseBtns(e, "post_call", 7, [
        { label: "Being known and trusted", answer: "goal_visibility" },
        { label: "More inbound leads", answer: "goal_leads" },
        { label: "Honestly, both", answer: "goal_both" },
      ])}
      ${sig()}
    `, "post_call"),
  };
}

export function postCall8({ firstName, email }: EmailData) {
  const display = dn(firstName);
  const name = display ?? "Hey";
  const e = email ?? "{{email}}";
  return {
    subject: display ? `Could you do GEO yourself, ${display}?` : "Could you do GEO yourself?",
    html: emailWrapper(`
      ${h1(`Honest Answer: Could You Do This Yourself?`)}
      ${p(`${name}, I get this question a lot and I want to give you an honest answer instead of a sales answer.`)}
      ${p("Technically, yes. AI optimization is not magic. The concepts are learnable. You could study how AI search works, understand the signals that drive recommendations, create optimized content consistently, build citation networks, monitor your visibility, and adjust over time.")}
      ${p("But here is what I know from working with agents:")}
      <ul style="margin:0 0 20px;padding-left:24px;color:#4A5E7A;line-height:2;">
        <li>The learning curve is real. This is a new field and the rules change fast.</li>
        <li>Consistency is everything. Missing a month sets you back significantly.</li>
        <li>The time cost is high. This is not a set-it-and-forget-it task.</li>
        <li>Most agents who try it themselves stop within 60 days. The market window does not care.</li>
      </ul>
      ${p("GEO is not just the strategy. It is the execution, every month, without you having to think about it.")}
      ${p("Is doing it yourself still something you are considering?")}
      ${responseBtns(e, "post_call", 8, [{ label: "Yes, I might try it myself", answer: "diy_considering" }, { label: "No, I want it done for me", answer: "diy_not_interested" }])}
      ${sig()}
    `, "post_call"),
  };
}

export function postCall9({ firstName, email }: EmailData) {
  const display = dn(firstName);
  const name = display ?? "Hey";
  const e = email ?? "{{email}}";
  return {
    subject: display ? `When IS the right time, ${display}?` : "When IS the right time?",
    html: emailWrapper(`
      ${h1(`When Would the Timing Be Right?`)}
      ${p(`${name}, I hear "the timing isn't right" from agents often. And I never dismiss it. Life is busy. Business cycles are real. Not every month is the right month to start something new.`)}
      ${p("But I want to ask you a genuine question, not a rhetorical one.")}
      ${p("What would need to be true for the timing to feel right? Slower market? Faster market? A slower month personally? A goal hit first?")}
      ${p("I ask because in most cases, the timing question is actually a confidence question. Agents want to know it will work before they commit. That is completely fair. But waiting for certainty in a new channel is exactly how competitors sneak in before you.")}
      ${p("Where are you on timing right now?")}
      ${responseBtns(e, "post_call", 9, [
        { label: "Ready now", answer: "timing_now" },
        { label: "90 days from now", answer: "timing_90days" },
        { label: "Not sure yet", answer: "timing_unsure" },
      ])}
      ${sig()}
    `, "post_call"),
  };
}

export function postCall10({ firstName, email }: EmailData) {
  const display = dn(firstName);
  const name = display ?? "Hey";
  const e = email ?? "{{email}}";
  return {
    subject: display ? `GEO vs a social media agency, ${display}` : "GEO vs a social media agency",
    html: emailWrapper(`
      ${h1(`This Is Not a Social Media Service`)}
      ${p(`${name}, I want to address something I hear often from agents who have worked with social media marketing companies before.`)}
      ${p("Social media builds awareness. It is visibility to people who already follow you or scroll past your content. It is a broadcast channel. You make content, put it out, and hope the right people see it.")}
      ${p("GEO is a recommendation channel. It is not about getting seen. It is about being suggested. When a buyer asks an AI tool who to call for real estate in your city, you want to be the name that comes back. That happens because of how AI systems are trained, what they trust, and what they repeat.")}
      <div style="background:#F7F8FC;border-left:4px solid ${PINK};padding:20px 24px;margin:0 0 20px;border-radius:0 8px 8px 0;">
        <p style="margin:0 0 8px;font-weight:700;color:${NAVY};">The difference:</p>
        <ul style="margin:0;padding-left:20px;color:#4A5E7A;line-height:2;">
          <li>Social media: buyers see you if they are already looking</li>
          <li>GEO: AI sends buyers to you before they even know your name</li>
        </ul>
      </div>
      ${p("Is the comparison to social media or other marketing services part of what has you hesitating?")}
      ${responseBtns(e, "post_call", 10, [{ label: "Yes, I was comparing it to other things", answer: "comparing_services" }, { label: "No, I understand the difference", answer: "understands_difference" }])}
      ${sig()}
    `, "post_call"),
  };
}

export function postCall11({ firstName, email }: EmailData) {
  const display = dn(firstName);
  const name = display ?? "Hey";
  const e = email ?? "{{email}}";
  return {
    subject: display ? `Two ways to get started, ${display}` : "Two ways to get started",
    html: emailWrapper(`
      ${h1(`Two Paths Forward`)}
      ${p(`${name}, I want to make this as simple as possible.`)}
      ${p("We have been in touch for a while now. You know what GEO does. You have seen what it looks like in real markets. The only question left is how you want to move forward.")}
      ${p("There are two options:")}
      <table cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 24px;">
        <tr>
          <td style="padding:16px;background:#F7F8FC;border-radius:8px;vertical-align:top;width:48%;">
            <p style="margin:0 0 8px;font-weight:700;color:${NAVY};">Option 1: Sign up directly</p>
            <p style="margin:0;font-size:14px;color:#4A5E7A;">Claim your market today. Your program starts immediately and no other agent in your city can get in while you are active.</p>
          </td>
          <td style="width:4%;"></td>
          <td style="padding:16px;background:#F7F8FC;border-radius:8px;vertical-align:top;width:48%;">
            <p style="margin:0 0 8px;font-weight:700;color:${NAVY};">Option 2: Refer friends first</p>
            <p style="margin:0;font-size:14px;color:#4A5E7A;">Refer five agents in other markets who sign up, and your GEO program is completely free. Takes longer but costs you nothing.</p>
          </td>
        </tr>
      </table>
      ${p("Which path makes more sense for where you are right now?")}
      ${responseBtns(e, "post_call", 11, [{ label: "I want to sign up", answer: "ready_signup" }, { label: "Tell me about referring friends", answer: "affiliate_path" }])}
      ${sig()}
    `, "post_call"),
  };
}

export function postCall12({ firstName, email }: EmailData) {
  const display = dn(firstName);
  const name = display ?? "Hey";
  const e = email ?? "{{email}}";
  return {
    subject: display ? `Last one, ${display}` : "Last one",
    html: emailWrapper(`
      ${h1(`This Is the Last Time I Will Reach Out`)}
      ${p(`${name}, this is my last email to you about GEO.`)}
      ${p("Not because I have given up on you. Because I respect your time and your inbox, and I do not want to be the person who keeps showing up when you have already made a decision.")}
      ${p("Here is where things stand: your market is still available. I have held it through every email I have sent you. If you move forward today, it is yours and no other agent in your city can have it while you are active.")}
      ${p("If the timing is genuinely not right, I understand. Markets do occasionally reopen. You can always reach back out.")}
      ${p("But if any part of you is still thinking about this, right now is the moment. Not because I am pushing. Because every week that passes is a week another agent could ask me about your city.")}
      ${p("What would you like to do?")}
      ${responseBtns(e, "post_call", 12, [{ label: "I am ready. Let's do this.", answer: "final_yes" }, { label: "Not for me right now", answer: "final_no" }])}
      ${sig()}
    `, "post_call"),
  };
}

// ─── WARM NURTURE (merged: lead_nurture + claim_nurture + warm_nurture) ────────
// Step 1 (0h): market welcome — for claim/direct leads. Audit leads get the
// AI-generated score email via /api/generate-audit-email instead.

export function warmNurture1({ firstName, city }: EmailData) {
  const display = dn(firstName);
  const name = display ?? "Hey";
  const location = city ? `${city}` : "your market";
  const locationPhrase = city ? ` in ${city}` : "";
  return {
    subject: display ? `${display}, your market is still open` : "Your market is still open",
    html: emailWrapper(`
      ${h1(`Your Market Is Open. Here Is What That Means.`)}
      ${p(`${name}, I just checked ${location}.`)}
      ${p(`No other agent has claimed it. That is genuinely good news, and I do not want you to sit on it.`)}
      ${p(`Every week, agents across the country are locking in their markets. The ones who moved fast own their city in AI search right now. The ones who waited are watching someone else get recommended every time a buyer types "best real estate agent${locationPhrase}" into ChatGPT.`)}
      ${p(`That gap is only going to grow.`)}
      ${p(`GEO is a done-for-you system. We write the content, publish it, build your authority signals, and make sure AI tools recommend <em>you</em> when buyers in your market search. Your one job is a 30-second approval once a week.`)}
      ${p(`But here is the thing: we only work with one agent per city. If someone else in ${location} books a strategy call before you do, your window closes permanently.`)}
      ${btn("Claim My City", "https://geo.heypearl.io/schedule")}
      ${p(`The call is 30 minutes. It is free. And your market is still open right now.`)}
      ${sig()}
    `, "warm_nurture"),
  };
}

export function warmNurture2({ firstName, city }: EmailData) {
  const display = dn(firstName);
  const name = display ?? "Hey";
  const location = city ?? "your area";
  return {
    subject: display ? `${display}, this is the part most agents miss` : "This is the part most agents miss",
    html: emailWrapper(`
      ${h1(display ? `${display}, This Is the Part Most Agents Miss` : "This Is the Part Most Agents Miss")}
      ${p("You ran your AI Visibility Score. Most agents look at it, nod, and move on.")}
      ${p("But here's what the report doesn't say out loud:")}
      ${p(`We've already seen agents in ${location} start optimizing for AI visibility. The question is whether you'll be the one AI recommends, or someone else.`)}
      ${p(`We checked — your market is still open. But we can only work with one agent per city. Once someone else claims it, it's gone.`)}
      ${btn("See If My Market Is Available", "https://geo.heypearl.io/schedule")}
      ${p("No pitch. No pressure. Just a 30-minute call to walk through your report together.")}
      ${sig()}
    `, "warm_nurture"),
  };
}

export function warmNurture3({ firstName, city }: EmailData) {
  const display = dn(firstName);
  const name = display ?? "Hey";
  return {
    subject: city ? `Quick question about ${city}` : "Quick question about your market",
    html: emailWrapper(`
      ${h1(`One Agent Per Market. That's the Rule.`)}
      ${p(`${name}, I want to be straight with you.`)}
      ${p("GEO is not a course. It's not a membership. It's not something 50 agents in your city can all use at the same time. It's a done-for-you AI visibility system that makes <em>you</em> the agent AI recommends in your market, and that only works if we're running it for one agent per city.")}
      ${p("Right now, your market is available. That could change today.")}
      ${p("Every week, agents across the country are claiming their markets. Once one agent in your city books a strategy call and moves forward, your spot disappears. Not temporarily. Permanently.")}
      ${p("The agents winning with GEO right now are the ones who acted before someone else in their market did. That's the only difference between them and the agents who missed it.")}
      ${btn("Check My Market", "https://geo.heypearl.io/schedule")}
      ${sig()}
    `, "warm_nurture"),
  };
}

export function warmNurture4({ firstName, city }: EmailData) {
  const display = dn(firstName);
  const name = display ?? "Hey";
  const location = city ?? "your market";
  return {
    subject: display ? `${display}, this happened last week` : "This happened last week",
    html: emailWrapper(`
      ${h1(`Real Results From Agents Just Like You`)}
      ${p(`${name}, I want to share what I heard from agents I work with this week.`)}
      ${p(`One agent in Denver told me a seller called her because "she showed up everywhere I searched." The seller didn't interview anyone else. Signed the listing agreement on the first call.`)}
      ${p("Another in Scottsdale got three organic leads in one month. No ads. No cold calls. They found her through search, read her content, and reached out ready to work with her.")}
      ${p("These are not outliers. They are what happens when your name is the answer AI gives when buyers ask who to call.")}
      ${p(`${location} does not have a GEO agent yet. That means the window is open for you. It also means it can close any day.`)}
      ${btn("I Want to Claim My Market", "https://geo.heypearl.io/schedule")}
      ${sig()}
    `, "warm_nurture"),
  };
}

export function warmNurture5({ firstName, city }: EmailData) {
  const display = dn(firstName);
  const name = display ?? "Hey";
  const location = city ?? "your area";
  return {
    subject: display ? `${display}, one agent per market — this is why it matters` : "One agent per market. This is why it matters.",
    html: emailWrapper(`
      ${h1(`Why We Only Work With One Agent Per City`)}
      ${p(`${name}, I want to be transparent about how GEO works, because it changes the urgency of this decision.`)}
      ${p("We build your AI presence as the dominant local authority for your market. If we ran it for two agents in the same city, we'd be working against ourselves. So we don't.")}
      ${p("One agent. One city. For life.")}
      ${p(`When you claim ${location}, no other agent can join GEO in your market for as long as you are a client. You own the category in your city.`)}
      ${p("The flip side: if another agent in your city books a strategy call before you do, you lose access. We do not hold markets open, and we do not make exceptions.")}
      ${p("Your market is still available right now. Here is what I suggest:")}
      ${btn("Book the Call Before Someone Else Does", "https://geo.heypearl.io/schedule")}
      ${p("It's 30 minutes. You'll walk away with 3 custom AI authority assets regardless of what you decide. Nothing to lose, and a market to claim.")}
      ${sig()}
    `, "warm_nurture"),
  };
}

export function warmNurture6({ firstName, city }: EmailData) {
  const display = dn(firstName);
  const name = display ?? "Hey";
  return {
    subject: city ? `Last thing on ${city}` : "One last thing",
    html: emailWrapper(`
      ${h1(`I Have One Question For You`)}
      ${p(`${name}, I'll keep this short.`)}
      ${p("What would it mean for your business if buyers in your city started seeing your name every time they asked ChatGPT, Perplexity, or Google AI who to call for real estate?")}
      ${p("That's not a hypothetical. That's what GEO does. And it's working right now for agents in markets just like yours.")}
      ${p("Your market is still available. The call is free. It's 30 minutes.")}
      ${btn("One Agent Per Market — Check Yours", "https://geo.heypearl.io/schedule")}
      ${sig()}
    `, "warm_nurture"),
  };
}

export function warmNurture7({ firstName }: EmailData) {
  const display = dn(firstName);
  const name = display ?? "Hey";
  return {
    subject: display ? `Something worth knowing, ${display}` : "Something worth knowing",
    html: emailWrapper(`
      ${h1(`AI Search Is Already Happening in Your Market`)}
      ${p(`${name}, I want to share something that came up recently.`)}
      ${p("Buyers are actively using ChatGPT, Perplexity, and Google AI to find real estate agents before they ever call anyone. They're typing things like \"best real estate agent in [city]\" and getting specific names back.")}
      ${p("Those names belong to agents who have an AI presence built out. Not the most experienced. Not the biggest names. Just the ones who got there first.")}
      ${p("Your market still doesn't have a GEO agent. That's a real window, and it won't stay open forever.")}
      ${btn("Let's Talk About Your Market", "https://geo.heypearl.io/schedule")}
      ${sig()}
    `, "warm_nurture"),
  };
}

export function warmNurture8({ firstName }: EmailData) {
  const display = dn(firstName);
  const name = display ?? "Hey";
  return {
    subject: display ? `Quick update on your market, ${display}` : "Quick update on your market",
    html: emailWrapper(`
      ${h1(`Your Market Is Still Open`)}
      ${p(`${name}, just a quick note.`)}
      ${p("I check on market availability for the agents I've talked with, and yours is still open. No other agent in your city has claimed GEO yet.")}
      ${p("I want to be straight with you: I don't know how long that stays true. We have strategy calls going every week and markets are closing. When one goes, it's permanent.")}
      ${p("If you've been thinking about it and just haven't pulled the trigger, now is genuinely the right moment.")}
      ${btn("Claim My Market", "https://geo.heypearl.io/schedule")}
      ${p("Happy to answer any questions you have before you decide.")}
      ${sig()}
    `, "warm_nurture"),
  };
}

export function warmNurture9({ firstName }: EmailData) {
  const display = dn(firstName);
  const name = display ?? "Hey";
  return {
    subject: display ? `What agents who moved forward told me, ${display}` : "What agents who moved forward told me",
    html: emailWrapper(`
      ${h1(`What Changed for the Agents Who Said Yes`)}
      ${p(`${name}, I talk to a lot of real estate agents.`)}
      ${p("The ones who moved forward with GEO almost always say the same thing afterward: they wish they had done it sooner. Not because the results happened overnight, but because they stopped worrying about where their next lead was coming from.")}
      ${p("AI visibility compounds. The earlier you build it, the more you benefit from it over time. The agents who started 6 months ago are already owning their markets. The ones starting now are still ahead of 90 percent of the industry.")}
      ${p("The ones who waited too long? Their market was claimed by someone else.")}
      ${btn("I'm Ready to Move Forward", "https://geo.heypearl.io/schedule")}
      ${sig()}
    `, "warm_nurture"),
  };
}

export function warmNurture10({ firstName }: EmailData) {
  const display = dn(firstName);
  const name = display ?? "Hey";
  return {
    subject: display ? `Keeping the door open, ${display}` : "Keeping the door open",
    html: emailWrapper(`
      ${h1(`I'm Not Going Anywhere`)}
      ${p(`${name}, this is my last regular check-in for a while.`)}
      ${p("I'll still be in touch occasionally when I have something worth sharing, but I don't want to keep showing up in your inbox if the timing isn't right.")}
      ${p("What I do want you to know: if you ever decide you're ready to claim your market, reach out and I will make it happen. Your market being available is not guaranteed forever, but my commitment to the agents I talk with is.")}
      ${p("Rooting for you either way.")}
      ${btn("I'm Ready When You Are", "https://geo.heypearl.io/schedule")}
      ${sig()}
    `, "warm_nurture"),
  };
}

// ─── CLAIM NURTURE (landing page opt-in > book strategy call) ────────────────

export function claimNurture1({ firstName, city }: EmailData) {
  const display = dn(firstName);
  const name = display ?? "Hey";
  const location = city ? `${city}` : "your market";
  const locationPhrase = city ? ` in ${city}` : "";
  return {
    subject: display ? `${display}, your market is still open` : "Your market is still open",
    html: emailWrapper(`
      ${h1(`Your Market Is Open. Here Is What That Means.`)}
      ${p(`${name}, I just checked ${location}.`)}
      ${p(`No other agent has claimed it. That is genuinely good news, and I do not want you to sit on it.`)}
      ${p(`Every week, agents across the country are locking in their markets. The ones who moved fast own their city in AI search right now. The ones who waited are watching someone else get recommended every time a buyer types "best real estate agent${locationPhrase}" into ChatGPT.`)}
      ${p(`That gap is only going to grow.`)}
      ${p(`GEO is a done-for-you system. We write the content, publish it, build your authority signals, and make sure AI tools recommend <em>you</em> when buyers in your market search. Your one job is a 30-second approval once a week.`)}
      ${p(`But here is the thing: we only work with one agent per city. If someone else in ${location} books a strategy call before you do, your window closes permanently.`)}
      ${btn("Claim My City", "https://geo.heypearl.io/schedule")}
      ${p(`The call is 30 minutes. It is free. And your market is still open right now.`)}
      ${sig()}
    `, "claim_nurture"),
  };
}

export function claimNurture2({ firstName, city }: EmailData) {
  const display = dn(firstName);
  const name = display ?? "Hey";
  const location = city ?? "your city";
  const auditUrl = `https://geo.heypearl.io/audit${firstName ? `?firstName=${encodeURIComponent(firstName)}` : ""}`;
  return {
    subject: display ? `${display}, what AI says about agents in your city right now` : "What AI says about agents in your city right now",
    html: emailWrapper(`
      ${h1(`Here Is What Is Happening in Your Market`)}
      ${p(`${name}, I want to show you something real.`)}
      ${p(`When a buyer types "best real estate agent in ${location}" into ChatGPT or Perplexity right now, they get a list of names back. Most agents have no idea whose names those are, or whether theirs is on the list.`)}
      ${p("The agents who show up are not necessarily the most experienced or the most successful. They are the ones who built an AI presence first. GEO exists to put your name on that list before your competitors get there.")}
      ${p("Want to see exactly where you stand right now? Run your free AI Visibility Score. It takes 30 seconds and shows you which agents AI is recommending in your market today.")}
      ${btn("Get My Free AI Visibility Score", auditUrl)}
      <div style="background:#F7F8FC;border-left:4px solid ${PINK};padding:20px 24px;margin:0 0 20px;border-radius:0 8px 8px 0;">
        <p style="margin:0 0 8px;font-weight:700;color:${NAVY};">Once you have your score, GEO fixes it:</p>
        <ul style="margin:0;padding-left:20px;color:#4A5E7A;line-height:2.2;">
          <li>2 hyper-local blog posts per week, written and published for you</li>
          <li>28 social posts per month, handled entirely by us</li>
          <li>Google Business Profile optimization for maps and local AI</li>
          <li>Local citation building across every directory buyers use</li>
        </ul>
      </div>
      ${p("Your one job: a 30-second approval once a week.")}
      ${sig()}
    `, "claim_nurture"),
  };
}

export function claimNurture3({ firstName, city }: EmailData) {
  const display = dn(firstName);
  const name = display ?? "Hey";
  const location = city ?? "your market";
  return {
    subject: display ? `${display}, this happened last week` : "This happened last week",
    html: emailWrapper(`
      ${h1(`Real Results From Agents Just Like You`)}
      ${p(`${name}, I want to share what I heard from agents I work with this week.`)}
      ${p(`One agent in Denver told me a seller called her because "she showed up everywhere I searched." The seller didn't interview anyone else. Signed the listing agreement on the first call.`)}
      ${p("Another in Scottsdale got three organic leads in one month. No ads. No cold calls. They found her through search, read her content, and reached out ready to work with her.")}
      ${p("These are not outliers. They are what happens when your name is the answer AI gives when buyers ask who to call.")}
      ${p(`${location} does not have a GEO agent yet. That means the window is open for you. It also means it can close any day.`)}
      ${btn("I Want to Claim My Market", "https://geo.heypearl.io/schedule")}
      ${sig()}
    `, "claim_nurture"),
  };
}

export function claimNurture4({ firstName, city }: EmailData) {
  const display = dn(firstName);
  const name = display ?? "Hey";
  const location = city ?? "your area";
  return {
    subject: display ? `${display}, one agent per market — this is why it matters` : "One agent per market. This is why it matters.",
    html: emailWrapper(`
      ${h1(`Why We Only Work With One Agent Per City`)}
      ${p(`${name}, I want to be transparent about how GEO works, because it changes the urgency of this decision.`)}
      ${p("We build your AI presence as the dominant local authority for your market. If we ran it for two agents in the same city, we'd be working against ourselves. So we don't.")}
      ${p("One agent. One city. For life.")}
      ${p(`When you claim ${location}, no other agent can join GEO in your market for as long as you are a client. You own the category in your city.`)}
      ${p("The flip side: if another agent in your city books a strategy call before you do, you lose access. We do not hold markets open, and we do not make exceptions.")}
      ${p("Your market is still available right now. Here is what I suggest:")}
      ${btn("Book the Call Before Someone Else Does", "https://geo.heypearl.io/schedule")}
      ${p("It's 30 minutes. You'll walk away with 3 custom AI authority assets regardless of what you decide. Nothing to lose, and a market to claim.")}
      ${sig()}
    `, "claim_nurture"),
  };
}

export function claimNurture5({ firstName, city }: EmailData) {
  const display = dn(firstName);
  const name = display ?? "Hey";
  const location = city ?? "your market";
  return {
    subject: display ? `Last note, ${display}` : "Last note",
    html: emailWrapper(`
      ${h1(`I Won't Keep Following Up After This`)}
      ${p(`${name}, this is my last email about your market.`)}
      ${p("Not because I don't think GEO would make a difference for you. I do. But I respect your inbox and your time, and I'd rather send one honest final note than keep nudging you.")}
      ${p(`${location} is still available as of today. I don't know how much longer that stays true.`)}
      ${p("If you're ready, the call takes 30 minutes and you'll leave with 3 free AI authority assets built live for your specific market. Book it here:")}
      ${btn("Book My Strategy Call", "https://geo.heypearl.io/schedule")}
      ${p("If the timing just isn't right, no hard feelings. Reply and let me know and I'll stop the follow-up. Either way, I appreciate you checking out GEO.")}
      ${sig()}
    `, "claim_nurture"),
  };
}

// ─── PRE-INTERVIEW (PODCAST) ──────────────────────────────────────────────────

export function preInterview1({ firstName }: EmailData) {
  const display = dn(firstName);
  const name = display ?? "Hey";
  return {
    subject: "Your pre-interview is confirmed",
    html: emailWrapper(`
      ${h1(`You're Confirmed, ${display ? display + "!" : "Let's Do This!"}`)}
      ${p(`${name}, your pre-interview for the Blue Ocean Strategies podcast is on the books. I'm excited to connect with you.`)}
      ${p("Here's a little about the show:")}
      ${p("<strong>Blue Ocean Strategies</strong> is a podcast built for real estate agents who are winning by doing things differently. We go deep with agents who have stopped competing on the same terms as everyone else and built their own lane. Our audience is made up of ambitious agents looking for real strategies they can actually use.")}
      ${p("Every episode features one agent, one strategy, and one result. No fluff. No theory. Just what's working in the field right now.")}
      ${p("I'm looking forward to hearing your story. Keep an eye out for my next email with a few quick questions to help us make the most of our time together.")}
      ${sig()}
    `, "pre_interview"),
  };
}

export function preInterview2({ firstName }: EmailData) {
  const display = dn(firstName);
  const name = display ?? "Hey";
  return {
    subject: "A few quick questions before we talk",
    html: emailWrapper(`
      ${h1(`Before We Meet`)}
      ${p(`${name}, before our pre-interview I'd love to get a few details from you. Just hit reply and send me your answers whenever you get a chance.`)}
      ${p("<strong>1. What topic would you like to cover on the show?</strong><br>What is the blue ocean strategy or approach that's working for you right now?")}
      ${p("<strong>2. Do you have a freebie or resource for our audience?</strong><br>A guide, checklist, training, or tool you'd like to share? We'll promote it during the episode.")}
      ${p("<strong>3. Your social handles</strong><br>Where should our audience connect with you? (Instagram, Facebook, LinkedIn, TikTok, website, etc.)")}
      ${p("<strong>4. A quick bio</strong><br>Just 2 to 3 sentences. Who you are, what you do, where you're based.")}
      ${p("That's it! Once I have those, we're ready to go. Can't wait to hear what you've been building.")}
      ${sig()}
    `, "pre_interview"),
  };
}

// ─── PROOF SERIES ─────────────────────────────────────────────────────────────

function proof1({ firstName, city }: EmailData) {
  const display = dn(firstName); const name = display ?? "Hey"; const loc = city ?? "your market";
  return {
    subject: display ? `${display}, here's what happened for one agent in ${loc}` : `What happened for one agent in ${loc}`,
    html: emailWrapper(`
      ${h1("A Real Agent. A Real Market. Real Results.")}
      ${p(`${name}, I want to share something with you.`)}
      ${p("One of our agents was in Rapid City, South Dakota. She had been doing everything right: great reviews, active on social media, keeping up with her database. But when buyers in her market typed her city into ChatGPT or Google AI, she wasn't there. Someone else was.")}
      ${p("We started building her GEO presence in November. Here's what her market looked like two months later:")}
      ${proofImg("proof-7.jpg", "Before and after GEO grid map: November shows red and orange across Rapid City, January shows all green 1s with AGR dropping from 9.39 to 2.31 and SoLV reaching 89%")}
      ${p("Every red square turned green. Her AI Visibility score went from invisible to dominant. Her Share of Local Voice hit 89% in her market.")}
      ${p("She didn't run a single ad. She just let us build the system.")}
      ${p("I'll be sending you a few more stories like this over the next few weeks. Real agents, real markets, real results.")}
      ${sig()}
    `, "proof"),
  };
}

function proof2({ firstName }: EmailData) {
  const display = dn(firstName); const name = display ?? "Hey";
  return {
    subject: display ? `${display}, a screenshot worth looking at` : "A screenshot worth looking at",
    html: emailWrapper(`
      ${h1("This Is What AI Visibility Looks Like")}
      ${p(`${name}, a picture is worth a thousand words.`)}
      ${p("Here's what the AI Visibility dashboard looks like for one of our active agents:")}
      ${proofImg("proof-6.jpg", "AI Visibility Score dashboard showing 90/100 Great rating, Monthly Audience 4,746, Mentions 215 with +103 growth, trend charts showing steady rise from July to December")}
      ${p("90 out of 100. Nearly 5,000 people reached per month through AI alone. 215 mentions across AI platforms, up 103 from the month before.")}
      ${p("The most common reaction when agents first see their own dashboard? \"Why didn't I know about this sooner?\"")}
      ${p("And this is what happens when that visibility turns into actual leads:")}
      ${proofImg("proof-1.jpg", "Inbound text message from Emily Carter to an agent: relocating buyer looking for new construction townhomes or condos, flexible budget, ready to move")}
      ${p("A buyer reached out on her own. Pre-qualified. Already knew what she wanted. The agent just had to answer.")}
      ${p("More stories coming your way. Talk soon.")}
      ${sig()}
    `, "proof"),
  };
}

function proof3({ firstName, city }: EmailData) {
  const display = dn(firstName); const name = display ?? "Hey"; const loc = city ?? "your market";
  return {
    subject: display ? `${display}, another agent just hit #1 in their market` : "Another agent just hit #1 in their market",
    html: emailWrapper(`
      ${h1("Another One.")}
      ${p(`${name}, this keeps happening.`)}
      ${p("Different agent. Different market. Same result.")}
      ${p("Here's what one of our agents in Buda, Texas is looking at right now:")}
      ${proofImg("proof-9.jpg", "Full GEO Visibility Overview showing 98/100 AI Visibility Score, 55.7K mentions, 125.4K sources, and dominant position across Buda TX market with competitor comparison")}
      ${p("98 out of 100. 55,700 mentions. 125,000 sources. She is the agent AI recommends in that market. Full stop.")}
      ${p("Here's what her coverage actually looks like on the map:")}
      ${proofImg("proof-map.jpg", "Market map showing all green 1s across the entire coverage area")}
      ${p("When buyers in Buda ask ChatGPT or Perplexity or Google AI who to call, her name comes back. Every time.")}
      ${p(`I keep thinking about ${loc}. There's still an opening there, but markets don't stay open forever.`)}
      ${sig()}
    `, "proof"),
  };
}

function proof4({ firstName }: EmailData) {
  const display = dn(firstName); const name = display ?? "Hey";
  return {
    subject: display ? `${display}, what they said after seeing the numbers` : "What they said after seeing the numbers",
    html: emailWrapper(`
      ${h1("Before and After")}
      ${p(`${name}, I want to show you a before and after.`)}
      ${p("Not a dashboard. Not a map. A text message.")}
      ${p("One of our agents texted me on a Tuesday morning a few months into her program:")}
      ${proofImg("proof-8.jpg", "Client text message to Misti: misti, I got my first recommendation from ChatGPT. I'm meeting them tomorrow for a listing appointment. I'm so excited!!!")}
      ${p("She didn't reach out to that buyer. She didn't run an ad. She didn't even know it was happening. ChatGPT just recommended her, and the buyer reached out to book a listing appointment.")}
      ${p("That's the before and after I care about most. Not just the scores and maps, but the actual moment an agent realizes the leads are coming to them now.")}
      ${p("And it's not just listing leads. This is what inbound looks like for buyers too:")}
      ${proofImg("proof-4.jpg", "Instagram DM from Shauna Dawn Flack asking about new build garden homes and 2nd room condos, mentions she's a VA vet with amazing income and credit, ready to get started")}
      ${p("Pre-qualified. Motivated. Came to her.")}
      ${p("The numbers don't lie. Neither do our clients.")}
      ${sig()}
    `, "proof"),
  };
}

function proof5({ firstName }: EmailData) {
  const display = dn(firstName); const name = display ?? "Hey";
  return {
    subject: display ? `${display}, what 90 days looks like` : "What 90 days looks like",
    html: emailWrapper(`
      ${h1("90 Days In")}
      ${p(`${name}, I want to show you a full journey.`)}
      ${p("Most agents want to know what they'll actually get for their investment. Here's a real answer.")}
      ${p("At 90 days, this is what a typical client's content performance dashboard looks like:")}
      ${proofImg("proof-5.jpg", "GEO content dashboard showing Content Difficulty 18 out of 100 labeled Effortless and Content Score 97 out of 100")}
      ${p("Content Score of 97. Difficulty rating of 18, which means we're publishing in a lane that's nearly uncontested. That's not luck, that's strategy.")}
      ${p("But the number that matters most is what's in her inbox. By 90 days, buyers like these are reaching out on their own:")}
      ${proofImg("proof-3.jpg", "Inbound text from Lauren Brooks to an agent: looking for a second home or garden condo for personal use, strong credit, flexible on price")}
      ${p("She didn't chase that lead. That lead found her.")}
      ${p("This isn't a pitch. It's just what happens when you commit to the process and let the system do its job.")}
      ${sig()}
    `, "proof"),
  };
}

function proof6({ firstName }: EmailData) {
  const display = dn(firstName); const name = display ?? "Hey";
  return {
    subject: display ? `${display}, what last month looked like across all GEO agents` : "What last month looked like across all GEO agents",
    html: emailWrapper(`
      ${h1("Last 30 Days: The Numbers")}
      ${p(`${name}, here's a quick look at what's been happening across our active GEO agents.`)}
      ${p("New inbound leads from buyers who found their agent through AI search. Not cold calls. Not paid ads. AI recommendations.")}
      ${proofImg("proof-2.jpg", "Inbound text from Jason Miller to an agent: VA buyer looking for new builds near the base, pre-approval in progress, ready to move")}
      ${p("Jason found this agent the same way every buyer finds a GEO agent: he searched, AI recommended her, and he reached out.")}
      ${p("Pre-approval already in progress. New build. Near the base. She didn't have to find Jason. Jason found her.")}
      ${p("Every single GEO agent in our program was right where you are at some point. They read these same emails. They decided to make a move before their market got claimed.")}
      ${p("Most of them will tell you the only thing they regret is not starting sooner.")}
      ${sig()}
    `, "proof"),
  };
}

function proof7({ firstName, city }: EmailData) {
  const display = dn(firstName); const name = display ?? "Hey"; const loc = city ?? "your market";
  return {
    subject: display ? `${display}, ready to see this for ${loc}?` : "Ready to see this for your market?",
    html: emailWrapper(`
      ${h1("One Spot. One Market. One Agent.")}
      ${p(`${name}, I've shared a lot with you over the past few weeks.`)}
      ${p("Real agents. Real maps. Real texts from real buyers. Real results.")}
      ${p(`Now I want to talk about ${loc}. Because here's what I know: the market is still open. And I can only take one agent.`)}
      ${p("When that spot goes, it goes. Here's what agents say when they get in before that happens:")}
      ${proofImg("proof-10.jpg", "Client text message: so glad you still have my market available. I'm ready to get started. I talk to Sandra and she told me she's never giving her market up ever.")}
      ${p("Sandra already knew. Once you're the AI-recommended agent in your market, you don't let it go.")}
      ${p(`I want ${loc} to be your market. Let's get on a call and I'll show you exactly where you stand right now and what it would look like to own that market.`)}
      ${btn("Book My Free Strategy Call", "https://geo.heypearl.io/schedule")}
      ${p("No pressure, no hard sell. Just a real conversation about what's possible.")}
      ${sig()}
    `, "proof"),
  };
}

// ─── PROOF SERIES — Steps 8–12 (warm close, CTA = book a call) ───────────────

function proof8({ firstName, city }: EmailData) {
  const display = dn(firstName); const name = display ?? "Hey"; const loc = city ?? "your market";
  return {
    subject: display ? `${display}, the agents who moved forward have one thing in common` : "The agents who moved forward have one thing in common",
    html: emailWrapper(`
      ${h1("The One Thing They Had in Common")}
      ${p(`${name}, I've been thinking about what separates the agents who claimed their market from the ones who didn't.`)}
      ${p("It's not that the ones who moved forward were more confident. Most of them had the same questions you do. It's not that they had more money or more time. Most of them were just as stretched.")}
      ${p("The one thing they had in common is that they moved before they felt completely ready. They looked at the market, they looked at what was coming with AI search, and they decided they didn't want to be the agent who waited.")}
      ${p("I hear from clients regularly now telling me they talk about GEO to every agent they know. Not because I asked them to. Because they can't believe the difference it made, and they want their colleagues to know it's real.")}
      ${p(`${loc ?? "Your market"} is still here. If you want to get on a call and just see what this would actually look like for you, I'm ready when you are.`)}
      ${btn("Book My Free Strategy Call", "https://geo.heypearl.io/schedule")}
      ${sig()}
    `, "proof"),
  };
}

function proof9({ firstName, city }: EmailData) {
  const display = dn(firstName); const name = display ?? "Hey"; const loc = city ?? "your market";
  return {
    subject: display ? `${display}, a question I get asked a lot` : "A question I get asked a lot",
    html: emailWrapper(`
      ${h1("The Question I Get Asked Most")}
      ${p(`${name}, the question I get more than any other is: "How long until I actually see results?"`)}
      ${p("Here's the honest answer: it depends on your market, your competition, and how quickly we can get your content indexed. But based on what we've seen across our active agents, most clients are seeing meaningful movement in their AI Visibility Score within the first 30-60 days. Full market dominance usually comes around the 90-day mark.")}
      ${p("The harder question isn't how long it takes. It's what happens if you wait another 6 months before starting. Because the agents who are building their AI presence right now are compounding that advantage every single week.")}
      ${p(`I've been watching ${loc} for a while. The opening is still real. I'd rather you hear that from me before someone else claims it.`)}
      ${btn("Book My Free Strategy Call", "https://geo.heypearl.io/schedule")}
      ${sig()}
    `, "proof"),
  };
}

function proof10({ firstName, city }: EmailData) {
  const display = dn(firstName); const name = display ?? "Hey"; const loc = city ?? "your market";
  return {
    subject: display ? `${display}, what I'd do if I were in your position` : "What I'd do if I were in your position",
    html: emailWrapper(`
      ${h1("What I'd Do If I Were You")}
      ${p(`${name}, I want to say something directly.`)}
      ${p(`If I were a real estate agent in ${loc} right now, I would not wait. Not because of any sales pitch. Because I can see what's happening with AI search, and I know that the agents who build their presence now are the ones who will own their markets for the next decade.`)}
      ${p("The agents who got into Google early won. The agents who built YouTube channels early won. AI search is the same pattern, just faster. The window to establish dominance is measured in months, not years.")}
      ${p("We only take one agent per market. When that spot goes, it goes permanently. I'm not saying that to pressure you. I'm saying it because it's true, and I think you deserve to make this decision with all the information.")}
      ${p("If you want to talk through it, I'll make time for you.")}
      ${btn("Book My Free Strategy Call", "https://geo.heypearl.io/schedule")}
      ${sig()}
    `, "proof"),
  };
}

function proof11({ firstName, city }: EmailData) {
  const display = dn(firstName); const name = display ?? "Hey"; const loc = city ?? "your market";
  return {
    subject: display ? `${display}, what does your pipeline look like right now?` : "What does your pipeline look like right now?",
    html: emailWrapper(`
      ${h1("A Honest Question")}
      ${p(`${name}, I want to ask you something honestly.`)}
      ${p("What does your pipeline look like right now? Are you getting the volume of inbound leads you want, or are you still spending most of your time chasing?")}
      ${p("I ask because every agent I've worked with has told me some version of the same thing: before GEO, they were working hard to stay visible. After GEO, the visibility just works in the background. The leads come to them. They stop chasing.")}
      ${p("That shift, from outbound to inbound, from hunting to being found, is what GEO actually does. The dashboards and scores are just how we measure it.")}
      ${p(`If that shift sounds like something ${loc} needs, let's talk. I'll show you exactly where you stand right now and what it would take to get there.`)}
      ${btn("Book My Free Strategy Call", "https://geo.heypearl.io/schedule")}
      ${sig()}
    `, "proof"),
  };
}

function proof12({ firstName, city }: EmailData) {
  const display = dn(firstName); const name = display ?? "Hey"; const loc = city ?? "your market";
  return {
    subject: display ? `${display}, one last thing before I move on` : "One last thing before I move on",
    html: emailWrapper(`
      ${h1("One Last Note")}
      ${p(`${name}, I've shared a lot with you over the past few months. Real agents, real maps, real results. Real texts from buyers who found their agent through AI.`)}
      ${p("I'm not going to keep showing up in your inbox if this isn't the right time. That's not how I want to operate.")}
      ${p(`But if any part of you is still thinking about ${loc} and what it would look like to be the agent AI recommends there, I want you to know the door is still open. Just reply to this email or grab a time on my calendar and we'll pick up wherever you want to start.`)}
      ${btn("Book a Call Whenever You're Ready", "https://geo.heypearl.io/schedule")}
      ${p("No pressure. No pitch. Just a real conversation.")}
      ${sig()}
    `, "proof"),
  };
}

// ─── HOT PROOF (post-call close — requires stripe_link + package_price in metadata) ──

function hotProof1({ firstName, stripeLink, packagePrice }: EmailData) {
  const display = dn(firstName); const name = display ?? "Hey";
  const link = stripeLink ?? "#";
  const price = packagePrice ? `$${packagePrice}/mo` : "your";
  return {
    subject: display ? `${display}, here's exactly what we build for you` : "Here's exactly what we build for you",
    html: emailWrapper(`
      ${h1("Here's Exactly What We Build for You")}
      ${p(`${name}, I just wanted to make sure you have a clear picture of what's coming once you get started, because I think when you see it laid out, you'll feel even better about the decision you made on our call.`)}
      ${p("Here's what we actually do inside GEO: we take your name, your market, and your expertise and we build an AI-optimized content presence that gets picked up by ChatGPT, Perplexity, and Google AI. When a buyer in your city types \"who's the best real estate agent in [your city]\" into any of those platforms, we make sure you're the agent that comes back. We write everything, we publish everything, and we manage the whole system. Your only job is a quick 30-second content approval once a week.")}
      ${p("This is what your AI Visibility dashboard looks like a few months in:")}
      ${proofImg("proof-6.jpg", "AI Visibility Score dashboard showing 90/100 Great")}
      ${p("And this is what it looks like when things are really rolling:")}
      ${proofImg("proof-9.jpg", "AI Visibility report showing 98/100 score and 55.7K mentions")}
      ${p("Your spot is still held. Whenever you're ready to lock it in, here's your enrollment link:")}
      ${btn("Complete My Enrollment", link)}
      ${sig()}
    `, "hot_proof"),
  };
}

function hotProof2({ firstName, stripeLink }: EmailData) {
  const display = dn(firstName); const name = display ?? "Hey";
  const link = stripeLink ?? "#";
  return {
    subject: display ? `${display}, someone else asked about your market today` : "Someone else asked about your market today",
    html: emailWrapper(`
      ${h1("Someone Else Asked About Your Market Today")}
      ${p(`${name}, I want to be straight with you about something, because I think it matters and I'd rather you hear it from me directly.`)}
      ${p("We only take one agent per market. That's not a sales tactic, it's just the model. If we're building your AI presence as the dominant local authority in your city, we can't do that for two agents in the same market at the same time. So we don't. One agent, one city.")}
      ${p("I got this text from a client recently, and I think it says it better than I could:")}
      ${proofImg("proof-10.jpg", "Client text: so glad you still have my market available, Sandra told me she's never giving her market up ever")}
      ${p("She almost missed her window. She didn't. But it was close.")}
      ${p("I'm holding your spot because you said yes on our call, and I don't want to open it up without giving you a real chance to move forward. If something came up or you have questions, just reply to this and I'll help you work through it.")}
      ${btn("Secure My Spot", link)}
      ${sig()}
    `, "hot_proof"),
  };
}

function hotProof3({ firstName, stripeLink }: EmailData) {
  const display = dn(firstName); const name = display ?? "Hey";
  const link = stripeLink ?? "#";
  return {
    subject: display ? `${display}, she didn't interview anyone else` : "She didn't interview anyone else",
    html: emailWrapper(`
      ${h1("She Didn't Interview Anyone Else")}
      ${p(`${name}, I want to show you what this actually looks like when it's working, because I think seeing it is more powerful than anything I could tell you.`)}
      ${p("A client texted me this on a Tuesday morning a few months into her GEO program:")}
      ${proofImg("proof-8.jpg", "Client text to Misti: I got my first recommendation from ChatGPT, I'm meeting them tomorrow for a listing appt")}
      ${p("She didn't run ads. She didn't cold call anyone. ChatGPT recommended her to a buyer who was already looking, and that buyer reached out and booked an appointment. That's the whole thing.")}
      ${p("And it's not just AI recommendations. These are the kinds of texts our agents start getting once their market is claimed and their content is live:")}
      ${proofImg("proof-1.jpg", "Inbound lead text from Emily Carter asking about new construction townhomes")}
      ${proofImg("proof-2.jpg", "Inbound lead text from Jason Miller, VA buyer asking about condos near base")}
      ${p("Buyers reaching out on their own, pre-qualified, telling you exactly what they need. You're just the agent who showed up when they searched.")}
      ${p("Your enrollment link is still active whenever you're ready:")}
      ${btn("Get Started", link)}
      ${sig()}
    `, "hot_proof"),
  };
}

function hotProof4({ firstName, stripeLink }: EmailData) {
  const display = dn(firstName); const name = display ?? "Hey";
  const link = stripeLink ?? "#";
  return {
    subject: display ? `${display}, still thinking it over? That's okay.` : "Still thinking it over? That's okay.",
    html: emailWrapper(`
      ${h1("Still Thinking It Over? That's Okay.")}
      ${p(`${name}, no pressure here, I just wanted to check in and see where you're at.`)}
      ${p("If you're sitting on it, I get it. Something new always feels like a risk, especially when you're already running a business and your time and money both have to count. What I can tell you is that the agents who have made the biggest leap with GEO aren't necessarily the ones who were the most convinced upfront. They were just the ones who decided to stop waiting for the perfect moment and move when the market was still open.")}
      ${p("Here's the before and after for one of our agents in Rapid City:")}
      ${proofImg("proof-7.jpg", "Before and after GEO grid map showing all red turning to all green")}
      ${p("That's about 60 days of GEO work. Everything that was red is green. She didn't do anything except approve the content we sent her each week.")}
      ${p("You told me on our call that you wanted this. I believed you then and I still do. Your link is right here whenever you're ready:")}
      ${btn("Complete My Enrollment", link)}
      ${sig()}
    `, "hot_proof"),
  };
}

function hotProof5({ firstName, stripeLink }: EmailData) {
  const display = dn(firstName); const name = display ?? "Hey";
  const link = stripeLink ?? "#";
  return {
    subject: display ? `${display}, want me to just walk you through it?` : "Want me to just walk you through it?",
    html: emailWrapper(`
      ${h1("Want Me to Just Walk You Through It?")}
      ${p(`${name}, I know life gets busy and sometimes things fall through the cracks, so I wanted to offer you an easy way to just get it done.`)}
      ${p("If you have 15 minutes, I'd love to hop on a quick call, answer any questions you have, and if you're ready, we can get you set up right then. No pitch needed because you already said yes. This is just a \"let's get you started\" call.")}
      ${btn("Book a Quick 15 Min With Misti", "https://calendly.com/hey-pearl/meet")}
      ${p("And if you'd rather just go for it on your own:")}
      ${btn("Complete My Enrollment", link)}
      ${p("Either way, I'm here and I'm holding your spot as long as I can.")}
      ${sig()}
    `, "hot_proof"),
  };
}

// ─── PURCHASED WELCOME ────────────────────────────────────────────────────────

function purchasedWelcome1({ firstName, city, stripeLink, packagePrice }: EmailData) {
  const display = dn(firstName); const name = display ?? "Hey"; const loc = city ?? "your market";
  const link = stripeLink ?? "#";
  const price = packagePrice ? `$${packagePrice}/mo` : "your";
  return {
    subject: display ? `Welcome to GEO, ${display} — let's get started` : "Welcome to GEO — let's get started",
    html: emailWrapper(`
      ${h1(`Welcome to GEO${display ? `, ${display}` : ""}!`)}
      ${p(`${name}, it was great meeting with you today. I'm genuinely excited to work with you and get you dominating ${loc}.`)}
      ${p(`You made a great decision. Here's your next step — click the button below to get started with your ${price} GEO plan.`)}
      ${btn("Complete My Payment", link)}
      ${p("Once payment is received, I'll reach out within 24 hours to kick things off.")}
      ${p("Excited to get to work.")}
      ${sig()}
    `, "purchased_welcome"),
  };
}

// ─── POST INTERVIEW ───────────────────────────────────────────────────────────

function postInterview1({ firstName }: EmailData) {
  const display = dn(firstName); const name = display ?? "Hey";
  return {
    subject: display ? `${display}, ready to record?` : "Ready to record?",
    html: emailWrapper(`
      ${h1("Let's Get You on the Show")}
      ${p(`${name}, it was great connecting with you for our pre-interview.`)}
      ${p("I'm excited to have you on the Blue Ocean Strategies podcast. Click the link below to pick your recording time and we'll lock it in.")}
      ${btn("Book My Recording Session", "{{PODCAST_CALENDLY_LINK}}")}
      ${p("If you have any questions before then, just hit reply.")}
      ${sig()}
    `, "post_interview"),
  };
}

// ─── V2 COLD (seller appointment-setting > book strategy call) ───────────────

export function v2Cold1({ firstName, city }: EmailData) {
  const display = dn(firstName);
  const name = display ?? "Hey";
  const location = city ?? "your market";
  const locationPhrase = city ? ` in ${city}` : "";
  return {
    subject: display ? `${display}, your listing market is still open` : "Your listing market is still open",
    html: emailWrapper(`
      ${h1(`Your Market Is Open. Here Is What That Means.`)}
      ${p(`${name}, I just checked ${location}.`)}
      ${p(`No other agent has claimed it. That is good news, and I do not want you to sit on it.`)}
      ${p(`Here is the problem most agents have${locationPhrase}: they are working hard to fill their listing pipeline and still grinding for every appointment. Cold calling expired listings. Paying for Zillow leads who interview six other agents. Knocking doors on their day off.`)}
      ${p(`That is not a hustle problem. That is a system problem.`)}
      ${p(`GEO V2 is a done-for-you appointment-setting machine. We build the entire system, we run it, and warm ready-to-list sellers start showing up in your pipeline. You do not cold call. You do not door knock. You do not buy leads. Your only job is the appointment.`)}
      ${p(`But here is the thing: we only run this for one agent per market. If someone else in ${location} books a strategy call before you do, your window closes permanently.`)}
      ${btn("Claim My Listing Market", "https://geo.heypearl.io/v2schedule")}
      ${p(`The call is 30 minutes. It is free. And your market is still open right now.`)}
      ${sig()}
    `, "v2_cold"),
  };
}

export function v2Cold2({ firstName, city }: EmailData) {
  const display = dn(firstName);
  const name = display ?? "Hey";
  const location = city ?? "your market";
  return {
    subject: display ? `${display}, this happened last week` : "This happened last week",
    html: emailWrapper(`
      ${h1(`Real Results From Agents Just Like You`)}
      ${p(`${name}, I want to share what I heard from agents I work with this week.`)}
      ${p(`Sarah, an agent in Austin, had three seller appointments in her first two weeks. Not one cold call. The sellers were already warm when they showed up. The first one signed on the spot.`)}
      ${p(`Derek, in Newport Beach, told me his calendar has more listing appointments on it right now than it did all of last quarter. His exact words: "I just show up."`)}
      ${p(`Rachel, in Scottsdale, had a seller call her saying she had been following her content and was ready to list. Said she did not want to talk to anyone else. They signed the listing agreement that afternoon.`)}
      ${p(`These are not outliers. They are what happens when your pipeline is being built for you while you are out closing deals.`)}
      ${p(`${location} does not have a GEO V2 agent yet. That means the window is still open for you. It also means it can close any day.`)}
      ${btn("Book My Free Strategy Call", "https://geo.heypearl.io/v2schedule")}
      ${sig()}
    `, "v2_cold"),
  };
}

export function v2Cold3({ firstName, city }: EmailData) {
  const display = dn(firstName);
  const name = display ?? "Hey";
  const location = city ?? "your market";
  return {
    subject: display ? `Last note, ${display}` : "Last note",
    html: emailWrapper(`
      ${h1(`I Won't Keep Following Up After This`)}
      ${p(`${name}, this is my last email about GEO V2.`)}
      ${p(`Not because I don't think it would make a difference for you. I do. But I respect your inbox and your time, and I'd rather send one honest final note than keep nudging you.`)}
      ${p(`${location} is still available as of today. I don't know how much longer that stays true.`)}
      ${p(`Here is what I haven't said yet: the agents who move first in their market don't just get the spot. They get the compounding advantage of being the only agent in their city with a full seller pipeline running while everyone else is still grinding.`)}
      ${p(`That gap gets harder to close every week.`)}
      ${btn("Book My Free Strategy Call", "https://geo.heypearl.io/v2schedule")}
      ${p(`If the timing just isn't right, no hard feelings. Reply and let me know and I will stop the follow-up. Either way, I appreciate you checking out GEO V2.`)}
      ${sig()}
    `, "v2_cold"),
  };
}

// ─── V2 POST BOOKING ─────────────────────────────────────────────────────────

export function v2PostBooking1({ firstName }: EmailData) {
  const display = dn(firstName);
  const name = display ?? "Hey";
  return {
    subject: display ? `${display}, you're booked` : "You're booked",
    html: emailWrapper(`
      ${h1(`Your Strategy Call Is Confirmed.`)}
      ${p(`${name}, we're on the calendar. Check your inbox for the Calendly confirmation with the meeting link and all the details.`)}
      ${p(`Here is what the call will cover:`)}
      <table cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 24px;">
        ${[
          ["Your market availability", "I'll confirm whether your city is still open for GEO V2 and what that means for your pipeline."],
          ["How the system works", "I'll walk you through exactly how we build, run, and fill your seller appointment calendar — done for you."],
          ["What it looks like in your market", "Every market is different. We'll talk through what realistic results look like for yours."],
        ].map(([label, desc]) => `
        <tr>
          <td style="padding:14px 0;border-bottom:1px solid #EDF0FA;vertical-align:top;">
            <p style="margin:0 0 4px;font-weight:700;color:${NAVY};">${label}</p>
            <p style="margin:0;font-size:14px;color:#4A5E7A;">${desc}</p>
          </td>
        </tr>`).join("")}
      </table>
      ${p("One thing to bring: think about how many listing appointments you want to be booking per month. We'll build the strategy around that number.")}
      ${p("See you on the call.")}
      ${sig()}
    `, "v2_post_booking"),
  };
}

export function v2PostBooking2({ firstName }: EmailData) {
  const display = dn(firstName);
  const name = display ?? "Hey";
  return {
    subject: display ? `Tomorrow, ${display}` : "Tomorrow",
    html: emailWrapper(`
      ${h1(`We're On for Tomorrow`)}
      ${p(`${name}, just a quick note before our call.`)}
      ${p(`Your market is still available as of today. I want to make sure we use every minute of our 30 minutes together, so here is the one thing to have ready:`)}
      ${p(`Think about the number of seller appointments you want on your calendar each month. Not a pie-in-the-sky number. A real one. That is what I will build the strategy around on the call.`)}
      ${p("That's it. I'll have everything pulled up on my end. See you tomorrow.")}
      ${sig()}
    `, "v2_post_booking"),
  };
}

// ─── AFFILIATE SCHEDULE ABANDONED ────────────────────────────────────────────

export function affiliateScheduleAbandoned1({ firstName }: EmailData) {
  const display = dn(firstName);
  const name = display ?? "Hey";
  return {
    subject: display ? `${display}, one step left` : "One step left",
    html: emailWrapper(`
      ${h1(`You Applied. Now Book Your Onboarding.`)}
      ${p(`${name}, you filled out your partner application — the next step is booking your onboarding call so we can get you set up and selling.`)}
      ${p("That call is where you get everything you need: your offer training, your sales tools, your commission setup, and answers to any questions before you start closing.")}
      ${btn("Book My Onboarding Call", "https://calendly.com/hey-pearl/meet")}
      ${p("Takes 30 minutes. Your spot is open.")}
      ${sig()}
    `, "affiliate_schedule_abandoned"),
  };
}

// ─── AFFILIATE POST-BOOKING ───────────────────────────────────────────────────

export function affiliatePostBooking1({ firstName }: EmailData) {
  const display = dn(firstName);
  const name = display ?? "Hey";
  return {
    subject: display ? `${display}, you're confirmed` : "You're confirmed",
    html: emailWrapper(`
      ${h1(`Your Onboarding Call Is Set. Here's What to Expect.`)}
      ${p(`${name}, you're confirmed. Check your calendar for the invite.`)}
      ${p("Here's what we'll cover on the call:")}
      <table cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 24px;">
        ${[
          ["The offer", "You'll learn exactly what you're selling, who it's for, and why local businesses are buying it. You'll leave knowing how to pitch it confidently."],
          ["Your sales setup", "We'll get your partner dashboard active, your commission tracking live, and your unique sales link ready to use."],
          ["How to close your first deal", "We'll walk through the sales process step by step — how to find prospects, start the conversation, and get them to yes."],
        ].map(([label, desc]) => `
        <tr>
          <td style="padding:14px 0;border-bottom:1px solid #EDF0FA;vertical-align:top;">
            <p style="margin:0 0 4px;font-weight:700;color:${NAVY};">${label}</p>
            <p style="margin:0;font-size:14px;color:#4A5E7A;">${desc}</p>
          </td>
        </tr>`).join("")}
      </table>
      ${p("You don't need to prepare anything. Just show up ready to learn the product and hit the ground running.")}
      ${sig()}
    `, "affiliate_post_booking"),
  };
}

export function affiliatePostBooking2({ firstName }: EmailData) {
  const display = dn(firstName);
  const name = display ?? "Hey";
  return {
    subject: display ? `See you tomorrow, ${display}` : "See you tomorrow",
    html: emailWrapper(`
      ${h1(`We're On for Tomorrow`)}
      ${p(`${name}, quick reminder — your partner onboarding call is tomorrow.`)}
      ${p("One thing to think about before we hop on: what kind of businesses do you want to go after? Industry, size, location — whatever makes sense for how you sell. You don't need a formal answer, just a direction. We'll use that to make your first few conversations as targeted as possible.")}
      ${p("Everything else I'll cover on the call. See you tomorrow.")}
      ${sig()}
    `, "affiliate_post_booking"),
  };
}

// ─── EMAIL DISPATCH MAP ──────────────────────────────────────────────────────

type TemplateKey = `${"lead_nurture" | "long_term_nurture" | "warm_nurture" | "post_booking" | "post_call" | "no_show" | "schedule_abandoned" | "video_watched" | "video_abandoned" | "audit_invite" | "audit_failed" | "pre_interview" | "claim_nurture" | "proof" | "hot_proof" | "purchased_welcome" | "post_interview" | "v2_cold" | "v2_post_booking" | "affiliate_schedule_abandoned" | "affiliate_post_booking"}_${number}`;
// Note: lead_nurture and claim_nurture entries kept in EMAIL_TEMPLATES for backward compat
// (existing queue rows still need to be sent). New enrollments go into warm_nurture.
type TemplateFn = (data: EmailData) => { subject: string; html: string };

export const EMAIL_TEMPLATES: Record<TemplateKey, TemplateFn> = {
  lead_nurture_1: leadNurture1,
  lead_nurture_2: leadNurture2,
  lead_nurture_3: leadNurture3,
  lead_nurture_4: leadNurture4,
  lead_nurture_5: leadNurture5,
  lead_nurture_6: leadNurture6,
  schedule_abandoned_1: scheduleAbandoned1,
  post_booking_1: postBooking1,
  post_booking_2: postBooking2,
  post_booking_3: postBooking3,
  post_booking_4: postBooking4,
  post_booking_5: postBooking5,
  no_show_1: noShow1,
  no_show_2: noShow2,
  no_show_3: noShow3,
  no_show_4: noShow4,
  video_watched_1: videoWatched1,
  video_abandoned_1: videoAbandoned1,
  long_term_nurture_1: longTermNurture1,
  long_term_nurture_2: longTermNurture2,
  long_term_nurture_3: longTermNurture3,
  long_term_nurture_4: longTermNurture4,
  long_term_nurture_5: longTermNurture5,
  long_term_nurture_6: longTermNurture6,
  audit_invite_1: auditInvite1,
  audit_invite_2: auditInvite2,
  audit_invite_3: auditInvite3,
  audit_failed_1: auditFailed1,
  audit_failed_2: auditFailed2,
  audit_failed_3: auditFailed3,
  warm_nurture_1:  warmNurture1,
  warm_nurture_2:  warmNurture2,
  warm_nurture_3:  warmNurture3,
  warm_nurture_4:  warmNurture4,
  warm_nurture_5:  warmNurture5,
  warm_nurture_6:  warmNurture6,
  warm_nurture_7:  warmNurture7,
  warm_nurture_8:  warmNurture8,
  warm_nurture_9:  warmNurture9,
  warm_nurture_10: warmNurture10,
  claim_nurture_1: claimNurture1,
  claim_nurture_2: claimNurture2,
  claim_nurture_3: claimNurture3,
  claim_nurture_4: claimNurture4,
  claim_nurture_5: claimNurture5,
  pre_interview_1: preInterview1,
  pre_interview_2: preInterview2,
  post_call_1:  postCall1,
  post_call_2:  postCall2,
  post_call_3:  postCall3,
  post_call_4:  postCall4,
  post_call_5:  postCall5,
  post_call_6:  postCall6,
  post_call_7:  postCall7,
  post_call_8:  postCall8,
  post_call_9:  postCall9,
  post_call_10: postCall10,
  post_call_11: postCall11,
  post_call_12: postCall12,
  proof_1: proof1,
  proof_2: proof2,
  proof_3: proof3,
  proof_4: proof4,
  proof_5: proof5,
  proof_6: proof6,
  proof_7: proof7,
  proof_8: proof8,
  proof_9: proof9,
  proof_10: proof10,
  proof_11: proof11,
  proof_12: proof12,
  purchased_welcome_1: purchasedWelcome1,
  hot_proof_1: hotProof1,
  hot_proof_2: hotProof2,
  hot_proof_3: hotProof3,
  hot_proof_4: hotProof4,
  hot_proof_5: hotProof5,
  post_interview_1: postInterview1,
  v2_cold_1: v2Cold1,
  v2_cold_2: v2Cold2,
  v2_cold_3: v2Cold3,
  v2_post_booking_1: v2PostBooking1,
  v2_post_booking_2: v2PostBooking2,
  affiliate_schedule_abandoned_1: affiliateScheduleAbandoned1,
  affiliate_post_booking_1: affiliatePostBooking1,
  affiliate_post_booking_2: affiliatePostBooking2,
};
