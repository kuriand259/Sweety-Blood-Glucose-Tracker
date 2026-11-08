import { ActionIcon, Menu } from '@mantine/core';
import {
  IconCoffee,
  IconDots,
  IconMoon,
  IconPencil,
  IconPlus,
  IconSoup,
  IconSunrise,
  IconTrash,
} from '@tabler/icons-react';
import { glucoseStatus, glucoseStatusLabel } from '../lib/glucose';

export const SLOT_ICONS = {
  MORNING_FASTING: IconSunrise,
  AFTER_BREAKFAST: IconCoffee,
  AFTER_LUNCH: IconSoup,
  AFTER_DINNER: IconMoon,
};

/** A reading shown as a small rounded card, styled like the "task" cards. */
export function ReadingMetricCard({ reading, onEdit, onDelete, active = false }) {
  const Icon = SLOT_ICONS[reading.slot] || IconSunrise;
  const status = glucoseStatus(reading.value);
  const showActions = Boolean(onEdit || onDelete);

  return (
    <div className={`sw-slot-card${active ? ' active' : ''}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Icon size={22} stroke={1.6} />
        {showActions ? (
          <Menu position="bottom-end" radius="md" shadow="md" withinPortal classNames={{ dropdown: 'sw-dark-menu' }}>
            <Menu.Target>
              <ActionIcon variant="subtle" color="dark" radius="xl" aria-label="Reading actions">
                <IconDots size={18} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              {onEdit ? (
                <Menu.Item
                  leftSection={<IconPencil size={14} />}
                  onClick={() => onEdit(reading)}
                >
                  Edit
                </Menu.Item>
              ) : null}
              {onDelete ? (
                <Menu.Item
                  leftSection={<IconTrash size={14} />}
                  onClick={() => onDelete(reading.id)}
                >
                  Delete
                </Menu.Item>
              ) : null}
            </Menu.Dropdown>
          </Menu>
        ) : null}
      </div>

      <div style={{ fontSize: 14, fontWeight: 500 }}>{reading.slotLabel}</div>

      <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
        <div>
          <span className="sw-slot-value">{reading.value}</span>{' '}
          <span className="sw-subtle" style={{ fontSize: 12 }}>
            mg/dl
          </span>
        </div>
        <span className={`sw-pill ${status}`}>{glucoseStatusLabel(reading.value)}</span>
      </div>
    </div>
  );
}

/** Dashed placeholder card for a slot that has no reading yet. */
export function EmptySlotCard({ slot, onAdd, disabled = false }) {
  const Icon = SLOT_ICONS[slot.value] || IconSunrise;
  return (
    <button
      type="button"
      className="sw-slot-card empty"
      onClick={() => onAdd?.(slot.value)}
      disabled={disabled}
      style={disabled ? { opacity: 0.5, cursor: 'default' } : undefined}
    >
      <Icon size={20} stroke={1.5} style={{ opacity: 0.5 }} />
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <IconPlus size={16} /> {slot.label}
      </span>
    </button>
  );
}
