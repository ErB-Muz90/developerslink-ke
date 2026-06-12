const ALLOWED_FREE_PROVIDERS = new Set([
  "gmail.com", "googlemail.com",
  "yahoo.com", "yahoo.co.uk", "yahoo.co.ke", "yahoo.co.za", "yahoo.fr",
  "yahoo.de", "yahoo.es", "yahoo.it", "yahoo.ca", "yahoo.com.br",
  "yahoo.com.ar", "yahoo.com.au", "yahoo.in", "ymail.com", "rocketmail.com",
  "yandex.com", "yandex.ru", "yandex.ua", "yandex.by", "yandex.kz",
  "ya.ru",
  "proton.me", "protonmail.com", "protonmail.ch", "pm.me",
  "outlook.com", "hotmail.com", "hotmail.co.uk", "hotmail.fr",
  "hotmail.de", "hotmail.it", "hotmail.es", "hotmail.co.za",
  "live.com", "live.co.uk", "live.fr", "live.de", "live.nl",
  "msn.com", "windowslive.com",
  "icloud.com", "me.com", "mac.com",
  "aol.com", "aol.co.uk",
  "zoho.com", "zohomail.com",
  "fastmail.com", "fastmail.fm",
  "tutanota.com", "tutanota.de", "tuta.io", "keemail.me",
  "hushmail.com", "hush.com",
]);

const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com", "guerrillamail.com", "guerrillamail.biz",
  "guerrillamail.de", "guerrillamail.info", "guerrillamail.net",
  "guerrillamail.org", "grr.la", "sharklasers.com", "spam.la",
  "guerrillamailblock.com",
  "tempmail.com", "temp-mail.org", "tempmail.net", "tempmail.io",
  "10minutemail.com", "10minutemail.net", "10minutemail.org", "10minemail.com",
  "throwam.com", "throwaway.email", "discard.email",
  "trashmail.com", "trashmail.me", "trashmail.at", "trashmail.io",
  "trashmail.net", "trashmail.org",
  "yopmail.com", "yopmail.fr", "cool.fr.nf", "jetable.fr.nf",
  "nospam.ze.tc", "nomail.xl.cx", "mega.zik.dj",
  "speed.1s.fr", "courriel.fr.nf", "moncourrier.fr.nf", "monemail.fr.nf",
  "monmail.fr.fr",
  "mailnull.com", "mailnesia.com", "fakeinbox.com",
  "dispostable.com", "spamgourmet.com", "spam4.me",
  "spamdecoy.net", "spamfree24.org",
  "temporaryemail.net", "temporarymail.pro", "tempr.email",
  "getairmail.com", "incognitomail.com", "mailexpire.com",
  "mytempemail.com", "safetypost.de", "wegwerfemail.de",
  "rcpt.at", "superrito.com", "trbvm.com",
  "maildrop.cc", "mailnew.com", "mailmetrash.com",
  "throwalemail.com", "notmailinator.com",
  "binkmail.com", "mailismagic.com", "mt2015.com",
  "crap.biz", "teleworm.us", "rppkn.com",
  "moakt.com", "moakt.ws", "moakt.cc",
  "inboxbear.com", "spam.care", "drdrb.net",
  "spambox.us", "spambox.xyz", "spambog.com", "spamcon.org",
  "spamdesign.com", "spamgap.com", "spaml.de",
  "emailondeck.com", "getnada.com", "mailsac.com",
  "mohmal.com", "owlpic.com", "spamherelots.com",
  "spamhere.net", "tinoza.org", "zehnminutenmail.de",
  "trashmail.me", "sogetthis.com", "spoofmail.de",
  "trashmail.xyz", "filzmail.com", "fakemailgenerator.com",
  "nwldx.com", "mailsiphon.com", "mailscrap.com",
  "mailboxy.fun", "disposablemail.com", "burnermail.io",
  "mintemail.com", "mailtemp.info",
]);

export interface EmailValidationResult {
  valid: boolean;
  reason?: string;
}

export function validateEmailDomain(email: string): EmailValidationResult {
  const parts = email.toLowerCase().trim().split("@");
  if (parts.length !== 2) return { valid: false, reason: "Invalid email format." };

  const domain = parts[1];
  if (!domain || !domain.includes(".")) return { valid: false, reason: "Invalid email domain." };

  if (DISPOSABLE_DOMAINS.has(domain)) {
    return {
      valid: false,
      reason: "Disposable or temporary email addresses are not allowed. Please use a real email address.",
    };
  }

  return { valid: true };
}

export function isAllowedFreeProvider(domain: string): boolean {
  return ALLOWED_FREE_PROVIDERS.has(domain.toLowerCase());
}
