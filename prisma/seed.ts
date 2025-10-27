import { PrismaClient, CEFRLevel, Skill, ModuleType, ActivityType, QuestionType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting seed...');

    // ===== 1. CREATE TEST USERS =====
    console.log('👤 Creating test users...');

    const hashedPassword = await bcrypt.hash('password123', 10);

    const testUser = await prisma.user.upsert({
        where: { email: 'test@example.com' },
        update: {},
        create: {
            email: 'test@example.com',
            name: 'Test User',
            password: hashedPassword,
            role: 'USER',
        },
    });

    const adminUser = await prisma.user.upsert({
        where: { email: 'admin@example.com' },
        update: {},
        create: {
            email: 'admin@example.com',
            name: 'Admin User',
            password: hashedPassword,
            role: 'ADMIN',
        },
    });

    console.log('✅ Created users:', testUser.email, adminUser.email);

    // ===== 2. CREATE TOPICS & TAGS =====
    console.log('🏷️  Creating topics and tags...');

    const topics = await Promise.all([
        prisma.topic.upsert({
            where: { slug: 'daily-life' },
            update: {},
            create: { slug: 'daily-life', title: 'Daily Life', description: 'Everyday activities and routines' },
        }),
        prisma.topic.upsert({
            where: { slug: 'business' },
            update: {},
            create: { slug: 'business', title: 'Business English', description: 'Professional communication' },
        }),
        prisma.topic.upsert({
            where: { slug: 'travel' },
            update: {},
            create: { slug: 'travel', title: 'Travel & Tourism', description: 'Travel-related vocabulary and phrases' },
        }),
    ]);

    const tags = await Promise.all([
        prisma.tag.upsert({ where: { name: 'Beginner' }, update: {}, create: { name: 'Beginner' } }),
        prisma.tag.upsert({ where: { name: 'Intermediate' }, update: {}, create: { name: 'Intermediate' } }),
        prisma.tag.upsert({ where: { name: 'Advanced' }, update: {}, create: { name: 'Advanced' } }),
        prisma.tag.upsert({ where: { name: 'Grammar' }, update: {}, create: { name: 'Grammar' } }),
        prisma.tag.upsert({ where: { name: 'Vocabulary' }, update: {}, create: { name: 'Vocabulary' } }),
    ]);

    console.log('✅ Created', topics.length, 'topics and', tags.length, 'tags');

    // ===== 3. CREATE MODULES =====
    console.log('📚 Creating modules...');

    const listeningModule = await prisma.module.upsert({
        where: { code: 'LISTEN_101' },
        update: {},
        create: {
            code: 'LISTEN_101',
            type: ModuleType.LISTENING,
            title: 'Listening Fundamentals',
            description: 'Master listening comprehension from basic to advanced',
            levelMin: CEFRLevel.A1,
            levelMax: CEFRLevel.C2,
        },
    });

    const readingModule = await prisma.module.upsert({
        where: { code: 'READ_101' },
        update: {},
        create: {
            code: 'READ_101',
            type: ModuleType.READING,
            title: 'Reading Skills Development',
            description: 'Improve reading speed and comprehension',
            levelMin: CEFRLevel.A1,
            levelMax: CEFRLevel.C2,
        },
    });

    const writingModule = await prisma.module.upsert({
        where: { code: 'WRITE_101' },
        update: {},
        create: {
            code: 'WRITE_101',
            type: ModuleType.WRITING,
            title: 'Writing Mastery',
            description: 'From sentences to essays',
            levelMin: CEFRLevel.A1,
            levelMax: CEFRLevel.C2,
        },
    });

    const speakingModule = await prisma.module.upsert({
        where: { code: 'SPEAK_101' },
        update: {},
        create: {
            code: 'SPEAK_101',
            type: ModuleType.SPEAKING,
            title: 'Speaking Confidence',
            description: 'Develop fluency and pronunciation',
            levelMin: CEFRLevel.A1,
            levelMax: CEFRLevel.C2,
        },
    });

    console.log('✅ Created 4 modules');

    // ===== 4. CREATE UNITS =====
    console.log('📖 Creating units...');

    const listeningUnit1 = await prisma.unit.create({
        data: {
            moduleId: listeningModule.id,
            order: 1,
            title: 'Basic Conversations',
            overview: 'Listen to simple everyday dialogues',
            level: CEFRLevel.A1,
            skill: Skill.LISTENING,
        },
    });

    const readingUnit1 = await prisma.unit.create({
        data: {
            moduleId: readingModule.id,
            order: 1,
            title: 'Short Stories for Beginners',
            overview: 'Read and understand simple narratives',
            level: CEFRLevel.A2,
            skill: Skill.READING,
        },
    });

    const writingUnit1 = await prisma.unit.create({
        data: {
            moduleId: writingModule.id,
            order: 1,
            title: 'Writing Sentences',
            overview: 'Form correct English sentences',
            level: CEFRLevel.A1,
            skill: Skill.WRITING,
        },
    });

    const speakingUnit1 = await prisma.unit.create({
        data: {
            moduleId: speakingModule.id,
            order: 1,
            title: 'Introduction & Greetings',
            overview: 'Learn to introduce yourself',
            level: CEFRLevel.A1,
            skill: Skill.SPEAKING,
        },
    });

    console.log('✅ Created 4 units');

    // ===== 5. CREATE CONTENT =====
    console.log('📝 Creating content...');

    const readingContent1 = await prisma.content.create({
        data: {
            unitId: readingUnit1.id,
            authorId: adminUser.id,
            title: 'A Day at the Beach',
            summary: 'Sarah visits the beach on a sunny day',
            level: CEFRLevel.A2,
            skill: Skill.READING,
            html: `<p>Sarah woke up early on Saturday morning. The sun was shining and it was a beautiful day. She decided to go to the beach.</p>
             <p>At the beach, Sarah saw many people. Some were swimming in the sea. Others were playing volleyball on the sand. Children were building sandcastles.</p>
             <p>Sarah spread her towel on the sand and sat down. She read her book for an hour. Then she went for a swim. The water was cold but refreshing.</p>
             <p>After swimming, Sarah felt hungry. She bought an ice cream from a vendor. It was delicious!</p>
             <p>Sarah stayed at the beach until sunset. She had a wonderful day.</p>`,
            plainText: 'Sarah woke up early on Saturday morning. The sun was shining and it was a beautiful day...',
            topics: {
                connect: [{ id: topics[0].id }], // Daily Life
            },
            tags: {
                connect: [{ id: tags[0].id }], // Beginner
            },
        },
    });

    console.log('✅ Created reading content');

    // ===== 6. CREATE ACTIVITIES =====
    console.log('🎯 Creating activities...');

    // LISTENING ACTIVITY
    const listeningActivity1 = await prisma.activity.create({
        data: {
            unitId: listeningUnit1.id,
            authorId: adminUser.id,
            type: ActivityType.LISTEN_DETAIL,
            title: 'At the Restaurant - Conversation',
            instruction: 'Listen to the conversation and answer the questions',
            maxScore: 10,
            timeLimitSec: 300,
            level: CEFRLevel.A2,
            skill: Skill.LISTENING,
        },
    });

    // READING ACTIVITY  
    const readingActivity1 = await prisma.activity.create({
        data: {
            unitId: readingUnit1.id,
            authorId: adminUser.id,
            type: ActivityType.READ_MAIN_IDEA,
            title: 'A Day at the Beach - Comprehension',
            instruction: 'Read the text and answer the questions',
            maxScore: 10,
            timeLimitSec: 600,
            level: CEFRLevel.A2,
            skill: Skill.READING,
        },
    });

    // WRITING ACTIVITY
    const writingActivity1 = await prisma.activity.create({
        data: {
            unitId: writingUnit1.id,
            authorId: adminUser.id,
            type: ActivityType.WRITE_PARAGRAPH,
            title: 'Describe Your Daily Routine',
            instruction: 'Write a short paragraph (80-100 words) describing your daily routine',
            maxScore: 10,
            timeLimitSec: 900,
            level: CEFRLevel.A2,
            skill: Skill.WRITING,
        },
    });

    // SPEAKING ACTIVITY
    const speakingActivity1 = await prisma.activity.create({
        data: {
            unitId: speakingUnit1.id,
            authorId: adminUser.id,
            type: ActivityType.SPEAK_TOPIC,
            title: 'Introduce Yourself',
            instruction: 'Record yourself introducing yourself (1-2 minutes)',
            maxScore: 10,
            timeLimitSec: 120,
            level: CEFRLevel.A1,
            skill: Skill.SPEAKING,
        },
    });

    console.log('✅ Created 4 activities');

    // ===== 7. CREATE QUESTIONS FOR READING =====
    console.log('❓ Creating questions...');

    const question1 = await prisma.question.create({
        data: {
            activityId: readingActivity1.id,
            authorId: adminUser.id,
            order: 1,
            type: QuestionType.SINGLE_CHOICE,
            prompt: 'What day did Sarah go to the beach?',
            explanation: 'The text mentions "Sarah woke up early on Saturday morning"',
            score: 2,
            contentId: readingContent1.id,
            choices: {
                create: [
                    { order: 1, text: 'Friday', value: 'A', isCorrect: false },
                    { order: 2, text: 'Saturday', value: 'B', isCorrect: true },
                    { order: 3, text: 'Sunday', value: 'C', isCorrect: false },
                    { order: 4, text: 'Monday', value: 'D', isCorrect: false },
                ],
            },
            answers: {
                create: [
                    { key: 'B', meta: { correctAnswer: 'Saturday' } },
                ],
            },
        },
    });

    const question2 = await prisma.question.create({
        data: {
            activityId: readingActivity1.id,
            authorId: adminUser.id,
            order: 2,
            type: QuestionType.SINGLE_CHOICE,
            prompt: 'What was the weather like?',
            score: 2,
            contentId: readingContent1.id,
            choices: {
                create: [
                    { order: 1, text: 'Rainy', value: 'A', isCorrect: false },
                    { order: 2, text: 'Cloudy', value: 'B', isCorrect: false },
                    { order: 3, text: 'Sunny', value: 'C', isCorrect: true },
                    { order: 4, text: 'Windy', value: 'D', isCorrect: false },
                ],
            },
            answers: {
                create: [{ key: 'C' }],
            },
        },
    });

    const question3 = await prisma.question.create({
        data: {
            activityId: readingActivity1.id,
            authorId: adminUser.id,
            order: 3,
            type: QuestionType.TRUE_FALSE,
            prompt: 'Sarah stayed at the beach until sunset.',
            score: 2,
            contentId: readingContent1.id,
            choices: {
                create: [
                    { order: 1, text: 'True', value: 'TRUE', isCorrect: true },
                    { order: 2, text: 'False', value: 'FALSE', isCorrect: false },
                ],
            },
            answers: {
                create: [{ key: 'TRUE' }],
            },
        },
    });

    console.log('✅ Created 3 questions for reading');

    // ===== 8. CREATE USER PROGRESS =====
    console.log('📊 Creating user progress...');

    await prisma.userProgress.create({
        data: {
            userId: testUser.id,
            unitId: readingUnit1.id,
            status: 'in_progress',
            lastSeen: new Date(),
            scoreSum: 6,
        },
    });

    // ===== 9. CREATE ATTEMPT & SUBMISSION =====
    console.log('📝 Creating attempts and submissions...');

    const attempt1 = await prisma.attempt.create({
        data: {
            userId: testUser.id,
            activityId: readingActivity1.id,
            startedAt: new Date(Date.now() - 1000 * 60 * 10), // 10 mins ago
            submittedAt: new Date(Date.now() - 1000 * 60 * 5), // 5 mins ago
            score: 6,
            status: 'graded',
        },
    });

    await prisma.submission.createMany({
        data: [
            {
                attemptId: attempt1.id,
                userId: testUser.id,
                questionId: question1.id,
                chosenIds: ['B'],
                isCorrect: true,
                score: 2,
            },
            {
                attemptId: attempt1.id,
                userId: testUser.id,
                questionId: question2.id,
                chosenIds: ['C'],
                isCorrect: true,
                score: 2,
            },
            {
                attemptId: attempt1.id,
                userId: testUser.id,
                questionId: question3.id,
                chosenIds: ['TRUE'],
                isCorrect: true,
                score: 2,
            },
        ],
    });

    console.log('✅ Created attempt and submissions');

    // ===== 10. CREATE GRAMMAR POINTS =====
    console.log('📖 Creating grammar points...');

    await prisma.grammarPoint.createMany({
        data: [
            {
                title: 'Present Simple Tense',
                level: CEFRLevel.A1,
                explanation: 'Used for habits, routines, and general truths',
                patterns: 'Subject + verb (base form) | Subject + do/does + not + verb',
                examples: JSON.stringify([
                    'I work every day.',
                    'She doesn\'t like coffee.',
                    'Do you speak English?',
                ]),
            },
            {
                title: 'Past Simple Tense',
                level: CEFRLevel.A2,
                explanation: 'Used for completed actions in the past',
                patterns: 'Subject + verb (past form) | Subject + did + not + verb',
                examples: JSON.stringify([
                    'I visited Paris last year.',
                    'He didn\'t call yesterday.',
                    'Did they arrive on time?',
                ]),
            },
        ],
    });

    // ===== 11. CREATE VOCABULARY ENTRIES =====
    console.log('📚 Creating vocabulary entries...');

    await prisma.vocabEntry.createMany({
        data: [
            {
                lemma: 'beach',
                pos: 'noun',
                phonetic: '/biːtʃ/',
                level: CEFRLevel.A1,
                definition: 'An area of sand or stones beside the sea',
                examples: JSON.stringify(['We went to the beach.', 'The beach was crowded.']),
                synonyms: ['shore', 'coast'],
                antonyms: [],
                families: ['beachy'],
                collocations: ['sandy beach', 'go to the beach'],
                idioms: [],
                phrasalVerbs: [],
            },
            {
                lemma: 'swim',
                pos: 'verb',
                phonetic: '/swɪm/',
                level: CEFRLevel.A1,
                definition: 'To move through water by moving your body',
                examples: JSON.stringify(['I can swim.', 'She swims every morning.']),
                synonyms: [],
                antonyms: [],
                families: ['swimmer', 'swimming'],
                collocations: ['swim in the sea', 'go swimming'],
                idioms: ['swim against the tide'],
                phrasalVerbs: [],
            },
        ],
    });

    console.log('✅ Database seeded successfully! 🎉');
    console.log('\n📋 Login credentials:');
    console.log('   Email: test@example.com');
    console.log('   Password: password123');
    console.log('\n   Admin Email: admin@example.com');
    console.log('   Admin Password: password123\n');
}

main()
    .catch((e) => {
        console.error('❌ Seed error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

