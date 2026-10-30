# There's nothing to read

A globe for people who want to wander into books.

Most shelves sort literature by what sold, or by a genre menu. This one sorts it by place. Spin the world, land on a country, and you get the novels, poetry, and memoirs that place is known for, with the genres that grew there still attached to the books. Psychological fiction in Russia, court literature in Japan, sagas in Iceland. You find the genre by arriving somewhere, not by filtering a catalog.

Live at [nothing.nebiyu.et](https://nothing.nebiyu.et).

## The idea

A list of countries asks you to already know where you want to go. A globe does not. You turn it, a place catches your eye, and you go in.

Once you are there, a grid of cards would turn the visit into shopping. The books are one field of covers instead. They share edges and melt into each other. The cover under your hand swells, and the ones around it give way, so you can actually see a book without the rest of the country disappearing. Click it and you get the author, the year, and why that book belongs to that place.

If you do not want to choose, press Space. On the globe it drops you on a random country. Inside a country it opens a random book. Escape always brings you back.

## Why it is built this way

The globe is drawn from a world map, not a menu of flags. Dragging it is the way you browse. Clicking a country keeps the world behind you and opens that country's books, so leaving is one step, not a new page.

The cover field is a weighted Voronoi drawn in WebGL. Each book is a cell. Moving the pointer raises that cell's weight, so its shape grows and its neighbors compress. The seam between two covers is a short blend, which is what makes them look melted rather than tiled. The field is an original shader. It is inspired by [nothing to watch](https://nothing-to-watch.port80.ch/), a gallery that lays film posters out the same way. That project's shaders are not used here.

Books without a usable cover are painted as jackets, with the title and author set on the cloth. A country should not look empty just because a cover file is missing.

The library itself lives in `public/data/geo-books.json`: a country, a short line about its literature, and a handful of books with genre, year, and a cover when one exists. Covers come from Open Library.

## Run it

```bash
pnpm install
pnpm dev
```

Then open [localhost:3000](http://localhost:3000).

| Key | What it does |
| --- | --- |
| Drag | Turn the globe |
| Click | Open a country, then a book |
| Space | A country you did not pick, or a book you did not pick |
| Arrows | Move across the covers |
| Enter | Open the cover you are on |
| Escape | Back to the books, then back to the globe |
