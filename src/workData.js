// Work rooms for the league (work.html). Newest first: the first entry is the
// room you walk into from the town. See docs/adding-work-rooms.md.
//
// Fields
//   id       hash slug (work.html#allin) and text file name (content/work/allin.md)
//   company  toolbar label, plaque fallback, panel title (a `company:` line in
//            the .md header overrides the panel title)
//   logo     24×24 image drawn 1:1 on the plaque above the door
//   icon     96×96 image for the toolbar button
//            If either file is missing, the company initial is shown instead.
//            Originals live in assets/work/original/.
//
// The write-up is NOT here: role, dates, and text live in content/work/<id>.md
// and are fetched when the page loads (see content/work/README.md).
//
// Room art cycles room_1 → room_2 → room_3 → room_1 … by position, so a
// fourth role needs only a new entry here.

export const ROOMS = [
    {
        id: 'conquest',
        company: 'Conquest',
        logo: 'assets/work/conquest.webp',
        icon: 'assets/work/conquest_icon.webp'
    },
    {
        id: 'allin',
        company: 'All In Capital',
        logo: 'assets/work/allin.webp',
        icon: 'assets/work/allin_icon.webp'
    },
    {
        id: 'breathe',
        company: 'Breathe ESG',
        logo: 'assets/work/breathe.webp',
        icon: 'assets/work/breathe_icon.webp'
    }
];

export const roomArt = (index) => `assets/league/room_${(index % 3) + 1}.webp`;
