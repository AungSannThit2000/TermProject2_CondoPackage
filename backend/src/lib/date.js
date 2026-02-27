export function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

export function endOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function buildDateRange({ period, start_date, end_date, date, defaultToday = false }) {
  if (start_date) {
    const start = startOfDay(new Date(start_date));
    const end = endOfDay(new Date(end_date || new Date()));
    return { $gte: start, $lte: end };
  }

  if (period === "today") {
    return { $gte: startOfDay(new Date()), $lte: endOfDay(new Date()) };
  }

  if (period === "last7") {
    const from = startOfDay(new Date());
    from.setDate(from.getDate() - 6);
    return { $gte: from, $lte: endOfDay(new Date()) };
  }

  if (period === "last30") {
    const from = startOfDay(new Date());
    from.setDate(from.getDate() - 29);
    return { $gte: from, $lte: endOfDay(new Date()) };
  }

  if (period === "month") {
    return { $gte: startOfMonth(new Date()), $lte: endOfMonth(new Date()) };
  }

  if (date) {
    return { $gte: startOfDay(new Date(date)), $lte: endOfDay(new Date(date)) };
  }

  if (defaultToday) {
    return { $gte: startOfDay(new Date()), $lte: endOfDay(new Date()) };
  }

  return null;
}
