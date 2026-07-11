import fs from 'fs';
import path from 'path';
import { stateManager } from '../core/state.js';

export interface Skill {
  id: string;
  name: string;
  instructions: string;
  path: string;
}

export class SkillsManager {
  static loadWorkspaceSkills(): Skill[] {
    const skills: Skill[] = [];
    const workspacePath = stateManager.getState().workspacePath;
    const homePath = process.env.HOME || '';

    const skillDirs = [
      path.join(homePath, '.config', 'openchat', 'skills'),
      path.join(homePath, '.claude', 'skills'),
      ...(workspacePath ? [
        path.join(workspacePath, '.openchat', 'skills'),
        path.join(workspacePath, '.skills'),
        path.join(workspacePath, 'skills')
      ] : [])
    ];

    const seenIds = new Set<string>();

    for (const dir of skillDirs) {
      if (!fs.existsSync(dir)) continue;

      try {
        const items = fs.readdirSync(dir);
        for (const item of items) {
          const itemPath = path.join(dir, item);
          if (fs.statSync(itemPath).isDirectory()) {
            const skillMdPath = path.join(itemPath, 'SKILL.md');
            if (fs.existsSync(skillMdPath)) {
              const skillId = item.toLowerCase();
              if (seenIds.has(skillId)) continue;

              const content = fs.readFileSync(skillMdPath, 'utf8');
              skills.push({
                id: item,
                name: item.charAt(0).toUpperCase() + item.slice(1),
                instructions: content,
                path: itemPath
              });
              seenIds.add(skillId);
            }
          }
        }
      } catch (err) {
        console.error(`Failed to read skills directory at ${dir}:`, err);
      }
    }

    return skills;
  }

  /**
   * Builds a combined prompt from all loaded skills
   */
  static buildSkillsPrompt(skills: Skill[]): string {
    if (skills.length === 0) return '';

    let prompt = '\n--- AVAILABLE DEVELOPER SKILLS & STANDARDS ---\n';
    prompt += 'You should respect the following frameworks or coding standards when producing code:\n\n';

    for (const skill of skills) {
      prompt += `[Skill: ${skill.name}]\n`;
      prompt += `${skill.instructions}\n`;
      prompt += '------------------------------------------\n';
    }

    return prompt;
  }
}
