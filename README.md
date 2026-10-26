# Telal West AI City dashboard

A demo "AI City" command center for the Telal West development (PRE Group, 380 feddan, New Zayed), built from the New Zayed development brief. Real facts from the brief (areas, boundary lengths, drive times) are used as printed. Every live number is sample data.

Images are AI-generated and are presented for concept illustration only.

## Run it

```
npm install
npm run dev
```

Open http://localhost:4728

Build for hosting: `npm run build` (output in `dist/`).

## Notes

- Stack: Vite, React, TypeScript, Recharts, Framer Motion.
- Look: cream, deep green and gold (sampled from the brief) with serif headings; a dark mode is the toggle. All colours and fonts are in `src/tokens.css`.
- `reference/` holds the pages of the client's PDF for working only; it is git-ignored and not published.
- Status: Phase 0 (tokens and empty project). The eight tabs come in later phases.
