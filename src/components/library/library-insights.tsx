'use client';

import Link from 'next/link';
import {
  LIBRARY_DEPARTMENT_SUMMARY,
  LIBRARY_EMERGING_TOPICS,
  LIBRARY_KEYWORD_TRENDS,
  LIBRARY_RECOMMENDED_READING,
  LIBRARY_YEAR_COUNTS
} from '@/components/library/library-data';
import { LibraryShell } from '@/components/library/library-shell';

const RESEARCH_GAPS = [
  'Limited research on AI ethics in education',
  'Few studies on circular economy in ESM',
  'Need for more maritime AI applications'
] as const;

const SUGGESTED_TOPICS = [
  'Explainable AI for educational systems',
  'Blockchain for supply chain transparency',
  'Renewable energy integration with IoT'
] as const;

export function LibraryInsights() {
  return (
    <LibraryShell
      activeNav="insights"
      title="Research Insights & Trends"
      description="Explore research patterns and emerging topics"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '2rem' }}>
        
        {/* Charts Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
          
          <section style={{ background: 'white', borderRadius: '1.2rem', padding: '1.5rem', boxShadow: '0 10px 25px rgba(0, 58, 143, 0.05)', border: '1px solid #F1F5F9' }}>
            <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#EFF6FF', color: '#003A8F', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="fas fa-chart-pie"></i></div>
              Projects by Department
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              {LIBRARY_DEPARTMENT_SUMMARY.map((item) => (
                <div key={item.department} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '60px', fontWeight: 700, color: '#475569', fontSize: '0.9rem' }}>{item.department}</div>
                  <div style={{ flex: 1, height: '8px', background: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(item.count, 100)}%`, height: '100%', background: 'linear-gradient(90deg, #003A8F, #3B82F6)', borderRadius: '4px' }} />
                  </div>
                  <div style={{ width: '30px', textAlign: 'right', fontWeight: 800, color: '#0F172A', fontSize: '0.9rem' }}>{item.count}</div>
                </div>
              ))}
            </div>
          </section>

          <section style={{ background: 'white', borderRadius: '1.2rem', padding: '1.5rem', boxShadow: '0 10px 25px rgba(0, 58, 143, 0.05)', border: '1px solid #F1F5F9' }}>
            <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#FEF9E6', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="fas fa-chart-bar"></i></div>
              Projects by Year
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              {LIBRARY_YEAR_COUNTS.map((item) => (
                <div key={item.year} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '60px', fontWeight: 700, color: '#475569', fontSize: '0.9rem' }}>{item.year}</div>
                  <div style={{ flex: 1, height: '8px', background: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(item.count, 112) / 1.12}%`, height: '100%', background: item.tone === 'success' ? '#10B981' : item.tone === 'muted' ? '#94A3B8' : '#F6BE00', borderRadius: '4px' }} />
                  </div>
                  <div style={{ width: '30px', textAlign: 'right', fontWeight: 800, color: '#0F172A', fontSize: '0.9rem' }}>{item.count}</div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Trends Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
          
          <section style={{ background: 'white', borderRadius: '1.2rem', padding: '1.5rem', boxShadow: '0 10px 25px rgba(0, 58, 143, 0.05)', border: '1px solid #F1F5F9' }}>
            <h3 style={{ margin: '0 0 1.2rem 0', fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#EFF6FF', color: '#003A8F', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="fas fa-tags"></i></div>
              Most Common Keywords
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
              {LIBRARY_KEYWORD_TRENDS.map((keyword) => (
                <span key={keyword.label} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '0.4rem 0.8rem', borderRadius: '1rem', fontSize: '0.85rem', fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  {keyword.label}
                  <span style={{ background: '#EFF6FF', color: '#003A8F', padding: '0.1rem 0.4rem', borderRadius: '0.4rem', fontSize: '0.75rem', fontWeight: 700 }}>{keyword.count}</span>
                </span>
              ))}
            </div>
          </section>

          <section style={{ background: 'white', borderRadius: '1.2rem', padding: '1.5rem', boxShadow: '0 10px 25px rgba(0, 58, 143, 0.05)', border: '1px solid #F1F5F9' }}>
            <h3 style={{ margin: '0 0 1.2rem 0', fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#FEF9E6', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="fas fa-arrow-trend-up"></i></div>
              Emerging Research Topics
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {LIBRARY_EMERGING_TOPICS.map((topic) => (
                <div key={topic.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem 1rem', background: '#F8FAFC', borderRadius: '0.8rem', border: '1px solid #E2E8F0' }}>
                  <strong style={{ color: '#0F172A', fontSize: '0.95rem' }}>{topic.label}</strong>
                  <span style={{ color: '#10B981', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <i className="fas fa-caret-up"></i> {topic.growth}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Gaps & Recommendations */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
          <section style={{ background: 'white', borderRadius: '1.2rem', padding: '1.5rem', boxShadow: '0 10px 25px rgba(0, 58, 143, 0.05)', border: '1px solid #F1F5F9', position: 'relative', overflow: 'hidden' }}>
            <i className="fas fa-search-minus" style={{ position: 'absolute', right: '-10px', top: '-10px', fontSize: '8rem', color: '#EFF6FF', transform: 'rotate(-15deg)' }}></i>
            <h3 style={{ margin: '0 0 1.2rem 0', fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.8rem', zIndex: 1, position: 'relative' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="fas fa-exclamation-triangle"></i></div>
              Identified Research Gaps
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', zIndex: 1, position: 'relative' }}>
              {RESEARCH_GAPS.map((item) => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.8rem', background: '#F8FAFC', borderRadius: '0.6rem', border: '1px solid #E2E8F0' }}>
                  <i className="fas fa-times-circle" style={{ color: '#F87171' }}></i>
                  <span style={{ color: '#475569', fontSize: '0.95rem', fontWeight: 600 }}>{item}</span>
                </div>
              ))}
            </div>
          </section>

          <section style={{ background: 'linear-gradient(135deg, #003A8F, #1E40AF)', borderRadius: '1.2rem', padding: '1.5rem', boxShadow: '0 10px 25px rgba(0, 58, 143, 0.1)', color: 'white', position: 'relative', overflow: 'hidden' }}>
            <i className="fas fa-lightbulb" style={{ position: 'absolute', right: '-10px', top: '-10px', fontSize: '8rem', opacity: 0.05, transform: 'rotate(15deg)' }}></i>
            <h3 style={{ margin: '0 0 1.2rem 0', fontSize: '1.2rem', fontWeight: 800, color: 'white', display: 'flex', alignItems: 'center', gap: '0.8rem', zIndex: 1, position: 'relative' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', color: '#F6BE00', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="fas fa-star"></i></div>
              Suggested Topics
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', zIndex: 1, position: 'relative' }}>
              {SUGGESTED_TOPICS.map((item) => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.8rem', background: 'rgba(255,255,255,0.05)', borderRadius: '0.6rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <i className="fas fa-check-circle" style={{ color: '#34D399' }}></i>
                  <span style={{ color: '#E2E8F0', fontSize: '0.95rem' }}>{item}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Recommended Reading */}
        <section style={{ background: 'white', borderRadius: '1.2rem', padding: '1.5rem', boxShadow: '0 10px 25px rgba(0, 58, 143, 0.05)', border: '1px solid #F1F5F9' }}>
          <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#FEF9E6', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="fas fa-book-open"></i></div>
            Recommended Reading
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {LIBRARY_RECOMMENDED_READING.map((item) => (
              <article key={item.title} style={{ background: '#F8FAFC', borderRadius: '1rem', padding: '1.5rem', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '1rem', transition: 'all 0.2s' }} onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 15px 35px rgba(0, 58, 143, 0.08)' }} onMouseOut={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}>
                <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.4 }}>{item.title}</h4>
                <p style={{ margin: 0, color: '#475569', fontSize: '0.9rem', lineHeight: 1.5, flex: 1 }}>{item.description}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                  <span style={{ display: 'inline-block', background: '#EFF6FF', color: '#003A8F', padding: '0.2rem 0.6rem', borderRadius: '0.4rem', fontSize: '0.75rem', fontWeight: 700, border: '1px solid #BFDBFE' }}>{item.department}</span>
                  <Link href={`/library/project-details?id=${item.projectId}`} style={{ textDecoration: 'none', background: 'white', color: '#003A8F', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #003A8F', textAlign: 'center', fontWeight: 700, fontSize: '0.85rem', transition: 'all 0.2s' }} onMouseOver={(e) => { e.currentTarget.style.background = '#003A8F'; e.currentTarget.style.color = 'white' }} onMouseOut={(e) => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = '#003A8F' }}>
                    View Study
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

      </div>
    </LibraryShell>
  );
}
