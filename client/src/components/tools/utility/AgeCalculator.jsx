import { useState } from 'react';
import { motion } from 'framer-motion';

const ZODIAC = [
  ['Capricorn', [12,22],[1,19]], ['Aquarius',[1,20],[2,18]], ['Pisces',[2,19],[3,20]],
  ['Aries',[3,21],[4,19]], ['Taurus',[4,20],[5,20]], ['Gemini',[5,21],[6,20]],
  ['Cancer',[6,21],[7,22]], ['Leo',[7,23],[8,22]], ['Virgo',[8,23],[9,22]],
  ['Libra',[9,23],[10,22]], ['Scorpio',[10,23],[11,21]], ['Sagittarius',[11,22],[12,21]],
];

function getZodiac(month, day) {
  for (const [sign, [sm, sd], [em, ed]] of ZODIAC) {
    if ((month === sm && day >= sd) || (month === em && day <= ed)) return sign;
  }
  return 'Capricorn';
}

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

export default function AgeCalculator() {
  const today = new Date().toISOString().split('T')[0];
  const [dob, setDob] = useState('');
  const [refDate, setRefDate] = useState(today);
  const [result, setResult] = useState(null);

  const calculate = () => {
    if (!dob) return;
    const birth = new Date(dob);
    const ref = new Date(refDate);
    if (birth > ref) { setResult(null); return; }

    let years = ref.getFullYear() - birth.getFullYear();
    let months = ref.getMonth() - birth.getMonth();
    let days = ref.getDate() - birth.getDate();

    if (days < 0) { months--; const prev = new Date(ref.getFullYear(), ref.getMonth(), 0); days += prev.getDate(); }
    if (months < 0) { years--; months += 12; }

    const totalDays = Math.floor((ref - birth) / 86400000);
    const totalWeeks = Math.floor(totalDays / 7);

    const nextBirthday = new Date(ref.getFullYear(), birth.getMonth(), birth.getDate());
    if (nextBirthday <= ref) nextBirthday.setFullYear(ref.getFullYear() + 1);
    const daysToNext = Math.ceil((nextBirthday - ref) / 86400000);

    setResult({ years, months, days, totalDays, totalWeeks, daysToNext,
      dayOfWeek: DAYS[birth.getDay()],
      zodiac: getZodiac(birth.getMonth() + 1, birth.getDate()) });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <div className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1">Date of Birth</label>
            <input type="date" value={dob} onChange={e => setDob(e.target.value)} max={today}
              className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1">Reference Date</label>
            <input type="date" value={refDate} onChange={e => setRefDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
        </div>
        <button onClick={calculate} className="px-4 py-2 text-white rounded-xl font-medium transition-colors" style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }}>Calculate Age</button>
      </div>

      {result && (
        <div className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="grid grid-cols-3 gap-4 text-center">
            {[['Years', result.years], ['Months', result.months], ['Days', result.days]].map(([label, val]) => (
              <div key={label} className="rounded-xl p-4" style={{ background: 'rgba(255,99,99,0.08)', border: '1px solid rgba(255,99,99,0.2)' }}>
                <div className="text-3xl font-bold text-primary-400">{val}</div>
                <div className="text-sm text-surface-400">{label}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              ['Total Days', result.totalDays.toLocaleString()],
              ['Total Weeks', result.totalWeeks.toLocaleString()],
              ['Next Birthday', `in ${result.daysToNext} days`],
              ['Born on', result.dayOfWeek],
              ['Zodiac Sign', result.zodiac],
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between rounded-xl px-4 py-2" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <span className="text-surface-400">{label}</span>
                <span className="font-semibold text-surface-100">{val}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
