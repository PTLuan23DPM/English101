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

    // Update test user with sample data
    await prisma.user.update({
        where: { id: testUser.id },
        data: {
            cefrLevel: 'A2',
            placementTestCompleted: true,
            placementScore: 65,
            streak: 7,
            longestStreak: 7,
            lastActive: new Date(),
        },
    });

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

    await prisma.userProgress.createMany({
        data: [
            {
                userId: testUser.id,
                unitId: readingUnit1.id,
                status: 'completed',
                lastSeen: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
                scoreSum: 8,
            },
            {
                userId: testUser.id,
                unitId: listeningUnit1.id,
                status: 'in_progress',
                lastSeen: new Date(Date.now() - 1000 * 60 * 30), // 30 mins ago
                scoreSum: 5,
            },
            {
                userId: testUser.id,
                unitId: writingUnit1.id,
                status: 'in_progress',
                lastSeen: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
                scoreSum: null,
            },
            {
                userId: testUser.id,
                unitId: speakingUnit1.id,
                status: 'not_started',
                lastSeen: null,
                scoreSum: null,
            },
            {
                userId: testUser.id,
                unitId: cultureUnit1.id,
                status: 'completed',
                lastSeen: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
                scoreSum: 9,
            },
            {
                userId: testUser.id,
                unitId: cultureUnit2.id,
                status: 'in_progress',
                lastSeen: new Date(Date.now() - 1000 * 60 * 60 * 12), // 12 hours ago
                scoreSum: 7,
            },
        ],
    });

    // ===== 9. CREATE ATTEMPT & SUBMISSION =====
    console.log('📝 Creating attempts and submissions...');

    // Reading attempt
    const attempt1 = await prisma.attempt.create({
        data: {
            userId: testUser.id,
            activityId: readingActivity1.id,
            startedAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
            submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 2 + 1000 * 60 * 5), // 5 mins later
            score: 8,
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

    // Culture attempts
    const attempt2 = await prisma.attempt.create({
        data: {
            userId: testUser.id,
            activityId: cultureActivity1.id,
            startedAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
            submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 + 1000 * 60 * 8), // 8 mins later
            score: 9,
            status: 'graded',
        },
    });

    await prisma.submission.createMany({
        data: [
            {
                attemptId: attempt2.id,
                userId: testUser.id,
                questionId: cultureQuestion1.id,
                chosenIds: ['B'],
                isCorrect: true,
                score: 2,
            },
            {
                attemptId: attempt2.id,
                userId: testUser.id,
                questionId: cultureQuestion2.id,
                chosenIds: ['B'],
                isCorrect: true,
                score: 2,
            },
        ],
    });

    const attempt3 = await prisma.attempt.create({
        data: {
            userId: testUser.id,
            activityId: cultureActivity2.id,
            startedAt: new Date(Date.now() - 1000 * 60 * 60 * 12), // 12 hours ago
            submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 12 + 1000 * 60 * 10), // 10 mins later
            score: 7,
            status: 'graded',
        },
    });

    await prisma.submission.createMany({
        data: [
            {
                attemptId: attempt3.id,
                userId: testUser.id,
                questionId: cultureQuestion3.id,
                chosenIds: ['B'],
                isCorrect: true,
                score: 2,
            },
        ],
    });

    // Writing attempt (no questions, just submission)
    const attempt4 = await prisma.attempt.create({
        data: {
            userId: testUser.id,
            activityId: writingActivity1.id,
            startedAt: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
            submittedAt: new Date(Date.now() - 1000 * 60 * 45), // 45 mins ago
            score: null,
            status: 'submitted',
            meta: {
                taskTitle: 'Describe Your Daily Routine',
                wordCount: 95,
            },
        },
    });

    // Listening attempt
    const attempt5 = await prisma.attempt.create({
        data: {
            userId: testUser.id,
            activityId: listeningActivity1.id,
            startedAt: new Date(Date.now() - 1000 * 60 * 30), // 30 mins ago
            submittedAt: new Date(Date.now() - 1000 * 60 * 20), // 20 mins ago
            score: 5,
            status: 'graded',
        },
    });

    console.log('✅ Created', 5, 'attempts with submissions');

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
            {
                title: 'Present Continuous Tense',
                level: CEFRLevel.A2,
                explanation: 'Used for actions happening now or temporary situations',
                patterns: 'Subject + am/is/are + verb-ing',
                examples: JSON.stringify([
                    'I am studying English now.',
                    'She is working at the moment.',
                    'They are playing football.',
                ]),
            },
            {
                title: 'Future with "will"',
                level: CEFRLevel.A2,
                explanation: 'Used for predictions, promises, and spontaneous decisions',
                patterns: 'Subject + will + verb (base form)',
                examples: JSON.stringify([
                    'I will help you tomorrow.',
                    'It will rain later.',
                    'She will call you soon.',
                ]),
            },
            {
                title: 'Present Perfect Tense',
                level: CEFRLevel.B1,
                explanation: 'Used for past actions with present relevance',
                patterns: 'Subject + have/has + past participle',
                examples: JSON.stringify([
                    'I have finished my homework.',
                    'She has lived here for 5 years.',
                    'Have you ever been to London?',
                ]),
            },
            {
                title: 'Conditional Sentences (Type 1)',
                level: CEFRLevel.B1,
                explanation: 'Used for real or likely future situations',
                patterns: 'If + present simple, will + verb',
                examples: JSON.stringify([
                    'If it rains, I will stay home.',
                    'If you study hard, you will pass the exam.',
                    'If she calls, tell her I\'m busy.',
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
            {
                lemma: 'achieve',
                pos: 'verb',
                phonetic: '/əˈtʃiːv/',
                level: CEFRLevel.B1,
                definition: 'To successfully complete or reach a goal',
                examples: JSON.stringify(['She achieved her dream of becoming a doctor.', 'We achieved our target.']),
                synonyms: ['accomplish', 'attain', 'reach'],
                antonyms: ['fail'],
                families: ['achievement', 'achievable'],
                collocations: ['achieve success', 'achieve a goal'],
                idioms: [],
                phrasalVerbs: [],
            },
            {
                lemma: 'environment',
                pos: 'noun',
                phonetic: '/ɪnˈvaɪrənmənt/',
                level: CEFRLevel.B1,
                definition: 'The natural world, especially as affected by human activity',
                examples: JSON.stringify(['We must protect the environment.', 'The environment is changing.']),
                synonyms: ['nature', 'surroundings'],
                antonyms: [],
                families: ['environmental', 'environmentally'],
                collocations: ['protect the environment', 'environmental protection'],
                idioms: [],
                phrasalVerbs: [],
            },
            {
                lemma: 'technology',
                pos: 'noun',
                phonetic: '/tekˈnɒlədʒi/',
                level: CEFRLevel.B1,
                definition: 'The application of scientific knowledge for practical purposes',
                examples: JSON.stringify(['Modern technology has changed our lives.', 'Technology is advancing rapidly.']),
                synonyms: ['innovation', 'tech'],
                antonyms: [],
                families: ['technological', 'technologist'],
                collocations: ['modern technology', 'technology sector'],
                idioms: [],
                phrasalVerbs: [],
            },
            {
                lemma: 'comprehend',
                pos: 'verb',
                phonetic: '/ˌkɒmprɪˈhend/',
                level: CEFRLevel.B2,
                definition: 'To understand something fully',
                examples: JSON.stringify(['I cannot comprehend why he did that.', 'She comprehends the complexity.']),
                synonyms: ['understand', 'grasp'],
                antonyms: ['misunderstand'],
                families: ['comprehension', 'comprehensible'],
                collocations: ['comprehend the meaning'],
                idioms: [],
                phrasalVerbs: [],
            },
            {
                lemma: 'fluent',
                pos: 'adjective',
                phonetic: '/ˈfluːənt/',
                level: CEFRLevel.B2,
                definition: 'Able to express oneself easily and accurately',
                examples: JSON.stringify(['She is fluent in three languages.', 'He speaks fluent English.']),
                synonyms: ['proficient', 'articulate'],
                antonyms: ['hesitant'],
                families: ['fluency', 'fluently'],
                collocations: ['fluent speaker', 'fluent in English'],
                idioms: [],
                phrasalVerbs: [],
            },
        ],
    });

    // ===== 12. CREATE USER GOALS =====
    console.log('🎯 Creating user goals...');

    await prisma.userGoal.createMany({
        data: [
            {
                userId: testUser.id,
                type: 'daily_exercises',
                target: 5,
                current: 3,
                deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 7 days from now
                completed: false,
                metadata: { skill: 'all' },
            },
            {
                userId: testUser.id,
                type: 'weekly_hours',
                target: 10,
                current: 6,
                deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3), // 3 days from now
                completed: false,
                metadata: { unit: 'hours' },
            },
            {
                userId: testUser.id,
                type: 'target_level',
                target: 1, // B1 level
                current: 0,
                deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 90), // 90 days from now
                completed: false,
                metadata: { targetLevel: 'B1' },
            },
            {
                userId: testUser.id,
                type: 'writing_tasks',
                target: 10,
                current: 4,
                deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), // 30 days from now
                completed: false,
                metadata: { skill: 'writing' },
            },
            {
                userId: testUser.id,
                type: 'reading_tasks',
                target: 15,
                current: 8,
                deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), // 30 days from now
                completed: false,
                metadata: { skill: 'reading' },
            },
        ],
    });

    console.log('✅ Created 5 user goals');

    // ===== 13. CREATE USER ACTIVITY TRACKING =====
    console.log('📊 Creating user activity tracking...');

    const now = Date.now();
    await prisma.userActivity.createMany({
        data: [
            // Today's activities
            {
                userId: testUser.id,
                date: new Date(now - 1000 * 60 * 60 * 2), // 2 hours ago
                skill: 'reading',
                activityType: 'exercise',
                duration: 15,
                score: 8.0,
                completed: true,
            },
            {
                userId: testUser.id,
                date: new Date(now - 1000 * 60 * 30), // 30 mins ago
                skill: 'listening',
                activityType: 'exercise',
                duration: 20,
                score: 5.0,
                completed: true,
            },
            {
                userId: testUser.id,
                date: new Date(now - 1000 * 60 * 60), // 1 hour ago
                skill: 'writing',
                activityType: 'practice',
                duration: 30,
                score: null,
                completed: true,
            },
            // Yesterday's activities
            {
                userId: testUser.id,
                date: new Date(now - 1000 * 60 * 60 * 24), // 1 day ago
                skill: 'culture',
                activityType: 'exercise',
                duration: 25,
                score: 9.0,
                completed: true,
            },
            {
                userId: testUser.id,
                date: new Date(now - 1000 * 60 * 60 * 24 - 1000 * 60 * 30), // 1 day 30 mins ago
                skill: 'reading',
                activityType: 'exercise',
                duration: 20,
                score: 7.5,
                completed: true,
            },
            // 2 days ago
            {
                userId: testUser.id,
                date: new Date(now - 1000 * 60 * 60 * 24 * 2), // 2 days ago
                skill: 'grammar',
                activityType: 'practice',
                duration: 15,
                score: 8.5,
                completed: true,
            },
            {
                userId: testUser.id,
                date: new Date(now - 1000 * 60 * 60 * 24 * 2 - 1000 * 60 * 60), // 2 days 1 hour ago
                skill: 'vocabulary',
                activityType: 'practice',
                duration: 10,
                score: 9.0,
                completed: true,
            },
            // 3 days ago
            {
                userId: testUser.id,
                date: new Date(now - 1000 * 60 * 60 * 24 * 3), // 3 days ago
                skill: 'listening',
                activityType: 'exercise',
                duration: 18,
                score: 6.5,
                completed: true,
            },
            // 4 days ago
            {
                userId: testUser.id,
                date: new Date(now - 1000 * 60 * 60 * 24 * 4), // 4 days ago
                skill: 'reading',
                activityType: 'exercise',
                duration: 22,
                score: 8.0,
                completed: true,
            },
            // 5 days ago
            {
                userId: testUser.id,
                date: new Date(now - 1000 * 60 * 60 * 24 * 5), // 5 days ago
                skill: 'writing',
                activityType: 'practice',
                duration: 35,
                score: 7.0,
                completed: true,
            },
            // 6 days ago
            {
                userId: testUser.id,
                date: new Date(now - 1000 * 60 * 60 * 24 * 6), // 6 days ago
                skill: 'speaking',
                activityType: 'practice',
                duration: 12,
                score: null,
                completed: true,
            },
            // 7 days ago
            {
                userId: testUser.id,
                date: new Date(now - 1000 * 60 * 60 * 24 * 7), // 7 days ago
                skill: 'culture',
                activityType: 'exercise',
                duration: 28,
                score: 8.5,
                completed: true,
            },
        ],
    });

    console.log('✅ Created', 12, 'user activity records');

    // ===== 14. CREATE SAMPLE NOTIFICATIONS =====
    console.log('🔔 Creating sample notifications...');

    const sampleNotifications = [
        {
            userId: testUser.id,
            sentBy: adminUser.id,
            title: 'Welcome to English101! 🎉',
            message: 'We\'re excited to have you here. Start your learning journey by taking the placement test to discover your current level.',
            type: 'info',
            link: '/placement-test',
            read: false,
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
        },
        {
            userId: testUser.id,
            sentBy: adminUser.id,
            title: 'Great Progress! ⭐',
            message: 'You\'ve completed 5 activities this week. Keep up the excellent work!',
            type: 'success',
            link: '/english/progress',
            read: false,
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
        },
        {
            userId: testUser.id,
            sentBy: adminUser.id,
            title: 'New Content Available 📚',
            message: 'We\'ve added new reading exercises for B1 level. Check them out in the Reading section!',
            type: 'info',
            link: '/english/reading',
            read: true,
            readAt: new Date(Date.now() - 1000 * 60 * 60 * 12), // 12 hours ago
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 18), // 18 hours ago
        },
        {
            userId: testUser.id,
            sentBy: adminUser.id,
            title: 'Daily Reminder 💪',
            message: 'Don\'t forget to practice today! Even 10 minutes of practice can make a difference.',
            type: 'info',
            link: '/english/dashboard',
            read: false,
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6), // 6 hours ago
        },
        {
            userId: testUser.id,
            sentBy: adminUser.id,
            title: 'Achievement Unlocked! 🏆',
            message: 'Congratulations! You\'ve reached a 7-day learning streak. You\'re on fire!',
            type: 'success',
            link: '/english/progress',
            read: true,
            readAt: new Date(Date.now() - 1000 * 60 * 60 * 3), // 3 hours ago
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4), // 4 hours ago
        },
    ];

    // Check if UserNotification model exists before creating
    try {
        await prisma.userNotification.createMany({
            data: sampleNotifications,
        });
        console.log('✅ Created', sampleNotifications.length, 'sample notifications');
    } catch (error: any) {
        if (error?.code === 'P2021' || error?.message?.includes('does not exist')) {
            console.warn('⚠️  UserNotification table does not exist. Run migrations first: npx prisma migrate dev');
        } else {
            console.error('❌ Error creating notifications:', error);
        }
    }

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

