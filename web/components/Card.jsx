'use client';

import { useState } from 'react';

export function Badge({ urgency }) {
  return <span className={`badge ${urgency.code}`}>{urgency.label}</span>;
}

export function EmergencyBanner() {
  return (
    <div className="banner">
      <strong>Это похоже на неотложное состояние</strong>
      <a className="phone" href="tel:103">103</a>
      <span>
        Со стационарного телефона — 03. Не садитесь за руль, не ждите планового
        приёма и не оставайтесь одни.
      </span>
    </div>
  );
}

export function asPlainText(card) {
  const flags = card.redFlags?.length ? card.redFlags.join(', ') : 'не выявлены';
  const lines = [
    `Срочность: ${card.urgency.label}`,
    `Основание: ${card.reason}`,
    // На «неотложно» основание уже перечисляет признаки — врачу незачем
    // вставлять в карту один и тот же список дважды.
    ...(card.reason?.includes(flags) ? [] : [`Тревожные признаки: ${flags}`]),
    `Жалобы: ${card.complaints || '—'}`,
    `Длительность: ${card.durationNote || card.duration || '—'}`,
    `Боль (0-10): ${card.painLevel ?? '—'}`,
    `Аллергии: ${card.allergies || '—'}`,
    `Хронические заболевания: ${card.chronic || '—'}`,
    `Препараты: ${card.meds || '—'}`,
  ];
  if (card.substances?.length) lines.push(`Меняют тактику: ${card.substances.join(', ')}`);
  if (card.needsClarification?.length) {
    lines.push(`Уточнить: ${card.needsClarification.join('; ')}`);
  }
  lines.push('', card.draft || '');
  return lines.join('\n');
}

export function CopyButton({ card }) {
  const [label, setLabel] = useState('Скопировать запись');

  async function copy() {
    const text = asPlainText(card);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Safari и http-контекст не дают clipboard API — старый способ работает всегда.
      const area = document.createElement('textarea');
      area.value = text;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      area.remove();
    }
    setLabel('Скопировано');
    setTimeout(() => setLabel('Скопировать запись'), 1600);
  }

  return (
    <button type="button" className="btn" onClick={copy}>
      {label}
    </button>
  );
}

export function CardTable({ card }) {
  const flags = card.redFlags?.length ? card.redFlags.join(', ') : 'не выявлены';
  const rows = [
    ['Срочность', <Badge key="u" urgency={card.urgency} />],
    ['Основание', card.reason],
    ['Тревожные признаки', card.reason?.includes(flags) ? null : flags],
    ['Жалобы', card.complaints],
    ['Длительность', card.durationNote || card.duration],
    ['Боль (0–10)', card.painLevel],
    ['Аллергии', card.allergies],
    ['Хронические заболевания', card.chronic],
    ['Препараты', card.meds],
    ['Меняют тактику', card.substances?.length ? card.substances.join(', ') : null],
    ['Черновик записи', card.draft],
  ].filter(([, value]) => value !== null && value !== undefined && value !== '');

  return (
    <>
      {card.needsClarification?.length ? (
        <div className="warn">
          <strong>Уточнить у пациента</strong>
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            {card.needsClarification.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <table>
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label}>
              <td>{label}</td>
              <td>{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
