using Ellp.Api.Shared;

namespace Ellp.Api.Shared.Data;

/// <summary>
/// The fictional seed for the in-memory store: a subset of frontend/src/data/seed.ts (same ids, so a frontend built in demo
/// mode and one pointed at this API tell the same story). Nothing here describes a real person or school.
/// </summary>
public static class SeedData
{
    private const string T0 = "2026-10-01T08:00:00.000Z";

    public static readonly List<Owner> Owners = new()
    {
        new() { Id = "own_sunshine", Code = "SUN", Name = new("โรงเรียนอนุบาลซันไชน์", "Sunshine Kindergarten"), ContactEmail = "admin@sunshine.example.com", Plan = "school", Active = true, CreatedAt = T0 },
        new() { Id = "own_bright", Code = "BRT", Name = new("สำนักพิมพ์ไบรท์คิดส์", "Bright Kids Publishing"), ContactEmail = "hello@brightkids.example.com", Plan = "enterprise", Active = true, CreatedAt = T0 },
        new() { Id = "own_pro", Code = "EPA", Name = new("สถาบันติวอิงลิชโปร", "English Pro Academy"), ContactEmail = "hello@englishpro.example.com", Plan = "enterprise", Active = true, CreatedAt = T0 },
    };

    public static readonly List<LearningProgram> Programs = new()
    {
        new() { Id = "prg_songs1", OwnerId = "own_sunshine", Track = "kids", Cefr = "pre-A1", Plan = "free", Color = "#f59f00", Published = true, CreatedAt = T0, Title = new("ร้องเพลงภาษาอังกฤษ ชุดที่ 1", "Sing-along English, Set 1"), Description = new("เริ่มจาก Baby Shark แล้วปลดล็อกเพลงถัดไปเมื่อดูจบและตอบคำถามผ่าน", "Start with Baby Shark and unlock the next song by finishing each video and passing its quiz.") },
        new() { Id = "prg_body", OwnerId = "own_sunshine", Track = "kids", Cefr = "A1", Plan = "pro", AgeBands = new() { "6-8", "9-12" }, Color = "#2fb344", Published = true, CreatedAt = T0, Title = new("ร่างกายและการเคลื่อนไหว", "My Body in Motion"), Description = new("เพลงและท่าทางเกี่ยวกับร่างกาย เปิดได้เมื่อถึงเลเวล 2", "Songs and actions about the body. Opens at level 2.") },
        new() { Id = "prg_phonics", OwnerId = "own_bright", Track = "kids", Cefr = "pre-A1", Plan = "free", AgeBands = new() { "3-5", "6-8" }, Color = "#4c58c4", Published = true, CreatedAt = T0, Title = new("โฟนิกส์ A–Z", "Phonics A to Z"), Description = new("เสียงตัวอักษรผ่านเพลง", "Letter sounds through song.") },
        new() { Id = "prg_tgat", OwnerId = "own_pro", Track = "school", Cefr = "B1", TargetScore = "TGAT Eng 70+", Plan = "pro", AgeBands = new() { "16-18", "18+" }, Color = "#0b78a8", Published = true, CreatedAt = T0, Title = new("ติวอังกฤษสอบเข้ามหาวิทยาลัย (TGAT / A-Level)", "University Entrance English (TGAT / A-Level)"), Description = new("Reading, Vocabulary, Error Identification", "Reading, vocabulary and error identification.") },
        new() { Id = "prg_toeic", OwnerId = "own_pro", Track = "toeic", Cefr = "B1", TargetScore = "TOEIC 600+", Plan = "pro", AgeBands = new() { "16-18", "18+" }, Color = "#2f7f86", Published = true, CreatedAt = T0, Title = new("TOEIC Listening & Reading 600+", "TOEIC Listening & Reading 600+"), Description = new("เทคนิคทำข้อสอบทั้ง 7 Part", "Technique for all seven parts.") },
        new() { Id = "prg_ielts", OwnerId = "own_pro", Track = "ielts", Cefr = "B2", TargetScore = "IELTS 6.5", Plan = "premium", AgeBands = new() { "16-18", "18+" }, Color = "#6b5fb0", Published = true, CreatedAt = T0, Title = new("IELTS Writing Task 2 สู่ Band 6.5", "IELTS Writing Task 2 to Band 6.5"), Description = new("Premium", "Premium.") },
        new() { Id = "prg_kpo", OwnerId = "own_pro", Track = "kpo", Cefr = "A2", TargetScore = "ก.พ. ภาค ก", Plan = "pro", AgeBands = new() { "18+" }, Color = "#a8612a", Published = true, CreatedAt = T0, Title = new("ภาษาอังกฤษ ก.พ. ภาค ก", "Civil Service Exam (ก.พ.) English"), Description = new("ตามแนวข้อสอบ ก.พ.", "In the ก.พ. exam's style.") },
        new() { Id = "prg_found", OwnerId = "own_pro", Track = "foundation", Cefr = "A1", Plan = "free", Color = "#b0566f", Published = true, CreatedAt = T0, Title = new("ปรับพื้นฐานไวยากรณ์ A1", "Grammar Foundations A1"), Description = new("ฟรีทุกบท", "Every lesson free.") },
    };

    private static QuizQuestion Q(string id, string th, string en, string[] choices, int answer) => new() { Id = id, Prompt = new(th, en), Choices = choices.ToList(), Answer = answer };

    public static readonly List<Lesson> Lessons = new()
    {
        new() { Id = "les_babyshark", ProgramId = "prg_songs1", Order = 1, Published = true, YoutubeId = "XqZsoesa55w", DurationSec = 136, XpReward = 50, Title = new("Baby Shark", "Baby Shark"), Summary = new("เพลงเปิดคอร์ส", "The opening song."),
            Vocabulary = new() { "baby", "mommy", "daddy", "grandma", "grandpa", "shark" },
            Quiz = new() { Q("q1", "ฉลามตัวเล็กที่สุดเรียกว่าอะไร", "Which shark is the smallest?", new[] { "Daddy shark", "Baby shark", "Grandpa shark" }, 1), Q("q2", "คำว่า 'Mommy' หมายถึงใคร", "Who is 'Mommy'?", new[] { "mother", "father", "grandmother" }, 0), Q("q3", "ตอนจบเพลงร้องว่าอะไร", "What do they sing at the end?", new[] { "Let's go hunt", "Safe at last", "Run away" }, 1) } },
        new() { Id = "les_wheels", ProgramId = "prg_songs1", Order = 2, Published = true, YoutubeId = "e_04ZrNroTo", DurationSec = 165, XpReward = 50, Title = new("The Wheels on the Bus", "The Wheels on the Bus"), Summary = new("เปิดเมื่อจบ Baby Shark", "Opens after Baby Shark."),
            Vocabulary = new() { "wheels", "bus", "round and round", "wipers", "horn" },
            Quiz = new() { Q("q1", "ล้อรถบัสหมุนอย่างไร", "How do the wheels go?", new[] { "Up and down", "Round and round", "Swish swish" }, 1), Q("q2", "'Horn' ส่งเสียงว่าอะไร", "What sound does the horn make?", new[] { "Beep beep", "Swish swish", "Wah wah" }, 0) },
            Unlock = new() { new() { Type = "lesson_completed", LessonId = "les_babyshark" } } },
        new() { Id = "les_abc", ProgramId = "prg_songs1", Order = 3, Published = true, YoutubeId = "75p-N9YKqNo", DurationSec = 120, XpReward = 60, Title = new("ABC Song", "ABC Song"), Summary = new("เปิดเมื่อจบ Wheels และมี XP ≥ 100", "Opens after Wheels with 100 XP."),
            Vocabulary = new() { "alphabet", "letters" },
            Quiz = new() { Q("q1", "ตัวอักษรตัวแรกคือ", "The first letter is", new[] { "B", "A", "Z" }, 1), Q("q2", "มีตัวอักษรกี่ตัว", "How many letters?", new[] { "24", "26", "28" }, 1) },
            Unlock = new() { new() { Type = "lesson_completed", LessonId = "les_wheels" }, new() { Type = "min_xp", Xp = 100 } } },
        new() { Id = "les_twinkle", ProgramId = "prg_songs1", Order = 4, Published = true, YoutubeId = "yCjJyiqpAuU", DurationSec = 150, XpReward = 60, Title = new("Twinkle Twinkle Little Star", "Twinkle Twinkle Little Star"), Summary = new("เปิดเมื่อถึงเลเวล 3 และทำเควสต์ดู 3 คลิป", "Level 3 and the 3-video quest."),
            Vocabulary = new() { "twinkle", "star", "diamond" },
            Quiz = new() { Q("q1", "ดาวดวงน้อยอยู่ที่ไหน", "Where is the little star?", new[] { "In the sea", "Up above the world", "On the bus" }, 1) },
            Unlock = new() { new() { Type = "min_level", Level = 3 }, new() { Type = "quest_completed", QuestId = "qst_watch3" } } },
        new() { Id = "les_head", ProgramId = "prg_body", Order = 1, Published = true, YoutubeId = "h4eueDYPTIg", DurationSec = 140, XpReward = 50, Title = new("Head, Shoulders, Knees and Toes", "Head, Shoulders, Knees and Toes"), Summary = new("เปิดเมื่อถึงเลเวล 2", "Opens at level 2."),
            Vocabulary = new() { "head", "shoulders", "knees", "toes" },
            Quiz = new() { Q("q1", "'Knees' คือ", "'Knees' are", new[] { "หัวเข่า", "ไหล่", "นิ้วเท้า" }, 0) },
            Unlock = new() { new() { Type = "min_level", Level = 2 } } },
        new() { Id = "les_phonicsA", ProgramId = "prg_phonics", Order = 1, Published = true, YoutubeId = "BELlZKpi1Zs", DurationSec = 200, XpReward = 50, Title = new("Phonics Song A–Z", "Phonics Song A to Z"), Summary = new("เสียงของตัวอักษร", "The sound of each letter."),
            Vocabulary = new() { "apple", "ball", "cat" },
            Quiz = new() { Q("q1", "'A' is for …", "'A' is for …", new[] { "apple", "ball", "cat" }, 0) },
            Unlock = new() { new() { Type = "min_age", Years = 5 } } },
        // exam tracks: no video yet (an admin pastes a YouTube id, or 1.2 uploads a file)
        new() { Id = "les_tgat1", ProgramId = "prg_tgat", Order = 1, Published = true, YoutubeId = "", VideoUrl = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", Checkpoints = new() { new() { Id = "cp1", AtSec = 2, Prompt = new("คำถามกลางคลิป: วิดีโอนี้กำลังพูดถึงอะไร", "Checkpoint: what is this clip about?"), Choices = new() { "ดอกไม้ / a flower", "รถบัส / a bus", "ฉลาม / a shark" }, Answer = 0 }, new() { Id = "cp2", AtSec = 4, Prompt = new("คำถามกลางคลิป: “bloom” แปลว่าอะไร", "Checkpoint: “bloom” means …"), Choices = new() { "เหี่ยว", "บาน", "ปลูก" }, Answer = 1 } }, DurationSec = 900, XpReward = 80, Title = new("Reading: หาใจความสำคัญ", "Reading: the main idea"), Summary = new("บทแรกดูฟรี", "Free preview."), Quiz = new() { Q("q1", "'Skimming' คือ", "'Skimming' means", new[] { "อ่านทุกคำ", "อ่านเร็วจับใจความ", "อ่านย่อหน้าสุดท้าย" }, 1) } },
        new() { Id = "les_tgat2", ProgramId = "prg_tgat", Order = 2, Published = true, YoutubeId = "", VideoUrl = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", Checkpoints = new() { new() { Id = "cp1", AtSec = 3, Prompt = new("คำถามกลางคลิป: ตอบเพื่อดูต่อ", "Checkpoint: answer to continue"), Choices = new() { "A", "B", "C" }, Answer = 0 } }, DurationSec = 1200, XpReward = 80, Title = new("Error Identification", "Error identification"), Summary = new("Pro", "Pro."), Quiz = new() { Q("q1", "ข้อใดถูก", "Which is correct?", new[] { "She don't like it", "She doesn't like it", "She not like it" }, 1) }, Unlock = new() { new() { Type = "lesson_completed", LessonId = "les_tgat1" } } },
        new() { Id = "les_toeic1", ProgramId = "prg_toeic", Order = 1, Published = true, YoutubeId = "", VideoUrl = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", Checkpoints = new() { new() { Id = "cp1", AtSec = 2, Prompt = new("คำถามกลางคลิป: วิดีโอนี้กำลังพูดถึงอะไร", "Checkpoint: what is this clip about?"), Choices = new() { "ดอกไม้ / a flower", "รถบัส / a bus", "ฉลาม / a shark" }, Answer = 0 }, new() { Id = "cp2", AtSec = 4, Prompt = new("คำถามกลางคลิป: “bloom” แปลว่าอะไร", "Checkpoint: “bloom” means …"), Choices = new() { "เหี่ยว", "บาน", "ปลูก" }, Answer = 1 } }, DurationSec = 1100, XpReward = 80, Title = new("Part 1–2", "Parts 1–2"), Summary = new("บทแรกดูฟรี", "Free preview."), Quiz = new() { Q("q1", "'Where is the meeting?'", "Best reply to 'Where is the meeting?'", new[] { "At 3 p.m.", "In room 204", "Yes, it is" }, 1) } },
        new() { Id = "les_toeic2", ProgramId = "prg_toeic", Order = 2, Published = true, YoutubeId = "", VideoUrl = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", Checkpoints = new() { new() { Id = "cp1", AtSec = 3, Prompt = new("คำถามกลางคลิป: ตอบเพื่อดูต่อ", "Checkpoint: answer to continue"), Choices = new() { "A", "B", "C" }, Answer = 0 } }, DurationSec = 1300, XpReward = 90, Title = new("Part 5", "Part 5"), Summary = new("Pro", "Pro."), Quiz = new() { Q("q1", "The report was ___ submitted.", "The report was ___ submitted.", new[] { "success", "successful", "successfully" }, 2) }, Unlock = new() { new() { Type = "lesson_completed", LessonId = "les_toeic1" } } },
        new() { Id = "les_ielts1", ProgramId = "prg_ielts", Order = 1, Published = true, YoutubeId = "", VideoUrl = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", Checkpoints = new() { new() { Id = "cp1", AtSec = 2, Prompt = new("คำถามกลางคลิป: วิดีโอนี้กำลังพูดถึงอะไร", "Checkpoint: what is this clip about?"), Choices = new() { "ดอกไม้ / a flower", "รถบัส / a bus", "ฉลาม / a shark" }, Answer = 0 }, new() { Id = "cp2", AtSec = 4, Prompt = new("คำถามกลางคลิป: “bloom” แปลว่าอะไร", "Checkpoint: “bloom” means …"), Choices = new() { "เหี่ยว", "บาน", "ปลูก" }, Answer = 1 } }, DurationSec = 1500, XpReward = 100, Title = new("Task 2: อ่านโจทย์", "Task 2: decode the question"), Summary = new("บทแรกดูฟรี", "Free preview."), Quiz = new() { Q("q1", "'To what extent do you agree?' เป็นโจทย์แบบ", "'To what extent do you agree?' is a(n) … question", new[] { "discussion", "opinion", "problem-solution" }, 1) } },
        new() { Id = "les_ielts2", ProgramId = "prg_ielts", Order = 2, Published = true, YoutubeId = "", VideoUrl = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", Checkpoints = new() { new() { Id = "cp1", AtSec = 3, Prompt = new("คำถามกลางคลิป: ตอบเพื่อดูต่อ", "Checkpoint: answer to continue"), Choices = new() { "A", "B", "C" }, Answer = 0 } }, DurationSec = 1800, XpReward = 100, Title = new("โครงสร้าง 4 ย่อหน้า", "The four-paragraph structure"), Summary = new("Premium", "Premium."), Quiz = new() { Q("q1", "คำเชื่อมแสดงความขัดแย้ง", "Which linker shows contrast?", new[] { "furthermore", "nevertheless", "consequently" }, 1) }, Unlock = new() { new() { Type = "lesson_completed", LessonId = "les_ielts1" } } },
        new() { Id = "les_kpo1", ProgramId = "prg_kpo", Order = 1, Published = true, YoutubeId = "", VideoUrl = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", Checkpoints = new() { new() { Id = "cp1", AtSec = 2, Prompt = new("คำถามกลางคลิป: วิดีโอนี้กำลังพูดถึงอะไร", "Checkpoint: what is this clip about?"), Choices = new() { "ดอกไม้ / a flower", "รถบัส / a bus", "ฉลาม / a shark" }, Answer = 0 }, new() { Id = "cp2", AtSec = 4, Prompt = new("คำถามกลางคลิป: “bloom” แปลว่าอะไร", "Checkpoint: “bloom” means …"), Choices = new() { "เหี่ยว", "บาน", "ปลูก" }, Answer = 1 } }, DurationSec = 1000, XpReward = 80, Title = new("Conversation", "Conversation"), Summary = new("บทแรกดูฟรี", "Free preview."), Quiz = new() { Q("q1", "'Would you mind…?' ตอบรับว่า", "To agree to 'Would you mind…?' say", new[] { "Yes, I would", "Not at all", "No, thanks" }, 1) } },
        new() { Id = "les_kpo2", ProgramId = "prg_kpo", Order = 2, Published = true, YoutubeId = "", VideoUrl = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", Checkpoints = new() { new() { Id = "cp1", AtSec = 3, Prompt = new("คำถามกลางคลิป: ตอบเพื่อดูต่อ", "Checkpoint: answer to continue"), Choices = new() { "A", "B", "C" }, Answer = 0 } }, DurationSec = 1200, XpReward = 80, Title = new("Structure", "Structure"), Summary = new("Pro", "Pro."), Quiz = new() { Q("q1", "The letter ___ yesterday.", "The letter ___ yesterday.", new[] { "is sent", "was sent", "has sent" }, 1) }, Unlock = new() { new() { Type = "lesson_completed", LessonId = "les_kpo1" } } },
        new() { Id = "les_found1", ProgramId = "prg_found", Order = 1, Published = true, YoutubeId = "", VideoUrl = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", Checkpoints = new() { new() { Id = "cp1", AtSec = 2, Prompt = new("คำถามกลางคลิป: วิดีโอนี้กำลังพูดถึงอะไร", "Checkpoint: what is this clip about?"), Choices = new() { "ดอกไม้ / a flower", "รถบัส / a bus", "ฉลาม / a shark" }, Answer = 0 }, new() { Id = "cp2", AtSec = 4, Prompt = new("คำถามกลางคลิป: “bloom” แปลว่าอะไร", "Checkpoint: “bloom” means …"), Choices = new() { "เหี่ยว", "บาน", "ปลูก" }, Answer = 1 } }, DurationSec = 800, XpReward = 50, Title = new("Parts of speech", "Parts of speech"), Summary = new("ฟรี", "Free."), Quiz = new() { Q("q1", "'quickly' เป็น", "'quickly' is a(n)", new[] { "noun", "adjective", "adverb" }, 2) } },
        new() { Id = "les_found2", ProgramId = "prg_found", Order = 2, Published = true, YoutubeId = "", VideoUrl = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", Checkpoints = new() { new() { Id = "cp1", AtSec = 3, Prompt = new("คำถามกลางคลิป: ตอบเพื่อดูต่อ", "Checkpoint: answer to continue"), Choices = new() { "A", "B", "C" }, Answer = 0 } }, DurationSec = 900, XpReward = 50, Title = new("Present Simple", "Present simple"), Summary = new("ฟรี", "Free."), Quiz = new() { Q("q1", "She ___ to work by bus.", "She ___ to work by bus.", new[] { "go", "goes", "going" }, 1) }, Unlock = new() { new() { Type = "lesson_completed", LessonId = "les_found1" } } },
    };

    public static readonly List<Badge> Badges = new()
    {
        new() { Id = "bdg_first", Name = new("ก้าวแรก", "First Step"), Description = new("ดูวิดีโอแรกจนจบ", "Finished the first video."), Icon = "play" },
        new() { Id = "bdg_shark", Name = new("เพื่อนฉลาม", "Shark Friend"), Description = new("ผ่าน Baby Shark แบบเต็มคะแนน", "Perfect score on Baby Shark."), Icon = "star" },
        new() { Id = "bdg_streak3", Name = new("สามวันติด", "3-Day Streak"), Description = new("เรียนต่อเนื่อง 3 วัน", "Learned 3 days in a row."), Icon = "flame" },
        new() { Id = "bdg_quiz5", Name = new("นักตอบ", "Quiz Whiz"), Description = new("ผ่านแบบทดสอบ 5 ครั้ง", "Passed 5 quizzes."), Icon = "checklist" },
    };

    public static readonly List<Quest> Quests = new()
    {
        new() { Id = "qst_daily1", OwnerId = "own_sunshine", Scope = "daily", XpReward = 20, Title = new("ดูวิดีโอวันนี้ 1 คลิป", "Watch 1 video today"), Description = new("", ""), Goal = new() { Type = "watch_videos", Target = 1 } },
        new() { Id = "qst_watch3", OwnerId = "own_sunshine", Scope = "weekly", XpReward = 60, Title = new("ดูวิดีโอ 3 คลิปในสัปดาห์นี้", "Watch 3 videos this week"), Description = new("ปลดล็อก Twinkle Twinkle", "Unlocks Twinkle Twinkle."), Goal = new() { Type = "watch_videos", Target = 3 } },
        new() { Id = "qst_quiz5", OwnerId = "own_sunshine", Scope = "program", XpReward = 100, BadgeId = "bdg_quiz5", Title = new("ผ่านแบบทดสอบ 5 ครั้ง", "Pass 5 quizzes"), Description = new("", ""), Goal = new() { Type = "pass_quizzes", Target = 5 } },
        new() { Id = "qst_streak3", OwnerId = "own_sunshine", Scope = "program", XpReward = 40, BadgeId = "bdg_streak3", Title = new("เรียนต่อเนื่อง 3 วัน", "3 days in a row"), Description = new("", ""), Goal = new() { Type = "streak_days", Target = 3 } },
        new() { Id = "qst_bright_daily", OwnerId = "own_bright", Scope = "daily", XpReward = 20, Title = new("ฝึกโฟนิกส์วันละคลิป", "One phonics video a day"), Description = new("", ""), Goal = new() { Type = "watch_videos", Target = 1 } },
        new() { Id = "qst_pro_daily", OwnerId = "own_pro", Scope = "daily", XpReward = 30, Title = new("ติววันละบท", "One lesson a day"), Description = new("", ""), Goal = new() { Type = "watch_videos", Target = 1 } },
    };

    private static ParentConsent Ack => new() { Acknowledged = true, At = T0, Note = "ผู้ปกครองรับทราบตอนสมัคร" };

    public static readonly List<UserProfile> Users = new()
    {
        new() { Uid = "u_super", DisplayName = "Platform Admin", Email = "super@ellp.example.com", Role = Role.superadmin, AllowAllAges = true, AvatarColor = "#182433", CreatedAt = T0 },
        new() { Uid = "u_owner_sun", DisplayName = "คุณครูใหญ่ สมศรี", Email = "principal@sunshine.example.com", Role = Role.owner, AllowAllAges = true, OwnerId = "own_sunshine", AvatarColor = "#b0566f", CreatedAt = T0 },
        new() { Uid = "u_admin_ann", DisplayName = "Teacher Ann", Email = "ann@sunshine.example.com", Role = Role.admin, AllowAllAges = true, OwnerId = "own_sunshine", AvatarColor = "#2f7f86", CreatedAt = T0 },
        new() { Uid = "u_mint", DisplayName = "น้องมิ้นท์", Email = "mint.parent@example.com", Role = Role.learner, OwnerId = "own_sunshine", EnrolledProgramIds = new() { "prg_songs1", "prg_body" }, BirthYear = 2019, Track = "kids", Plan = "pro", PlanStatus = "active", PlanTrack = "kids", PlanExpiresAt = "2026-12-01T00:00:00.000Z", ParentConsent = Ack, Xp = 130, StreakDays = 2, BadgeIds = new() { "bdg_first", "bdg_shark" }, AvatarColor = "#f59f00", CreatedAt = T0 },
        new() { Uid = "u_tee", DisplayName = "น้องตี๋", Email = "tee.parent@example.com", Role = Role.learner, OwnerId = "own_sunshine", EnrolledProgramIds = new() { "prg_songs1" }, BirthYear = 2017, ParentConsent = Ack, Xp = 320, StreakDays = 5, BadgeIds = new() { "bdg_first", "bdg_streak3" }, AvatarColor = "#4c58c4", CreatedAt = T0 },
        new() { Uid = "u_fah", DisplayName = "น้องฟ้า", Email = "fah.parent@example.com", Role = Role.learner, OwnerId = "own_sunshine", EnrolledProgramIds = new() { "prg_songs1", "prg_body" }, BirthYear = 2016, Track = "kids", Plan = "premium", PlanStatus = "active", PlanExpiresAt = "2027-01-01T00:00:00.000Z", ParentConsent = Ack, Xp = 560, StreakDays = 1, BadgeIds = new() { "bdg_first" }, AvatarColor = "#2fb344", CreatedAt = T0 },
        new() { Uid = "u_admin_bright", DisplayName = "Khun Bee", Email = "bee@brightkids.example.com", Role = Role.admin, AllowAllAges = true, OwnerId = "own_bright", AvatarColor = "#a8612a", CreatedAt = T0 },
        new() { Uid = "u_admin_pro", DisplayName = "ครูเบนซ์", Email = "benz@englishpro.example.com", Role = Role.admin, OwnerId = "own_pro", AllowAllAges = true, AvatarColor = "#0b78a8", CreatedAt = T0 },
        new() { Uid = "u_ploy", DisplayName = "น้องพลอย ม.6", Email = "ploy@example.com", Role = Role.learner, OwnerId = "own_pro", EnrolledProgramIds = new() { "prg_tgat", "prg_found" }, BirthYear = 2009, Track = "school", ParentConsent = Ack, Xp = 80, StreakDays = 1, BadgeIds = new() { "bdg_first" }, AvatarColor = "#0b78a8", CreatedAt = T0 },
        new() { Uid = "u_jay", DisplayName = "คุณเจ", Email = "jay@example.com", Role = Role.learner, OwnerId = "own_pro", EnrolledProgramIds = new() { "prg_toeic" }, BirthYear = 1998, Track = "toeic", Plan = "pro", PlanStatus = "pending", PlanTrack = "toeic", PlanNote = "โอน 1,290 บาท 7 พ.ย. 20:15", PlanRequestedAt = "2026-11-07T13:20:00.000Z", Xp = 80, StreakDays = 1, BadgeIds = new() { "bdg_first" }, AvatarColor = "#2f7f86", CreatedAt = T0 },
        new() { Uid = "u_ann2", DisplayName = "คุณแอน", Email = "ann.k@example.com", Role = Role.learner, OwnerId = "own_pro", EnrolledProgramIds = new() { "prg_kpo", "prg_ielts" }, BirthYear = 1995, Track = "kpo", Plan = "premium", PlanStatus = "active", PlanRequestedAt = T0, PlanExpiresAt = "2026-11-14T00:00:00.000Z", Xp = 260, StreakDays = 3, BadgeIds = new() { "bdg_first" }, AvatarColor = "#a8612a", CreatedAt = T0 },
        new() { Uid = "u_pukkie", DisplayName = "น้องปุ๊กกี้", Email = "pukkie.parent@example.com", Role = Role.learner, OwnerId = "own_sunshine", EnrolledProgramIds = new() { "prg_songs1" }, BirthYear = 2022, ParentConsent = Ack, Xp = 40, StreakDays = 1, AvatarColor = "#b0566f", CreatedAt = T0 },
        new() { Uid = "u_kao", DisplayName = "น้องข้าว", Email = "kao.parent@example.com", Role = Role.learner, OwnerId = "own_bright", EnrolledProgramIds = new() { "prg_phonics" }, BirthYear = 2021, ParentConsent = Ack, Xp = 80, StreakDays = 1, BadgeIds = new() { "bdg_first" }, AvatarColor = "#6b5fb0", CreatedAt = T0 },
    };

    private static LessonProgress P(string uid, string lesson, int pct, int? score, int? total, bool done) => new() { Uid = uid, LessonId = lesson, WatchedPct = pct, QuizScore = score, QuizTotal = total, Completed = done, CompletedAt = done ? T0 : null, UpdatedAt = T0 };

    public static readonly List<LessonProgress> Progress = new()
    {
        P("u_mint", "les_babyshark", 100, 3, 3, true), P("u_mint", "les_wheels", 45, null, null, false),
        P("u_tee", "les_babyshark", 100, 2, 3, true), P("u_tee", "les_wheels", 100, 2, 2, true), P("u_tee", "les_abc", 100, 2, 2, true),
        P("u_fah", "les_babyshark", 100, 3, 3, true), P("u_fah", "les_wheels", 100, 2, 2, true), P("u_fah", "les_abc", 100, 2, 2, true), P("u_fah", "les_head", 100, 1, 1, true),
        P("u_kao", "les_phonicsA", 100, 1, 1, true),
    };

    public static readonly List<InboxMessage> Messages = new()
    {
        new() { Id = "msg_1", OwnerId = "own_sunshine", FromUid = "u_mint", FromName = "น้องมิ้นท์ (ผู้ปกครอง)", FromEmail = "mint.parent@example.com", Subject = "วิดีโอ Wheels on the Bus ไม่เปิด", Body = "ลูกดู Baby Shark จบแล้วแต่คลิปถัดไปยังล็อกอยู่", Status = "open", CreatedAt = "2026-11-06T09:12:00.000Z" },
    };

    public static readonly List<ChatThread> Chats = new()
    {
        new() { Id = "chat_1", OwnerId = "own_pro", Uid = "u_jay", Name = "คุณเจ", Email = "jay@example.com", Status = "open", CreatedAt = "2026-11-07T13:10:00.000Z", UpdatedAt = "2026-11-07T13:25:00.000Z",
            Messages = new() { new() { Id = "cm1", From = "visitor", ByName = "คุณเจ", Text = "สนใจคอร์ส TOEIC 600+ สมัคร Pro ต้องทำอย่างไรครับ", At = "2026-11-07T13:10:00.000Z" }, new() { Id = "cm2", From = "admin", ByName = "ครูเบนซ์", Text = "สมัครบัญชีฟรีก่อน แล้วกดขอแพ็กเกจ Pro เลือก Track TOEIC โอนแล้วส่งสลิปในแชทนี้ได้เลยค่ะ", At = "2026-11-07T13:12:00.000Z" } } },
        new() { Id = "chat_2", OwnerId = "own_pro", VisitorKey = "v_demo_visitor", Name = "คุณนุ่น", Email = "noon@example.com", Status = "open", CreatedAt = "2026-11-08T08:00:00.000Z", UpdatedAt = "2026-11-08T08:00:00.000Z",
            Messages = new() { new() { Id = "cm4", From = "visitor", ByName = "คุณนุ่น", Text = "อยากปรับพื้นฐานก่อนสอบ ก.พ. ควรเริ่มคอร์สไหนดีคะ", At = "2026-11-08T08:00:00.000Z" } } },
    };


    public static readonly List<Payment> Payments = new()
    {
        new() { Id = "pay_1", Uid = "u_ann2", OwnerId = "own_pro", Plan = "premium", Amount = 2490, Months = 1, Method = "promptpay", Provider = "demo", Status = "paid", Reference = "chrg_demo_0001", ReceiptNo = "EPA-2026-0001", CreatedAt = "2026-10-14T09:00:00.000Z", PaidAt = "2026-10-14T09:02:00.000Z" },
        new() { Id = "pay_2", Uid = "u_jay", OwnerId = "own_pro", Plan = "pro", PlanTrack = "toeic", Amount = 1290, Months = 1, Method = "transfer", Provider = "manual", Status = "pending", Reference = "โอน 7 พ.ย. 20:15", Note = "สลิปส่งทางแชทแล้ว", CreatedAt = "2026-11-07T13:20:00.000Z" },
        new() { Id = "pay_3", Uid = "u_mint", OwnerId = "own_sunshine", Plan = "pro", PlanTrack = "kids", Amount = 1290, Months = 1, Method = "transfer", Provider = "manual", Status = "paid", Reference = "โอน 1 ต.ค.", ReceiptNo = "SUN-2026-0001", CreatedAt = T0, PaidAt = "2026-10-01T10:00:00.000Z" },
    };

    public static readonly List<Certificate> Certificates = new()
    {
        new() { Id = "cert_1", Code = "ELLP-7K3M-QX2P", Uid = "u_ann2", LearnerName = "คุณแอน", OwnerId = "own_pro", OwnerName = new("สถาบันติวอิงลิชโปร", "English Pro Academy"), ProgramId = "prg_kpo", ProgramTitle = new("ภาษาอังกฤษ ก.พ. ภาค ก", "Civil Service Exam (ก.พ.) English"), Track = "kpo", Cefr = "A2", Lessons = 2, XpEarned = 160, IssuedAt = "2026-11-01T10:00:00.000Z" },
    };

    private static MockQuestion MQ(string id, string th, string en, string[] choices, int answer) => new() { Id = id, Prompt = new(th, en), Choices = choices.ToList(), Answer = answer };

    public static readonly List<MockTest> MockTests = new()
    {
        new() { Id = "mock_toeic_mini", OwnerId = "own_pro", Track = "toeic", DurationMin = 10, Scoring = "toeic", PassMark = 600, RequiredPlan = "premium", Published = true, Title = new("TOEIC Mini Test (Listening + Reading)", "TOEIC Mini Test (Listening + Reading)"), Description = new("6 ข้อ 10 นาที", "6 items in 10 minutes."),
            Sections = new() {
                new() { Id = "s1", Title = new("Part 2", "Part 2"), Questions = new() { MQ("q1", "When does the meeting start?", "When does the meeting start?", new[] { "In room 204", "At nine o'clock", "Yes, it does" }, 1), MQ("q2", "Could you send me the report?", "Could you send me the report?", new[] { "Sure, right away", "It was yesterday", "On the second floor" }, 0), MQ("q3", "Who is leading the project?", "Who is leading the project?", new[] { "Next Monday", "Ms. Tanaka is", "About two weeks" }, 1) } },
                new() { Id = "s2", Title = new("Part 5", "Part 5"), Questions = new() { MQ("q4", "The invoice must be paid ___ 30 days.", "The invoice must be paid ___ 30 days.", new[] { "within", "until", "since" }, 0), MQ("q5", "Our sales ___ by 12 % last quarter.", "Our sales ___ by 12 % last quarter.", new[] { "rise", "rose", "risen" }, 1), MQ("q6", "Please review the ___ document.", "Please review the ___ document.", new[] { "attach", "attaching", "attached" }, 2) } },
            } },
        new() { Id = "mock_ielts_mini", OwnerId = "own_pro", Track = "ielts", DurationMin = 8, Scoring = "ielts", PassMark = 6.5, RequiredPlan = "premium", Published = true, Title = new("IELTS Reading Mini", "IELTS Reading Mini"), Description = new("4 ข้อ 8 นาที", "4 items in 8 minutes."),
            Sections = new() { new() { Id = "s1", Title = new("Urban bees", "Urban bees"), Questions = new() { MQ("q1", "Bees in cities produce more honey than rural bees.", "Bees in cities produce more honey than rural bees.", new[] { "True", "False", "Not Given" }, 0), MQ("q2", "Pesticide use is lower in cities.", "Pesticide use is lower in cities.", new[] { "True", "False", "Not Given" }, 0), MQ("q3", "Most beekeepers in London are over 60.", "Most beekeepers in London are over 60.", new[] { "True", "False", "Not Given" }, 2), MQ("q4", "The author recommends banning rooftop hives.", "The author recommends banning rooftop hives.", new[] { "True", "False", "Not Given" }, 1) } } } },
        new() { Id = "mock_kpo_mini", OwnerId = "own_pro", Track = "kpo", DurationMin = 6, Scoring = "percent", PassMark = 60, RequiredPlan = "premium", Published = true, Title = new("ก.พ. ภาค ก ภาษาอังกฤษ (ชุดสั้น)", "Civil service English (short set)"), Description = new("5 ข้อ 6 นาที ผ่านที่ 60 %", "5 items in 6 minutes; 60 % passes."),
            Sections = new() { new() { Id = "s1", Title = new("Conversation & Structure", "Conversation & Structure"), Questions = new() { MQ("q1", "Would you like some coffee? — ___", "Would you like some coffee? — ___", new[] { "Yes, please.", "Yes, I like.", "No, I don't like coffee very." }, 0), MQ("q2", "She has lived here ___ 2019.", "She has lived here ___ 2019.", new[] { "for", "since", "from" }, 1), MQ("q3", "The documents ___ by the committee yesterday.", "The documents ___ by the committee yesterday.", new[] { "approved", "were approved", "have approved" }, 1), MQ("q4", "'How about joining us?' means …", "'How about joining us?' means …", new[] { "an invitation", "a complaint", "an apology" }, 0), MQ("q5", "If I ___ you, I would apply.", "If I ___ you, I would apply.", new[] { "am", "was", "were" }, 2) } } } },
    };

    public static readonly List<OwnerSettings> Settings = new()
    {
        new() { OwnerId = "own_sunshine", Email = new() { FromName = "Sunshine Kindergarten", FromAddress = "no-reply@sunshine.example.com", ReplyTo = "ann@sunshine.example.com", TestMode = true, AllowedRecipients = new() { "qa@sunshine.example.com" } }, AgeRules = Modules.Progress.GamificationRules.DefaultAgeRules.ToDictionary(k => k.Key, k => k.Value) },
        new() { OwnerId = "own_bright", Email = new() { FromName = "Bright Kids", FromAddress = "no-reply@brightkids.example.com", ReplyTo = "bee@brightkids.example.com", TestMode = true }, AgeRules = Modules.Progress.GamificationRules.DefaultAgeRules.ToDictionary(k => k.Key, k => k.Value) },
        new() { OwnerId = "own_pro", Email = new() { FromName = "English Pro Academy", FromAddress = "no-reply@englishpro.example.com", ReplyTo = "benz@englishpro.example.com", TestMode = true }, Leaderboard = new() { Size = 20 }, AgeRules = Modules.Progress.GamificationRules.DefaultAgeRules.ToDictionary(k => k.Key, k => k.Value), LineUrl = "https://line.me/R/ti/p/@englishpro-demo", PaymentInstructions = new("Pro 1,290 บาท/เดือน · Premium 2,490 บาท/เดือน (ตัวอย่าง) โอนเข้า ธ.ตัวอย่าง 987-6-54321-0", "Pro 1,290 THB/month · Premium 2,490 THB/month (sample). Transfer to Sample Bank 987-6-54321-0.") },
    };
}
