# profile

Pieces of the Profile page (src/app/profile.tsx):
- `ProfileTop`: the big avatar and username, the Account pill with the square QR button beside it, the badges, and the Friends heading.
- `BadgeShelf`: the "BADGES ›" heading and one row of medals with no names, earned first. It opens the Badges page.
- `FriendCodeButton`: the small square glass button with a QR picture. It opens the friend card.
- `FriendCodeCard`: the friend card that pops up over the dimmed page: avatar, username, "Dorinverse", the QR code
  (or a calm square until the code is known), and the gold Share link button under it. One code per person, for good.
- `FriendRow`: a friend's row in the Friends list, and the message shown when the list is empty.
- `friendShare.ts` / `friendShare.native.ts`: sends the friend link (the share sheet, or a copy in a browser).
