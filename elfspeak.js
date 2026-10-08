// Elf-speak: before a secret chat message is sent, names are bleeped out and the message is
// run through an elf filter on this device, which irons out texting habits and adds elf flourishes.
// Nothing is sent anywhere else, and the original words are never stored.
export const MAX_LEN = 1000;

// ---------- Bleeping names ----------
// Names that are also everyday words are bleeped only when written with a capital letter.
const COMMON = new Set(["will", "may", "june", "april", "august", "joy", "hope", "grace", "faith", "bill", "mark", "rose", "pat", "sue", "art", "ray",
  "jack", "ivy", "dawn", "summer", "rob", "sky", "holly", "chase", "hunter", "sunny", "angel", "baby", "rich", "jean", "frank", "earl", "gene", "page", "max", "carol", "noel", "eve", "star", "honey", "cash", "miles", "bob", "don", "drew", "harry", "lily", "daisy", "amber", "ruby", "pearl", "autumn", "dale", "glen", "reed", "wade", "brook", "river"]);
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const hasHangul = s => /[ㄱ-힝]/.test(s);
// Every full name and each part of it ("Mary Ann Lee" -> "Mary Ann Lee", "Mary", "Ann", "Lee"), longest first.
function nameParts(names){
  const set = new Set();
  names.forEach(n => {
    const full = String(n || "").trim().replace(/\s+/g, " "); if (!full) return;
    set.add(full);
    full.split(/[\s\-]+/).forEach(p => { const w = p.replace(/[^\p{L}\p{N}']/gu, ""); if (w.length >= 2 || hasHangul(w)) set.add(w); });
  });
  return [...set].sort((a, b) => b.length - a.length);
}
const PLACEHOLDER = "[NAME]";
// Swap any group member's name for [NAME]. Korean names may have particles attached (민수야, 민수는).
export function maskNames(text, names){
  let out = String(text || "");
  nameParts(names).forEach(n => {
    const after = hasHangul(n) ? "" : "(?![\\p{L}\\p{N}])";
    const flags = COMMON.has(n.toLowerCase()) ? "gu" : "giu";
    const word = COMMON.has(n.toLowerCase()) ? n.charAt(0).toUpperCase() + esc(n.slice(1)) : esc(n);
    out = out.replace(new RegExp("(?<![\\p{L}\\p{N}])" + (COMMON.has(n.toLowerCase()) ? word : esc(n)) + after, flags), PLACEHOLDER);
  });
  return out;
}
const BLEEPS = { en: ["🔔*jingle-jingle*🔔", "🤫*ho-ho-hush!*", "🔔*bleep-a-bell*🔔", "✨*shh, secret!*✨"], ko: ["🔔*딸랑딸랑*🔔", "🤫*쉿, 비밀!*", "🔔*삐-삐-빙*🔔", "✨*비밀이에요!*✨"] };
export function bleep(text, lang){
  const opts = BLEEPS[lang] || BLEEPS.en; let i = 0;
  return text.replace(/\[\s*NAME\s*\]/gi, () => opts[(i++) % opts.length]);
}

// ---------- The elf filter ----------
const OPEN = { en: ["Jingle bells! ", "Tee-hee! ", "Oh my sparkles! ", "Hello hello! "], ko: ["징글벨! ", "히히! ", "반짝반짝! ", "안녕안녕! "] };
const CLOSE = { en: [" ✨", " 🎄", " ❄️✨", " 🎁"], ko: [" ✨", " 🎄", " ❄️✨", " 🎁"] };
const SWAPS = [[/\b(lol|lmao|haha+|hehe+|hah)\b/gi, "tee-hee"], [/\bu\b/gi, "you"], [/\bur\b/gi, "your"], [/\bthx\b|\bty\b/gi, "thank you"], [/\bpls\b|\bplz\b/gi, "please"],
  [/\bidk\b/gi, "I'm not sure"], [/\bbtw\b/gi, "by the way"], [/\bgonna\b/gi, "going to"], [/\bwanna\b/gi, "want to"], [/\bya\b/gi, "you"], [/\byeah\b|\byep\b|\byup\b/gi, "yes"], [/\bnope\b|\bnah\b/gi, "no"],
  [/\bomg\b/gi, "oh my goodness"], [/\br\b/gi, "are"], [/\btho\b/gi, "though"], [/\bcuz\b/gi, "because"], [/\bk\b|\bkk\b|\bok\b|\bokay\b/gi, "okay"], [/\bthru\b/gi, "through"], [/\bim\b/gi, "I'm"], [/\bdont\b/gi, "don't"], [/\bcant\b/gi, "can't"]];
export function simpleElf(text, lang){
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  let s = String(text).replace(/\p{Extended_Pictographic}/gu, "").replace(/\s+/g, " ").trim();
  if (lang !== "ko") {
    SWAPS.forEach(([re, to]) => { s = s.replace(re, to); });
    // Even out capitals without touching sizes or brands: shouting becomes normal, sentences start with a capital.
    if (s.length > 8 && s === s.toUpperCase()) s = s.toLowerCase().replace(/\[name\]/g, PLACEHOLDER);
    s = s.replace(/\bi\b/g, "I").replace(/(^|[.!?]\s+)(\p{Ll})/gu, (m, a, b) => a + b.toUpperCase());
  }
  s = s.replace(/([!?.])\1+/g, "$1").replace(/\s+([,.!?])/g, "$1");
  if (s && !/[.!?…~]$/.test(s)) s += lang === "ko" ? "~" : "!";
  return pick(OPEN[lang] || OPEN.en) + s + pick(CLOSE[lang] || CLOSE.en);
}

// Turn what someone typed into what their elf says.
export async function elfify(text, names){
  const lang = hasHangul(text) ? "ko" : "en";
  const masked = maskNames(text, names).trim().slice(0, MAX_LEN);
  if (!masked) return { text: "" };
  return { text: bleep(simpleElf(masked, lang), lang).slice(0, MAX_LEN) };
}
