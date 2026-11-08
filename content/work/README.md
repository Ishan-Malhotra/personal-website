# Work room text

One Markdown file per room. The file name must match the room's `id` in `src/workData.js`:

| Room | File |
| --- | --- |
| Conquest | `conquest.md` |
| All In Capital | `allin.md` |
| Breathe ESG | `breathe.md` |

Edit a file, save, and reload `work.html`. No build step is needed locally.

## Header: designation and dates

Each file starts with a short header between `---` lines. It sets the line under the company name in the panel:

```
---
role: Investments Intern
dates: June – July 2025
---
```

- `role` and `dates` are both optional. The panel shows the role on one line and the dates on the line below it.
- Add `company: Some Name` to change the panel title. The toolbar label and the plaque initial still come from `src/workData.js`.

## Text

Supported formatting (kept small on purpose; it renders in bold Courier New inside the paper panel):

- Blank line = new paragraph. Single line breaks join into one paragraph.
- `[text](https://link)` = link (opens in a new tab). Bear Blog's `[text](tab:https://link)` works too.
- `**bold**` and `*italic*`
- Lines starting with `- ` = bullet list

Raw HTML is shown as text, not rendered. Logos and room order are not in these files; they live in `src/workData.js`.
