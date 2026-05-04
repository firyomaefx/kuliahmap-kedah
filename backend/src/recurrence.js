const { RRule } = require('rrule');

const DAY_MAP = {
  sunday: RRule.SU,
  monday: RRule.MO,
  tuesday: RRule.TU,
  wednesday: RRule.WE,
  thursday: RRule.TH,
  friday: RRule.FR,
  saturday: RRule.SA,
};

function computeNextDate(recurrence, recurrence_day, fromDate = new Date()) {
  if (!recurrence || recurrence === 'one_time') return null;
  if (!recurrence_day || !DAY_MAP[recurrence_day]) return null;

  const options = {
    freq: recurrence === 'monthly' ? RRule.MONTHLY : RRule.WEEKLY,
    byweekday: DAY_MAP[recurrence_day],
    dtstart: new Date(),
  };

  try {
    const rule = new RRule(options);
    const next = rule.after(fromDate, true);
    if (!next) return null;
    const y = next.getFullYear();
    const m = String(next.getMonth() + 1).padStart(2, '0');
    const d = String(next.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  } catch {
    return null;
  }
}

function isOccurringToday(recurrence, recurrence_day) {
  if (!recurrence || recurrence === 'one_time') return false;
  if (!recurrence_day || !DAY_MAP[recurrence_day]) return false;

  const todayDayNum = new Date().getDay();
  const requiredDayNum = DAY_MAP[recurrence_day];
  
  if (Array.isArray(requiredDayNum)) return requiredDayNum.includes(todayDayNum);
  return requiredDayNum === todayDayNum;
}

module.exports = { computeNextDate, isOccurringToday };
