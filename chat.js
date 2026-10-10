// Secret chats: after the draw, each gift gets a private conversation between the giver
// (the Secret Santa) and the person receiving it. A conversation lives under the receiver's
// wishlist id, which only the two of them (and the organizer) know. Messages record only
// which side wrote them ("santa" or "giftee"), never who, so the Santa stays anonymous.
import { db, el } from "./app.js?v=202610092054";
import { collection, doc, getDoc, getDocs, onSnapshot, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { t, locale } from "./i18n.js?v=202610092054";
import { elfLook, elfName, elfAvatar } from "./elves.js?v=202610092054";

export const MAX_LEN = 1000;
const msgsRef = (gid, wishId) => collection(db, "groups", gid, "chats", wishId, "messages");

// Both elves in a conversation come from the conversation itself, so they say nothing about
// who is behind them. The receiver's elf never shares a hat color with their Santa's.
export function elvesFor(wishId){
  const santa = elfLook(wishId + ":santa");
  const giftee = elfLook(wishId + ":giftee", santa.hat);
  return { santa, giftee };
}
export const elfLabel = look => t("{name} the Elf", { name: elfName(look) });

// The conversations a person has: one with whoever they're buying for (they're the Santa),
// one with their own Santa, and one with each of their kids' Santas.
export function threadsFor({ me, kids = [], match }){
  if (!me) return [];
  const out = [];
  ((match && match.gifts) || []).forEach(g => out.push({ wishId: g.wishId, role: "santa", name: g.name, kid: !!g.kid }));
  if (match) out.push({ wishId: me.wishId, role: "giftee", name: null, kid: false });
  if (match) kids.forEach(k => out.push({ wishId: k.wishId, role: "giftee", name: k.name, kid: true, forKid: true }));
  return out.map(th => ({ ...th, key: th.wishId + ":" + th.role, elves: elvesFor(th.wishId) }));
}

// Live messages, oldest first. Messages still on their way show with this device's clock.
export function watchThread(gid, wishId, cb){
  return onSnapshot(msgsRef(gid, wishId), s => {
    const list = s.docs.map(d => {
      const x = d.data({ serverTimestamps: "estimate" });
      return { id: d.id, from: x.from, text: x.text, at: x.at ? x.at.toMillis() : Date.now(), pending: d.metadata.hasPendingWrites };
    }).sort((a, b) => a.at - b.at);
    cb(list);
  }, () => cb(null));
}

export async function sendMessage(gid, wishId, from, text){
  const clean = String(text || "").replace(/\s+$/g, "").replace(/^\s+/g, "").slice(0, MAX_LEN);
  if (!clean) return false;
  await addDoc(msgsRef(gid, wishId), { from, text: clean, at: serverTimestamp() });
  return true;
}

// What's been read is remembered on this device.
const readKey = (gid, key) => "ss-chat-read:" + gid + ":" + key;
export function lastRead(gid, key){ try { return Number(localStorage.getItem(readKey(gid, key))) || 0; } catch (e) { return 0; } }
export function markRead(gid, key, at){ try { if (at > lastRead(gid, key)) localStorage.setItem(readKey(gid, key), String(at)); } catch (e) {} }
export const unreadIn = (msgs, role, since) => (msgs || []).filter(m => m.from !== role && m.at > since).length;

// Delete every message in a group (used when the organizer starts over or deletes the group).
export async function clearChats(gid, wishIds, writeBatch){
  let b = writeBatch(db), n = 0;
  for (const w of wishIds) {
    const s = await getDocs(msgsRef(gid, w));
    for (const d of s.docs) { b.delete(d.ref); if (++n % 400 === 0) { await b.commit(); b = writeBatch(db); } }
  }
  if (n % 400) await b.commit();
}

// For the home page: count unread messages across a person's conversations in one group.
export function watchUnread(gid, secret, cb){
  let stopped = false; const subs = [];
  (async () => {
    try {
      const p = await getDoc(doc(db, "groups", gid, "people", secret)); if (!p.exists() || stopped) return;
      const [ks, m] = await Promise.all([getDocs(collection(db, "groups", gid, "people", secret, "kids")), getDoc(doc(db, "groups", gid, "matches", secret))]);
      if (stopped || !m.exists()) return;
      const threads = threadsFor({ me: p.data(), kids: ks.docs.map(d => d.data()), match: m.data() });
      const counts = {};
      threads.forEach(th => subs.push(watchThread(gid, th.wishId, msgs => {
        counts[th.key] = unreadIn(msgs, th.role, lastRead(gid, th.key));
        cb(Object.values(counts).reduce((a, b) => a + b, 0));
      })));
    } catch (e) {}
  })();
  return () => { stopped = true; subs.forEach(u => u()); };
}

// "4:05 PM" today, "Dec 3, 4:05 PM" otherwise.
export function msgTime(ms){
  const d = new Date(ms), now = new Date();
  const time = d.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
  return d.toDateString() === now.toDateString() ? time : d.toLocaleDateString(locale, { month: "short", day: "numeric" }) + ", " + time;
}

// Conversation starters, shown while a chat is empty.
export const STARTERS = {
  santa: ["What size do you wear?", "Any allergies or things you can't use?", "Coffee, tea or hot chocolate?", "What's something you've wanted lately?"],
  giftee: ["Hi Santa! Ask me anything.", "Hint: I'm into…", "Thank you, Santa!"]
};

export { elfAvatar };
