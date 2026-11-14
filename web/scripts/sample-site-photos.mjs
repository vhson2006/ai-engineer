// The photos of the six sample business sites (ADR 0042), made with Gemini (the model of
// ai-service, AI_GEMINI_IMAGE_MODEL) and saved as optimized JPEGs in each app's public/images/
// (hero.jpg also gives og-default.jpg, 1200x630). The photos are committed: this script only
// records their prompts and remakes a MISSING one (delete a photo to get a new one; it costs a
// Gemini call). Guardrails as ai-service (ADR 0037): no text, logos or identifiable people.
// Run from nest-microservice/ (its .env holds GEMINI_API_KEY; its node_modules have the SDK and
// sharp): node ../web/scripts/sample-site-photos.mjs
import { createRequire } from "node:module";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const require = createRequire(join(process.cwd(), "package.json"));
const { GoogleGenAI } = require("@google/genai");
const sharp = require("sharp");
process.loadEnvFile(".env");
const model = process.env.AI_GEMINI_IMAGE_MODEL;
const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const WEB = join(process.cwd(), "..", "web", "apps");

const STYLE =
  "Editorial photograph, natural realistic colours, high detail, professional photography for a small business website. No text, letters, numbers, logos, brand names or watermarks anywhere in the image. No identifiable people, no faces.";

const JOBS = {
  sushi: {
    hero: [
      "16:9",
      "An intimate omakase sushi counter at night: a row of glistening nigiri (salmon, tuna, yellowtail) on a dark slate board on a pale hinoki wood counter, soft warm spotlights, a cup of green tea, deep shadows, shallow depth of field, cinematic, high-end Japanese restaurant.",
    ],
    chef: [
      "4:3",
      "Close-up of a sushi chef's hands (no face) pressing a piece of tuna nigiri over rice on a wooden board, a long sushi knife beside it, warm low light, dark background.",
    ],
    counter: [
      "4:3",
      "Interior of a small Japanese omakase restaurant, empty: a long light hinoki wood counter with a row of seats, paper lanterns, dark charcoal walls, a small ikebana arrangement, warm evening light.",
    ],
    omakase: [
      "4:3",
      "Top-down view of an omakase tasting course on handmade ceramic plates: sashimi, nigiri, a small bowl of miso soup, pickled ginger, chopsticks on a rest, on a dark wooden table.",
    ],
    sake: [
      "3:4",
      "A ceramic sake carafe and two small cups on a dark wooden tray, a branch of red maple leaves, soft side light, minimal Japanese still life.",
    ],
  },
  travel: {
    hero: [
      "16:9",
      "Golden hour over terraced rice fields in the mountains of northern Vietnam, layered green and gold terraces, low clouds in the valleys, a small wooden house, epic landscape.",
    ],
    "ha-long": [
      "4:3",
      "Ha Long Bay, Vietnam, at sunrise: emerald water, limestone karst islands, a traditional wooden junk boat with brown sails, soft mist, golden light.",
    ],
    "hoi-an": [
      "4:3",
      "Hoi An ancient town, Vietnam, at dusk: yellow old houses along the Thu Bon river, colourful silk lanterns, small wooden boats on the water, warm glow, no identifiable people.",
    ],
    "ha-giang": [
      "4:3",
      "A winding mountain road through the dramatic limestone peaks and deep canyon of Ha Giang, northern Vietnam, a tiny motorbike far away on the road, blue sky, epic scale.",
    ],
    "phu-quoc": [
      "4:3",
      "A quiet white sand beach on Phu Quoc island, Vietnam: turquoise sea, leaning coconut palms, a wooden fishing boat, bright tropical afternoon.",
    ],
  },
  flowers: {
    hero: [
      "16:9",
      "A bright florist workshop table with an abundant hand-tied bouquet of blush peonies, garden roses, eucalyptus and white lisianthus, kraft paper, floral scissors, silk ribbon, soft morning window light, airy cream background.",
    ],
    workshop: [
      "4:3",
      "Inside a small flower shop, empty: buckets of fresh roses, hydrangeas, sunflowers and greenery on wooden shelves and a worktable, warm natural light.",
    ],
    "bouquet-blush": [
      "3:4",
      "A hand-tied bouquet of blush pink roses and white spray roses wrapped in cream paper with a silk ribbon, on a plain cream background, studio product photo.",
    ],
    "bouquet-garden": [
      "3:4",
      "A loose garden-style bouquet of white hydrangeas, ranunculus, chamomile and eucalyptus, wrapped in linen-coloured paper, on a soft sage green background, studio product photo.",
    ],
    "bouquet-sunny": [
      "3:4",
      "A cheerful bouquet of sunflowers, yellow roses and orange gerberas with greenery, wrapped in kraft paper, on a warm cream background, studio product photo.",
    ],
    care: [
      "4:3",
      "Still life: a clear glass vase with fresh pink tulips, a small pair of floral scissors and cut stems on a light wooden table, water droplets, morning light.",
    ],
  },
  autoparts: {
    hero: [
      "16:9",
      "Dramatic studio photo of new car parts arranged on a dark graphite surface: a ventilated brake disc with a caliper, spark plugs, an oil filter, a timing belt, orange accent rim lighting, sharp detail, plain unbranded parts.",
    ],
    shelves: [
      "4:3",
      "A clean, organised auto parts store aisle with metal shelves of plain unbranded boxes, filters, belts and brake discs, bright industrial lighting, nobody present.",
    ],
    workshop: [
      "4:3",
      "A tidy car repair workshop bay: a car on a lift with a wheel removed, a red tool trolley, grey epoxy floor, bright light, nobody visible.",
    ],
    brakes: [
      "4:3",
      "Close-up of a new brake disc and a red brake caliper on a steel workbench, shallow depth of field, workshop light.",
    ],
  },
  hotel: {
    hero: [
      "16:9",
      "A small boutique hotel in Hoi An at dusk: a yellow-walled colonial-style building with green wooden shutters, glowing silk lanterns, a courtyard pool reflecting the lanterns, frangipani trees, nobody around.",
    ],
    courtyard: [
      "4:3",
      "Boutique hotel courtyard garden in Hoi An with tropical plants, terracotta tiles, wooden benches and hanging silk lanterns, soft morning light, nobody present.",
    ],
    "room-deluxe": [
      "4:3",
      "Elegant hotel room in Hoi An style: a king bed with white linen, dark wood furniture, a silk lantern lamp, balcony doors open to greenery, soft daylight.",
    ],
    "room-suite": [
      "4:3",
      "Spacious hotel suite: a sitting area with rattan armchairs, a freestanding bathtub by a large window, Vietnamese ceramic vases, warm evening light.",
    ],
    "room-garden": [
      "4:3",
      "Twin hotel room opening onto a garden terrace: two beds with white linen, bamboo blinds, potted plants, natural light.",
    ],
    pool: [
      "4:3",
      "Turquoise swimming pool surrounded by palm trees and wooden sun loungers at a small boutique hotel, afternoon light, nobody in the water.",
    ],
    "old-town": [
      "4:3",
      "Hoi An ancient town street at night with colourful silk lanterns hanging over the street and old yellow houses, warm glow, no identifiable people.",
    ],
  },
  spa: {
    hero: [
      "16:9",
      "A serene spa treatment room: a massage table with white towels, smooth river stones, a bowl of floating frangipani flowers, candles, soft natural light through bamboo blinds, eucalyptus green and sand tones.",
    ],
    lounge: [
      "4:3",
      "A calm spa relaxation lounge with low linen cushions, potted plants, warm wood, a herbal tea set on a tray, soft daylight, nobody present.",
    ],
    massage: [
      "4:3",
      "Hot stone massage set-up: smooth black basalt stones on a folded white towel, a sprig of lemongrass, an unlabeled glass bottle of massage oil, soft light.",
    ],
    ritual: [
      "4:3",
      "Herbal foot bath ritual: a round wooden basin of warm water with floating herbs, lemongrass, sea salt and flower petals, on a teak floor.",
    ],
    facial: [
      "4:3",
      "Natural skincare still life: small unlabeled glass jars, aloe vera leaves, a jade roller and a rolled white towel, soft clean light.",
    ],
  },
};

async function generate(prompt, aspect) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const interaction = await client.interactions.create(
        {
          model,
          input: `${prompt}\n\n${STYLE}`,
          response_format: {
            type: "image",
            aspect_ratio: aspect,
            image_size: "1K",
            mime_type: "image/jpeg",
          },
          store: false,
        },
        { timeout: 120_000, maxRetries: 1 },
      );
      const data = interaction.output_image?.data;
      if (interaction.status === "completed" && data)
        return Buffer.from(data, "base64");
      throw new Error(`no image (${interaction.status})`);
    } catch (error) {
      if (attempt === 3) throw error;
      await new Promise((r) => setTimeout(r, 3000 * attempt));
    }
  }
}

const tasks = [];
for (const [site, images] of Object.entries(JOBS)) {
  const dir = join(WEB, `${site}-web`, "public", "images");
  mkdirSync(dir, { recursive: true });
  for (const [name, [aspect, prompt]] of Object.entries(images))
    tasks.push({ site, dir, name, aspect, prompt });
}

let next = 0;
const failures = [];
async function worker() {
  while (next < tasks.length) {
    const task = tasks[next++];
    const out = join(task.dir, `${task.name}.jpg`);
    if (existsSync(out)) continue;
    try {
      const raw = await generate(task.prompt, task.aspect);
      await sharp(raw)
        .resize({ width: 1600, withoutEnlargement: true })
        .jpeg({ quality: 80, mozjpeg: true })
        .toFile(out);
      if (task.name === "hero") {
        await sharp(raw)
          .resize(1200, 630, { fit: "cover", position: "attention" })
          .jpeg({ quality: 80, mozjpeg: true })
          .toFile(join(task.dir, "og-default.jpg"));
      }
      console.log(`ok ${task.site}/${task.name}`);
    } catch (error) {
      failures.push(`${task.site}/${task.name}`);
      console.log(`FAILED ${task.site}/${task.name}: ${error.message}`);
    }
  }
}
await Promise.all([worker(), worker(), worker()]);
console.log(
  failures.length ? `failed: ${failures.join(", ")}` : "all images done",
);
