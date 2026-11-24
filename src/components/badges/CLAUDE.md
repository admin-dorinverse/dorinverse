# badges

Pieces of the Badges page (src/app/badges.tsx) and a badge's own page (src/app/badge/[id].tsx):
- `BadgeTile`: one badge, its medal (`common/BadgeMedal`, with its level number) and its name, faded when not earned.
- `BadgeDetail`: the middle of a badge's page: the big medal, the day it was earned and "You earned … by …!".
- `BadgeIcons`: the close cross and the share arrow at the top of a badge's page.
- `badgeShare.ts` / `badgeShare.native.ts`: shares an earned badge's words (the share sheet, or a copy in a browser).
