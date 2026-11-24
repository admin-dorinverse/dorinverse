# profile

Pieces of the Profile page (src/app/profile.tsx):
- `ProfileTop`: the big avatar and username, the Account pill with the square QR button beside it, the badges, and the Friends heading.
- `BadgeShelf`: the Badges heading (how many earned) and every badge in its group, as a medal with its name.
- `BadgeMedal`: a badge's placeholder picture, an emoji on a round medal, gold when earned and faded when not.
- `BadgeCard`: the card that slides up when a badge is tapped: its big medal, earned or not, and how to earn it.
- `FriendCodeButton`: the small square glass button with a QR picture. It opens the friend card.
- `FriendCodeCard`: the friend card that pops up over the dimmed page: avatar, username, "Dorinverse", the QR code
  (or a calm square until the code is known), and the gold Share link button under it. One code per person, for good.
- `FriendRow`: a friend's row in the Friends list, and the message shown when the list is empty.
- `friendShare.ts` / `friendShare.native.ts`: sends the friend link (the share sheet, or a copy in a browser).
