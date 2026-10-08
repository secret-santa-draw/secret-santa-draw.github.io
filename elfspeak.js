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
// A sprinkle of cheer: one small elf touch per message, picked at random (so it says nothing
// about who wrote it) and chosen to fit what kind of message it is.
const CHEER = {
  en: { hello: ["Hello hello!", "Ho ho hello!", "Hi hi from the North Pole!"],
        ask: ["Ooh, ", "Elf question: ", "Ooh ooh, "],
        laugh: [" Tee-hee!", " Hee hee!"],
        thanks: [" You're the best!", " Yay!"],
        // Fun elf phrases, sprinkled in at random: at the start, between sentences, or at the end.
        start: ["Jingle jingle! ", "Oh, sugarplums! ", "Twinkle twinkle! ", "Hooray for elf mail! ", "Ooh, tinsel and twinkles! "],
        middle: ["Holly jolly!", "Jingle all the way!", "Ooh, how merry!", "Sprinkles and snowflakes!"],
        end: [" Jingle all the way!", " Holly jolly!", " Merry, merry!", " Back to the workshop I go!", " Sprinkles and snowflakes!"] },
  ko: { hello: ["안녕안녕!", "북극에서 인사해요!"],
        ask: ["궁금해요! ", "엘프의 질문! "],
        laugh: [" 히히!", " 헤헤!"],
        thanks: [" 최고예요!", " 야호!"],
        start: ["징글징글! ", "반짝반짝! ", "와아, 신나요! ", "엘프 편지 도착! "],
        middle: ["메리메리!", "신난다!", "반짝반짝!"],
        end: [" 메리메리!", " 루돌프도 신났어요!", " 이제 작업장으로 돌아갈게요!", " 눈송이처럼 반짝!"] }
};
const pick = a => a[Math.floor(Math.random() * a.length)];
export function simpleElf(text, lang){
  const C = CHEER[lang === "ko" ? "ko" : "en"];
  let s = String(text).replace(/\p{Extended_Pictographic}|️|‍/gu, " ").replace(EMOTICON, "$1 ");
  let laughed = false, greeted = false;
  if (lang === "ko") {
    laughed = /[ㅋㅎ]{2,}/.test(s);
    if (/^\s*(?:안녕(?:하세요)?|하이|ㅎㅇ)[\s!~.]*/.test(s)) { greeted = true; s = s.replace(/^\s*(?:안녕(?:하세요)?|하이|ㅎㅇ)[\s!~.]*/, ""); }
    s = s.replace(/[ㅋㅎ]{2,}|[ㅠㅜ]{1,}|ㄷㄷ+|ㅇㅇ|ㄴㄴ/g, " ").replace(/~+/g, "!");
  } else {
    laughed = LAUGH_EN.test(s); LAUGH_EN.lastIndex = 0;
    s = s.replace(LAUGH_EN, " ");
    s = s.replace(/\bu\s+r\b/gi, "you are").replace(/\bur\b(?=\s+(?:going|gonna|welcome|so|the|right|a|an|very|too|not|such|always|never|probably|definitely|\w+ing)\b)/gi, "you're");
    s = s.replace(/(\p{L})\1{2,}/gu, "$1$1");                                   // "sooooo" -> "soo"
    s = s.replace(/[\p{L}\p{N}/']+/gu, w => { const r = WORD_MAP.get(w.toLowerCase()); return r === undefined ? w : r; });
    if (s.replace(/\[NAME\]/g, "").length > 6 && s.replace(/\[NAME\]/g, "") === s.replace(/\[NAME\]/g, "").toUpperCase()) s = s.toLowerCase().replace(/\[name\]/g, PLACEHOLDER);
    // Shouted words calm down (known all-caps names like LEGO stay).
    s = s.replace(/\b[A-Z]{3,}\b/g, w => KEEP_CAPS.has(w) ? w : w.toLowerCase())
         .replace(/\b(?:SO|NO|MY|ME|BE|DO|GO|IN|IT|IS|OF|ON|TO|UP|AT|OR|AN|AM|WE|HE)\b/g, w => w.toLowerCase());
    if (GREETING.test(s)) { greeted = true; s = s.replace(GREETING, ""); }
    s = s.replace(THANKS, "thank you");
    s = s.replace(/\bi\b/g, "I").replace(/\boh my\b(?=\s+\w)/gi, "oh my,").replace(/^(yes|no|okay)\s+(?=\w)/i, "$1, ");
  }
  s = s.replace(/\s+/g, " ").trim()
       .replace(/\.{2,}|…/g, ".").replace(/[?!]*\?[?!]*/g, "?").replace(/!+/g, "!").replace(/,{2,}/g, ",")
       .replace(/\s+([,.!?])/g, "$1").replace(/([,.!?])(?=[^\s,.!?\])])/gu, "$1 ").replace(/^[,.!?\s]+/, "");
  if (lang !== "ko") s = s.replace(/(^|[.!?]\s+)(\p{Ll})/gu, (m, a, b) => a + b.toUpperCase());
  // Nothing left but a laugh or a hello.
  if (!s) return greeted ? pick(C.hello) : lang === "ko" ? "히히!" : "Tee-hee!";
  // A question without a question mark gets one; a plain statement gets an excited "!".
  if (!/[.!?]$/.test(s)) s += (lang !== "ko" && /(?:^|[.!?]\s+)(?:what|who|whom|whose|where|when|why|how|which|do|does|did|is|are|am|was|were|can|could|would|will|should|shall|have|has|any)\b[^.!?]*$/i.test(s)) ? "?" : "!";
  s = s.replace(/\.$/, "!");
  // One touch of cheer, fitted to the message.
  const oneSentence = !/[.!?]\s/.test(s);
  const isQuestion = oneSentence && /\?$/.test(s), isThanks = oneSentence && (lang === "ko" ? /고마워|감사/.test(s) : /^thank you\b/i.test(s));
  const sad = lang === "ko" ? /미안|죄송|못 가|못가|아파|슬퍼|안타깝/.test(s) : /\b(?:sorry|can't|cannot|won't|unfortunately|sad|sick|ill|bad news|passed away|miss you|lost)\b/i.test(s);
  const asks = !greeted && isQuestion && Math.random() < 0.6;
  const touched = greeted || asks || laughed || isThanks;
  // Sometimes a fun elf phrase too: less often when there's already a touch, never at the start
  // when the message already opens with one, and never on sad news.
  if (!sad && Math.random() < (touched ? 0.3 : 0.6)) s = sprinkle(s, C, !(greeted || asks));
  if (greeted) s = pick(C.hello) + " " + s;
  else if (asks) s = pick(C.ask) + (lang === "ko" || /^\[NAME\]|^I\b|^[A-Z]{2,}\b/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1));
  if (laughed) s += pick(C.laugh);
  else if (isThanks) s += pick(C.thanks);
  return s;
}
// Put one elf phrase at the start, between two sentences, or at the end.
function sprinkle(s, C, startOk){
  const breaks = [...s.matchAll(/[.!?]\s+(?=\S)/g)].map(m => m.index + m[0].length);
  const r = Math.random();
  if (breaks.length && r < 0.4) { const at = pick(breaks); return s.slice(0, at) + pick(C.middle) + " " + s.slice(at); }
  if (startOk && r < 0.65 && !/^\[NAME\]/.test(s)) return pick(C.start) + s;
  return s + pick(C.end);
}

// Turn what someone typed into what their elf says.
export async function elfify(text, names){
  const lang = hasHangul(text) ? "ko" : "en";
  const masked = maskNames(text, names).trim().slice(0, MAX_LEN);
  if (!masked) return { text: "" };
  return { text: bleep(simpleElf(masked, lang), lang).slice(0, MAX_LEN) };
}
