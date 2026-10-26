// Key figures for every item in data/nature.ts (shown in the Nature tab next to the short fact).
// countries = ISO codes from data/countries.json:
//   rivers: the countries it flows through or along; waters: the countries on its shore; mountains: where they lie.
// Numbers are the commonly quoted values (Wikipedia); lengths of rivers differ a bit between sources.
// [en, de] pairs for source / mouth / peak names.

export interface NatureFacts {
  countries: string[]
  lengthKm?: number
  areaKm2?: number
  depthM?: number // greatest depth
  peak?: { name: [string, string]; m: number } // highest mountain
  source?: [string, string]
  mouth?: [string, string]
  opened?: number // canals
}

const same = (s: string): [string, string] => [s, s]

export const NATURE_FACTS: Record<string, NatureFacts> = {
  // ---------------- Europe ----------------
  volga: { lengthKm: 3530, countries: ['RU'], source: ['Valdai Hills', 'Waldaihöhen'], mouth: ['Caspian Sea', 'Kaspisches Meer'] },
  danube: { lengthKm: 2850, countries: ['DE', 'AT', 'SK', 'HU', 'HR', 'RS', 'RO', 'BG', 'MD', 'UA'], source: ['Black Forest', 'Schwarzwald'], mouth: ['Black Sea', 'Schwarzes Meer'] },
  rhine: { lengthKm: 1230, countries: ['CH', 'LI', 'AT', 'DE', 'FR', 'NL'], source: ['Swiss Alps', 'Schweizer Alpen'], mouth: ['North Sea', 'Nordsee'] },
  elbe: { lengthKm: 1094, countries: ['CZ', 'DE'], source: ['Giant Mountains', 'Riesengebirge'], mouth: ['North Sea', 'Nordsee'] },
  dnieper: { lengthKm: 2200, countries: ['RU', 'BY', 'UA'], source: ['Valdai Hills', 'Waldaihöhen'], mouth: ['Black Sea', 'Schwarzes Meer'] },
  don: { lengthKm: 1870, countries: ['RU'], source: ['Central Russian Upland', 'Mittelrussische Platte'], mouth: ['Sea of Azov', 'Asowsches Meer'] },
  loire: { lengthKm: 1006, countries: ['FR'], source: ['Massif Central', 'Zentralmassiv'], mouth: ['Atlantic (Bay of Biscay)', 'Atlantik (Golf von Biskaya)'] },
  seine: { lengthKm: 777, countries: ['FR'], source: ['Langres Plateau (Burgundy)', 'Plateau von Langres (Burgund)'], mouth: ['English Channel', 'Ärmelkanal'] },
  rhone: { lengthKm: 812, countries: ['CH', 'FR'], source: ['Rhône Glacier', 'Rhonegletscher'], mouth: ['Mediterranean Sea', 'Mittelmeer'] },
  thames: { lengthKm: 346, countries: ['GB'], source: ['Cotswolds', 'Cotswolds'], mouth: ['North Sea', 'Nordsee'] },
  po: { lengthKm: 652, countries: ['IT'], source: ['Monte Viso (Alps)', 'Monte Viso (Alpen)'], mouth: ['Adriatic Sea', 'Adria'] },
  vistula: { lengthKm: 1047, countries: ['PL'], source: ['Beskids', 'Beskiden'], mouth: ['Baltic Sea', 'Ostsee'] },
  oder: { lengthKm: 840, countries: ['CZ', 'PL', 'DE'], source: ['Oder Mountains (Czech Republic)', 'Odergebirge (Tschechien)'], mouth: ['Baltic Sea (Szczecin Lagoon)', 'Ostsee (Stettiner Haff)'] },
  tagus: { lengthKm: 1007, countries: ['ES', 'PT'], source: ['Montes Universales (Spain)', 'Montes Universales (Spanien)'], mouth: ['Atlantic at Lisbon', 'Atlantik bei Lissabon'] },

  mediterranean: { areaKm2: 2_500_000, depthM: 5267, countries: ['ES', 'FR', 'MC', 'IT', 'MT', 'SI', 'HR', 'BA', 'ME', 'AL', 'GR', 'TR', 'CY', 'SY', 'LB', 'IL', 'PS', 'EG', 'LY', 'TN', 'DZ', 'MA'] },
  baltic: { areaKm2: 377_000, depthM: 459, countries: ['DK', 'DE', 'PL', 'RU', 'LT', 'LV', 'EE', 'FI', 'SE'] },
  northsea: { areaKm2: 570_000, depthM: 725, countries: ['GB', 'NO', 'DK', 'DE', 'NL', 'BE', 'FR'] },
  blacksea: { areaKm2: 436_400, depthM: 2212, countries: ['TR', 'BG', 'RO', 'UA', 'RU', 'GE'] },
  adriatic: { areaKm2: 138_600, depthM: 1233, countries: ['IT', 'SI', 'HR', 'BA', 'ME', 'AL'] },
  biscay: { areaKm2: 223_000, depthM: 4735, countries: ['FR', 'ES'] },
  channel: { lengthKm: 560, areaKm2: 75_000, depthM: 174, countries: ['GB', 'FR'] },
  ladoga: { areaKm2: 17_700, depthM: 230, countries: ['RU'] },
  geneva: { areaKm2: 580, depthM: 310, countries: ['CH', 'FR'] },
  constance: { areaKm2: 536, depthM: 251, countries: ['DE', 'AT', 'CH'] },
  balaton: { areaKm2: 592, depthM: 12, countries: ['HU'] },
  vanern: { areaKm2: 5650, depthM: 106, countries: ['SE'] },
  caspian: { areaKm2: 371_000, depthM: 1025, countries: ['RU', 'KZ', 'TM', 'IR', 'AZ'] },

  alps: { lengthKm: 1200, peak: { name: same('Mont Blanc'), m: 4806 }, countries: ['FR', 'MC', 'IT', 'CH', 'LI', 'DE', 'AT', 'SI'] },
  pyrenees: { lengthKm: 491, peak: { name: same('Aneto'), m: 3404 }, countries: ['FR', 'ES', 'AD'] },
  carpathians: { lengthKm: 1500, peak: { name: same('Gerlachovský štít'), m: 2655 }, countries: ['CZ', 'SK', 'PL', 'HU', 'UA', 'RO', 'RS'] },
  apennines: { lengthKm: 1200, peak: { name: same('Corno Grande'), m: 2912 }, countries: ['IT', 'SM'] },
  scandes: { lengthKm: 1700, peak: { name: same('Galdhøpiggen'), m: 2469 }, countries: ['NO', 'SE', 'FI'] },
  ural: { lengthKm: 2500, peak: { name: ['Mount Narodnaya', 'Narodnaja'], m: 1895 }, countries: ['RU', 'KZ'] },
  caucasus: { lengthKm: 1200, peak: { name: same('Elbrus'), m: 5642 }, countries: ['RU', 'GE', 'AZ', 'AM'] },
  balkan: { lengthKm: 560, peak: { name: same('Botev'), m: 2376 }, countries: ['BG', 'RS'] },
  dinaric: { lengthKm: 645, peak: { name: same('Maja Jezercë'), m: 2694 }, countries: ['SI', 'HR', 'BA', 'RS', 'ME', 'XK', 'AL'] },

  // ---------------- Asia ----------------
  yangtze: { lengthKm: 6300, countries: ['CN'], source: ['Tibetan Plateau', 'Hochland von Tibet'], mouth: ['East China Sea at Shanghai', 'Ostchinesisches Meer bei Shanghai'] },
  yellow: { lengthKm: 5464, countries: ['CN'], source: ['Bayan Har Mountains', 'Bayan-Har-Gebirge'], mouth: ['Bohai Sea', 'Bohai-Meer'] },
  mekong: { lengthKm: 4350, countries: ['CN', 'MM', 'LA', 'TH', 'KH', 'VN'], source: ['Tibetan Plateau', 'Hochland von Tibet'], mouth: ['South China Sea', 'Südchinesisches Meer'] },
  ganges: { lengthKm: 2525, countries: ['IN', 'BD'], source: ['Gangotri Glacier (Himalayas)', 'Gangotri-Gletscher (Himalaya)'], mouth: ['Bay of Bengal', 'Golf von Bengalen'] },
  indus: { lengthKm: 3180, countries: ['CN', 'IN', 'PK'], source: ['Tibet', 'Tibet'], mouth: ['Arabian Sea', 'Arabisches Meer'] },
  brahmaputra: { lengthKm: 2900, countries: ['CN', 'IN', 'BD'], source: ['Himalayas (Tibet)', 'Himalaya (Tibet)'], mouth: ['Bay of Bengal', 'Golf von Bengalen'] },
  euphrates: { lengthKm: 2800, countries: ['TR', 'SY', 'IQ'], source: ['Armenian Highlands (Turkey)', 'Armenisches Hochland (Türkei)'], mouth: ['Persian Gulf (Shatt al-Arab)', 'Persischer Golf (Schatt al-Arab)'] },
  tigris: { lengthKm: 1850, countries: ['TR', 'SY', 'IQ'], source: ['Taurus Mountains (Turkey)', 'Taurusgebirge (Türkei)'], mouth: ['Persian Gulf (Shatt al-Arab)', 'Persischer Golf (Schatt al-Arab)'] },
  jordan: { lengthKm: 251, countries: ['LB', 'SY', 'IL', 'JO', 'PS'], source: ['Mount Hermon', 'Hermon'], mouth: ['Dead Sea', 'Totes Meer'] },
  ob: { lengthKm: 3650, countries: ['RU'], source: ['Altai', 'Altai'], mouth: ['Kara Sea (Gulf of Ob)', 'Karasee (Obbusen)'] },
  yenisei: { lengthKm: 3487, countries: ['MN', 'RU'], source: ['Sayan Mountains / Mongolia', 'Sajangebirge / Mongolei'], mouth: ['Kara Sea', 'Karasee'] },
  lena: { lengthKm: 4400, countries: ['RU'], source: ['Baikal Mountains', 'Baikalgebirge'], mouth: ['Laptev Sea', 'Laptewsee'] },
  amur: { lengthKm: 2824, countries: ['RU', 'CN'], source: ['Where the Shilka and Argun meet', 'Zusammenfluss von Schilka und Argun'], mouth: ['Sea of Okhotsk', 'Ochotskisches Meer'] },
  irrawaddy: { lengthKm: 2170, countries: ['MM'], source: ['Northern Myanmar', 'Norden Myanmars'], mouth: ['Andaman Sea', 'Andamanensee'] },
  amudarya: { lengthKm: 2540, countries: ['AF', 'TJ', 'UZ', 'TM'], source: ['Pamir', 'Pamir'], mouth: ['Aral Sea (mostly dries up before)', 'Aralsee (versiegt meist vorher)'] },

  baikal: { areaKm2: 31_500, depthM: 1642, countries: ['RU'] },
  deadsea: { areaKm2: 605, depthM: 298, countries: ['IL', 'JO', 'PS'] },
  aral: { countries: ['KZ', 'UZ'] },
  persiangulf: { areaKm2: 251_000, depthM: 90, countries: ['IR', 'IQ', 'KW', 'SA', 'BH', 'QA', 'AE', 'OM'] },
  arabiansea: { areaKm2: 3_862_000, depthM: 4652, countries: ['IN', 'PK', 'IR', 'OM', 'YE', 'SO', 'MV'] },
  bengal: { areaKm2: 2_172_000, depthM: 4694, countries: ['IN', 'BD', 'MM', 'LK'] },
  southchinasea: { areaKm2: 3_500_000, depthM: 5016, countries: ['CN', 'TW', 'VN', 'KH', 'TH', 'MY', 'SG', 'ID', 'BN', 'PH'] },
  seaofjapan: { areaKm2: 978_000, depthM: 3742, countries: ['JP', 'KR', 'KP', 'RU'] },
  redsea: { areaKm2: 438_000, depthM: 3040, countries: ['EG', 'SD', 'ER', 'DJ', 'SA', 'YE', 'JO', 'IL'] },

  himalaya: { lengthKm: 2400, peak: { name: same('Mount Everest'), m: 8849 }, countries: ['IN', 'NP', 'BT', 'CN', 'PK'] },
  karakoram: { lengthKm: 500, peak: { name: same('K2'), m: 8611 }, countries: ['PK', 'IN', 'CN'] },
  hindukush: { lengthKm: 800, peak: { name: same('Tirich Mir'), m: 7708 }, countries: ['AF', 'PK'] },
  pamir: { peak: { name: same('Kongur Tagh'), m: 7649 }, countries: ['TJ', 'AF', 'CN', 'KG'] },
  tianshan: { lengthKm: 2500, peak: { name: same('Jengish Chokusu'), m: 7439 }, countries: ['CN', 'KG', 'KZ', 'UZ'] },
  altai: { lengthKm: 2000, peak: { name: ['Belukha', 'Belucha'], m: 4506 }, countries: ['RU', 'KZ', 'MN', 'CN'] },
  kunlun: { lengthKm: 3000, peak: { name: ['Kunlun Goddess', 'Kunlun-Göttin (Liushi Shan)'], m: 7167 }, countries: ['CN'] },
  zagros: { lengthKm: 1600, peak: { name: same('Dena'), m: 4409 }, countries: ['IR', 'IQ', 'TR'] },

  // ---------------- Africa ----------------
  nile: { lengthKm: 6650, countries: ['BI', 'RW', 'TZ', 'UG', 'SS', 'ET', 'SD', 'EG'], source: ['Lake Victoria / Kagera (Burundi, Rwanda)', 'Victoriasee / Kagera (Burundi, Ruanda)'], mouth: ['Mediterranean Sea (Nile Delta)', 'Mittelmeer (Nildelta)'] },
  congo: { lengthKm: 4700, countries: ['ZM', 'CD', 'CG', 'AO'], source: ['Chambeshi (Zambia)', 'Chambeshi (Sambia)'], mouth: ['Atlantic', 'Atlantik'] },
  niger: { lengthKm: 4180, countries: ['GN', 'ML', 'NE', 'BJ', 'NG'], source: ['Guinea Highlands', 'Guinea-Hochland'], mouth: ['Gulf of Guinea (Niger Delta)', 'Golf von Guinea (Nigerdelta)'] },
  zambezi: { lengthKm: 2574, countries: ['ZM', 'AO', 'NA', 'BW', 'ZW', 'MZ'], source: ['North-west Zambia', 'Nordwesten Sambias'], mouth: ['Indian Ocean', 'Indischer Ozean'] },
  orange: { lengthKm: 2200, countries: ['LS', 'ZA', 'NA'], source: ['Drakensberg (Lesotho)', 'Drakensberge (Lesotho)'], mouth: ['Atlantic', 'Atlantik'] },
  limpopo: { lengthKm: 1750, countries: ['ZA', 'BW', 'ZW', 'MZ'], source: ['South Africa', 'Südafrika'], mouth: ['Indian Ocean', 'Indischer Ozean'] },
  senegal: { lengthKm: 1086, countries: ['GN', 'ML', 'MR', 'SN'], source: ['Fouta Djallon (Guinea)', 'Fouta Djallon (Guinea)'], mouth: ['Atlantic at Saint-Louis', 'Atlantik bei Saint-Louis'] },
  okavango: { lengthKm: 1600, countries: ['AO', 'NA', 'BW'], source: ['Bié Plateau (Angola)', 'Hochland von Bié (Angola)'], mouth: ['Okavango Delta (Kalahari)', 'Okavangodelta (Kalahari)'] },
  volta: { lengthKm: 1500, countries: ['BF', 'GH'], source: ['Burkina Faso', 'Burkina Faso'], mouth: ['Gulf of Guinea', 'Golf von Guinea'] },

  victoria: { areaKm2: 59_947, depthM: 80, countries: ['UG', 'KE', 'TZ'] },
  tanganyika: { lengthKm: 673, areaKm2: 32_900, depthM: 1470, countries: ['TZ', 'CD', 'BI', 'ZM'] },
  malawi: { areaKm2: 29_600, depthM: 706, countries: ['MW', 'MZ', 'TZ'] },
  chad: { countries: ['TD', 'CM', 'NE', 'NG'] },
  turkana: { areaKm2: 6405, depthM: 109, countries: ['KE', 'ET'] },
  nasser: { areaKm2: 5250, depthM: 130, countries: ['EG', 'SD'] },
  guinea: { countries: ['LR', 'CI', 'GH', 'TG', 'BJ', 'NG', 'CM', 'GQ', 'GA', 'ST'] },
  mozambique: { lengthKm: 1600, countries: ['MZ', 'MG', 'KM'] },
  aden: { areaKm2: 410_000, countries: ['YE', 'SO', 'DJ'] },
  suez: { lengthKm: 193, opened: 1869, countries: ['EG'] },

  atlas: { lengthKm: 2500, peak: { name: same('Toubkal'), m: 4167 }, countries: ['MA', 'DZ', 'TN'] },
  ethiopian: { peak: { name: same('Ras Dashen'), m: 4550 }, countries: ['ET', 'ER'] },
  drakensberg: { lengthKm: 1000, peak: { name: same('Thabana Ntlenyana'), m: 3482 }, countries: ['ZA', 'LS'] },
  tibesti: { peak: { name: same('Emi Koussi'), m: 3415 }, countries: ['TD', 'LY'] },
  ahaggar: { peak: { name: same('Tahat'), m: 2908 }, countries: ['DZ'] },

  // ---------------- North America ----------------
  mississippi: { lengthKm: 3730, countries: ['US'], source: ['Lake Itasca (Minnesota)', 'Itascasee (Minnesota)'], mouth: ['Gulf of Mexico', 'Golf von Mexiko'] },
  missouri: { lengthKm: 3767, countries: ['US'], source: ['Rocky Mountains (Montana)', 'Rocky Mountains (Montana)'], mouth: ['Mississippi near St. Louis', 'Mississippi bei St. Louis'] },
  riogrande: { lengthKm: 3051, countries: ['US', 'MX'], source: ['San Juan Mountains (Colorado)', 'San Juan Mountains (Colorado)'], mouth: ['Gulf of Mexico', 'Golf von Mexiko'] },
  colorado: { lengthKm: 2330, countries: ['US', 'MX'], source: ['Rocky Mountains (Colorado)', 'Rocky Mountains (Colorado)'], mouth: ['Gulf of California (rarely reaches it)', 'Golf von Kalifornien (erreicht ihn kaum noch)'] },
  yukon: { lengthKm: 3190, countries: ['CA', 'US'], source: ['British Columbia', 'British Columbia'], mouth: ['Bering Sea', 'Beringmeer'] },
  mackenzie: { lengthKm: 4241, countries: ['CA'], source: ['Great Slave Lake', 'Großer Sklavensee'], mouth: ['Beaufort Sea', 'Beaufortsee'] },
  stlawrence: { lengthKm: 1197, countries: ['US', 'CA'], source: ['Lake Ontario', 'Ontariosee'], mouth: ['Gulf of St. Lawrence', 'Sankt-Lorenz-Golf'] },
  columbia: { lengthKm: 2000, countries: ['CA', 'US'], source: ['Columbia Lake (British Columbia)', 'Columbia Lake (British Columbia)'], mouth: ['Pacific Ocean', 'Pazifik'] },
  ohio: { lengthKm: 1579, countries: ['US'], source: ['Pittsburgh', 'Pittsburgh'], mouth: ['Mississippi', 'Mississippi'] },

  superior: { areaKm2: 82_100, depthM: 406, countries: ['US', 'CA'] },
  michigan: { areaKm2: 58_000, depthM: 281, countries: ['US'] },
  huron: { areaKm2: 59_600, depthM: 229, countries: ['US', 'CA'] },
  erie: { areaKm2: 25_700, depthM: 64, countries: ['US', 'CA'] },
  ontario: { areaKm2: 18_960, depthM: 244, countries: ['US', 'CA'] },
  greatbear: { areaKm2: 31_153, depthM: 446, countries: ['CA'] },
  greatslave: { areaKm2: 27_200, depthM: 614, countries: ['CA'] },
  greatsalt: { countries: ['US'] },
  nicaraguaLake: { areaKm2: 8264, depthM: 26, countries: ['NI'] },
  gulfofmexico: { areaKm2: 1_550_000, depthM: 4384, countries: ['US', 'MX', 'CU'] },
  caribbean: { areaKm2: 2_754_000, depthM: 7686, countries: ['MX', 'BZ', 'GT', 'HN', 'NI', 'CR', 'PA', 'CO', 'VE', 'CU', 'JM', 'HT', 'DO', 'AG', 'KN', 'DM', 'LC', 'VC', 'GD', 'TT'] },
  hudson: { areaKm2: 1_230_000, depthM: 270, countries: ['CA'] },
  gulfcalifornia: { areaKm2: 160_000, depthM: 3400, countries: ['MX'] },
  panama: { lengthKm: 82, opened: 1914, countries: ['PA'] },

  rockies: { lengthKm: 4800, peak: { name: same('Mount Elbert'), m: 4401 }, countries: ['CA', 'US'] },
  appalachians: { lengthKm: 2400, peak: { name: same('Mount Mitchell'), m: 2037 }, countries: ['US', 'CA'] },
  sierranevada: { lengthKm: 640, peak: { name: same('Mount Whitney'), m: 4421 }, countries: ['US'] },
  cascades: { lengthKm: 1100, peak: { name: same('Mount Rainier'), m: 4392 }, countries: ['US', 'CA'] },
  alaskarange: { lengthKm: 650, peak: { name: same('Denali'), m: 6190 }, countries: ['US'] },
  sierramadreocc: { lengthKm: 1250, countries: ['MX'] },
  sierramadreor: { lengthKm: 1000, countries: ['MX'] },

  // ---------------- South America ----------------
  amazon: { lengthKm: 6400, countries: ['PE', 'CO', 'BR'], source: ['Andes of Peru', 'Anden in Peru'], mouth: ['Atlantic', 'Atlantik'] },
  parana: { lengthKm: 4880, countries: ['BR', 'PY', 'AR'], source: ['Brazil (Paranaíba + Rio Grande)', 'Brasilien (Paranaíba + Rio Grande)'], mouth: ['Río de la Plata', 'Río de la Plata'] },
  orinoco: { lengthKm: 2140, countries: ['VE', 'CO'], source: ['Guiana Highlands', 'Bergland von Guayana'], mouth: ['Atlantic', 'Atlantik'] },
  saofrancisco: { lengthKm: 2914, countries: ['BR'], source: ['Serra da Canastra', 'Serra da Canastra'], mouth: ['Atlantic', 'Atlantik'] },
  uruguay: { lengthKm: 1838, countries: ['BR', 'AR', 'UY'], source: ['Serra Geral (Brazil)', 'Serra Geral (Brasilien)'], mouth: ['Río de la Plata', 'Río de la Plata'] },
  madeira: { lengthKm: 3250, countries: ['BO', 'BR'], source: ['Andes of Bolivia', 'Anden in Bolivien'], mouth: ['Amazon', 'Amazonas'] },
  rionegro: { lengthKm: 2250, countries: ['CO', 'VE', 'BR'], source: ['Colombia', 'Kolumbien'], mouth: ['Amazon at Manaus', 'Amazonas bei Manaus'] },
  magdalena: { lengthKm: 1528, countries: ['CO'], source: ['Andes of Colombia', 'Anden in Kolumbien'], mouth: ['Caribbean Sea', 'Karibisches Meer'] },

  titicaca: { areaKm2: 8372, depthM: 281, countries: ['PE', 'BO'] },
  plata: { lengthKm: 290, areaKm2: 35_000, countries: ['AR', 'UY'] },
  drake: { countries: ['CL', 'AR'] },

  andes: { lengthKm: 7000, peak: { name: same('Aconcagua'), m: 6961 }, countries: ['VE', 'CO', 'EC', 'PE', 'BO', 'CL', 'AR'] },
  brazilianhighlands: { peak: { name: same('Pico da Bandeira'), m: 2892 }, countries: ['BR'] },
  guiana: { peak: { name: same('Pico da Neblina'), m: 2995 }, countries: ['VE', 'GY', 'SR', 'BR'] },
  altiplano: { countries: ['PE', 'BO', 'CL', 'AR'] },

  // ---------------- Oceania ----------------
  murray: { lengthKm: 2508, countries: ['AU'], source: ['Australian Alps', 'Australische Alpen'], mouth: ['Southern Ocean (Lake Alexandrina)', 'Südlicher Ozean (Lake Alexandrina)'] },
  darling: { lengthKm: 1472, countries: ['AU'], source: ['Great Dividing Range', 'Great Dividing Range'], mouth: ['Murray', 'Murray'] },
  waikato: { lengthKm: 425, countries: ['NZ'], source: ['Lake Taupō', 'Taupōsee'], mouth: ['Tasman Sea', 'Tasmansee'] },
  fly: { lengthKm: 1050, countries: ['PG', 'ID'], source: ['Star Mountains', 'Star Mountains'], mouth: ['Gulf of Papua', 'Golf von Papua'] },
  sepik: { lengthKm: 1126, countries: ['PG', 'ID'], source: ['Central Range (New Guinea)', 'Zentralgebirge (Neuguinea)'], mouth: ['Bismarck Sea', 'Bismarcksee'] },

  coralsea: { areaKm2: 4_791_000, countries: ['AU', 'PG', 'SB', 'VU'] },
  reef: { lengthKm: 2300, areaKm2: 344_400, countries: ['AU'] },
  tasman: { areaKm2: 2_300_000, countries: ['AU', 'NZ'] },
  carpentaria: { areaKm2: 300_000, countries: ['AU'] },
  bight: { lengthKm: 1160, countries: ['AU'] },
  eyre: { areaKm2: 9500, countries: ['AU'] },
  taupo: { areaKm2: 616, depthM: 186, countries: ['NZ'] },

  greatdividing: { lengthKm: 3500, peak: { name: same('Mount Kosciuszko'), m: 2228 }, countries: ['AU'] },
  southernalps: { lengthKm: 500, peak: { name: same('Aoraki / Mount Cook'), m: 3724 }, countries: ['NZ'] },
  newguinea: { peak: { name: same('Puncak Jaya'), m: 4884 }, countries: ['ID', 'PG'] },
}
