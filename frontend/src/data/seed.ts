import { DEFAULT_AGE_RULES } from "@/lib/gamification";
import { DEFAULT_POLICY } from "@/lib/integrity";
import { DEFAULT_PRICING } from "@/lib/commerce";
import type {
  Badge, Certificate, ChatThread, MockAttempt, MockTest, Payment, InboxMessage, Lesson, LessonProgress, MailLog, Owner, OwnerSettings, Program, Quest, QuestProgress, UserProfile, XpEvent,
} from "@/types";

/**
 * Demo data: three owners (a kindergarten, a children's publisher and an exam-prep academy), programs across the tracks
 * (kids, school, TOEIC, IELTS, ก.พ., foundation), song lessons with quizzes and unlock rules, quests, badges, learners of
 * every age with progress, open messages and chats. Everything is fictional. The YouTube ids of the song lessons point at
 * well-known children's songs; the exam-track lessons have no video yet (an admin pastes the id, or 1.2 uploads a file).
 */

const T0 = "2026-10-01T08:00:00.000Z";

export const OWNERS: Owner[] = [
  { id: "own_sunshine", code: "SUN", name: { th: "โรงเรียนอนุบาลซันไชน์", en: "Sunshine Kindergarten" }, contactEmail: "admin@sunshine.example.com", plan: "school", active: true, createdAt: T0 },
  { id: "own_bright", code: "BRT", name: { th: "สำนักพิมพ์ไบรท์คิดส์", en: "Bright Kids Publishing" }, contactEmail: "hello@brightkids.example.com", plan: "enterprise", active: true, createdAt: T0 },
  { id: "own_pro", code: "EPA", name: { th: "สถาบันติวอิงลิชโปร", en: "English Pro Academy" }, contactEmail: "hello@englishpro.example.com", plan: "enterprise", active: true, createdAt: T0 },
];

export const PROGRAMS: Program[] = [
  {
    id: "prg_songs1", ownerId: "own_sunshine", track: "kids", cefr: "pre-A1", targetScore: "", plan: "free", proctoring: null, ageBands: [], color: "#f59f00", published: true, createdAt: T0,
    title: { th: "ร้องเพลงภาษาอังกฤษ ชุดที่ 1", en: "Sing-along English, Set 1" },
    description: { th: "เริ่มจาก Baby Shark แล้วปลดล็อกเพลงถัดไปเมื่อดูจบและตอบคำถามผ่าน", en: "Start with Baby Shark and unlock the next song by finishing each video and passing its quiz." },
  },
  {
    id: "prg_body", ownerId: "own_sunshine", track: "kids", cefr: "A1", targetScore: "", plan: "pro", proctoring: null, ageBands: ["6-8", "9-12"], color: "#2fb344", published: true, createdAt: T0,
    title: { th: "ร่างกายและการเคลื่อนไหว", en: "My Body in Motion" },
    description: { th: "เพลงและท่าทางเกี่ยวกับร่างกาย สำหรับ 6 ขวบขึ้นไป เปิดได้เมื่อถึงเลเวล 2 (แพ็กเกจ Pro)", en: "Songs and actions about the body, for ages 6 and up. Opens at level 2 (Pro plan)." },
  },
  {
    id: "prg_phonics", ownerId: "own_bright", track: "kids", cefr: "pre-A1", targetScore: "", plan: "free", proctoring: null, ageBands: ["3-5", "6-8"], color: "#4c58c4", published: true, createdAt: T0,
    title: { th: "โฟนิกส์ A–Z", en: "Phonics A to Z" },
    description: { th: "เสียงตัวอักษรผ่านเพลง สำหรับผู้เรียนของไบรท์คิดส์", en: "Letter sounds through song, for Bright Kids learners." },
  },
  {
    id: "prg_tgat", ownerId: "own_pro", track: "school", cefr: "B1", targetScore: "TGAT Eng 70+", plan: "pro", proctoring: null, ageBands: ["16-18", "18+"], color: "#0b78a8", published: true, createdAt: T0,
    title: { th: "ติวอังกฤษสอบเข้ามหาวิทยาลัย (TGAT / A-Level)", en: "University Entrance English (TGAT / A-Level)" },
    description: { th: "Reading, Vocabulary และ Error Identification ตามแนวข้อสอบจริง 2 บทแรกดูฟรี", en: "Reading, vocabulary and error identification in the exam's style. The first lesson is a free preview." },
  },
  {
    id: "prg_toeic", ownerId: "own_pro", track: "toeic", cefr: "B1", targetScore: "TOEIC 600+", plan: "pro", proctoring: null, ageBands: ["16-18", "18+"], color: "#2f7f86", published: true, createdAt: T0,
    title: { th: "TOEIC Listening & Reading 600+", en: "TOEIC Listening & Reading 600+" },
    description: { th: "เทคนิคทำข้อสอบทั้ง 7 Part พร้อมแบบฝึกจับเวลา", en: "Technique for all seven parts with timed drills." },
  },
  {
    id: "prg_ielts", ownerId: "own_pro", track: "ielts", cefr: "B2", targetScore: "IELTS 6.5", plan: "premium", proctoring: null, ageBands: ["16-18", "18+"], color: "#6b5fb0", published: true, createdAt: T0,
    title: { th: "IELTS Writing Task 2 สู่ Band 6.5", en: "IELTS Writing Task 2 to Band 6.5" },
    description: { th: "โครงสร้างเรียงความ คำเชื่อม และการให้คะแนนตามเกณฑ์จริง (Premium)", en: "Essay structure, cohesion and the real band descriptors (Premium)." },
  },
  {
    id: "prg_kpo", ownerId: "own_pro", track: "kpo", cefr: "A2", targetScore: "ก.พ. ภาค ก ผ่าน 60 %", plan: "pro", proctoring: null, ageBands: ["18+"], color: "#a8612a", published: true, createdAt: T0,
    title: { th: "ภาษาอังกฤษ ก.พ. ภาค ก", en: "Civil Service Exam (ก.พ.) English" },
    description: { th: "Conversation, Vocabulary, Structure และ Reading ตามแนวข้อสอบ ก.พ.", en: "Conversation, vocabulary, structure and reading in the ก.พ. exam's style." },
  },
  {
    id: "prg_found", ownerId: "own_pro", track: "foundation", cefr: "A1", targetScore: "", plan: "free", proctoring: null, ageBands: [], color: "#b0566f", published: true, createdAt: T0,
    title: { th: "ปรับพื้นฐานไวยากรณ์ A1", en: "Grammar Foundations A1" },
    description: { th: "เริ่มใหม่ตั้งแต่ Parts of speech, Tenses พื้นฐาน และประโยคในชีวิตประจำวัน ฟรีทุกบท", en: "Start over: parts of speech, basic tenses and everyday sentences. Every lesson free." },
  },
];

const q = (id: string, th: string, en: string, choices: string[], answer: number) => ({ id, prompt: { th, en }, choices, answer });

export const LESSONS: Lesson[] = [
  {
    id: "les_babyshark", programId: "prg_songs1", order: 1, published: true, youtubeId: "XqZsoesa55w", videoUrl: "", checkpoints: [], durationSec: 136, xpReward: 50,
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
    id: "les_wheels", programId: "prg_songs1", order: 2, published: true, youtubeId: "e_04ZrNroTo", videoUrl: "", checkpoints: [], durationSec: 165, xpReward: 50,
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
    id: "les_abc", programId: "prg_songs1", order: 3, published: true, youtubeId: "75p-N9YKqNo", videoUrl: "", checkpoints: [], durationSec: 120, xpReward: 60,
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
    id: "les_twinkle", programId: "prg_songs1", order: 4, published: true, youtubeId: "yCjJyiqpAuU", videoUrl: "", checkpoints: [], durationSec: 150, xpReward: 60,
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
    id: "les_head", programId: "prg_body", order: 1, published: true, youtubeId: "h4eueDYPTIg", videoUrl: "", checkpoints: [], durationSec: 140, xpReward: 50,
    title: { th: "Head, Shoulders, Knees and Toes", en: "Head, Shoulders, Knees and Toes" },
    summary: { th: "โปรแกรมนี้เปิดเมื่อถึงเลเวล 2 บทแรกดูฟรี", en: "This program opens at level 2. The first lesson is a free preview." },
    vocabulary: ["head", "shoulders", "knees", "toes", "eyes", "ears", "mouth", "nose"],
    quiz: [
      q("q1", "'Knees' คือส่วนไหนของร่างกาย", "'Knees' are …", ["หัวเข่า", "ไหล่", "นิ้วเท้า"], 0),
      q("q2", "เราใช้อะไรในการมองเห็น", "We see with our …", ["ears", "eyes", "nose"], 1),
    ],
    unlock: [{ type: "min_level", level: 2 }],
  },
  {
    id: "les_hokey", programId: "prg_body", order: 2, published: true, youtubeId: "iZinb6rVozc", videoUrl: "", checkpoints: [], durationSec: 180, xpReward: 60,
    title: { th: "Hokey Pokey", en: "Hokey Pokey" },
    summary: { th: "เปิดเมื่อจบ Head, Shoulders และมีสตรีค 2 วัน", en: "Opens after Head, Shoulders with a 2-day streak." },
    vocabulary: ["right hand", "left hand", "in", "out", "shake", "turn around"],
    quiz: [q("q1", "'Turn around' หมายถึง", "'Turn around' means", ["หมุนตัว", "กระโดด", "นั่งลง"], 0)],
    unlock: [{ type: "lesson_completed", lessonId: "les_head" }, { type: "streak_days", days: 2 }],
  },
  {
    id: "les_phonicsA", programId: "prg_phonics", order: 1, published: true, youtubeId: "BELlZKpi1Zs", videoUrl: "", checkpoints: [], durationSec: 200, xpReward: 50,
    title: { th: "Phonics Song A–Z", en: "Phonics Song A to Z" },
    summary: { th: "เสียงของตัวอักษรแต่ละตัว สำหรับอายุ 5 ขวบขึ้นไป", en: "The sound of each letter, for ages 5 and up." },
    vocabulary: ["apple", "ball", "cat", "dog", "elephant", "fish"],
    quiz: [q("q1", "'A' is for …", "'A' is for …", ["apple", "ball", "cat"], 0), q("q2", "'C' is for …", "'C' is for …", ["dog", "cat", "fish"], 1)],
    unlock: [{ type: "min_age", years: 5 }],
  },
  // ── exam tracks (no video yet: the admin pastes a YouTube id, or 1.2 uploads a file) ──
  {
    id: "les_tgat1", programId: "prg_tgat", order: 1, published: true, youtubeId: "", videoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", checkpoints: [{ id: "cp1", atSec: 2, prompt: { th: "คำถามกลางคลิป: วิดีโอนี้กำลังพูดถึงอะไร", en: "Checkpoint: what is this clip about?" }, choices: ["ดอกไม้ / a flower", "รถบัส / a bus", "ฉลาม / a shark"], answer: 0 }, { id: "cp2", atSec: 4, prompt: { th: "คำถามกลางคลิป: “bloom” แปลว่าอะไร", en: "Checkpoint: “bloom” means …" }, choices: ["เหี่ยว", "บาน", "ปลูก"], answer: 1 }], durationSec: 900, xpReward: 80,
    title: { th: "Reading: หาใจความสำคัญใน 90 วินาที", en: "Reading: the main idea in 90 seconds" },
    summary: { th: "บทแรกดูฟรี เทคนิค skim และ scan กับข้อสอบจริง 3 ข้อ", en: "Free preview. Skim and scan with three past-paper items." },
    vocabulary: ["main idea", "skim", "scan", "inference", "tone"],
    quiz: [q("q1", "'Skimming' คือการอ่านแบบใด", "'Skimming' means reading …", ["ทุกคำอย่างละเอียด", "เร็ว ๆ เพื่อจับใจความ", "เฉพาะย่อหน้าสุดท้าย"], 1), q("q2", "คำถาม 'The passage is mainly about…' ถามเรื่องใด", "'The passage is mainly about…' asks for the …", ["detail", "main idea", "tone"], 1)],
    unlock: [],
  },
  {
    id: "les_tgat2", programId: "prg_tgat", order: 2, published: true, youtubeId: "", videoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", checkpoints: [{ id: "cp1", atSec: 3, prompt: { th: "คำถามกลางคลิป: ตอบเพื่อดูต่อ", en: "Checkpoint: answer to continue" }, choices: ["A", "B", "C"], answer: 0 }], durationSec: 1200, xpReward: 80,
    title: { th: "Error Identification: 10 จุดที่ออกบ่อย", en: "Error identification: the ten usual suspects" },
    summary: { th: "Subject-verb agreement, tense, parallel structure (แพ็กเกจ Pro)", en: "Subject-verb agreement, tense, parallel structure (Pro plan)." },
    vocabulary: ["agreement", "parallel", "modifier", "pronoun reference"],
    quiz: [q("q1", "ข้อใดถูกต้อง", "Which is correct?", ["She don't like it", "She doesn't like it", "She not like it"], 1)],
    unlock: [{ type: "lesson_completed", lessonId: "les_tgat1" }],
  },
  {
    id: "les_toeic1", programId: "prg_toeic", order: 1, published: true, youtubeId: "", videoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", checkpoints: [{ id: "cp1", atSec: 2, prompt: { th: "คำถามกลางคลิป: วิดีโอนี้กำลังพูดถึงอะไร", en: "Checkpoint: what is this clip about?" }, choices: ["ดอกไม้ / a flower", "รถบัส / a bus", "ฉลาม / a shark"], answer: 0 }, { id: "cp2", atSec: 4, prompt: { th: "คำถามกลางคลิป: “bloom” แปลว่าอะไร", en: "Checkpoint: “bloom” means …" }, choices: ["เหี่ยว", "บาน", "ปลูก"], answer: 1 }], durationSec: 1100, xpReward: 80,
    title: { th: "Part 1–2: Photographs & Question-Response", en: "Parts 1–2: photographs and question-response" },
    summary: { th: "บทแรกดูฟรี ฟังจับคำสำคัญและตัดตัวเลือกลวง", en: "Free preview. Catch the key word, drop the distractors." },
    vocabulary: ["distractor", "similar sound", "wh-question", "yes/no"],
    quiz: [q("q1", "'Where is the meeting?' ตอบข้อใดเหมาะสม", "Best reply to 'Where is the meeting?'", ["At 3 p.m.", "In room 204", "Yes, it is"], 1)],
    unlock: [],
  },
  {
    id: "les_toeic2", programId: "prg_toeic", order: 2, published: true, youtubeId: "", videoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", checkpoints: [{ id: "cp1", atSec: 3, prompt: { th: "คำถามกลางคลิป: ตอบเพื่อดูต่อ", en: "Checkpoint: answer to continue" }, choices: ["A", "B", "C"], answer: 0 }], durationSec: 1300, xpReward: 90,
    title: { th: "Part 5: Incomplete Sentences ทำให้ทันใน 20 วินาที", en: "Part 5: incomplete sentences in 20 seconds each" },
    summary: { th: "Word form, preposition, conjunction (แพ็กเกจ Pro)", en: "Word form, preposition, conjunction (Pro plan)." },
    vocabulary: ["word form", "preposition", "conjunction", "collocation"],
    quiz: [q("q1", "The report was ___ submitted.", "The report was ___ submitted.", ["success", "successful", "successfully"], 2)],
    unlock: [{ type: "lesson_completed", lessonId: "les_toeic1" }],
  },
  {
    id: "les_ielts1", programId: "prg_ielts", order: 1, published: true, youtubeId: "", videoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", checkpoints: [{ id: "cp1", atSec: 2, prompt: { th: "คำถามกลางคลิป: วิดีโอนี้กำลังพูดถึงอะไร", en: "Checkpoint: what is this clip about?" }, choices: ["ดอกไม้ / a flower", "รถบัส / a bus", "ฉลาม / a shark"], answer: 0 }, { id: "cp2", atSec: 4, prompt: { th: "คำถามกลางคลิป: “bloom” แปลว่าอะไร", en: "Checkpoint: “bloom” means …" }, choices: ["เหี่ยว", "บาน", "ปลูก"], answer: 1 }], durationSec: 1500, xpReward: 100,
    title: { th: "Task 2: อ่านโจทย์ให้ออกใน 2 นาที", en: "Task 2: decode the question in two minutes" },
    summary: { th: "บทแรกดูฟรี แยก opinion / discussion / problem-solution", en: "Free preview. Opinion, discussion and problem-solution questions." },
    vocabulary: ["thesis", "cohesion", "band descriptor", "task response"],
    quiz: [q("q1", "'To what extent do you agree?' เป็นโจทย์แบบใด", "'To what extent do you agree?' is a(n) … question", ["discussion", "opinion", "problem-solution"], 1)],
    unlock: [],
  },
  {
    id: "les_ielts2", programId: "prg_ielts", order: 2, published: true, youtubeId: "", videoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", checkpoints: [{ id: "cp1", atSec: 3, prompt: { th: "คำถามกลางคลิป: ตอบเพื่อดูต่อ", en: "Checkpoint: answer to continue" }, choices: ["A", "B", "C"], answer: 0 }], durationSec: 1800, xpReward: 100,
    title: { th: "โครงสร้าง 4 ย่อหน้าและคำเชื่อมระดับ Band 7", en: "The four-paragraph structure and Band 7 linking" },
    summary: { th: "แพ็กเกจ Premium", en: "Premium plan." },
    vocabulary: ["furthermore", "nevertheless", "consequently", "whereas"],
    quiz: [q("q1", "คำเชื่อมใดแสดงความขัดแย้ง", "Which linker shows contrast?", ["furthermore", "nevertheless", "consequently"], 1)],
    unlock: [{ type: "lesson_completed", lessonId: "les_ielts1" }],
  },
  {
    id: "les_kpo1", programId: "prg_kpo", order: 1, published: true, youtubeId: "", videoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", checkpoints: [{ id: "cp1", atSec: 2, prompt: { th: "คำถามกลางคลิป: วิดีโอนี้กำลังพูดถึงอะไร", en: "Checkpoint: what is this clip about?" }, choices: ["ดอกไม้ / a flower", "รถบัส / a bus", "ฉลาม / a shark"], answer: 0 }, { id: "cp2", atSec: 4, prompt: { th: "คำถามกลางคลิป: “bloom” แปลว่าอะไร", en: "Checkpoint: “bloom” means …" }, choices: ["เหี่ยว", "บาน", "ปลูก"], answer: 1 }], durationSec: 1000, xpReward: 80,
    title: { th: "Conversation: สำนวนที่ออกสอบทุกปี", en: "Conversation: the expressions that appear every year" },
    summary: { th: "บทแรกดูฟรี", en: "Free preview." },
    vocabulary: ["How about…?", "I'd rather", "Would you mind…?", "No problem"],
    quiz: [q("q1", "'Would you mind opening the window?' ตอบรับว่าอย่างไร", "To agree to 'Would you mind opening the window?' say …", ["Yes, I would", "Not at all", "No, thanks"], 1)],
    unlock: [],
  },
  {
    id: "les_kpo2", programId: "prg_kpo", order: 2, published: true, youtubeId: "", videoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", checkpoints: [{ id: "cp1", atSec: 3, prompt: { th: "คำถามกลางคลิป: ตอบเพื่อดูต่อ", en: "Checkpoint: answer to continue" }, choices: ["A", "B", "C"], answer: 0 }], durationSec: 1200, xpReward: 80,
    title: { th: "Structure: Tense และ Passive ที่ต้องแม่น", en: "Structure: the tenses and passives you must know" },
    summary: { th: "แพ็กเกจ Pro", en: "Pro plan." },
    vocabulary: ["present perfect", "passive voice", "conditional"],
    quiz: [q("q1", "The letter ___ yesterday.", "The letter ___ yesterday.", ["is sent", "was sent", "has sent"], 1)],
    unlock: [{ type: "lesson_completed", lessonId: "les_kpo1" }],
  },
  {
    id: "les_found1", programId: "prg_found", order: 1, published: true, youtubeId: "", videoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", checkpoints: [{ id: "cp1", atSec: 2, prompt: { th: "คำถามกลางคลิป: วิดีโอนี้กำลังพูดถึงอะไร", en: "Checkpoint: what is this clip about?" }, choices: ["ดอกไม้ / a flower", "รถบัส / a bus", "ฉลาม / a shark"], answer: 0 }, { id: "cp2", atSec: 4, prompt: { th: "คำถามกลางคลิป: “bloom” แปลว่าอะไร", en: "Checkpoint: “bloom” means …" }, choices: ["เหี่ยว", "บาน", "ปลูก"], answer: 1 }], durationSec: 800, xpReward: 50,
    title: { th: "Parts of speech ใน 10 นาที", en: "Parts of speech in ten minutes" },
    summary: { th: "ฟรี", en: "Free." },
    vocabulary: ["noun", "verb", "adjective", "adverb"],
    quiz: [q("q1", "'quickly' เป็นคำชนิดใด", "'quickly' is a(n) …", ["noun", "adjective", "adverb"], 2)],
    unlock: [],
  },
  {
    id: "les_found2", programId: "prg_found", order: 2, published: true, youtubeId: "", videoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", checkpoints: [{ id: "cp1", atSec: 3, prompt: { th: "คำถามกลางคลิป: ตอบเพื่อดูต่อ", en: "Checkpoint: answer to continue" }, choices: ["A", "B", "C"], answer: 0 }], durationSec: 900, xpReward: 50,
    title: { th: "Present Simple กับชีวิตประจำวัน", en: "Present simple and daily life" },
    summary: { th: "ฟรี เปิดเมื่อจบบทแรก", en: "Free. Opens after the first lesson." },
    vocabulary: ["every day", "usually", "always", "never"],
    quiz: [q("q1", "She ___ to work by bus.", "She ___ to work by bus.", ["go", "goes", "going"], 1)],
    unlock: [{ type: "lesson_completed", lessonId: "les_found1" }],
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
  { id: "qst_pro_daily", ownerId: "own_pro", programId: null, scope: "daily", active: true, xpReward: 30, badgeId: null,
    title: { th: "ติววันละบท", en: "One lesson a day" }, description: { th: "ดูบทเรียนใดก็ได้ให้จบ", en: "Finish any lesson's video." }, goal: { type: "watch_videos", target: 1 } },
  { id: "qst_pro_quiz", ownerId: "own_pro", programId: null, scope: "weekly", active: true, xpReward: 80, badgeId: null,
    title: { th: "ผ่านแบบทดสอบ 3 ครั้งในสัปดาห์นี้", en: "Pass 3 quizzes this week" }, description: { th: "", en: "" }, goal: { type: "pass_quizzes", target: 3 } },
];

const NO_PLAN = { plan: "free" as const, planStatus: "active" as const, planTrack: null, planNote: "", planRequestedAt: null, planExpiresAt: null };
const NO_CONSENT = { acknowledged: false, at: null as string | null, note: "" };
const ACK = { acknowledged: true, at: T0 as string | null, note: "ผู้ปกครองรับทราบตอนสมัคร" };
const staff = (uid: string, name: string, email: string, role: UserProfile["role"], ownerId: string | null, color: string): UserProfile => ({
  uid, displayName: name, email, role, ownerId, enrolledProgramIds: [], birthYear: null, track: null, allowAllAges: true, parentConsent: NO_CONSENT, ...NO_PLAN,
  xp: 0, streakDays: 0, lastActiveDate: null, badgeIds: [], avatarColor: color, active: true, createdAt: T0,
});

export const USERS: UserProfile[] = [
  staff("u_super", "Platform Admin", "super@ellp.example.com", "superadmin", null, "#182433"),
  staff("u_owner_sun", "คุณครูใหญ่ สมศรี", "principal@sunshine.example.com", "owner", "own_sunshine", "#b0566f"),
  staff("u_admin_ann", "Teacher Ann", "ann@sunshine.example.com", "admin", "own_sunshine", "#2f7f86"),
  staff("u_admin_bright", "Khun Bee", "bee@brightkids.example.com", "admin", "own_bright", "#a8612a"),
  staff("u_admin_pro", "ครูเบนซ์", "benz@englishpro.example.com", "admin", "own_pro", "#0b78a8"),
  // kids (Sunshine)
  { uid: "u_mint", displayName: "น้องมิ้นท์", email: "mint.parent@example.com", role: "learner", ownerId: "own_sunshine", enrolledProgramIds: ["prg_songs1", "prg_body"], birthYear: 2019, track: "kids", allowAllAges: false, parentConsent: ACK, plan: "pro", planStatus: "active", planTrack: "kids", planNote: "โอนแล้ว 1 ต.ค.", planRequestedAt: T0, planExpiresAt: "2026-12-01T00:00:00.000Z", xp: 130, streakDays: 2, lastActiveDate: null, badgeIds: ["bdg_first", "bdg_shark"], avatarColor: "#f59f00", active: true, createdAt: T0 },
  { uid: "u_tee", displayName: "น้องตี๋", email: "tee.parent@example.com", role: "learner", ownerId: "own_sunshine", enrolledProgramIds: ["prg_songs1"], birthYear: 2017, track: "kids", allowAllAges: false, parentConsent: ACK, ...NO_PLAN, xp: 320, streakDays: 5, lastActiveDate: null, badgeIds: ["bdg_first", "bdg_streak3"], avatarColor: "#4c58c4", active: true, createdAt: T0 },
  { uid: "u_fah", displayName: "น้องฟ้า", email: "fah.parent@example.com", role: "learner", ownerId: "own_sunshine", enrolledProgramIds: ["prg_songs1", "prg_body"], birthYear: 2016, track: "kids", allowAllAges: false, parentConsent: ACK, plan: "premium", planStatus: "active", planTrack: null, planNote: "", planRequestedAt: T0, planExpiresAt: "2027-01-01T00:00:00.000Z", xp: 560, streakDays: 1, lastActiveDate: null, badgeIds: ["bdg_first"], avatarColor: "#2fb344", active: true, createdAt: T0 },
  { uid: "u_new", displayName: "Nong Pim (new)", email: "pim.parent@example.com", role: "learner", ownerId: "own_sunshine", enrolledProgramIds: ["prg_songs1"], birthYear: 2020, track: "kids", allowAllAges: false, parentConsent: NO_CONSENT, ...NO_PLAN, xp: 0, streakDays: 0, lastActiveDate: null, badgeIds: [], avatarColor: "#0b78a8", active: true, createdAt: T0 },
  { uid: "u_pukkie", displayName: "น้องปุ๊กกี้", email: "pukkie.parent@example.com", role: "learner", ownerId: "own_sunshine", enrolledProgramIds: ["prg_songs1"], birthYear: 2022, track: "kids", allowAllAges: false, parentConsent: ACK, ...NO_PLAN, xp: 40, streakDays: 1, lastActiveDate: null, badgeIds: [], avatarColor: "#b0566f", active: true, createdAt: T0 },
  // Bright Kids
  { uid: "u_kao", displayName: "น้องข้าว", email: "kao.parent@example.com", role: "learner", ownerId: "own_bright", enrolledProgramIds: ["prg_phonics"], birthYear: 2021, track: "kids", allowAllAges: false, parentConsent: ACK, ...NO_PLAN, xp: 80, streakDays: 1, lastActiveDate: null, badgeIds: ["bdg_first"], avatarColor: "#6b5fb0", active: true, createdAt: T0 },
  // English Pro Academy (teens and adults)
  { uid: "u_ploy", displayName: "น้องพลอย ม.6", email: "ploy@example.com", role: "learner", ownerId: "own_pro", enrolledProgramIds: ["prg_tgat", "prg_found"], birthYear: 2009, track: "school", allowAllAges: false, parentConsent: ACK, ...NO_PLAN, xp: 80, streakDays: 1, lastActiveDate: null, badgeIds: ["bdg_first"], avatarColor: "#0b78a8", active: true, createdAt: T0 },
  { uid: "u_jay", displayName: "คุณเจ", email: "jay@example.com", role: "learner", ownerId: "own_pro", enrolledProgramIds: ["prg_toeic"], birthYear: 1998, track: "toeic", allowAllAges: false, parentConsent: NO_CONSENT, plan: "pro", planStatus: "pending", planTrack: "toeic", planNote: "โอน 1,290 บาท 7 พ.ย. 20:15 สลิปส่งทางแชทแล้ว", planRequestedAt: "2026-11-07T13:20:00.000Z", planExpiresAt: null, xp: 80, streakDays: 1, lastActiveDate: null, badgeIds: ["bdg_first"], avatarColor: "#2f7f86", active: true, createdAt: "2026-11-07T13:00:00.000Z" },
  { uid: "u_ann2", displayName: "คุณแอน", email: "ann.k@example.com", role: "learner", ownerId: "own_pro", enrolledProgramIds: ["prg_kpo", "prg_ielts"], birthYear: 1995, track: "kpo", allowAllAges: false, parentConsent: NO_CONSENT, plan: "premium", planStatus: "active", planTrack: null, planNote: "", planRequestedAt: T0, planExpiresAt: "2026-11-14T00:00:00.000Z", xp: 260, streakDays: 3, lastActiveDate: null, badgeIds: ["bdg_first"], avatarColor: "#a8612a", active: true, createdAt: T0 },
];

const P = (uid: string, lessonId: string, watchedPct: number, quizScore: number | null, quizTotal: number | null, completed: boolean): LessonProgress =>
  ({ uid, lessonId, watchedPct, completed, quizScore, quizTotal, completedAt: completed ? T0 : null, updatedAt: T0, watchedSec: Math.round(watchedPct * 1.2), lastPositionSec: Math.round(watchedPct * 1.2), replays: completed ? 1 : 0, checkpointResults: {}, pausedUntil: null });

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
  P("u_ploy", "les_tgat1", 100, 2, 2, true),
  P("u_jay", "les_toeic1", 100, 1, 1, true),
  P("u_ann2", "les_kpo1", 100, 1, 1, true),
  P("u_ann2", "les_kpo2", 100, 1, 1, true),
  P("u_ann2", "les_ielts1", 60, null, null, false),
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
  { id: "xe5", uid: "u_jay", ownerId: "own_pro", programId: "prg_toeic", kind: "video", xp: 80, note: "Parts 1–2", at: "2026-11-07T14:00:00.000Z" },
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

export const CHATS: ChatThread[] = [
  {
    id: "chat_1", ownerId: "own_pro", uid: "u_jay", visitorKey: null, name: "คุณเจ", email: "jay@example.com", status: "open", linkedUid: null,
    createdAt: "2026-11-07T13:10:00.000Z", updatedAt: "2026-11-07T13:25:00.000Z",
    messages: [
      { id: "cm1", from: "visitor", byName: "คุณเจ", text: "สวัสดีครับ สนใจคอร์ส TOEIC 600+ สมัคร Pro ต้องทำอย่างไรครับ", at: "2026-11-07T13:10:00.000Z" },
      { id: "cm2", from: "admin", byName: "ครูเบนซ์", text: "สวัสดีค่ะ สมัครบัญชีฟรีก่อน แล้วกดขอแพ็กเกจ Pro เลือก Track TOEIC โอน 1,290 บาทตามเลขบัญชีในหน้าแพ็กเกจ แล้วส่งสลิปในแชทนี้ได้เลยค่ะ", at: "2026-11-07T13:12:00.000Z" },
      { id: "cm3", from: "visitor", byName: "คุณเจ", text: "โอนแล้วครับ 20:15 ส่งสลิปแล้วนะครับ", at: "2026-11-07T13:25:00.000Z" },
    ],
  },
  {
    id: "chat_2", ownerId: "own_pro", uid: null, visitorKey: "v_demo_visitor", name: "คุณนุ่น", email: "noon@example.com", status: "open", linkedUid: null,
    createdAt: "2026-11-08T08:00:00.000Z", updatedAt: "2026-11-08T08:00:00.000Z",
    messages: [{ id: "cm4", from: "visitor", byName: "คุณนุ่น", text: "อยากปรับพื้นฐานก่อนสอบ ก.พ. ปีหน้า ควรเริ่มคอร์สไหนดีคะ", at: "2026-11-08T08:00:00.000Z" }],
  },
];

export const OWNER_SETTINGS: OwnerSettings[] = [
  { ownerId: "own_sunshine", email: { fromName: "Sunshine Kindergarten", fromAddress: "no-reply@sunshine.example.com", replyTo: "ann@sunshine.example.com", testMode: true, allowedRecipients: ["qa@sunshine.example.com"] }, leaderboard: { visible: true, size: 10 }, ageRules: { ...DEFAULT_AGE_RULES }, lineUrl: "https://line.me/R/ti/p/@sunshine-demo", paymentInstructions: { th: "โอนเข้าบัญชีโรงเรียน (ตัวอย่าง) 123-4-56789-0 แล้วแนบเลขอ้างอิงในช่องหมายเหตุ", en: "Transfer to the school account (sample) 123-4-56789-0 and put the reference in the note." }, integrity: { ...DEFAULT_POLICY }, pricing: { ...DEFAULT_PRICING }, paymentProvider: "demo" },
  { ownerId: "own_bright", email: { fromName: "Bright Kids", fromAddress: "no-reply@brightkids.example.com", replyTo: "bee@brightkids.example.com", testMode: true, allowedRecipients: [] }, leaderboard: { visible: true, size: 10 }, ageRules: { ...DEFAULT_AGE_RULES }, lineUrl: "", paymentInstructions: { th: "", en: "" }, integrity: { ...DEFAULT_POLICY }, pricing: { ...DEFAULT_PRICING }, paymentProvider: "demo" },
  { ownerId: "own_pro", email: { fromName: "English Pro Academy", fromAddress: "no-reply@englishpro.example.com", replyTo: "benz@englishpro.example.com", testMode: true, allowedRecipients: [] }, leaderboard: { visible: true, size: 20 }, ageRules: { ...DEFAULT_AGE_RULES }, lineUrl: "https://line.me/R/ti/p/@englishpro-demo", paymentInstructions: { th: "Pro 1,290 บาท/เดือน · Premium 2,490 บาท/เดือน (ตัวอย่าง) โอนเข้า ธ.ตัวอย่าง 987-6-54321-0 แล้วส่งสลิปในแชทหรือใส่เลขอ้างอิงในหมายเหตุ", en: "Pro 1,290 THB/month · Premium 2,490 THB/month (sample). Transfer to Sample Bank 987-6-54321-0 and send the slip in the chat or put the reference in the note." }, integrity: { ...DEFAULT_POLICY }, pricing: { ...DEFAULT_PRICING }, paymentProvider: "demo" },
];


export const PAYMENTS: Payment[] = [
  { id: "pay_1", uid: "u_ann2", ownerId: "own_pro", plan: "premium", planTrack: null, amount: 2490, currency: "THB", months: 1, method: "promptpay", provider: "demo", status: "paid", reference: "chrg_demo_0001", qrPayload: null, receiptNo: "EPA-2026-0001", note: "", createdAt: "2026-10-14T09:00:00.000Z", paidAt: "2026-10-14T09:02:00.000Z" },
  { id: "pay_2", uid: "u_jay", ownerId: "own_pro", plan: "pro", planTrack: "toeic", amount: 1290, currency: "THB", months: 1, method: "transfer", provider: "manual", status: "pending", reference: "โอน 7 พ.ย. 20:15", qrPayload: null, receiptNo: null, note: "สลิปส่งทางแชทแล้ว", createdAt: "2026-11-07T13:20:00.000Z", paidAt: null },
  { id: "pay_3", uid: "u_mint", ownerId: "own_sunshine", plan: "pro", planTrack: "kids", amount: 1290, currency: "THB", months: 1, method: "transfer", provider: "manual", status: "paid", reference: "โอน 1 ต.ค.", qrPayload: null, receiptNo: "SUN-2026-0001", note: "", createdAt: "2026-10-01T08:00:00.000Z", paidAt: "2026-10-01T10:00:00.000Z" },
];

export const CERTIFICATES: Certificate[] = [
  { id: "cert_1", code: "ELLP-7K3M-QX2P", uid: "u_ann2", learnerName: "คุณแอน", ownerId: "own_pro", ownerName: { th: "สถาบันติวอิงลิชโปร", en: "English Pro Academy" }, programId: "prg_kpo", programTitle: { th: "ภาษาอังกฤษ ก.พ. ภาค ก", en: "Civil Service Exam (ก.พ.) English" }, track: "kpo", cefr: "A2", lessons: 2, xpEarned: 160, issuedAt: "2026-11-01T10:00:00.000Z" },
];

const mq = (id: string, th: string, en: string, choices: string[], answer: number) => ({ id, prompt: { th, en }, choices, answer });

export const MOCK_TESTS: MockTest[] = [
  {
    id: "mock_toeic_mini", ownerId: "own_pro", track: "toeic", durationMin: 10, scoring: "toeic", passMark: 600, requiredPlan: "premium", published: true,
    title: { th: "TOEIC Mini Test (Listening + Reading)", en: "TOEIC Mini Test (Listening + Reading)" },
    description: { th: "6 ข้อ 10 นาที คะแนนเทียบสเกล 10–990 โดยประมาณ", en: "6 items in 10 minutes, scaled to the 10–990 range (approximate)." },
    sections: [
      { id: "s1", title: { th: "Part 2: Question–Response", en: "Part 2: Question–Response" }, questions: [
        mq("q1", "\"When does the meeting start?\"", "\"When does the meeting start?\"", ["In room 204", "At nine o'clock", "Yes, it does"], 1),
        mq("q2", "\"Could you send me the report?\"", "\"Could you send me the report?\"", ["Sure, right away", "It was yesterday", "On the second floor"], 0),
        mq("q3", "\"Who is leading the project?\"", "\"Who is leading the project?\"", ["Next Monday", "Ms. Tanaka is", "About two weeks"], 1),
      ] },
      { id: "s2", title: { th: "Part 5: Incomplete Sentences", en: "Part 5: Incomplete Sentences" }, questions: [
        mq("q4", "The invoice must be paid ___ 30 days.", "The invoice must be paid ___ 30 days.", ["within", "until", "since"], 0),
        mq("q5", "Our sales ___ by 12 % last quarter.", "Our sales ___ by 12 % last quarter.", ["rise", "rose", "risen"], 1),
        mq("q6", "Please review the ___ document before signing.", "Please review the ___ document before signing.", ["attach", "attaching", "attached"], 2),
      ] },
    ],
  },
  {
    id: "mock_ielts_mini", ownerId: "own_pro", track: "ielts", durationMin: 8, scoring: "ielts", passMark: 6.5, requiredPlan: "premium", published: true,
    title: { th: "IELTS Reading Mini (True/False/Not Given)", en: "IELTS Reading Mini (True/False/Not Given)" },
    description: { th: "4 ข้อ 8 นาที ประเมินเป็น Band โดยประมาณ", en: "4 items in 8 minutes, estimated as a band." },
    sections: [{ id: "s1", title: { th: "Passage: Urban bees", en: "Passage: Urban bees" }, questions: [
      mq("q1", "Bees in cities produce more honey than rural bees. (ตามบทความ)", "Bees in cities produce more honey than rural bees.", ["True", "False", "Not Given"], 0),
      mq("q2", "Pesticide use is lower in cities.", "Pesticide use is lower in cities.", ["True", "False", "Not Given"], 0),
      mq("q3", "Most beekeepers in London are over 60.", "Most beekeepers in London are over 60.", ["True", "False", "Not Given"], 2),
      mq("q4", "The author recommends banning rooftop hives.", "The author recommends banning rooftop hives.", ["True", "False", "Not Given"], 1),
    ] }],
  },
  {
    id: "mock_kpo_mini", ownerId: "own_pro", track: "kpo", durationMin: 6, scoring: "percent", passMark: 60, requiredPlan: "premium", published: true,
    title: { th: "ก.พ. ภาค ก ภาษาอังกฤษ (ชุดสั้น)", en: "Civil service English (short set)" },
    description: { th: "5 ข้อ 6 นาที ผ่านที่ 60 % เหมือนเกณฑ์จริง", en: "5 items in 6 minutes; 60 % passes, like the real exam." },
    sections: [{ id: "s1", title: { th: "Conversation & Structure", en: "Conversation & Structure" }, questions: [
      mq("q1", "A: \"Would you like some coffee?\" B: \"___\"", "A: \"Would you like some coffee?\" B: \"___\"", ["Yes, please.", "Yes, I like.", "No, I don't like coffee very."], 0),
      mq("q2", "She has lived here ___ 2019.", "She has lived here ___ 2019.", ["for", "since", "from"], 1),
      mq("q3", "The documents ___ by the committee yesterday.", "The documents ___ by the committee yesterday.", ["approved", "were approved", "have approved"], 1),
      mq("q4", "\"How about joining us?\" means …", "\"How about joining us?\" means …", ["an invitation", "a complaint", "an apology"], 0),
      mq("q5", "If I ___ you, I would apply.", "If I ___ you, I would apply.", ["am", "was", "were"], 2),
    ] }],
  },
];

export const MOCK_ATTEMPTS: MockAttempt[] = [
  { id: "att_1", uid: "u_ann2", testId: "mock_kpo_mini", ownerId: "own_pro", startedAt: "2026-11-02T10:00:00.000Z", submittedAt: "2026-11-02T10:05:00.000Z", answers: { q1: 0, q2: 1, q3: 1, q4: 0, q5: 1 }, raw: 4, total: 5, sectionScores: [{ sectionId: "s1", raw: 4, total: 5 }], scaled: 80, scaledLabel: "80 %", passed: true, timedOut: false },
];

/** The accounts the demo sign-in pages offer. The password is the same for every seeded account and is shown on the page. */
export const DEMO_PASSWORD = "ellp-demo";
export const DEMO_LEARNERS = ["u_mint", "u_pukkie", "u_new", "u_ploy", "u_jay", "u_ann2"];
export const DEMO_STAFF = ["u_super", "u_owner_sun", "u_admin_ann", "u_admin_pro"];
