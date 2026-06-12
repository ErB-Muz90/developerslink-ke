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
  "sogetthis.com", "spoofmail.de", "trashmail.xyz",
  "filzmail.com", "fakemailgenerator.com",
  "nwldx.com", "mailsiphon.com", "mailscrap.com",
  "mailboxy.fun", "disposablemail.com", "burnermail.io",
  "mintemail.com", "mailtemp.info",
]);

export function isDisposableEmail(email: string): boolean {
  const parts = email.toLowerCase().trim().split("@");
  if (parts.length !== 2) return false;
  const domain = parts[1];
  return DISPOSABLE_DOMAINS.has(domain);
}
