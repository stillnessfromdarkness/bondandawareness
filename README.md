# Bond & Awareness

## Deploy su Vercel

1. Copia `bg.png` nella root (stessa cartella di `index.html`)
2. Carica tutto su GitHub
3. Collega il repo su vercel.com → Import
4. **Nessuna build command** — è HTML/CSS/JS statico puro
   - Build Command: *(lascia vuoto)*
   - Output Directory: *(lascia vuoto o `.`)*
5. Deploy ✓

## Struttura

```
├── index.html          ← entry point
├── bg.png              ← aggiungi il tuo qui
├── vercel.json
├── css/
│   ├── main.css        ← stili principali (6175 righe)
│   ├── components.css  ← card, mode, welcome
│   ├── game.css        ← header, matchmaking, invite
│   └── letsplay.css    ← bottone let's play
└── js/
    ├── app.js          ← tutta la logica di gioco
    ├── init.js         ← IIFE direct-play + invite panel
    ├── invite-panel.js ← secondo IIFE invite
    ├── garden.js       ← collezione frutti
    ├── letsplay-glow.js← animazione bottone
    ├── bell.js         ← promemoria audio
    ├── favicon.js      ← favicon spirale
    ├── beta-gate.js    ← accesso beta
    └── supabase-loader.js
```
