import { DEFAULT_AGE_RULES } from "@/lib/gamification";
import type {
  Badge, InboxMessage, Lesson, LessonProgress, MailLog, Owner, OwnerSettings, Program, Quest, QuestProgress, UserProfile, XpEvent,
} from "@/types";

/**
 * Demo data: two owners (tenants), three programs, song-based lessons with quizzes and unlock rules, quests, badges, a few
 * learners with progress and one open message. Everything is fictional. The YouTube ids point at well-known children's songs;
 * an admin replaces them in Admin > Lessons when the owner licenses other media.
 */

const T0 = "2026-10-01T08:00:00.000Z";

export const OWNERS: Owner[] = [
  { id: "own_sunshine", code: "SUN", name: { th: "โรงเรียนอนุบาลซันไชน์", en: "Sunshine Kindergarten" }, contactEmail: "admin@sunshine.example.com", plan: "school", active: true, createdAt: T0 },
  { id: "own_bright", code: "BRT", name: { th: "สำนักพิมพ์ไบรท์คิดส์", en: "Bright Kids Publishing" }, contactEmail: "hello@brightkids.example.com", plan: "enterprise", active: true, createdAt: T0 },
];

export const PROGRAMS: Program[] = [
  {
    id: "prg_songs1", ownerId: "own_sunshine", level: "beginner", ageBands: [], color: "#f59f00", published: true, createdAt: T0,
    title: { th: "ร้องเพลงภาษาอังกฤษ ชุดที่ 1", en: "Sing-along English, Set 1" },
    description: { th: "เริ่มจาก Baby Shark แล้วปลดล็อกเพลงถัดไปเมื่อดูจบและตอบคำถามผ่าน", en: "Start with Baby Shark and unlock the next song by finishing each video and passing its quiz." },
  },
  {
    id: "prg_body", ownerId: "own_sunshine", level: "elementary", ageBands: ["6-8", "9-12"], color: "#2fb344", published: true, createdAt: T0,
    title: { th: "ร่างกายและการเคลื่อนไหว", en: "My Body in Motion" },
    description: { th: "เพลงและท่าทางเกี่ยวกับร่างกาย สำหรับ 6 ขวบขึ้นไป เปิดได้เมื่อถึงเลเวล 2", en: "Songs and actions about the body, for ages 6 and up. Opens at level 2." },
  },
  {
    id: "prg_phonics", ownerId: "own_bright", level: "beginner", ageBands: ["3-5", "6-8"], color: "#4c58c4", published: true, createdAt: T0,
    title: { th: "โฟนิกส์ A–Z", en: "Phonics A to Z" },
    description: { th: "เสียงตัวอักษรผ่านเพลง สำหรับผู้เรียนของไบรท์คิดส์", en: "Letter sounds through song, for Bright Kids learners." },
  },
];

const q = (id: string, th: string, en: string, choices: string[], answer: number) => ({ id, prompt: { th, en }, choices, answer });

export const LESSONS: Lesson[] = [
  {
    id: "les_babyshark", programId: "prg_songs1", order: 1, published: true, youtubeId: "XqZsoesa55w", durationSec: 136, xpReward: 50,
    title: { th: "Baby Shark", en: "Baby Shark" },
    summary: { th: "เพลงเปิดคอร์ส ร้องตามครอบครัวฉลาม แล้วตอบคำถาม 3 ข้อเพื่อปลดล็อกเพลงถัดไป", en: "The opening song. Sing along with the shark family, then answer 3 questions to unlock the next song." },
    vocabulary: ["baby", "mommy", "daddy", "grandma", "grandpa", "shark", "run away", "safe at last"],
    quiz: [
      q("q1", "ฉลามตัวเล็กที่สุดเรียกว่าอะไร", "Which shark is the smallest?", ["Daddy shark", "Baby shark", "Grandpa shark"], 1),
      q("q2", "คำว่า 'Mommy' หมายถึงใคร", "Who is 'Mommy'?", ["แม่ / mother", "พ่อ / father", "ย่า / grandmother"], 0),
      q("q3", "ตอนจบเพลงร้องว่าอะไร", "What do they sing at the end?", ["Let's go hunt", "Safe at last", "Run away"], 1),
    ],
    unlock: [],
  },
  {
    id: "les_wheels", programId: "prg_songs1", order: 2, published: true, youtubeId: "e_04ZrNroTo", durationSec: 165, xpReward: 50,
    title: { th: "The Wheels on the Bus", en: "The Wheels on the Bus" },
    summary: { th: "เปิดเมื่อจบ Baby Shark", en: "Opens after Baby Shark is complete." },
    vocabulary: ["wheels", "bus", "round and round", "wipers", "swish", "horn", "beep", "town"],
    quiz: [
      q("q1", "ล้อรถบัสหมุนอย่างไร", "How do the wheels go?", ["Up and down", "Round and round", "Swish swish"], 1),
      q("q2", "'Horn' ส่งเสียงว่าอะไร", "What sound does the horn make?", ["Beep beep", "Swish swish", "Wah wah"], 0),
    ],
    unlock: [{ type: "lesson_completed", lessonId: "les_babyshark" }],
  },
  {
    id: "les_abc", programId: "prg_songs1", order: 3, published: true, youtubeId: "75p-N9YKqNo", durationSec: 120, xpReward: 60,
    title: { th: "ABC Song", en: "ABC Song" },
    summary: { th: "เปิดเมื่อจบ The Wheels on the Bus และมี XP อย่างน้อย 100", en: "Opens after The Wheels on the Bus, with at least 100 XP." },
    vocabulary: ["A", "B", "C", "alphabet", "letters", "sing with me"],
    quiz: [
      q("q1", "ตัวอักษรตัวแรกคือ", "The first letter is", ["B", "A", "Z"], 1),
      q("q2", "'Z' เป็นตัวอักษรลำดับที่", "'Z' is letter number", ["24", "25", "26"], 2),
      q("q3", "มีตัวอักษรกี่ตัวในภาษาอังกฤษ", "How many letters are there?", ["24", "26", "28"], 1),
    ],
    unlock: [{ type: "lesson_completed", lessonId: "les_wheels" }, { type: "min_xp", xp: 100 }],
  },
  {
    id: "les_twinkle", programId: "prg_songs1", order: 4, published: true, youtubeId: "yCjJyiqpAuU", durationSec: 150, xpReward: 60,
    title: { th: "Twinkle Twinkle Little Star", en: "Twinkle Twinkle Little Star" },
    summary: { th: "เปิดเมื่อถึงเลเวล 3 และทำเควสต์ 'ดูวิดีโอ 3 คลิป' สำเร็จ", en: "Opens at level 3 once the quest 'Watch 3 videos' is done." },
    vocabulary: ["twinkle", "little", "star", "wonder", "high", "sky", "diamond"],
    quiz: [
      q("q1", "ดาวดวงน้อยอยู่ที่ไหน", "Where is the little star?", ["In the sea", "Up above the world", "On the bus"], 1),
      q("q2", "ดาวเหมือนอะไร", "The star is like a …", ["diamond", "shark", "wheel"], 0),
    ],
    unlock: [{ type: "min_level", level: 3 }, { type: "quest_completed", questId: "qst_watch3" }],
  },
  {
    id: "les_head", programId: "prg_body", order: 1, published: true, youtubeId: "h4eueDYPTIg", durationSec: 140, xpReward: 50,
    title: { th: "Head, Shoulders, Knees and Toes", en: "Head, Shoulders, Knees and Toes" },
    summary: { th: "โปรแกรมนี้เปิดเมื่อถึงเลเวล 2", en: "This program opens at level 2." },
    vocabulary: ["head", "shoulders", "knees", "toes", "eyes", "ears", "mouth", "nose"],
    quiz: [
      q("q1", "'Knees' คือส่วนไหนของร่างกาย", "'Knees' are …", ["หัวเข่า", "ไหล่", "นิ้วเท้า"], 0),
      q("q2", "เราใช้อะไรในการมองเห็น", "We see with our …", ["ears", "eyes", "nose"], 1),
    ],
    unlock: [{ type: "min_level", level: 2 }],
  },
  {
    id: "les_hokey", programId: "prg_body", order: 2, published: true, youtubeId: "iZinb6rVozc", durationSec: 180, xpReward: 60,
    title: { th: "Hokey Pokey", en: "Hokey Pokey" },
    summary: { th: "เปิดเมื่อจบ Head, Shoulders และมีสตรีค 2 วัน", en: "Opens after Head, Shoulders with a 2-day streak." },
    vocabulary: ["right hand", "left hand", "in", "out", "shake", "turn around"],
    quiz: [q("q1", "'Turn around' หมายถึง", "'Turn around' means", ["หมุนตัว", "กระโดด", "นั่งลง"], 0)],
    unlock: [{ type: "lesson_completed", lessonId: "les_head" }, { type: "streak_days", days: 2 }],
  },
  {
    id: "les_phonicsA", programId: "prg_phonics", order: 1, published: true, youtubeId: "BELlZKpi1Zs", durationSec: 200, xpReward: 50,
    title: { th: "Phonics Song A–Z", en: "Phonics Song A to Z" },
    summary: { th: "เสียงของตัวอักษรแต่ละตัว สำหรับอายุ 5 ขวบขึ้นไป", en: "The sound of each letter, for ages 5 and up." },
    vocabulary: ["apple", "ball", "cat", "dog", "elephant", "fish"],
    quiz: [q("q1", "'A' is for …", "'A' is for …", ["apple", "ball", "cat"], 0), q("q2", "'C' is for …", "'C' is for …", ["dog", "cat", "fish"], 1)],
    unlock: [{ type: "min_age", years: 5 }],
  },
];

export const BADGES: Badge[] = [
  { id: "bdg_first", name: { th: "ก้าวแรก", en: "First Step" }, description: { th: "ดูวิดีโอแรกจนจบ", en: "Finished the first video." }, icon: "play" },
  { id: "bdg_shark", name: { th: "เพื่อนฉลาม", en: "Shark Friend" }, description: { th: "ผ่าน Baby Shark แบบเต็มคะแนน", en: "Perfect score on Baby Shark." }, icon: "star" },
  { id: "bdg_streak3", name: { th: "สามวันติด", en: "3-Day Streak" }, description: { th: "เรียนต่อเนื่อง 3 วัน", en: "Learned 3 days in a row." }, icon: "flame" },
  { id: "bdg_quiz5", name: { th: "นักตอบ", en: "Quiz Whiz" }, description: { th: "ผ่านแบบทดสอบ 5 ครั้ง", en: "Passed 5 quizzes." }, icon: "checklist" },
];

export const QUESTS: Quest[] = [
  { id: "qst_daily1", ownerId: "own_sunshine", programId: null, scope: "daily", active: true, xpReward: 20, badgeId: null,
    title: { th: "ดูวิดีโอวันนี้ 1 คลิป", en: "Watch 1 video today" }, description: { th: "ดูวิดีโอใดก็ได้ให้ถึง 80 %", en: "Watch any video to 80 %." }, goal: { type: "watch_videos", target: 1 } },
  { id: "qst_watch3", ownerId: "own_sunshine", programId: null, scope: "weekly", active: true, xpReward: 60, badgeId: null,
    title: { th: "ดูวิดีโอ 3 คลิปในสัปดาห์นี้", en: "Watch 3 videos this week" }, description: { th: "ปลดล็อก Twinkle Twinkle", en: "Unlocks Twinkle Twinkle." }, goal: { type: "watch_videos", target: 3 } },
  { id: "qst_quiz5", ownerId: "own_sunshine", programId: null, scope: "program", active: true, xpReward: 100, badgeId: "bdg_quiz5",
    title: { th: "ผ่านแบบทดสอบ 5 ครั้ง", en: "Pass 5 quizzes" }, description: { th: "รวมทุกโปรแกรม", en: "Across every program." }, goal: { type: "pass_quizzes", target: 5 } },
  { id: "qst_streak3", ownerId: "own_sunshine", programId: null, scope: "program", active: true, xpReward: 40, badgeId: "bdg_streak3",
    title: { th: "เรียนต่อเนื่อง 3 วัน", en: "3 days in a row" }, description: { th: "เข้ามาเรียนทุกวันติดกัน 3 วัน", en: "Learn three days running." }, goal: { type: "streak_days", target: 3 } },
  { id: "qst_bright_daily", ownerId: "own_bright", programId: null, scope: "daily", active: true, xpReward: 20, badgeId: null,
    title: { th: "ฝึกโฟนิกส์วันละคลิป", en: "One phonics video a day" }, description: { th: "", en: "" }, goal: { type: "watch_videos", target: 1 } },
];

export const USERS: UserProfile[] = [
  { uid: "u_super", displayName: "Platform Admin", email: "super@ellp.example.com", role: "superadmin", ownerId: null, enrolledProgramIds: [], birthYear: null, allowAllAges: true, parentConsent: { acknowledged: false, at: null, note: "" }, xp: 0, streakDays: 0, lastActiveDate: null, badgeIds: [], avatarColor: "#182433", active: true, createdAt: T0 },
  { uid: "u_owner_sun", displayName: "คุณครูใหญ่ สมศรี", email: "principal@sunshine.example.com", role: "owner", ownerId: "own_sunshine", enrolledProgramIds: [], birthYear: null, allowAllAges: true, parentConsent: { acknowledged: false, at: null, note: "" }, xp: 0, streakDays: 0, lastActiveDate: null, badgeIds: [], avatarColor: "#b0566f", active: true, createdAt: T0 },
  { uid: "u_admin_ann", displayName: "Teacher Ann", email: "ann@sunshine.example.com", role: "admin", ownerId: "own_sunshine", enrolledProgramIds: [], birthYear: null, allowAllAges: true, parentConsent: { acknowledged: false, at: null, note: "" }, xp: 0, streakDays: 0, lastActiveDate: null, badgeIds: [], avatarColor: "#2f7f86", active: true, createdAt: T0 },
  { uid: "u_mint", displayName: "น้องมิ้นท์", email: "mint.parent@example.com", role: "learner", ownerId: "own_sunshine", enrolledProgramIds: ["prg_songs1", "prg_body"], birthYear: 2019, allowAllAges: false, parentConsent: { acknowledged: true, at: T0, note: "ผู้ปกครองรับทราบตอนสมัคร" }, xp: 130, streakDays: 2, lastActiveDate: null, badgeIds: ["bdg_first", "bdg_shark"], avatarColor: "#f59f00", active: true, createdAt: T0 },
  { uid: "u_tee", displayName: "น้องตี๋", email: "tee.parent@example.com", role: "learner", ownerId: "own_sunshine", enrolledProgramIds: ["prg_songs1"], birthYear: 2017, allowAllAges: false, parentConsent: { acknowledged: true, at: T0, note: "ผู้ปกครองรับทราบตอนสมัคร" }, xp: 320, streakDays: 5, lastActiveDate: null, badgeIds: ["bdg_first", "bdg_streak3"], avatarColor: "#4c58c4", active: true, createdAt: T0 },
  { uid: "u_fah", displayName: "น้องฟ้า", email: "fah.parent@example.com", role: "learner", ownerId: "own_sunshine", enrolledProgramIds: ["prg_songs1", "prg_body"], birthYear: 2016, allowAllAges: false, parentConsent: { acknowledged: true, at: T0, note: "ผู้ปกครองรับทราบตอนสมัคร" }, xp: 560, streakDays: 1, lastActiveDate: null, badgeIds: ["bdg_first"], avatarColor: "#2fb344", active: true, createdAt: T0 },
  { uid: "u_new", displayName: "Nong Pim (new)", email: "pim.parent@example.com", role: "learner", ownerId: "own_sunshine", enrolledProgramIds: ["prg_songs1"], birthYear: 2020, allowAllAges: false, parentConsent: { acknowledged: false, at: null, note: "" }, xp: 0, streakDays: 0, lastActiveDate: null, badgeIds: [], avatarColor: "#0b78a8", active: true, createdAt: T0 },
  { uid: "u_pukkie", displayName: "น้องปุ๊กกี้", email: "pukkie.parent@example.com", role: "learner", ownerId: "own_sunshine", enrolledProgramIds: ["prg_songs1"], birthYear: 2022, allowAllAges: false, parentConsent: { acknowledged: true, at: T0, note: "ผู้ปกครองรับทราบตอนสมัคร" }, xp: 40, streakDays: 1, lastActiveDate: null, badgeIds: [], avatarColor: "#b0566f", active: true, createdAt: T0 },
  { uid: "u_admin_bright", displayName: "Khun Bee", email: "bee@brightkids.example.com", role: "admin", ownerId: "own_bright", enrolledProgramIds: [], birthYear: null, allowAllAges: true, parentConsent: { acknowledged: false, at: null, note: "" }, xp: 0, streakDays: 0, lastActiveDate: null, badgeIds: [], avatarColor: "#a8612a", active: true, createdAt: T0 },
  { uid: "u_kao", displayName: "น้องข้าว", email: "kao.parent@example.com", role: "learner", ownerId: "own_bright", enrolledProgramIds: ["prg_phonics"], birthYear: 2021, allowAllAges: false, parentConsent: { acknowledged: true, at: T0, note: "ผู้ปกครองรับทราบตอนสมัคร" }, xp: 80, streakDays: 1, lastActiveDate: null, badgeIds: ["bdg_first"], avatarColor: "#6b5fb0", active: true, createdAt: T0 },
];

const P = (uid: string, lessonId: string, watchedPct: number, quizScore: number | null, quizTotal: number | null, completed: boolean): LessonProgress =>
  ({ uid, lessonId, watchedPct, completed, quizScore, quizTotal, completedAt: completed ? T0 : null, updatedAt: T0 });

export const PROGRESS: LessonProgress[] = [
  P("u_mint", "les_babyshark", 100, 3, 3, true),
  P("u_mint", "les_wheels", 45, null, null, false),
  P("u_tee", "les_babyshark", 100, 2, 3, true),
  P("u_tee", "les_wheels", 100, 2, 2, true),
  P("u_tee", "les_abc", 100, 3, 3, true),
  P("u_fah", "les_babyshark", 100, 3, 3, true),
  P("u_fah", "les_wheels", 100, 2, 2, true),
  P("u_fah", "les_abc", 100, 2, 3, true),
  P("u_fah", "les_head", 100, 2, 2, true),
  P("u_kao", "les_phonicsA", 100, 2, 2, true),
];

export const QUEST_PROGRESS: QuestProgress[] = [
  { uid: "u_tee", questId: "qst_streak3", periodKey: "all", progress: 5, completed: true, completedAt: T0 },
  { uid: "u_fah", questId: "qst_quiz5", periodKey: "all", progress: 4, completed: false, completedAt: null },
  { uid: "u_mint", questId: "qst_quiz5", periodKey: "all", progress: 1, completed: false, completedAt: null },
];

export const XP_EVENTS: XpEvent[] = [
  { id: "xe1", uid: "u_mint", ownerId: "own_sunshine", programId: "prg_songs1", kind: "video", xp: 50, note: "Baby Shark", at: T0 },
  { id: "xe2", uid: "u_mint", ownerId: "own_sunshine", programId: "prg_songs1", kind: "quiz", xp: 50, note: "Baby Shark quiz 3/3", at: T0 },
  { id: "xe3", uid: "u_mint", ownerId: "own_sunshine", programId: null, kind: "quest", xp: 20, note: "Watch 1 video today", at: T0 },
  { id: "xe4", uid: "u_mint", ownerId: "own_sunshine", programId: null, kind: "streak", xp: 10, note: "Day 2", at: T0 },
];

export const MESSAGES: InboxMessage[] = [
  {
    id: "msg_1", ownerId: "own_sunshine", fromUid: "u_mint", fromName: "น้องมิ้นท์ (ผู้ปกครอง)", fromEmail: "mint.parent@example.com",
    subject: "วิดีโอ Wheels on the Bus ไม่เปิด", body: "สวัสดีค่ะ ลูกดู Baby Shark จบแล้วแต่คลิปถัดไปยังล็อกอยู่ ต้องทำอย่างไรเพิ่มคะ", status: "open", createdAt: "2026-11-06T09:12:00.000Z", replies: [],
  },
  {
    id: "msg_2", ownerId: "own_sunshine", fromUid: "u_tee", fromName: "น้องตี๋ (ผู้ปกครอง)", fromEmail: "tee.parent@example.com",
    subject: "ขอเพลงเพิ่ม", body: "ลูกชอบมาก อยากได้เพลงเกี่ยวกับสัตว์เพิ่มครับ", status: "answered", createdAt: "2026-11-03T13:40:00.000Z",
    replies: [{ id: "rp_1", byUid: "u_admin_ann", byName: "Teacher Ann", body: "ขอบคุณค่ะ ชุดที่ 2 (Animals) จะเปิดเดือนหน้า จะแจ้งทางอีเมลนะคะ", at: "2026-11-03T15:02:00.000Z", mailId: "mail_1" }],
  },
];

export const MAIL_LOG: MailLog[] = [
  { id: "mail_1", ownerId: "own_sunshine", to: "tee.parent@example.com", subject: "Re: ขอเพลงเพิ่ม", body: "ขอบคุณค่ะ ชุดที่ 2 (Animals) จะเปิดเดือนหน้า จะแจ้งทางอีเมลนะคะ", status: "redirected", testMode: true, at: "2026-11-03T15:02:05.000Z" },
];

export const OWNER_SETTINGS: OwnerSettings[] = [
  { ownerId: "own_sunshine", email: { fromName: "Sunshine Kindergarten", fromAddress: "no-reply@sunshine.example.com", replyTo: "ann@sunshine.example.com", testMode: true, allowedRecipients: ["qa@sunshine.example.com"] }, leaderboard: { visible: true, size: 10 }, ageRules: { ...DEFAULT_AGE_RULES } },
  { ownerId: "own_bright", email: { fromName: "Bright Kids", fromAddress: "no-reply@brightkids.example.com", replyTo: "bee@brightkids.example.com", testMode: true, allowedRecipients: [] }, leaderboard: { visible: true, size: 10 }, ageRules: { ...DEFAULT_AGE_RULES } },
];

/** The accounts the demo sign-in pages offer. The password is the same for every demo account and is shown on the page. */
export const DEMO_PASSWORD = "ellp-demo";
export const DEMO_LEARNERS = ["u_mint", "u_tee", "u_fah", "u_new", "u_pukkie", "u_kao"];
export const DEMO_STAFF = ["u_super", "u_owner_sun", "u_admin_ann", "u_admin_bright"];
