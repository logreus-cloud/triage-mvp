'use client';

import { useState } from 'react';
import Link from 'next/link';
import BodyMap, { ZONES } from './BodyMap';

// Обёртка для лендинга: держит выбранную зону и передаёт её в опрос
// параметром адреса, чтобы первый ответ был уже подставлен.
export default function BodyPicker() {
  const [zone, setZone] = useState(null);
  const label = ZONES.find((z) => z.id === zone)?.label;

  return (
    <div>
      <BodyMap selected={zone} onSelect={(id) => setZone(id)} />
      <div className="row" style={{ marginTop: 20 }}>
        <Link href={zone ? `/survey?zone=${zone}` : '/survey'} className="btn">
          {label ? `Продолжить: ${label.toLowerCase()}` : 'Начать опрос'}
        </Link>
        {zone && (
          <button type="button" className="btn light" onClick={() => setZone(null)}>
            Сбросить
          </button>
        )}
      </div>
    </div>
  );
}
