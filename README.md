# IPL Mock Auction — React App

## Run
```bash
npm install
npm run dev
```
Open the Vite URL shown in the terminal.

## Player photos
Put photos in `public/players/` using the exact serial number from the dataset:
`1.jpg`, `2.jpg`, ... `214.jpg`.

## Included
- 214-player dataset from the supplied specification
- Randomized phase order: capped BAT → BOWL → WK → ALL → UC
- Manual bid + team assignment
- SOLD / UNSOLD flow
- Unsold re-auction
- ₹100 Cr purse tracking
- 15-player max and 4-overseas max enforcement
- Squad validation against minimum composition
- Playing XI selection
- Captain / vice-captain multipliers
- Hidden credits during auction
- Final Top 3 calculation with purse tie-break
- LocalStorage persistence
- Responsive UI

## Team logos

Place team logos in `public/teams/` using either of these naming conventions:

- `CSK.webp` or `CSK.svg`
- `DC.webp` or `DC.svg`
- `GT.webp` or `GT.svg`
- `KKR.webp` or `KKR.svg`
- `LSG.webp` or `LSG.svg`
- `MI.webp` or `MI.svg`
- `PBKS.webp` or `PBKS.svg`
- `RR.webp` or `RR.svg`
- `RCB.webp` or `RCB.svg`
- `SRH.webp` or `SRH.svg`

The app tries WebP first and SVG second. It also accepts the same files under `public/team-logos/` as a fallback.

When a player is sold, the selected team's logo is shown in a short SOLD celebration animation. Team logos are also displayed in the team-management cards, team strip, and final Top 3 results.


### Auction Log
The auction log is a fixed-height, independently scrollable box. The complete auction history is retained without increasing the page height.
