import { LandingFooter } from '@/components/public/landing-footer';
import { PublicLayout } from '@/components/layouts/public-layout';
import { GuestNavigation } from '@/components/guest/guest-navigation';
import { GuestRepository } from '@/components/guest/guest-repository';

import styles from '../page.module.css';

export const metadata = {
  title: 'Research Repository | ThesisTrack'
};

const heroHighlights = [
  { icon: 'fa-earth-americas', label: 'Open to the public' },
  { icon: 'fa-user-shield', label: 'No account required' },
  { icon: 'fa-handshake', label: 'Submit adoption requests directly' }
];

export default function RepositoryPage() {
  return (
    <PublicLayout>
      <div className={styles.landingPage}>
        <GuestNavigation />

        <main className={styles.main}>
          <section
            style={{
              position: 'relative',
              overflow: 'hidden',
              background: 'linear-gradient(135deg, #06183f 0%, #0a2a6e 45%, #003A8F 100%)',
              padding: '4.5rem 0 5.5rem',
              color: 'white'
            }}
          >
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                top: '-30%',
                right: '-10%',
                width: '620px',
                height: '620px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(246,190,0,0.18), transparent 65%)',
                pointerEvents: 'none'
              }}
            />
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                bottom: '-35%',
                left: '-8%',
                width: '520px',
                height: '520px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(65,139,255,0.16), transparent 65%)',
                pointerEvents: 'none'
              }}
            />

            <div className={styles.container} style={{ position: 'relative', zIndex: 1 }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: 'rgba(246, 190, 0, 0.14)',
                  border: '1px solid rgba(246, 190, 0, 0.4)',
                  color: '#F6BE00',
                  padding: '0.45rem 1rem',
                  borderRadius: '2rem',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em'
                }}
              >
                <i className="fas fa-door-open" aria-hidden="true" /> Guest Access &middot; Public Research Repository
              </span>

              <h1
                style={{
                  margin: '1.1rem 0 0.75rem 0',
                  fontSize: 'clamp(2rem, 3.6vw, 3rem)',
                  fontWeight: 900,
                  lineHeight: 1.1,
                  maxWidth: '820px'
                }}
              >
                Browse completed capstone and thesis research
              </h1>
              <p style={{ margin: '0 0 2rem 0', maxWidth: '680px', color: 'rgba(226, 232, 240, 0.88)', fontSize: '1.08rem', lineHeight: 1.7 }}>
                Explore completed, faculty-approved research that is ready for deployment or technology
                transfer. Anyone can browse this archive, and organizations interested in adopting a
                study can submit a request directly from its details page &mdash; no account required.
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                {heroHighlights.map((item) => (
                  <span
                    key={item.label}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.55rem',
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.16)',
                      backdropFilter: 'blur(6px)',
                      padding: '0.6rem 1.1rem',
                      borderRadius: '0.8rem',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: 'rgba(255,255,255,0.92)'
                    }}
                  >
                    <i className={`fas ${item.icon}`} style={{ color: '#F6BE00' }} aria-hidden="true" />
                    {item.label}
                  </span>
                ))}
              </div>
            </div>
          </section>

          <section style={{ padding: '0 0 4rem' }}>
            <div className={styles.container} style={{ marginTop: '-2.75rem', position: 'relative', zIndex: 2 }}>
              <GuestRepository />
            </div>
          </section>
        </main>

        <LandingFooter />
      </div>
    </PublicLayout>
  );
}
