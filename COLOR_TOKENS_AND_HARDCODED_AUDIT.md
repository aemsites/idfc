# Color tokens and hardcoded colors audit

Scope: **styles/styles.css** and **CSS under /blocks only** (excluding /templates, /tools, etc.).

---

## Part 1: All CSS tokens and their color values (hex or rgb)

Defined in `styles/styles.css` `:root` only. Gradients list the hex/rgb values used inside them.

### Color tokens (single value)

| Token                | Color value |
| -------------------- | ----------- |
| `--color-red-300`    | `#d13d3f`   |
| `--color-red-400`    | `#9c1d26`   |
| `--color-red-500`    | `#902a2b`   |
| `--color-red-600`    | `#801c1e`   |
| `--color-red-800`    | `#6e0a0f`   |
| `--color-blue-200`   | `#007bff`   |
| `--color-blue-800`   | `#2d3679`   |
| `--color-blue-900`   | `#182659`   |
| `--color-purple-400` | `#563b80`   |
| `--color-white`      | `#fff`      |
| `--color-white-100`  | `#f5f5f5`   |
| `--color-white-200`  | `#eee`      |
| `--color-gray-100`   | `#DDDBDA`   |
| `--color-gray-200`   | `#dbdbde`   |
| `--color-gray-300`   | `#6c757d`   |
| `--color-gray-400`   | `#505050`   |
| `--color-gray-500`   | `#4b4b4b`   |
| `--color-gray-700`   | `#25243B`   |
| `--color-gray-900`   | `#222`      |
| `--color-pewter`     | `#7A766D`   |
| `--color-black`      | `#000`      |

### Semantic color tokens (alias to color tokens)

| Token                                 | Resolves to                         |
| ------------------------------------- | ----------------------------------- |
| `--background-color`                  | `var(--color-white)`                |
| `--text-color`                        | `var(--color-gray-700)` → `#25243B` |
| `--text-red-color`                    | `var(--color-red-400)` → `#9c1d26`  |
| `--footer-red-color`                  | `var(--color-red-400)` → `#9c1d26`  |
| `--btn-color-red`                     | `var(--color-red-500)` → `#902a2b`  |
| `--gradient-heritage-cc-mayura-intro` | `var(--gradient-indigo)`            |
| `--text-color-hero-heritage-cc`       | `var(--color-blue-800)` → `#2d3679` |

### Gradient tokens (hex/rgb used inside the token value)

| Token                       | Color values in definition                                                   |
| --------------------------- | ---------------------------------------------------------------------------- |
| `--gradient-translucent`    | `rgba(255, 255, 255, 0.32)`, `rgba(255, 255, 255, 0.24)`                     |
| `--gradient-pearl`          | `#C7C6C6`, `#F1F1F1`                                                         |
| `--gradient-red-purple`     | `#D94751`, `#8C2034`, `#732C53`, `#513873`                                   |
| `--gradient-red-black`      | `#AC2A34`, `#661E2A`, `#140F23`                                              |
| `--gradient-pink-red`       | `#C5767D`, `#9E1E29`                                                         |
| `--gradient-earn-rewards`   | `#FFF6`, `#FFF0`                                                             |
| `--gradient-red`            | `#5D2227`, `#982B35`                                                         |
| `--gradient-light-red`      | `rgba(55, 10, 14, 0.8)`, `rgba(157, 29, 39, 0.8)`                            |
| `--gradient-blue`           | `#08133C`, `#2E3E79`                                                         |
| `--gradient-indigo`         | `#110140`, `#1E2A8E`, `#010740`                                              |
| `--gradient-black-90`       | `rgb(0 0 0 / 0%)`, `#000`                                                    |
| `--gradient-pewter`         | `#332B28`, `#514A44`, `#8B837D`, `#625A50`, `var(--color-pewter)`, `#433C32` |
| `--gradient-silver`         | `#C8C6C6`, `#F1F0F0`                                                         |
| `--gradient-metal-blue`     | `#110140`, `#1E2A8E`, `#010740`                                              |
| `--gradient-metal-silver`   | `#999`, `#EFEFEF`, `#CACACA`                                                 |
| `--modal-backdrop-gradient` | `rgb(200 198 198 / 70%)`, `rgb(200 198 198 / 95%)`, `#C8C6C6`, `#F1F0F0`     |

---

## Part 1b: Where each token from styles.css is used in /blocks

Each token defined in `styles/styles.css` and where it is referenced in block CSS files.

### Color tokens

| Token                | Used in blocks (file: line)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--color-red-300`    | hero/hero.css:64; cta-sticky/cta-sticky.css:58, 59, 71, 72                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `--color-red-400`    | modal/modal.css:518, 583, 594; category-nav/category-nav.css:475, 484, 485, 789; link-to-upi/link-to-upi.css:98                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `--color-red-500`    | _(not used in blocks; alias --btn-color-red is used)_                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `--color-red-600`    | modal/modal.css:316, 327; category-nav/category-nav.css:319; header/header.css:1480, 1983, 2236, 2237, 2249, 2289, 2352                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `--color-red-800`    | header/header.css:1181                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `--color-blue-200`   | _(not used in blocks)_                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `--color-blue-800`   | _(not used directly; --text-color-hero-heritage-cc uses it)_                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `--color-blue-900`   | modal/modal.css:341                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `--color-purple-400` | cards-testimonial/cards-testimonial.css:34, 238; cards/cards.css:1656                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `--color-white`      | tabs/tabs.css:74, 112; hero-heritage-cc/hero-heritage-cc.css:113, 455, 630, 639, 646, 661, 671; cards-testimonial/cards-testimonial.css:30, 40, 60, 165, 232, 265, 280; accordion/accordion.css:148, 157, 189; form/form.css:27, 69, 77, 129, 161, 226; cards/cards.css:53, 172, 186, 283, 328, 430, 441, 486, 670, 698, 929, 949, 1012, 1022, 1028, 1033, 1112, 1299, 1369, 1386, 1514, 1667; modal/modal.css:221, 321, 332, 385, 397, 404, 515, 591; category-nav/category-nav.css:30, 195, 242, 465, 491, 630, 639, 646, 661, 671; header/header.css:284, 424, 468, 780, 822, 1322, 1369, 1946, 1973, 2250, 2448, 2482, 2567; tabs-upi-link/tabs-upi-link.css:141, 142, 162, 261, 262, 389, 398, 422, 424, 441, 452; table/table.css:76, 110, 120, 129, 130; link-to-upi/link-to-upi.css:56, 103; hero/hero.css:27, 36, 65, 74, 75; nav-pane/nav-pane.css:17, 45, 140, 149, 428, 493, 747, 841, 1006, 1061, 1095, 1131; footer/footer.css:8, 203, 219, 274, 509, 543; cta-sticky/cta-sticky.css:44, 60; cc-hero-slider/cc-hero-slider.css:87, 97, 112 |
| `--color-white-100`  | tabs/tabs.css:21; cards/cards.css:1332; category-nav/category-nav.css:779; header/header.css:981, 1237; tabs-cc-concept/tabs-cc-concept.css:20; nav-pane/nav-pane.css:846                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `--color-white-200`  | header/header.css:982, 1040, 1238, 1290, 1332, 1448, 1462, 1487, 1581, 1991, 1996, 2005, 2023, 2141, 2384, 2401, 2418, 2654                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `--color-gray-100`   | accordion/accordion.css:18, 59, 129, 163, 181, 201; modal/modal.css:359, 361; header/header.css:1729                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `--color-gray-200`   | header/header.css:1016, 1017, 1633                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `--color-gray-300`   | cards-testimonial/cards-testimonial.css:25, 213; cards/cards.css:1637; header/header.css:1292, 1371, 1645                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `--color-gray-400`   | _(not used in blocks)_                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `--color-gray-500`   | header/header.css:1731                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `--color-gray-700`   | _(not used directly; --text-color uses it)_                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `--color-gray-900`   | header/header.css:69; modal/modal.css:576                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `--color-pewter`     | hero-heritage-cc/hero-heritage-cc.css:487                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `--color-black`      | hero-heritage-cc/hero-heritage-cc.css:437; form/form.css:17; cards/cards.css:160, 379, 394, 1012, 1037; tabs-upi-link/tabs-upi-link.css:9; hero/hero.css:9; header/header.css:1730                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |

### Semantic color tokens

| Token                           | Used in blocks (file: line)                                                                                                                                                                                                                                                                                                             |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--background-color`            | tabs/tabs.css:41, 42; header/header.css:116, 1309, 2148, 2195, 2226; tabs-cc-concept/tabs-cc-concept.css:40, 41                                                                                                                                                                                                                         |
| `--text-color`                  | hotspot/hotspot.css:72, 122 (with fallback); hero-heritage-cc:120; accordion:17, 137, 143, 149, 173, 185, 195; cards:73, 83, 1378; modal:291, 303, 310; category-nav:—; header:117, 534, 837, 843, 855, 890, 892, 1087, 1384, 1443, 1696, 2102, 2202, 2339, 2398, 2696; nav-pane:206; tabs-upi-link:397, 453; cc-hero-slider:113        |
| `--text-red-color`              | hero-heritage-cc/hero-heritage-cc.css:108; category-nav:153, 273, 291, 329, 340, 341, 475, 484, 485, 527, 620, 697, 789; header:397, 422, 536, 551, 1461, 1486, 1847, 1886, 1896, 2460, 2465; nav-pane:11, 16, 39, 44, 99, 109, 120, 135, 175, 202, 210, 223, 328, 657, 668, 672, 760, 945, 966, 970, 1029, 1074, 1106; footer:510, 521 |
| `--btn-color-red`               | cards/cards.css:1111; header/header.css:1316, 1321, 1347; tabs-upi-link/tabs-upi-link.css:261                                                                                                                                                                                                                                           |
| `--text-color-hero-heritage-cc` | hero-heritage-cc/hero-heritage-cc.css:466, 478, 499                                                                                                                                                                                                                                                                                     |

### Gradient tokens

| Token                       | Used in blocks (file: line)                                                                                                                   |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `--gradient-silver`         | tabs/tabs.css:58, 111; cards/cards.css:839, 934, 973; modal/modal.css:287, 399; header/header.css:1566; cc-hero-slider/cc-hero-slider.css:129 |
| `--gradient-blue`           | tabs/tabs.css:73; cards/cards.css:589, 857; modal/modal.css:305                                                                               |
| `--gradient-pewter`         | accordion/accordion.css:128, 200                                                                                                              |
| `--gradient-earn-rewards`   | cards/cards.css:229                                                                                                                           |
| `--gradient-red`            | cards/cards.css:563, 985, 1006                                                                                                                |
| `--gradient-metal-silver`   | modal/modal.css:287                                                                                                                           |
| `--gradient-metal-blue`     | modal/modal.css:381                                                                                                                           |
| `--gradient-light-red`      | header/header.css:1174                                                                                                                        |
| `--gradient-black`          | cc-hero-slider/cc-hero-slider.css:54                                                                                                          |
| `--gradient-black-90`       | cc-hero-slider/cc-hero-slider.css:188                                                                                                         |
| `--modal-backdrop-gradient` | modal/modal.css:71                                                                                                                            |

### Tokens defined in styles.css but not used in blocks

- `--color-red-500` (only via `--btn-color-red`)
- `--color-blue-200`
- `--gradient-translucent`, `--gradient-pearl`, `--gradient-red-purple`, `--gradient-red-black`, `--gradient-pink-red`, `--gradient-heritage-cc-mayura-intro` (alias to `--gradient-indigo`), `--gradient-indigo` (only via heritage alias), `--footer-red-color`

---

## Part 2: Color values (hex or rgb) with NO token defined in styles.css

These are usages where a raw hex/rgb is used and that color is **not** provided by a CSS variable defined in `styles/styles.css` (either hardcoded in a rule or as a fallback in `var(--x, #value)`).

### styles/styles.css

| Line | Context                       | Color value(s)            |
| ---- | ----------------------------- | ------------------------- |
| 130  | `-webkit-tap-highlight-color` | `rgba(0, 0, 0, 0)`        |
| 271  | `color`                       | `#54565B`                 |
| 568  | `background`                  | `rgba(0 0 0 / 50%)`       |
| 580  | `background`                  | `rgba(255 255 255 / 50%)` |
| 925  | `background-color`            | `#fff`                    |
| 926  | `border-top`                  | `#E0E0E0`                 |
| 927  | `border-bottom`               | `#E0E0E0`                 |
| 928  | `box-shadow`                  | `rgba(37 36 59 / 10%)`    |
| 1119 | `background-color`            | `rgb(232 232 232 / 90%)`  |
| 1121 | `box-shadow`                  | `rgb(0 0 0 / 10%)`        |
| 1141 | `color`                       | `#767676`                 |

### blocks/anchor-nav/anchor-nav.css

| Line          | Context                           | Color value(s)     |
| ------------- | --------------------------------- | ------------------ |
| 33            | box-shadow                        | `rgb(0 0 0 / 10%)` |
| 145, 148, 165 | border / background-color / color | `#902a2c`          |

### blocks/banner/banner.css

| Line | Context    | Color value(s)      |
| ---- | ---------- | ------------------- |
| 33   | box-shadow | `rgba(0, 0, 0, .5)` |

### blocks/cards/cards.css

| Line                                       | Context          | Color value(s)                                                          |
| ------------------------------------------ | ---------------- | ----------------------------------------------------------------------- |
| 54                                         | box-shadow       | `rgb(37 36 59 / 15%)`                                                   |
| 93                                         | color            | `#1c1c1c`                                                               |
| 104                                        | box-shadow       | `rgb(137 137 137 / 100%)`                                               |
| 108                                        | outline          | `#B31B1B`                                                               |
| 145                                        | color            | `#B31B1B`                                                               |
| 330                                        | box-shadow       | `rgb(37 36 59 / 15%)`                                                   |
| 456                                        | color            | `#54565b`                                                               |
| 488, 496, 595, 787, 1321, 1557, 1659, 1794 | box-shadow       | `rgba(0 0 0 / 8%)`, `rgba(0 0 0 / 12%)`, `rgba(0 0 0 / 30%)`, etc.      |
| 549                                        | background-color | `#f0f0f0`                                                               |
| 675                                        | conic-gradient   | `#999`, `#EFEFEF`, `#CACACA`                                            |
| 689, 941                                   | color            | `rgba(255 255 255 / 80%)`                                               |
| 798                                        | linear-gradient  | `#3D3D3D`, `#5A5A5A`, `#4A4A4A`                                         |
| 799, 832                                   | border           | `rgba(255 255 255 / 100%)`, `rgba(255 255 255 / 60%)`                   |
| 834                                        | color            | `#2E3E79`                                                               |
| 1053                                       | linear-gradient  | `rgba(255 255 255 / 20%)`, `rgba(177 177 177 / 20%)`                    |
| 1123                                       | background       | `#7a151b`                                                               |
| 1144, 1639                                 | box-shadow       | `rgb(37 36 59 / 15%)`                                                   |
| 1292                                       | linear-gradient  | `#332B28`, `#514A44`, `#8B837D`, `#625A50`, `#7A766D`, `#433C32`        |
| 1316                                       | color            | `#B31B1B`                                                               |
| 1349, 1365, 1374                           | background       | `rgba(0 0 0 / 50%)`, `rgba(255 255 255 / 50%)`                          |
| 1436                                       | radial-gradient  | `rgba(255 255 255 / 40%)`, `rgba(255 255 255 / 0%)`                     |
| 1555–1556                                  | background       | `rgb(255 255 255 / 40%)`, `rgb(255 255 255 / 0%)`, `#2C2C2C`, `#1A1A1A` |
| 1622                                       | color            | `rgb(255 255 255 / 90%)`                                                |

### blocks/cards-testimonial/cards-testimonial.css

| Line    | Context    | Color value(s)            |
| ------- | ---------- | ------------------------- |
| 27, 215 | box-shadow | `rgb(37 36 59 / 15%)`     |
| 35, 241 | box-shadow | `rgb(37 36 59 / 25%)`     |
| 256     | background | `rgba(255 255 255 / 50%)` |

### blocks/category-nav/category-nav.css

| Line                                                                                                                            | Context                                 | Color value(s)                                                                                                                                                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 19–20, 31, 40, 88–89, 196, 392, 424, 436–443, 451, 466, 476, 561, 565, 569, 573, 577, 594, 603, 620, 696–697, 710, 716–717, 784 | backgrounds, borders, colors, gradients | `#f9f9f9`, `#ccc`, `#e0e0e0`, `#f5f5f5`, `#333`, `#c00`, `#fffbe6`, `#ebffff`, `#ffeffd`, `#ffcece`, `#ffe1ec`, `#f2e5ff`, `#eefff2`, `#fff7f7`, `#ffebeb`, `#faf2da`, `#e3f2fd`, `#bbdefb`, `#922`, `#d99`, `rgb(58 58 58)`, `rgb(0 0 0 / 12%)`, `rgb(157 29 39 / 25%)`, etc. |

### blocks/cc-hero-slider/cc-hero-slider.css

| Line    | Context     | Color value(s)      |
| ------- | ----------- | ------------------- |
| 92, 100 | text-shadow | `rgba(0 0 0 / 30%)` |
| 124     | background  | `#8a1515`           |

### blocks/cta-sticky/cta-sticky.css

| Line | Context     | Color value(s)     |
| ---- | ----------- | ------------------ |
| 45   | text-shadow | `rgb(0 0 0 / 25%)` |
| 62   | box-shadow  | `rgb(0 0 0 / 25%)` |

### blocks/footer/footer.css

| Line               | Context       | Color value(s)              |
| ------------------ | ------------- | --------------------------- |
| 28, 38             | color         | `rgb(188, 59, 69)`          |
| 65                 | background    | `#FFCB05`                   |
| 68, 75             | color         | `#525252`                   |
| 137, 148, 310, 425 | border-bottom | `rgba(255, 255, 255, 0.21)` |
| 211                | background    | `rgba(17, 17, 17, 0.1)`     |
| 333                | color         | `#9d1d27`                   |
| 450, 458           | color         | `#D23643`                   |

### blocks/form/form.css

| Line                      | Context                        | Color value(s)                                            |
| ------------------------- | ------------------------------ | --------------------------------------------------------- |
| 45                        | box-shadow                     | `rgb(0 0 0 / 25%)`                                        |
| 55, 160                   | color                          | `#333333`                                                 |
| 60                        | color                          | `#EC1C24`                                                 |
| 68, 76                    | color                          | `#495057`                                                 |
| 82, 149, 178              | color                          | `#6c757d`                                                 |
| 88                        | color                          | `#dc3545`                                                 |
| 106–108                   | color, background, border      | `#155724`, `#d4edda`, `#c3e6cb`                           |
| 112–114                   | color, background, border      | `#721c24`, `#f8d7da`, `#f5c6cb`                           |
| 130–131, 138–140, 144–145 | background, border, box-shadow | `#EC1C24`, `#d01920`, `rgba(236, 28, 36, 0.3)`, `#b81619` |
| 149–150                   | background, border             | `#6c757d`                                                 |
| 162                       | border                         | `#ced4da`                                                 |
| 169–170                   | background, border             | `#f8f9fa`, `#adb5bd`                                      |

### blocks/header/header.css

| Line                                                                                | Context                 | Color value(s)                                                   |
| ----------------------------------------------------------------------------------- | ----------------------- | ---------------------------------------------------------------- |
| 8, 254, 309, 341, 430, 452, 515, 564, 601, 660                                      | background-color        | `#f9f9f9`, `#f2f2f2`                                             |
| 12, 286, 470, 603                                                                   | box-shadow              | `rgb(0 0 0 / 10%)`, `rgb(0 0 0 / 4%)`                            |
| 54, 241, 509, 554–555, 823, 1202, 1470, 1930                                        | border                  | `#e0e0e0`, `#f0f0f0`, `#f1f1f1`                                  |
| 253, 313, 353, 450, 540, 1219, 1227, 1512, 1519, 1868, 1926, 2499, 2508, 2541, 2560 | color                   | `#353535`, `#1a1a1a`, `#686873`, `#902a2c`, `#981a1d`, `#3a3a3a` |
| 759, 774, 781, 2562, 2568–2569                                                      | border/background/color | `#902a2c`                                                        |
| 995, 1256, 1541                                                                     | background-color        | `rgb(0 0 0 / 90%)`                                               |
| 1051, 1133, 2665, 2726                                                              | background              | `#e0e0e0`                                                        |
| 1113, 1426, 1434, 2163                                                              | box-shadow              | `rgba(0 0 0 / 8%)`, `rgba(0 0 0 / 20%)`, `rgb(0 0 0 / 15%)`      |
| 1529                                                                                | linear-gradient         | `#511211`, `#6b1a19`                                             |
| 1565, 2806                                                                          | linear-gradient         | `#E9E9E9`, `#838383`                                             |
| 1853                                                                                | color                   | `#981a1d`                                                        |
| 1947                                                                                | box-shadow              | `rgb(0 0 0 / 15%)`                                               |
| 2067, 2072                                                                          | background              | `#ccc`, `#999`                                                   |
| 2216                                                                                | color                   | `#666`                                                           |
| 2314, 2321                                                                          | color                   | `#bd3e46`                                                        |
| 2449                                                                                | box-shadow              | `rgb(120 120 120 / 8%)`                                          |
| 2481, 2542                                                                          | border, color           | `#353535`                                                        |
| 2484                                                                                | color                   | `#3a3a3a`                                                        |
| 2816                                                                                | color                   | `#fafafa`                                                        |

### blocks/header/nav-pane.css

| Line                     | Context             | Color value(s)                                                                         |
| ------------------------ | ------------------- | -------------------------------------------------------------------------------------- |
| 22–23, 50–51, 954        | color, border       | `#353535`                                                                              |
| 31, 116, 154, 276, 1024  | border              | `#d9d9d9`, `#d8d8d8`, `#d0d0d0`                                                        |
| 49                       | background-color    | `rgba(0, 0, 0, 0)`                                                                     |
| 104, 139                 | background          | `#d8d8d8`, `#525252`                                                                   |
| 115–116, 159             | background, border  | `#f3f3f3`, `#d8d8d8`                                                                   |
| 141                      | border-bottom-color | `#d0d0d0`                                                                              |
| 162, 170, 181, 432, 1111 | color               | `#54565b`, `#787878`                                                                   |
| 447, 451, 455, 459, 463  | linear-gradient     | `#ffebeb`, `#faf2da`, `#f0e8eb`, `#efdfd3`, `#ffebe0`, `#fbeaf8`, `#fefae9`            |
| 467, 472, 477, 482       | linear-gradient     | `#C2D8EF`, `#8AC2F1`, `#E8D9DF`, `#B08797`, `#E1E1EB`, `#9393A8`, `#eecec5`, `#b26b69` |
| 673                      | background          | `#f6f6f6`                                                                              |
| 705                      | color               | `rgba(37, 36, 59, .5)`                                                                 |
| 917                      | border-bottom       | `rgba(151, 151, 151, .2)`                                                              |
| 951                      | border-bottom       | `rgba(0, 0, 0, 0)`                                                                     |
| 1011, 1136               | box-shadow          | `rgba(0, 0, 0, .07)`                                                                   |
| 1095                     | border-color        | `rgba(0, 0, 0, 0)`                                                                     |
| 1145                     | box-shadow          | `rgba(145, 42, 44, .24)`                                                               |

### blocks/hero-heritage-cc/hero-heritage-cc.css

| Line | Context          | Color value(s)                                                   |
| ---- | ---------------- | ---------------------------------------------------------------- |
| 94   | background-color | `rgba(255 255 255 / 15%)`                                        |
| 128  | color            | `rgb(136 128 122)`                                               |
| 448  | linear-gradient  | `#332B28`, `#514A44`, `#8B837D`, `#625A50`, `#7A766D`, `#433C32` |

### blocks/hotspot/hotspot.css

| Line         | Context                                  | Color value(s)                  |
| ------------ | ---------------------------------------- | ------------------------------- |
| 72, 122, 224 | fallback in `var(--text-color, #1a1a5e)` | `#1a1a5e`                       |
| 90           | fallback in `var(--primary, ...)`        | `#110140`, `#1E2A8E`, `#010740` |
| 92           | -webkit-text-fill-color                  | `rgb(0 0 0 / 0%)`               |
| 103          | color                                    | `rgb(0 0 0)`                    |
| 134, 139     | stroke, fill                             | `#555`                          |
| 203          | background-color                         | `rgb(255 255 255 / 80%)`        |

### blocks/link-to-upi/link-to-upi.css

| Line   | Context         | Color value(s)            |
| ------ | --------------- | ------------------------- |
| 43, 50 | color           | `rgba(247 247 247 / 80%)` |
| 62     | color           | `#ddd`                    |
| 82     | border-bottom   | `rgb(255 255 255 / 20%)`  |
| 98     | linear-gradient | `#3F46A0`, `#E04D56`      |

### blocks/modal/modal.css

| Line     | Context                 | Color value(s)                  |
| -------- | ----------------------- | ------------------------------- |
| 31       | background              | `rgba(0, 0, 0, 0.8)`            |
| 88       | background              | `rgb(0 0 0 / 80%)`              |
| 127, 640 | box-shadow              | `rgb(0 0 0 / 25%)`              |
| 343      | border-bottom           | `#2e3e79`                       |
| 543      | background              | `#ebdfdf`                       |
| 548      | border                  | `#880e16`                       |
| 565      | background              | `#e6e6e6`                       |
| 736      | border-top              | `#c1c1c1`                       |
| 792      | linear-gradient         | `#110140`, `#1E2A8E`, `#010740` |
| 794      | -webkit-text-fill-color | `rgba(0, 0, 0, 0)`              |

### blocks/overview/overview.css

| Line | Context | Color value(s) |
| ---- | ------- | -------------- |
| 32   | color   | `#54565b`      |

### blocks/overview-rte/overview-rte.css

| Line | Context | Color value(s) |
| ---- | ------- | -------------- |
| 24   | color   | `#54565B`      |

### blocks/steps/steps.css

| Line           | Context        | Color value(s) |
| -------------- | -------------- | -------------- |
| 53–54, 187–188 | gradient stops | `#e7e7e7`      |

### blocks/tabs/tabs.css

| Line   | Context           | Color value(s)                          |
| ------ | ----------------- | --------------------------------------- |
| 10, 40 | border            | `#2E3E79`                               |
| 22, 68 | color             | `#08133C`                               |
| 63     | background        | `rgb(255 255 255 / 70%)`                |
| 85–86  | background, color | `#999`, `#EFEFEF`, `#CACACA`, `#08133C` |

### blocks/tabs-cc-concept/tabs-cc-concept.css

| Line | Context | Color value(s) |
| ---- | ------- | -------------- |
| 9    | border  | `#2E3E79`      |
| 21   | color   | `#08133C`      |

### blocks/tabs-upi-link/tabs-upi-link.css

| Line     | Context          | Color value(s)           |
| -------- | ---------------- | ------------------------ |
| 69       | background-color | `rgb(255 255 255 / 20%)` |
| 71       | linear-gradient  | `rgb(255 255 255 / 40%)` |
| 96       | color            | `rgb(255 255 255 / 40%)` |
| 136, 446 | background-color | `rgb(255 255 255 / 15%)` |
| 173      | background-color | `rgb(255 255 255 / 10%)` |

---

## Part 3: Suggested new CSS tokens (from Part 2 hardcoded values)

Add these to `:root` in **styles/styles.css**. Names use `--color-*` for colors and `--gradient-*` for gradients; names are unique. After adding, replace the hardcoded values in Part 2 with the suggested token.

### Suggested color tokens

| Suggested token                   | Value                                                 | Use instead of (Part 2 locations)                                                                                                  |
| --------------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `--color-gray-body`               | `#54565B`                                             | styles.css:271; cards:456; overview:32; overview-rte:24; nav-pane:162, 170, 181, 432, 1111                                         |
| `--color-transparent`             | `rgba(0, 0, 0, 0)` or `rgb(0 0 0 / 0%)`               | styles.css:130; nav-pane:49, 951, 1095; modal:794                                                                                  |
| `--color-overlay-black-50`        | `rgba(0 0 0 / 50%)`                                   | styles.css:568; cards:1349, 1374                                                                                                   |
| `--color-overlay-white-50`        | `rgba(255 255 255 / 50%)` or `rgb(255 255 255 / 50%)` | styles.css:580; cards:1365; cards-testimonial:256                                                                                  |
| `--color-border-light`            | `#E0E0E0`                                             | styles.css:926, 927; category-nav; header:54, 241, 509, 554-555, 823, 1051, 1133, 1202, 1470, 1930, 2665, 2726                     |
| `--color-shadow-gray-10`          | `rgba(37 36 59 / 10%)` or `rgb(0 0 0 / 10%)`          | styles.css:928, 1121; anchor-nav:33; header:12, 286, 470, 603                                                                      |
| `--color-overlay-gray-90`         | `rgb(232 232 232 / 90%)`                              | styles.css:1119                                                                                                                    |
| `--color-gray-mid`                | `#767676`                                             | styles.css:1141                                                                                                                    |
| `--color-red-500-alt`             | `#902a2c`                                             | anchor-nav:145, 148, 165; header:759, 774, 781, 253, 2560, 2562, 2568, 2569 (or align to existing `--color-red-500` #902a2b)       |
| `--color-overlay-black-50-legacy` | `rgba(0, 0, 0, .5)`                                   | banner:33                                                                                                                          |
| `--color-shadow-gray-15`          | `rgb(37 36 59 / 15%)`                                 | cards:54, 330, 1144, 1639; cards-testimonial:27, 215                                                                               |
| `--color-black-soft`              | `#1c1c1c`                                             | cards:93                                                                                                                           |
| `--color-shadow-gray-full`        | `rgb(137 137 137 / 100%)`                             | cards:104                                                                                                                          |
| `--color-red-focus`               | `#B31B1B`                                             | cards:108, 145, 1316                                                                                                               |
| `--color-shadow-black-8`          | `rgba(0 0 0 / 8%)`                                    | cards:488; header:1113                                                                                                             |
| `--color-shadow-black-12`         | `rgba(0 0 0 / 12%)`                                   | cards:496                                                                                                                          |
| `--color-shadow-black-30`         | `rgba(0 0 0 / 30%)`                                   | cards:595, 787, 1557, 1794; header:1426, 1434, 2163                                                                                |
| `--color-neutral-100`             | `#f0f0f0`                                             | cards:549; header borders:254, 302, 331, 426, 509                                                                                  |
| `--color-gray-silver-mid`         | `#999`                                                | cards:675; tabs:85-86; header:2067, 2072                                                                                           |
| `--color-gray-silver-light`       | `#EFEFEF`                                             | cards:675; tabs:85-86                                                                                                              |
| `--color-gray-silver-dark`        | `#CACACA`                                             | cards:675; tabs:85-86                                                                                                              |
| `--color-white-80`                | `rgba(255 255 255 / 80%)` or `rgb(255 255 255 / 80%)` | cards:689, 941; hotspot:203                                                                                                        |
| `--color-gray-dark-400`           | `#3D3D3D`                                             | cards:798                                                                                                                          |
| `--color-gray-dark-300`           | `#5A5A5A`                                             | cards:798                                                                                                                          |
| `--color-gray-dark-500`           | `#4A4A4A`                                             | cards:798                                                                                                                          |
| `--color-white-60`                | `rgba(255 255 255 / 60%)`                             | cards:832                                                                                                                          |
| `--color-blue-tabs`               | `#2E3E79`                                             | cards:834; tabs:10, 40; tabs-cc-concept:9, 21; modal:343                                                                           |
| `--color-blue-deep`               | `#08133C`                                             | tabs:22, 68; tabs-cc-concept:21                                                                                                    |
| `--color-overlay-white-20`        | `rgba(255 255 255 / 20%)`                             | cards:1053; link-to-upi:82; tabs-upi-link:69                                                                                       |
| `--color-overlay-gray-20`         | `rgba(177 177 177 / 20%)`                             | cards:1053                                                                                                                         |
| `--color-red-hero`                | `#7a151b`                                             | cards:1123                                                                                                                         |
| `--color-gradient-pewter-stops`   | _(already in --gradient-pewter)_                      | cards:1292; hero-heritage-cc:448 — use `var(--gradient-pewter)` or keep gradient                                                   |
| `--color-overlay-white-40`        | `rgba(255 255 255 / 40%)` or `rgb(255 255 255 / 40%)` | cards:1436, 1555-1556; tabs-upi-link:71, 96                                                                                        |
| `--color-overlay-white-0`         | `rgba(255 255 255 / 0%)` / `rgb(255 255 255 / 0%)`    | cards:1436, 1555-1556                                                                                                              |
| `--color-gray-dark-800`           | `#2C2C2C`                                             | cards:1555-1556                                                                                                                    |
| `--color-gray-dark-900`           | `#1A1A1A`                                             | cards:1555-1556                                                                                                                    |
| `--color-white-90`                | `rgb(255 255 255 / 90%)`                              | cards:1622                                                                                                                         |
| `--color-shadow-gray-25`          | `rgb(37 36 59 / 25%)`                                 | cards-testimonial:35, 241                                                                                                          |
| `--color-neutral-50`              | `#f9f9f9`                                             | category-nav:19, 40, 88, 594, 603, 696, 717; header:8, 254, 309, 430, 452, 515, 564, 601, 660                                      |
| `--color-neutral-200`             | `#f2f2f2`                                             | header:601, 660                                                                                                                    |
| `--color-gray-border`             | `#ccc`                                                | category-nav:20, 784; header:2067                                                                                                  |
| `--color-gray-bg`                 | `#f5f5f5`                                             | category-nav:40, 594, 603, 696, 716; nav-pane:594, 603 (or use existing `--color-white-100`)                                       |
| `--color-text-dark`               | `#333` / `#333333`                                    | category-nav:142, 261, 451; form:55, 160                                                                                           |
| `--color-red-link`                | `#c00`                                                | category-nav:304                                                                                                                   |
| `--color-tag-pale-yellow`         | `#fffbe6`                                             | category-nav:436                                                                                                                   |
| `--color-tag-pale-cyan`           | `#ebffff`                                             | category-nav:437                                                                                                                   |
| `--color-tag-pale-lavender`       | `#ffeffd`                                             | category-nav:438                                                                                                                   |
| `--color-tag-pale-rose`           | `#ffcece`                                             | category-nav:439                                                                                                                   |
| `--color-tag-pale-pink`           | `#ffe1ec`                                             | category-nav:440                                                                                                                   |
| `--color-tag-pale-purple`         | `#f2e5ff`                                             | category-nav:441                                                                                                                   |
| `--color-tag-pale-mint`           | `#eefff2`                                             | category-nav:442                                                                                                                   |
| `--color-tag-pale-white`          | `#fff7f7`                                             | category-nav:443                                                                                                                   |
| `--color-shadow-black-12-alt`     | `rgb(0 0 0 / 12%)`                                    | category-nav:424                                                                                                                   |
| `--color-shadow-red-25`           | `rgb(157 29 39 / 25%)`                                | category-nav:476                                                                                                                   |
| `--color-text-muted`              | `rgb(58 58 58)`                                       | category-nav:267                                                                                                                   |
| `--color-red-nav-fallback`        | `#922`                                                | category-nav:620, 697 (fallback in var)                                                                                            |
| `--color-red-disabled`            | `#d99`                                                | category-nav:717                                                                                                                   |
| `--color-overlay-black-30`        | `rgba(0 0 0 / 30%)`                                   | cc-hero-slider:92, 100                                                                                                             |
| `--color-red-slider`              | `#8a1515`                                             | cc-hero-slider:124                                                                                                                 |
| `--color-shadow-black-25`         | `rgb(0 0 0 / 25%)`                                    | cta-sticky:45, 62; form:45; modal:127, 640                                                                                         |
| `--color-footer-red`              | `rgb(188, 59, 69)`                                    | footer:28, 38                                                                                                                      |
| `--color-yellow-cta`              | `#FFCB05`                                             | footer:65                                                                                                                          |
| `--color-gray-footer`             | `#525252`                                             | footer:68, 75; nav-pane:104, 139                                                                                                   |
| `--color-border-white-21`         | `rgba(255, 255, 255, 0.21)`                           | footer:137, 148, 310, 425                                                                                                          |
| `--color-overlay-black-10`        | `rgba(17, 17, 17, 0.1)`                               | footer:211                                                                                                                         |
| `--color-red-footer-alt`          | `#9d1d27`                                             | footer:333 (or use `--color-red-400`)                                                                                              |
| `--color-red-footer-link`         | `#D23643`                                             | footer:450, 458                                                                                                                    |
| `--color-red-form-primary`        | `#EC1C24`                                             | form:60, 130-131                                                                                                                   |
| `--color-form-text`               | `#495057`                                             | form:68, 76                                                                                                                        |
| `--color-form-muted`              | `#6c757d`                                             | form:82, 149, 178 (or use existing `--color-gray-300`)                                                                             |
| `--color-red-form-error`          | `#dc3545`                                             | form:88                                                                                                                            |
| `--color-success-bg`              | `#155724`                                             | form:106                                                                                                                           |
| `--color-success-light`           | `#d4edda`                                             | form:107                                                                                                                           |
| `--color-success-border`          | `#c3e6cb`                                             | form:108                                                                                                                           |
| `--color-error-dark`              | `#721c24`                                             | form:112                                                                                                                           |
| `--color-error-light`             | `#f8d7da`                                             | form:113                                                                                                                           |
| `--color-error-border`            | `#f5c6cb`                                             | form:114                                                                                                                           |
| `--color-red-form-hover`          | `#d01920`                                             | form:138-139                                                                                                                       |
| `--color-shadow-red-30`           | `rgba(236, 28, 36, 0.3)`                              | form:140                                                                                                                           |
| `--color-red-form-active`         | `#b81619`                                             | form:144-145                                                                                                                       |
| `--color-border-form`             | `#ced4da`                                             | form:162                                                                                                                           |
| `--color-input-bg`                | `#f8f9fa`                                             | form:169                                                                                                                           |
| `--color-input-border`            | `#adb5bd`                                             | form:170                                                                                                                           |
| `--color-text-primary`            | `#353535`                                             | header:253, 313, 353, 450, 540, 1219, 1227, 1512, 1519, 1868, 1926, 2499, 2508, 2541, 2481, 2542, 2499; nav-pane:22-23, 50-51, 954 |
| `--color-text-secondary`          | `#1a1a1a`                                             | header:392                                                                                                                         |
| `--color-text-tertiary`           | `#686873`                                             | header:527                                                                                                                         |
| `--color-red-header`              | `#981a1d`                                             | header:1853                                                                                                                        |
| `--color-text-quaternary`         | `#3a3a3a`                                             | header:2484                                                                                                                        |
| `--color-overlay-black-90`        | `rgb(0 0 0 / 90%)`                                    | header:995, 1256, 1541                                                                                                             |
| `--color-shadow-black-4`          | `rgb(0 0 0 / 4%)`                                     | header:286, 470, 603                                                                                                               |
| `--color-shadow-black-15`         | `rgb(0 0 0 / 15%)`                                    | header:1947, 2163                                                                                                                  |
| `--color-gray-mid-dark`           | `#666`                                                | header:2216                                                                                                                        |
| `--color-red-badge`               | `#bd3e46`                                             | header:2314, 2321                                                                                                                  |
| `--color-shadow-gray-8`           | `rgb(120 120 120 / 8%)`                               | header:2449                                                                                                                        |
| `--color-neutral-50-alt`          | `#fafafa`                                             | header:2816                                                                                                                        |
| `--color-gray-border-dark`        | `#d9d9d9`                                             | nav-pane:31                                                                                                                        |
| `--color-gray-panel`              | `#d8d8d8`                                             | nav-pane:104, 116, 154, 276, 1024                                                                                                  |
| `--color-gray-panel-alt`          | `#d0d0d0`                                             | nav-pane:141                                                                                                                       |
| `--color-nav-bg`                  | `#f3f3f3`                                             | nav-pane:115-116, 159                                                                                                              |
| `--color-text-muted-alt`          | `#787878`                                             | nav-pane:1111                                                                                                                      |
| `--color-bg-subtle`               | `#f6f6f6`                                             | nav-pane:673                                                                                                                       |
| `--color-text-muted-alpha`        | `rgba(37, 36, 59, .5)`                                | nav-pane:705                                                                                                                       |
| `--color-border-muted`            | `rgba(151, 151, 151, .2)`                             | nav-pane:917                                                                                                                       |
| `--color-shadow-black-7`          | `rgba(0, 0, 0, .07)`                                  | nav-pane:1011, 1136                                                                                                                |
| `--color-shadow-red-24`           | `rgba(145, 42, 44, .24)`                              | nav-pane:1145                                                                                                                      |
| `--color-overlay-white-15`        | `rgba(255 255 255 / 15%)`                             | hero-heritage-cc:94; tabs-upi-link:136, 446                                                                                        |
| `--color-pewter-muted`            | `rgb(136 128 122)`                                    | hero-heritage-cc:128                                                                                                               |
| `--color-text-blue-dark`          | `#1a1a5e`                                             | hotspot:72, 122, 224 (fallback)                                                                                                    |
| `--color-black-solid`             | `rgb(0 0 0)`                                          | hotspot:103                                                                                                                        |
| `--color-gray-icon`               | `#555`                                                | hotspot:134, 139                                                                                                                   |
| `--color-gray-light`              | `#ddd`                                                | link-to-upi:62                                                                                                                     |
| `--color-white-80-warm`           | `rgba(247 247 247 / 80%)`                             | link-to-upi:43, 50                                                                                                                 |
| `--color-overlay-black-80`        | `rgba(0, 0, 0, 0.8)` / `rgb(0 0 0 / 80%)`             | modal:31, 88                                                                                                                       |
| `--color-red-tint-bg`             | `#ebdfdf`                                             | modal:543                                                                                                                          |
| `--color-red-border-dark`         | `#880e16`                                             | modal:548                                                                                                                          |
| `--color-gray-input-bg`           | `#e6e6e6`                                             | modal:565                                                                                                                          |
| `--color-gray-divider`            | `#c1c1c1`                                             | modal:736                                                                                                                          |
| `--color-white-70`                | `rgb(255 255 255 / 70%)`                              | tabs:63                                                                                                                            |
| `--color-overlay-white-10`        | `rgb(255 255 255 / 10%)`                              | tabs-upi-link:173                                                                                                                  |
| `--color-steps-track`             | `#e7e7e7`                                             | steps:53-54, 187-188                                                                                                               |

### Suggested gradient tokens

| Suggested token                   | Value                                                                                   | Use instead of (Part 2 locations)                                                                                       |
| --------------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `--gradient-red-header-vertical`  | `linear-gradient(180deg, #511211 0%, #6b1a19 50%, #511211 100%)`                        | header:1529                                                                                                             |
| `--gradient-neutral-horizontal`   | `linear-gradient(93.81deg, #E9E9E9 0%, #838383 154.51%)`                                | header:1565, 2806                                                                                                       |
| `--gradient-theme-rose-cream`     | `linear-gradient(143deg, #ffebeb, #faf2da)`                                             | category-nav:561; nav-pane:447                                                                                          |
| `--gradient-theme-rose-lavender`  | `linear-gradient(143deg, #ffebeb, #f0e8eb)`                                             | nav-pane:451                                                                                                            |
| `--gradient-theme-cream-peach`    | `linear-gradient(143deg, #faf3d8, #efdfd3)`                                             | nav-pane:455                                                                                                            |
| `--gradient-theme-lavender-peach` | `linear-gradient(143deg, #f0e8eb, #ffebe0)`                                             | nav-pane:459                                                                                                            |
| `--gradient-theme-lavender-cream` | `linear-gradient(143deg, #fbeaf8, #fefae9)`                                             | nav-pane:463                                                                                                            |
| `--gradient-theme-cyan`           | `linear-gradient(143.78deg, #C2D8EF 7.34%, #8AC2F1 96.03%)`                             | nav-pane:467                                                                                                            |
| `--gradient-theme-rose-dust`      | `linear-gradient(147.97deg, #E8D9DF 8.7%, #B08797 94.29%)`                              | nav-pane:472                                                                                                            |
| `--gradient-theme-slate`          | `linear-gradient(143.78deg, #E1E1EB 7.34%, #9393A8 96.03%)`                             | nav-pane:477                                                                                                            |
| `--gradient-theme-terracotta`     | `linear-gradient(143.78deg, #eecec5 7.34%, #b26b69 96.03%)`                             | nav-pane:482                                                                                                            |
| `--gradient-indigo-tabs`          | `linear-gradient(308.18deg, #110140 4.16%, #1E2A8E 44.91%, #010740 88.8%)`              | modal:792; hotspot:90 fallback (same as existing `--gradient-metal-blue` / `--gradient-indigo` — prefer existing token) |
| `--gradient-upi-link`             | `linear-gradient(150deg, #3F46A0 -112.96%, var(--color-red-400) 4.82%, #E04D56 106.6%)` | link-to-upi:98                                                                                                          |
| `--gradient-category-nav-rose`    | `linear-gradient(135deg, #ffe5e7 0%, #ffd1d4 100%)`                                     | category-nav:565                                                                                                        |
| `--gradient-category-nav-blue`    | `linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)`                                     | category-nav:569                                                                                                        |
| `--gradient-category-nav-neutral` | `linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%)`                                     | category-nav:573                                                                                                        |
| `--gradient-category-nav-subtle`  | `linear-gradient(135deg, #fafafa 0%, #e8e8e8 100%)`                                     | category-nav:577                                                                                                        |
| `--gradient-category-nav-warm`    | `linear-gradient(143deg, #ffebeb, #faf2da)`                                             | category-nav:561 (duplicate of theme-rose-cream)                                                                        |

### Notes for Part 3

- **Prefer existing tokens** where the value matches or is very close (e.g. `#902a2c` vs `--color-red-500` `#902a2b`; `#6c757d` = `--color-gray-300`; `#9d1d27` ≈ `--color-red-400`).
- **Overlay and shadow tokens** can be reduced to a small set (e.g. `--color-overlay-black-*`, `--color-shadow-black-*`, `--color-shadow-gray-*`) and reused across files.
- **Tag and theme gradients** in category-nav/nav-pane are good candidates for tokens if you want theme switching or consistency.
- After adding tokens to `styles.css`, run a find-replace in the listed files to use `var(--token-name)` instead of the hardcoded value.

---

## Part 4: Token groupings by perceptual similarity (Delta E ≤ 1)

Part 3 suggested tokens are re-categorized so that **within each category, every pair of CSS color values has Delta E (CIE76) ≤ 1** (perceptually nearly identical). You can use **one token and one canonical value per group** and replace all listed locations with that token.

**Delta E (ΔE)** measures the perceptual difference between two colors (in LAB space). **ΔE ≤ 1** means the difference is not perceptible to the human eye, so merging those values into a single token will not change the look of the UI.

**How to use Part 4:** For each group, pick one suggested token name and the canonical value; add that token to `styles.css`. Then replace every occurrence of any value in the "Values merged" column with `var(--your-chosen-token)` in the corresponding Part 2/Part 3 locations (see Part 3 table for token → locations).

### Summary: groups at a glance

| Group | Canonical value | Suggested token (use one per group)                 | Values merged (ΔE ≤ 1)                                           |
| ----- | --------------- | --------------------------------------------------- | ---------------------------------------------------------------- |
| 1     | `#000000`       | `--color-black-solid`                               | `#000000`                                                        |
| 2     | `#08133C`       | `--color-blue-deep`                                 | `#08133C`                                                        |
| 3     | `#155724`       | `--color-success-bg`                                | `#155724`                                                        |
| 4     | `#1A1A1A`       | `--color-text-secondary` or `--color-gray-dark-900` | `#1A1A1A`                                                        |
| 5     | `#1A1A5E`       | `--color-text-blue-dark`                            | `#1A1A5E`                                                        |
| 6     | `#1C1C1C`       | `--color-black-soft`                                | `#1C1C1C`                                                        |
| 7     | `#2C2C2C`       | `--color-gray-dark-800`                             | `#2C2C2C`                                                        |
| 8     | `#2E3E79`       | `--color-blue-tabs`                                 | `#2E3E79`                                                        |
| 9     | `#333333`       | `--color-text-dark` or `--color-text-primary`       | `#333333`, `#353535`                                             |
| 10    | `#3A3A3A`       | `--color-text-quaternary` or `--color-text-muted`   | `#3A3A3A`, `rgb(58 58 58)`                                       |
| 11    | `#3D3D3D`       | `--color-gray-dark-400`                             | `#3D3D3D`                                                        |
| 12    | `#495057`       | `--color-form-text`                                 | `#495057`                                                        |
| 13    | `#4A4A4A`       | `--color-gray-dark-500`                             | `#4A4A4A`                                                        |
| 14    | `#525252`       | `--color-gray-footer`                               | `#525252`                                                        |
| 15    | `#54565B`       | `--color-gray-body`                                 | `#54565B`                                                        |
| 16    | `#555555`       | `--color-gray-icon`                                 | `#555`                                                           |
| 17    | `#5A5A5A`       | `--color-gray-dark-300`                             | `#5A5A5A`                                                        |
| 18    | `#666666`       | `--color-gray-mid-dark`                             | `#666`                                                           |
| 19    | `#686873`       | `--color-text-tertiary`                             | `#686873`                                                        |
| 20    | `#6C757D`       | `--color-form-muted`                                | `#6C757D`                                                        |
| 21    | `#721C24`       | `--color-error-dark`                                | `#721C24`                                                        |
| 22    | `#767676`       | `--color-gray-mid` or `--color-text-muted-alt`      | `#767676`, `#787878`                                             |
| 23    | `#7A151B`       | `--color-red-hero`                                  | `#7A151B`                                                        |
| 24    | `#880E16`       | `--color-red-border-dark`                           | `#880E16`                                                        |
| 25    | `#88807A`       | `--color-pewter-muted`                              | `rgb(136 128 122)`                                               |
| 26    | `#898989`       | `--color-shadow-gray-full`                          | `rgb(137 137 137)`                                               |
| 27    | `#8A1515`       | `--color-red-slider`                                | `#8A1515`                                                        |
| 28    | `#902A2C`       | `--color-red-500-alt`                               | `#902A2C`                                                        |
| 29    | `#981A1D`       | `--color-red-header`                                | `#981A1D`                                                        |
| 30    | `#992222`       | `--color-red-nav-fallback`                          | `#922`                                                           |
| 31    | `#999999`       | `--color-gray-silver-mid`                           | `#999`                                                           |
| 32    | `#9D1D27`       | `--color-red-footer-alt`                            | `#9D1D27`                                                        |
| 33    | `#ADB5BD`       | `--color-input-border`                              | `#ADB5BD`                                                        |
| 34    | `#B31B1B`       | `--color-red-focus`                                 | `#B31B1B`                                                        |
| 35    | `#B81619`       | `--color-red-form-active`                           | `#B81619`                                                        |
| 36    | `#BC3B45`       | `--color-footer-red`                                | `rgb(188, 59, 69)`                                               |
| 37    | `#BD3E46`       | `--color-red-badge`                                 | `#BD3E46`                                                        |
| 38    | `#C1C1C1`       | `--color-gray-divider`                              | `#C1C1C1`                                                        |
| 39    | `#C3E6CB`       | `--color-success-border`                            | `#C3E6CB`                                                        |
| 40    | `#CACACA`       | `--color-gray-silver-dark` or `--color-gray-border` | `#CACACA`, `#CCCCCC`                                             |
| 41    | `#CC0000`       | `--color-red-link`                                  | `#C00`                                                           |
| 42    | `#CED4DA`       | `--color-border-form`                               | `#CED4DA`                                                        |
| 43    | `#D01920`       | `--color-red-form-hover`                            | `#D01920`                                                        |
| 44    | `#D0D0D0`       | `--color-gray-panel-alt`                            | `#D0D0D0`                                                        |
| 45    | `#D23643`       | `--color-red-footer-link`                           | `#D23643`                                                        |
| 46    | `#D4EDDA`       | `--color-success-light`                             | `#D4EDDA`                                                        |
| 47    | `#D8D8D8`       | `--color-gray-panel` or `--color-gray-border-dark`  | `#D8D8D8`, `#D9D9D9`                                             |
| 48    | `#DC3545`       | `--color-red-form-error`                            | `#DC3545`                                                        |
| 49    | `#DD9999`       | `--color-red-disabled`                              | `#D99`                                                           |
| 50    | `#DDDDDD`       | `--color-gray-light`                                | `#DDD`                                                           |
| 51    | `#E0E0E0`       | `--color-border-light`                              | `#E0E0E0`                                                        |
| 52    | `#E6E6E6`       | `--color-gray-input-bg` or `--color-steps-track`    | `#E6E6E6`, `#E7E7E7`                                             |
| 53    | `#EBDFDF`       | `--color-red-tint-bg`                               | `#EBDFDF`                                                        |
| 54    | `#EBFFFF`       | `--color-tag-pale-cyan`                             | `#EBFFFF`                                                        |
| 55    | `#EC1C24`       | `--color-red-form-primary`                          | `#EC1C24`                                                        |
| 56    | `#EEFFF2`       | `--color-tag-pale-mint`                             | `#EEFFF2`                                                        |
| 57    | `#F0F0F0`       | `--color-neutral-100` (merge light grays)           | `#EFEFEF`, `#F0F0F0`, `#F2F2F2`, `#F3F3F3`, `#F5F5F5`, `#F6F6F6` |
| 58    | `#F2E5FF`       | `--color-tag-pale-purple`                           | `#F2E5FF`                                                        |
| 59    | `#F5C6CB`       | `--color-error-border`                              | `#F5C6CB`                                                        |
| 60    | `#F8D7DA`       | `--color-error-light`                               | `#F8D7DA`                                                        |
| 61    | `#F9F9F9`       | `--color-neutral-50` (merge off-whites)             | `#F8F9FA`, `#F9F9F9`, `#FAFAFA`                                  |
| 62    | `#FFCB05`       | `--color-yellow-cta`                                | `#FFCB05`                                                        |
| 63    | `#FFCECE`       | `--color-tag-pale-rose`                             | `#FFCECE`                                                        |
| 64    | `#FFE1EC`       | `--color-tag-pale-pink`                             | `#FFE1EC`                                                        |
| 65    | `#FFEFFD`       | `--color-tag-pale-lavender`                         | `#FFEFFD`                                                        |
| 66    | `#FFF7F7`       | `--color-tag-pale-white`                            | `#FFF7F7`                                                        |
| 67    | `#FFFBE6`       | `--color-tag-pale-yellow`                           | `#FFFBE6`                                                        |

### Notes for Part 4

- **Groups 9, 10, 22, 40, 47, 52, 57, 61** merge two or more Part 3 tokens into one canonical value (ΔE ≤ 1). Use a single token for each such group to reduce token count.
- **Group 57** merges six light gray/off-white values (`#EFEFEF` … `#F6F6F6`); **Group 61** merges three off-whites (`#F8F9FA`, `#F9F9F9`, `#FAFAFA`). Replacing all with one token per group keeps the UI visually the same.
- **Overlay and alpha-based colors** (e.g. `rgba(0 0 0 / 50%)`, `rgb(255 255 255 / 80%)`) are not grouped by ΔE here because they differ by alpha; keep separate tokens by opacity if needed, or add them to `styles.css` as in Part 3.
- **Gradients** are not grouped by Delta E in Part 4; use Part 3 gradient suggestions as-is.

---

## Part 5: Part 4 groups with locations and line numbers

Same groupings as Part 4 (Delta E ≤ 1), with an additional column listing **file path and line number** where each suggested token (or the hardcoded color it replaces) is used. Use this to find-and-replace when applying tokens.

**Path convention:** `styles/styles.css` for global styles; `blocks/<block-name>/<file>.css` for block CSS.

| Group | Canonical value | Suggested token (use one per group) | Values merged (ΔE ≤ 1) | Locations (file: line) |
|-------|-----------------|-------------------------------------|-------------------------|-------------------------|
| 1 | `#000000` | `--color-black-solid` | `#000000` | blocks/hotspot/hotspot.css:103 |
| 2 | `#08133C` | `--color-blue-deep` | `#08133C` | blocks/tabs/tabs.css:22, 68; blocks/tabs-cc-concept/tabs-cc-concept.css:21 |
| 3 | `#155724` | `--color-success-bg` | `#155724` | blocks/form/form.css:106 |
| 4 | `#1A1A1A` | `--color-text-secondary` or `--color-gray-dark-900` | `#1A1A1A` | blocks/cards/cards.css:1555-1556; blocks/header/header.css:392 |
| 5 | `#1A1A5E` | `--color-text-blue-dark` | `#1A1A5E` | blocks/hotspot/hotspot.css:72, 122, 224 |
| 6 | `#1C1C1C` | `--color-black-soft` | `#1C1C1C` | blocks/cards/cards.css:93 |
| 7 | `#2C2C2C` | `--color-gray-dark-800` | `#2C2C2C` | blocks/cards/cards.css:1555-1556 |
| 8 | `#2E3E79` | `--color-blue-tabs` | `#2E3E79` | blocks/cards/cards.css:834; blocks/tabs/tabs.css:10, 40; blocks/tabs-cc-concept/tabs-cc-concept.css:9, 21; blocks/modal/modal.css:343 |
| 9 | `#333333` | `--color-text-dark` or `--color-text-primary` | `#333333`, `#353535` | blocks/category-nav/category-nav.css:142, 261, 451; blocks/form/form.css:55, 160; blocks/header/header.css:253, 313, 353, 450, 540, 1219, 1227, 1512, 1519, 1868, 1926, 2499, 2508, 2541, 2481, 2542; blocks/header/nav-pane.css:22-23, 50-51, 954 |
| 10 | `#3A3A3A` | `--color-text-quaternary` or `--color-text-muted` | `#3A3A3A`, `rgb(58 58 58)` | blocks/header/header.css:2484; blocks/category-nav/category-nav.css:267 |
| 11 | `#3D3D3D` | `--color-gray-dark-400` | `#3D3D3D` | blocks/cards/cards.css:798 |
| 12 | `#495057` | `--color-form-text` | `#495057` | blocks/form/form.css:68, 76 |
| 13 | `#4A4A4A` | `--color-gray-dark-500` | `#4A4A4A` | blocks/cards/cards.css:798 |
| 14 | `#525252` | `--color-gray-footer` | `#525252` | blocks/footer/footer.css:68, 75; blocks/header/nav-pane.css:104, 139 |
| 15 | `#54565B` | `--color-gray-body` | `#54565B` | styles/styles.css:271; blocks/cards/cards.css:456; blocks/overview/overview.css:32; blocks/overview-rte/overview-rte.css:24; blocks/header/nav-pane.css:162, 170, 181, 432, 1111 |
| 16 | `#555555` | `--color-gray-icon` | `#555` | blocks/hotspot/hotspot.css:134, 139 |
| 17 | `#5A5A5A` | `--color-gray-dark-300` | `#5A5A5A` | blocks/cards/cards.css:798 |
| 18 | `#666666` | `--color-gray-mid-dark` | `#666` | blocks/header/header.css:2216 |
| 19 | `#686873` | `--color-text-tertiary` | `#686873` | blocks/header/header.css:527 |
| 20 | `#6C757D` | `--color-form-muted` | `#6C757D` | blocks/form/form.css:82, 149, 178 |
| 21 | `#721C24` | `--color-error-dark` | `#721C24` | blocks/form/form.css:112 |
| 22 | `#767676` | `--color-gray-mid` or `--color-text-muted-alt` | `#767676`, `#787878` | styles/styles.css:1141; blocks/header/nav-pane.css:1111 |
| 23 | `#7A151B` | `--color-red-hero` | `#7A151B` | blocks/cards/cards.css:1123 |
| 24 | `#880E16` | `--color-red-border-dark` | `#880E16` | blocks/modal/modal.css:548 |
| 25 | `#88807A` | `--color-pewter-muted` | `rgb(136 128 122)` | blocks/hero-heritage-cc/hero-heritage-cc.css:128 |
| 26 | `#898989` | `--color-shadow-gray-full` | `rgb(137 137 137)` | blocks/cards/cards.css:104 |
| 27 | `#8A1515` | `--color-red-slider` | `#8A1515` | blocks/cc-hero-slider/cc-hero-slider.css:124 |
| 28 | `#902A2C` | `--color-red-500-alt` | `#902A2C` | blocks/anchor-nav/anchor-nav.css:145, 148, 165; blocks/header/header.css:759, 774, 781, 253, 2560, 2562, 2568, 2569 |
| 29 | `#981A1D` | `--color-red-header` | `#981A1D` | blocks/header/header.css:1853 |
| 30 | `#992222` | `--color-red-nav-fallback` | `#922` | blocks/category-nav/category-nav.css:620, 697 |
| 31 | `#999999` | `--color-gray-silver-mid` | `#999` | blocks/cards/cards.css:675; blocks/tabs/tabs.css:85-86; blocks/header/header.css:2067, 2072 |
| 32 | `#9D1D27` | `--color-red-footer-alt` | `#9D1D27` | blocks/footer/footer.css:333 |
| 33 | `#ADB5BD` | `--color-input-border` | `#ADB5BD` | blocks/form/form.css:170 |
| 34 | `#B31B1B` | `--color-red-focus` | `#B31B1B` | blocks/cards/cards.css:108, 145, 1316 |
| 35 | `#B81619` | `--color-red-form-active` | `#B81619` | blocks/form/form.css:144-145 |
| 36 | `#BC3B45` | `--color-footer-red` | `rgb(188, 59, 69)` | blocks/footer/footer.css:28, 38 |
| 37 | `#BD3E46` | `--color-red-badge` | `#BD3E46` | blocks/header/header.css:2314, 2321 |
| 38 | `#C1C1C1` | `--color-gray-divider` | `#C1C1C1` | blocks/modal/modal.css:736 |
| 39 | `#C3E6CB` | `--color-success-border` | `#C3E6CB` | blocks/form/form.css:108 |
| 40 | `#CACACA` | `--color-gray-silver-dark` or `--color-gray-border` | `#CACACA`, `#CCCCCC` | blocks/cards/cards.css:675; blocks/tabs/tabs.css:85-86; blocks/category-nav/category-nav.css:20, 784; blocks/header/header.css:2067 |
| 41 | `#CC0000` | `--color-red-link` | `#C00` | blocks/category-nav/category-nav.css:304 |
| 42 | `#CED4DA` | `--color-border-form` | `#CED4DA` | blocks/form/form.css:162 |
| 43 | `#D01920` | `--color-red-form-hover` | `#D01920` | blocks/form/form.css:138-139 |
| 44 | `#D0D0D0` | `--color-gray-panel-alt` | `#D0D0D0` | blocks/header/nav-pane.css:141 |
| 45 | `#D23643` | `--color-red-footer-link` | `#D23643` | blocks/footer/footer.css:450, 458 |
| 46 | `#D4EDDA` | `--color-success-light` | `#D4EDDA` | blocks/form/form.css:107 |
| 47 | `#D8D8D8` | `--color-gray-panel` or `--color-gray-border-dark` | `#D8D8D8`, `#D9D9D9` | blocks/header/nav-pane.css:31, 104, 116, 154, 276, 1024 |
| 48 | `#DC3545` | `--color-red-form-error` | `#DC3545` | blocks/form/form.css:88 |
| 49 | `#DD9999` | `--color-red-disabled` | `#D99` | blocks/category-nav/category-nav.css:717 |
| 50 | `#DDDDDD` | `--color-gray-light` | `#DDD` | blocks/link-to-upi/link-to-upi.css:62 |
| 51 | `#E0E0E0` | `--color-border-light` | `#E0E0E0` | styles/styles.css:926, 927; blocks/category-nav/category-nav.css (multiple); blocks/header/header.css:54, 241, 509, 554-555, 823, 1051, 1133, 1202, 1470, 1930, 2665, 2726 |
| 52 | `#E6E6E6` | `--color-gray-input-bg` or `--color-steps-track` | `#E6E6E6`, `#E7E7E7` | blocks/modal/modal.css:565; blocks/steps/steps.css:53-54, 187-188 |
| 53 | `#EBDFDF` | `--color-red-tint-bg` | `#EBDFDF` | blocks/modal/modal.css:543 |
| 54 | `#EBFFFF` | `--color-tag-pale-cyan` | `#EBFFFF` | blocks/category-nav/category-nav.css:437 |
| 55 | `#EC1C24` | `--color-red-form-primary` | `#EC1C24` | blocks/form/form.css:60, 130-131 |
| 56 | `#EEFFF2` | `--color-tag-pale-mint` | `#EEFFF2` | blocks/category-nav/category-nav.css:442 |
| 57 | `#F0F0F0` | `--color-neutral-100` (merge light grays) | `#EFEFEF`, `#F0F0F0`, `#F2F2F2`, `#F3F3F3`, `#F5F5F5`, `#F6F6F6` | blocks/cards/cards.css:549, 675; blocks/tabs/tabs.css:85-86; blocks/header/header.css:254, 302, 331, 426, 509, 601, 660; blocks/category-nav/category-nav.css:40, 594, 603, 696, 716; blocks/header/nav-pane.css:115-116, 159, 594, 603, 673, 846 |
| 58 | `#F2E5FF` | `--color-tag-pale-purple` | `#F2E5FF` | blocks/category-nav/category-nav.css:441 |
| 59 | `#F5C6CB` | `--color-error-border` | `#F5C6CB` | blocks/form/form.css:114 |
| 60 | `#F8D7DA` | `--color-error-light` | `#F8D7DA` | blocks/form/form.css:113 |
| 61 | `#F9F9F9` | `--color-neutral-50` (merge off-whites) | `#F8F9FA`, `#F9F9F9`, `#FAFAFA` | blocks/category-nav/category-nav.css:19, 40, 88, 594, 603, 696, 717; blocks/header/header.css:8, 254, 309, 430, 452, 515, 564, 601, 660, 2816; blocks/form/form.css:169; blocks/header/nav-pane.css:846 |
| 62 | `#FFCB05` | `--color-yellow-cta` | `#FFCB05` | blocks/footer/footer.css:65 |
| 63 | `#FFCECE` | `--color-tag-pale-rose` | `#FFCECE` | blocks/category-nav/category-nav.css:439 |
| 64 | `#FFE1EC` | `--color-tag-pale-pink` | `#FFE1EC` | blocks/category-nav/category-nav.css:440 |
| 65 | `#FFEFFD` | `--color-tag-pale-lavender` | `#FFEFFD` | blocks/category-nav/category-nav.css:438 |
| 66 | `#FFF7F7` | `--color-tag-pale-white` | `#FFF7F7` | blocks/category-nav/category-nav.css:443 |
| 67 | `#FFFBE6` | `--color-tag-pale-yellow` | `#FFFBE6` | blocks/category-nav/category-nav.css:436 |

### How to use Part 5

- **Locations (file: line)** list every place the color (or a ΔE ≤ 1 equivalent) appears. Replace the hardcoded value at each listed location with `var(--your-chosen-token)`.
- Ranges like `1555-1556` or `22-23` mean use that token on each of those lines in the file.
- For groups that merge multiple Part 3 tokens (e.g. 9, 40, 57, 61), the locations column combines all files/lines from every token in that group.

---

## Summary

- **Part 1:** All color-related tokens are defined in `styles/styles.css` in `:root`: 21 single-value color tokens, 7 semantic aliases, and 16 gradient tokens (including `--modal-backdrop-gradient`). The tables above list each token and the hex/rgb values they use.
- **Part 2:** Every line listed above uses at least one hex or rgb color that is **not** coming from a token defined in `styles/styles.css`. Replacing these with new or existing tokens in `styles.css` would centralize colors and make them easier to change.
- **Part 3:** Suggested new `--color-*` and `--gradient-*` tokens derived from Part 2. Add the ones you need to `styles.css` and replace hardcoded values in the listed locations.
- **Part 4:** Part 3 colors are grouped by **perceptual similarity (Delta E ≤ 1)**. Within each group, one canonical value and one token can replace all listed values and locations without visible change. Use the summary table to pick one token per group and reduce token count while keeping appearance consistent.
- **Part 5:** Same Part 4 groups with an additional **Locations (file: line)** column listing the exact file path and line numbers where each suggested token (or the color it replaces) is used. Use Part 5 for find-and-replace when applying tokens.
