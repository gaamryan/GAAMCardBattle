# Announcer Voice Pack — recording script

Record these lines, drop the files into **`assets/voice/`** with these exact
filenames, and the game uses them automatically — any line that's missing
falls back to the synthesized announcer, so you can build the pack up
gradually. No config changes needed.

## File specs

- **Format:** `.mp3` (or `.wav` — name it `.mp3` after converting)
- **Length:** short and punchy — most lines land best under 1.5 seconds
- **Sound:** record dry (no music), loud and close to the mic. A little
  clipping-adjacent grit is good for this style. If you send raw takes,
  they can be processed (compression, reverb, EQ) to sound arena-huge.
- **Delivery:** every line is SHOUTED with rising energy. Think 90s arcade
  fighting game — the announcer is *losing his mind with excitement*.

## The lines

### Match flow
| File | Line | Delivery note |
|---|---|---|
| `battle_start.mp3` | "ARE YOU READY?! **BATTLE!**" | The opener at the VS screen. Biggest energy in the pack. |
| `round_1.mp3` | "ROUND ONE — **FIGHT!**" | Quick beat between "one" and "fight". |
| `round_2.mp3` | "ROUND TWO — **FIGHT!**" | |
| `round_3.mp3` | "ROUND THREE — **FIGHT!**" | |
| `round_4.mp3` | "ROUND FOUR — **FIGHT!**" | Getting more intense each round… |
| `round_5.mp3` | "ROUND FIVE — **FIGHT!**" | |
| `final_turn.mp3` | "THIS IS IT… **FINAL ROUND!**" | Drop low and quiet on "this is it", then explode. |

### Timer
| File | Line | Delivery note |
|---|---|---|
| `hurry.mp3` | "HURRY UP!" | Urgent, almost annoyed. Plays at 10 seconds left. |
| `times_up.mp3` | "TIME'S **UP!**" | Hard stop. Plays when the turn auto-ends. |

### Supers & big moments
| File | Line | Delivery note |
|---|---|---|
| `super_attack.mp3` | "OHHH! **SUPER ATTACK!**" | The crowd-goes-wild moment. |
| `super_revive.mp3` | "**SUPER REVIVE!**" | Awe + power. |
| `revived.mp3` | "BACK FROM THE **GRAVE!**" | Plays on the "…HAS BEEN REVIVED" banner. |
| `snap.mp3` | "**SNAP!** STAKES DOUBLED!" | Cocky, dangerous. |
| `combo.mp3` | "**COMBO!**" | Chained ability hits. |
| `incredible.mp3` | "IN-**CREDIBLE!**" | Spare hype line for big swings. |

### Results
| File | Line | Delivery note |
|---|---|---|
| `victory.mp3` | "**VICTORY!**" | Triumphant, held long: "victoryyyy!" |
| `perfect.mp3` | "**PERFECT** VICTORY!" | Won every location. Disbelief + joy. |
| `defeat.mp3` | "DEFEAT…" | The one quiet line. Grave, falling pitch. |
| `draw.mp3` | "IT'S A **DRAW!**" | Surprised. |
| `new_card.mp3` | "NEW CARD **UNLOCKED!**" | Prize-reveal energy. |
| `rematch.mp3` | "RE-**MATCH!**" | Here-we-go-again. |

### Spare interjections (used to spice random moments)
| File | Line |
|---|---|
| `ohhh.mp3` | "OHHHH!" |
| `lets_go.mp3` | "LET'S **GO!**" |
| `here_we_go.mp3` | "HERE WE GO!" |

## Notes

- **Rounds vs turns:** the game's banners say "TURN N"; the recorded lines
  say "ROUND N" because it sounds better shouted. `round_N.mp3` maps to
  turn N automatically — the shipped pack covers rounds 1–7.
- **Status (2026-09-18):** a full ElevenLabs pack is installed. Files ending
  in `_alt` are spare takes the game ignores — swap one in by renaming it
  over the main file. The two `super_attack_explicit_alt` takes contain
  profanity and are deliberately NOT active; rename one to
  `super_attack.mp3` if you want it. `unknown_take_1/2` were unclear
  one-word takes ("Turn…"/"Round!") left unassigned.
- `combo.mp3` plays on 2–3 chained ability hits, `incredible.mp3` on 4+.
- Card and team names stay synthesized (they're dynamic), so the pack and
  the synth voice will both be heard — pick a synth style in Admin → Music
  that's closest to your recorded character.
- The 🎙 toggle mutes both the pack and the synth announcer.
- Keep the total pack small (each file ~20–50 KB); it deploys with the game.
