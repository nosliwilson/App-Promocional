import fs from 'fs';
import path from 'path';

const LOG_FILE = path.resolve(process.cwd(), 'security.log');

export function logSecurityEvent(event: string, details: Record<string, any>) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] [SECURITY] ${event} - ${JSON.stringify(details)}\n`;
  
  // Standard format for fail2ban (you can customize the regex in fail2ban config)
  // [2026-05-13T13:30:00Z] [SECURITY] FAILED_LOGIN - {"user":"admin","ip":"::1"}
  
  fs.appendFileSync(LOG_FILE, logEntry);
  console.log(logEntry.trim());
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
