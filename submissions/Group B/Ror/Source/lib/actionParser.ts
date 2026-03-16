import type { NavigationAction } from '@/types/navigation';

const ACTION_REGEX = /<<ACTION:([\s\S]*?)>>/;

export function parseAction(text: string): {
  cleanText: string;
  action?: NavigationAction;
} {
  const match = text.match(ACTION_REGEX);
  if (!match) return { cleanText: text };

  try {
    const action = JSON.parse(match[1]) as NavigationAction;
    const cleanText = text.replace(ACTION_REGEX, '').trim();
    return { cleanText, action };
  } catch {
    return { cleanText: text };
  }
}
