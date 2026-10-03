import { useState } from 'react';
import type { ReactNode } from 'react';
import { toggleMineSection } from '../lib/merchant-nav';
import { Icon } from './Icon';

interface MineAccordionProps<K extends string> {
  sections: ReadonlyArray<{ key: K; icon: string; title: string }>;
  renderContent: (key: K) => ReactNode;
}

/** Danh sách mục mở rộng của tab "Của tôi": mặc định đóng, mở mục này thì mục khác đóng. */
export function MineAccordion<K extends string>({ sections, renderContent }: MineAccordionProps<K>) {
  const [openSection, setOpenSection] = useState<K | null>(null);

  return (
    <div className="mine-list">
      {sections.map((section) => {
        const expanded = openSection === section.key;
        return (
          <section className={`mine-item ${expanded ? 'expanded' : ''}`} key={section.key}>
            <button
              className="mine-item-header"
              aria-expanded={expanded}
              aria-controls={expanded ? `mine-section-${section.key}` : undefined}
              onClick={() => setOpenSection((current) => toggleMineSection(current, section.key))}
            >
              <span className="section-icon">
                <Icon name={section.icon} size={20} decorative />
              </span>
              <span className="settings-row-title mine-item-title">{section.title}</span>
              <Icon name={expanded ? 'expand_less' : 'expand_more'} size={22} decorative />
            </button>
            {expanded ? (
              <div className="mine-item-body" id={`mine-section-${section.key}`}>
                {renderContent(section.key)}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
