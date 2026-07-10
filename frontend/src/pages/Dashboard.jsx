import React from 'react';
import { FlaskConical, Code2, Bug, Camera, ArrowRight } from 'lucide-react';
import './Dashboard.css';

const features = [
  { id: 'testcases',  icon: FlaskConical, color: '#1a56db', bg: '#eff6ff',  border: '#bfdbfe', title: 'Test Case Generator',       desc: 'Generate positive, negative, validation & boundary test cases — including from UI screenshots — with sequential numbering, edit & delete.', actions: ['Generate from text','Screenshot → cases','Edit & delete'] },
  { id: 'automation', icon: Code2,        color: '#0284c7', bg: '#e0f2fe',  border: '#bae6fd', title: 'Automation Scripts',         desc: 'Convert your test cases into ready-to-run Playwright or Selenium JavaScript scripts.', actions: ['Playwright JS','Selenium JS','Download ZIP'] },
  { id: 'bugreports', icon: Bug,          color: '#1344b4', bg: '#eff6ff',  border: '#93c5fd', title: 'Bug Report Generator',       desc: 'Create standardized bug reports with severity, priority, and reproduction steps.', actions: ['Auto severity','Steps to reproduce','Download'] },
];

const stats = [
  { label: 'Manual effort saved', value: '70%+' },
  { label: 'Script gen speed',    value: '30s'  },
  { label: 'Frameworks',          value: '2'    },
  { label: 'Export formats',      value: '2'    },
];

export default function Dashboard({ onNavigate, project }) {
  return (
    <div className="dash-page">
      {/* Hero */}
      <div className="dash-hero">
        <div className="dash-hero-blob" />
        <div className="dash-hero-eyebrow">Testing Tool{project ? ` · ${project.name}` : ''}</div>
        <h1 className="dash-hero-title">ABI-TECH QA-ENGINE</h1>
        <p className="dash-hero-sub">Generate test cases, screenshot-driven test cases, automation scripts, and bug reports in seconds. Built for QA engineers who want to move faster.</p>
      </div>

      {/* Stats */}
      <div className="stats-row dash-stats">
        {stats.map(s => (
          <div className="stat-card" key={s.label}>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Feature Cards */}
      <div className="dash-feature-list">
        {features.map(f => {
          const Icon = f.icon;
          return (
            <div key={f.id} className="card dash-feature-card" style={{ borderLeft: `4px solid ${f.color}` }} onClick={() => onNavigate(f.id)}>
              <div className="dash-feature-icon" style={{ background: f.bg, border: `1px solid ${f.border}` }}>
                <Icon size={19} color={f.color} />
              </div>
              <div className="dash-feature-body">
                <h2 style={{ marginBottom: 3 }}>{f.title}</h2>
                <p className="dash-feature-desc">{f.desc}</p>
                <div className="dash-feature-tags">
                  {f.actions.map(a => (
                    <span key={a} style={{ background: f.bg, color: f.color, border: `1px solid ${f.border}` }}>{a}</span>
                  ))}
                </div>
                <button className="btn btn-primary btn-sm" style={{ background: f.color }} onClick={e => { e.stopPropagation(); onNavigate(f.id); }}>
                  Open <ArrowRight size={12} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Phase 2 */}
      <div className="dash-roadmap">
        <div className="dash-roadmap-body">
          <div className="dash-roadmap-eyebrow">Coming in Phase 2</div>
          <div className="dash-roadmap-text">URL-based generation · API test cases · Postman collections · Jira integration</div>
        </div>
        <div className="dash-roadmap-badge">Roadmap →</div>
      </div>
    </div>
  );
}
