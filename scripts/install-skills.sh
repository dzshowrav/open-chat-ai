#!/usr/bin/env bash
# ------------------------------------------------------------------
# OpenChat AI — Permanent Skill Installer
# Installs/links all custom skills from project/ dir to the system
# locations so they survive Termux reinstall (project lives on sdcard)
#
# Usage: bash scripts/install-skills.sh
# ------------------------------------------------------------------
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SKILLS_SOURCE="$PROJECT_DIR/skills"

CLAUDE_SKILLS_DIR="$HOME/.claude/skills"
OPENCODE_SKILLS_DIR="$HOME/.config/opencode/skills"

TOTAL=0
OK=0

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  OpenChat AI — Permanent Skill Installer${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  Source: ${YELLOW}$SKILLS_SOURCE${NC}"

mkdir -p "$CLAUDE_SKILLS_DIR"
mkdir -p "$OPENCODE_SKILLS_DIR"

install_skill() {
  local skill_name="$1"
  local src="$SKILLS_SOURCE/$skill_name"
  TOTAL=$((TOTAL + 1))

  if [ ! -d "$src" ]; then
    echo -e "  ${YELLOW}⚠  $skill_name${NC} (no local copy — skipping)"
    return
  fi

  # Link into ~/.claude/skills/
  local claude_target="$CLAUDE_SKILLS_DIR/$skill_name"
  if [ -L "$claude_target" ] && [ "$(readlink "$claude_target")" = "$src" ]; then
    : # already correct
  elif [ -e "$claude_target" ]; then
    local bak="$claude_target.bak.$(date +%s)"
    mv "$claude_target" "$bak"
    echo -e "  ${YELLOW}⚠  backed up existing: $bak${NC}"
  fi
  ln -sfn "$src" "$claude_target"

  # Link into ~/.config/opencode/skills/
  local opencode_target="$OPENCODE_SKILLS_DIR/$skill_name"
  if [ -L "$opencode_target" ] && [ "$(readlink "$opencode_target")" = "$src" ]; then
    : # already correct
  elif [ -e "$opencode_target" ]; then
    local bak="$opencode_target.bak.$(date +%s)"
    mv "$opencode_target" "$bak"
    echo -e "  ${YELLOW}⚠  backed up existing: $bak${NC}"
  fi
  ln -sfn "$src" "$opencode_target"

  OK=$((OK + 1))
  echo -e "  ${GREEN}✅ $skill_name${NC}"
}

echo ""
echo -e "${CYAN}  Installing skills...${NC}"
echo ""

for skill in \
  planning-with-files \
  codebase-design \
  domain-modeling \
  code-semantic-search \
  repository-analyzer \
  repo-analyzer \
  neo-system-design \
  neo-system-design-lite \
  autonomous-skill \
  multi-agent-orchestrator \
  workflow-orchestration \
  context-compression \
  long-running-harness \
  self-reflection \
  self-learning; do
  install_skill "$skill"
done

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  ${GREEN}Installed: $OK / $TOTAL skills${NC}"
echo ""
echo -e "  ${YELLOW}Next steps:${NC}"
echo "  • To verify:  ls -la ~/.claude/skills/ | grep '^l'"
echo "  • To use:     call 'skill' tool with any skill name"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
