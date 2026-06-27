/**
 * Seed script — populates demo data:
 * - Categories, demo teacher user, demo student user
 * - 3 demo courses with chapters and lessons
 * - GD Topics, Aptitude Questions, Company Kits
 *
 * Run: npx ts-node --project tsconfig.json src/scripts/seed.ts
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { env } from '../config/env';
import { User } from '../models/User';
import { Course } from '../models/Course';
import { Chapter } from '../models/Chapter';
import { Lesson } from '../models/Lesson';
import { Category } from '../models/Category';
import { GDTopic, AptitudeQuestion, CompanyKit } from '../models/placement.model';

async function seed() {
  console.log('🌱 Connecting to MongoDB...');
  await mongoose.connect(env.MONGODB_URI);
  console.log('✅ Connected');

  // ── Categories ─────────────────────────────────────────────────────────────
  const categories = await Promise.all([
    Category.findOneAndUpdate({ slug: 'web-development' }, { name: 'Web Development', slug: 'web-development', icon: '🌐' }, { upsert: true, new: true }),
    Category.findOneAndUpdate({ slug: 'data-science' }, { name: 'Data Science', slug: 'data-science', icon: '📊' }, { upsert: true, new: true }),
    Category.findOneAndUpdate({ slug: 'ai-ml' }, { name: 'AI & Machine Learning', slug: 'ai-ml', icon: '🤖' }, { upsert: true, new: true }),
  ]);
  console.log('✅ Categories seeded');

  // ── Users ──────────────────────────────────────────────────────────────────
  const adminPass = await bcrypt.hash('Admin1234', 12);
  const teacherPass = await bcrypt.hash('Teacher1234', 12);
  const studentPass = await bcrypt.hash('Student1234', 12);

  await User.findOneAndUpdate(
    { email: 'admin@lms.com' },
    { name: 'Admin User', email: 'admin@lms.com', password: adminPass, role: 'admin', isEmailVerified: true },
    { upsert: true, new: true }
  );

  const teacher = await User.findOneAndUpdate(
    { email: 'teacher@lms.com' },
    { name: 'John Teacher', email: 'teacher@lms.com', password: teacherPass, role: 'teacher', isEmailVerified: true },
    { upsert: true, new: true }
  )!;

  await User.findOneAndUpdate(
    { email: 'student@lms.com' },
    { name: 'Jane Student', email: 'student@lms.com', password: studentPass, role: 'student', isEmailVerified: true },
    { upsert: true, new: true }
  );

  console.log('✅ Users seeded');
  console.log('   Admin:   admin@lms.com / Admin1234');
  console.log('   Teacher: teacher@lms.com / Teacher1234');
  console.log('   Student: student@lms.com / Student1234');

  // ── Courses ────────────────────────────────────────────────────────────────
  const courseDefs = [
    {
      title: 'Complete React Developer Course 2024',
      slug: 'complete-react-developer-2024',
      description: 'Master React from beginner to advanced. Learn hooks, context, Redux Toolkit, React Query, TypeScript, and build real-world projects.',
      shortDescription: 'Master React with hooks, TypeScript, and modern tooling',
      category: categories[0]!._id,
      level: 'intermediate' as const,
      price: 49,
      tags: ['react', 'javascript', 'typescript', 'frontend'],
      chapters: [
        { title: 'Getting Started with React', lessons: ['Introduction to React', 'Setting up the Development Environment', 'Your First React Component'] },
        { title: 'React Hooks Deep Dive', lessons: ['useState and useEffect', 'useContext and useReducer', 'Custom Hooks'] },
        { title: 'State Management', lessons: ['Redux Toolkit Basics', 'Async Thunks', 'React Query for Server State'] },
      ]
    },
    {
      title: 'Python for Data Science & Machine Learning',
      slug: 'python-data-science-ml',
      description: 'Learn Python, NumPy, Pandas, Matplotlib, Scikit-learn, and TensorFlow. Build real ML models and data pipelines.',
      shortDescription: 'From Python basics to ML models — complete guide',
      category: categories[1]!._id,
      level: 'beginner' as const,
      price: 39,
      tags: ['python', 'data-science', 'machine-learning', 'pandas'],
      chapters: [
        { title: 'Python Fundamentals', lessons: ['Python Basics', 'Data Structures', 'Functions and OOP'] },
        { title: 'Data Analysis with Pandas', lessons: ['DataFrames', 'Data Cleaning', 'EDA and Visualization'] },
        { title: 'Machine Learning', lessons: ['Supervised Learning', 'Model Evaluation', 'Neural Networks with TensorFlow'] },
      ]
    },
    {
      title: 'Full Stack Web Development Bootcamp',
      slug: 'full-stack-web-dev-bootcamp',
      description: 'Build complete web applications using Node.js, Express, MongoDB, and React. Deploy to production with Docker and cloud services.',
      shortDescription: 'Build full-stack apps with MERN stack',
      category: categories[0]!._id,
      level: 'advanced' as const,
      price: 0,
      tags: ['nodejs', 'express', 'mongodb', 'react', 'fullstack'],
      chapters: [
        { title: 'Backend with Node.js', lessons: ['Express Fundamentals', 'REST APIs', 'MongoDB & Mongoose'] },
        { title: 'Frontend with React', lessons: ['React Setup', 'Component Architecture', 'API Integration'] },
        { title: 'Deployment', lessons: ['Docker Basics', 'CI/CD Pipeline', 'Deploy to Cloud'] },
      ]
    },
  ];

  for (const cd of courseDefs) {
    const existing = await Course.findOne({ slug: cd.slug });
    if (existing) { console.log(`   ⏭ Course already exists: ${cd.title}`); continue; }

    // Create course WITHOUT chapters first (chapters field is ObjectId refs)
    const course = await Course.create({
      title: cd.title,
      slug: cd.slug,
      description: cd.description,
      shortDescription: cd.shortDescription,
      category: cd.category,
      level: cd.level,
      price: cd.price,
      currency: 'USD',
      tags: cd.tags,
      instructor: teacher._id,
      thumbnail: 'https://placehold.co/1280x720/667eea/ffffff?text=' + encodeURIComponent(cd.title.substring(0, 20)),
      requirements: ['Basic programming knowledge', 'A computer with internet access'],
      outcomes: ['Build real-world projects', 'Understand core concepts deeply', 'Land a job in tech'],
      status: 'published',
      certificate: true,
      chapters: [], // will be pushed after creation
    });

    let totalLessons = 0;
    let totalDuration = 0;
    const chapterIds = [];

    for (let ci = 0; ci < cd.chapters.length; ci++) {
      const chDef = cd.chapters[ci]!;
      const chapter = await Chapter.create({
        courseId: course._id,
        title: chDef.title,
        order: ci + 1,
        isLocked: false,
        lessons: [],
      });

      const lessonIds = [];
      for (let li = 0; li < chDef.lessons.length; li++) {
        const lessonTitle = chDef.lessons[li]!;
        const duration = 600 + Math.floor(Math.random() * 1200);
        const lesson = await Lesson.create({
          courseId: course._id,
          chapterId: chapter._id,
          title: lessonTitle,
          type: 'video',
          order: li + 1,
          isFree: li === 0,
          content: {
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
            duration,
            textContent: `# ${lessonTitle}\n\nThis lesson covers ${lessonTitle.toLowerCase()}. Watch the video to learn more.`,
          },
        });
        lessonIds.push(lesson._id);
        totalLessons++;
        totalDuration += duration;
      }

      await Chapter.findByIdAndUpdate(chapter._id, { lessons: lessonIds });
      chapterIds.push(chapter._id);
    }

    await Course.findByIdAndUpdate(course._id, {
      chapters: chapterIds,
      totalLessons,
      totalDuration: Math.round(totalDuration / 60),
    });

    console.log(`✅ Course: ${cd.title} (${totalLessons} lessons)`);
  }

  // ── GD Topics ───────────────────────────────────────────────────────────────
  const gdTopics = [
    { title: 'Artificial Intelligence: Boon or Bane?', category: 'Technology', difficulty: 'medium', description: 'Discuss the impact of AI on society, jobs, and human creativity.', keyPoints: ['AI replacing jobs', 'Ethical concerns', 'Productivity gains', 'Human-AI collaboration'] },
    { title: 'Work From Home vs Office Culture', category: 'Business', difficulty: 'easy', description: 'Debate the merits of remote work versus in-office collaboration.', keyPoints: ['Productivity differences', 'Work-life balance', 'Team collaboration', 'Infrastructure costs'] },
    { title: 'Cryptocurrency: Future of Finance?', category: 'Finance', difficulty: 'hard', description: 'Explore whether crypto can replace traditional banking systems.', keyPoints: ['Decentralization', 'Volatility risks', 'Regulatory challenges', 'Blockchain technology'] },
    { title: 'Social Media: Connecting or Isolating?', category: 'Society', difficulty: 'easy', description: 'Examine the social and psychological effects of social media platforms.', keyPoints: ['Mental health impact', 'Filter bubbles', 'Community building', 'Misinformation'] },
    { title: 'Electric Vehicles and the Future of Transport', category: 'Technology', difficulty: 'medium', description: 'Discuss EV adoption, infrastructure challenges, and environmental impact.', keyPoints: ['Carbon footprint', 'Battery technology', 'Charging infrastructure', 'Cost parity'] },
  ];

  for (const topic of gdTopics) {
    await GDTopic.findOneAndUpdate({ title: topic.title }, topic, { upsert: true });
  }
  console.log('✅ GD Topics seeded');

  // ── Aptitude Questions ──────────────────────────────────────────────────────
  const aptitudeQuestions = [
    // Quantitative
    { category: 'quantitative', question: 'A train travels 360 km in 4 hours. What is its speed in km/h?', options: ['80', '90', '100', '110'], correctAnswer: '90', difficulty: 'easy' },
    { category: 'quantitative', question: 'If 15% of a number is 45, what is 30% of that number?', options: ['60', '75', '90', '105'], correctAnswer: '90', difficulty: 'easy' },
    { category: 'quantitative', question: 'The ratio of boys to girls in a class is 3:2. If there are 30 students, how many are boys?', options: ['12', '15', '18', '20'], correctAnswer: '18', difficulty: 'easy' },
    { category: 'quantitative', question: 'What is the compound interest on ₹10,000 at 10% p.a. for 2 years?', options: ['₹2000', '₹2100', '₹2200', '₹2500'], correctAnswer: '₹2100', difficulty: 'medium' },
    { category: 'quantitative', question: 'A can do a work in 12 days, B in 15 days. Together they can do it in?', options: ['6.67 days', '7.5 days', '8 days', '6 days'], correctAnswer: '6.67 days', difficulty: 'medium' },
    // Logical
    { category: 'logical', question: 'Complete the series: 2, 6, 12, 20, 30, ?', options: ['40', '42', '44', '45'], correctAnswer: '42', difficulty: 'easy' },
    { category: 'logical', question: 'If APPLE = 50, MANGO = 50, then ORANGE = ?', options: ['60', '63', '65', '70'], correctAnswer: '60', difficulty: 'medium' },
    { category: 'logical', question: 'All cats are animals. Some animals are wild. Therefore?', options: ['All cats are wild', 'Some cats may be wild', 'No cats are wild', 'Cannot be determined'], correctAnswer: 'Cannot be determined', difficulty: 'medium' },
    { category: 'logical', question: 'Find the odd one out: 3, 5, 7, 9, 11', options: ['3', '5', '9', '11'], correctAnswer: '9', difficulty: 'easy' },
    { category: 'logical', question: 'If yesterday was Monday, what day will be after 3 days from tomorrow?', options: ['Friday', 'Saturday', 'Sunday', 'Thursday'], correctAnswer: 'Friday', difficulty: 'easy' },
    // Verbal
    { category: 'verbal', question: 'Choose the synonym of "GREGARIOUS"', options: ['Solitary', 'Sociable', 'Serious', 'Arrogant'], correctAnswer: 'Sociable', difficulty: 'medium' },
    { category: 'verbal', question: 'Choose the antonym of "EPHEMERAL"', options: ['Temporary', 'Fleeting', 'Permanent', 'Transient'], correctAnswer: 'Permanent', difficulty: 'medium' },
    { category: 'verbal', question: 'Fill the blank: The scientist made a __ discovery that changed everything.', options: ['trivial', 'banal', 'groundbreaking', 'ordinary'], correctAnswer: 'groundbreaking', difficulty: 'easy' },
  ];

  for (const q of aptitudeQuestions) {
    await AptitudeQuestion.findOneAndUpdate({ question: q.question }, q, { upsert: true });
  }
  console.log('✅ Aptitude Questions seeded');

  // ── Company Kits ────────────────────────────────────────────────────────────
  const companies = [
    {
      name: 'Google',
      commonQuestions: [
        { question: 'Design a URL shortening service like bit.ly', category: 'System Design' },
        { question: 'Implement LRU Cache', category: 'Data Structures' },
        { question: 'Find the maximum subarray sum (Kadane\'s Algorithm)', category: 'Algorithms' },
        { question: 'Tell me about a time you had a conflict with a teammate', category: 'Behavioral' },
      ],
      tips: ['Focus on clarifying questions', 'Think aloud during coding', 'Discuss trade-offs', 'Practice on leetcode medium/hard'],
      requiredSkills: ['Algorithms', 'Data Structures', 'System Design', 'Problem Solving', 'Communication'],
      interviewProcess: '6 rounds: Phone screen → 2 technical → System design → Googleyness → Team match',
    },
    {
      name: 'Microsoft',
      commonQuestions: [
        { question: 'Reverse a linked list', category: 'Data Structures' },
        { question: 'Design a file system', category: 'System Design' },
        { question: 'Binary tree level order traversal', category: 'Algorithms' },
        { question: 'Why do you want to work at Microsoft?', category: 'Behavioral' },
      ],
      tips: ['Strong CS fundamentals', 'Show growth mindset', 'Know Microsoft products', 'Practice OOP design'],
      requiredSkills: ['C++/Java/Python', 'OOP', 'System Design', 'Cloud (Azure)', 'SQL'],
      interviewProcess: '4-5 rounds: Recruiter → 3-4 technical → As Appropriate (AA) round',
    },
    {
      name: 'Amazon',
      commonQuestions: [
        { question: 'Design Amazon\'s recommendation system', category: 'System Design' },
        { question: 'Tell me about your most challenging project', category: 'Behavioral' },
        { question: 'Two Sum problem variants', category: 'Algorithms' },
        { question: 'Describe a time you took ownership of a project', category: 'Leadership Principles' },
      ],
      tips: ['Study Amazon Leadership Principles deeply', 'Use STAR format for behavioral', 'Every answer should tie to LPs', 'Show customer obsession'],
      requiredSkills: ['Leadership Principles', 'Algorithms', 'System Design', 'AWS', 'Distributed Systems'],
      interviewProcess: '5-6 rounds focused on Leadership Principles + technical assessments',
    },
  ];

  for (const co of companies) {
    await CompanyKit.findOneAndUpdate({ name: co.name }, co, { upsert: true });
  }
  console.log('✅ Company Kits seeded (Google, Microsoft, Amazon)');

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📋 Login credentials:');
  console.log('   Admin:   admin@lms.com    / Admin1234   → /admin/dashboard');
  console.log('   Teacher: teacher@lms.com  / Teacher1234 → /teacher/dashboard');
  console.log('   Student: student@lms.com  / Student1234 → /dashboard');
  console.log('\n🎓 3 courses created and published, ready to enroll!');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => { console.error('❌ Seed failed:', err); process.exit(1); });
