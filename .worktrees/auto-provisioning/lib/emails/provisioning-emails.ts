// lib/emails/provisioning-emails.ts
import { resend, pickFrom, REPLY_TO } from "../resend";

interface InviteParams {
  email: string;
  firstName: string;
  slug: string;
  inviteToken: string;
}

export async function sendAffiliateInvite({ email, firstName, slug, inviteToken }: InviteParams) {
  const skoolUrl = process.env.SKOOL_INVITE_URL ?? "https://skool.com";
  await resend.emails.send({
    from: pickFrom(email),
    replyTo: REPLY_TO,
    to: email,
    subject: "Your HeyPearl Partner Account is Ready",
    html: `<p>Hi ${firstName},</p>
<p>Your HeyPearl partner account has been created. Here is everything you need:</p>
<p><strong>Set up your account (password, headshot, Calendly):</strong><br>
<a href="https://geo.heypearl.io/${slug}/setup?token=${inviteToken}">https://geo.heypearl.io/${slug}/setup?token=${inviteToken}</a></p>
<p><strong>Your business card (live within 15 min):</strong><br>
<a href="https://${slug}.heypearl.io">https://${slug}.heypearl.io</a></p>
<p><strong>Your leads dashboard:</strong><br>
<a href="https://geo.heypearl.io/${slug}/leads">https://geo.heypearl.io/${slug}/leads</a></p>
<p><strong>Join HeyPearl HQ community:</strong><br>
<a href="${skoolUrl}">${skoolUrl}</a></p>
<p>Reply to this email if you need anything.</p>`,
  });
}

export async function sendGeoClientInvite({ email, firstName, slug, inviteToken }: InviteParams) {
  await resend.emails.send({
    from: pickFrom(email),
    replyTo: REPLY_TO,
    to: email,
    subject: "Your GEO AI Visibility Engine is Ready",
    html: `<p>Hi ${firstName},</p>
<p>Your GEO AI Visibility Engine account has been created.</p>
<p><strong>Set up your account:</strong><br>
<a href="https://geo.heypearl.io/${slug}/setup?token=${inviteToken}">https://geo.heypearl.io/${slug}/setup?token=${inviteToken}</a></p>
<p><strong>Your leads dashboard:</strong><br>
<a href="https://geo.heypearl.io/${slug}/leads">https://geo.heypearl.io/${slug}/leads</a></p>
<p>Reply to this email if you need anything.</p>`,
  });
}

export async function sendLocalClientInvite({ email, firstName, slug, inviteToken }: InviteParams) {
  await resend.emails.send({
    from: pickFrom(email),
    replyTo: REPLY_TO,
    to: email,
    subject: "Your HeyLocal Account is Ready",
    html: `<p>Hi ${firstName},</p>
<p>Your HeyLocal account has been created.</p>
<p><strong>Set up your account:</strong><br>
<a href="https://geo.heypearl.io/${slug}/setup?token=${inviteToken}">https://geo.heypearl.io/${slug}/setup?token=${inviteToken}</a></p>
<p><strong>Your leads dashboard:</strong><br>
<a href="https://geo.heypearl.io/${slug}/leads">https://geo.heypearl.io/${slug}/leads</a></p>
<p>Reply to this email if you need anything.</p>`,
  });
}

export async function sendV2ClientInvite({ email, firstName, slug, inviteToken }: InviteParams) {
  await resend.emails.send({
    from: pickFrom(email),
    replyTo: REPLY_TO,
    to: email,
    subject: "Your V2 Seller Attraction Engine is Ready",
    html: `<p>Hi ${firstName},</p>
<p>Your V2 Seller Attraction Engine account has been created.</p>
<p><strong>Set up your account:</strong><br>
<a href="https://v2.heypearl.io/cashoffer/${slug}/setup?token=${inviteToken}">https://v2.heypearl.io/cashoffer/${slug}/setup?token=${inviteToken}</a></p>
<p><strong>Your leads dashboard:</strong><br>
<a href="https://v2.heypearl.io/cashoffer/${slug}/leads">https://v2.heypearl.io/cashoffer/${slug}/leads</a></p>
<p>Reply to this email if you need anything.</p>`,
  });
}
