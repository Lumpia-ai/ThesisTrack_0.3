'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import styles from '@/app/page.module.css';

const departmentTabs = [
  { id: 'program-overview', label: 'Program' },
  { id: 'research-focus', label: 'Focus Areas' },
  { id: 'department-resources', label: 'Resources' }
];

export function DepartmentSectionNavigation() {
  const [activeSection, setActiveSection] = useState(departmentTabs[0].id);

  useEffect(() => {
    const sections = departmentTabs
      .map((tab) => document.getElementById(tab.id))
      .filter((section): section is HTMLElement => Boolean(section));

    if (!sections.length) {
      return;
    }

    let frame = 0;

    const updateActiveSection = () => {
      if (frame) {
        return;
      }

      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const activationLine = window.scrollY + 170;
        const currentSection = sections.reduce((current, section) => (
          section.offsetTop <= activationLine ? section : current
        ), sections[0]);

        setActiveSection(currentSection.id);
      });
    };

    updateActiveSection();

    window.addEventListener('scroll', updateActiveSection, { passive: true });
    window.addEventListener('resize', updateActiveSection);
    window.addEventListener('hashchange', updateActiveSection);

    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }

      window.removeEventListener('scroll', updateActiveSection);
      window.removeEventListener('resize', updateActiveSection);
      window.removeEventListener('hashchange', updateActiveSection);
    };
  }, []);

  return (
    <div className={styles.departmentPageNavControls} aria-label="Department page navigation">
      <Link href="/about#about-departments" className={styles.departmentBackLink}>
        <i className="fas fa-arrow-left" aria-hidden="true" />
        <span>Back to Programs</span>
      </Link>

      <nav className={styles.departmentSectionNav} aria-label="Department sections">
        {departmentTabs.map((tab) => (
          <Link
            key={tab.id}
            href={`#${tab.id}`}
            aria-current={activeSection === tab.id ? 'page' : undefined}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
