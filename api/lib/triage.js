// US-3: тревожные признаки и категория срочности. Чистые правила, без модели,
// чтобы результат был воспроизводим и в DEMO_MODE, и с живым ключом.

const NEGATIVE = /^(нет|нету|не|no|none|-|—|нет\.|ничего|отрицаю)$/i;

const RED_FLAGS = [
  { re: /(бол|дав|жж|жм|сдав).{0,20}(груд|за\s*груд)|груд.{0,15}(бол|дав|жж)/i, label: 'боль или давление в груди' },
  { re: /(одышк|задыха|не могу дышать|нехватка воздуха|тяжело дышать)/i, label: 'одышка' },
  { re: /(слабость в (рук|ног)|онемел|отнял[оа]сь|парал)/i, label: 'слабость или онемение конечности' },
  { re: /(наруш.{0,10}реч|невнятн.{0,10}реч|не могу говорить|перекос.{0,10}лиц)/i, label: 'нарушение речи или асимметрия лица' },
  { re: /(обморок|потер[ья].{0,10}сознан|теря[юл].{0,10}сознан)/i, label: 'потеря сознания' },
  { re: /(кровотеч|рвота с кровью|кровь в стуле|сильно кровит)/i, label: 'кровотечение' },
  { re: /(судорог|припадок)/i, label: 'судороги' },
  { re: /(темпер|t|т)\D{0,10}(39|40|41)/i, label: 'температура 39 и выше' },
  { re: /(суицид|покончить с собой|не хочу жить)/i, label: 'суицидальные мысли' },
];

export function parsePain(raw) {
  const m = String(raw || '').match(/\d{1,2}/);
  if (!m) return null;
  const n = Number(m[0]);
  if (Number.isNaN(n)) return null;
  return Math.max(0, Math.min(10, n));
}

export function detectRedFlags(answers) {
  const haystack = Object.entries(answers)
    .filter(([key, val]) => !(key === 'redflags' && NEGATIVE.test(String(val).trim())))
    .map(([, val]) => String(val))
    .join(' \n ');

  const found = [];
  for (const flag of RED_FLAGS) {
    if (flag.re.test(haystack)) found.push(flag.label);
  }
  return found;
}

// Lookbehind, а не : в JS границы слова не работают с кириллицей, и без
// проверки предыдущей буквы «понедельник» попадает в «недел», а «погода» — в «год».
const LONG_DURATION = /(?<![а-яё])(недел|месяц|год|давно|постоянн|хроническ)/i;

export const URGENCY = {
  emergency: { code: 'emergency', label: 'Неотложно', rank: 0 },
  today: { code: 'today', label: 'Сегодня', rank: 1 },
  planned: { code: 'planned', label: 'Плановый приём', rank: 2 },
  selfcare: { code: 'selfcare', label: 'Самопомощь', rank: 3 },
};

export function classify(answers) {
  const redFlags = detectRedFlags(answers);
  const pain = parsePain(answers.pain);
  const duration = String(answers.duration || '');
  const all = Object.values(answers).join(' ');

  if (redFlags.length) {
    return { urgency: URGENCY.emergency, redFlags, reason: 'Найдены тревожные признаки: ' + redFlags.join(', ') };
  }
  if ((pain !== null && pain >= 7) || /(38[.,]?\d?|темпер.{0,15}38)/i.test(all) || /внезапн|резко начал/i.test(duration)) {
    return { urgency: URGENCY.today, redFlags, reason: 'Выраженная боль или острое начало — осмотр в течение суток.' };
  }
  if ((pain !== null && pain >= 3) || LONG_DURATION.test(duration)) {
    return { urgency: URGENCY.planned, redFlags, reason: 'Умеренные или длительные симптомы — плановый приём.' };
  }
  return { urgency: URGENCY.selfcare, redFlags, reason: 'Тревожных признаков нет, интенсивность низкая — наблюдение и самопомощь.' };
}
