/*
 * Text of the legal pages: Terms of Service (/terms), Privacy Policy
 * (/privacy) and Refund Policy (/refunds), shown by LegalPage.tsx.
 *
 * Marketplace sales are made by Tebex Limited, Mineacle's official reseller
 * and merchant of record; these pages sit next to Tebex's own checkout terms
 * (https://checkout.tebex.io/terms) and privacy policy
 * (https://checkout.tebex.io/privacy), which buyers also agree to.
 *
 * Writing style: plain words a player understands. In paragraphs, {email}
 * becomes the support email link and [Label](/path) becomes a link.
 * Change LEGAL_UPDATED whenever the meaning of any page changes.
 */
export const SUPPORT_EMAIL = "support@mineacle.net";
export const LEGAL_UPDATED = "October 2, 2026";
export const TEBEX_TERMS_URL = "https://checkout.tebex.io/terms";
export const TEBEX_PRIVACY_URL = "https://checkout.tebex.io/privacy";

export type LegalBlock = string | { list: string[] };

export type LegalSection = { heading: string; blocks: LegalBlock[] };

export type LegalDocument = {
  slug: "terms" | "privacy" | "refunds";
  path: string;
  /* Short name for the page switcher and footer. */
  label: string;
  title: string;
  intro: string;
  description: string;
  sections: LegalSection[];
};

const terms: LegalDocument = {
  slug: "terms",
  path: "/terms",
  label: "Terms",
  title: "Terms of Service",
  intro:
    "The rules for using mineacle.net, the Mineacle Minecraft server and the Marketplace.",
  description:
    "Terms of Service for the Mineacle Minecraft server, website and Marketplace.",
  sections: [
    {
      heading: "About these terms",
      blocks: [
        "Mineacle is a Minecraft server and website run by Mineacle Studios (\"Mineacle\", \"we\", \"us\"). These terms apply when you play on the server, use mineacle.net or buy from the Marketplace. By doing any of those, you agree to them. If you don't agree, please don't use Mineacle.",
        "Mineacle is not an official Minecraft service and is not approved by or associated with Mojang or Microsoft. Your use of Minecraft itself is covered by the Minecraft End User License Agreement.",
      ],
    },
    {
      heading: "Your account",
      blocks: [
        "To make a website account you need a Minecraft: Java Edition account that has joined Mineacle. You prove it's yours with a code sent to you in game.",
        {
          list: [
            "Keep your password private. You're responsible for what happens on your account.",
            "One account per person. Don't share, sell or trade accounts.",
            "We may suspend or close accounts that break these terms or the server rules.",
          ],
        },
      ],
    },
    {
      heading: "Server rules",
      blocks: [
        "Follow the rules posted on the server and on our Discord. In short, these are not allowed:",
        {
          list: [
            "Cheating: hacked clients, unfair mods, macros, exploiting bugs or abusing glitches.",
            "Harassment, hate speech, threats, doxxing or sharing other people's personal information.",
            "Scamming players or impersonating staff.",
            "Selling or trading in-game items, currency or accounts for real money or anything outside Mineacle.",
          ],
        },
        "Breaking the rules can lead to a warning, mute, kick or ban. Punishments are listed publicly on the [Bans](/punishments) page.",
      ],
    },
    {
      heading: "Marketplace purchases",
      blocks: [
        "Marketplace payments are handled by Tebex Limited, our official reseller and merchant of record. When you check out, you buy from Tebex and agree to the [Tebex Checkout Terms](https://checkout.tebex.io/terms) as well as these terms.",
        {
          list: [
            "You must be 18 or older, or have permission from a parent or guardian, to buy. Tebex does not accept buyers under 16.",
            "Prices are shown in US dollars. Taxes and the final total are shown at checkout.",
            "Items are delivered in game to the Minecraft account you checked out with, usually within a few minutes. Some items arrive the next time you join.",
            "Make sure your cart and username are right before you pay.",
          ],
        },
      ],
    },
    {
      heading: "Virtual items",
      blocks: [
        "Everything sold on the Marketplace (ranks, keys, kits and other items) is a license to use digital content on Mineacle only. Virtual items:",
        {
          list: [
            "have no real-world value and can't be exchanged for money;",
            "can't be transferred to another player or account, unless we allow it in game;",
            "may be changed, rebalanced or removed to keep the game fair, to fix problems or to follow the Minecraft usage guidelines;",
            "aren't replaced if they're lost through normal play, such as dying, trading, gambling or being scammed.",
          ],
        },
        "Read the [Refund Policy](/refunds) for when a purchase can be refunded.",
      ],
    },
    {
      heading: "Chargebacks",
      blocks: [
        "If something is wrong with a purchase, email {email} first and we'll sort it out. Filing a chargeback or payment dispute without contacting us may lead to your account being suspended until it's resolved.",
      ],
    },
    {
      heading: "Changes and availability",
      blocks: [
        "We work to keep Mineacle online and fun, but the server and website are provided \"as is\" and may sometimes be unavailable. We may change, reset or remove features, worlds and items, and we may close Mineacle.",
        "To the extent the law allows, Mineacle is not liable for indirect or lost-data damages, and our total liability is limited to the amount you paid us in the 12 months before the claim.",
        "We may update these terms. We'll change the date at the top when we do, and big changes will be announced on Discord. Using Mineacle after a change means you accept the new terms.",
      ],
    },
    {
      heading: "Contact",
      blocks: ["Questions about these terms? Email {email}."],
    },
  ],
};

const privacy: LegalDocument = {
  slug: "privacy",
  path: "/privacy",
  label: "Privacy",
  title: "Privacy Policy",
  intro: "What we collect when you play or use mineacle.net, why, and your choices.",
  description: "How Mineacle collects, uses and protects player information.",
  sections: [
    {
      heading: "Who we are",
      blocks: [
        "Mineacle Studios runs the Mineacle Minecraft server and mineacle.net. This policy explains how we handle your information. For anything about your data, email {email}.",
      ],
    },
    {
      heading: "What we collect",
      blocks: [
        {
          list: [
            "Website account: your Minecraft username and UUID, your password (stored only as a secure hash, never in plain text), when the account was made and when you last logged in.",
            "Game data: your username, UUID, rank, team and stats such as kills, deaths, playtime and balance, plus moderation records such as warnings, mutes and bans.",
            "IP addresses: used to protect logins and forms from abuse, to stop cheating and to enforce bans.",
            "Things you add: followed players, notifications and social links you put on your profile.",
            "Purchases: from Tebex we receive your username, the items bought, the price and a transaction ID. We never see your card or bank details.",
          ],
        },
        "We don't ask for your real name, address or date of birth, and we don't run ads.",
      ],
    },
    {
      heading: "What's public",
      blocks: [
        "Player profiles, leaderboards and the Bans page show your Minecraft username, skin, rank, team, stats and any punishments, so other players can see them. Your password and IP address are never shown.",
      ],
    },
    {
      heading: "Cookies and storage",
      blocks: [
        {
          list: [
            "One login cookie (mineacle_session) keeps you signed in for up to 30 days. It's needed for the site to work.",
            "Your browser stores your Marketplace cart and the last server status, so they load quickly. These stay on your device.",
            "Cloudflare, which protects the site, may set security cookies.",
          ],
        },
        "We don't use advertising or tracking cookies.",
      ],
    },
    {
      heading: "Services we use",
      blocks: [
        {
          list: [
            "Tebex processes Marketplace payments under its own [Privacy Policy](https://checkout.tebex.io/privacy).",
            "Cloudflare hosts and protects our website traffic.",
            "mc-heads.net shows player skins and heads.",
            "Discord, if you join our server there.",
            "Server list sites, if you vote. You give them your username to get your reward.",
          ],
        },
        "We don't sell or rent your personal information, and we don't share it for advertising.",
      ],
    },
    {
      heading: "How long we keep it",
      blocks: [
        "Account data is kept while your account exists. Login sessions end after 30 days. Moderation records are kept as long as needed to enforce the rules, and purchase records as long as the law requires.",
      ],
    },
    {
      heading: "Your choices and rights",
      blocks: [
        "You can ask to see, correct or delete your information by emailing {email} from an address we can reply to, along with your Minecraft username. We may need to confirm the account is yours. Depending on where you live (for example California or another US state with a privacy law, or the EU or UK), you may have more rights, and we'll honor them. We won't treat you differently for using them.",
        "Some records, like bans and purchase records, may be kept after a deletion request where we need them to keep the server safe or to meet legal duties.",
      ],
    },
    {
      heading: "Children",
      blocks: [
        "Mineacle is not meant for children under 13, and we don't knowingly collect their personal information. If you think a child under 13 has given us information, email {email} and we'll delete it. Players under 18 need a parent or guardian's permission to buy anything.",
      ],
    },
    {
      heading: "Security and changes",
      blocks: [
        "We protect your information with encrypted connections, hashed passwords and limited access, but no service can be perfectly secure.",
        "We may update this policy. We'll change the date at the top, and big changes will be announced on Discord.",
      ],
    },
  ],
};

const refunds: LegalDocument = {
  slug: "refunds",
  path: "/refunds",
  label: "Refunds",
  title: "Refund Policy",
  intro: "When Marketplace purchases can be refunded and how to ask.",
  description: "Refund Policy for Mineacle Marketplace purchases.",
  sections: [
    {
      heading: "All sales are final",
      blocks: [
        "Marketplace items are digital content delivered right after payment, so all sales are final once delivered, except where the law says otherwise. Payments are handled by Tebex Limited, our official reseller, so any refund is made through Tebex under the [Tebex Checkout Terms](https://checkout.tebex.io/terms).",
        "If you're in the EU or UK, you agree at checkout that delivery starts right away, which ends your 14-day right to cancel once the item is delivered.",
      ],
    },
    {
      heading: "When we'll help",
      blocks: [
        {
          list: [
            "Your item didn't arrive within 24 hours: we'll deliver it, or refund you if we can't.",
            "You were charged twice for the same order: we'll refund the extra charge.",
            "You bought for the wrong username: tell us before the item is used and we may move it once.",
          ],
        },
      ],
    },
    {
      heading: "What isn't refunded",
      blocks: [
        {
          list: [
            "Changing your mind after the item is delivered.",
            "Items that were used, opened, lost, traded or taken in game.",
            "Purchases on an account that's banned for breaking the rules.",
            "Changes we make to items or the game to keep it fair.",
            "Time the server was offline.",
          ],
        },
      ],
    },
    {
      heading: "How to ask",
      blocks: [
        "Email {email} within 14 days of buying, with:",
        {
          list: [
            "your Minecraft username;",
            "your Tebex transaction ID (it starts with tbx- and is in your receipt email);",
            "what went wrong.",
          ],
        },
        "We usually reply within 3 business days.",
      ],
    },
    {
      heading: "Chargebacks",
      blocks: [
        "Please contact us before opening a chargeback or payment dispute. Most problems are fixed quickly by email. Accounts with an open chargeback may be suspended until it's resolved.",
      ],
    },
  ],
};

export const legalDocuments: LegalDocument[] = [terms, privacy, refunds];

export function legalDocument(slug: LegalDocument["slug"]) {
  return legalDocuments.find((doc) => doc.slug === slug)!;
}
