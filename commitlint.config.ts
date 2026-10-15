import type { UserConfig } from "czg";

export default {
  prompt: {
    allowCustomIssuePrefix: true,
    allowCustomScopes: true,
    allowEmptyIssuePrefix: true,
    allowEmptyScopes: true,
    breaklineChar: "|",
    defaultBody: "",
    defaultIssues: "",
    defaultScope: "",
    defaultSubject: "",
    emojiAlign: "left",
    formatMessageCB: (message) => {
      const footer = message.footer ? `[${message.footer.trim()}] ` : "";
      const description = message.body ? `\n\n${message.body.trim()}` : "";
      return `${footer}(${message.emoji} ${message.type}): ${message.subject}${description}`;
    },
    maxSubjectLength: 50,
    messages: {
      body: 'Longer description (optional). Use "|" for new lines:\n',
      confirmCommit: "Proceed with this commit?",
      customFooterPrefix: "Issue prefix:",
      customScope: "Scope:",
      footer: "Related issues (e.g. #31, #34):\n",
      subject: "Short, imperative description:\n",
      type: "Choose type:",
    },
    minSubjectLength: 0,
    skipQuestions: ["scope", "breaking", "footerPrefix"],
    types: [
      { emoji: "✨", name: "✨ new:      New feature or other additions", value: "new" },
      { emoji: "🐛", name: "🐛 fix:      Bug fix", value: "fix" },
      { emoji: "📝", name: "📝 docs:     Documentation", value: "docs" },
      {
        emoji: "🎨",
        name: "🎨 refactor: Code refactoring or style",
        value: "refactor",
      },
      { emoji: "🚬", name: "🚬 perf:     Performance improvements", value: "perf" },
      {
        emoji: "✅",
        name: "✅ test:     Add or update tests",
        value: "test",
      },
      {
        emoji: "⚙️",
        name: "⚙️ ci:       CI configuration and scripts",
        value: "ci",
      },
      {
        emoji: "🧺",
        name: "🧺 chore:    Other maintenance",
        value: "chore",
      },
      { emoji: "⏪", name: "⏪ revert:   Revert a commit", value: "revert" },
    ],
    upperCaseSubject: null,
    useAI: false,
    useEmoji: true,
  },
} satisfies UserConfig;
