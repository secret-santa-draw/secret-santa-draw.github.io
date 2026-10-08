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
// One clear marker everywhere a name was, so it's obvious a name was hidden (and chats style it as a little tag).
export const BLEEP = { en: "[🔔 name hidden]", ko: "[🔔 이름 비밀]" };
export const BLEEP_RE = /\[🔔 (?:name hidden|이름 비밀)\]/g;
export function bleep(text, lang){ return text.replace(/\[\s*NAME\s*\]/gi, BLEEP[lang] || BLEEP.en); }

// ---------- The elf filter ----------
// Kept light on purpose: the goal is that everyone's messages read the same way, not to bury
// them in decoration. It removes personal texting habits (emoji, laughs, slang, ALL CAPS,
// "!!!", stretched words, common misspellings), evens out greetings and thanks, and ends each
// message with one sparkle.
const LAUGH_EN = /\b(?:lo+l+|lmf?ao+|rofl|ha(?:ha)+h?|he(?:he)+|hihi+|jk|xd)\b/gi;
const EMOTICON = /(^|\s)(?:[:;=8xX][-^'o]?[)(\]\[dDpPoO3|\\/*]+|<3+|\^\^|\^_\^|T_T|;_;)(?=\s|$)/g;
const WORDS = [
  ["u", "you"], ["ur", "your"], ["ya", "you"], ["yall", "you all"], ["r", "are"], ["n", "and"], ["b4", "before"], ["2day", "today"], ["2morrow", "tomorrow"], ["tmrw", "tomorrow"], ["tmr", "tomorrow"],
  ["thx", "thank you"], ["thnx", "thank you"], ["thanx", "thank you"], ["ty", "thank you"], ["tysm", "thank you so much"], ["pls", "please"], ["plz", "please"], ["plez", "please"],
  ["idk", "I don't know"], ["idc", "I don't mind"], ["imo", "I think"], ["imho", "I think"], ["btw", "by the way"], ["tbh", "honestly"], ["ngl", "honestly"], ["fyi", "just so you know"],
  ["omg", "oh my"], ["omgosh", "oh my"], ["gonna", "going to"], ["wanna", "want to"], ["gotta", "have to"], ["kinda", "kind of"], ["sorta", "sort of"], ["lemme", "let me"], ["gimme", "give me"],
  ["tho", "though"], ["thru", "through"], ["cuz", "because"], ["bc", "because"], ["coz", "because"], ["w/", "with"], ["w/o", "without"], ["prob", "probably"], ["probs", "probably"], ["def", "definitely"], ["rn", "right now"],
  ["yeah", "yes"], ["yea", "yes"], ["yep", "yes"], ["yup", "yes"], ["yas", "yes"], ["nope", "no"], ["nah", "no"], ["k", "okay"], ["kk", "okay"], ["ok", "okay"], ["okie", "okay"], ["okey", "okay"],
  ["im", "I'm"], ["ive", "I've"], ["dont", "don't"], ["cant", "can't"], ["wont", "won't"], ["didnt", "didn't"], ["doesnt", "doesn't"], ["isnt", "isn't"], ["wasnt", "wasn't"], ["thats", "that's"], ["whats", "what's"], ["youre", "you're"], ["theyre", "they're"], ["theres", "there's"],
  ["definately", "definitely"], ["definetly", "definitely"], ["alot", "a lot"], ["recieve", "receive"], ["wierd", "weird"], ["thier", "their"], ["untill", "until"], ["tommorow", "tomorrow"], ["tomorow", "tomorrow"], ["beleive", "believe"], ["occured", "occurred"], ["seperate", "separate"], ["xmas", "Christmas"], ["chrismas", "Christmas"], ["fav", "favorite"], ["fave", "favorite"], ["favourite", "favorite"], ["colour", "color"], ["sz", "size"],
  ["awesome", "wonderful"], ["amazing", "wonderful"], ["sooo", "so"], ["soo", "so"]
];
const WORD_MAP = new Map(WORDS.map(([a, b]) => [a.toLowerCase(), b]));
const KEEP_CAPS = new Set(["LEGO", "IKEA", "NASA", "NIKE", "USA", "NYC", "LA", "UK", "NFL", "NBA", "MLB", "NHL", "DVD", "XXL", "XXXL", "ASAP", "DIY", "BTS", "PS5", "TV", "KPOP", "UGG", "UGGS", "HBO", "CD", "ID", "USB", "LED", "PJS", "IPAD", "XL", "XS"]);
const GREETING = /^(?:h+i+|h+e+y+a*|hello+|hiya|howdy|yo+|sup|wassup|whats up|good (?:morning|afternoon|evening))\b[\s,!.]*/i;
const THANKS = /\b(?:thanks+|thank u|thank ya|thank you+)\b(?: so much| a lot| a bunch)?/gi;
export function simpleElf(text, lang){
  let s = String(text).replace(/\p{Extended_Pictographic}|️|‍/gu, " ").replace(EMOTICON, "$1 ");
  if (lang === "ko") {
    s = s.replace(/[ㅋㅎ]{2,}|[ㅠㅜ]{1,}|ㄷㄷ+|ㅇㅇ|ㄴㄴ/g, " ").replace(/~+/g, "!");
  } else {
    if (!s.replace(LAUGH_EN, "").replace(/[\s.!?,]/g, "")) return "Tee-hee! ✨";            // just a laugh
    s = s.replace(LAUGH_EN, " ");
    s = s.replace(/\bu\s+r\b/gi, "you are").replace(/\bur\b(?=\s+(?:going|gonna|welcome|so|the|right|a|an|very|too|not|such|always|never|probably|definitely|\w+ing)\b)/gi, "you're");
    s = s.replace(/(\p{L})\1{2,}/gu, "$1$1");                                   // "sooooo" -> "soo"
    s = s.replace(/[\p{L}\p{N}/']+/gu, w => { const r = WORD_MAP.get(w.toLowerCase()); return r === undefined ? w : r; });
    if (s.replace(/\[NAME\]/g, "").length > 6 && s.replace(/\[NAME\]/g, "") === s.replace(/\[NAME\]/g, "").toUpperCase()) s = s.toLowerCase().replace(/\[name\]/g, PLACEHOLDER);
    // Shouted words calm down (known all-caps names like LEGO stay).
    s = s.replace(/\b[A-Z]{3,}\b/g, w => KEEP_CAPS.has(w) ? w : w.toLowerCase())
         .replace(/\b(?:SO|NO|MY|ME|BE|DO|GO|IN|IT|IS|OF|ON|TO|UP|AT|OR|AN|AM|WE|HE)\b/g, w => w.toLowerCase());
    s = s.replace(GREETING, "Hello! ").replace(THANKS, "thank you");
    s = s.replace(/\bi\b/g, "I").replace(/\boh my\b(?=\s+\w)/gi, "oh my,").replace(/^(yes|no|okay)\s+(?=\w)/i, "$1, ");
  }
  s = s.replace(/\s+/g, " ").trim()
       .replace(/\.{2,}|…/g, ".").replace(/[?!]*\?[?!]*/g, "?").replace(/!+/g, "!").replace(/,{2,}/g, ",")
       .replace(/\s+([,.!?])/g, "$1").replace(/([,.!?])(?=[^\s,.!?\])])/gu, "$1 ").replace(/^[,.!?\s]+/, "");
  if (lang !== "ko") s = s.replace(/(^|[.!?]\s+)(\p{Ll})/gu, (m, a, b) => a + b.toUpperCase());
  if (!s) return lang === "ko" ? "히히! ✨" : "Tee-hee! ✨";
  // A question without a question mark gets one.
  if (!/[.!?]$/.test(s)) s += (lang !== "ko" && /(?:^|[.!?]\s+)(?:what|who|whom|whose|where|when|why|how|which|do|does|did|is|are|am|was|were|can|could|would|will|should|shall|have|has|any)\b[^.!?]*$/i.test(s)) ? "?" : "!";
  return s + " ✨";
}

// Turn what someone typed into what their elf says.
export async function elfify(text, names){
  const lang = hasHangul(text) ? "ko" : "en";
  const masked = maskNames(text, names).trim().slice(0, MAX_LEN);
  if (!masked) return { text: "" };
  return { text: bleep(simpleElf(masked, lang), lang).slice(0, MAX_LEN) };
}
