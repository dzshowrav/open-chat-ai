# OpenCode Theme Color Palettes — Complete Reference

> **Total Themes:** 37  
> **Source:** OpenCode v1.17.16 built-in theme definitions  
> **Last Updated:** July 2026

---

## Table of Contents

1. [AMOLED](#1-amoled)
2. [Aura](#2-aura)
3. [Ayu](#3-ayu)
4. [Carbonfox](#4-carbonfox)
5. [Catppuccin](#5-catppuccin)
6. [Catppuccin Frappe](#6-catppuccin-frappe)
7. [Catppuccin Macchiato](#7-catppuccin-macchiato)
8. [Cobalt2](#8-cobalt2)
9. [Cursor](#9-cursor)
10. [Dracula](#10-dracula)
11. [Everforest](#11-everforest)
12. [Flexoki](#12-flexoki)
13. [GitHub](#13-github)
14. [Gruvbox](#14-gruvbox)
15. [Kanagawa](#15-kanagawa)
16. [Lucent Orng](#16-lucent-orng)
17. [Material](#17-material)
18. [Matrix](#18-matrix)
19. [Mercury](#19-mercury)
20. [Monokai](#20-monokai)
21. [Night Owl](#21-night-owl)
22. [Nord](#22-nord)
23. [One Dark](#23-one-dark)
24. [One Dark Pro](#24-one-dark-pro)
25. [OpenCode (Default)](#25-opencode-default)
26. [Orng](#26-orng)
27. [Osaka Jade](#27-osaka-jade)
28. [Palenight](#28-palenight)
29. [Rose Pine](#29-rose-pine)
30. [Shades of Purple](#30-shades-of-purple)
31. [Solarized](#31-solarized)
32. [Synthwave '84](#32-synthwave-84)
33. [Tokyonight](#33-tokyonight)
34. [Vercel](#34-vercel)
35. [Vesper](#35-vesper)
36. [Zenburn](#36-zenburn)
37. [OC-2 (Secondary OpenCode)](#37-oc-2-secondary-opencode)

---

## Color Key / Legend

Each theme defines the following color roles:

| Token | Description |
|-------|-------------|
| **neutral** | Primary background color of the editor |
| **ink** | Primary text/foreground color |
| **primary** | Main accent color (links, buttons, selection highlights) |
| **accent** | Secondary accent color |
| **success** | Success state indicator (green) |
| **warning** | Warning state indicator (yellow/amber) |
| **error** | Error state indicator (red) |
| **info** | Info state indicator (blue/cyan) |
| **interactive** | Interactive element color (forms, inputs) |
| **diffAdd** | Git diff line addition color |
| **diffDelete** | Git diff line deletion color |

### Syntax Highlighting Tokens

| Token | Description |
|-------|-------------|
| **syntax-comment** | Code comments |
| **syntax-keyword** | Language keywords (if, else, return, class, etc.) |
| **syntax-string** | String literals |
| **syntax-primitive** | Primitive types, built-in names |
| **syntax-variable** | Variable names |
| **syntax-property** | Object properties, keys |
| **syntax-type** | Type annotations, class names |
| **syntax-constant** | Constants, macros, static values |
| **syntax-operator** | Operators (+, -, &&, etc.) |
| **syntax-punctuation** | Brackets, semicolons, commas |
| **syntax-object** | Object/class references |

### Markdown Tokens

| Token | Description |
|-------|-------------|
| **markdown-heading** | Heading text |
| **markdown-text** | Body text |
| **markdown-link** | Link URL |
| **markdown-link-text** | Link display text |
| **markdown-code** | Inline code |
| **markdown-block-quote** | Blockquote |
| **markdown-emph** | Emphasis (italic) |
| **markdown-strong** | Strong (bold) |
| **markdown-horizontal-rule** | Horizontal rule |
| **markdown-list-item** | List item bullet |
| **markdown-list-enumeration** | List number |
| **markdown-image** | Image URL |
| **markdown-image-text** | Image alt text |
| **markdown-code-block** | Code block text |

---

## 1. AMOLED

A high-contrast theme optimized for OLED/AMOLED displays with true black backgrounds.

### Light Mode

| Token | Color | Hex |
|-------|-------|-----|
| neutral | `#f0f0f0` | Light gray |
| ink | `#0a0a0a` | Near black |
| primary | `#6200ff` | Deep purple |
| accent | `#ff0080` | Hot pink |
| success | `#00e676` | Green |
| warning | `#ffab00` | Amber |
| error | `#ff1744` | Red |
| info | `#00b0ff` | Cyan |
| diffAdd | `#00e676` | Green |
| diffDelete | `#ff1744` | Red |

**Syntax:** comment=`#757575`, keyword=`#d500f9`, string=`#00e676`, primitive=`#00b0ff`, property=`#ff9100`, constant=`#6200ff`

### Dark Mode

| Token | Color | Hex |
|-------|-------|-----|
| neutral | `#000000` | True black |
| ink | `#ffffff` | White |
| primary | `#b388ff` | Light purple |
| accent | `#ff4081` | Pink |
| success | `#00ff88` | Mint green |
| warning | `#ffea00` | Yellow |
| error | `#ff1744` | Red |
| info | `#18ffff` | Cyan |
| diffAdd | `#00ff88` | Mint green |
| diffDelete | `#ff1744` | Red |

**Syntax:** comment=`#555555`, keyword=`#ff00ff`, string=`#00ff88`, primitive=`#18ffff`, property=`#ffea00`, constant=`#b388ff`

---

## 2. Aura

A dark purple-themed design with soft, dreamy pastel accents.

### Light Mode

| Token | Color | Hex |
|-------|-------|-----|
| neutral | `#f5f0ff` | Lavender white |
| ink | `#2d2640` | Deep purple-black |
| primary | `#a277ff` | Soft purple |
| accent | `#d94f4f` | Soft red |
| success | `#40bf7a` | Green |
| warning | `#d9a24a` | Gold |
| error | `#d94f4f` | Soft red |
| info | `#5bb8d9` | Sky blue |
| diffAdd | `#b3e6cc` | Light green |
| diffDelete | `#f5b3b3` | Light red |

**Syntax:** comment=`#8d88a3`, keyword=`#7b5ae0`, string=`#2b8a57`, primitive=`#2f78b8`, property=`#a96a22`, type=`#2b8a57`, constant=`#d94f4f`

### Dark Mode

| Token | Color | Hex |
|-------|-------|-----|
| neutral | `#15141b` | Deep dark purple |
| ink | `#edecee` | Off-white |
| primary | `#a277ff` | Soft purple |
| accent | `#ff6767` | Soft red |
| success | `#61ffca` | Mint |
| warning | `#ffca85` | Peach |
| error | `#ff6767` | Soft red |
| info | `#82e2ff` | Light blue |
| diffAdd | `#61ffca` | Mint |
| diffDelete | `#ff6767` | Soft red |

**Syntax:** comment=`#6d6a7e`, keyword=`#a277ff`, string=`#61ffca`, primitive=`#82e2ff`, property=`#ffca85`, type=`#61ffca`, constant=`#ff6767`

---

## 3. Ayu

A warm, earthy theme inspired by the colors of dawn in the Himalayas.

### Light Mode

| Token | Color | Hex |
|-------|-------|-----|
| neutral | `#fdfaf4` | Warm cream |
| ink | `#4f5964` | Slate gray |
| primary | `#4aa8c8` | Teal blue |
| accent | `#ef7d71` | Coral |
| success | `#5fb978` | Green |
| warning | `#ea9f41` | Orange |
| error | `#e6656a` | Salmon red |
| info | `#2f9bce` | Blue |
| diffAdd | `#b1d780` | Light green |
| diffDelete | `#e6656a` | Salmon red |

**Syntax:** comment=`#6e7681`, keyword=`#c76a1a`, string=`#6f8f00`, primitive=`#b87500`, property=`#2f86b7`, type=`#227fc0`, constant=`#a37acc`

### Dark Mode

| Token | Color | Hex |
|-------|-------|-----|
| neutral | `#0f1419` | Very dark blue |
| ink | `#d6dae0` | Light gray-blue |
| primary | `#3fb7e3` | Sky blue |
| accent | `#f2856f` | Coral |
| success | `#78d05c` | Green |
| warning | `#e4a75c` | Amber |
| error | `#f58572` | Salmon |
| info | `#66c6f1` | Light blue |
| diffAdd | `#59c57c` | Green |
| diffDelete | `#f58572` | Salmon |

**Syntax:** comment=`#5a6673`, keyword=`#ff8f40`, string=`#aad94c`, primitive=`#ffb454`, property=`#39bae6`, type=`#59c2ff`, constant=`#d2a6ff`

---

## 4. Carbonfox

A theme inspired by IBM's Carbon Design System — clean, professional, enterprise-grade.

### Light Mode

| Token | Color | Hex |
|-------|-------|-----|
| neutral | `#8e8e8e` | Gray |
| ink | `#161616` | Near black |
| primary | `#0072c3` | IBM Blue |
| accent | `#da1e28` | IBM Red |
| success | `#198038` | Green |
| warning | `#f1c21b` | Yellow |
| error | `#da1e28` | IBM Red |
| info | `#0043ce` | Dark blue |
| interactive | `#0f62fe` | IBM Blue 60 |
| diffAdd | `#198038` | Green |
| diffDelete | `#da1e28` | Red |

**Syntax:** comment=`#6f6f6f`, keyword=`#8a3ffc`, string=`#198038`, primitive=`#0f62fe`, property=`#0043ce`, type=`#8a5f00`, constant=`#da1e28`

### Dark Mode

| Token | Color | Hex |
|-------|-------|-----|
| neutral | `#393939` | Dark gray |
| ink | `#f2f4f8` | Light gray |
| primary | `#33b1ff` | Bright blue |
| accent | `#ff8389` | Light red |
| success | `#42be65` | Green |
| warning | `#f1c21b` | Yellow |
| error | `#ff8389` | Light red |
| info | `#78a9ff` | Light blue |
| interactive | `#4589ff` | Blue |
| diffAdd | `#42be65` | Green |
| diffDelete | `#ff8389` | Light red |

**Syntax:** comment=`#6f6f6f`, keyword=`#be95ff`, string=`#42be65`, primitive=`#33b1ff`, property=`#78a9ff`, type=`#f1c21b`, constant=`#ff8389`

---

## 5. Catppuccin

The original Catppuccin — a warm, pastel-themed design with a latte-inspired light variant and deep dark base.

### Light Mode

| Token | Color | Hex |
|-------|-------|-----|
| neutral | `#f5e0dc` | Rose latte |
| ink | `#4c4f69` | Dark slate |
| primary | `#7287fd` | Soft blue |
| accent | `#d20f39` | Red |
| success | `#40a02b` | Green |
| warning | `#df8e1d` | Gold |
| error | `#d20f39` | Red |
| info | `#04a5e5` | Cyan |
| diffAdd | `#a6d189` | Light green |
| diffDelete | `#e78284` | Light red |

**Syntax:** comment=`#6c7086`, keyword=`#8839ef`, primitive=`#1e66f5`, constant=`#ca6702`

### Dark Mode

| Token | Color | Hex |
|-------|-------|-----|
| neutral | `#1e1e2e` | Deep dark blue |
| ink | `#cdd6f4` | Light blue-white |
| primary | `#b4befe` | Soft lavender |
| accent | `#f38ba8` | Pink |
| success | `#a6d189` | Green |
| warning | `#f4b8e4` | Pink |
| error | `#f38ba8` | Pink |
| info | `#89dceb` | Cyan |
| diffAdd | `#94e2d5` | Teal |
| diffDelete | `#f38ba8` | Pink |

**Syntax:** comment=`#6c7086`, keyword=`#cba6f7`, primitive=`#89b4fa`, constant=`#fab387`

---

## 6. Catppuccin Frappe

The Frappe variant of Catppuccin — a darker, cooler-toned version with a muted blue-gray background.

> **Note:** Light and Dark modes use identical palette — this theme is designed as a dark-only experience.

| Token | Color | Hex |
|-------|-------|-----|
| neutral | `#303446` | Dark blue-gray |
| ink | `#c6d0f5` | Light periwinkle |
| primary | `#8da4e2` | Soft blue |
| accent | `#f4b8e4` | Pink |
| success | `#a6d189` | Green |
| warning | `#e5c890` | Yellow |
| error | `#e78284` | Red-pink |
| info | `#81c8be` | Teal |

**Syntax:** text-weak=`#b5bfe2`, comment=`#949cb8`, keyword=`#ca9ee6`, string=`#a6d189`, primitive=`#8da4e2`, variable=`#e78284`, property=`#99d1db`, type=`#e5c890`, constant=`#ef9f76`, operator=`#99d1db`, punctuation=`#c6d0f5`

**Markdown:** heading=`#ca9ee6`, text=`#c6d0f5`, link=`#8da4e2`, link-text=`#99d1db`, code=`#a6d189`, block-quote=`#e5c890`, emph=`#e5c890`, strong=`#ef9f76`, hr=`#a5adce`, list-item=`#8da4e2`, enumeration=`#99d1db`, image=`#8da4e2`, image-text=`#99d1db`, code-block=`#c6d0f5`

---

## 7. Catppuccin Macchiato

The Macchiato variant of Catppuccin — slightly darker than the original, with a cooler blue undertone.

> **Note:** Light and Dark modes use identical palette — designed as a dark-only experience.

| Token | Color | Hex |
|-------|-------|-----|
| neutral | `#24273a` | Deep navy |
| ink | `#cad3f5` | Light periwinkle |
| primary | `#8aadf4` | Soft blue |
| accent | `#f5bde6` | Pink |
| success | `#a6da95` | Green |
| warning | `#eed49f` | Yellow |
| error | `#ed8796` | Red-pink |
| info | `#8bd5ca` | Teal |

**Syntax:** text-weak=`#b8c0e0`, comment=`#939ab7`, keyword=`#c6a0f6`, string=`#a6da95`, primitive=`#8aadf4`, variable=`#ed8796`, property=`#91d7e3`, type=`#eed49f`, constant=`#f5a97f`, operator=`#91d7e3`, punctuation=`#cad3f5`

**Markdown:** heading=`#c6a0f6`, text=`#cad3f5`, link=`#8aadf4`, link-text=`#91d7e3`, code=`#a6da95`, block-quote=`#eed49f`, emph=`#eed49f`, strong=`#f5a97f`, hr=`#a5adcb`, list-item=`#8aadf4`, enumeration=`#91d7e3`, image=`#8aadf4`, image-text=`#91d7e3`, code-block=`#cad3f5`

---

## 8. Cobalt2

A retro-futuristic theme with vibrant blues, cyans, and warm highlights — inspired by classic IDEs.

### Light Mode

| Token | Color | Hex |
|-------|-------|-----|
| neutral | `#ffffff` | White |
| ink | `#193549` | Dark navy |
| primary | `#0066cc` | Blue |
| accent | `#00acc1` | Cyan |
| success | `#4caf50` | Green |
| warning | `#ff9800` | Orange |
| error | `#e91e63` | Pink-red |
| info | `#ff5722` | Deep orange |

**Syntax:** comment=`#5c6b7d`, keyword=`#ff5722`, string=`#4caf50`, primitive=`#ff9800`, property=`#00acc1`, type=`#00acc1`, constant=`#e91e63`

**Markdown:** heading=`#ff9800`, text=`#193549`, link=`#0066cc`, link-text=`#00acc1`, code=`#4caf50`, block-quote=`#5c6b7d`, emph=`#ff5722`, strong=`#e91e63`, hr=`#d3dae3`, list-item=`#0066cc`, enumeration=`#00acc1`, code-block=`#193549`

### Dark Mode

| Token | Color | Hex |
|-------|-------|-----|
| neutral | `#193549` | Dark navy |
| ink | `#ffffff` | White |
| primary | `#0088ff` | Bright blue |
| accent | `#2affdf` | Cyan |
| success | `#9eff80` | Light green |
| warning | `#ffc600` | Yellow |
| error | `#ff0088` | Hot pink |
| info | `#ff9d00` | Orange |
| diffAdd | `#b9ff9f` | Light green |
| diffDelete | `#ff5fb3` | Pink |

**Syntax:** comment=`#adb7c9`, keyword=`#ff9d00`, string=`#9eff80`, primitive=`#ffc600`, property=`#2affdf`, type=`#2affdf`, constant=`#ff628c`

**Markdown:** heading=`#ffc600`, text=`#ffffff`, link=`#0088ff`, link-text=`#2affdf`, code=`#9eff80`, block-quote=`#adb7c9`, emph=`#ff9d00`, strong=`#ff628c`, hr=`#2d5a7b`, list-item=`#0088ff`, enumeration=`#2affdf`, code-block=`#ffffff`

---

## 9. Cursor

A clean, minimal theme inspired by the Cursor editor design language.

### Light Mode

| Token | Color | Hex |
|-------|-------|-----|
| neutral | `#fcfcfc` | Near white |
| ink | `#141414` | Near black |
| primary | `#6f9ba6` | Muted teal |
| accent | `#6f9ba6` | Muted teal |
| success | `#1f8a65` | Green |
| warning | `#db704b` | Orange |
| error | `#cf2d56` | Red |
| info | `#3c7cab` | Blue |
| interactive | `#206595` | Dark blue |
| diffAdd | `#55a583` | Green |
| diffDelete | `#e75e78` | Red-pink |

**Syntax:** comment=`#141414ad`, keyword=`#b3003f`, string=`#9e94d5`, primitive=`#db704b`, property=`#141414ad`, type=`#206595`, constant=`#b8448f`

### Dark Mode

| Token | Color | Hex |
|-------|-------|-----|
| neutral | `#181818` | Near black |
| ink | `#e4e4e4` | Light gray |
| primary | `#88c0d0` | Teal |
| accent | `#88c0d0` | Teal |
| success | `#3fa266` | Green |
| warning | `#f1b467` | Amber |
| error | `#e34671` | Rose |
| info | `#81a1c1` | Blue-gray |
| interactive | `#82D2CE` | Cyan |
| diffAdd | `#70b489` | Green |
| diffDelete | `#fc6b83` | Red |

**Syntax:** comment=`#e4e4e45e`, keyword=`#82D2CE`, string=`#E394DC`, primitive=`#EFB080`, property=`#81a1c1`, type=`#EFB080`, constant=`#F8C762`

---

## 10. Dracula

The iconic Dracula theme — a dark gothic palette with vibrant, saturated accents.

### Light Mode

| Token | Color | Hex |
|-------|-------|-----|
| neutral | `#f8f8f2` | Off-white |
| ink | `#1f1f2f` | Dark purple-black |
| primary | `#7c6bf5` | Purple |
| accent | `#d16090` | Pink |
| success | `#2fbf71` | Green |
| warning | `#f7a14d` | Orange |
| error | `#d9536f` | Red |
| info | `#1d7fc5` | Blue |
| diffAdd | `#9fe3b3` | Light green |
| diffDelete | `#f8a1b8` | Light pink |

**Syntax:** comment=`#7d7f97`, keyword=`#d16090`, string=`#596600`, primitive=`#2f8f57`, property=`#1d7fc5`, constant=`#7c6bf5`

### Dark Mode

| Token | Color | Hex |
|-------|-------|-----|
| neutral | `#1d1e28` | Dark purple-black |
| ink | `#f8f8f2` | Off-white |
| primary | `#bd93f9` | Soft purple |
| accent | `#ff79c6` | Pink |
| success | `#50fa7b` | Mint green |
| warning | `#ffb86c` | Orange |
| error | `#ff5555` | Red |
| info | `#8be9fd` | Cyan |
| diffAdd | `#2fb27d` | Green |
| diffDelete | `#ff6b81` | Pink-red |

**Syntax:** comment=`#6272a4`, keyword=`#ff79c6`, string=`#f1fa8c`, primitive=`#50fa7b`, property=`#8be9fd`, constant=`#bd93f9`

---

## 11. Everforest

A warm, nature-inspired theme with earthy greens and soft, muted tones.

### Light Mode

| Token | Color | Hex |
|-------|-------|-----|
| neutral | `#fdf6e3` | Warm cream |
| ink | `#5c6a72` | Slate gray |
| primary | `#8da101` | Olive green |
| accent | `#df69ba` | Pink |
| success | `#8da101` | Olive green |
| warning | `#f57d26` | Orange |
| error | `#f85552` | Red |
| info | `#35a77c` | Teal |
| diffAdd | `#4db380` | Green |
| diffDelete | `#f52a65` | Red |

**Syntax:** comment=`#a6b0a0`, keyword=`#df69ba`, string=`#8da101`, primitive=`#8da101`, variable=`#f85552`, property=`#35a77c`, type=`#dfa000`, constant=`#f57d26`, operator=`#35a77c`

### Dark Mode

| Token | Color | Hex |
|-------|-------|-----|
| neutral | `#2d353b` | Dark slate |
| ink | `#d3c6aa` | Warm beige |
| primary | `#a7c080` | Sage green |
| accent | `#d699b6` | Mauve |
| success | `#a7c080` | Sage green |
| warning | `#e69875` | Peach |
| error | `#e67e80` | Dusty red |
| info | `#83c092` | Mint |
| diffAdd | `#b8db87` | Light green |
| diffDelete | `#e26a75` | Dusty red |

**Syntax:** comment=`#7a8478`, keyword=`#d699b6`, string=`#a7c080`, primitive=`#a7c080`, variable=`#e67e80`, property=`#83c092`, type=`#dbbc7f`, constant=`#e69875`, operator=`#83c092`

---

## 12. Flexoki

A high-contrast, print-inspired theme designed for readability with warm paper-like tones in light mode.

### Light Mode

| Token | Color | Hex |
|-------|-------|-----|
| neutral | `#FFFCF0` | Paper white |
| ink | `#100F0F` | Near black |
| primary | `#205EA6` | Blue |
| accent | `#BC5215` | Rust orange |
| success | `#66800B` | Olive |
| warning | `#BC5215` | Rust orange |
| error | `#AF3029` | Red |
| info | `#24837B` | Teal |

**Syntax:** comment=`#6F6E69`, keyword=`#66800B`, string=`#24837B`, primitive=`#BC5215`, variable=`#205EA6`, property=`#24837B`, type=`#AD8301`, constant=`#5E409D`

**Markdown:** heading=`#5E409D`, text=`#100F0F`, link=`#205EA6`, link-text=`#24837B`, code=`#24837B`, block-quote=`#AD8301`, emph=`#AD8301`, strong=`#BC5215`, hr=`#6F6E69`, list-item=`#BC5215`, enumeration=`#24837B`, image=`#A02F6F`, code-block=`#100F0F`

### Dark Mode

| Token | Color | Hex |
|-------|-------|-----|
| neutral | `#100F0F` | Near black |
| ink | `#CECDC3` | Warm gray |
| primary | `#DA702C` | Burnt orange |
| accent | `#8B7EC8` | Lavender |
| success | `#879A39` | Olive |
| warning | `#DA702C` | Burnt orange |
| error | `#D14D41` | Brick red |
| info | `#3AA99F` | Teal |
| interactive | `#4385BE` | Blue |

**Syntax:** comment=`#6F6E69`, keyword=`#879A39`, string=`#3AA99F`, primitive=`#DA702C`, variable=`#4385BE`, property=`#3AA99F`, type=`#D0A215`, constant=`#8B7EC8`

**Markdown:** heading=`#8B7EC8`, text=`#CECDC3`, link=`#4385BE`, link-text=`#3AA99F`, code=`#3AA99F`, block-quote=`#D0A215`, emph=`#D0A215`, strong=`#DA702C`, hr=`#6F6E69`, list-item=`#DA702C`, enumeration=`#3AA99F`, image=`#CE5D97`, code-block=`#CECDC3`

---

## 13. GitHub

A faithful reproduction of GitHub's editor color scheme.

### Light Mode

| Token | Color | Hex |
|-------|-------|-----|
| neutral | `#ffffff` | White |
| ink | `#24292f` | GitHub dark |
| primary | `#0969da` | GitHub blue |
| accent | `#1b7c83` | Teal |
| success | `#1a7f37` | Green |
| warning | `#9a6700` | Brown |
| error | `#cf222e` | Red |
| info | `#bc4c00` | Orange |

**Syntax:** comment=`#57606a`, keyword=`#cf222e`, string=`#0969da`, primitive=`#8250df`, variable=`#bc4c00`, property=`#1b7c83`, type=`#bc4c00`, constant=`#1b7c83`

### Dark Mode

| Token | Color | Hex |
|-------|-------|-----|
| neutral | `#0d1117` | GitHub dark |
| ink | `#c9d1d9` | Light gray |
| primary | `#58a6ff` | Bright blue |
| accent | `#39c5cf` | Cyan |
| success | `#3fb950` | Green |
| warning | `#e3b341` | Yellow |
| error | `#f85149` | Red |
| info | `#d29922` | Gold |

**Syntax:** comment=`#8b949e`, keyword=`#ff7b72`, string=`#39c5cf`, primitive=`#bc8cff`, variable=`#d29922`, property=`#39c5cf`, type=`#d29922`, constant=`#58a6ff`

---

## 14. Gruvbox

A retro, warmly-colored theme inspired by the classic Gruvbox palette.

### Light Mode

| Token | Color | Hex |
|-------|-------|-----|
| neutral | `#fbf1c7` | Warm cream |
| ink | `#3c3836` | Dark brown |
| primary | `#076678` | Teal |
| accent | `#9d0006` | Brick red |
| success | `#79740e` | Olive |
| warning | `#b57614` | Amber |
| error | `#9d0006` | Brick red |
| info | `#8f3f71` | Mauve |
| diffAdd | `#79740e` | Olive |
| diffDelete | `#9d0006` | Brick red |

**Syntax:** comment=`#928374`, keyword=`#9d0006`, primitive=`#076678`, constant=`#8f3f71`

### Dark Mode

| Token | Color | Hex |
|-------|-------|-----|
| neutral | `#282828` | Dark brown |
| ink | `#ebdbb2` | Warm beige |
| primary | `#83a598` | Muted teal |
| accent | `#fb4934` | Red |
| success | `#b8bb26` | Green |
| warning | `#fabd2f` | Yellow |
| error | `#fb4934` | Red |
| info | `#d3869b` | Pink |
| diffAdd | `#b8bb26` | Green |
| diffDelete | `#fb4934` | Red |

**Syntax:** comment=`#928374`, keyword=`#fb4934`, primitive=`#83a598`, constant=`#d3869b`

---

## 15. Kanagawa

A Japanese art-inspired theme with subtle, earthy tones and elegant contrasts.

### Light Mode

| Token | Color | Hex |
|-------|-------|-----|
| neutral | `#F2E9DE` | Warm cream |
| ink | `#54433A` | Dark brown |
| primary | `#2D4F67` | Dark blue |
| accent | `#D27E99` | Rose |
| success | `#98BB6C` | Olive green |
| warning | `#D7A657` | Gold |
| error | `#E82424` | Red |
| info | `#76946A` | Sage |
| diffAdd | `#89AF5B` | Green |
| diffDelete | `#D61F1F` | Red |

**Syntax:** comment=`#9E9389`, keyword=`#957FB8`, string=`#98BB6C`, primitive=`#2D4F67`, variable=`#54433A`, property=`#76946A`, type=`#C38D9D`, constant=`#D7A657`, operator=`#D27E99`

### Dark Mode

| Token | Color | Hex |
|-------|-------|-----|
| neutral | `#1F1F28` | Dark navy-black |
| ink | `#DCD7BA` | Warm beige |
| primary | `#7E9CD8` | Soft blue |
| accent | `#D27E99` | Rose |
| success | `#98BB6C` | Olive green |
| warning | `#D7A657` | Gold |
| error | `#E82424` | Red |
| info | `#76946A` | Sage |
| diffAdd | `#A9D977` | Light green |
| diffDelete | `#F24A4A` | Red |

**Syntax:** comment=`#727169`, keyword=`#957FB8`, string=`#98BB6C`, primitive=`#7E9CD8`, variable=`#DCD7BA`, property=`#76946A`, type=`#C38D9D`, constant=`#D7A657`, operator=`#D27E99`

---

## 16. Lucent Orng

A luminous, orange-focused theme with warm, glowing accents.

### Light Mode

| Token | Color | Hex |
|-------|-------|-----|
| neutral | `#fff5f0` | Warm white |
| ink | `#1a1a1a` | Near black |
| primary | `#EC5B2B` | Vibrant orange |
| accent | `#c94d24` | Deep orange |
| success | `#0062d1` | Blue |
| warning | `#EC5B2B` | Vibrant orange |
| error | `#d1383d` | Red |
| info | `#318795` | Teal |
| diffDelete | `#f52a65` | Red-pink |

**Syntax:** comment=`#8a8a8a`, keyword=`#EC5B2B`, string=`#0062d1`, primitive=`#c94d24`, variable=`#d1383d`, property=`#318795`, type=`#b0851f`, constant=`#EC5B2B`

### Dark Mode

| Token | Color | Hex |
|-------|-------|-----|
| neutral | `#2a1a15` | Dark warm brown |
| ink | `#eeeeee` | Off-white |
| primary | `#EC5B2B` | Vibrant orange |
| accent | `#FFF7F1` | Warm white |
| success | `#6ba1e6` | Blue |
| warning | `#EC5B2B` | Vibrant orange |
| error | `#e06c75` | Rose |
| info | `#56b6c2` | Cyan |
| diffDelete | `#e26a75` | Rose |

**Syntax:** comment=`#808080`, keyword=`#EC5B2B`, string=`#6ba1e6`, primitive=`#EE7948`, variable=`#e06c75`, property=`#56b6c2`, type=`#e5c07b`, constant=`#FFF7F1`

---

## 17. Material

A theme based on Google's Material Design color system — clean, balanced, and recognizable.

### Light Mode

| Token | Color | Hex |
|-------|-------|-----|
| neutral | `#fafafa` | Near white |
| ink | `#263238` | Dark blue-gray |
| primary | `#6182b8` | Blue |
| accent | `#39adb5` | Teal |
| success | `#91b859` | Green |
| warning | `#ffb300` | Amber |
| error | `#e53935` | Red |
| info | `#f4511e` | Deep orange |
| interactive | `#39adb5` | Teal |

**Syntax:** comment=`#90a4ae`, keyword=`#7c4dff`, string=`#91b859`, primitive=`#6182b8`, property=`#7c4dff`, type=`#ffb300`, constant=`#f4511e`, operator=`#39adb5`

### Dark Mode

| Token | Color | Hex |
|-------|-------|-----|
| neutral | `#263238` | Dark blue-gray |
| ink | `#eeffff` | Ice white |
| primary | `#82aaff` | Light blue |
| accent | `#89ddff` | Cyan |
| success | `#c3e88d` | Light green |
| warning | `#ffcb6b` | Amber |
| error | `#f07178` | Light red |
| info | `#ffcb6b` | Amber |
| interactive | `#89ddff` | Cyan |

**Syntax:** comment=`#546e7a`, keyword=`#c792ea`, string=`#c3e88d`, primitive=`#82aaff`, property=`#c792ea`, type=`#ffcb6b`, constant=`#ffcb6b`, operator=`#89ddff`

---

## 18. Matrix

A green-on-black hacker-themed design inspired by The Matrix — now with a light mode too.

### Light Mode

| Token | Color | Hex |
|-------|-------|-----|
| neutral | `#eef3ea` | Off-green white |
| ink | `#203022` | Dark green |
| primary | `#1cc24b` | Green |
| accent | `#c770ff` | Purple |
| success | `#1cc24b` | Green |
| warning | `#e6ff57` | Yellow-green |
| error | `#ff4b4b` | Red |
| info | `#30b3ff` | Blue |
| interactive | `#30b3ff` | Blue |
| diffAdd | `#5dac7e` | Green |
| diffDelete | `#d53a3a` | Red |

**Syntax:** comment=`#748476`, keyword=`#c770ff`, string=`#1cc24b`, primitive=`#30b3ff`, property=`#24f6d9`, type=`#e6ff57`, constant=`#ffa83d`

**v2Overrides:** text-base=`#353535`, text-muted=`#748476`, bg-accent=`v2-green-600`

### Dark Mode

| Token | Color | Hex |
|-------|-------|-----|
| neutral | `#0a0e0a` | Near black with green tint |
| ink | `#62ff94` | Bright green |
| primary | `#2eff6a` | Bright green |
| accent | `#c770ff` | Purple |
| success | `#62ff94` | Bright green |
| warning | `#e6ff57` | Yellow-green |
| error | `#ff4b4b` | Red |
| info | `#30b3ff` | Blue |
| interactive | `#30b3ff` | Blue |
| diffAdd | `#77ffaf` | Bright green |
| diffDelete | `#ff7171` | Red |

**Syntax:** comment=`#8ca391`, keyword=`#c770ff`, string=`#1cc24b`, primitive=`#30b3ff`, property=`#24f6d9`, type=`#e6ff57`, constant=`#ffa83d`

---

## 19. Mercury

A sleek, modern theme with cool blue-gray tones and refined elegance.

### Light Mode

| Token | Color | Hex |
|-------|-------|-----|
| neutral | `#ffffff` | White |
| ink | `#363644` | Dark slate |
| primary | `#5266eb` | Blue |
| accent | `#8da4f5` | Light blue |
| success | `#036e43` | Deep green |
| warning | `#a44200` | Burnt orange |
| error | `#b0175f` | Magenta |
| info | `#007f95` | Teal |
| interactive | `#465bd1` | Blue |

**Syntax:** comment=`#70707d`, keyword=`#465bd1`, string=`#036e43`, primitive=`#5266eb`, variable=`#007f95`, property=`#5266eb`, type=`#007f95`, constant=`#a44200`

### Dark Mode

| Token | Color | Hex |
|-------|-------|-----|
| neutral | `#171721` | Near black with blue tint |
| ink | `#dddde5` | Light gray-blue |
| primary | `#8da4f5` | Light blue |
| accent | `#8da4f5` | Light blue |
| success | `#77c599` | Green |
| warning | `#fc9b6f` | Peach |
| error | `#fc92b4` | Pink |
| info | `#77becf` | Cyan |

**Syntax:** comment=`#9d9da8`, keyword=`#8da4f5`, string=`#77c599`, primitive=`#8da4f5`, variable=`#77becf`, property=`#a7b6f8`, type=`#77becf`, constant=`#fc9b6f`

---

## 20. Monokai

The iconic Monokai theme — bold, vibrant, and highly saturated.

### Light Mode

| Token | Color | Hex |
|-------|-------|-----|
| neutral | `#fdf8ec` | Warm cream |
| ink | `#292318` | Dark brown |
| primary | `#bf7bff` | Purple |
| accent | `#d9487c` | Pink |
| success | `#4fb54b` | Green |
| warning | `#f1a948` | Orange |
| error | `#e54b4b` | Red |
| info | `#2d9ad7` | Blue |
| diffAdd | `#bfe7a3` | Light green |
| diffDelete | `#f6a3ae` | Light red |

**Syntax:** comment=`#8a816f`, keyword=`#d9487c`, string=`#8a6500`, primitive=`#3c8d2f`, property=`#1f88c8`, constant=`#9b5fe0`

### Dark Mode

| Token | Color | Hex |
|-------|-------|-----|
| neutral | `#272822` | Dark olive |
| ink | `#f8f8f2` | Off-white |
| primary | `#ae81ff` | Purple |
| accent | `#f92672` | Hot pink |
| success | `#a6e22e` | Green |
| warning | `#fd971f` | Orange |
| error | `#f92672` | Hot pink |
| info | `#66d9ef` | Cyan |
| diffAdd | `#4d7f2a` | Dark green |
| diffDelete | `#f4477c` | Pink |

**Syntax:** comment=`#75715e`, keyword=`#f92672`, string=`#e6db74`, primitive=`#a6e22e`, property=`#66d9ef`, constant=`#ae81ff`

---

## 21. Night Owl

A theme designed for late-night coding sessions with reduced blue light and soft contrasts.

### Light Mode

| Token | Color | Hex |
|-------|-------|-----|
| neutral | `#f0f0f0` | Light gray |
| ink | `#403f53` | Dark purple-gray |
| primary | `#4876d6` | Blue |
| accent | `#aa0982` | Magenta |
| success | `#2aa298` | Teal |
| warning | `#c96765` | Dusty rose |
| error | `#de3d3b` | Red |
| info | `#4876d6` | Blue |
| diffAdd | `#2aa298` | Teal |
| diffDelete | `#de3d3b` | Red |

**Syntax:** comment=`#7a8181`, keyword=`#994cc3`, primitive=`#4876d6`, constant=`#c96765`

### Dark Mode

| Token | Color | Hex |
|-------|-------|-----|
| neutral | `#011627` | Deep dark blue |
| ink | `#d6deeb` | Light blue-gray |
| primary | `#82aaff` | Light blue |
| accent | `#f78c6c` | Peach |
| success | `#c5e478` | Light green |
| warning | `#ecc48d` | Tan |
| error | `#ef5350` | Red |
| info | `#82aaff` | Light blue |
| diffAdd | `#c5e478` | Light green |
| diffDelete | `#ef5350` | Red |

**Syntax:** comment=`#637777`, keyword=`#c792ea`, string=`#ecc48d`, primitive=`#82aaff`, constant=`#f78c6c`

---

## 22. Nord

An arctic, bluish theme inspired by the Northern Lights — cool, calm, and highly readable.

### Light Mode

| Token | Color | Hex |
|-------|-------|-----|
| neutral | `#eceff4` | Ice white |
| ink | `#2e3440` | Dark navy |
| primary | `#5e81ac` | Steel blue |
| accent | `#bf616a` | Red |
| success | `#8fbcbb` | Cyan |
| warning | `#d08770` | Orange |
| error | `#bf616a` | Red |
| info | `#81a1c1` | Light blue |
| diffAdd | `#a3be8c` | Green |
| diffDelete | `#bf616a` | Red |

**Syntax:** comment=`#6b7282`, keyword=`#5e81ac`, string=`#6f8758`, primitive=`#5e81ac`, constant=`#8d6886`

### Dark Mode

| Token | Color | Hex |
|-------|-------|-----|
| neutral | `#2e3440` | Dark navy |
| ink | `#e5e9f0` | Light gray-blue |
| primary | `#88c0d0` | Cyan-blue |
| accent | `#d57780` | Dusty red |
| success | `#a3be8c` | Sage |
| warning | `#d08770` | Peach |
| error | `#bf616a` | Dusty red |
| info | `#81a1c1` | Steel blue |
| diffAdd | `#81a1c1` | Steel blue |
| diffDelete | `#bf616a` | Dusty red |

**Syntax:** comment=`#616e88`, keyword=`#81a1c1`, primitive=`#88c0d0`, constant=`#b48ead`

---

## 23. One Dark

The legendary One Dark theme — originally from Atom, now a universal favorite.

### Light Mode

| Token | Color | Hex |
|-------|-------|-----|
| neutral | `#fafafa` | Near white |
| ink | `#383a42` | Dark gray |
| primary | `#4078f2` | Blue |
| accent | `#0184bc` | Cyan |
| success | `#50a14f` | Green |
| warning | `#c18401` | Gold |
| error | `#e45649` | Red |
| info | `#986801` | Brown |
| diffAdd | `#489447` | Green |
| diffDelete | `#d65145` | Red |

**Syntax:** comment=`#a0a1a7`, keyword=`#a626a4`, string=`#50a14f`, primitive=`#4078f2`, variable=`#e45649`, property=`#0184bc`, type=`#c18401`, constant=`#986801`, operator=`#0184bc`, punctuation=`#383a42`

### Dark Mode

| Token | Color | Hex |
|-------|-------|-----|
| neutral | `#282c34` | Dark gray-blue |
| ink | `#abb2bf` | Light gray |
| primary | `#61afef` | Blue |
| accent | `#56b6c2` | Cyan |
| success | `#98c379` | Green |
| warning | `#e5c07b` | Yellow |
| error | `#e06c75` | Red |
| info | `#d19a66` | Orange |
| diffAdd | `#aad482` | Light green |
| diffDelete | `#e8828b` | Light red |

**Syntax:** comment=`#5c6370`, keyword=`#c678dd`, string=`#98c379`, primitive=`#61afef`, variable=`#e06c75`, property=`#56b6c2`, type=`#e5c07b`, constant=`#d19a66`, operator=`#56b6c2`, punctuation=`#abb2bf`

**Markdown:** heading=`#c678dd`, text=`#abb2bf`, link=`#61afef`, link-text=`#56b6c2`, code=`#98c379`, block-quote=`#5c6370`, emph=`#e5c07b`, strong=`#d19a66`, hr=`#5c6370`, list-item=`#61afef`, enumeration=`#56b6c2`, image=`#61afef`, image-text=`#56b6c2`, code-block=`#abb2bf`

---

## 24. One Dark Pro

A refined, modernized version of One Dark with slightly adjusted contrasts.

### Light Mode

| Token | Color | Hex |
|-------|-------|-----|
| neutral | `#f5f6f8` | Light gray |
| ink | `#2b303b` | Dark slate |
| primary | `#528bff` | Blue |
| accent | `#d85462` | Red |
| success | `#4fa66d` | Green |
| warning | `#d19a66` | Orange |
| error | `#e06c75` | Red |
| info | `#61afef` | Blue |
| diffAdd | `#c2ebcf` | Light green |
| diffDelete | `#f7c1c5` | Light red |

**Syntax:** comment=`#6a717d`, keyword=`#a626a4`, primitive=`#4078f2`, constant=`#986801`

### Dark Mode

| Token | Color | Hex |
|-------|-------|-----|
| neutral | `#1e222a` | Dark slate |
| ink | `#abb2bf` | Light gray |
| primary | `#61afef` | Blue |
| accent | `#e06c75` | Red |
| success | `#98c379` | Green |
| warning | `#e5c07b` | Yellow |
| error | `#e06c75` | Red |
| info | `#56b6c2` | Cyan |
| diffAdd | `#4b815a` | Dark green |
| diffDelete | `#b2555f` | Dark red |

**Syntax:** comment=`#5c6370`, keyword=`#c678dd`, primitive=`#61afef`, constant=`#d19a66`

---

## 25. OpenCode (Default)

The default OpenCode theme — clean, minimal, and universally readable.

### Light Mode

| Token | Color | Hex |
|-------|-------|-----|
| neutral | `#ffffff` | White |
| ink | `#1a1a1a` | Near black |
| primary | `#3b7dd8` | Blue |
| accent | `#d68c27` | Gold |
| success | `#3d9a57` | Green |
| warning | `#d68c27` | Gold |
| error | `#d1383d` | Red |
| info | `#318795` | Teal |
| diffAdd | `#4db380` | Green |
| diffDelete | `#f52a65` | Red-pink |

**Syntax:** comment=`#8a8a8a`, keyword=`#d68c27`, string=`#3d9a57`, primitive=`#3b7dd8`, variable=`#d1383d`, property=`#318795`, type=`#b0851f`, constant=`#d68c27`, operator=`#318795`, punctuation=`#1a1a1a`

**Markdown:** heading=`#d68c27`, text=`#1a1a1a`, link=`#3b7dd8`, link-text=`#318795`, code=`#3d9a57`, block-quote=`#b0851f`, emph=`#b0851f`, strong=`#d68c27`, hr=`#8a8a8a`, list-item=`#3b7dd8`, enumeration=`#318795`, code-block=`#1a1a1a`

### Dark Mode

| Token | Color | Hex |
|-------|-------|-----|
| neutral | `#0a0a0a` | Near black |
| ink | `#eeeeee` | Off-white |
| primary | `#fab283` | Warm peach |
| accent | `#9d7cd8` | Lavender |
| success | `#7fd88f` | Green |
| warning | `#f5a742` | Amber |
| error | `#e06c75` | Rose |
| info | `#56b6c2` | Cyan |
| diffAdd | `#b8db87` | Light green |
| diffDelete | `#e26a75` | Rose |

**Syntax:** comment=`#808080`, keyword=`#9d7cd8`, string=`#7fd88f`, primitive=`#fab283`, variable=`#e06c75`, property=`#56b6c2`, type=`#e5c07b`, constant=`#f5a742`, operator=`#56b6c2`, punctuation=`#eeeeee`

**Markdown:** heading=`#9d7cd8`, text=`#eeeeee`, link=`#fab283`, link-text=`#56b6c2`, code=`#7fd88f`, block-quote=`#e5c07b`, emph=`#e5c07b`, strong=`#f5a742`, hr=`#808080`, list-item=`#fab283`, enumeration=`#56b6c2`, code-block=`#eeeeee`

---

## 26. Orng

A bold, orange-centric theme with high contrast and vibrant energy.

### Light Mode

| Token | Color | Hex |
|-------|-------|-----|
| neutral | `#ffffff` | White |
| ink | `#1a1a1a` | Near black |
| primary | `#EC5B2B` | Vibrant orange |
| accent | `#c94d24` | Deep orange |
| success | `#0062d1` | Blue |
| warning | `#EC5B2B` | Vibrant orange |
| error | `#d1383d` | Red |
| info | `#318795` | Teal |
| diffDelete | `#f52a65` | Red-pink |

**Syntax:** comment=`#8a8a8a`, keyword=`#EC5B2B`, string=`#0062d1`, primitive=`#c94d24`, variable=`#d1383d`, property=`#318795`, type=`#b0851f`, constant=`#EC5B2B`

### Dark Mode

| Token | Color | Hex |
|-------|-------|-----|
| neutral | `#0a0a0a` | Near black |
| ink | `#eeeeee` | Off-white |
| primary | `#EC5B2B` | Vibrant orange |
| accent | `#FFF7F1` | Warm white |
| success | `#6ba1e6` | Blue |
| warning | `#EC5B2B` | Vibrant orange |
| error | `#e06c75` | Rose |
| info | `#56b6c2` | Cyan |
| diffDelete | `#e26a75` | Rose |

**Syntax:** comment=`#808080`, keyword=`#EC5B2B`, string=`#6ba1e6`, primitive=`#EE7948`, variable=`#e06c75`, property=`#56b6c2`, type=`#e5c07b`, constant=`#FFF7F1`

---

## 27. Osaka Jade

A jade-green themed design inspired by Japanese aesthetics — calming and organic.

### Light Mode

| Token | Color | Hex |
|-------|-------|-----|
| neutral | `#F6F5DD` | Pale cream |
| ink | `#111c18` | Near black with green tint |
| primary | `#1faa90` | Jade green |
| accent | `#3d7a52` | Forest green |
| success | `#3d7a52` | Forest green |
| warning | `#b5a020` | Mustard |
| error | `#c7392d` | Red |
| info | `#1faa90` | Jade green |

**Syntax:** comment=`#53685B`, keyword=`#1faa90`, string=`#3d7a52`, primitive=`#3d7560`, variable=`#111c18`, property=`#3d7a52`, type=`#3d7a52`, constant=`#a8527a`, operator=`#b5a020`

### Dark Mode

| Token | Color | Hex |
|-------|-------|-----|
| neutral | `#111c18` | Near black with green tint |
| ink | `#C1C497` | Pale olive |
| primary | `#2DD5B7` | Bright jade |
| accent | `#549e6a` | Green |
| success | `#549e6a` | Green |
| warning | `#E5C736` | Yellow |
| error | `#FF5345` | Red |
| info | `#2DD5B7` | Bright jade |
| interactive | `#8CD3CB` | Light teal |
| diffAdd | `#63b07a` | Green |
| diffDelete | `#db9f9c` | Dusty pink |

**Syntax:** comment=`#53685B`, keyword=`#2DD5B7`, string=`#63b07a`, primitive=`#509475`, variable=`#C1C497`, property=`#549e6a`, type=`#549e6a`, constant=`#D2689C`, operator=`#459451`

---

## 28. Palenight

A purple-tinted dark theme with soft, elegant contrasts — reminiscent of Material Palenight.

### Light Mode

| Token | Color | Hex |
|-------|-------|-----|
| neutral | `#fafafa` | Near white |
| ink | `#292d3e` | Dark navy-purple |
| primary | `#4976eb` | Blue |
| accent | `#00acc1` | Cyan |
| success | `#91b859` | Green |
| warning | `#ffb300` | Amber |
| error | `#e53935` | Red |
| info | `#f4511e` | Deep orange |

**Syntax:** comment=`#8796b0`, keyword=`#a854f2`, string=`#91b859`, primitive=`#4976eb`, property=`#00acc1`, type=`#ffb300`, constant=`#f4511e`

### Dark Mode

| Token | Color | Hex |
|-------|-------|-----|
| neutral | `#292d3e` | Dark navy-purple |
| ink | `#a6accd` | Light periwinkle |
| primary | `#82aaff` | Light blue |
| accent | `#89ddff` | Cyan |
| success | `#c3e88d` | Light green |
| warning | `#ffcb6b` | Amber |
| error | `#f07178` | Light red |
| info | `#f78c6c` | Peach |

**Syntax:** comment=`#676e95`, keyword=`#c792ea`, string=`#c3e88d`, primitive=`#82aaff`, property=`#89ddff`, type=`#ffcb6b`, constant=`#f78c6c`

---

## 29. Rose Pine

A soft, rose-toned theme with gentle contrasts inspired by pine forests at dawn.

### Light Mode

| Token | Color | Hex |
|-------|-------|-----|
| neutral | `#faf4ed` | Warm cream |
| ink | `#575279` | Dark mauve |
| primary | `#31748f` | Teal |
| accent | `#d7827e` | Rose |
| success | `#286983` | Teal |
| warning | `#ea9d34` | Gold |
| error | `#b4637a` | Mauve |
| info | `#56949f` | Blue-gray |

**Syntax:** comment=`#9893a5`, keyword=`#286983`, string=`#ea9d34`, primitive=`#d7827e`, property=`#d7827e`, type=`#56949f`, constant=`#907aa9`, operator=`#797593`

### Dark Mode

| Token | Color | Hex |
|-------|-------|-----|
| neutral | `#191724` | Very dark purple |
| ink | `#e0def4` | Light lavender |
| primary | `#9ccfd8` | Soft cyan |
| accent | `#ebbcba` | Rose |
| success | `#31748f` | Teal |
| warning | `#f6c177` | Peach |
| error | `#eb6f92` | Pink |
| info | `#9ccfd8` | Soft cyan |

**Syntax:** comment=`#6e6a86`, keyword=`#31748f`, string=`#f6c177`, primitive=`#ebbcba`, property=`#ebbcba`, type=`#9ccfd8`, constant=`#c4a7e7`, operator=`#908caa`

---

## 30. Shades of Purple

An intense, purple-dominant theme with vibrant neon-like accents.

### Light Mode

| Token | Color | Hex |
|-------|-------|-----|
| neutral | `#f7ebff` | Light lavender |
| ink | `#3b2c59` | Deep purple |
| primary | `#7a5af8` | Purple |
| accent | `#ff6bd5` | Pink |
| success | `#3dd598` | Green |
| warning | `#f7c948` | Yellow |
| error | `#ff6bd5` | Pink |
| info | `#62d4ff` | Cyan |
| diffAdd | `#c8f8da` | Light green |
| diffDelete | `#ffc3ef` | Light pink |

**Syntax:** comment=`#8e4be3`, keyword=`#c45f00`, string=`#2f8b32`, primitive=`#a13bd6`, property=`#008fb8`, type=`#9d7a00`, constant=`#e04d7a`

### Dark Mode

| Token | Color | Hex |
|-------|-------|-----|
| neutral | `#1a102b` | Very dark purple |
| ink | `#f5f0ff` | Off-white |
| primary | `#c792ff` | Light purple |
| accent | `#ff7ac6` | Pink |
| success | `#7be0b0` | Mint |
| warning | `#ffd580` | Gold |
| error | `#ff7ac6` | Pink |
| info | `#7dd4ff` | Cyan |
| diffAdd | `#53c39f` | Green |
| diffDelete | `#d85aa0` | Pink |

**Syntax:** comment=`#b362ff`, keyword=`#ff9d00`, string=`#a5ff90`, primitive=`#fb94ff`, property=`#9effff`, type=`#fad000`, constant=`#ff628c`

---

## 31. Solarized

The precision color scheme designed for accuracy and readability — based on CIELAB color space.

### Light Mode

| Token | Color | Hex |
|-------|-------|-----|
| neutral | `#fdf6e3` | Solarized base3 |
| ink | `#586e75` | Solarized base01 |
| primary | `#268bd2` | Blue |
| accent | `#d33682` | Magenta |
| success | `#859900` | Green |
| warning | `#b58900` | Yellow |
| error | `#dc322f` | Red |
| info | `#2aa198` | Cyan |
| diffAdd | `#c6dc7a` | Light green |
| diffDelete | `#f2a1a1` | Light red |

**Syntax:** comment=`#657b83`, keyword=`#728600`, string=`#1f8f88`, primitive=`#268bd2`, property=`#268bd2`, constant=`#d33682`

### Dark Mode

| Token | Color | Hex |
|-------|-------|-----|
| neutral | `#002b36` | Solarized base03 |
| ink | `#93a1a1` | Solarized base1 |
| primary | `#6c71c4` | Violet |
| accent | `#d33682` | Magenta |
| success | `#859900` | Green |
| warning | `#b58900` | Yellow |
| error | `#dc322f` | Red |
| info | `#2aa198` | Cyan |
| diffAdd | `#4c7654` | Dark green |
| diffDelete | `#c34b4b` | Dark red |

**Syntax:** comment=`#586e75`, keyword=`#859900`, string=`#2aa198`, primitive=`#268bd2`, property=`#268bd2`, constant=`#d33682`

---

## 32. Synthwave '84

A neon-drenched retro theme inspired by 80s synthwave aesthetics.

### Light Mode

| Token | Color | Hex |
|-------|-------|-----|
| neutral | `#fafafa` | Near white |
| ink | `#262335` | Dark purple |
| primary | `#00bcd4` | Cyan |
| accent | `#9c27b0` | Purple |
| success | `#4caf50` | Green |
| warning | `#ff9800` | Orange |
| error | `#f44336` | Red |
| info | `#ff5722` | Deep orange |

**Syntax:** comment=`#5c5c8a`, keyword=`#e91e63`, string=`#ff9800`, primitive=`#ff5722`, property=`#9c27b0`, type=`#00bcd4`, constant=`#9c27b0`, operator=`#e91e63`

### Dark Mode

| Token | Color | Hex |
|-------|-------|-----|
| neutral | `#262335` | Dark purple |
| ink | `#ffffff` | White |
| primary | `#36f9f6` | Neon cyan |
| accent | `#b084eb` | Neon purple |
| success | `#72f1b8` | Neon mint |
| warning | `#fede5d` | Neon yellow |
| error | `#fe4450` | Neon red |
| info | `#ff8b39` | Neon orange |
| diffAdd | `#97f1d8` | Neon mint |
| diffDelete | `#ff5e5b` | Neon red |

**Syntax:** comment=`#848bbd`, keyword=`#ff7edb`, string=`#fede5d`, primitive=`#ff8b39`, property=`#b084eb`, type=`#36f9f6`, constant=`#b084eb`, operator=`#ff7edb`

**Markdown:** heading=`#ff7edb`, text=`#ffffff`, link=`#36f9f6`, link-text=`#b084eb`, code=`#72f1b8`, block-quote=`#848bbd`, emph=`#fede5d`, strong=`#ff8b39`, hr=`#495495`, list-item=`#36f9f6`, enumeration=`#b084eb`, code-block=`#ffffff`

---

## 33. Tokyonight

A theme inspired by the neon-lit streets of Tokyo at night — deep blues and vibrant warm accents.

### Light Mode

| Token | Color | Hex |
|-------|-------|-----|
| neutral | `#e1e2e7` | Light gray-blue |
| ink | `#273153` | Dark navy |
| primary | `#2e7de9` | Blue |
| accent | `#b15c00` | Amber |
| success | `#587539` | Olive |
| warning | `#8c6c3e` | Brown |
| error | `#c94060` | Red-pink |
| info | `#007197` | Teal |
| diffAdd | `#4f8f7b` | Green |
| diffDelete | `#d05f7c` | Pink |

**Syntax:** comment=`#6b6f7a`, keyword=`#9854f1`, primitive=`#1f6fd4`, property=`#007197`, constant=`#b15c00`

### Dark Mode

| Token | Color | Hex |
|-------|-------|-----|
| neutral | `#1a1b26` | Very dark blue |
| ink | `#c0caf5` | Light blue |
| primary | `#7aa2f7` | Soft blue |
| accent | `#ff9e64` | Orange |
| success | `#9ece6a` | Green |
| warning | `#e0af68` | Gold |
| error | `#f7768e` | Pink |
| info | `#7dcfff` | Cyan |
| diffAdd | `#41a6b5` | Teal |
| diffDelete | `#c34043` | Red |

**Syntax:** comment=`#565f89`, keyword=`#bb9af7`, primitive=`#7aa2f7`, property=`#7dcfff`, constant=`#ff9e64`

---

## 34. Vercel

A clean, minimal theme inspired by Vercel's brand design system.

### Light Mode

| Token | Color | Hex |
|-------|-------|-----|
| neutral | `#FFFFFF` | White |
| ink | `#171717` | Near black |
| primary | `#0070F3` | Vercel blue |
| accent | `#8E4EC6` | Purple |
| success | `#388E3C` | Green |
| warning | `#FF9500` | Orange |
| error | `#DC3545` | Red |
| info | `#0070F3` | Vercel blue |
| diffAdd | `#46A758` | Green |
| diffDelete | `#E5484D` | Red |

**Syntax:** comment=`#888888`, keyword=`#E93D82`, string=`#46A758`, primitive=`#8E4EC6`, variable=`#0070F3`, property=`#12A594`, type=`#12A594`, constant=`#FFB224`

### Dark Mode

| Token | Color | Hex |
|-------|-------|-----|
| neutral | `#000000` | Black |
| ink | `#EDEDED` | Off-white |
| primary | `#0070F3` | Vercel blue |
| accent | `#8E4EC6` | Purple |
| success | `#46A758` | Green |
| warning | `#FFB224` | Amber |
| error | `#E5484D` | Red |
| info | `#52A8FF` | Blue |
| interactive | `#52A8FF` | Blue |
| diffAdd | `#63C46D` | Green |
| diffDelete | `#FF6166` | Red |

**Syntax:** comment=`#878787`, keyword=`#F75590`, string=`#63C46D`, primitive=`#BF7AF0`, variable=`#52A8FF`, property=`#0AC7AC`, type=`#0AC7AC`, constant=`#F2A700`

---

## 35. Vesper

A dramatic, high-contrast theme with warm tones and strong differentiation.

### Light Mode

| Token | Color | Hex |
|-------|-------|-----|
| neutral | `#F0F0F0` | Light gray |
| ink | `#101010` | Near black |
| primary | `#FFC799` | Peach |
| accent | `#B30000` | Deep red |
| success | `#99FFE4` | Mint |
| warning | `#FFC799` | Peach |
| error | `#FF8080` | Light red |
| info | `#FFC799` | Peach |
| diffAdd | `#99FFE4` | Mint |
| diffDelete | `#FF8080` | Light red |

**Syntax:** comment=`#7a7a7a`, keyword=`#6e6e6e`, string=`#117e69`, primitive=`#8d541c`, property=`#101010`, type=`#8d541c`, constant=`#8d541c`

### Dark Mode

| Token | Color | Hex |
|-------|-------|-----|
| neutral | `#101010` | Near black |
| ink | `#FFF` | White |
| primary | `#FFC799` | Peach |
| accent | `#FF8080` | Light red |
| success | `#99FFE4` | Mint |
| warning | `#FFC799` | Peach |
| error | `#FF8080` | Light red |
| info | `#FFC799` | Peach |
| diffAdd | `#99FFE4` | Mint |
| diffDelete | `#FF8080` | Light red |

**Syntax:** comment=`#8b8b8b`, keyword=`#a0a0a0`, string=`#99ffe4`, primitive=`#ffc799`, property=`#ffffff`, type=`#ffc799`, constant=`#ffc799`

---

## 36. Zenburn

A low-contrast, earthy theme designed for long coding sessions — easy on the eyes.

### Light Mode

| Token | Color | Hex |
|-------|-------|-----|
| neutral | `#ffffef` | Off-white |
| ink | `#3f3f3f` | Dark gray |
| primary | `#5f7f8f` | Steel blue |
| accent | `#5f8f8f` | Teal |
| success | `#5f8f5f` | Sage |
| warning | `#8f8f5f` | Olive |
| error | `#8f5f5f` | Dusty red |
| info | `#8f7f5f` | Tan |

**Syntax:** comment=`#5f7f5f`, keyword=`#8f8f5f`, string=`#8f5f5f`, primitive=`#5f7f8f`, property=`#5f8f8f`, type=`#5f8f8f`, constant=`#5f8f5f`

### Dark Mode

| Token | Color | Hex |
|-------|-------|-----|
| neutral | `#3f3f3f` | Dark gray |
| ink | `#dcdccc` | Warm beige |
| primary | `#8cd0d3` | Teal |
| accent | `#93e0e3` | Light teal |
| success | `#7f9f7f` | Sage |
| warning | `#f0dfaf` | Yellow |
| error | `#cc9393` | Dusty pink |
| info | `#dfaf8f` | Tan |
| diffAdd | `#8fb28f` | Sage |
| diffDelete | `#dca3a3` | Dusty pink |

**Syntax:** comment=`#9f9f9f`, keyword=`#f0dfaf`, string=`#cc9393`, primitive=`#8cd0d3`, property=`#93e0e3`, type=`#93e0e3`, constant=`#8fb28f`

---

## 37. OC-2 (Secondary OpenCode)

A secondary OpenCode theme with an extensive v2 design token system for advanced UI customization.

### Light Mode

| Token | Color | Hex |
|-------|-------|-----|
| neutral | `#f7f7f7` | Light gray |
| ink | `#171311` | Near black |
| primary | `#dcde8d` | Pale yellow-green |
| success | `#12c905` | Green |
| warning | `#ffdc17` | Yellow |
| error | `#fc533a` | Red |
| info | `#a753ae` | Purple |
| interactive | `#034cff` | Blue |
| diffAdd | `#9ff29a` | Light green |
| diffDelete | `#fc533a` | Red |

**Syntax:** comment=`var(--v2-text-text-muted)`, keyword=`var(--v2-pink-800)`, string=`var(--v2-green-800)`, primitive=`var(--v2-pink-800)`, property=`var(--v2-orange-800)`, type=`var(--v2-purple-800)`, constant=`#007b80`

### Dark Mode

| Token | Color | Hex |
|-------|-------|-----|
| neutral | `#1C1C1C` | Dark gray |
| ink | `#EDEDED` | Off-white |
| primary | `#fab283` | Peach |
| success | `#12c905` | Green |
| warning | `#fcd53a` | Yellow |
| error | `#fc533a` | Red |
| info | `#edb2f1` | Light purple |
| interactive | `#034cff` | Blue |
| diffAdd | `#c8ffc4` | Light green |
| diffDelete | `#fc533a` | Red |

**Syntax:** comment=`var(--v2-text-text-muted)`, keyword=`var(--v2-pink-400)`, string=`var(--v2-green-400)`, primitive=`var(--v2-pink-400)`, property=`var(--v2-orange-400)`, type=`var(--v2-purple-400)`, constant=`#93e9f6`

#### v2 Design Token Overrides (Shared)

OC-2 defines an extensive set of v2 design tokens for detailed UI customization across both modes:

**Grey Scale (Light/Dark shared names, different values):**
v2-grey-50=`#ffffff`, v2-grey-100=`#fafafa`, v2-grey-200=`#f2f2f2`, v2-grey-300=`#eeeeee`, v2-grey-400=`#dbdbdb`, v2-grey-500=`#aeaeae`, v2-grey-600=`#808080`, v2-grey-700=`#5c5c5c`, v2-grey-800=`#3a3a3a`, v2-grey-900=`#2e2e2e`, v2-grey-1000=`#242424`, v2-grey-1100=`#161616`, v2-grey-1200=`#080808`

**Semantic Colors with 12-step scales:**
- **Red:** 100=`#fceceb` → 600=`#f1484f` → 1200=`#461516`
- **Orange:** 100=`#fdf2ed` → 600=`#ff8648` → 1200=`#5a2c14`
- **Yellow:** 100=`#fefaec` → 600=`#f6c251` → 1200=`#4b4025`
- **Green:** 100=`#e7f9ea` → 600=`#49c970` → 1200=`#14361d`
- **Cyan:** 100=`#e2f7fb` → 600=`#00abcfff` → 1200=`#00353f`
- **Blue:** 100=`#ecf1fe` → 600=`#3b5cf6` → 1200=`#1b2852`
- **Purple:** 100=`#ebecfe` → 600=`#7152f4` → 1200=`#221358`
- **Pink:** 100=`#fdecf3` → 600=`#f64aab` → 1200=`#5c1d3f`

**Background:**
- Light: bg-base=`v2-grey-50`, bg-deep=`v2-grey-100`, bg-inverse=`v2-grey-1100`, bg-accent=`v2-blue-600`
- Dark: bg-base=`v2-grey-1100`, bg-deep=`v2-grey-1200`, bg-inverse=`v2-grey-50`, bg-accent=`v2-blue-600`

**Text:**
- Light: text-base=`v2-grey-1100`, text-muted=`v2-grey-700`, text-faint=`v2-grey-600`, text-accent=`v2-blue-600`
- Dark: text-base=`v2-grey-100`, text-muted=`v2-grey-500`, text-faint=`v2-grey-600`, text-accent=`v2-blue-400`

**Border:**
- Light: border-muted=`alpha-dark-8`, border-base=`alpha-dark-10`, border-strong=`alpha-dark-20`, border-focus=`v2-blue-500`
- Dark: border-muted=`alpha-light-8`, border-base=`alpha-light-10`, border-strong=`alpha-light-20`, border-focus=`v2-blue-500`

**State Colors:**
- Success: bg=`v2-green-100` (light) / `v2-green-1200` (dark), fg=`v2-green-800` (light) / `v2-green-500` (dark)
- Warning: bg=`v2-yellow-100` (light) / `v2-yellow-1200` (dark), fg=`v2-yellow-800` (light) / `v2-yellow-500` (dark)
- Danger: bg=`v2-red-100` (light) / `v2-red-1200` (dark), fg=`v2-red-800` (light) / `v2-red-500` (dark)
- Info: bg=`v2-blue-100` (light) / `v2-blue-1200` (dark), fg=`v2-blue-800` (light) / `v2-blue-500` (dark)

---

## Appendix: Quick Comparison Table

| # | Theme | Light BG | Dark BG | Primary (Light) | Primary (Dark) |
|---|-------|----------|---------|-----------------|----------------|
| 1 | AMOLED | `#f0f0f0` | `#000000` | `#6200ff` | `#b388ff` |
| 2 | Aura | `#f5f0ff` | `#15141b` | `#a277ff` | `#a277ff` |
| 3 | Ayu | `#fdfaf4` | `#0f1419` | `#4aa8c8` | `#3fb7e3` |
| 4 | Carbonfox | `#8e8e8e` | `#393939` | `#0072c3` | `#33b1ff` |
| 5 | Catppuccin | `#f5e0dc` | `#1e1e2e` | `#7287fd` | `#b4befe` |
| 6 | Catppuccin Frappe | `#303446` | `#303446` | `#8da4e2` | `#8da4e2` |
| 7 | Catppuccin Macchiato | `#24273a` | `#24273a` | `#8aadf4` | `#8aadf4` |
| 8 | Cobalt2 | `#ffffff` | `#193549` | `#0066cc` | `#0088ff` |
| 9 | Cursor | `#fcfcfc` | `#181818` | `#6f9ba6` | `#88c0d0` |
| 10 | Dracula | `#f8f8f2` | `#1d1e28` | `#7c6bf5` | `#bd93f9` |
| 11 | Everforest | `#fdf6e3` | `#2d353b` | `#8da101` | `#a7c080` |
| 12 | Flexoki | `#FFFCF0` | `#100F0F` | `#205EA6` | `#DA702C` |
| 13 | GitHub | `#ffffff` | `#0d1117` | `#0969da` | `#58a6ff` |
| 14 | Gruvbox | `#fbf1c7` | `#282828` | `#076678` | `#83a598` |
| 15 | Kanagawa | `#F2E9DE` | `#1F1F28` | `#2D4F67` | `#7E9CD8` |
| 16 | Lucent Orng | `#fff5f0` | `#2a1a15` | `#EC5B2B` | `#EC5B2B` |
| 17 | Material | `#fafafa` | `#263238` | `#6182b8` | `#82aaff` |
| 18 | Matrix | `#eef3ea` | `#0a0e0a` | `#1cc24b` | `#2eff6a` |
| 19 | Mercury | `#ffffff` | `#171721` | `#5266eb` | `#8da4f5` |
| 20 | Monokai | `#fdf8ec` | `#272822` | `#bf7bff` | `#ae81ff` |
| 21 | Night Owl | `#f0f0f0` | `#011627` | `#4876d6` | `#82aaff` |
| 22 | Nord | `#eceff4` | `#2e3440` | `#5e81ac` | `#88c0d0` |
| 23 | One Dark | `#fafafa` | `#282c34` | `#4078f2` | `#61afef` |
| 24 | One Dark Pro | `#f5f6f8` | `#1e222a` | `#528bff` | `#61afef` |
| 25 | OpenCode | `#ffffff` | `#0a0a0a` | `#3b7dd8` | `#fab283` |
| 26 | Orng | `#ffffff` | `#0a0a0a` | `#EC5B2B` | `#EC5B2B` |
| 27 | Osaka Jade | `#F6F5DD` | `#111c18` | `#1faa90` | `#2DD5B7` |
| 28 | Palenight | `#fafafa` | `#292d3e` | `#4976eb` | `#82aaff` |
| 29 | Rose Pine | `#faf4ed` | `#191724` | `#31748f` | `#9ccfd8` |
| 30 | Shades of Purple | `#f7ebff` | `#1a102b` | `#7a5af8` | `#c792ff` |
| 31 | Solarized | `#fdf6e3` | `#002b36` | `#268bd2` | `#6c71c4` |
| 32 | Synthwave '84 | `#fafafa` | `#262335` | `#00bcd4` | `#36f9f6` |
| 33 | Tokyonight | `#e1e2e7` | `#1a1b26` | `#2e7de9` | `#7aa2f7` |
| 34 | Vercel | `#FFFFFF` | `#000000` | `#0070F3` | `#0070F3` |
| 35 | Vesper | `#F0F0F0` | `#101010` | `#FFC799` | `#FFC799` |
| 36 | Zenburn | `#ffffef` | `#3f3f3f` | `#5f7f8f` | `#8cd0d3` |
| 37 | OC-2 | `#f7f7f7` | `#1C1C1C` | `#dcde8d` | `#fab283` |

---

> **Note:** Themes like Catppuccin Frappe and Catppuccin Macchiato use the same palette for both Light and Dark modes — they are designed primarily as dark themes with a single consistent color set.
