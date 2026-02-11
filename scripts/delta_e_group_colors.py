#!/usr/bin/env python3
"""
Group CSS color values by perceptual similarity (Delta E CIE76 <= 1).
Outputs markdown for Part 4 of COLOR_TOKENS_AND_HARDCODED_AUDIT.md.
"""
import re
import math
from collections import defaultdict

# ---------- Color conversion (sRGB <-> XYZ <-> LAB, D65) ----------
def srgb_to_linear(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else math.pow((c + 0.055) / 1.055, 2.4)

def linear_to_srgb(c):
    c = 1.055 * math.pow(c, 1/2.4) - 0.055 if c > 0.0031308 else 12.92 * c
    return max(0, min(255, round(c * 255)))

# sRGB to XYZ (D65)
def rgb_to_xyz(r, g, b):
    r, g, b = srgb_to_linear(r), srgb_to_linear(g), srgb_to_linear(b)
    x = 0.4124564*r + 0.3575761*g + 0.1804375*b
    y = 0.2126729*r + 0.7151522*g + 0.0721750*b
    z = 0.0193339*r + 0.1191920*g + 0.9503041*b
    return (x, y, z)

# XYZ to LAB (D65 white 0.95047, 1, 1.08883)
def xyz_to_lab(x, y, z):
    xn, yn, zn = 0.95047, 1.0, 1.08883
    def f(t):
        return math.pow(t, 1/3) if t > 0.008856 else (7.787*t + 16/116)
    l = 116 * f(y/yn) - 16
    a = 500 * (f(x/xn) - f(y/yn))
    b = 200 * (f(y/yn) - f(z/zn))
    return (l, a, b)

def rgb_to_lab(r, g, b):
    x, y, z = rgb_to_xyz(r, g, b)
    return xyz_to_lab(x, y, z)

def delta_e_76(lab1, lab2):
    return math.sqrt(
        (lab1[0]-lab2[0])**2 +
        (lab1[1]-lab2[1])**2 +
        (lab1[2]-lab2[2])**2
    )

def parse_hex(hex_str):
    h = hex_str.lstrip('#')
    if len(h) == 3:
        h = ''.join([c*2 for c in h])
    if len(h) != 6:
        return None
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))

def parse_rgb(s):
    # rgb(r g b) or rgb(r, g, b) or rgba(r,g,b,a) - use only r,g,b
    m = re.match(r'rgba?\s*\(\s*(\d+)\s*[, ]\s*(\d+)\s*[, ]\s*(\d+)', s, re.I)
    if m:
        return (int(m.group(1)), int(m.group(2)), int(m.group(3)))
    return None

# Normalize value to a canonical hex for display
def rgb_to_hex(r, g, b):
    return '#{:02X}{:02X}{:02X}'.format(
        max(0, min(255, r)),
        max(0, min(255, g)),
        max(0, min(255, b))
    )

# ---------- Part 3 color entries: (token, value_str, locations) ----------
# Only opaque or RGB part; we'll group by RGB. Alpha variants kept separate for tokens.
ENTRIES = [
    ("--color-gray-body", "#54565B", "styles.css:271; cards:456; overview:32; overview-rte:24; nav-pane:162, 170, 181, 432, 1111"),
    ("--color-border-light", "#E0E0E0", "styles.css:926, 927; category-nav; header:54, 241, 509, 554-555, 823, 1051, 1133, 1202, 1470, 1930, 2665, 2726"),
    ("--color-gray-mid", "#767676", "styles.css:1141"),
    ("--color-red-500-alt", "#902a2c", "anchor-nav:145, 148, 165; header:759, 774, 781, 253, 2560, 2562, 2568, 2569"),
    ("--color-black-soft", "#1c1c1c", "cards:93"),
    ("--color-red-focus", "#B31B1B", "cards:108, 145, 1316"),
    ("--color-neutral-100", "#f0f0f0", "cards:549; header borders:254, 302, 331, 426, 509"),
    ("--color-gray-silver-mid", "#999", "cards:675; tabs:85-86; header:2067, 2072"),
    ("--color-gray-silver-light", "#EFEFEF", "cards:675; tabs:85-86"),
    ("--color-gray-silver-dark", "#CACACA", "cards:675; tabs:85-86"),
    ("--color-gray-dark-400", "#3D3D3D", "cards:798"),
    ("--color-gray-dark-300", "#5A5A5A", "cards:798"),
    ("--color-gray-dark-500", "#4A4A4A", "cards:798"),
    ("--color-blue-tabs", "#2E3E79", "cards:834; tabs:10, 40; tabs-cc-concept:9, 21; modal:343"),
    ("--color-blue-deep", "#08133C", "tabs:22, 68; tabs-cc-concept:21"),
    ("--color-red-hero", "#7a151b", "cards:1123"),
    ("--color-gray-dark-800", "#2C2C2C", "cards:1555-1556"),
    ("--color-gray-dark-900", "#1A1A1A", "cards:1555-1556"),
    ("--color-neutral-50", "#f9f9f9", "category-nav:19, 40, 88, 594, 603, 696, 717; header:8, 254, 309, 430, 452, 515, 564, 601, 660"),
    ("--color-neutral-200", "#f2f2f2", "header:601, 660"),
    ("--color-gray-border", "#ccc", "category-nav:20, 784; header:2067"),
    ("--color-gray-bg", "#f5f5f5", "category-nav:40, 594, 603, 696, 716; nav-pane:594, 603"),
    ("--color-text-dark", "#333333", "category-nav:142, 261, 451; form:55, 160"),
    ("--color-red-link", "#c00", "category-nav:304"),
    ("--color-tag-pale-yellow", "#fffbe6", "category-nav:436"),
    ("--color-tag-pale-cyan", "#ebffff", "category-nav:437"),
    ("--color-tag-pale-lavender", "#ffeffd", "category-nav:438"),
    ("--color-tag-pale-rose", "#ffcece", "category-nav:439"),
    ("--color-tag-pale-pink", "#ffe1ec", "category-nav:440"),
    ("--color-tag-pale-purple", "#f2e5ff", "category-nav:441"),
    ("--color-tag-pale-mint", "#eefff2", "category-nav:442"),
    ("--color-tag-pale-white", "#fff7f7", "category-nav:443"),
    ("--color-red-nav-fallback", "#922", "category-nav:620, 697"),
    ("--color-red-disabled", "#d99", "category-nav:717"),
    ("--color-red-slider", "#8a1515", "cc-hero-slider:124"),
    ("--color-yellow-cta", "#FFCB05", "footer:65"),
    ("--color-gray-footer", "#525252", "footer:68, 75; nav-pane:104, 139"),
    ("--color-red-footer-alt", "#9d1d27", "footer:333"),
    ("--color-red-footer-link", "#D23643", "footer:450, 458"),
    ("--color-red-form-primary", "#EC1C24", "form:60, 130-131"),
    ("--color-form-text", "#495057", "form:68, 76"),
    ("--color-form-muted", "#6c757d", "form:82, 149, 178"),
    ("--color-red-form-error", "#dc3545", "form:88"),
    ("--color-success-bg", "#155724", "form:106"),
    ("--color-success-light", "#d4edda", "form:107"),
    ("--color-success-border", "#c3e6cb", "form:108"),
    ("--color-error-dark", "#721c24", "form:112"),
    ("--color-error-light", "#f8d7da", "form:113"),
    ("--color-error-border", "#f5c6cb", "form:114"),
    ("--color-red-form-hover", "#d01920", "form:138-139"),
    ("--color-red-form-active", "#b81619", "form:144-145"),
    ("--color-border-form", "#ced4da", "form:162"),
    ("--color-input-bg", "#f8f9fa", "form:169"),
    ("--color-input-border", "#adb5bd", "form:170"),
    ("--color-text-primary", "#353535", "header:253, 313, 353, 450, 540, 1219, 1227, 1512, 1519, 1868, 1926, 2499, 2508, 2541, 2481, 2542; nav-pane:22-23, 50-51, 954"),
    ("--color-text-secondary", "#1a1a1a", "header:392"),
    ("--color-text-tertiary", "#686873", "header:527"),
    ("--color-red-header", "#981a1d", "header:1853"),
    ("--color-text-quaternary", "#3a3a3a", "header:2484"),
    ("--color-gray-mid-dark", "#666", "header:2216"),
    ("--color-red-badge", "#bd3e46", "header:2314, 2321"),
    ("--color-neutral-50-alt", "#fafafa", "header:2816"),
    ("--color-gray-border-dark", "#d9d9d9", "nav-pane:31"),
    ("--color-gray-panel", "#d8d8d8", "nav-pane:104, 116, 154, 276, 1024"),
    ("--color-gray-panel-alt", "#d0d0d0", "nav-pane:141"),
    ("--color-nav-bg", "#f3f3f3", "nav-pane:115-116, 159"),
    ("--color-text-muted-alt", "#787878", "nav-pane:1111"),
    ("--color-bg-subtle", "#f6f6f6", "nav-pane:673"),
    ("--color-text-blue-dark", "#1a1a5e", "hotspot:72, 122, 224"),
    ("--color-gray-icon", "#555", "hotspot:134, 139"),
    ("--color-gray-light", "#ddd", "link-to-upi:62"),
    ("--color-red-tint-bg", "#ebdfdf", "modal:543"),
    ("--color-red-border-dark", "#880e16", "modal:548"),
    ("--color-gray-input-bg", "#e6e6e6", "modal:565"),
    ("--color-gray-divider", "#c1c1c1", "modal:736"),
    ("--color-steps-track", "#e7e7e7", "steps:53-54, 187-188"),
    # rgb() opaque
    ("--color-text-muted", "rgb(58 58 58)", "category-nav:267"),
    ("--color-footer-red", "rgb(188, 59, 69)", "footer:28, 38"),
    ("--color-pewter-muted", "rgb(136 128 122)", "hero-heritage-cc:128"),
    ("--color-black-solid", "rgb(0 0 0)", "hotspot:103"),
    ("--color-shadow-gray-full", "rgb(137 137 137)", "cards:104"),
]

def value_to_rgb(v):
    v = v.strip()
    if v.startswith('#'):
        return parse_hex(v)
    m = re.match(r'rgb\s*\(\s*(\d+)\s*[, ]\s*(\d+)\s*[, ]\s*(\d+)', v, re.I)
    if m:
        return (int(m.group(1)), int(m.group(2)), int(m.group(3)))
    return None

def value_to_hex_canonical(v):
    rgb = value_to_rgb(v)
    if rgb:
        return rgb_to_hex(*rgb)
    return None

# Normalize so #333 and #333333 map to same hex
def normalize_hex(h):
    r, g, b = int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16)
    return rgb_to_hex(r, g, b)

def main():
    # Build unique colors by normalized hex (merge same RGB)
    unique = {}
    for token, value_str, locations in ENTRIES:
        rgb = value_to_rgb(value_str)
        if not rgb:
            continue
        h = rgb_to_hex(*rgb)
        lab = rgb_to_lab(*rgb)
        if h not in unique:
            unique[h] = (lab, [(token, value_str, locations)])
        else:
            unique[h][1].append((token, value_str, locations))

    # Pairwise Delta E and group (transitive: if A-B<=1 and B-C<=1 then A,B,C same group)
    hexes = list(unique.keys())
    n = len(hexes)
    # Union-find: group[i] = representative index
    parent = list(range(n))
    def find(i):
        if parent[i] != i:
            parent[i] = find(parent[i])
        return parent[i]
    def union(i, j):
        pi, pj = find(i), find(j)
        if pi != pj:
            parent[pi] = pj

    for i in range(n):
        for j in range(i + 1, n):
            if delta_e_76(unique[hexes[i]][0], unique[hexes[j]][0]) <= 1.0:
                union(i, j)

    # Collect groups
    groups = defaultdict(list)
    for i in range(n):
        r = find(i)
        h = hexes[i]
        lab, all_entries = unique[h]
        groups[r].append((h, lab, all_entries))

    # Sort groups by first hex for stable output
    group_list = []
    for rep, members in groups.items():
        group_list.append((min(m[0] for m in members), members))
    group_list.sort(key=lambda x: x[0])

    # Print Part 4 markdown
    print("## Part 4: Token groupings by perceptual similarity (Delta E ≤ 1)")
    print("")
    print("Colors are grouped so that within each category, every pair of color values has **Delta E (CIE76) ≤ 1** (perceptually nearly identical). One canonical value is chosen per group; use one token for the whole group and replace all listed locations.")
    print("")
    print("**Reference:** Delta E (ΔE) measures perceptual difference between two colors in LAB space. ΔE ≤ 1: not perceptible to the human eye.")
    print("")

    for idx, (_, members) in enumerate(group_list, 1):
        hexes_in_group = [m[0] for m in members]
        canonical = hexes_in_group[0]
        all_tokens = []
        all_locs = []
        for h, lab, entries in members:
            for token, value_str, locs in entries:
                all_tokens.append((token, value_str))
                all_locs.append(locs)
        locs_merged = "; ".join(all_locs)
        tokens_cell = ", ".join(f"`{t}`" for t, v in all_tokens[:6])
        if len(all_tokens) > 6:
            tokens_cell += f" (+{len(all_tokens)-6} more)"
        values_cell = ", ".join(f"`{h}`" for h in sorted(set(hexes_in_group)))
        print(f"### Group {idx} (ΔE ≤ 1)")
        print("")
        print("| Suggested token(s) | Canonical value | Values in group (ΔE ≤ 1) | Locations |")
        print("|--------------------|-----------------|---------------------------|-----------|")
        # Wrap long locs
        loc_short = locs_merged if len(locs_merged) <= 100 else locs_merged[:97] + "..."
        print(f"| {tokens_cell} | `{canonical}` | {values_cell} | {loc_short} |")
        print("")

if __name__ == "__main__":
    main()
