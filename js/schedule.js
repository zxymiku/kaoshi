function resolveNextOccurrence(subject) {
  const now = new Date();

  if (subject.type === 'fixed') {
    const start = parseDateTime(subject.date, subject.startTime);
    const end = parseDateTime(subject.date, subject.endTime);
    return { start, end };
  }

  if (subject.type === 'weekly') {
    return resolveWeekly(subject, now);
  }

  if (subject.type === 'recurring') {
    return resolveRecurring(subject, now);
  }

  return null;
}

function resolveWeekly(subject, now) {
  const target = findNextWeekday(now, subject.dayOfWeek, subject.startTime, subject.endTime);

  if (subject.validUntil && target.start > new Date(subject.validUntil + 'T23:59:59')) {
    return null;
  }
  if (subject.validFrom && target.end < new Date(subject.validFrom + 'T00:00:00')) {
    return findNextWeekdayAfter(new Date(subject.validFrom), subject.dayOfWeek, subject.startTime, subject.endTime);
  }

  return target;
}

function findNextWeekday(now, dayOfWeek, startTime, endTime) {
  const today = now.getDay();
  let daysAhead = dayOfWeek - today;

  if (daysAhead < 0) daysAhead += 7;

  const candidateDate = new Date(now);
  candidateDate.setDate(candidateDate.getDate() + daysAhead);

  const end = setTime(candidateDate, endTime);

  if (daysAhead === 0 && now > end) {
    candidateDate.setDate(candidateDate.getDate() + 7);
  }

  const start = setTime(candidateDate, startTime);
  const endFinal = setTime(candidateDate, endTime);
  return { start, end: endFinal };
}

function findNextWeekdayAfter(afterDate, dayOfWeek, startTime, endTime) {
  const d = new Date(afterDate);
  while (d.getDay() !== dayOfWeek) {
    d.setDate(d.getDate() + 1);
  }
  return { start: setTime(d, startTime), end: setTime(d, endTime) };
}

function resolveRecurring(subject, now) {
  const startDate = new Date(subject.startDate + 'T00:00:00');
  const endDate = new Date(subject.endDate + 'T23:59:59');
  const intervalDays = getIntervalDays(subject.interval);

  let cursor = new Date(startDate);
  while (cursor.getDay() !== subject.dayOfWeek) {
    cursor.setDate(cursor.getDate() + 1);
  }

  let best = null;
  while (cursor <= endDate) {
    const occEnd = setTime(cursor, subject.endTime);
    if (occEnd >= now) {
      best = { start: setTime(new Date(cursor), subject.startTime), end: occEnd };
      break;
    }
    cursor.setDate(cursor.getDate() + intervalDays);
  }

  return best;
}

function resolvePreviousOccurrence(subject) {
  const now = new Date();

  if (subject.type === 'fixed') {
    const start = parseDateTime(subject.date, subject.startTime);
    const end = parseDateTime(subject.date, subject.endTime);
    if (end < now) {
      return { start, end };
    }
    return null;
  }

  if (subject.type === 'weekly') {
    return resolveWeeklyPrevious(subject, now);
  }

  if (subject.type === 'recurring') {
    return resolveRecurringPrevious(subject, now);
  }

  return null;
}

function resolveWeeklyPrevious(subject, now) {
  const target = findPreviousWeekday(now, subject.dayOfWeek, subject.startTime, subject.endTime);

  if (subject.validFrom && target.end < new Date(subject.validFrom + 'T00:00:00')) {
    return null;
  }

  if (subject.validUntil && target.start > new Date(subject.validUntil + 'T23:59:59')) {
    return null;
  }

  return target;
}

function findPreviousWeekday(now, dayOfWeek, startTime, endTime) {
  const today = now.getDay();
  let daysAgo = today - dayOfWeek;
  if (daysAgo < 0) daysAgo += 7;

  const candidateDate = new Date(now);
  candidateDate.setDate(candidateDate.getDate() - daysAgo);

  const start = setTime(candidateDate, startTime);
  const end = setTime(candidateDate, endTime);

  if (now < start) {
    candidateDate.setDate(candidateDate.getDate() - 7);
  }

  return {
    start: setTime(new Date(candidateDate), startTime),
    end: setTime(new Date(candidateDate), endTime)
  };
}

function resolveRecurringPrevious(subject, now) {
  const startDate = new Date(subject.startDate + 'T00:00:00');
  const endDate = new Date(subject.endDate + 'T23:59:59');
  const intervalDays = getIntervalDays(subject.interval);

  let cursor = new Date(startDate);
  while (cursor.getDay() !== subject.dayOfWeek) {
    cursor.setDate(cursor.getDate() + 1);
  }

  let previous = null;
  while (cursor <= endDate) {
    const occEnd = setTime(cursor, subject.endTime);
    if (occEnd < now) {
      previous = { start: setTime(new Date(cursor), subject.startTime), end: occEnd };
    } else {
      break;
    }
    cursor.setDate(cursor.getDate() + intervalDays);
  }

  return previous;
}

function getIntervalDays(interval) {
  switch (interval) {
    case 'daily': return 1;
    case 'weekly': return 7;
    case 'biweekly': return 14;
    case 'monthly': return 30;
    default: return 7;
  }
}
