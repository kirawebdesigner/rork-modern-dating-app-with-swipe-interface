---
description: Setup website builder tools including Motion, UI/UX Pro Max skill, and Magic MCP server.
---

# Website Builder Setup Workflow

Follow these steps precisely when the user invokes the `/website-builder-setup` command.

1. **Install Motion Dependency**
Evaluate if the project has a `frontend` folder. Run the npm installation in the correct directory.
// turbo
`npm install motion`

2. **Clone the UI/UX Pro Max Skill**
Download the UI/UX Pro Max skill directly into the `.agent/skills` directory so it's globally available for this project.
// turbo
`git clone https://github.com/nextlevelbuilder/ui-ux-pro-max-skill.git .agent/skills/ui-ux-pro-max-skill`
