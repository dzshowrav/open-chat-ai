# OpenChat AI — Project Rules

## Permanent Language Rule (CRITICAL)
**NEVER use Bangla letters (Bengali script).** Always write Bangla using only English characters (Banglish). Example: "ami bangla bolchi" not "আমি বাংলা বলছি". This applies to ALL communication, all files, all comments, and all code. English words stay in English. This is a permanent core rule.

## Critical: Build Before Push
**ALWAYS run `npm run build` and verify zero errors before any `git push`.** Never push without building first.

## Versioning
- Bug fixes / small tweaks → patch bump (1.x.x → 1.x.x+1)
- New features → minor bump (1.x.x → 1.x+1.0)
- Update version in `package.json` before release commits
