import { BUILT_IN_THEMES, Theme, DEFAULT_THEME_ID } from '../../core/constants.js';
import { SettingRepository } from '../../database/repositories/settingRepository.js';

export class ThemeManager {
  private settingRepo = new SettingRepository();

  getCurrentTheme(): Theme {
    const config = this.settingRepo.getSetting<{ themeId: string }>('theme');
    const themeId = config?.themeId || DEFAULT_THEME_ID;
    return BUILT_IN_THEMES[themeId] || BUILT_IN_THEMES[DEFAULT_THEME_ID];
  }

  setTheme(themeId: string): void {
    if (BUILT_IN_THEMES[themeId]) {
      this.settingRepo.setSetting('theme', { themeId, wordWrap: true });
    }
  }
}
export const themeManager = new ThemeManager();
