# Logix Design System v1.0

Source of truth for all pages. Every page must follow this system.

- `design-system.png` — Foundations & Components
- `homepage.png` — Homepage design (must be matched exactly)

Built on shadcn/ui conventions: semantic color tokens, 0.625rem base radius, Geist type.

## Color tokens
| Token | Hex |
|---|---|
| primary / foreground | `#0B1F3A` |
| brand / ring | `#1FC8AA` |
| brand-strong | `#0E9983` |
| accent | `#E6F9F5` |
| muted-foreground | `#5B6B84` |
| muted / secondary | `#F4F6FA` |
| border / input | `#E2E8F0` |
| destructive | `#E5484D` |

(Hex values are read from a low-res image; adjust in `src/app/globals.css` if inaccurate.)

## Typography (Geist)
| Style | Size / line-height · weight |
|---|---|
| h1 | 64/68 · 700 |
| h2 | 40/52 · 700 |
| h3 | 20/28 · 600 |
| h4 | 16/24 · 600 |
| lead | 16/28 · 400 |
| p | 14/24 · 400 |
| eyebrow | 12 · 500 · uppercase, wide tracking, brand-strong |

## Components
Button (default, brand, secondary, outline, ghost, link, sm/default/lg), Badge (default, secondary, outline, brand), Input, Card (default/service/inverted), Avatar.

Radius: base `0.625rem` (sm/md/lg/xl/full). Spacing: 4px base.

