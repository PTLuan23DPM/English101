# English101 - English Learning Platform

A comprehensive English learning platform built with Next.js, featuring AI-powered writing assessment, progress tracking, and personalized learning paths.

## 🚀 Features

- **Placement Test**: Automated CEFR level assessment (A1-C2)
- **Skill-based Learning**: Reading, Writing, Listening, Speaking, Grammar, Vocabulary
- **AI Writing Scorer**: Keras-based model for automated essay grading
- **Progress Tracking**: Streak tracking, unit progress, and detailed analytics
- **AI Assistant**: Rule-based assistant for grammar, vocabulary, and writing help
- **Authentication**: NextAuth.js with Google OAuth and email/password
- **Dashboard**: Real-time statistics, charts, and activity tracking

## 🛠️ Tech Stack

### Frontend
- **Next.js 15.5** (App Router)
- **React 19**
- **TypeScript**
- **Tailwind CSS 4**
- **Recharts** (Data visualization)
- **Sonner** (Toast notifications)

### Backend
- **Next.js API Routes**
- **NextAuth.js 4.24** (Authentication)
- **Prisma ORM** (Database)
- **PostgreSQL** (Database)
- **Resend** (Email service)

### AI/ML
- **Python Flask** (Writing scorer service)
- **TensorFlow/Keras** (ML model)
- **LanguageTool API** (Grammar checking)

## 📋 Prerequisites

- Node.js 20+ 
- PostgreSQL 16+
- Python 3.11+ (for Python service)
- Docker & Docker Compose (optional)

## 🔧 Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd English101
```

### 2. Install dependencies

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

# Python Service (optional)
PYTHON_SERVICE_URL="http://localhost:5001"

# Node Environment
NODE_ENV="development"
```

### 4. Set up database

```bash
# Run migrations
npx prisma migrate dev

# Seed database (optional)
npm run db:seed
```

### 5. Start services

#### Option A: Using Docker Compose (Recommended)

```bash
# Start PostgreSQL and Python service
docker-compose up -d

# Start Next.js dev server
npm run dev
```

#### Option B: Manual Setup

```bash
# Start PostgreSQL (if not using Docker)
# ... start PostgreSQL locally

# Start Python service (optional)
cd python-services
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python writing_scorer.py

# Start Next.js dev server
npm run dev
```

## 📁 Project Structure

```
English101/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes
│   │   ├── authentication/   # Auth pages
│   │   ├── english/          # Main app pages
│   │   └── components/       # Shared components
│   ├── lib/                   # Utilities
│   │   ├── auth.ts           # NextAuth config
│   │   ├── prisma.ts         # Prisma client
│   │   ├── email.ts          # Email service
│   │   ├── env.ts            # Environment validation
│   │   └── error-handler.ts  # Error handling
│   └── components/           # React components
├── server/                    # Server services
│   └── services/             # Business logic
├── prisma/                    # Database
│   ├── schema.prisma         # Prisma schema
│   └── migrations/           # Database migrations
├── python-services/           # Python Flask service
│   ├── writing_scorer.py     # Writing scorer API
│   └── requirements.txt      # Python dependencies
├── exercises/                 # Exercise JSON files
└── docker-compose.yml         # Docker configuration
```

## 🚀 Development

### Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Run database migrations

```bash
npx prisma migrate dev
```

### Generate Prisma client

```bash
npx prisma generate
```

### View database in Prisma Studio

```bash
npx prisma studio
```

## 📚 API Documentation

API documentation is available at `/api-docs` when running the development server.

### Key API Endpoints

#### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/verify-otp` - Verify OTP
- `POST /api/auth/reset-password` - Reset password

#### Activities
- `GET /api/{skill}/activities` - List activities (reading, writing, listening, speaking)
- `GET /api/{skill}/[activityId]` - Get activity details
- `POST /api/{skill}/[activityId]/submit` - Submit answers

#### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics
- `GET /api/progress/stats` - Get progress statistics

#### AI
- `POST /api/ai/assistant` - AI assistant chat

## 🧪 Testing

### Environment Variables Validation

The app validates environment variables on startup. Missing or invalid variables will be logged.

### Development Mode

In development mode:
- OTP codes are included in API responses
- Email service logs to console if not configured
- Detailed error messages are shown

## 🐳 Docker

### Build and run with Docker Compose

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Services

- **PostgreSQL**: Port 5432
- **Python Service**: Port 5001

## 📧 Email Configuration

### Using Resend (Recommended)

The application uses [Resend](https://resend.com) for sending password reset OTP emails.

#### Setup Steps:

1. **Sign up at [resend.com](https://resend.com)**
2. **Get your API key** from the dashboard
3. **Add to `.env`**:
   ```env
   RESEND_API_KEY="re_..."
   FROM_EMAIL="onboarding@resend.dev"  # For testing (default)
   # OR use your verified domain:
   # FROM_EMAIL="noreply@yourdomain.com"
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
  - If email fails, error is logged but success is still returned (security)

#### Testing Email:

For testing, you can use Resend's default test email `onboarding@resend.dev` which works with any API key. For production, you should verify your own domain in Resend.

## 🔐 Security

- Password hashing with bcryptjs
- OTP-based password reset (15-minute expiry)
- JWT-based sessions (30-day expiry)
- Environment variable validation
- SQL injection protection (Prisma)
- XSS protection (Next.js built-in)

## 📊 Database Schema

See `prisma/schema.prisma` for the complete database schema.

Key models:
- `User` - User accounts and profiles
- `Activity` - Learning activities
- `Question` - Activity questions
- `Attempt` - User attempts
- `Submission` - Answer submissions
- `UserProgress` - Progress tracking
- `PasswordReset` - OTP management

## 🤖 AI Features

### Writing Scorer

The Python service provides:
- Automated essay scoring (0-10 scale)
- CEFR level conversion
- Detailed feedback (Task Response, Coherence, Lexical Resource, Grammar)
- Grammar checking (LanguageTool integration)

### AI Assistant

Rule-based assistant for:
- Grammar help
- Vocabulary explanations
- Writing tips
- Pronunciation guidance

## 🚢 Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Docker

```bash
# Build production image
docker build -t english101 .

# Run container
docker run -p 3000:3000 --env-file .env english101
```

## 📝 License

This project is private and proprietary.

## 🤝 Contributing

This is a private project. Contributions are not accepted at this time.

## 📞 Support

For issues and questions, please contact the development team.

---

Built with ❤️ using Next.js, Prisma, and Python
