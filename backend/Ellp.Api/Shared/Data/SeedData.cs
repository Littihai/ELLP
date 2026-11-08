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
    };

    public static readonly List<LearningProgram> Programs = new()
    {
        new() { Id = "prg_songs1", OwnerId = "own_sunshine", Level = "beginner", Color = "#f59f00", Published = true, CreatedAt = T0, Title = new("ร้องเพลงภาษาอังกฤษ ชุดที่ 1", "Sing-along English, Set 1"), Description = new("เริ่มจาก Baby Shark แล้วปลดล็อกเพลงถัดไปเมื่อดูจบและตอบคำถามผ่าน", "Start with Baby Shark and unlock the next song by finishing each video and passing its quiz.") },
        new() { Id = "prg_body", OwnerId = "own_sunshine", Level = "elementary", AgeBands = new() { "6-8", "9-12" }, Color = "#2fb344", Published = true, CreatedAt = T0, Title = new("ร่างกายและการเคลื่อนไหว", "My Body in Motion"), Description = new("เพลงและท่าทางเกี่ยวกับร่างกาย เปิดได้เมื่อถึงเลเวล 2", "Songs and actions about the body. Opens at level 2.") },
        new() { Id = "prg_phonics", OwnerId = "own_bright", Level = "beginner", AgeBands = new() { "3-5", "6-8" }, Color = "#4c58c4", Published = true, CreatedAt = T0, Title = new("โฟนิกส์ A–Z", "Phonics A to Z"), Description = new("เสียงตัวอักษรผ่านเพลง", "Letter sounds through song.") },
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
    };

    private static ParentConsent Ack => new() { Acknowledged = true, At = T0, Note = "ผู้ปกครองรับทราบตอนสมัคร" };

    public static readonly List<UserProfile> Users = new()
    {
        new() { Uid = "u_super", DisplayName = "Platform Admin", Email = "super@ellp.example.com", Role = Role.superadmin, AllowAllAges = true, AvatarColor = "#182433", CreatedAt = T0 },
        new() { Uid = "u_owner_sun", DisplayName = "คุณครูใหญ่ สมศรี", Email = "principal@sunshine.example.com", Role = Role.owner, AllowAllAges = true, OwnerId = "own_sunshine", AvatarColor = "#b0566f", CreatedAt = T0 },
        new() { Uid = "u_admin_ann", DisplayName = "Teacher Ann", Email = "ann@sunshine.example.com", Role = Role.admin, AllowAllAges = true, OwnerId = "own_sunshine", AvatarColor = "#2f7f86", CreatedAt = T0 },
        new() { Uid = "u_mint", DisplayName = "น้องมิ้นท์", Email = "mint.parent@example.com", Role = Role.learner, OwnerId = "own_sunshine", EnrolledProgramIds = new() { "prg_songs1", "prg_body" }, BirthYear = 2019, ParentConsent = Ack, Xp = 130, StreakDays = 2, BadgeIds = new() { "bdg_first", "bdg_shark" }, AvatarColor = "#f59f00", CreatedAt = T0 },
        new() { Uid = "u_tee", DisplayName = "น้องตี๋", Email = "tee.parent@example.com", Role = Role.learner, OwnerId = "own_sunshine", EnrolledProgramIds = new() { "prg_songs1" }, BirthYear = 2017, ParentConsent = Ack, Xp = 320, StreakDays = 5, BadgeIds = new() { "bdg_first", "bdg_streak3" }, AvatarColor = "#4c58c4", CreatedAt = T0 },
        new() { Uid = "u_fah", DisplayName = "น้องฟ้า", Email = "fah.parent@example.com", Role = Role.learner, OwnerId = "own_sunshine", EnrolledProgramIds = new() { "prg_songs1", "prg_body" }, BirthYear = 2016, ParentConsent = Ack, Xp = 560, StreakDays = 1, BadgeIds = new() { "bdg_first" }, AvatarColor = "#2fb344", CreatedAt = T0 },
        new() { Uid = "u_admin_bright", DisplayName = "Khun Bee", Email = "bee@brightkids.example.com", Role = Role.admin, AllowAllAges = true, OwnerId = "own_bright", AvatarColor = "#a8612a", CreatedAt = T0 },
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

    public static readonly List<OwnerSettings> Settings = new()
    {
        new() { OwnerId = "own_sunshine", Email = new() { FromName = "Sunshine Kindergarten", FromAddress = "no-reply@sunshine.example.com", ReplyTo = "ann@sunshine.example.com", TestMode = true, AllowedRecipients = new() { "qa@sunshine.example.com" } }, AgeRules = Modules.Progress.GamificationRules.DefaultAgeRules.ToDictionary(k => k.Key, k => k.Value) },
        new() { OwnerId = "own_bright", Email = new() { FromName = "Bright Kids", FromAddress = "no-reply@brightkids.example.com", ReplyTo = "bee@brightkids.example.com", TestMode = true }, AgeRules = Modules.Progress.GamificationRules.DefaultAgeRules.ToDictionary(k => k.Key, k => k.Value) },
    };
}
