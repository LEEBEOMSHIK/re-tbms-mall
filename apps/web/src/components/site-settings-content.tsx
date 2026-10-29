'use client';

import { SettingsSection } from './site-settings';
import { TextSizeSetting } from './text-size-control';
import { ThemeSetting } from './theme-control';

/** Register implemented settings here, keeping the dialog independent of each setting. */
export function SiteSettingsContent() {
  return <SettingsSection title="화면 및 접근성"><TextSizeSetting /><ThemeSetting /></SettingsSection>;
}
