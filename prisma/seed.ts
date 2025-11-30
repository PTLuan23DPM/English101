import { PrismaClient, CEFRLevel, Skill, ModuleType, ActivityType, QuestionType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { WRITING_TASKS } from '../src/app/english/writing/data/writingTasks';
import { READING_LESSONS } from '../src/data/readingLessons';
import { LISTENING_TASKS } from '../src/app/english/listening/data/listeningTasks';
import { SPEAKING_TASKS } from '../src/app/english/speaking/data/speakingTasks';

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
        // Culture & Topics categories
        prisma.topic.upsert({
            where: { slug: 'culture' },
            update: {},
            create: { slug: 'culture', title: 'Culture', description: 'Cultural differences and English-speaking countries' },
        }),
        prisma.topic.upsert({
            where: { slug: 'society' },
            update: {},
            create: { slug: 'society', title: 'Society', description: 'Social issues and modern life' },
        }),
        prisma.topic.upsert({
            where: { slug: 'science' },
            update: {},
            create: { slug: 'science', title: 'Science', description: 'Scientific topics and discoveries' },
        }),
        prisma.topic.upsert({
            where: { slug: 'environment' },
            update: {},
            create: { slug: 'environment', title: 'Environment', description: 'Environmental issues and sustainability' },
        }),
        prisma.topic.upsert({
            where: { slug: 'technology' },
            update: {},
            create: { slug: 'technology', title: 'Technology', description: 'Technology and innovation' },
        }),
        prisma.topic.upsert({
            where: { slug: 'history' },
            update: {},
            create: { slug: 'history', title: 'History', description: 'Historical events and civilization' },
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

    const mediationModule = await prisma.module.upsert({
        where: { code: 'MEDIATE_101' },
        update: {},
        create: {
            code: 'MEDIATE_101',
            type: ModuleType.MEDIATION_TRANSLATION,
            title: 'Mediation & Translation',
            description: 'Develop skills to relay, summarize, and interpret information between languages',
            levelMin: CEFRLevel.B1,
            levelMax: CEFRLevel.C2,
        },
    });

    const cultureModule = await prisma.module.upsert({
        where: { code: 'CULTURE_101' },
        update: {},
        create: {
            code: 'CULTURE_101',
            type: ModuleType.CULTURE_TOPICS_CONTENT,
            title: 'Culture & Topics',
            description: 'Explore authentic content on culture, society, science, and more',
            levelMin: CEFRLevel.A2,
            levelMax: CEFRLevel.C2,
        },
    });

    console.log('✅ Created 6 modules');

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

    // Mediation units
    const mediationUnit1 = await prisma.unit.create({
        data: {
            moduleId: mediationModule.id,
            order: 1,
            title: 'Summarizing Short Texts',
            overview: 'Extract and present key information from texts',
            level: CEFRLevel.B1,
            skill: Skill.MEDIATION,
        },
    });

    const mediationUnit2 = await prisma.unit.create({
        data: {
            moduleId: mediationModule.id,
            order: 2,
            title: 'Relaying Information',
            overview: 'Pass on messages accurately between speakers',
            level: CEFRLevel.B1,
            skill: Skill.MEDIATION,
        },
    });

    const mediationUnit3 = await prisma.unit.create({
        data: {
            moduleId: mediationModule.id,
            order: 3,
            title: 'Translating Simple Texts',
            overview: 'Transfer meaning between languages',
            level: CEFRLevel.B2,
            skill: Skill.MEDIATION,
        },
    });

    // Culture units
    const cultureUnit1 = await prisma.unit.create({
        data: {
            moduleId: cultureModule.id,
            order: 1,
            title: 'British vs American English',
            overview: 'Differences in vocabulary, spelling, and pronunciation',
            level: CEFRLevel.B1,
            skill: Skill.CULTURE,
        },
    });

    const cultureUnit2 = await prisma.unit.create({
        data: {
            moduleId: cultureModule.id,
            order: 2,
            title: 'Climate Change & Sustainability',
            overview: 'Global environmental challenges and solutions',
            level: CEFRLevel.B2,
            skill: Skill.CULTURE,
        },
    });

    const cultureUnit3 = await prisma.unit.create({
        data: {
            moduleId: cultureModule.id,
            order: 3,
            title: 'Technology & Innovation',
            overview: 'Latest tech trends and innovations',
            level: CEFRLevel.B2,
            skill: Skill.CULTURE,
        },
    });

    console.log('✅ Created 10 units');

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

    // Find topic IDs for culture content
    const cultureTopic = topics.find(t => t.slug === 'culture');
    const environmentTopic = topics.find(t => t.slug === 'environment');
    const scienceTopic = topics.find(t => t.slug === 'science');
    const technologyTopic = topics.find(t => t.slug === 'technology');
    const societyTopic = topics.find(t => t.slug === 'society');

    // Culture content
    const cultureContent1Data: any = {
        unitId: cultureUnit1.id,
        authorId: adminUser.id,
        title: 'British vs American English: Key Differences',
        summary: 'Exploring vocabulary, spelling, and pronunciation differences',
        level: CEFRLevel.B1,
        skill: Skill.CULTURE,
        html: `<p>English is spoken in many countries around the world, and each country has its own version. The two most well-known varieties are British English (BrE) and American English (AmE).</p>
         <p><strong>Vocabulary Differences:</strong> Many everyday words are different. For example, in British English, people say "lift" for "elevator", "boot" for "trunk" of a car, and "biscuit" for "cookie". Americans use "truck" while British use "lorry".</p>
         <p><strong>Spelling Differences:</strong> British English often uses "-our" (colour, favour) while American uses "-or" (color, favor). British uses "-ise" (realise, organise) while American uses "-ize" (realize, organize).</p>
         <p><strong>Pronunciation:</strong> There are also pronunciation differences. For example, the word "schedule" is pronounced "SHED-yool" in British English but "SKED-yool" in American English.</p>
         <p>Despite these differences, British and American speakers can usually understand each other perfectly. Both varieties are correct - it's just a matter of where you learned English!</p>`,
        plainText: 'English is spoken in many countries around the world, and each country has its own version...',
    };
    if (cultureTopic) {
        cultureContent1Data.topics = { connect: [{ id: cultureTopic.id }] };
    }
    const cultureContent1 = await prisma.content.create({ data: cultureContent1Data });

    const cultureContent2Data: any = {
        unitId: cultureUnit2.id,
        authorId: adminUser.id,
        title: 'Climate Change: A Global Challenge',
        summary: 'Understanding climate change and sustainable solutions',
        level: CEFRLevel.B2,
        skill: Skill.CULTURE,
        html: `<p>Climate change is one of the most pressing issues of our time. It refers to long-term changes in global temperatures and weather patterns.</p>
         <p><strong>Causes:</strong> The main cause is the increase in greenhouse gases, especially carbon dioxide, from human activities like burning fossil fuels, deforestation, and industrial processes.</p>
         <p><strong>Effects:</strong> We're seeing rising sea levels, more extreme weather events, melting ice caps, and changes in precipitation patterns. These changes affect ecosystems, agriculture, and human communities worldwide.</p>
         <p><strong>Solutions:</strong> To address climate change, we need to reduce greenhouse gas emissions by using renewable energy, improving energy efficiency, protecting forests, and adopting sustainable practices in agriculture and transportation.</p>
         <p>Individual actions matter too: reducing energy consumption, using public transport, recycling, and supporting companies that prioritize sustainability can all make a difference.</p>`,
        plainText: 'Climate change is one of the most pressing issues of our time...',
    };
    if (environmentTopic && scienceTopic) {
        cultureContent2Data.topics = { connect: [{ id: environmentTopic.id }, { id: scienceTopic.id }] };
    }
    const cultureContent2 = await prisma.content.create({ data: cultureContent2Data });

    const cultureContent3Data: any = {
        unitId: cultureUnit3.id,
        authorId: adminUser.id,
        title: 'Artificial Intelligence: Transforming Our World',
        summary: 'How AI is changing technology and society',
        level: CEFRLevel.B2,
        skill: Skill.CULTURE,
        html: `<p>Artificial Intelligence (AI) is revolutionizing how we live and work. From smartphones to self-driving cars, AI technology is becoming increasingly integrated into our daily lives.</p>
         <p><strong>What is AI?</strong> AI refers to computer systems that can perform tasks that typically require human intelligence, such as recognizing speech, making decisions, and learning from experience.</p>
         <p><strong>Applications:</strong> AI is used in healthcare for diagnosing diseases, in transportation for autonomous vehicles, in education for personalized learning, and in business for data analysis and customer service.</p>
         <p><strong>Benefits:</strong> AI can help solve complex problems, increase efficiency, and improve quality of life. It can process vast amounts of data quickly and identify patterns humans might miss.</p>
         <p><strong>Challenges:</strong> However, AI also raises concerns about job displacement, privacy, bias, and the need for regulation. It's important to develop AI responsibly and ensure it benefits all of society.</p>`,
        plainText: 'Artificial Intelligence (AI) is revolutionizing how we live and work...',
    };
    if (technologyTopic && societyTopic) {
        cultureContent3Data.topics = { connect: [{ id: technologyTopic.id }, { id: societyTopic.id }] };
    }
    const cultureContent3 = await prisma.content.create({ data: cultureContent3Data });

    console.log('✅ Created culture content');

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

    // MEDIATION ACTIVITIES
    const mediationActivity1 = await prisma.activity.create({
        data: {
            unitId: mediationUnit1.id,
            authorId: adminUser.id,
            type: ActivityType.MEDIATION_SUMMARIZE,
            title: 'Summarize a News Article',
            instruction: 'Read the article and write a summary in 50-80 words. Focus on the main points and key information.',
            maxScore: 10,
            timeLimitSec: 600,
            level: CEFRLevel.B1,
            skill: Skill.MEDIATION,
        },
    });

    const mediationActivity2 = await prisma.activity.create({
        data: {
            unitId: mediationUnit2.id,
            authorId: adminUser.id,
            type: ActivityType.MEDIATION_REPHRASE,
            title: 'Relay a Message',
            instruction: 'Read the message and rewrite it in your own words for a different audience. Maintain the essential information.',
            maxScore: 10,
            timeLimitSec: 600,
            level: CEFRLevel.B1,
            skill: Skill.MEDIATION,
        },
    });

    const mediationActivity3 = await prisma.activity.create({
        data: {
            unitId: mediationUnit3.id,
            authorId: adminUser.id,
            type: ActivityType.MEDIATION_SUMMARIZE,
            title: 'Translate Key Concepts',
            instruction: 'Read the text and explain the main concepts in simpler English, as if explaining to someone learning the language.',
            maxScore: 10,
            timeLimitSec: 900,
            level: CEFRLevel.B2,
            skill: Skill.MEDIATION,
        },
    });

    // CULTURE ACTIVITIES
    const cultureActivity1 = await prisma.activity.create({
        data: {
            unitId: cultureUnit1.id,
            authorId: adminUser.id,
            type: ActivityType.READ_MAIN_IDEA,
            title: 'British vs American English - Reading',
            instruction: 'Read the article about British and American English differences and answer the questions',
            maxScore: 10,
            timeLimitSec: 600,
            level: CEFRLevel.B1,
            skill: Skill.CULTURE,
        },
    });

    const cultureActivity2 = await prisma.activity.create({
        data: {
            unitId: cultureUnit2.id,
            authorId: adminUser.id,
            type: ActivityType.READ_INFER,
            title: 'Climate Change - Discussion',
            instruction: 'Read the article about climate change and discuss the main points. Then answer comprehension questions.',
            maxScore: 10,
            timeLimitSec: 900,
            level: CEFRLevel.B2,
            skill: Skill.CULTURE,
        },
    });

    const cultureActivity3 = await prisma.activity.create({
        data: {
            unitId: cultureUnit3.id,
            authorId: adminUser.id,
            type: ActivityType.READ_SKIMMING,
            title: 'AI Technology - Reading & Discussion',
            instruction: 'Read the article about artificial intelligence and participate in a discussion about its impact on society',
            maxScore: 10,
            timeLimitSec: 900,
            level: CEFRLevel.B2,
            skill: Skill.CULTURE,
        },
    });

    console.log('✅ Created 10 activities');

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

    // ===== 7b. CREATE QUESTIONS FOR CULTURE =====
    const cultureQuestion1 = await prisma.question.create({
        data: {
            activityId: cultureActivity1.id,
            authorId: adminUser.id,
            order: 1,
            type: QuestionType.SINGLE_CHOICE,
            prompt: 'Which word is used in British English for "elevator"?',
            explanation: 'British English uses "lift" while American English uses "elevator"',
            score: 2,
            contentId: cultureContent1.id,
            choices: {
                create: [
                    { order: 1, text: 'Elevator', value: 'A', isCorrect: false },
                    { order: 2, text: 'Lift', value: 'B', isCorrect: true },
                    { order: 3, text: 'Riser', value: 'C', isCorrect: false },
                    { order: 4, text: 'Hoist', value: 'D', isCorrect: false },
                ],
            },
            answers: {
                create: [{ key: 'B' }],
            },
        },
    });

    const cultureQuestion2 = await prisma.question.create({
        data: {
            activityId: cultureActivity1.id,
            authorId: adminUser.id,
            order: 2,
            type: QuestionType.SINGLE_CHOICE,
            prompt: 'How is "schedule" pronounced in British English?',
            explanation: 'British English pronounces it "SHED-yool" while American English says "SKED-yool"',
            score: 2,
            contentId: cultureContent1.id,
            choices: {
                create: [
                    { order: 1, text: 'SKED-yool', value: 'A', isCorrect: false },
                    { order: 2, text: 'SHED-yool', value: 'B', isCorrect: true },
                    { order: 3, text: 'SKEH-dool', value: 'C', isCorrect: false },
                    { order: 4, text: 'SHEH-dool', value: 'D', isCorrect: false },
                ],
            },
            answers: {
                create: [{ key: 'B' }],
            },
        },
    });

    const cultureQuestion3 = await prisma.question.create({
        data: {
            activityId: cultureActivity2.id,
            authorId: adminUser.id,
            order: 1,
            type: QuestionType.SINGLE_CHOICE,
            prompt: 'What is the main cause of climate change?',
            explanation: 'The main cause is the increase in greenhouse gases from human activities',
            score: 2,
            contentId: cultureContent2.id,
            choices: {
                create: [
                    { order: 1, text: 'Natural weather patterns', value: 'A', isCorrect: false },
                    { order: 2, text: 'Increase in greenhouse gases', value: 'B', isCorrect: true },
                    { order: 3, text: 'Ocean currents', value: 'C', isCorrect: false },
                    { order: 4, text: 'Solar activity', value: 'D', isCorrect: false },
                ],
            },
            answers: {
                create: [{ key: 'B' }],
            },
        },
    });

    const cultureQuestion4 = await prisma.question.create({
        data: {
            activityId: cultureActivity3.id,
            authorId: adminUser.id,
            order: 1,
            type: QuestionType.SINGLE_CHOICE,
            prompt: 'What does AI stand for?',
            explanation: 'AI stands for Artificial Intelligence',
            score: 2,
            contentId: cultureContent3.id,
            choices: {
                create: [
                    { order: 1, text: 'Automated Information', value: 'A', isCorrect: false },
                    { order: 2, text: 'Artificial Intelligence', value: 'B', isCorrect: true },
                    { order: 3, text: 'Advanced Integration', value: 'C', isCorrect: false },
                    { order: 4, text: 'Analytical Interface', value: 'D', isCorrect: false },
                ],
            },
            answers: {
                create: [{ key: 'B' }],
            },
        },
    });

    console.log('✅ Created 4 questions for culture');

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

    // ===== SEED WRITING TASKS =====
    console.log('📝 Seeding writing tasks...');
    
    const writingTasksData = [
        {
            id: "sentence-daily",
            icon: "📝",
            title: "Daily Routine",
            type: "Sentence Building",
            level: "A2",
            prompt: "Write 5-7 sentences about your daily morning routine. Use simple present tense and time expressions.",
            targetWords: "50-80 words",
            tips: [
                "Use time expressions: in the morning, at 7 AM, after breakfast",
                "Use simple present tense: I wake up, I have breakfast",
                "Connect sentences with: then, after that, finally",
            ],
            recommended: true,
            color: "blue",
            order: 1,
        },
        {
            id: "sentence-weekend",
            icon: "☀️",
            title: "Weekend Activities",
            type: "Sentence Building",
            level: "A2",
            prompt: "Describe what you usually do on weekends. Write 5-7 complete sentences.",
            targetWords: "50-80 words",
            tips: [
                "Use frequency adverbs: usually, sometimes, often",
                "Mention different activities",
                "Use linking words to connect ideas",
            ],
            recommended: false,
            color: "blue",
            order: 2,
        },
        {
            id: "para-hobby",
            icon: "🎨",
            title: "My Favorite Hobby",
            type: "Paragraph Writing",
            level: "B1",
            prompt: "Describe your favorite hobby and explain why you enjoy it. Include details about how you got started and what you have learned.",
            targetWords: "100-150 words",
            tips: [
                "Start with a topic sentence introducing your hobby",
                "Use specific examples and details",
                "End with a concluding sentence",
            ],
            recommended: true,
            color: "green",
            order: 3,
        },
        {
            id: "para-travel",
            icon: "✈️",
            title: "A Memorable Trip",
            type: "Paragraph Writing",
            level: "B1",
            prompt: "Write about a memorable trip or vacation. Describe where you went, what you did, and why it was special.",
            targetWords: "120-150 words",
            tips: [
                "Use past tense to describe events",
                "Include sensory details (what you saw, heard, felt)",
                "Explain why this experience was meaningful",
            ],
            recommended: false,
            color: "green",
            order: 4,
        },
        {
            id: "email-formal",
            icon: "📧",
            title: "Extension Request",
            type: "Email Writing",
            level: "B1",
            prompt: "Write a formal email to your professor requesting an extension for your assignment. Explain your situation politely.",
            targetWords: "120-180 words",
            tips: [
                "Start with: Dear Professor [Name],",
                "Be polite and professional",
                "End with: Best regards, [Your name]",
            ],
            recommended: false,
            color: "purple",
            order: 5,
        },
        {
            id: "email-complaint",
            icon: "💼",
            title: "Product Complaint",
            type: "Email Writing",
            level: "B2",
            prompt: "Write a formal complaint email to a company about a defective product you purchased. Request a refund or replacement.",
            targetWords: "150-200 words",
            tips: [
                "State the problem clearly",
                "Include relevant details (order number, date)",
                "Be firm but polite",
                "Clearly state what you want",
            ],
            recommended: false,
            color: "purple",
            order: 6,
        },
        {
            id: "essay-discussion",
            icon: "💬",
            title: "Work From Home vs Office",
            type: "Discussion",
            level: "B2",
            prompt: "Some people prefer to work from home, while others prefer to work in an office. Discuss both views and give your opinion.",
            targetWords: "250-300 words",
            tips: [
                "Introduction: state the topic and your thesis",
                "Body paragraph 1: advantages of working from home",
                "Body paragraph 2: advantages of office work",
                "Conclusion: summarize and state your opinion",
            ],
            recommended: true,
            color: "teal",
            order: 7,
        },
        {
            id: "essay-advantage",
            icon: "⚖️",
            title: "Online Shopping",
            type: "Advantage-Disadvantage",
            level: "B2",
            prompt: "Online shopping is becoming increasingly popular. Discuss the advantages and disadvantages of buying products online.",
            targetWords: "250-300 words",
            tips: [
                "Introduction: introduce the topic",
                "Body 1: discuss advantages with examples",
                "Body 2: discuss disadvantages with examples",
                "Conclusion: balanced summary",
            ],
            recommended: true,
            color: "teal",
            order: 8,
        },
        {
            id: "essay-opinion",
            icon: "📊",
            title: "University Education",
            type: "Opinion",
            level: "B2",
            prompt: "Some people believe university education should be free for all students. To what extent do you agree or disagree?",
            targetWords: "250-300 words",
            tips: [
                "Introduction: clearly state your position",
                "Body: provide 2-3 main arguments",
                "Use examples and evidence",
                "Conclusion: restate your opinion",
            ],
            recommended: false,
            color: "teal",
            order: 9,
        },
        {
            id: "essay-problem",
            icon: "🌍",
            title: "Environmental Pollution",
            type: "Problem-Solution",
            level: "C1",
            prompt: "Environmental pollution is a growing concern. What are the main causes of this problem and what solutions can you suggest?",
            targetWords: "250-300 words",
            tips: [
                "Introduction: present the problem",
                "Body 1: discuss main causes",
                "Body 2: propose practical solutions",
                "Conclusion: summarize key points",
            ],
            recommended: false,
            color: "teal",
            order: 10,
        },
        {
            id: "essay-two-part",
            icon: "❓",
            title: "Technology and Children",
            type: "Multi-Part",
            level: "B2",
            prompt: "Many children spend several hours per day on screens. Why is this the case? What are the effects on their development?",
            targetWords: "250-300 words",
            tips: [
                "Introduction: acknowledge both questions",
                "Body 1: answer first question (reasons)",
                "Body 2: answer second question (effects)",
                "Conclusion: brief summary",
            ],
            recommended: false,
            color: "teal",
            order: 11,
        },
    ];

    for (const taskData of writingTasksData) {
        await prisma.writingTask.upsert({
            where: { id: taskData.id },
            update: {
                title: taskData.title,
                icon: taskData.icon,
                type: taskData.type,
                level: taskData.level,
                prompt: taskData.prompt,
                targetWords: taskData.targetWords,
                tips: taskData.tips,
                recommended: taskData.recommended,
                color: taskData.color,
                order: taskData.order,
                active: true,
            },
            create: {
                id: taskData.id,
                title: taskData.title,
                icon: taskData.icon,
                type: taskData.type,
                level: taskData.level,
                prompt: taskData.prompt,
                targetWords: taskData.targetWords,
                tips: taskData.tips,
                recommended: taskData.recommended,
                color: taskData.color,
                order: taskData.order,
                active: true,
            },
        });
    }

    console.log(`✅ Seeded ${writingTasksData.length} writing tasks`);

    console.log('✅ Database seeded successfully! 🎉');
    // ===== 7. SEED WRITING TASKS =====
    console.log('📝 Seeding Writing tasks...');
    
    for (let i = 0; i < WRITING_TASKS.length; i++) {
        const task = WRITING_TASKS[i];
        await prisma.writingTask.upsert({
            where: { id: task.id },
            update: {
                title: task.title,
                type: task.type,
                level: task.level,
                prompt: task.prompt,
                targetWords: task.targetWords,
                tips: task.tips,
                recommended: task.recommended || false,
                icon: task.icon,
                color: task.color,
                order: i,
                active: true,
            },
            create: {
                id: task.id,
                title: task.title,
                type: task.type,
                level: task.level,
                prompt: task.prompt,
                targetWords: task.targetWords,
                tips: task.tips,
                recommended: task.recommended || false,
                icon: task.icon,
                color: task.color,
                order: i,
                active: true,
            },
        });
    }
    
    console.log(`✅ Seeded ${WRITING_TASKS.length} Writing tasks`);

    // ===== 8. SEED READING TASKS =====
    console.log('📖 Seeding Reading tasks...');
    
    for (let i = 0; i < READING_LESSONS.length; i++) {
        const lesson = READING_LESSONS[i];
        await prisma.readingTask.upsert({
            where: { id: lesson.id },
            update: {
                title: lesson.title,
                subtitle: lesson.subtitle,
                cefr: lesson.cefr,
                genre: lesson.genre,
                source: lesson.source,
                tags: lesson.tags,
                estimatedTime: lesson.estimatedTime,
                wordCount: lesson.wordCount,
                coverEmoji: lesson.coverEmoji,
                gradient: lesson.gradient,
                readingSkills: lesson.readingSkills,
                keyIdeas: lesson.keyIdeas,
                vocabulary: lesson.vocabulary as any,
                contentSections: lesson.contentSections as any,
                exercises: lesson.exercises as any,
                recommended: false,
                order: i,
                active: true,
            },
            create: {
                id: lesson.id,
                title: lesson.title,
                subtitle: lesson.subtitle,
                cefr: lesson.cefr,
                genre: lesson.genre,
                source: lesson.source,
                tags: lesson.tags,
                estimatedTime: lesson.estimatedTime,
                wordCount: lesson.wordCount,
                coverEmoji: lesson.coverEmoji,
                gradient: lesson.gradient,
                readingSkills: lesson.readingSkills,
                keyIdeas: lesson.keyIdeas,
                vocabulary: lesson.vocabulary as any,
                contentSections: lesson.contentSections as any,
                exercises: lesson.exercises as any,
                recommended: false,
                order: i,
                active: true,
            },
        });
    }
    
    console.log(`✅ Seeded ${READING_LESSONS.length} Reading tasks`);

    // ===== 9. SEED LISTENING TASKS =====
    console.log('🎧 Seeding Listening tasks...');
    
    for (let i = 0; i < LISTENING_TASKS.length; i++) {
        const task = LISTENING_TASKS[i];
        await prisma.listeningTask.upsert({
            where: { id: task.id },
            update: {
                title: task.title,
                type: task.type,
                level: task.level,
                description: task.description,
                duration: task.duration,
                speakers: task.speakers,
                accent: task.accent,
                questions: task.questions,
                tags: task.tags,
                recommended: task.recommended || false,
                icon: task.icon || "🎧",
                color: task.color || "blue",
                order: i,
                active: true,
            },
            create: {
                id: task.id,
                title: task.title,
                type: task.type,
                level: task.level,
                description: task.description,
                duration: task.duration,
                speakers: task.speakers,
                accent: task.accent,
                questions: task.questions,
                tags: task.tags,
                recommended: task.recommended || false,
                icon: task.icon || "🎧",
                color: task.color || "blue",
                order: i,
                active: true,
            },
        });
    }
    
    console.log(`✅ Seeded ${LISTENING_TASKS.length} Listening tasks`);

    // ===== 10. SEED SPEAKING TASKS =====
    console.log('🎤 Seeding Speaking tasks...');
    
    for (let i = 0; i < SPEAKING_TASKS.length; i++) {
        const task = SPEAKING_TASKS[i];
        await prisma.speakingTask.upsert({
            where: { id: task.id },
            update: {
                title: task.title,
                type: task.type,
                level: task.level,
                prompt: task.prompt,
                timeLimit: task.timeLimit,
                tips: task.tips,
                vocab: task.vocab as any,
                phrases: task.phrases,
                recommended: task.recommended || false,
                icon: task.icon || "🎤",
                color: task.color || "blue",
                order: i,
                active: true,
            },
            create: {
                id: task.id,
                title: task.title,
                type: task.type,
                level: task.level,
                prompt: task.prompt,
                timeLimit: task.timeLimit,
                tips: task.tips,
                vocab: task.vocab as any,
                phrases: task.phrases,
                recommended: task.recommended || false,
                icon: task.icon || "🎤",
                color: task.color || "blue",
                order: i,
                active: true,
            },
        });
    }
    
    console.log(`✅ Seeded ${SPEAKING_TASKS.length} Speaking tasks`);

    // ===== 11. SEED GRAMMAR TASKS =====
    console.log('📚 Seeding Grammar tasks...');
    
    try {
        // Read from grammar_file directory directly
        const { readdir, readFile } = await import('fs/promises');
        const { join } = await import('path');
        
        const GRAMMAR_FILES_DIR = join(process.cwd(), "grammar_file");
        let grammarTaskCount = 0;
        
        async function scanGrammarFiles(dir: string, currentLevel?: string): Promise<void> {
            try {
                const entries = await readdir(dir, { withFileTypes: true });
                
                for (const entry of entries) {
                    const entryPath = join(dir, entry.name);
                    
                    if (entry.isFile() && entry.name.endsWith(".json")) {
                        try {
                            const fileContent = await readFile(entryPath, "utf-8");
                            const lessonData = JSON.parse(fileContent);
                            
                            let levelFromPath = currentLevel;
                            if (!levelFromPath) {
                                const pathParts = entryPath.split(/[/\\]/);
                                for (let i = pathParts.length - 1; i >= 0; i--) {
                                    const part = pathParts[i];
                                    if (["A1-A2", "B1-B2", "C1"].includes(part)) {
                                        levelFromPath = part;
                                        break;
                                    }
                                }
                            }
                            
                            const taskId = lessonData.id || entry.name.replace(".json", "");
                            
                            await prisma.grammarTask.upsert({
                                where: { id: taskId },
                                update: {
                                    title: lessonData.title || entry.name.replace(".json", ""),
                                    level: levelFromPath || "A1-A2",
                                    introduction: lessonData.introduction || "",
                                    examples: lessonData.examples || null,
                                    exercises: lessonData.exercises || null,
                                    exampleCount: lessonData.examples?.length || 0,
                                    exerciseCount: lessonData.exercises?.length || 0,
                                    category: lessonData.category || null,
                                    recommended: false,
                                    order: grammarTaskCount,
                                    active: true,
                                },
                                create: {
                                    id: taskId,
                                    title: lessonData.title || entry.name.replace(".json", ""),
                                    level: levelFromPath || "A1-A2",
                                    introduction: lessonData.introduction || "",
                                    examples: lessonData.examples || null,
                                    exercises: lessonData.exercises || null,
                                    exampleCount: lessonData.examples?.length || 0,
                                    exerciseCount: lessonData.exercises?.length || 0,
                                    category: lessonData.category || null,
                                    recommended: false,
                                    order: grammarTaskCount,
                                    active: true,
                                },
                            });
                            grammarTaskCount++;
                        } catch (error) {
                            console.error(`Error reading ${entry.name}:`, error);
                        }
                    } else if (entry.isDirectory()) {
                        let nextLevel = currentLevel;
                        if (["A1-A2", "B1-B2", "C1"].includes(entry.name)) {
                            nextLevel = entry.name;
                        }
                        await scanGrammarFiles(entryPath, nextLevel);
                    }
                }
            } catch (error) {
                console.error(`Error reading directory ${dir}:`, error);
            }
        }
        
        try {
            await scanGrammarFiles(GRAMMAR_FILES_DIR);
            console.log(`✅ Seeded ${grammarTaskCount} Grammar tasks from grammar_file directory`);
        } catch (dirError) {
            console.warn(`⚠️  Could not read grammar_file directory: ${dirError}`);
            console.warn(`   Make sure the grammar_file directory exists in the project root.`);
        }
    } catch (grammarError) {
        console.error(`❌ Error seeding Grammar tasks:`, grammarError);
    }

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

