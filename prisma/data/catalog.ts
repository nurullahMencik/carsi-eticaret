/**
 * Sample catalogue for the Çarşı demo store.
 * Prices are in kuruş and include VAT. Stock values are per variant.
 */

export type CatalogCategory = {
  slug: string;
  nameTr: string;
  nameEn: string;
  descriptionTr: string;
  descriptionEn: string;
};

export type CatalogVariant = {
  colorTr?: string;
  colorEn?: string;
  colorHex?: string;
  size?: string;
  priceDelta?: number;
  stock: number;
};

export type CatalogProduct = {
  slug: string;
  category: string;
  nameTr: string;
  nameEn: string;
  shortTr: string;
  shortEn: string;
  descTr: string;
  descEn: string;
  price: number;
  compareAt?: number;
  featured?: boolean;
  variants: CatalogVariant[];
};

export const categories: CatalogCategory[] = [
  {
    slug: "seramik",
    nameTr: "Seramik Sofra",
    nameEn: "Ceramic Tableware",
    descriptionTr: "Tornada şekillenen, gıdaya uygun sırla yüksek ısıda pişirilen kupalar, tabaklar ve kaseler.",
    descriptionEn: "Wheel-thrown mugs, plates and bowls, fired at high temperature with food-safe glazes.",
  },
  {
    slug: "cini",
    nameTr: "Çini & Dekoratif",
    nameEn: "Tiles & Decorative",
    descriptionTr: "İznik ve Kütahya geleneğinden beslenen, fırça ile tek tek boyanmış çini tabaklar, karolar ve vazolar.",
    descriptionEn: "Hand-painted plates, tiles and vases rooted in the İznik and Kütahya traditions.",
  },
  {
    slug: "tekstil",
    nameTr: "Ev Tekstili",
    nameEn: "Home Textiles",
    descriptionTr: "Pamuk ve keten peştemaller, el tezgâhında dokunan örtüler ve yastık kılıfları.",
    descriptionEn: "Cotton and linen peshtemals, hand-loomed table linen and cushion covers.",
  },
  {
    slug: "kilim",
    nameTr: "Kilim & Halı",
    nameEn: "Kilims & Rugs",
    descriptionTr: "Anadolu'nun farklı yörelerinden yün kilimler, yolluklar ve kilim minderler.",
    descriptionEn: "Wool kilims, runners and floor cushions from different regions of Anatolia.",
  },
  {
    slug: "aydinlatma",
    nameTr: "Aydınlatma",
    nameEn: "Lighting",
    descriptionTr: "Mozaik cam lambalar, dövme bakır sarkıtlar ve doğal lifli abajurlar.",
    descriptionEn: "Mosaic glass lamps, hammered copper pendants and natural-fibre shades.",
  },
  {
    slug: "bakir-ahsap",
    nameTr: "Bakır & Ahşap",
    nameEn: "Copper & Wood",
    descriptionTr: "Kalaylı bakır mutfak gereçleri, zeytin ve ceviz ağacından servis parçaları.",
    descriptionEn: "Tin-lined copper cookware and serving pieces in olive and walnut wood.",
  },
];

const navy = { colorTr: "Gece Mavisi", colorEn: "Midnight Blue", colorHex: "#25365c" };
const sand = { colorTr: "Kum Beji", colorEn: "Sand", colorHex: "#d9c4a3" };
const sage = { colorTr: "Adaçayı", colorEn: "Sage", colorHex: "#8ea486" };
const cream = { colorTr: "Krem", colorEn: "Cream", colorHex: "#efe6d4" };
const terracotta = { colorTr: "Kiremit", colorEn: "Terracotta", colorHex: "#b4532a" };
const mustard = { colorTr: "Hardal", colorEn: "Mustard", colorHex: "#c9962b" };
const olive = { colorTr: "Zeytin", colorEn: "Olive", colorHex: "#6b6b3a" };
const indigo = { colorTr: "Çivit", colorEn: "Indigo", colorHex: "#2f3f73" };
const natural = { colorTr: "Doğal", colorEn: "Natural", colorHex: "#e3d7c1" };
const turquoise = { colorTr: "Turkuaz", colorEn: "Turquoise", colorHex: "#2a9d9b" };
const ruby = { colorTr: "Yakut", colorEn: "Ruby", colorHex: "#9b2335" };
const multi = { colorTr: "Çok Renkli", colorEn: "Multicolour", colorHex: "#c46a3a" };

export const products: CatalogProduct[] = [
  // ---------------------------------------------------------------- Seramik
  {
    slug: "sirli-el-yapimi-kupa",
    category: "seramik",
    nameTr: "Sırlı El Yapımı Kupa",
    nameEn: "Hand-glazed Stoneware Mug",
    shortTr: "Tornada şekillenmiş, 350 ml, bulaşık makinesine uygun.",
    shortEn: "Wheel-thrown, 350 ml, dishwasher safe.",
    descTr:
      "Her biri Eskişehir'deki atölyemizde tornada tek tek şekillenen bu kupa, 1240 °C'de pişirilen yoğun bir taş hamurundan yapılır. Sır, fırının içindeki konuma göre hafifçe farklı akar; bu yüzden iki kupa asla birebir aynı olmaz.\n\nKulpu başparmak desteğiyle elde yapıştırılır, ağız kenarı içmeyi kolaylaştıracak şekilde inceltilir. Gıdaya uygun, kurşunsuz sır kullanılmıştır.",
    descEn:
      "Each mug is thrown by hand in our Eskişehir studio from a dense stoneware clay fired at 1240 °C. The glaze breaks differently depending on its place in the kiln, so no two mugs are exactly alike.\n\nThe handle is pulled and attached by hand with a thumb rest, and the rim is thinned for comfortable sipping. Lead-free, food-safe glaze.",
    price: 45000,
    featured: true,
    variants: [
      { ...navy, stock: 24 },
      { ...sand, stock: 17 },
      { ...sage, stock: 3 },
    ],
  },
  {
    slug: "tas-dokulu-servis-tabagi",
    category: "seramik",
    nameTr: "Taş Dokulu Servis Tabağı",
    nameEn: "Speckled Stoneware Serving Plate",
    shortTr: "Benekli taş hamuru, mat sır, iki farklı çap.",
    shortEn: "Speckled clay body, matte glaze, two sizes.",
    descTr:
      "Hamurun içindeki demir taneleri pişirimde yüzeye çıkarak tabağa doğal, benekli bir doku verir. Geniş kenarı sunumu öne çıkarır; mat sır çatal-bıçak izlerine karşı dayanıklıdır.\n\nFırın ve mikrodalgada kullanılabilir. Ani ısı değişimlerinden kaçının.",
    descEn:
      "Iron particles in the clay rise to the surface during firing and give the plate its natural speckled texture. The wide rim frames the food; the matte glaze resists cutlery marks.\n\nOven and microwave safe. Avoid sudden temperature changes.",
    price: 69000,
    variants: [
      { size: "26 cm", stock: 14 },
      { size: "31 cm", priceDelta: 15000, stock: 8 },
    ],
  },
  {
    slug: "comlek-kase-seti",
    category: "seramik",
    nameTr: "Çömlek Kase Seti (4'lü)",
    nameEn: "Earthenware Bowl Set (Set of 4)",
    shortTr: "Dört farklı sırda, çorba ve salata için 600 ml kaseler.",
    shortEn: "Four glazes, 600 ml bowls for soup and salad.",
    descTr:
      "Kızıl Avanos toprağından yapılan kaseler, dışta sırsız bırakılan şeritle toprağın sıcak rengini gösterir. Set; lacivert, krem, adaçayı ve bal rengi sırlı dört kaseden oluşur.\n\nİstiflenebilir form sayesinde dolapta az yer kaplar.",
    descEn:
      "Made from red Avanos clay, the bowls leave an unglazed band on the outside to show the warm colour of the earth. The set includes four bowls in midnight blue, cream, sage and honey glazes.\n\nThe stackable shape saves cupboard space.",
    price: 98000,
    compareAt: 115000,
    featured: true,
    variants: [{ stock: 11 }],
  },
  {
    slug: "seramik-cay-demligi",
    category: "seramik",
    nameTr: "Seramik Çay Demliği",
    nameEn: "Ceramic Teapot",
    shortTr: "1 litre, paslanmaz çelik süzgeçli.",
    shortEn: "1 litre, with a stainless steel strainer.",
    descTr:
      "Kalın cidarlı gövdesi demi uzun süre sıcak tutar. Damlatmayan ağız formu, yüzlerce deneme dökümüyle ayarlandı. İçindeki çıkarılabilir paslanmaz çelik süzgeç yaprak çay için idealdir.",
    descEn:
      "The thick-walled body keeps tea hot for longer. The drip-free spout was refined over hundreds of test pours. The removable stainless steel strainer is ideal for loose-leaf tea.",
    price: 129000,
    variants: [
      { ...cream, stock: 6 },
      { ...navy, stock: 2 },
    ],
  },
  {
    slug: "raku-pisirim-vazo",
    category: "seramik",
    nameTr: "Raku Pişirim Vazo",
    nameEn: "Raku-fired Vase",
    shortTr: "Japon raku tekniğiyle, çatlak sırlı tek parça.",
    shortEn: "Japanese raku technique, crackle glaze, one of a kind.",
    descTr:
      "Raku pişiriminde vazo fırından kızgın hâldeyken çıkarılır ve talaşa gömülür. Duman, sırdaki çatlaklara işleyerek her parçada farklı bir ağ deseni oluşturur.\n\nDekoratif kullanım içindir; su geçirmezlik için iç yüzeyi sırlıdır, kuru ya da taze çiçekle kullanılabilir.",
    descEn:
      "In raku firing the vase is pulled from the kiln while red-hot and buried in sawdust. Smoke seeps into the glaze cracks and leaves a unique web on every piece.\n\nDecorative use; the inside is glazed so it can hold fresh or dried flowers.",
    price: 185000,
    featured: true,
    variants: [
      { size: "Orta / 24 cm", stock: 2 },
      { size: "Büyük / 32 cm", priceDelta: 55000, stock: 1 },
    ],
  },
  {
    slug: "seramik-zeytinyagi-sisesi",
    category: "seramik",
    nameTr: "Seramik Zeytinyağı Şişesi",
    nameEn: "Ceramic Olive Oil Cruet",
    shortTr: "500 ml, damlatmaz mantar tıpalı.",
    shortEn: "500 ml, drip-free cork stopper.",
    descTr:
      "Işık geçirmeyen seramik gövde, zeytinyağını güneşten koruyarak tazeliğini daha uzun süre saklar. Doğal mantar tıpa ve ince ağız kontrollü döküm sağlar.",
    descEn:
      "The opaque ceramic body protects olive oil from light and keeps it fresh for longer. A natural cork stopper and narrow neck give a controlled pour.",
    price: 54000,
    variants: [
      { ...olive, stock: 12 },
      { ...cream, stock: 9 },
    ],
  },
  {
    slug: "espresso-fincan-seti",
    category: "seramik",
    nameTr: "Espresso Fincan Seti (2'li)",
    nameEn: "Espresso Cup Set (for Two)",
    shortTr: "90 ml fincan ve tabak, porselen astarlı.",
    shortEn: "90 ml cups with saucers, porcelain-lined.",
    descTr:
      "Dışı ham toprak dokulu, içi beyaz porselen astarlı fincanlar kahvenin rengini ve kremasını gösterir. Kalın taban ısıyı korur.",
    descEn:
      "Raw clay texture on the outside and a white porcelain lining inside show off the colour and crema of the coffee. The heavy base retains heat.",
    price: 62000,
    variants: [{ stock: 15 }],
  },

  // ---------------------------------------------------------------- Çini
  {
    slug: "iznik-desenli-cini-tabak",
    category: "cini",
    nameTr: "İznik Desenli Çini Tabak",
    nameEn: "İznik-pattern Ceramic Plate",
    shortTr: "Lale, karanfil ve rumi motifli, el boyaması.",
    shortEn: "Tulip, carnation and rumi motifs, hand-painted.",
    descTr:
      "16. yüzyıl İznik tabaklarından uyarlanan desen, kuvars ağırlıklı hamur üzerine önce kömürle kopyalanır, ardından fırçayla boyanır. Mercan kırmızısı, kobalt mavisi ve firuze tonları tek tek sürülür.\n\nAskı aparatıyla duvara asılabilir ya da servis tabağı olarak kullanılabilir.",
    descEn:
      "Adapted from 16th-century İznik plates, the design is pounced onto a quartz-rich body with charcoal and then painted by brush. Coral red, cobalt blue and turquoise are applied one by one.\n\nComes with a hanger for the wall, or use it as a serving plate.",
    price: 145000,
    featured: true,
    variants: [
      { size: "25 cm", stock: 10 },
      { size: "30 cm", priceDelta: 50000, stock: 4 },
    ],
  },
  {
    slug: "kutahya-cini-kase",
    category: "cini",
    nameTr: "Kütahya Çini Kase",
    nameEn: "Kütahya Ceramic Bowl",
    shortTr: "18 cm, mavi-beyaz, gıdaya uygun sır.",
    shortEn: "18 cm, blue and white, food-safe glaze.",
    descTr:
      "Kütahya ustalarının kuşaktan kuşağa aktardığı mavi-beyaz desenler, gündelik kullanıma uygun dayanıklı bir kaseye taşındı. Meyve, kuruyemiş ya da salata için idealdir.",
    descEn:
      "Blue-and-white patterns handed down by generations of Kütahya masters, carried onto a sturdy bowl for everyday use. Ideal for fruit, nuts or salad.",
    price: 89000,
    variants: [{ stock: 13 }],
  },
  {
    slug: "lale-motifli-cini-karo",
    category: "cini",
    nameTr: "Lale Motifli Çini Karo",
    nameEn: "Tulip Motif Tile",
    shortTr: "20×20 cm, duvar ya da nihale olarak.",
    shortEn: "20×20 cm, for the wall or as a trivet.",
    descTr:
      "Osmanlı saray çinilerinden esinlenen tek lale motifi, sırüstü değil sıraltı tekniğiyle boyanır; renkler zamanla solmaz. Arkasındaki mantar keçe sayesinde nihale olarak da kullanılabilir.",
    descEn:
      "A single tulip inspired by Ottoman palace tiles, painted underglaze so the colours never fade. A cork backing lets it double as a trivet.",
    price: 42000,
    variants: [{ stock: 30 }],
  },
  {
    slug: "hayat-agaci-cini-vazo",
    category: "cini",
    nameTr: "Hayat Ağacı Çini Vazo",
    nameEn: "Tree of Life Ceramic Vase",
    shortTr: "35 cm, kobalt ve firuze tonlarında.",
    shortEn: "35 cm, in cobalt and turquoise.",
    descTr:
      "Hayat ağacı motifi, gövdenin çevresinde kesintisiz dolanacak şekilde tasarlandı. Bir vazonun boyanması iki ustanın yaklaşık üç gününü alır.",
    descEn:
      "The tree of life wraps around the body without a break. Painting a single vase takes two artisans about three days.",
    price: 235000,
    compareAt: 269000,
    variants: [{ stock: 3 }],
  },
  {
    slug: "cini-kahve-fincani-seti",
    category: "cini",
    nameTr: "Çini Türk Kahvesi Fincanı (2'li)",
    nameEn: "Turkish Coffee Cups, Set of 2",
    shortTr: "Tabaklı, 80 ml, el boyaması.",
    shortEn: "With saucers, 80 ml, hand-painted.",
    descTr:
      "Türk kahvesinin köpüğünü koruyan dar ağızlı klasik form. Fincanların içi beyaz bırakıldı; kahvenin rengi ve telvesi net görünür.",
    descEn:
      "A classic narrow-mouthed form that keeps Turkish coffee's foam. The insides are left white so the colour of the coffee shows clearly.",
    price: 76000,
    featured: true,
    variants: [
      { ...turquoise, stock: 8 },
      { ...ruby, stock: 5 },
    ],
  },
  {
    slug: "kapakli-cini-sekerlik",
    category: "cini",
    nameTr: "Kapaklı Çini Şekerlik",
    nameEn: "Lidded Sugar Bowl",
    shortTr: "Lokum ve şeker için, 12 cm.",
    shortEn: "For Turkish delight or sugar, 12 cm.",
    descTr:
      "Bayram sofralarının vazgeçilmezi kapaklı şekerlik, karanfil ve hatayi motifleriyle bezendi. Kapak tepesindeki topuz elle şekillenir.",
    descEn:
      "A festive-table classic decorated with carnation and hatayi motifs. The knob on the lid is shaped by hand.",
    price: 64000,
    variants: [{ stock: 9 }],
  },
  {
    slug: "rumi-desenli-duvar-panosu",
    category: "cini",
    nameTr: "Rumi Desenli Çini Pano",
    nameEn: "Rumi Pattern Tile Panel",
    shortTr: "4 karodan oluşan 40×40 cm pano, ahşap çerçeveli.",
    shortEn: "Four-tile 40×40 cm panel in a wooden frame.",
    descTr:
      "Dört karo bir araya geldiğinde tamamlanan rumi kompozisyonu, masif ceviz çerçeveye yerleştirildi. Duvara asmaya hazır gönderilir.",
    descEn:
      "A rumi composition that completes itself across four tiles, set in a solid walnut frame. Ships ready to hang.",
    price: 390000,
    variants: [{ stock: 1 }],
  },

  // ---------------------------------------------------------------- Tekstil
  {
    slug: "pamuklu-pestemal",
    category: "tekstil",
    nameTr: "Pamuklu Peştemal",
    nameEn: "Cotton Peshtemal Towel",
    shortTr: "95×180 cm, el tezgâhı dokuma, püsküllü.",
    shortEn: "95×180 cm, hand-loomed, tasselled.",
    descTr:
      "Denizli'de el tezgâhında dokunan peştemal hafif, çabuk kuruyan ve her yıkamada yumuşayan bir dokuya sahiptir. Plaj, banyo ya da koltuk örtüsü olarak kullanılabilir.\n\n%100 pamuk. 30 °C'de yıkayın.",
    descEn:
      "Hand-loomed in Denizli, this peshtemal is light, quick-drying and softens with every wash. Use it at the beach, in the bathroom or as a sofa throw.\n\n100% cotton. Wash at 30 °C.",
    price: 39000,
    featured: true,
    variants: [
      { ...indigo, stock: 40 },
      { ...mustard, stock: 22 },
      { ...terracotta, stock: 18 },
      { ...sage, stock: 0 },
    ],
  },
  {
    slug: "keten-masa-ortusu",
    category: "tekstil",
    nameTr: "Keten Masa Örtüsü",
    nameEn: "Linen Tablecloth",
    shortTr: "Taş yıkamalı keten, iki ölçü.",
    shortEn: "Stone-washed linen, two sizes.",
    descTr:
      "Taş yıkama işlemi ketenin sertliğini alır; ütü gerektirmeyen, doğal kırışık görünümlü bir örtü elde edilir. Kenarları el ile kıvrılarak dikildi.",
    descEn:
      "Stone washing softens the linen for a relaxed, naturally creased cloth that needs no ironing. The hems are folded and stitched by hand.",
    price: 119000,
    variants: [
      { ...natural, size: "140×140 cm", stock: 7 },
      { ...natural, size: "150×220 cm", priceDelta: 50000, stock: 5 },
    ],
  },
  {
    slug: "el-dokuma-yastik-kilifi",
    category: "tekstil",
    nameTr: "El Dokuma Yastık Kılıfı",
    nameEn: "Handwoven Cushion Cover",
    shortTr: "45×45 cm, gizli fermuarlı.",
    shortEn: "45×45 cm, concealed zip.",
    descTr:
      "Pamuk ve yün karışımı iplikle dokunan kılıf, geometrik Anadolu motiflerini sade bir renk paletiyle yorumlar. İç yastık dahil değildir.",
    descEn:
      "Woven from a cotton-wool blend, the cover reinterprets geometric Anatolian motifs in a restrained palette. Insert not included.",
    price: 52000,
    variants: [
      { ...terracotta, stock: 12 },
      { ...indigo, stock: 9 },
      { ...mustard, stock: 4 },
    ],
  },
  {
    slug: "bursa-ipek-sal",
    category: "tekstil",
    nameTr: "Bursa İpeği Şal",
    nameEn: "Bursa Silk Shawl",
    shortTr: "%100 ipek, 70×180 cm, el baskısı.",
    shortEn: "100% silk, 70×180 cm, hand-printed.",
    descTr:
      "Bursa'nın yüzyıllık ipek geleneğinden gelen şal, ahşap kalıplarla elde basılır. Hafif parlaklığı ve akışkan dokusuyla dört mevsim kullanılabilir.",
    descEn:
      "From Bursa's centuries-old silk tradition, the shawl is printed by hand with wooden blocks. Light sheen and fluid drape make it a four-season piece.",
    price: 165000,
    variants: [{ stock: 6 }],
  },
  {
    slug: "igne-oyali-el-havlusu",
    category: "tekstil",
    nameTr: "İğne Oyalı El Havlusu",
    nameEn: "Needle-lace Trimmed Hand Towel",
    shortTr: "50×90 cm, kenarı el işi iğne oyası.",
    shortEn: "50×90 cm, hand-made needle-lace edging.",
    descTr:
      "Pamuklu havlunun kenarındaki çiçek motifli iğne oyası, Ege köylerindeki kadın kooperatiflerinde elde işlenir. Her satış kooperatife doğrudan gelir sağlar.",
    descEn:
      "The floral needle-lace edging is worked by hand in women's cooperatives in Aegean villages. Every sale goes directly to the cooperative.",
    price: 34000,
    variants: [
      { ...cream, stock: 16 },
      { ...sage, stock: 10 },
    ],
  },
  {
    slug: "muslin-battaniye",
    category: "tekstil",
    nameTr: "Müslin Battaniye",
    nameEn: "Muslin Throw Blanket",
    shortTr: "Dört kat müslin, 130×170 cm.",
    shortEn: "Four-layer muslin, 130×170 cm.",
    descTr:
      "Dört kat pamuk müslinden oluşan battaniye yazın serin, baharda sıcak tutar. Yıkandıkça kabarır ve yumuşar.",
    descEn:
      "Four layers of cotton muslin keep you cool in summer and warm in spring. It puffs up and softens with every wash.",
    price: 129000,
    variants: [
      { ...sand, stock: 8 },
      { ...olive, stock: 3 },
    ],
  },
  {
    slug: "keten-pecete-seti",
    category: "tekstil",
    nameTr: "Keten Peçete Seti (4'lü)",
    nameEn: "Linen Napkin Set (Set of 4)",
    shortTr: "45×45 cm, yıkanmış keten.",
    shortEn: "45×45 cm, washed linen.",
    descTr:
      "Masa örtüsüyle uyumlu yıkanmış keten peçeteler. Kullandıkça daha da yumuşar; ütü gerektirmez.",
    descEn:
      "Washed linen napkins that pair with our tablecloth. They get softer with use and need no ironing.",
    price: 46000,
    variants: [
      { ...natural, stock: 14 },
      { ...terracotta, stock: 6 },
    ],
  },

  // ---------------------------------------------------------------- Kilim
  {
    slug: "el-dokumasi-anadolu-kilimi",
    category: "kilim",
    nameTr: "El Dokuması Anadolu Kilimi",
    nameEn: "Handwoven Anatolian Kilim",
    shortTr: "Kök boyalı yün, üç ölçü.",
    shortEn: "Natural-dyed wool, three sizes.",
    descTr:
      "Uşak yöresinde, kök boyayla renklendirilmiş yün ipliklerden dokunan kilim; elibelinde ve koçboynuzu motiflerini taşır. Çift yüzlüdür, her iki tarafı da kullanılabilir.\n\nKöşelerdeki küçük renk farkları (abraş) doğal boyanın ve el emeğinin işaretidir.",
    descEn:
      "Woven in the Uşak region from wool coloured with natural dyes, the kilim carries the elibelinde and ram's horn motifs. It is reversible.\n\nSubtle colour shifts (abrash) are a sign of natural dyes and handwork.",
    price: 490000,
    featured: true,
    variants: [
      { size: "80×150 cm", stock: 4 },
      { size: "120×180 cm", priceDelta: 360000, stock: 2 },
      { size: "160×230 cm", priceDelta: 740000, stock: 1 },
    ],
  },
  {
    slug: "kilim-minder",
    category: "kilim",
    nameTr: "Kilim Minder",
    nameEn: "Kilim Floor Cushion",
    shortTr: "60×60 cm, dolgulu, yer minderi.",
    shortEn: "60×60 cm, filled floor cushion.",
    descTr:
      "Eski kilim parçalarından dikilen minderin her biri farklı desene sahiptir. Pamuk dolgulu, sağlam bir oturum sunar.",
    descEn:
      "Sewn from pieces of vintage kilims, every cushion has a different pattern. Cotton filling gives a firm seat.",
    price: 145000,
    variants: [{ stock: 5 }],
  },
  {
    slug: "kilim-yastik-kilifi",
    category: "kilim",
    nameTr: "Kilim Yastık Kılıfı",
    nameEn: "Kilim Pillow Cover",
    shortTr: "40×60 cm, arkası pamuklu kumaş.",
    shortEn: "40×60 cm, cotton back.",
    descTr:
      "Ön yüzü el dokuması kilim, arkası sağlam pamuklu kumaştan oluşan kılıf, kanepeye anında Anadolu dokunuşu katar.",
    descEn:
      "A hand-woven kilim front with a sturdy cotton back adds an instant Anatolian touch to any sofa.",
    price: 68000,
    variants: [
      { ...terracotta, stock: 10 },
      { ...indigo, stock: 7 },
    ],
  },
  {
    slug: "kilim-yolluk",
    category: "kilim",
    nameTr: "Kilim Yolluk",
    nameEn: "Kilim Runner",
    shortTr: "70×250 cm, koridor ve mutfak için.",
    shortEn: "70×250 cm, for hallways and kitchens.",
    descTr:
      "Dar ve uzun formuyla koridorlara uygun yolluk, sık basılan alanlara dayanacak sıklıkta dokunur.",
    descEn:
      "Long and narrow for hallways, the runner is woven densely enough for high-traffic areas.",
    price: 385000,
    variants: [{ stock: 3 }],
  },
  {
    slug: "cicim-heybe",
    category: "kilim",
    nameTr: "Cicim Heybe",
    nameEn: "Cicim Saddlebag",
    shortTr: "Dekoratif, duvar ya da kapı süsü.",
    shortEn: "Decorative, for a wall or door.",
    descTr:
      "Göçebe kültürün taşıma çantası heybe, cicim tekniğiyle işlenmiş renkli motifleriyle bugün dekoratif bir parça olarak kullanılıyor.",
    descEn:
      "Once the nomads' carry-all, the saddlebag with its colourful cicim embroidery now serves as a decorative piece.",
    price: 245000,
    variants: [{ stock: 0 }],
  },
  {
    slug: "dokuma-duvar-halisi",
    category: "kilim",
    nameTr: "Dokuma Duvar Halısı",
    nameEn: "Woven Wall Hanging",
    shortTr: "60×90 cm, ahşap askılı.",
    shortEn: "60×90 cm, with a wooden hanger.",
    descTr:
      "Modern geometrik desenle dokunan duvar halısı, akustik açıdan da odaya sıcaklık katar. Meşe askısıyla gönderilir.",
    descEn:
      "Woven in a modern geometric pattern, the hanging also softens a room's acoustics. Ships with an oak hanger.",
    price: 210000,
    variants: [{ stock: 4 }],
  },

  // ---------------------------------------------------------------- Aydınlatma
  {
    slug: "mozaik-cam-masa-lambasi",
    category: "aydinlatma",
    nameTr: "Mozaik Cam Masa Lambası",
    nameEn: "Mosaic Glass Table Lamp",
    shortTr: "El ile dizilmiş cam boncuklar, E14 duy.",
    shortEn: "Hand-set glass tiles, E14 socket.",
    descTr:
      "Kapalıçarşı ustalarının tekniğiyle, cam küre üzerine binlerce küçük cam parça ve boncuk tek tek yapıştırılır. Yandığında odaya renkli bir ışık deseni yayar.\n\nAmpul dahil değildir. LED ampul önerilir.",
    descEn:
      "Using the Grand Bazaar masters' technique, thousands of small glass pieces and beads are set by hand on a glass globe. When lit it scatters colourful patterns across the room.\n\nBulb not included. LED recommended.",
    price: 139000,
    featured: true,
    variants: [
      { ...multi, stock: 9 },
      { ...turquoise, stock: 6 },
      { ...ruby, stock: 2 },
    ],
  },
  {
    slug: "uclu-mozaik-avize",
    category: "aydinlatma",
    nameTr: "Üçlü Mozaik Avize",
    nameEn: "Three-globe Mosaic Pendant",
    shortTr: "Üç küreli, pirinç gövde.",
    shortEn: "Three globes, brass body.",
    descTr:
      "Farklı yüksekliklerde sarkan üç mozaik küre, yemek masası ya da antre için etkileyici bir odak noktası oluşturur. Zincir boyu ayarlanabilir.",
    descEn:
      "Three mosaic globes hanging at different heights make a striking focal point over a dining table or entryway. Adjustable chain length.",
    price: 345000,
    variants: [{ stock: 2 }],
  },
  {
    slug: "dovme-bakir-sarkit-lamba",
    category: "aydinlatma",
    nameTr: "Dövme Bakır Sarkıt Lamba",
    nameEn: "Hammered Copper Pendant",
    shortTr: "Ø 30 cm, çekiçle dövülmüş bakır.",
    shortEn: "Ø 30 cm, hand-hammered copper.",
    descTr:
      "Gaziantep'teki bakırcılar çarşısında çekiçle dövülen kubbe, ışığı aşağı doğru sıcak bir tonla yansıtır. Zamanla oluşan patina parçaya karakter katar.",
    descEn:
      "Hammered in the coppersmiths' bazaar of Gaziantep, the dome reflects a warm light downwards. The patina it develops over time adds character.",
    price: 219000,
    variants: [{ stock: 5 }],
  },
  {
    slug: "hasir-abajur",
    category: "aydinlatma",
    nameTr: "Hasır Abajur",
    nameEn: "Rattan Lampshade",
    shortTr: "El örgüsü rattan, iki çap.",
    shortEn: "Hand-woven rattan, two diameters.",
    descTr:
      "Doğal rattan liflerinden elde örülen abajur, ışığı yumuşatarak duvara ince bir gölge dokusu düşürür. Standart duylara uyumlu adaptörle gelir.",
    descEn:
      "Hand-woven from natural rattan, the shade softens light and casts a delicate shadow pattern on the walls. Comes with a standard socket adaptor.",
    price: 89000,
    variants: [
      { size: "Ø 35 cm", stock: 7 },
      { size: "Ø 45 cm", priceDelta: 25000, stock: 3 },
    ],
  },
  {
    slug: "delikli-bakir-fener",
    category: "aydinlatma",
    nameTr: "Delikli Bakır Fener",
    nameEn: "Pierced Copper Lantern",
    shortTr: "Mum ya da LED ile, 28 cm.",
    shortEn: "For candles or LED, 28 cm.",
    descTr:
      "Gövdesindeki yüzlerce delik tek tek zımbalanır; içindeki mum yandığında duvarlara yıldızlı bir gölge düşer.",
    descEn:
      "Hundreds of holes are punched one by one; when lit, it throws a starry pattern on the walls.",
    price: 76000,
    variants: [{ stock: 10 }],
  },
  {
    slug: "seramik-mumluk",
    category: "aydinlatma",
    nameTr: "Seramik Mumluk",
    nameEn: "Ceramic Candle Holder",
    shortTr: "Tealight için, set halinde 2 adet.",
    shortEn: "For tealights, set of 2.",
    descTr:
      "Oyma desenli seramik mumluklar, tealight mumun ışığını desen boyunca süzer. Masa ve pencere önü için.",
    descEn:
      "Carved ceramic holders filter tealight glow through their pattern. For tables and windowsills.",
    price: 29000,
    variants: [
      { ...cream, stock: 20 },
      { ...terracotta, stock: 12 },
    ],
  },

  // ---------------------------------------------------------------- Bakır & Ahşap
  {
    slug: "dovme-bakir-cezve",
    category: "bakir-ahsap",
    nameTr: "Dövme Bakır Cezve",
    nameEn: "Hand-hammered Copper Coffee Pot",
    shortTr: "Kalaylı, pirinç saplı, iki boy.",
    shortEn: "Tin-lined, brass handle, two sizes.",
    descTr:
      "1 mm kalınlığındaki bakır levha çekiçle dövülerek şekillenir; iç yüzey geleneksel yöntemle kalaylanır. Bakırın ısıyı eşit dağıtması, Türk kahvesinin köpüğünü korumasını sağlar.\n\nİndüksiyon ocaklarda kullanılamaz.",
    descEn:
      "Shaped by hammering a 1 mm copper sheet, with a traditionally tinned interior. Copper's even heat keeps the foam on Turkish coffee.\n\nNot suitable for induction hobs.",
    price: 69000,
    featured: true,
    variants: [
      { size: "2 fincanlık", stock: 18 },
      { size: "4 fincanlık", priceDelta: 18000, stock: 9 },
    ],
  },
  {
    slug: "kalayli-bakir-sahan",
    category: "bakir-ahsap",
    nameTr: "Kalaylı Bakır Sahan",
    nameEn: "Tin-lined Copper Pan",
    shortTr: "Ø 20 cm, menemen ve yumurta için.",
    shortEn: "Ø 20 cm, for menemen and eggs.",
    descTr:
      "Kulplu bakır sahan, ocaktan sofraya doğrudan servis edilebilir. Kalay kaplama yapışmaz bir yüzey sağlar ve ihtiyaç duyulduğunda yenilenebilir.",
    descEn:
      "A two-handled copper pan that goes straight from hob to table. The tin lining is naturally non-stick and can be renewed when needed.",
    price: 115000,
    variants: [{ stock: 8 }],
  },
  {
    slug: "zeytin-agaci-kesme-tahtasi",
    category: "bakir-ahsap",
    nameTr: "Zeytin Ağacı Kesme Tahtası",
    nameEn: "Olive Wood Cutting Board",
    shortTr: "Tek parça, doğal kenarlı.",
    shortEn: "Single piece, live edge.",
    descTr:
      "Budama sırasında kesilen zeytin dallarından elde edilen tahta, sık damarlı yapısıyla bıçak izlerine dayanıklıdır. Her parçanın deseni ve boyutu hafif farklıdır.\n\nZeytinyağı ile ara ara bakım yapın; bulaşık makinesine koymayın.",
    descEn:
      "Made from olive branches cut during pruning, the tight grain resists knife marks. Every board's pattern and size varies slightly.\n\nOil occasionally with olive oil; do not put in the dishwasher.",
    price: 75000,
    variants: [{ stock: 12 }],
  },
  {
    slug: "simsir-kasik-seti",
    category: "bakir-ahsap",
    nameTr: "Şimşir Kaşık Seti (3'lü)",
    nameEn: "Boxwood Spoon Set (Set of 3)",
    shortTr: "Kepçe, spatula ve tahta kaşık.",
    shortEn: "Ladle, spatula and wooden spoon.",
    descTr:
      "Karadeniz'in sert şimşir ağacından oyulan kaşıklar, çizilmeye karşı hassas tencerelerde güvenle kullanılabilir.",
    descEn:
      "Carved from hard Black Sea boxwood, the spoons are safe to use in delicate, scratch-prone pans.",
    price: 42000,
    variants: [{ stock: 25 }],
  },
  {
    slug: "bakir-ibrik",
    category: "bakir-ahsap",
    nameTr: "Bakır İbrik",
    nameEn: "Copper Ewer",
    shortTr: "Dekoratif, 1,5 litre.",
    shortEn: "Decorative, 1.5 litre.",
    descTr:
      "Kalem işi motiflerle süslenen ibrik, geleneksel formunu modern bir mekâna taşıyan dekoratif bir parçadır. Çiçek vazosu olarak da kullanılabilir.",
    descEn:
      "Decorated with chased motifs, the ewer brings a traditional form into a modern space. It also works as a flower vase.",
    price: 168000,
    variants: [{ stock: 4 }],
  },
  {
    slug: "ceviz-servis-tepsisi",
    category: "bakir-ahsap",
    nameTr: "Ceviz Servis Tepsisi",
    nameEn: "Walnut Serving Tray",
    shortTr: "45×30 cm, pirinç kulplu.",
    shortEn: "45×30 cm, brass handles.",
    descTr:
      "Masif cevizden yapılan tepsi, gıdaya uygun doğal yağ ile cilalandı. Kahvaltı ve çay servisi için.",
    descEn:
      "Made from solid walnut and finished with a food-safe natural oil. For breakfast and tea service.",
    price: 135000,
    variants: [{ stock: 6 }],
  },
  {
    slug: "kakma-bakir-tepsi",
    category: "bakir-ahsap",
    nameTr: "Kakma Bakır Tepsi",
    nameEn: "Engraved Copper Tray",
    shortTr: "Ø 40 cm, el kalemi işçiliği.",
    shortEn: "Ø 40 cm, hand-engraved.",
    descTr:
      "Usta kalemkârın tek tek işlediği desenler, tepsinin merkezinden kenarına doğru açılan bir çiçek kompozisyonu oluşturur. Duvar süsü ya da sehpa tablası olarak kullanılabilir.",
    descEn:
      "Engraved stroke by stroke by a master craftsman, the pattern blooms from the centre to the rim. Use it as wall art or a coffee-table top.",
    price: 225000,
    variants: [{ stock: 2 }],
  },
];
