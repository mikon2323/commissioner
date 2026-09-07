const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Next occurrence of `weekdayName` strictly after `fromDate` (America/New_York
// calendar day), skipping to next week if fromDate already falls on that day.
export function nextWeekdayAfter(fromDate, weekdayName) {
  const targetIdx = WEEKDAYS.indexOf(weekdayName);
  const fromInET = new Date(fromDate.toLocaleString("en-US", { timeZone: "America/New_York" }));
  let diff = (targetIdx - fromInET.getDay() + 7) % 7;
  if (diff === 0) diff = 7;
  const result = new Date(fromInET);
  result.setDate(fromInET.getDate() + diff);
  return result;
}

export function formatDateLong(date) {
  return date.toLocaleString("en-US", { timeZone: "America/New_York", month: "long", day: "numeric" });
}
