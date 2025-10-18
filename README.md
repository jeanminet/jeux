# Jeux

A tiny framework for building single-file educational games for young children.

## Getting Started

```sh
make
```

The default target builds every game in `games/` into the `dist/` folder.

To rebuild a single game, run:

```sh
make dist/quick-math.html
```

Open the resulting HTML file in a browser. Each build is self-contained—no assets or dependencies outside the file.

## Available Games

| Game | Description | Build command |
| --- | --- | --- |
| Quick Math Adventure | 30 adaptive mental math challenges with big input controls. | `make dist/quick-math.html` |
| Mots illustrés | Associe un emoji au mot français correspondant avec une progression 0–100. | `make dist/mots-illustres.html` |
| Number Ladder | Trouve le nombre manquant dans des suites croissantes adaptées au niveau. | `make dist/number-ladder.html` |
| Première lettre | Retrouve le mot qui commence par la lettre affichée en suivant la grille de progression. | `make dist/premiere-lettre.html` |

## Creating a New Game

1. Copy one of the existing game folders into a new folder inside `games/`.
2. Update the new folder's `config.mk` with a unique `GAME_ID`, a `TITLE`, and optional custom CSS.
3. Build your interface with the shared helpers from `lib/runtime.js`:
   * `Jeux.ui.createGameCard`, `createHundredGrid`, and `createChoiceGrid` keep layouts consistent.
   * `Jeux.utils.choice`, `shuffle`, `randRange`, and `fitText` cover common logic needs.
4. Run `make` to produce the bundled HTML.

All shared UX rules are documented in [`RULES.md`](RULES.md).
