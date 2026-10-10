// Little elf portraits for the secret chats. Each one is drawn from a "seed", so the same
// chat always shows the same elf, and nothing about it comes from who the person really is.
import { getLang } from "./i18n.js?v=202610092037";

const HATS   = ["#d23b48", "#2f8a57", "#3a6fd8", "#8a4fd1", "#1f9c9a", "#e0a526", "#e2588f", "#e9772e"];
const BGS    = ["#fde3e3", "#dff3e6", "#e1eafc", "#ece3fb", "#dcf3f2", "#fbf0d6", "#fde2ee", "#fde8da"];
const COLLAR = ["#2f8a57", "#d23b48", "#e0a526", "#1f9c9a", "#8a4fd1", "#3a6fd8", "#2f8a57", "#3a6fd8"];
const SKIN   = [["#ffe1cc", "#f3bfa0"], ["#f6c9a4", "#e3a581"], ["#e3a77d", "#c9875e"], ["#c58a5f", "#a86d45"], ["#8d5a3b", "#734429"]];
const HAIR   = ["#5a3a22", "#2b2018", "#c9792f", "#e7c26a", "#9b4a2a", "#7a7a85"];
const NAMES  = [["Jingle", "징글"], ["Twinkle", "반짝이"], ["Pepper", "페퍼"], ["Sprinkle", "스프링클"], ["Tinsel", "틴셀"], ["Snowdrop", "눈송이"],
                ["Buttons", "단추"], ["Cocoa", "코코아"], ["Juniper", "주니퍼"], ["Holly", "홀리"], ["Sugarplum", "슈가플럼"], ["Cinnamon", "시나몬"],
                ["Frosty", "프로스티"], ["Biscuit", "비스킷"], ["Nutmeg", "넛멕"], ["Maple", "메이플"], ["Pip", "핍"], ["Garland", "갈랜드"],
                ["Merry", "메리"], ["Gumdrop", "젤리"], ["Pinecone", "솔방울"], ["Cranberry", "크랜베리"], ["Mistletoe", "겨우살이"], ["Snickerdoodle", "쿠키"]];

function hash(s){ let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
// A second, independent stream of numbers from the same seed.
const pick = (h, salt, n) => hash(h + ":" + salt) % n;

// What an elf looks like. `avoid` keeps two elves in the same chat from sharing a hat color.
export function elfLook(seed, avoid){
  const h = String(hash(seed));
  let hat = pick(h, "hat", HATS.length);
  if (avoid != null && hat === avoid) hat = (hat + 3) % HATS.length;
  return {
    hat, bg: hat,
    collar: COLLAR[hat],
    skin: pick(h, "skin", SKIN.length),
    hair: pick(h, "hair", HAIR.length),
    pattern: pick(h, "pattern", 3),     // plain, stripes, dots
    tip: pick(h, "tip", 3),             // pompom, bell, star
    eyes: pick(h, "eyes", 3),           // open, happy, wink
    extra: pick(h, "extra", 4),         // none, freckles, glasses, rosy
    name: pick(h, "name", NAMES.length)
  };
}

export function elfName(look){ const n = NAMES[look.name]; return getLang() === "ko" ? n[1] : n[0]; }

let uid = 0;
export function elfSvg(look, size = 44){
  const id = "elf" + (++uid);
  const hat = HATS[look.hat], bg = BGS[look.bg], [skin, skinShade] = SKIN[look.skin], hair = HAIR[look.hair];
  const ink = "#2b1d16";
  const cone = "M15 25 C17 14 27 5 41 4 C47 3.6 52 5.5 54 8 C49 9 46 13 46 18 L49 25 Z";
  const pattern = look.pattern === 1
    ? `<g clip-path="url(#${id}c)" stroke="#fff" stroke-opacity=".55" stroke-width="3.2"><path d="M14 22 L34 2 M22 26 L44 4 M30 28 L54 4 M38 28 L60 6"/></g>`
    : look.pattern === 2
    ? `<g clip-path="url(#${id}c)" fill="#fff" fill-opacity=".6"><circle cx="24" cy="18" r="1.8"/><circle cx="33" cy="12" r="1.8"/><circle cx="40" cy="20" r="1.8"/><circle cx="43" cy="8" r="1.6"/><circle cx="30" cy="22" r="1.5"/></g>`
    : "";
  const tip = look.tip === 1
    ? `<circle cx="54.5" cy="9" r="4.2" fill="#f2c14e" stroke="#c8952c" stroke-width="1"/><path d="M51.6 9.6 h5.8" stroke="#a87a1e" stroke-width="1" stroke-linecap="round"/><circle cx="54.5" cy="11" r=".9" fill="#a87a1e"/>`
    : look.tip === 2
    ? `<path d="M54.5 3.2 l1.6 3.4 3.7.5-2.7 2.6.7 3.7-3.3-1.8-3.3 1.8.7-3.7-2.7-2.6 3.7-.5z" fill="#f2c14e" stroke="#c8952c" stroke-width=".8" stroke-linejoin="round"/>`
    : `<circle cx="54.5" cy="9" r="4.6" fill="#fff"/><circle cx="53.3" cy="7.8" r="1.4" fill="#fff" stroke="#e8e2da" stroke-width=".6"/>`;
  const eye = (x) => look.eyes === 1
    ? `<path d="M${x - 2.6} 40.5 q2.6 -3.2 5.2 0" fill="none" stroke="${ink}" stroke-width="1.7" stroke-linecap="round"/>`
    : `<ellipse cx="${x}" cy="40" rx="2" ry="2.5" fill="${ink}"/><circle cx="${x + .7}" cy="39.1" r=".7" fill="#fff"/>`;
  const eyes = look.eyes === 2
    ? eye(26) + `<path d="M35.4 40.3 q2.6 -2.4 5.2 0" fill="none" stroke="${ink}" stroke-width="1.7" stroke-linecap="round"/>`
    : eye(26) + eye(38);
  const extra = look.extra === 1
    ? `<g fill="${skinShade}"><circle cx="21.5" cy="44" r=".8"/><circle cx="23.5" cy="45.5" r=".8"/><circle cx="20.8" cy="46.3" r=".8"/><circle cx="42.5" cy="44" r=".8"/><circle cx="40.5" cy="45.5" r=".8"/><circle cx="43.2" cy="46.3" r=".8"/></g>`
    : look.extra === 2
    ? `<g fill="none" stroke="${ink}" stroke-width="1.2" stroke-opacity=".8"><circle cx="26" cy="40" r="4.3"/><circle cx="38" cy="40" r="4.3"/><path d="M30.3 40 h3.4"/></g>`
    : "";
  const cheeks = look.extra === 3 ? `fill="#ff7d86" fill-opacity=".55"` : `fill="#ff8f8f" fill-opacity=".38"`;
  return `<svg class="elf" viewBox="0 0 64 64" width="${size}" height="${size}" role="img" aria-hidden="true" focusable="false">
<defs><clipPath id="${id}r"><circle cx="32" cy="32" r="32"/></clipPath><clipPath id="${id}c"><path d="${cone}"/></clipPath></defs>
<g clip-path="url(#${id}r)">
<rect width="64" height="64" fill="${bg}"/>
<g transform="translate(32 35) scale(.87) translate(-32 -32)">
<path d="M12 74 L13 63 L18 55 L23 60 L28 54 L32 60 L36 54 L41 60 L46 55 L51 63 L52 74 Z" fill="${look.collar}"/>
<path d="M20 35 Q11 31 6.5 25.5 Q9 38.5 20.5 45 Z" fill="${skin}"/><path d="M18.5 37 Q12.5 33.5 10 30.5 Q12.5 38.5 19 42 Z" fill="${skinShade}"/>
<path d="M44 35 Q53 31 57.5 25.5 Q55 38.5 43.5 45 Z" fill="${skin}"/><path d="M45.5 37 Q51.5 33.5 54 30.5 Q51.5 38.5 45 42 Z" fill="${skinShade}"/>
<ellipse cx="32" cy="40" rx="14.5" ry="15" fill="${skin}"/>
<path d="M17.6 36.5 C17.5 30 46.5 30 46.4 36.5 C44 34.2 42 36.4 39.4 34.3 C37 36.6 34.4 34.2 32 36.2 C29.6 34.2 27 36.6 24.6 34.3 C22 36.4 20 34.2 17.6 36.5 Z" fill="${hair}"/><path d="M17.6 36.5 C16.8 39 17 41 17.8 42.5 C18.4 40 19.4 38.4 20.2 37.2 Z M46.4 36.5 C47.2 39 47 41 46.2 42.5 C45.6 40 44.6 38.4 43.8 37.2 Z" fill="${hair}"/>
<path d="${cone}" fill="${hat}"/>${pattern}
<rect x="13" y="22.5" width="38" height="8" rx="4" fill="#fff"/><path d="M16 26.5 h32" stroke="#ebe5dc" stroke-width="1.2" stroke-dasharray="1.5 2.5" stroke-linecap="round"/>
${tip}
${eyes}
<circle cx="21.5" cy="45.5" r="3.2" ${cheeks}/><circle cx="42.5" cy="45.5" r="3.2" ${cheeks}/>
${extra}
<ellipse cx="32" cy="44" rx="1.8" ry="1.4" fill="${skinShade}"/>
<path d="M28 48 q4 4 8 0" fill="none" stroke="#7a3b2b" stroke-width="1.7" stroke-linecap="round"/>
</g></g></svg>`;
}

// A ready-to-insert element.
export function elfAvatar(look, size = 44){
  const span = document.createElement("span"); span.className = "elfav"; span.innerHTML = elfSvg(look, size); return span;
}
