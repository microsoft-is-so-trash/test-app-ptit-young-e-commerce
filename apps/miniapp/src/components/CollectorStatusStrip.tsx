import { useState } from 'react';
import type { RouteStatusActionId, RouteStatusItem } from '../lib/collector-status';
import { CollectorNotice } from './CollectorNotice';

interface CollectorStatusStripProps {
  items: RouteStatusItem[];
  onAction: (id: RouteStatusActionId) => void;
}

/** Một dải trạng thái duy nhất (U6): hiện mục ưu tiên cao nhất, bấm "Xem thêm" để thấy cả danh sách. */
export function CollectorStatusStrip({ items, onAction }: CollectorStatusStripProps) {
  const [expanded, setExpanded] = useState(false);
  if (items.length === 0) return null;
  const visible = expanded ? items : items.slice(0, 1);

  return (
    <section className="collector-status-strip" aria-label="Trạng thái tuyến">
      {visible.map((item) => (
        <CollectorNotice
          key={item.key}
          tone={item.tone}
          icon={item.icon}
          title={item.title}
          action={item.action ? { label: item.action.label, onClick: () => onAction(item.action!.id), disabled: item.action.disabled } : undefined}
        >
          {item.message}
        </CollectorNotice>
      ))}
      {items.length > 1 ? (
        <button type="button" className="text-button collector-status-more" aria-expanded={expanded} onClick={() => setExpanded((current) => !current)}>
          {expanded ? 'Thu gọn trạng thái' : `Xem thêm ${items.length - 1} trạng thái`}
        </button>
      ) : null}
    </section>
  );
}
