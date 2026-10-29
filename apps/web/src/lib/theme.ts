export type ThemePreference = 'light' | 'dark' | 'system';
export const themeStorageKey = 're-tbms-mall:theme';

export function parseTheme(value: unknown): ThemePreference {
  return value === 'light' || value === 'dark' ? value : 'system';
}

export function resolveTheme(preference: ThemePreference, systemDark: boolean): 'light' | 'dark' {
  return preference === 'system' ? systemDark ? 'dark' : 'light' : preference;
}

// Static source only: no user-controlled strings enter the inline script.
export const themeInitScript = `(function(){var p='system';try{var v=localStorage.getItem('re-tbms-mall:theme');if(v==='light'||v==='dark')p=v;}catch(e){}var dark=false;try{dark=matchMedia('(prefers-color-scheme: dark)').matches;}catch(e){}document.documentElement.dataset.theme=p==='system'?(dark?'dark':'light'):p;})();`;
