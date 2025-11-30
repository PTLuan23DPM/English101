# English101 - Comprehensive English Learning Platform

A modern, AI-powered English learning platform designed to help learners master English from beginner to advanced levels (CEFR A1-C2). Built with cutting-edge technologies for an immersive and personalized learning experience.

![Next.js](https://img.shields.io/badge/Next.js-15.5-black)
![React](https://img.shields.io/badge/React-19.1-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Python](https://img.shields.io/badge/Python-3.11-green)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue)

## 🌟 Features

### Core Learning Skills
- **📖 Reading**: Comprehension exercises with vocabulary building
- **✍️ Writing**: AI-powered essay scoring with detailed feedback
- **🎧 Listening**: Interactive listening exercises with transcripts
- **🎤 Speaking**: Practice with role-play, shadowing, and dubbing challenges
- **📚 Grammar**: Structured lessons from A1 to C1 levels
- **📝 Vocabulary**: Word lists with instant lookup and pronunciation

### AI-Powered Features
- **AI Writing Scorer**: Automated essay grading (0-10 scale) with detailed feedback on:
  - Task Response/Achievement
  - Coherence & Cohesion
  - Lexical Resource
  - Grammatical Range & Accuracy
- **AI Speaking Scorer**: Real-time pronunciation and content accuracy assessment
  - Whisper ASR for transcription
  - DTW (Dynamic Time Warping) for rhythm comparison
  - Semantic similarity for dubbing challenges
- **Instant Lookup**: Double-click any word to see definition, pronunciation, and examples
- **AI Assistant**: Grammar help, vocabulary explanations, and writing tips

### User Experience
- **Placement Test**: Automated CEFR level assessment (A1-C2)
- **Progress Tracking**: Streak tracking, unit progress, and detailed analytics
- **Dashboard**: Real-time statistics, charts, and activity tracking
- **Goals & Targets**: Set and track learning goals
- **Notifications**: Stay updated with learning reminders and achievements
- **Profile Management**: Customize your learning profile and preferences

## 🛠️ Tech Stack

### Frontend
- **Next.js 15.5** (App Router with Turbopack)
- **React 19.1** (Latest features)
- **TypeScript 5.0** (Type safety)
- **Tailwind CSS 4** (Styling)
- **Recharts** (Data visualization)
- **Sonner** (Toast notifications)

### Backend
- **Next.js API Routes** (Serverless functions)
- **NextAuth.js 4.24** (Authentication)
- **Prisma ORM 6.19** (Database)
- **PostgreSQL 16** (Database)
- **Resend** (Email service)

### AI/ML Services
- **Python Flask** (Microservice architecture)
- **TensorFlow/Keras** (Deep learning models)
- **OpenAI Whisper** (Speech recognition)
- **Librosa** (Audio processing)
- **FastDTW** (Rhythm comparison)
- **Scipy** (Scientific computing)
- **LanguageTool API** (Grammar checking)
- **NLTK** (Natural language processing)

### DevOps
- **Docker & Docker Compose** (Containerization)
- **GitHub Actions** (CI/CD)
- **Google Cloud Run** (Deployment)
- **Cloud SQL** (Managed PostgreSQL)

## 📋 Prerequisites

- **Node.js** 20+ 
- **PostgreSQL** 16+
- **Python** 3.11+ (for AI services)
- **Docker & Docker Compose** (optional, recommended)
- **FFmpeg** (for audio processing in speaking exercises)

## 🔧 Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd English101
```

### 2. Install Node.js dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://app:app@localhost:5432/english_app"

# NextAuth
NEXTAUTH_SECRET="your-secret-key-min-32-chars"
NEXTAUTH_URL="http://localhost:3000"

# Google OAuth (optional)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Email (Resend)
RESEND_API_KEY="your-resend-api-key"
FROM_EMAIL="noreply@yourdomain.com"
FROM_NAME="English101"

# Python AI Service
SCORING_SERVICE_URL="http://localhost:5001"
PYTHON_SERVICE_URL="http://localhost:5001"

# Node Environment
NODE_ENV="development"
```

### 4. Set up database

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed database (optional)
npm run db:seed
```

### 5. Set up Python service

```bash
cd python-services

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Download NLTK data (if needed)
python setup_nltk.py
```

### 6. Start services

#### Option A: Using Docker Compose (Recommended)

```bash
# Start PostgreSQL and Python service
docker-compose up -d

# Start Next.js dev server
npm run dev
```

#### Option B: Manual Setup

```bash
# Terminal 1: Start PostgreSQL (if not using Docker)
# ... start PostgreSQL locally

# Terminal 2: Start Python service
cd python-services
python writing_scorer.py  # Writing scorer on port 5001
python speaking_scorer.py  # Speaking scorer on port 5002 (if separate)

# Terminal 3: Start Next.js dev server
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
English101/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes
│   │   │   ├── auth/          # Authentication endpoints
│   │   │   ├── writing/       # Writing exercise APIs
│   │   │   ├── reading/       # Reading exercise APIs
│   │   │   ├── listening/     # Listening exercise APIs
│   │   │   ├── speaking/      # Speaking exercise APIs
│   │   │   ├── grammar/       # Grammar lesson APIs
│   │   │   └── dashboard/     # Dashboard APIs
│   │   ├── english/           # Main learning pages
│   │   │   ├── dashboard/     # User dashboard
│   │   │   ├── writing/       # Writing exercises
│   │   │   ├── reading/        # Reading exercises
│   │   │   ├── listening/     # Listening exercises
│   │   │   ├── speaking/       # Speaking exercises
│   │   │   ├── grammar/        # Grammar lessons
│   │   │   └── vocabulary/     # Vocabulary management
│   │   ├── authentication/     # Auth pages
│   │   └── admin-dashboard/    # Admin panel
│   ├── components/            # React components
│   │   ├── InstantLookup.tsx  # Word lookup feature
│   │   ├── AIAssistant.tsx    # AI chat assistant
│   │   └── AnalyticsCharts.tsx # Data visualization
│   ├── lib/                   # Utilities
│   │   ├── auth.ts            # NextAuth config
│   │   ├── prisma.ts          # Prisma client
│   │   ├── email.ts           # Email service
│   │   └── vocabularyStorage.ts # Vocabulary storage
│   └── middleware.ts          # Next.js middleware
├── server/                     # Server services
│   ├── services/             # Business logic
│   ├── controllers/           # Request handlers
│   └── utils/                 # Server utilities
├── prisma/                     # Database
│   ├── schema.prisma          # Prisma schema
│   ├── migrations/            # Database migrations
│   └── seed.ts                # Database seeding
├── python-services/            # Python AI services
│   ├── writing_scorer.py     # Writing scoring service
│   ├── speaking_scorer.py    # Speaking scoring service
│   ├── speaking_engine.py    # Speaking analysis engine
│   ├── requirements.txt      # Python dependencies
│   ├── Dockerfile            # Docker configuration
│   └── ai-models/            # AI model files
├── exercises/                 # Exercise JSON files
│   ├── reading/              # Reading exercises
│   ├── writing/              # Writing prompts
│   ├── listening/            # Listening exercises
│   └── speaking/             # Speaking exercises
├── grammar_file/              # Grammar lesson files
├── listening_file/            # Audio files and transcripts
├── docker-compose.yml         # Docker Compose config
├── .github/
│   └── workflows/
│       └── deploy-google-cloud.yml # CI/CD pipeline
└── README.md                  # This file
```

## 🚀 Development

### Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Database commands

```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# View database in Prisma Studio
npm run db:studio

# Reset database (WARNING: deletes all data)
npm run db:reset

# Check migration status
npm run db:status
```

### Python service commands

```bash
cd python-services

# Start writing scorer
python writing_scorer.py

# Start speaking scorer
python speaking_scorer.py

# Or use convenience scripts
# Windows:
start-service.bat
# Linux/Mac:
./start-service.sh
```

## 📚 API Documentation

### Key API Endpoints

#### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/verify-otp` - Verify OTP
- `POST /api/auth/reset-password` - Reset password

#### Writing Exercises
- `GET /api/writing/tasks` - List writing tasks
- `POST /api/writing/score` - Score essay submission
- `POST /api/writing/complete` - Complete writing activity

#### Reading Exercises
- `GET /api/reading/tasks` - List reading tasks
- `GET /api/reading/[taskId]` - Get reading task details
- `POST /api/reading/[taskId]/submit` - Submit reading answers

#### Listening Exercises
- `GET /api/listening/lessons` - List listening lessons
- `GET /api/listening/lessons/[lessonId]` - Get lesson details
- `GET /api/listening/audio/[...path]` - Get audio file

#### Speaking Exercises
- `GET /api/speaking/conversation` - Get conversation data
- `POST /api/speaking/score` - Score speech recording
- `POST /api/speaking/complete` - Complete speaking activity
- `GET /api/speaking/audio/[...path]` - Get audio file

#### Grammar
- `GET /api/grammar/lessons` - List grammar lessons
- `GET /api/grammar/lessons/[lessonId]` - Get lesson details

#### Dashboard
- `GET /api/user/stats` - Get user statistics
- `GET /api/dashboard/stats` - Get dashboard statistics
- `GET /api/progress/stats` - Get progress statistics

#### AI Services
- `POST /api/ai/assistant` - AI assistant chat
- `GET http://localhost:5001/health` - Python service health check
- `POST http://localhost:5001/score-ai` - Score essay (Python service)
- `POST http://localhost:5001/score-speech` - Score speech (Python service)

## 🧪 Testing

### Environment Variables Validation

The app validates environment variables on startup. Missing or invalid variables will be logged.

### Development Mode

In development mode:
- OTP codes are included in API responses for testing
- Email service logs to console if not configured
- Detailed error messages are shown
- Hot reload enabled with Turbopack

## 🐳 Docker

### Build and run with Docker Compose

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild services
docker-compose up -d --build
```

### Services

- **PostgreSQL**: Port 5432
- **Python Writing Scorer**: Port 5001
- **Python Speaking Scorer**: Port 5002 (if separate)

### Dockerfile

The Python service includes a Dockerfile for containerization. The Dockerfile handles optional `ai-models` directory gracefully.

## 📧 Email Configuration

### Using Resend (Recommended)

The application uses [Resend](https://resend.com) for sending password reset OTP emails.

#### Setup Steps:

1. **Sign up at [resend.com](https://resend.com)**
2. **Get your API key** from the dashboard
3. **Add to `.env`**:
   ```env
   RESEND_API_KEY="re_..."
   FROM_EMAIL="onboarding@resend.dev"  # For testing
   FROM_NAME="English101"
   ```

#### Email Sending Behavior:

- **Development Mode** (without `RESEND_API_KEY`):
  - Emails are logged to console for testing
  - OTP is included in API response for easy testing
  
- **Development Mode** (with `RESEND_API_KEY`):
  - Emails are actually sent via Resend
  - OTP is still included in API response for testing
  
- **Production Mode**:
  - Emails are sent via Resend (requires `RESEND_API_KEY`)
  - OTP is NOT included in API response (security)

## 🔐 Security

- Password hashing with bcryptjs
- OTP-based password reset (15-minute expiry)
- JWT-based sessions (30-day expiry)
- Environment variable validation
- SQL injection protection (Prisma)
- XSS protection (Next.js built-in)
- CSRF protection (NextAuth.js)
- Secure cookie handling

## 📊 Database Schema

See `prisma/schema.prisma` for the complete database schema.

### Key Models:
- `User` - User accounts and profiles
- `Activity` - Learning activities
- `Question` - Activity questions
- `Attempt` - User attempts
- `Submission` - Answer submissions
- `UserProgress` - Progress tracking
- `UserActivity` - Activity completion records
- `UserGoal` - Learning goals
- `UserNotification` - User notifications
- `PasswordReset` - OTP management
- `GrammarPoint` - Grammar lessons
- `VocabEntry` - Vocabulary entries

## 🤖 AI Features

### Writing Scorer

The Python service provides:
- Automated essay scoring (0-10 scale)
- CEFR level conversion
- Detailed feedback on 4 criteria:
  - Task Response/Achievement
  - Coherence & Cohesion
  - Lexical Resource
  - Grammatical Range & Accuracy
- Grammar checking (LanguageTool integration)
- Multiple model support (BERT PRO, BERT Multi-task, BERT, Traditional)
- Automatic model selection

### Speaking Scorer

The Python service provides:
- Real-time speech transcription (Whisper ASR)
- Content accuracy scoring (semantic similarity)
- Pronunciation scoring (DTW rhythm comparison)
- Mode-specific adjustments:
  - Read-Along
  - Interactive Role-Play
  - Shadowing
  - Dubbing Challenge
- Audio format conversion (webm to wav)

### AI Assistant

Rule-based assistant for:
- Grammar help
- Vocabulary explanations
- Writing tips
- Pronunciation guidance

### Instant Lookup

- Double-click any word to see definition
- Phonetic transcription
- Part of speech
- Example sentences
- Audio pronunciation
- Save to vocabulary list

## 🚢 Deployment

### Google Cloud Run (Current Setup)

The project includes a GitHub Actions workflow for automated deployment to Google Cloud Run.

#### Prerequisites:
- Google Cloud Project
- Service Account with Cloud Run Admin permissions
- Cloud SQL instance
- Artifact Registry repository

#### Setup:

1. **Set up GitHub Secrets:**
   - `GCP_SA_KEY` - Service account JSON key
   - `GCP_PROJECT_ID` - Google Cloud project ID
   - `DB_CONNECTION_NAME` - Cloud SQL connection name
   - `DB_PASSWORD` - Database password
   - `GEMINI_API_KEY` - Gemini API key (if using)
   - `JWT_SECRET` - JWT secret key

2. **Push to main branch:**
   ```bash
   git push origin main
   ```

3. **Deployment will trigger automatically**

The workflow:
- Builds Docker images for Python and Node.js services
- Pushes to Artifact Registry
- Deploys to Cloud Run
- Configures environment variables
- Sets up Cloud SQL connections

### Manual Deployment

#### Vercel (Frontend)

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

#### Docker

```bash
# Build production image
docker build -t english101 .

# Run container
docker run -p 3000:3000 --env-file .env english101
```

## 🎯 Features in Detail

### Writing Exercises
- Multiple task types (essay, letter, report)
- AI-powered scoring with detailed feedback
- CEFR level assessment
- Progress tracking
- Save and review submissions

### Reading Exercises
- Multiple choice questions
- True/False questions
- Gap-fill exercises
- Vocabulary highlighting
- Progress tracking

### Listening Exercises
- Audio playback with transcripts
- Multiple choice questions
- True/False questions
- Vocabulary extraction
- Progress tracking

### Speaking Exercises
- **Read-Along**: Practice reading with audio
- **Interactive Role-Play**: Practice conversations
- **Shadowing**: Mimic native speakers
- **Dubbing Challenge**: Replace audio with your voice
- Real-time scoring and feedback

### Grammar Lessons
- Structured lessons from A1 to C1
- Interactive exercises
- Progress tracking
- Detailed explanations

### Vocabulary Management
- Instant word lookup
- Save words to personal list
- Review saved words
- Track learning progress

## 🐛 Troubleshooting

### Python Service Issues

**FFmpeg not found:**
```bash
# Windows: Download from https://ffmpeg.org/download.html
# Add to PATH

# Linux:
sudo apt-get install ffmpeg

# Mac:
brew install ffmpeg
```

**Models not loading:**
- Ensure models are in `python-services/ai-models/`
- Check file permissions
- Verify model files are complete

**Port already in use:**
- Change port in `writing_scorer.py` or `speaking_scorer.py`
- Update `SCORING_SERVICE_URL` in `.env`

### Database Issues

**Migration errors:**
```bash
# Reset database (WARNING: deletes all data)
npm run db:reset

# Or manually fix migrations
npx prisma migrate resolve --applied <migration-name>
```

**Connection errors:**
- Verify `DATABASE_URL` in `.env`
- Check PostgreSQL is running
- Verify credentials

### Next.js Issues

**Build errors:**
```bash
# Clear cache
rm -rf .next
npm run build
```

**Type errors:**
```bash
# Regenerate Prisma client
npx prisma generate
```

## 📝 License

This project is private and proprietary.

## 🤝 Contributing

This is a private project. Contributions are not accepted at this time.

## 📞 Support

For issues and questions, please contact the development team.

## 🙏 Acknowledgments

- Next.js team for the amazing framework
- Prisma team for the excellent ORM
- TensorFlow team for ML capabilities
- OpenAI for Whisper ASR
- All open-source contributors

---

Built with ❤️ using Next.js, React, TypeScript, Prisma, PostgreSQL, and Python

**Version**: 0.1.0  
**Last Updated**: 2024
