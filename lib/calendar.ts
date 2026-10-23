import type { Celebration } from "./model.ts";
import { dateOffset } from "./format.ts";

function escapeText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

/** RFC 5545 folds by UTF-8 octets, without splitting a Unicode character. */
function foldLine(line: string) {
  const encoder = new TextEncoder();
  let result = "",
    length = 0;
  for (const character of line) {
    const size = encoder.encode(character).length;
    if (length + size > 75) {
      result += "\r\n ";
      length = 1;
    }
    result += character;
    length += size;
  }
  return result;
}

export function exportCalendar(event: Celebration, now = new Date()) {
  const stamp = now
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Gather//Event Planner//EN",
    "CALSCALE:GREGORIAN",
    ...event.tasks.flatMap((task) => [
      "BEGIN:VEVENT",
      `UID:${encodeURIComponent(task.id)}@gather`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${task.date.replace(/-/g, "")}`,
      `DTEND;VALUE=DATE:${dateOffset(task.date, 1).replace(/-/g, "")}`,
      `SUMMARY:${escapeText(task.title)}`,
      `DESCRIPTION:${escapeText(`${event.name}${task.done ? " · Completed" : ""}`)}`,
      "END:VEVENT",
    ]),
    "END:VCALENDAR",
  ];
  return lines.map(foldLine).join("\r\n") + "\r\n";
}
