import { BUILT_IN_THEMES, Theme, DEFAULT_THEME_ID } from '../../core/constants.js';
import { SettingRepository } from '../../database/repositories/settingRepository.js';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';

const termuxConfigDir = path.join(os.homedir(), '.termux');
const colorsPath = path.join(termuxConfigDir, 'colors.properties');
const backupPath = path.join(termuxConfigDir, 'colors.properties.bak');

let hasBackup = false;

function backupTermuxColors() {
  try {
    const isTermux = process.env.TERMUX_VERSION || fs.existsSync('/data/data/com.termux');
    if (!isTermux) return;

    if (!fs.existsSync(termuxConfigDir)) {
      fs.mkdirSync(termuxConfigDir, { recursive: true });
    }
    if (fs.existsSync(colorsPath) && !fs.existsSync(backupPath)) {
      fs.copyFileSync(colorsPath, backupPath);
      hasBackup = true;
    }
  } catch (err) {
    // Silently consume errors
  }
}

function restoreTermuxColors() {
  try {
    const isTermux = process.env.TERMUX_VERSION || fs.existsSync('/data/data/com.termux');
    if (!isTermux) return;

    if (fs.existsSync(backupPath)) {
      fs.copyFileSync(backupPath, colorsPath);
      fs.unlinkSync(backupPath);
      exec('/data/data/com.termux/files/usr/bin/termux-reload-settings');
    } else if (fs.existsSync(colorsPath)) {
      let content = fs.readFileSync(colorsPath, 'utf8');
      if (content.includes('background=')) {
        content = content.replace(/^background=.*$/m, '').trim();
        fs.writeFileSync(colorsPath, content, 'utf8');
        exec('/data/data/com.termux/files/usr/bin/termux-reload-settings');
      }
    }
  } catch (err) {
    // Silently consume errors
  }
}

function setTermuxBackground(color: string) {
  try {
    const isTermux = process.env.TERMUX_VERSION || fs.existsSync('/data/data/com.termux');
    if (!isTermux) return;

    if (!fs.existsSync(termuxConfigDir)) {
      fs.mkdirSync(termuxConfigDir, { recursive: true });
    }

    // Backup if color file exists and backup doesn't
    if (fs.existsSync(colorsPath) && !fs.existsSync(backupPath)) {
      fs.copyFileSync(colorsPath, backupPath);
      hasBackup = true;
    }

    let content = '';
    if (fs.existsSync(colorsPath)) {
      content = fs.readFileSync(colorsPath, 'utf8');
    }

    if (content.includes('background=')) {
      content = content.replace(/^background=.*$/m, `background=${color}`);
    } else {
      content += (content.endsWith('\n') || content === '' ? '' : '\n') + `background=${color}\n`;
    }

    fs.writeFileSync(colorsPath, content, 'utf8');
    exec('/data/data/com.termux/files/usr/bin/termux-reload-settings');
  } catch (err) {
    // Silently consume errors
  }
}

export class ThemeManager {
  private settingRepo = new SettingRepository();
  private isInitialized = false;

  getCurrentTheme(): Theme {
    const config = this.settingRepo.getSetting<{ themeId: string }>('theme');
    const themeId = config?.themeId || DEFAULT_THEME_ID;
    const theme = BUILT_IN_THEMES[themeId] || BUILT_IN_THEMES[DEFAULT_THEME_ID];

    if (!this.isInitialized) {
      this.isInitialized = true;
      backupTermuxColors();
      if (theme && theme.backgroundColor) {
        setTermuxBackground(theme.backgroundColor);
      }
    }

    return theme;
  }

  setTheme(themeId: string): void {
    if (BUILT_IN_THEMES[themeId]) {
      this.settingRepo.setSetting('theme', { themeId, wordWrap: true });
      const theme = BUILT_IN_THEMES[themeId];
      if (theme && theme.backgroundColor) {
        setTermuxBackground(theme.backgroundColor);
      }
    }
  }
}

export const themeManager = new ThemeManager();

// Register exit hooks to clean up terminal backgrounds
process.on('exit', () => {
  restoreTermuxColors();
});
