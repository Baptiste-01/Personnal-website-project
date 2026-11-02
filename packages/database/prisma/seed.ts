import prisma from '../../../apps/api/lib/prisma'

const questions = [
  // ── Geographie - Facile ──
  { text: "Quelle est la capitale de la France ?", answer: "Paris", acceptedAnswers: ["paris"], hint: "Ville lumiere", category: "geographie", difficulty: "facile" },
  { text: "Quel est ce celebre monument de Paris ?", answer: "Tour Eiffel", acceptedAnswers: ["tour eiffel", "eiffel", "la tour eiffel"], hint: "Conçue par Gustave Eiffel en 1889", imageUrl: "https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?w=600&auto=format&fit=crop", category: "geographie", difficulty: "facile" },
  { text: "Dans quel pays se trouve cette merveille du monde ?", answer: "Inde", acceptedAnswers: ["inde", "l'inde", "india"], hint: "Il s'agit du Taj Mahal", imageUrl: "https://images.unsplash.com/photo-1564507592333-c60657eea523?w=600&auto=format&fit=crop", category: "geographie", difficulty: "facile" },
  { text: "Quel est le plus grand ocean du monde ?", answer: "Pacifique", acceptedAnswers: ["pacifique", "ocean pacifique", "l'ocean pacifique"], hint: "Entre l'Asie et l'Amerique", category: "geographie", difficulty: "facile" },
  { text: "Quel pays a pour capitale Tokyo ?", answer: "Japon", acceptedAnswers: ["japon", "le japon", "japan"], hint: "Pays insulaire d'Asie", category: "geographie", difficulty: "facile" },
  { text: "Quel est le plus long fleuve de France ?", answer: "Loire", acceptedAnswers: ["loire", "la loire"], hint: "Traverse le centre de la France", category: "geographie", difficulty: "facile" },
  { text: "Quelle est la capitale de l'Espagne ?", answer: "Madrid", acceptedAnswers: ["madrid"], hint: "Au centre de la peninsule iberique", category: "geographie", difficulty: "facile" },
  // ── Geographie - Moyen ──
  { text: "Dans quelle ville se situe ce monument antique ?", answer: "Rome", acceptedAnswers: ["rome", "roma"], hint: "Il s'agit du Colisée", imageUrl: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=600&auto=format&fit=crop", category: "geographie", difficulty: "moyen" },
  { text: "Quelle est la capitale de l'Australie ?", answer: "Canberra", acceptedAnswers: ["canberra"], hint: "Ce n'est pas Sydney", category: "geographie", difficulty: "moyen" },
  { text: "Quel est le plus petit pays du monde ?", answer: "Vatican", acceptedAnswers: ["vatican", "le vatican", "cite du vatican"], hint: "Enclave dans Rome", category: "geographie", difficulty: "moyen" },
  { text: "Quel fleuve traverse Le Caire ?", answer: "Nil", acceptedAnswers: ["nil", "le nil"], hint: "Le plus long fleuve d'Afrique", category: "geographie", difficulty: "moyen" },
  { text: "Quelle est la capitale du Canada ?", answer: "Ottawa", acceptedAnswers: ["ottawa"], hint: "Ce n'est ni Toronto ni Montreal", category: "geographie", difficulty: "moyen" },
  { text: "Dans quel pays se trouve le Machu Picchu ?", answer: "Perou", acceptedAnswers: ["perou", "le perou", "peru"], hint: "Amerique du Sud, civilisation inca", category: "geographie", difficulty: "moyen" },
  // ── Geographie - Difficile ──
  { text: "Quelle est la capitale de la Mongolie ?", answer: "Oulan-Bator", acceptedAnswers: ["oulan-bator", "oulan bator", "ulaanbaatar"], hint: "Pays entre la Russie et la Chine", category: "geographie", difficulty: "difficile" },
  { text: "Quel est le point culminant de l'Afrique ?", answer: "Kilimandjaro", acceptedAnswers: ["kilimandjaro", "kilimanjaro", "mont kilimandjaro"], hint: "En Tanzanie", category: "geographie", difficulty: "difficile" },
  { text: "Quelle est la capitale du Bhoutan ?", answer: "Thimphou", acceptedAnswers: ["thimphou", "thimphu"], hint: "Royaume himalayen", category: "geographie", difficulty: "difficile" },
  // ── Histoire - Facile ──
  { text: "Qui a peint ce célèbre chef-d'œuvre ?", answer: "Leonard de Vinci", acceptedAnswers: ["leonard de vinci", "da vinci", "vinci", "de vinci"], hint: "Exposé au musée du Louvre", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Mona_Lisa_%28Leonardo_da_Vinci%29.jpg/300px-Mona_Lisa_%28Leonardo_da_Vinci%29.jpg", category: "histoire", difficulty: "facile" },
  { text: "En quelle annee a debute la Revolution francaise ?", answer: "1789", acceptedAnswers: ["1789"], hint: "Prise de la Bastille", category: "histoire", difficulty: "facile" },
  { text: "Qui a decouvert l'Amerique en 1492 ?", answer: "Christophe Colomb", acceptedAnswers: ["christophe colomb", "colomb", "christoph colomb"], hint: "Navigateur genois", category: "histoire", difficulty: "facile" },
  { text: "Quel roi de France etait surnomme le Roi-Soleil ?", answer: "Louis XIV", acceptedAnswers: ["louis xiv", "louis 14"], hint: "Chateau de Versailles", category: "histoire", difficulty: "facile" },
  { text: "En quelle annee a pris fin la Seconde Guerre mondiale ?", answer: "1945", acceptedAnswers: ["1945"], hint: "Capitulation de l'Allemagne et du Japon", category: "histoire", difficulty: "facile" },
  { text: "Qui a ete le premier president des Etats-Unis ?", answer: "George Washington", acceptedAnswers: ["george washington", "washington"], hint: "Son visage est sur le billet d'un dollar", category: "histoire", difficulty: "facile" },
  // ── Histoire - Moyen ──
  { text: "En quelle annee le mur de Berlin est-il tombe ?", answer: "1989", acceptedAnswers: ["1989"], hint: "Fin de la guerre froide", category: "histoire", difficulty: "moyen" },
  { text: "Quel empire Genghis Khan a-t-il fonde ?", answer: "Empire mongol", acceptedAnswers: ["empire mongol", "mongol"], hint: "Le plus grand empire terrestre", category: "histoire", difficulty: "moyen" },
  { text: "Qui a peint le plafond de la chapelle Sixtine ?", answer: "Michel-Ange", acceptedAnswers: ["michel-ange", "michel ange", "michelangelo"], hint: "Artiste de la Renaissance italienne", category: "histoire", difficulty: "moyen" },
  // ── Histoire - Difficile ──
  { text: "En quelle annee Gutenberg a-t-il invente l'imprimerie ?", answer: "1440", acceptedAnswers: ["1440", "vers 1440"], hint: "XVe siecle, Allemagne", category: "histoire", difficulty: "difficile" },
  { text: "Quel traite a mis fin a la Premiere Guerre mondiale ?", answer: "Traite de Versailles", acceptedAnswers: ["traite de versailles", "versailles"], hint: "Signe en 1919", category: "histoire", difficulty: "difficile" },
  // ── Sciences - Facile ──
  { text: "Quelle est cette planète aux spectaculaires anneaux ?", answer: "Saturne", acceptedAnswers: ["saturne", "saturn"], hint: "Sixième planète du système solaire", imageUrl: "https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=600&auto=format&fit=crop", category: "sciences", difficulty: "facile" },
  { text: "Quel est le symbole chimique de l'eau ?", answer: "H2O", acceptedAnswers: ["h2o"], hint: "Deux elements", category: "sciences", difficulty: "facile" },
  { text: "Combien de planetes composent le systeme solaire ?", answer: "8", acceptedAnswers: ["8", "huit"], hint: "Pluton n'en fait plus partie", category: "sciences", difficulty: "facile" },
  { text: "Quel gaz les plantes absorbent-elles ?", answer: "CO2", acceptedAnswers: ["co2", "dioxyde de carbone", "gaz carbonique"], hint: "Effet de serre", category: "sciences", difficulty: "facile" },
  { text: "Quelle planete est surnommee la planete rouge ?", answer: "Mars", acceptedAnswers: ["mars"], hint: "Quatrieme planete du systeme solaire", category: "sciences", difficulty: "facile" },
  // ── Sciences - Moyen ──
  { text: "Quel est le plus grand organe du corps humain ?", answer: "Peau", acceptedAnswers: ["peau", "la peau"], hint: "Il recouvre tout le corps", category: "sciences", difficulty: "moyen" },
  { text: "Qui a formule la theorie de la relativite ?", answer: "Einstein", acceptedAnswers: ["einstein", "albert einstein"], hint: "E=mc2", category: "sciences", difficulty: "moyen" },
  { text: "Quel element chimique a pour symbole Fe ?", answer: "Fer", acceptedAnswers: ["fer", "le fer"], hint: "Metal magnetique", category: "sciences", difficulty: "moyen" },
  // ── Sciences - Difficile ──
  { text: "Quel est le nombre d'Avogadro ?", answer: "6.022 x 10^23", acceptedAnswers: ["6.022e23", "6,022 x 10^23", "6.022 x 10^23"], hint: "Nombre d'entites dans une mole", category: "sciences", difficulty: "difficile" },
  // ── Cinema - Facile ──
  { text: "Quel personnage dit 'Je suis ton pere' ?", answer: "Dark Vador", acceptedAnswers: ["dark vador", "darth vader", "vador"], hint: "Star Wars", category: "cinema", difficulty: "facile" },
  { text: "Quel film d'animation met en scene un poisson-clown perdu ?", answer: "Le Monde de Nemo", acceptedAnswers: ["le monde de nemo", "nemo", "finding nemo"], hint: "Film Pixar", category: "cinema", difficulty: "facile" },
  { text: "Quel acteur incarne Jack Sparrow ?", answer: "Johnny Depp", acceptedAnswers: ["johnny depp", "depp"], hint: "Pirates des Caraibes", category: "cinema", difficulty: "facile" },
  { text: "Dans quel film peut-on entendre 'Hakuna Matata' ?", answer: "Le Roi Lion", acceptedAnswers: ["le roi lion", "roi lion", "the lion king"], hint: "Film Disney avec Simba", category: "cinema", difficulty: "facile" },
  // ── Cinema - Moyen ──
  { text: "Quel realisateur a cree Inception et Interstellar ?", answer: "Christopher Nolan", acceptedAnswers: ["christopher nolan", "nolan"], hint: "Realisateur britannique", category: "cinema", difficulty: "moyen" },
  { text: "Dans quel film voit-on un anneau magique a detruire ?", answer: "Le Seigneur des Anneaux", acceptedAnswers: ["le seigneur des anneaux", "seigneur des anneaux", "lord of the rings"], hint: "Adapte de Tolkien", category: "cinema", difficulty: "moyen" },
  // ── Cinema - Difficile ──
  { text: "Quel film a remporte la Palme d'or a Cannes en 2019 ?", answer: "Parasite", acceptedAnswers: ["parasite"], hint: "Film sud-coreen de Bong Joon-ho", category: "cinema", difficulty: "difficile" },
  // ── Musique - Facile ──
  { text: "Quel groupe a chante 'Bohemian Rhapsody' ?", answer: "Queen", acceptedAnswers: ["queen"], hint: "Freddie Mercury", category: "musique", difficulty: "facile" },
  { text: "Quel chanteur francais a interprete 'Je t'aime' avec Jane Birkin ?", answer: "Serge Gainsbourg", acceptedAnswers: ["serge gainsbourg", "gainsbourg"], hint: "Auteur-compositeur provocateur", category: "musique", difficulty: "facile" },
  { text: "Quel instrument a 88 touches ?", answer: "Piano", acceptedAnswers: ["piano", "le piano"], hint: "Touches noires et blanches", category: "musique", difficulty: "facile" },
  // ── Musique - Moyen ──
  { text: "Quel compositeur est devenu sourd et a continue a composer ?", answer: "Beethoven", acceptedAnswers: ["beethoven", "ludwig van beethoven"], hint: "Symphonie n5", category: "musique", difficulty: "moyen" },
  { text: "De quel pays vient le genre musical reggae ?", answer: "Jamaique", acceptedAnswers: ["jamaique", "la jamaique", "jamaica"], hint: "Bob Marley", category: "musique", difficulty: "moyen" },
  // ── Musique - Difficile ──
  { text: "Quel rappeur francais a sorti l'album 'Civilisation' ?", answer: "Orelsan", acceptedAnswers: ["orelsan"], hint: "Rappeur de Caen", category: "musique", difficulty: "difficile" },
  // ── Sport - Facile ──
  { text: "Combien de joueurs composent une equipe de football ?", answer: "11", acceptedAnswers: ["11", "onze"], hint: "Sur le terrain", category: "sport", difficulty: "facile" },
  { text: "Dans quel sport utilise-t-on un volant ?", answer: "Badminton", acceptedAnswers: ["badminton", "le badminton"], hint: "Raquette et filet", category: "sport", difficulty: "facile" },
  { text: "Quel pays a remporte la Coupe du monde 2018 ?", answer: "France", acceptedAnswers: ["france", "la france"], hint: "Equipe de Deschamps", category: "sport", difficulty: "facile" },
  // ── Sport - Moyen ──
  { text: "En quelle annee les premiers Jeux olympiques modernes ont-ils eu lieu ?", answer: "1896", acceptedAnswers: ["1896"], hint: "A Athenes", category: "sport", difficulty: "moyen" },
  { text: "Quel tennisman detient le plus de titres du Grand Chelem masculin ?", answer: "Novak Djokovic", acceptedAnswers: ["djokovic", "novak djokovic"], hint: "Joueur serbe", category: "sport", difficulty: "moyen" },
  // ── Sport - Difficile ──
  { text: "Quel est le record du monde du 100m masculin ?", answer: "9.58", acceptedAnswers: ["9.58", "9,58", "9.58 secondes"], hint: "Usain Bolt, 2009", category: "sport", difficulty: "difficile" },
  // ── Litterature - Facile ──
  { text: "Qui a ecrit 'Les Miserables' ?", answer: "Victor Hugo", acceptedAnswers: ["victor hugo", "hugo"], hint: "Ecrivain francais du XIXe siecle", category: "litterature", difficulty: "facile" },
  { text: "Quel est le prenom du Petit Prince de Saint-Exupery ?", answer: "Le Petit Prince", acceptedAnswers: ["le petit prince", "petit prince"], hint: "Il n'a pas de prenom specifique", category: "litterature", difficulty: "facile" },
  { text: "Qui a ecrit les fables 'Le Corbeau et le Renard' ?", answer: "La Fontaine", acceptedAnswers: ["la fontaine", "jean de la fontaine"], hint: "Fabuliste du XVIIe siecle", category: "litterature", difficulty: "facile" },
  // ── Litterature - Moyen ──
  { text: "Quel auteur a cree Sherlock Holmes ?", answer: "Arthur Conan Doyle", acceptedAnswers: ["conan doyle", "arthur conan doyle"], hint: "Auteur britannique", category: "litterature", difficulty: "moyen" },
  { text: "Dans quel roman trouve-t-on le personnage de Meursault ?", answer: "L'Etranger", acceptedAnswers: ["l'etranger", "letranger", "l etranger"], hint: "Albert Camus", category: "litterature", difficulty: "moyen" },
  // ── Litterature - Difficile ──
  { text: "Quel prix Nobel de litterature Camus a-t-il recu, en quelle annee ?", answer: "1957", acceptedAnswers: ["1957"], hint: "Il avait 44 ans", category: "litterature", difficulty: "difficile" },
  // ── Gastronomie - Facile ──
  { text: "Quel est le nom de ce plat traditionnel japonais ?", answer: "Sushi", acceptedAnswers: ["sushi", "sushis"], hint: "Riz vinaigré et poisson cru", imageUrl: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=600&auto=format&fit=crop", category: "gastronomie", difficulty: "facile" },
  { text: "De quel pays vient la pizza ?", answer: "Italie", acceptedAnswers: ["italie", "l'italie", "italy"], hint: "Pays en forme de botte", category: "gastronomie", difficulty: "facile" },
  { text: "Quel fromage est utilise dans la raclette ?", answer: "Raclette", acceptedAnswers: ["raclette", "fromage a raclette"], hint: "Du meme nom que le plat", category: "gastronomie", difficulty: "facile" },
  { text: "De quel pays vient le sushi ?", answer: "Japon", acceptedAnswers: ["japon", "le japon", "japan"], hint: "Riz vinaigre et poisson cru", category: "gastronomie", difficulty: "facile" },
  // ── Gastronomie - Moyen ──
  { text: "Quel est l'ingredient principal du guacamole ?", answer: "Avocat", acceptedAnswers: ["avocat", "l'avocat"], hint: "Fruit vert originaire du Mexique", category: "gastronomie", difficulty: "moyen" },
  { text: "Quelle epice donne sa couleur jaune au curry ?", answer: "Curcuma", acceptedAnswers: ["curcuma", "le curcuma"], hint: "Aussi appelee 'safran des Indes'", category: "gastronomie", difficulty: "moyen" },
  // ── Gastronomie - Difficile ──
  { text: "Quel chef francais est considere comme le fondateur de la haute cuisine ?", answer: "Auguste Escoffier", acceptedAnswers: ["escoffier", "auguste escoffier"], hint: "XIXe siecle, a modernise la brigade de cuisine", category: "gastronomie", difficulty: "difficile" },
]

async function main() {
  console.log('Seeding Smik Party database...')

  // Clear existing questions
  await prisma.question.deleteMany()
  console.log('Cleared existing questions.')

  // Insert all questions
  const result = await prisma.question.createMany({ data: questions })
  console.log(`Inserted ${result.count} questions.`)

  // Create a default arena
  await prisma.arena.deleteMany()
  await prisma.arena.create({
    data: {
      name: 'Arene Principale',
      players: 0,
      maxPlayers: 20,
      status: 'waiting',
      gameMode: 'flashguess',
      difficulty: 'facile',
      categories: ['geographie', 'histoire', 'sciences', 'cinema', 'musique'],
    }
  })
  console.log('Created default arena.')

  console.log('Seed completed!')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
