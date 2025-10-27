"use client";

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from 'recharts';

interface SkillData {
  skill: string;
  score: number;
  fullMark: number;
}

interface ProgressData {
  date: string;
  score: number;
}

export function SkillsRadarChart({ data }: { data: SkillData[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={data}>
        <PolarGrid stroke="#e5e7eb" />
        <PolarAngleAxis 
          dataKey="skill" 
          tick={{ fill: '#64748b', fontSize: 12 }}
        />
        <PolarRadiusAxis 
          angle={90} 
          domain={[0, 100]}
          tick={{ fill: '#64748b', fontSize: 11 }}
        />
        <Radar
          name="Your Score"
          dataKey="score"
          stroke="#6366f1"
          fill="#6366f1"
          fillOpacity={0.6}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}

export function StrengthWeaknessBar({ data }: { data: SkillData[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis 
          dataKey="skill" 
          tick={{ fill: '#64748b', fontSize: 12 }}
        />
        <YAxis 
          domain={[0, 100]}
          tick={{ fill: '#64748b', fontSize: 11 }}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px'
          }}
        />
        <Legend />
        <Bar dataKey="score" fill="#6366f1" name="Score" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ProgressLineChart({ data }: { data: ProgressData[] }) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis 
          dataKey="date" 
          tick={{ fill: '#64748b', fontSize: 11 }}
        />
        <YAxis 
          domain={[0, 100]}
          tick={{ fill: '#64748b', fontSize: 11 }}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px'
          }}
        />
        <Line 
          type="monotone" 
          dataKey="score" 
          stroke="#6366f1" 
          strokeWidth={2}
          dot={{ fill: '#6366f1', r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// Usage Example:
export function StudentAnalytics() {
  const skillsData = [
    { skill: 'Listening', score: 85, fullMark: 100 },
    { skill: 'Reading', score: 78, fullMark: 100 },
    { skill: 'Writing', score: 65, fullMark: 100 },
    { skill: 'Speaking', score: 72, fullMark: 100 },
    { skill: 'Grammar', score: 88, fullMark: 100 },
    { skill: 'Vocabulary', score: 82, fullMark: 100 },
  ];

  const progressData = [
    { date: 'Week 1', score: 65 },
    { date: 'Week 2', score: 68 },
    { date: 'Week 3', score: 72 },
    { date: 'Week 4', score: 75 },
    { date: 'Week 5', score: 78 },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
      <div className="card">
        <h3 style={{ marginBottom: '16px' }}>Skills Overview</h3>
        <SkillsRadarChart data={skillsData} />
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '16px' }}>Strengths & Weaknesses</h3>
        <StrengthWeaknessBar data={skillsData} />
      </div>

      <div className="card" style={{ gridColumn: '1 / -1' }}>
        <h3 style={{ marginBottom: '16px' }}>Progress Over Time</h3>
        <ProgressLineChart data={progressData} />
      </div>
    </div>
  );
}

