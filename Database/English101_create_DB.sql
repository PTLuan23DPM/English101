Use English101;
Go

-- Core User & Authentication
CREATE TABLE users (
    user_id INT PRIMARY KEY IDENTITY(1,1),
    email NVARCHAR(255) UNIQUE NOT NULL,
    password_hash NVARCHAR(255) NOT NULL,
    username NVARCHAR(100) UNIQUE NOT NULL,
    created_at DATETIME2 DEFAULT GETDATE(),
    last_login DATETIME2
);

CREATE TABLE user_profiles (
    profile_id INT PRIMARY KEY IDENTITY(1,1),
    user_id INT NOT NULL,
    native_language NVARCHAR(50) NOT NULL,
    target_language NVARCHAR(50) NOT NULL,
    proficiency_level NVARCHAR(2) DEFAULT '0',
    timezone NVARCHAR(50),
    avatar_url NVARCHAR(500),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Learning Content
CREATE TABLE courses (
    course_id INT PRIMARY KEY IDENTITY(1,1),
    language_code NVARCHAR(10) NOT NULL,
    name NVARCHAR(100) NOT NULL,
    description NVARCHAR(MAX),
    difficulty NVARCHAR(2) DEFAULT '0', -- 0: lowest
    created_at DATETIME2 DEFAULT GETDATE()
);

CREATE TABLE units (
    unit_id INT PRIMARY KEY IDENTITY(1,1),
    course_id INT NOT NULL,
    order_num INT NOT NULL,
    title NVARCHAR(200) NOT NULL,
    theme NVARCHAR(100),
    FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE
);

CREATE TABLE lessons (
    lesson_id INT PRIMARY KEY IDENTITY(1,1),
    unit_id INT NOT NULL,
    order_num INT NOT NULL,
    title NVARCHAR(200) NOT NULL,
    FOREIGN KEY (unit_id) REFERENCES units(unit_id) ON DELETE CASCADE
);

CREATE TABLE exercise_types (
    type_id INT PRIMARY KEY IDENTITY(1,1),
    type_name NVARCHAR(50) UNIQUE NOT NULL,
    description NVARCHAR(255)
);

CREATE TABLE exercises (
    exercise_id INT PRIMARY KEY IDENTITY(1,1),
    lesson_id INT NOT NULL,
    type_id INT NOT NULL,
    content NVARCHAR(MAX) NOT NULL, -- JSON: {"question": "...", "options": ["...", "...", "..."]}
    correct_answer NVARCHAR(MAX) NOT NULL, -- JSON: {"answer": ["..."]}
    difficulty NVARCHAR(2) DEFAULT '0',
    order_num INT NOT NULL,
    FOREIGN KEY (lesson_id) REFERENCES lessons(lesson_id) ON DELETE CASCADE,
    FOREIGN KEY (type_id) REFERENCES exercise_types(type_id)
);

-- Progress Tracking
CREATE TABLE user_progress (
    progress_id INT PRIMARY KEY IDENTITY(1,1),
    user_id INT NOT NULL,
    course_id INT NOT NULL,
    current_lesson_id INT,
    streak_days INT DEFAULT 0,
    last_practice_date DATE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(course_id),
    FOREIGN KEY (current_lesson_id) REFERENCES lessons(lesson_id)
);

CREATE TABLE lesson_completions (
    completion_id INT PRIMARY KEY IDENTITY(1,1),
    user_id INT NOT NULL,
    lesson_id INT NOT NULL,
    completed_at DATETIME2 DEFAULT GETDATE(),
    score INT,
    time_spent INT, -- in seconds
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (lesson_id) REFERENCES lessons(lesson_id)
);

CREATE TABLE exercise_attempts (
    attempt_id INT PRIMARY KEY IDENTITY(1,1),
    user_id INT NOT NULL,
    exercise_id INT NOT NULL,
    answer NVARCHAR(MAX),
    is_correct BIT NOT NULL,
    attempted_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (exercise_id) REFERENCES exercises(exercise_id)
);

CREATE TABLE user_vocabulary (
    vocabulary_id INT PRIMARY KEY IDENTITY(1,1),
    user_id INT NOT NULL,
    word NVARCHAR(200) NOT NULL,
    proficiency_score DECIMAL(5,2) DEFAULT 0,
    last_reviewed DATETIME2,
    times_practiced INT DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE words (
    word_id INT PRIMARY KEY IDENTITY(1,1),
    word NVARCHAR(200) NOT NULL,
    language NVARCHAR(50) NOT NULL,
    translation NVARCHAR(200) NOT NULL,
    phoneme NVARCHAR(200) NOT NULL, -- pronunciation
    difficulty NVARCHAR(2) DEFAULT '0',
    part_of_speech NVARCHAR(50) -- verb, adjective, noun, etc
);

-- Content Management
CREATE TABLE audio_files (
    audio_id INT PRIMARY KEY IDENTITY(1,1),
    exercise_id INT NOT NULL,
    url NVARCHAR(500) NOT NULL,
    speaker_accent NVARCHAR(50),
    duration INT, -- in seconds
    FOREIGN KEY (exercise_id) REFERENCES exercises(exercise_id) ON DELETE CASCADE
);

CREATE TABLE hints (
    hint_id INT PRIMARY KEY IDENTITY(1,1),
    exercise_id INT NOT NULL,
    hint_text NVARCHAR(MAX) NOT NULL,
    order_num INT NOT NULL,
    FOREIGN KEY (exercise_id) REFERENCES exercises(exercise_id) ON DELETE CASCADE
);

CREATE TABLE reports (
    report_id INT PRIMARY KEY IDENTITY(1,1),
    user_id INT NOT NULL,
    exercise_id INT,
    issue_type NVARCHAR(50) NOT NULL, -- wrong answer, type, etc
    description NVARCHAR(MAX),
    created_at DATETIME2 DEFAULT GETDATE(),
    status NVARCHAR(20) DEFAULT 'pending',
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (exercise_id) REFERENCES exercises(exercise_id)
);

-- Indexes for performance
CREATE INDEX idx_user_email ON users(email);
CREATE INDEX idx_user_progress_user ON user_progress(user_id);
CREATE INDEX idx_lesson_completions_user ON lesson_completions(user_id);
CREATE INDEX idx_exercise_attempts_user ON exercise_attempts(user_id);
CREATE INDEX idx_units_course ON units(course_id);
CREATE INDEX idx_lessons_unit ON lessons(unit_id);
CREATE INDEX idx_exercises_lesson ON exercises(lesson_id);