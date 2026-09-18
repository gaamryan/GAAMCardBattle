/* ============================================================================
   GAAM CARD BATTLE — CONFIGURATION MODULE
   ============================================================================
   Everything gameplay-related lives in this file. Edit it freely; index.html
   never needs to change to add cards, tweak rules, swap art, or restyle FX.

   Loaded as a plain <script> (not fetch) so the game runs from file:// with
   no web server required.

   ── HOW TO ADD A CARD ──────────────────────────────────────────────────────
   1. Drop an image into assets/cards/ (any aspect; square looks best).
   2. Add an object to GAAM_CONFIG.cards below.
   3. abilityType: "vanilla" | "onReveal" | "ongoing"
      abilityId:   must match a key registered in the ABILITIES registry in
                   index.html (or add your own hook there — ~5 lines).
   4. vfx:        effect played on the card itself when it reveals.
                  Any key from fxLibrary below ("fire","ice","electric",...)
                  or a legacy key ("burst","shake","glow","frost","none").
      interactFx: effect used when this card's ability hits OTHER cards —
                  a projectile flies from this card to each target and the
                  library impact + sound plays there. Any fxLibrary key.
      sfx:        sound on reveal. Any key from AUDIO_RECIPES in index.html
                  ("chime","zap","boom","dark","fire","ice","electric","buff").

   ── HOW TO ADD A NEW VISUAL EFFECT ─────────────────────────────────────────
   1. Pack a PNG frame sequence into a sprite-sheet grid (see tools/pack_fx.py
      — point it at any sequence in the effects/ folder).
   2. Add its manifest entry to `sprites` below (src/frames/cols/fw/fh/fps).
   3. Add a semantic entry to `fxLibrary` that references it.
   4. Reference the fxLibrary key from any card (vfx / interactFx) or
      location (fxKey). Done — no engine changes needed.
   ========================================================================= */

window.GAAM_CONFIG = {

  /* ── GLOBAL RULES ──────────────────────────────────────────────────────── */
  rules: {
    turns: 6,               // total turns per match
    locationCount: 3,       // locations on the board
    maxCardsPerLocation: 4, // per player, per location
    locationsToWin: 2,      // locations needed to win the match
    deckSize: 12,           // cards per deck (duplicates auto-fill if fewer defined)
    startingHand: 3,        // cards drawn before turn 1
    maxHand: 7,             // draw is skipped when hand is full
    energyPerTurn: (turn) => turn, // Turn 1 = 1 energy, Turn 2 = 2 ...
    aiStyle: "smart",       // "smart" (heuristic) or "random"
    aiThinkMs: 900,         // fake AI "thinking" delay
    turnTimerSec: 45,       // seconds to stage each turn before auto End Turn (0 = no timer)
    cubesEnabled: 1,        // 🎲 Snap/Retreat stakes: match is worth cubes, SNAP doubles them
    unlocksEnabled: 1,      // card progression: 1 = win matches to unlock cards, 0 = all cards available
    unlockStartCount: 16,   // cards unlocked for a brand-new account (cheapest first)
    hintsEnabled: 1,        // rookie hint: glow the best location while dragging
    hintGamesMax: 10,       // hints turn off automatically after this many games
    revealStaggerMs: 900,   // pause between each card reveal
    interactStaggerMs: 130, // pause between multi-target ability hits
    superTeamSize: 2,       // team members needed at one location to unlock a Super
    superUsesPerTeam: 2,    // times each team can fire its Super per match
    superCooldownTurns: 0,  // turns a team must wait between Supers
    superCostMode: "fixed", // "fixed": Super costs superCost energy and you can
                            //   still play cards; "all": consumes ALL energy
    superCost: 2,           // energy price in "fixed" mode
    superBlocksPlays: false,// true = arming a Super ends your card plays (old rule)
    superCountStaged: true, // staged (not yet revealed) cards count toward team size
    teamSynergyMin: 2,      // teammates together at a location to trigger synergy
    teamSynergyBonus: 1,    // +power each synergized card gets
    reviveProtected: true,  // halo (revived) cards can't be destroyed again
    heavyCostMin: 5,        // cards this expensive land with screen shake + slow-mo
    foilCostMin: 6,         // cards this expensive get the animated foil finish
  },

  /* ── SPRITE SHEETS (raw animation assets) ─────────────────────────────────
     Packed from the PNG sequences in effects/ via tools/pack_fx.py.
     frames = total frame count, cols = grid columns, fw/fh = frame px size,
     fps = playback speed.                                                   */
  sprites: {
    fire:     { src: "assets/fx/fire.png",     frames: 20, cols: 5, fw: 176, fh: 99,  fps: 24 },
    fireWide: { src: "assets/fx/fireWide.png", frames: 32, cols: 5, fw: 176, fh: 99,  fps: 30 },
    electric: { src: "assets/fx/electric.png", frames: 27, cols: 5, fw: 176, fh: 69,  fps: 30 },
    zapGreen: { src: "assets/fx/zapGreen.png", frames: 19, cols: 5, fw: 176, fh: 84,  fps: 24 },
    ice:      { src: "assets/fx/ice.png",      frames: 20, cols: 5, fw: 176, fh: 151, fps: 22 },
    buff:     { src: "assets/fx/buff.png",     frames: 7,  cols: 5, fw: 168, fh: 176, fps: 12 },
    aura:     { src: "assets/fx/aura.png",     frames: 7,  cols: 5, fw: 168, fh: 176, fps: 12 },
    smoke:    { src: "assets/fx/smoke.png",    frames: 20, cols: 5, fw: 176, fh: 151, fps: 22 },
    slash:    { src: "assets/fx/slash.png",    frames: 17, cols: 5, fw: 176, fh: 127, fps: 24 },
    flash:    { src: "assets/fx/flash.png",    frames: 12, cols: 5, fw: 176, fh: 161, fps: 24 },
  },

  /* ── FX LIBRARY (semantic effects the game refers to) ─────────────────────
     impact:     sprite key played on the affected card
     projectile: color of the orb that flies source→target on interactions
     sfx:        AUDIO_RECIPES key played on impact
     scale:      impact size relative to the card (1 = card-sized)
     shake:      also shake the screen                                        */
  fxLibrary: {
    fire:     { impact: "fire",     sfx: "fire",     projectile: "#ff8a3d", scale: 2.0, shake: true },
    fireWide: { impact: "fireWide", sfx: "fire",     projectile: "#ff8a3d", scale: 2.6, shake: true },
    ice:      { impact: "ice",      sfx: "ice",      projectile: "#bfe6ff", scale: 2.0 },
    electric: { impact: "electric", sfx: "electric", projectile: "#ffe95e", scale: 2.3, shake: true },
    zap:      { impact: "zapGreen", sfx: "electric", projectile: "#8aff9d", scale: 2.3 },
    buff:     { impact: "buff",     sfx: "buff",     projectile: "#ffd257", scale: 2.3 },
    aura:     { impact: "aura",     sfx: "buff",     projectile: "#7db4ff", scale: 2.3 },
    dark:     { impact: "slash",    sfx: "dark",     projectile: "#b57aff", scale: 2.1 },
    smoke:    { impact: "smoke",    sfx: "boom",     projectile: "#9d9dae", scale: 2.1 },
    flash:    { impact: "flash",    sfx: "chime",    projectile: "#ffffff", scale: 1.9 },
  },

  /* ── TEAMS & SUPER MOVES ───────────────────────────────────────────────
     Get `superTeamSize` members of one team onto the same location (staged
     cards count too, by default) and a SUPER button appears there during
     staging. Frequency/price are governed by the super* rules above:
     uses per team, cooldown between uses, energy cost, and whether arming
     one ends your card plays.
       super: "superAttack" — destroys a random enemy card at that location
              (it goes to their graveyard)
              "superRevive" — brings a card back from YOUR graveyard to that
              location, crowned with a halo
       fx:    fxLibrary key used for the blast/beams
       color: team accent (card dot, button glow, charge particles)        */
  teams: {
    emberkin:    { name: "The Emberkin",     super: "superAttack", fx: "fireWide", color: "#ff8a3d",
                   bark: "barkFire",  members: ["ember_fox","flame_imp","cinder_wolf","phoenix"] },
    stormbound:  { name: "The Stormbound",   super: "superAttack", fx: "electric", color: "#ffe95e",
                   bark: "barkStorm", members: ["storm_caller","storm_sprite","thunder_hawk","arc_titan"] },
    frostborn:   { name: "The Frostborn",    super: "superAttack", fx: "ice",      color: "#bfe6ff",
                   bark: "barkFrost", members: ["frost_witch","frost_giant","tide_caller","leviathan"] },
    radiant:     { name: "The Radiant",      super: "superRevive", fx: "buff",     color: "#ffe9a8",
                   bark: "barkLight", members: ["sun_priest","moon_matron","wisp","royal_gaam"] },
    gravewalkers:{ name: "The Gravewalkers", super: "superRevive", fx: "dark",     color: "#b57aff",
                   bark: "barkDark",  members: ["night_reaper","grave_witch","void_reaper","blood_bat"] },
  },

  /* ── SUPER FINISHERS — full-screen transparent videos (webm with alpha),
     converted from the .mov clips in effects/ via ffmpeg. Set to null to
     disable, or point at any other webm.                                  */
  superFinishers: {
    superAttack: "assets/fx/finisher_attack.webm",
    superRevive: "assets/fx/finisher_revive.webm",
  },

  /* ── CARD DIRECTORY ────────────────────────────────────────────────────── */
  cards: [
    { id: "spark",        name: "Spark",        cost: 1, power: 1,
      imageURL: "assets/cards/spark.png",
      abilityType: "vanilla", abilityId: null,
      abilityText: "",
      vfx: "flash", sfx: "chime" },

    { id: "scout_imp",    name: "Scout Imp",    cost: 1, power: 1,
      imageURL: "assets/cards/scout_imp.png",
      abilityType: "onReveal", abilityId: "drawCard",
      abilityText: "On Reveal: Draw a card.",
      vfx: "flash", interactFx: "flash", sfx: "chime" },

    { id: "ember_fox",    name: "Ember Fox",    cost: 2, power: 3,
      imageURL: "assets/cards/ember_fox.png",
      abilityType: "vanilla", abilityId: null,
      abilityText: "",
      vfx: "fire", sfx: "fire" },

    { id: "war_drummer",  name: "War Drummer",  cost: 2, power: 1,
      imageURL: "assets/cards/war_drummer.png",
      abilityType: "onReveal", abilityId: "buffAdjacent",
      abilityText: "On Reveal: +2 Power to your other cards here.",
      vfx: "buff", interactFx: "buff", sfx: "buff" },

    { id: "stone_golem",  name: "Stone Golem",  cost: 3, power: 5,
      imageURL: "assets/cards/stone_golem.png",
      abilityType: "vanilla", abilityId: null,
      abilityText: "",
      vfx: "smoke", sfx: "boom" },

    { id: "frost_witch",  name: "Frost Witch",  cost: 3, power: 2,
      imageURL: "assets/cards/frost_witch.png",
      abilityType: "onReveal", abilityId: "freezeEnemies",
      abilityText: "On Reveal: -2 Power to each enemy card here.",
      vfx: "ice", interactFx: "ice", sfx: "ice" },

    { id: "shadow_thief", name: "Shadow Thief", cost: 4, power: 3,
      imageURL: "assets/cards/shadow_thief.png",
      abilityType: "onReveal", abilityId: "powerPerEnemy",
      abilityText: "On Reveal: +1 Power for each enemy card here.",
      vfx: "dark", interactFx: "dark", sfx: "dark" },

    { id: "pack_leader",  name: "Pack Leader",  cost: 4, power: 4,
      imageURL: "assets/cards/pack_leader.png",
      abilityType: "ongoing", abilityId: "packBonus",
      abilityText: "Ongoing: +1 Power for each of your other cards here.",
      vfx: "aura", sfx: "boom" },

    { id: "storm_caller", name: "Storm Caller", cost: 5, power: 6,
      imageURL: "assets/cards/storm_caller.png",
      abilityType: "onReveal", abilityId: "smiteRandomEnemy",
      abilityText: "On Reveal: -3 Power to a random enemy card here.",
      vfx: "electric", interactFx: "electric", sfx: "electric" },

    { id: "iron_titan",   name: "Iron Titan",   cost: 5, power: 10,
      imageURL: "assets/cards/iron_titan.png",
      abilityType: "vanilla", abilityId: null,
      abilityText: "",
      vfx: "smoke", sfx: "boom" },

    { id: "night_reaper", name: "Night Reaper", cost: 6, power: 8,
      imageURL: "assets/cards/night_reaper.png",
      abilityType: "onReveal", abilityId: "buffAllFriendly",
      abilityText: "On Reveal: +1 Power to ALL your other cards.",
      vfx: "dark", interactFx: "dark", sfx: "dark" },

    { id: "sky_dragon",   name: "Sky Dragon",   cost: 6, power: 12,
      imageURL: "assets/cards/sky_dragon.png",
      abilityType: "vanilla", abilityId: null,
      abilityText: "",
      vfx: "fireWide", sfx: "fire" },

    /* ── EXPANSION SET — 20 cards ── */
    { id: "wisp",         name: "Wisp",          cost: 1, power: 2,
      imageURL: "assets/cards/wisp.png",
      abilityType: "ongoing", abilityId: "aloneBonus",
      abilityText: "Ongoing: +2 Power if this is your only card here.",
      vfx: "aura", sfx: "chime" },

    { id: "flame_imp",    name: "Flame Imp",     cost: 1, power: 2,
      imageURL: "assets/cards/flame_imp.png",
      abilityType: "vanilla", abilityId: null, abilityText: "",
      vfx: "fire", sfx: "fire" },

    { id: "tide_caller",  name: "Tide Caller",   cost: 2, power: 2,
      imageURL: "assets/cards/tide_caller.png",
      abilityType: "onReveal", abilityId: "buffIfLosing",
      abilityText: "On Reveal: +3 Power if you're losing this location.",
      vfx: "ice", interactFx: "ice", sfx: "ice" },

    { id: "bone_hound",   name: "Bone Hound",    cost: 2, power: 4,
      imageURL: "assets/cards/bone_hound.png",
      abilityType: "vanilla", abilityId: null, abilityText: "",
      vfx: "dark", sfx: "dark" },

    { id: "storm_sprite", name: "Storm Sprite",  cost: 2, power: 1,
      imageURL: "assets/cards/storm_sprite.png",
      abilityType: "onReveal", abilityId: "energizer",
      abilityText: "On Reveal: +1 Energy next turn.",
      vfx: "electric", interactFx: "electric", sfx: "electric" },

    { id: "vine_weaver",  name: "Vine Weaver",   cost: 3, power: 3,
      imageURL: "assets/cards/vine_weaver.png",
      abilityType: "ongoing", abilityId: "perEnemyHere",
      abilityText: "Ongoing: +1 Power for each enemy card here.",
      vfx: "zap", sfx: "buff" },

    { id: "blood_bat",    name: "Blood Bat",     cost: 3, power: 3,
      imageURL: "assets/cards/blood_bat.png",
      abilityType: "onReveal", abilityId: "stealPower",
      abilityText: "On Reveal: Drain 2 Power from a random enemy card here.",
      vfx: "dark", interactFx: "dark", sfx: "dark" },

    { id: "cinder_wolf",  name: "Cinder Wolf",   cost: 3, power: 4,
      imageURL: "assets/cards/cinder_wolf.png",
      abilityType: "vanilla", abilityId: null, abilityText: "",
      vfx: "fire", sfx: "fire" },

    { id: "frost_giant",  name: "Frost Giant",   cost: 4, power: 7,
      imageURL: "assets/cards/frost_giant.png",
      abilityType: "vanilla", abilityId: null, abilityText: "",
      vfx: "ice", sfx: "ice" },

    { id: "thunder_hawk", name: "Thunder Hawk",  cost: 4, power: 5,
      imageURL: "assets/cards/thunder_hawk.png",
      abilityType: "onReveal", abilityId: "smiteStrongest",
      abilityText: "On Reveal: -3 Power to the strongest enemy card here.",
      vfx: "electric", interactFx: "electric", sfx: "electric" },

    { id: "grave_witch",  name: "Grave Witch",   cost: 4, power: 4,
      imageURL: "assets/cards/grave_witch.png",
      abilityType: "onReveal", abilityId: "globalSmite",
      abilityText: "On Reveal: -1 Power to ALL enemy cards everywhere.",
      vfx: "dark", interactFx: "dark", sfx: "dark" },

    { id: "sun_priest",   name: "Sun Priest",    cost: 4, power: 4,
      imageURL: "assets/cards/sun_priest.png",
      abilityType: "onReveal", abilityId: "buffOtherLocations",
      abilityText: "On Reveal: +1 Power to your cards at other locations.",
      vfx: "buff", interactFx: "buff", sfx: "buff" },

    { id: "obsidian_golem", name: "Obsidian Golem", cost: 5, power: 8,
      imageURL: "assets/cards/obsidian_golem.png",
      abilityType: "vanilla", abilityId: null, abilityText: "",
      vfx: "smoke", sfx: "boom" },

    { id: "sky_serpent",  name: "Sky Serpent",   cost: 5, power: 6,
      imageURL: "assets/cards/sky_serpent.png",
      abilityType: "onReveal", abilityId: "drawCard",
      abilityText: "On Reveal: Draw a card.",
      vfx: "aura", interactFx: "flash", sfx: "chime" },

    { id: "void_reaper",  name: "Void Reaper",   cost: 5, power: 5,
      imageURL: "assets/cards/void_reaper.png",
      abilityType: "onReveal", abilityId: "doubleSmite",
      abilityText: "On Reveal: -2 Power to two random enemy cards here.",
      vfx: "dark", interactFx: "dark", sfx: "dark" },

    { id: "moon_matron",  name: "Moon Matron",   cost: 5, power: 6,
      imageURL: "assets/cards/moon_matron.png",
      abilityType: "ongoing", abilityId: "packBonus",
      abilityText: "Ongoing: +1 Power for each of your other cards here.",
      vfx: "aura", sfx: "buff" },

    { id: "phoenix",      name: "Phoenix",       cost: 6, power: 9,
      imageURL: "assets/cards/phoenix.png",
      abilityType: "onReveal", abilityId: "buffIfLosing",
      abilityText: "On Reveal: +3 Power if you're losing this location.",
      vfx: "fireWide", interactFx: "fire", sfx: "fire" },

    { id: "leviathan",    name: "Leviathan",     cost: 6, power: 13,
      imageURL: "assets/cards/leviathan.png",
      abilityType: "vanilla", abilityId: null, abilityText: "",
      vfx: "ice", sfx: "ice" },

    { id: "arc_titan",    name: "Arc Titan",     cost: 6, power: 8,
      imageURL: "assets/cards/arc_titan.png",
      abilityType: "onReveal", abilityId: "smiteStrongest",
      abilityText: "On Reveal: -3 Power to the strongest enemy card here.",
      vfx: "electric", interactFx: "electric", sfx: "electric" },

    { id: "royal_gaam",   name: "Royal GAAM",    cost: 6, power: 6,
      imageURL: "assets/cards/royal_gaam.png",
      abilityType: "onReveal", abilityId: "royalDecree",
      abilityText: "On Reveal: +2 Power to ALL your other cards.",
      vfx: "buff", interactFx: "buff", sfx: "buff" },
  ],

  /* ── LOCATION POOL ─────────────────────────────────────────────────────
     3 are picked at random each match (deterministic in multiplayer).
     effectId must match the LOCATION_EFFECTS registry in index.html.
     fxKey: fxLibrary effect played on a card when this location changes its
     power as it lands (e.g. dropped onto Frozen Wastes → ice puff + "-1"). */
  locations: [
    { id: "neon_arena",    name: "Neon Arena",    imageURL: "assets/locations/neon_arena.png",
      effectId: null,            fxKey: null,       ambient: "flash",    weather: "neon",   effectText: "No effect." },
    { id: "power_plant",   name: "Power Plant",   imageURL: "assets/locations/power_plant.png",
      effectId: "buffAll",       fxKey: "electric", ambient: "electric", weather: "sparks", effectText: "Cards here have +2 Power." },
    { id: "frozen_wastes", name: "Frozen Wastes", imageURL: "assets/locations/frozen_wastes.png",
      effectId: "chillAll",      fxKey: "ice",      ambient: "ice",      weather: "snow",   effectText: "Cards here have -1 Power." },
    { id: "ancient_forge", name: "Ancient Forge", imageURL: "assets/locations/ancient_forge.png",
      effectId: "forgeFirst",    fxKey: "fire",     ambient: "fire",     weather: "embers", effectText: "First card each player plays here gets +3 Power." },
    { id: "golden_city",   name: "Golden City",   imageURL: "assets/locations/golden_city.png",
      effectId: "crowdedBonus",  fxKey: "buff",     ambient: "buff",     weather: "gold",   effectText: "+1 Power here per card you have here." },
    /* ── video-game homage stages ── */
    { id: "pixel_meadow",  name: "Pixel Meadow",  imageURL: "assets/locations/pixel_meadow.png",
      effectId: null,            fxKey: null,       ambient: "flash",  weather: "gold",   effectText: "No effect. A classic 1-1 stroll." },
    { id: "speedway_loop", name: "Speedway Loop", imageURL: "assets/locations/speedway_loop.png",
      effectId: "forgeFirst",    fxKey: "electric", ambient: "flash",  weather: "sparks", effectText: "First card each player plays here gets +3 Power. Gotta go fast." },
    { id: "haunted_manor", name: "Haunted Manor", imageURL: "assets/locations/haunted_manor.png",
      effectId: "chillAll",      fxKey: "dark",     ambient: "dark",   weather: "fog",    effectText: "Cards here have -1 Power. The dread saps them." },
    { id: "dojo_rooftop",  name: "Rooftop Dojo",  imageURL: "assets/locations/dojo_rooftop.png",
      effectId: "masterBonus",   fxKey: "buff",     ambient: "aura",   weather: "petals", effectText: "Masters (cost 5+) get +2 Power here." },
    { id: "block_fortress",name: "Block Fortress",imageURL: "assets/locations/block_fortress.png",
      effectId: "loneBuilder",   fxKey: "smoke",    ambient: "smoke",  weather: "leaves", effectText: "+2 Power while it's your only card here." },
    { id: "crystal_caverns",name:"Crystal Caverns",imageURL:"assets/locations/crystal_caverns.png",
      effectId: "buffAll",       fxKey: "ice",      ambient: "aura",   weather: "snow",   effectText: "Cards here have +2 Power." },
    { id: "star_cruiser",  name: "Star Cruiser",  imageURL: "assets/locations/star_cruiser.png",
      effectId: "crowdedBonus",  fxKey: "zap",      ambient: "electric",weather: "stars", effectText: "+1 Power here per card you have here. Squadron up." },
  ],

  /* ── MUSIC ─────────────────────────────────────────────────────────────
     Per-screen and per-location soundtrack. Each entry:
       src:    path to an MP3 (drop files in assets/music/). If the file is
               missing or fails to load, the synth theme below plays instead.
       chords: chord progression for the synth fallback (Hz per voice)
       beat:   seconds per chord
     Battle music = the entry matching the FIRST location picked for the
     match, falling back to "battle", falling back to synth.               */
  music: {
    /* mode: "stage" = each stage's own track (battle as fallback);
       "random" = every match picks a random track from `pool`.
       Toggle either way in Admin → Music. */
    mode: "random",
    pool: [
      "assets/music/Backseat-Victory-epic.mp3",
      "assets/music/Briefing-at-Sunset.mp3",
      "assets/music/Dogfight-Arcade-Run.mp3",
      "assets/music/Backseat Victory.mp3",
    ],
    menu:          { src: "assets/music/Dust-On-The-Circuit.mp3",
                     chords: [[220,261.6,329.6],[174.6,220,261.6],[130.8,164.8,196,261.6],[196,246.9,293.7]],
                     beat: 1.9 },
    battle:        { src: "assets/music/Backseat-Victory-epic.mp3",
                     chords: [[146.8,174.6,220],[116.5,146.8,174.6],[174.6,220,261.6],[130.8,164.8,196]],
                     beat: 1.5 },
    neon_arena:    { src: "assets/music/neon_arena.mp3",
                     chords: [[220,261.6,329.6],[164.8,196,246.9],[174.6,220,261.6],[196,246.9,293.7]],
                     beat: 1.3 },
    power_plant:   { src: "assets/music/power_plant.mp3",
                     chords: [[164.8,196,246.9],[146.8,185,220],[164.8,196,246.9],[196,233,293.7]],
                     beat: 1.15 },
    frozen_wastes: { src: "assets/music/frozen_wastes.mp3",
                     chords: [[164.8,246.9,329.6],[130.8,196,261.6],[196,293.7,392],[146.8,220,293.7]],
                     beat: 2.4 },
    ancient_forge: { src: "assets/music/ancient_forge.mp3",
                     chords: [[130.8,155.6,196],[103.8,130.8,155.6],[155.6,185,233],[98,123.5,146.8]],
                     beat: 1.6 },
    golden_city:   { src: "assets/music/golden_city.mp3",
                     chords: [[261.6,329.6,392],[196,246.9,293.7],[220,261.6,329.6],[174.6,220,261.6]],
                     beat: 1.7 },
    pixel_meadow:  { src: "assets/music/pixel_meadow.mp3",
                     chords: [[261.6,329.6,392],[220,277.2,329.6],[293.7,370,440],[261.6,311.1,392]],
                     beat: 1.05 },
    speedway_loop: { src: "assets/music/speedway_loop.mp3",
                     chords: [[196,246.9,311.1],[174.6,220,277.2],[196,246.9,311.1],[233,293.7,349.2]],
                     beat: 0.95 },
    haunted_manor: { src: "assets/music/haunted_manor.mp3",
                     chords: [[110,130.8,164.8],[103.8,123.5,155.6],[110,138.6,164.8],[98,116.5,146.8]],
                     beat: 2.6 },
    dojo_rooftop:  { src: "assets/music/dojo_rooftop.mp3",
                     chords: [[146.8,185,220],[130.8,164.8,196],[164.8,207.7,246.9],[146.8,174.6,220]],
                     beat: 1.7 },
    block_fortress:{ src: "assets/music/block_fortress.mp3",
                     chords: [[196,246.9,293.7],[164.8,207.7,246.9],[174.6,220,261.6],[146.8,185,220]],
                     beat: 1.8 },
    crystal_caverns:{src: "assets/music/crystal_caverns.mp3",
                     chords: [[164.8,246.9,311.1],[146.8,220,277.2],[185,277.2,349.2],[155.6,233,293.7]],
                     beat: 2.2 },
    star_cruiser:  { src: "assets/music/star_cruiser.mp3",
                     chords: [[130.8,196,261.6],[116.5,174.6,233],[146.8,220,293.7],[123.5,185,246.9]],
                     beat: 1.4 },
  },

  /* ── ANNOUNCER VOICE ───────────────────────────────────────────────────
     Arcade announcer for the big banner moments (round starts, supers,
     revives, snaps, results). Uses the browser's speech synthesis — no
     audio files. `style` picks from `styles` (admin-publishable so every
     player hears the same character); players can mute it with the 🎙
     toggle in the top bar. */
  voice: {
    enabled: 1,
    style: "maxhype", /* which of the styles below to use */
    styles: {
      maxhype:   { label: "Maximum Hype",   pitch: 1.0,  rate: 1.22, voiceHint: "google|natural|neural|online|guy|alex|aaron", excite: 1 },
      arcade:    { label: "Arcade Hype",    pitch: 0.55, rate: 1.12, voiceHint: "male|david|daniel|fred", excite: 1 },
      deep:      { label: "Deep Doom",      pitch: 0.30, rate: 0.92, voiceHint: "male|david|daniel|fred" },
      hype:      { label: "Fast Hype",      pitch: 0.85, rate: 1.35, voiceHint: "" },
      robot:     { label: "Robo Referee",   pitch: 0.12, rate: 1.02, voiceHint: "zarvox|robot|whisper" },
      announcer: { label: "Ring Announcer", pitch: 0.45, rate: 0.85, voiceHint: "male|david|daniel" },
    },
  },

  /* ── CLOUD (Supabase) ───────────────────────────────────────────────────
     Online accounts, cloud decks/stats, global leaderboard, and the
     admin-published universal config. The anonKey is a PUBLIC client key —
     safe to commit; all security is enforced server-side by RLS policies
     (admin writes are restricted to adminEmail's signed-in account).
     Delete/blank this section to run fully local/offline.               */
  cloud: {
    url: "https://rzaajtnvdatuvlcsefqa.supabase.co",
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6YWFqdG52ZGF0dXZsY3NlZnFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2OTE2NzksImV4cCI6MjEwNTI2NzY3OX0._fWcFrmFVp_8NX0Aoj3NKH4JPSkQaiZmWKvdKmu8BHE",
    adminEmail: "ryan@gaamgood.com",
  },

  /* ── MULTIPLAYER ───────────────────────────────────────────────────────── */
  net: {
    codePrefix: "GAAM-",  // matchmaking codes look like GAAM-X7K2
    codeLength: 4,
  },
};
