import fs from 'fs';
import path from 'path';

const LOG_FILE = path.resolve(process.cwd(), 'security.log');

export function logSecurityEvent(event: string, details: Record<string, any>) {
  try {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [SECURITY] ${event} - ${JSON.stringify(details)}\n`;
    
    fs.appendFileSync(LOG_FILE, logEntry);
    console.log(logEntry.trim());
  } catch (e) {
    console.error("Failed to write to security log:", e);
  }
}

export function getSecurityLogs() {
  if (!fs.existsSync(LOG_FILE)) return [];
  const content = fs.readFileSync(LOG_FILE, 'utf8');
  return content.trim().split('\n').reverse();
}

export function clearSecurityLogs() {
  if (fs.existsSync(LOG_FILE)) {
    fs.writeFileSync(LOG_FILE, '');
  }
}
