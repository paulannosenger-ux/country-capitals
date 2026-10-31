// The 8 planets of the solar system, for the Space tab (learn to recognise and name them).
// Figures from NASA's planetary fact sheets (https://nssdc.gsfc.nasa.gov/planetary/factsheet/); moon counts as of 2025.
// Textures: scripts/fetch-planets.ts -> public/planets/<id>.jpg

export type PlanetKind = 'rocky' | 'gas' | 'ice'

export interface Planet {
  id: string
  en: string
  de: string
  /** other accepted answers */
  aliases?: string[]
  /** 1 = closest to the Sun */
  order: number
  kind: PlanetKind
  diameterKm: number
  /** average distance from the Sun, million km */
  distanceMkm: number
  /** one turn around itself ("day"), as text */
  day: [string, string]
  /** one trip around the Sun ("year"), as text */
  year: [string, string]
  moons: number
  /** tilt of the axis in degrees (Uranus lies on its side, Venus is upside down) */
  tilt: number
  /** how fast it turns in the 3D view (relative; Jupiter fastest) */
  spin: number
  fact: { en: string; de: string }
  /** file name of the Solar System Scope texture */
  texture: string
}

export const PLANETS: Planet[] = [
  {
    id: 'mercury', en: 'Mercury', de: 'Merkur', aliases: ['Merkury'], order: 1, kind: 'rocky', diameterKm: 4879, distanceMkm: 57.9,
    day: ['59 Earth days', '59 Erdtage'], year: ['88 days', '88 Tage'], moons: 0, tilt: 0, spin: 0.5,
    fact: {
      en: 'The smallest planet and the closest to the Sun. Without an atmosphere to hold the heat it is 430 °C by day and −180 °C at night. Its grey surface is covered in craters, like the Moon.',
      de: 'Der kleinste Planet und der sonnennächste. Ohne Atmosphäre, die Wärme hält, ist es tagsüber 430 °C heiß und nachts −180 °C kalt. Seine graue Oberfläche ist voller Krater, ähnlich wie der Mond.',
    },
    texture: '2k_mercury.jpg',
  },
  {
    id: 'venus', en: 'Venus', de: 'Venus', order: 2, kind: 'rocky', diameterKm: 12104, distanceMkm: 108.2,
    day: ['243 Earth days (backwards)', '243 Erdtage (rückwärts)'], year: ['225 days', '225 Tage'], moons: 0, tilt: 177, spin: 0.2,
    fact: {
      en: 'The hottest planet (about 465 °C), even though Mercury is closer to the Sun: thick yellowish clouds of carbon dioxide trap the heat. It spins backwards, and so slowly that its day is longer than its year.',
      de: 'Der heißeste Planet (rund 465 °C), obwohl Merkur näher an der Sonne ist: dicke gelbliche Wolken aus Kohlendioxid halten die Hitze fest. Sie dreht sich rückwärts und so langsam, dass ihr Tag länger ist als ihr Jahr.',
    },
    texture: '2k_venus_atmosphere.jpg',
  },
  {
    id: 'earth', en: 'Earth', de: 'Erde', aliases: ['The Earth', 'Die Erde'], order: 3, kind: 'rocky', diameterKm: 12742, distanceMkm: 149.6,
    day: ['24 hours', '24 Stunden'], year: ['365 days', '365 Tage'], moons: 1, tilt: 23.4, spin: 1,
    fact: {
      en: 'Our home, the only planet known to have life. 71 % of its surface is covered by water, which makes it look blue from space.',
      de: 'Unsere Heimat und der einzige Planet, auf dem man Leben kennt. 71 % der Oberfläche sind mit Wasser bedeckt, deshalb sieht sie aus dem All blau aus.',
    },
    texture: '2k_earth_daymap.jpg',
  },
  {
    id: 'mars', en: 'Mars', de: 'Mars', order: 4, kind: 'rocky', diameterKm: 6779, distanceMkm: 227.9,
    day: ['24 h 37 min', '24 Std. 37 Min.'], year: ['687 days', '687 Tage'], moons: 2, tilt: 25.2, spin: 1,
    fact: {
      en: 'The "red planet": its dust is full of rust (iron oxide). It has the biggest volcano in the solar system, Olympus Mons, almost three times as high as Mount Everest, and two tiny moons, Phobos and Deimos.',
      de: 'Der „rote Planet“: sein Staub ist voller Rost (Eisenoxid). Er hat den größten Vulkan im Sonnensystem, den Olympus Mons, fast dreimal so hoch wie der Mount Everest, und zwei winzige Monde, Phobos und Deimos.',
    },
    texture: '2k_mars.jpg',
  },
  {
    id: 'jupiter', en: 'Jupiter', de: 'Jupiter', order: 5, kind: 'gas', diameterKm: 139820, distanceMkm: 778.5,
    day: ['9 h 56 min', '9 Std. 56 Min.'], year: ['12 years', '12 Jahre'], moons: 95, tilt: 3.1, spin: 2.2,
    fact: {
      en: 'The biggest planet: all the others would fit inside it. It is a giant ball of gas with coloured stripes; the Great Red Spot is a storm wider than the Earth that has been raging for hundreds of years.',
      de: 'Der größte Planet: alle anderen würden zusammen in ihn hineinpassen. Er ist eine riesige Gaskugel mit bunten Streifen; der Große Rote Fleck ist ein Sturm, breiter als die Erde, der seit Hunderten von Jahren tobt.',
    },
    texture: '2k_jupiter.jpg',
  },
  {
    id: 'saturn', en: 'Saturn', de: 'Saturn', order: 6, kind: 'gas', diameterKm: 116460, distanceMkm: 1432,
    day: ['10 h 33 min', '10 Std. 33 Min.'], year: ['29 years', '29 Jahre'], moons: 146, tilt: 26.7, spin: 2,
    fact: {
      en: 'Famous for its rings of ice and rock, 280 000 km wide but often less than 1 km thick. It is so light that it would float in a (very big) bathtub, and it has more known moons than any other planet.',
      de: 'Berühmt für seine Ringe aus Eis und Gestein: 280 000 km breit, aber oft keinen Kilometer dick. Er ist so leicht, dass er in einer (sehr großen) Badewanne schwimmen würde, und hat mehr bekannte Monde als jeder andere Planet.',
    },
    texture: '2k_saturn.jpg',
  },
  {
    id: 'uranus', en: 'Uranus', de: 'Uranus', order: 7, kind: 'ice', diameterKm: 50724, distanceMkm: 2867,
    day: ['17 h 14 min', '17 Std. 14 Min.'], year: ['84 years', '84 Jahre'], moons: 28, tilt: 97.8, spin: 1.4,
    fact: {
      en: 'An ice giant that lies on its side: its axis is tilted by 98°, so it rolls around the Sun like a ball. Methane gas gives it its pale blue-green colour.',
      de: 'Ein Eisriese, der auf der Seite liegt: seine Achse ist um 98° gekippt, er rollt also wie ein Ball um die Sonne. Methangas gibt ihm seine blassblau-grüne Farbe.',
    },
    texture: '2k_uranus.jpg',
  },
  {
    id: 'neptune', en: 'Neptune', de: 'Neptun', order: 8, kind: 'ice', diameterKm: 49244, distanceMkm: 4515,
    day: ['16 h 6 min', '16 Std. 6 Min.'], year: ['165 years', '165 Jahre'], moons: 16, tilt: 28.3, spin: 1.4,
    fact: {
      en: 'The planet farthest from the Sun, deep blue and icy cold (−200 °C). It has the fastest winds in the solar system, up to 2 100 km/h. It was found in 1846 by calculation, before anyone had seen it.',
      de: 'Der sonnenfernste Planet, tiefblau und eiskalt (−200 °C). Hier wehen die stärksten Winde im Sonnensystem, bis zu 2 100 km/h. Er wurde 1846 erst berechnet und dann gefunden.',
    },
    texture: '2k_neptune.jpg',
  },
]
