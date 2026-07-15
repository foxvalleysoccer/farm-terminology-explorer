"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

type Choice = {
  id: string;
  label: string;
};

type Question = {
  id: string;
  prompt: string;
  type: "single" | "multi";
  choices: Choice[];
  correct: string[];
  feedback: string;
};

type Hotspot = {
  id: string;
  label: string;
  position: { x: number; y: number };
  dialogue: { speaker: string; text: string }[];
  terms: string[];
  question?: Question;
};

type Location = {
  id: string;
  title: string;
  shortTitle: string;
  color: string;
  image: string;
  alt: string;
  intro: string;
  summary: string;
  badge: string;
  hotspots: Hotspot[];
  challenge: {
    title: string;
    setup: string;
    questions: Question[];
    xp: number;
  };
};

type SavedProgress = {
  xp: number;
  completedLocations: string[];
  hotspotProgress: Record<string, string[]>;
  learnedTerms: string[];
  finalComplete: boolean;
};

type View =
  | { name: "welcome" }
  | { name: "map" }
  | { name: "location"; locationId: string }
  | { name: "challenge"; locationId: string }
  | { name: "final" }
  | { name: "complete" };

const activeLocationIds = ["crop", "dairy", "equipment", "conservation"];

const cropHotspots: Hotspot[] = [
  {
    id: "farmer",
    label: "Farmer",
    position: { x: 50, y: 58 },
    dialogue: [
      {
        speaker: "Farmer",
        text: "Welcome. We raise corn and soybeans on about 1,200 acres. Most years we rotate fields between the two crops, and we also plant cover crops after harvest.",
      },
      {
        speaker: "Conservation Officer",
        text: "Why do you rotate crops?",
      },
      {
        speaker: "Farmer",
        text: "It helps with soil health, pest management, and yields. It also spreads out some of our risk from year to year.",
      },
    ],
    terms: ["Crop rotation", "Cover crops", "Yield"],
    question: {
      id: "crop-rotation",
      prompt: "Which of the following best describes crop rotation?",
      type: "single",
      choices: [
        { id: "a", label: "Planting different crops in the same field over time" },
        { id: "b", label: "Rotating tractors between fields" },
        { id: "c", label: "Changing fertilizer suppliers" },
        { id: "d", label: "Harvesting multiple crops at once" },
      ],
      correct: ["a"],
      feedback: "Crop rotation means changing what is planted in a field over time.",
    },
  },
  {
    id: "corn",
    label: "Corn Field",
    position: { x: 39, y: 55 },
    dialogue: [
      {
        speaker: "Farmer",
        text: "This field is grain corn. We leave it in the field until later in the season so the kernels can dry down before harvest.",
      },
      {
        speaker: "Conservation Officer",
        text: "Is all corn harvested the same way?",
      },
      {
        speaker: "Farmer",
        text: "No. Some corn is harvested for grain, and some is chopped earlier for silage to feed livestock.",
      },
    ],
    terms: ["Grain corn", "Silage"],
    question: {
      id: "grain-silage",
      prompt: "What is the primary difference between grain corn and silage?",
      type: "single",
      choices: [
        {
          id: "a",
          label:
            "Grain corn is harvested for kernels; silage is harvested as a whole plant for livestock feed",
        },
        { id: "b", label: "Grain corn is only grown in Wisconsin" },
        { id: "c", label: "Silage is harvested after grain corn" },
        { id: "d", label: "There is no difference" },
      ],
      correct: ["a"],
      feedback: "Grain corn focuses on kernels. Silage uses more of the plant as feed.",
    },
  },
  {
    id: "soybeans",
    label: "Soybean Field",
    position: { x: 56, y: 76 },
    dialogue: [
      {
        speaker: "Farmer",
        text: "These soybeans are looking pretty good this year. We planted them shortly after the corn fields were finished.",
      },
      {
        speaker: "Conservation Officer",
        text: "What role do soybeans play in the operation?",
      },
      {
        speaker: "Farmer",
        text: "They are an important cash crop for us and fit well into our crop rotation system.",
      },
    ],
    terms: ["Soybeans", "Cash crop", "Crop rotation"],
    question: {
      id: "cash-crop",
      prompt: "A cash crop is:",
      type: "single",
      choices: [
        { id: "a", label: "A crop grown primarily to be sold for income" },
        { id: "b", label: "A crop used only for livestock feed" },
        { id: "c", label: "A crop grown in small gardens" },
        { id: "d", label: "A crop harvested by hand" },
      ],
      correct: ["a"],
      feedback: "A cash crop is grown mainly to be sold.",
    },
  },
  {
    id: "grain-bin",
    label: "Grain Bin",
    position: { x: 75, y: 33 },
    dialogue: [
      {
        speaker: "Farmer",
        text: "After harvest, we store grain in these bins until we are ready to market it.",
      },
      {
        speaker: "Conservation Officer",
        text: "So the grain is not always sold immediately?",
      },
      {
        speaker: "Farmer",
        text: "Not necessarily. Sometimes we store it and wait for better market conditions.",
      },
    ],
    terms: ["Grain bin", "Grain storage", "Marketing"],
    question: {
      id: "grain-storage",
      prompt: "Why might a farmer use grain storage?",
      type: "single",
      choices: [
        { id: "a", label: "To hold grain before selling it" },
        { id: "b", label: "To store hay" },
        { id: "c", label: "To store equipment" },
        { id: "d", label: "To separate seed varieties" },
      ],
      correct: ["a"],
      feedback: "Storage lets farmers hold grain until they are ready to sell.",
    },
  },
  {
    id: "cover-crop",
    label: "Cover Crop Strip",
    position: { x: 42, y: 78 },
    dialogue: [
      {
        speaker: "Farmer",
        text: "After we harvested this field, we planted a cover crop to keep living roots in the soil.",
      },
      {
        speaker: "Conservation Officer",
        text: "What benefits do cover crops provide?",
      },
      {
        speaker: "Farmer",
        text: "They help reduce erosion, improve soil health, and can improve water infiltration.",
      },
    ],
    terms: ["Cover crop", "Erosion", "Soil health"],
    question: {
      id: "cover-benefit",
      prompt: "Which of the following is a common reason farmers use cover crops?",
      type: "single",
      choices: [
        { id: "a", label: "Reduce erosion" },
        { id: "b", label: "Increase pesticide use" },
        { id: "c", label: "Eliminate all fertilizer needs" },
        { id: "d", label: "Delay planting indefinitely" },
      ],
      correct: ["a"],
      feedback: "Cover crops are often used to reduce erosion and support soil health.",
    },
  },
];

const locations: Location[] = [
  {
    id: "crop",
    title: "Crop Farm",
    shortTitle: "Crops",
    color: "#2f7d32",
    image: "/location-art/crop-farm.png",
    alt: "Illustrated crop farm with corn, soybeans, cover crop, and grain bins.",
    intro:
      "Explore a Wisconsin crop farm. Select each hotspot to hear the producer use terms related to planting, harvest, storage, and soil health.",
    summary:
      "You explored crop production terms connected to rotation, grain corn, soybeans, cover crops, storage, yield, and soil health.",
    badge: "Crop Farm Explorer",
    hotspots: cropHotspots,
    challenge: {
      title: "Crop Farm Conversation Challenge",
      setup:
        "Farmer: This year we are rotating some of our corn acres into soybeans. We also planted cover crops after harvest to help protect the soil.",
      xp: 45,
      questions: [
        {
          id: "crop-recognize",
          prompt: "Select the terms you recognize from the conversation.",
          type: "multi",
          choices: [
            { id: "crop-rotation", label: "Crop Rotation" },
            { id: "cover-crop", label: "Cover Crop" },
            { id: "milking-parlor", label: "Milking Parlor" },
            { id: "heifer", label: "Heifer" },
            { id: "bulk-tank", label: "Bulk Tank" },
          ],
          correct: ["crop-rotation", "cover-crop"],
          feedback:
            "Crop rotation and cover crop are the crop terms used in this conversation.",
        },
        {
          id: "rows-stand",
          prompt: "The farmer says the stand looked thin. What does stand mean?",
          type: "single",
          choices: [
            { id: "plants", label: "Number and distribution of plants growing in the field" },
            { id: "bin", label: "Grain storage structure" },
            { id: "machine", label: "Harvest equipment" },
            { id: "feed", label: "Livestock feed" },
          ],
          correct: ["plants"],
          feedback: "Stand refers to the plants established in the field.",
        },
        {
          id: "rows-yield",
          prompt: "The farmer expects decent yields. What is yield?",
          type: "single",
          choices: [
            { id: "amount", label: "Amount harvested from a field" },
            { id: "rotation", label: "Type of crop rotation" },
            { id: "fertilizer", label: "Fertilizer application" },
            { id: "species", label: "Cover crop species" },
          ],
          correct: ["amount"],
          feedback: "Yield is the harvested amount from a field or crop.",
        },
      ],
    },
  },
  {
    id: "dairy",
    title: "Dairy Farm",
    shortTitle: "Dairy",
    color: "#1469a8",
    image: "/location-art/dairy-farm.png",
    alt: "Illustrated dairy operation with cows, calves, barn, milkhouse, and bulk tank.",
    intro:
      "Visit a dairy operation and learn terminology related to herd management, animal life stages, housing, and milk handling.",
    summary:
      "You practiced terms used by dairy producers, including replacement heifer, milking herd, dry cow, free stall barn, milkhouse, and bulk tank.",
    badge: "Dairy Terminology Explorer",
    hotspots: [
      {
        id: "farmer",
        label: "Farmer",
        position: { x: 24, y: 62 },
        dialogue: [
          {
            speaker: "Farmer",
            text: "We milk about 450 cows twice a day. Most of our replacement heifers are raised here on the farm.",
          },
          {
            speaker: "Conservation Officer",
            text: "What is a replacement heifer?",
          },
          {
            speaker: "Farmer",
            text: "She is a young female that has not entered the milking herd yet. Eventually she will replace older cows that leave the herd.",
          },
        ],
        terms: ["Milking herd", "Replacement heifer", "Culling"],
        question: {
          id: "replacement-heifer",
          prompt: "Why are replacement heifers important?",
          type: "single",
          choices: [
            { id: "a", label: "They eventually enter the milking herd" },
            { id: "b", label: "They pull farm equipment" },
            { id: "c", label: "They are sold immediately" },
            { id: "d", label: "They produce the most milk" },
          ],
          correct: ["a"],
          feedback: "Replacement heifers can become future members of the milking herd.",
        },
      },
      {
        id: "cows",
        label: "Dairy Cows",
        position: { x: 45, y: 56 },
        dialogue: [
          {
            speaker: "Farmer",
            text: "Most of these cows are currently in lactation, which means they are producing milk.",
          },
          { speaker: "Conservation Officer", text: "Are all cows producing milk year-round?" },
          { speaker: "Farmer", text: "No. We also have dry cows that are not currently being milked." },
        ],
        terms: ["Lactation", "Dry cow"],
        question: {
          id: "dry-cow",
          prompt: "A dry cow is:",
          type: "single",
          choices: [
            { id: "a", label: "A cow temporarily not producing milk" },
            { id: "b", label: "A sick cow" },
            { id: "c", label: "A beef cow" },
            { id: "d", label: "A young calf" },
          ],
          correct: ["a"],
          feedback: "A dry cow is temporarily not in milk production.",
        },
      },
      {
        id: "calves",
        label: "Calves",
        position: { x: 80, y: 74 },
        dialogue: [
          { speaker: "Farmer", text: "These calves are the future of the herd. We watch their health and growth closely." },
          { speaker: "Conservation Officer", text: "When does a calf become a heifer?" },
          { speaker: "Farmer", text: "Once she is older but has not had her first calf yet, we call her a heifer." },
        ],
        terms: ["Calf", "Heifer"],
        question: {
          id: "heifer",
          prompt: "Which animal has not yet had a calf?",
          type: "single",
          choices: [
            { id: "a", label: "Heifer" },
            { id: "b", label: "Cow" },
            { id: "c", label: "Bull" },
            { id: "d", label: "Steer" },
          ],
          correct: ["a"],
          feedback: "A heifer is a young female that has not yet had a calf.",
        },
      },
      {
        id: "barn",
        label: "Free Stall Barn",
        position: { x: 24, y: 28 },
        dialogue: [
          {
            speaker: "Farmer",
            text: "This is a free stall barn. The cows can move around freely, eat, drink, and choose where they rest.",
          },
          { speaker: "Conservation Officer", text: "So they are not assigned a specific stall?" },
          {
            speaker: "Farmer",
            text: "Exactly. That is different from a tie stall barn where each cow stays in a designated space.",
          },
        ],
        terms: ["Free stall barn", "Tie stall barn"],
        question: {
          id: "free-stall",
          prompt: "What is a key feature of a free stall barn?",
          type: "single",
          choices: [
            { id: "a", label: "Cows can move freely throughout the barn" },
            { id: "b", label: "Cows remain tied in place" },
            { id: "c", label: "It stores feed" },
            { id: "d", label: "It houses calves only" },
          ],
          correct: ["a"],
          feedback: "Free stall barns let cows move freely to eat, drink, and rest.",
        },
      },
      {
        id: "milkhouse",
        label: "Milkhouse",
        position: { x: 74, y: 35 },
        dialogue: [
          { speaker: "Farmer", text: "The milkhouse contains equipment used to cool and store milk after it leaves the parlor." },
          { speaker: "Conservation Officer", text: "So this is part of the milk handling process?" },
          { speaker: "Farmer", text: "Exactly." },
        ],
        terms: ["Milkhouse"],
      },
      {
        id: "bulk-tank",
        label: "Bulk Tank",
        position: { x: 83, y: 48 },
        dialogue: [
          { speaker: "Farmer", text: "Milk is stored in the bulk tank until it is picked up by the processor." },
          { speaker: "Conservation Officer", text: "How often is it collected?" },
          { speaker: "Farmer", text: "Usually every day or two depending on the operation." },
        ],
        terms: ["Bulk tank"],
        question: {
          id: "bulk-tank",
          prompt: "What is the purpose of a bulk tank?",
          type: "single",
          choices: [
            { id: "a", label: "Store cooled milk before pickup" },
            { id: "b", label: "Store feed" },
            { id: "c", label: "Store manure" },
            { id: "d", label: "Store grain" },
          ],
          correct: ["a"],
          feedback: "A bulk tank stores cooled milk before pickup.",
        },
      },
    ],
    challenge: {
      title: "Dairy Conversation Challenge",
      setup:
        "Farmer: One of our replacement heifers should join the milking herd later this year. We have also got a group of dry cows that will calve soon.",
      xp: 45,
      questions: [
        {
          id: "dairy-recognize",
          prompt: "Select all terms you recognize.",
          type: "multi",
          choices: [
            { id: "replacement-heifer", label: "Replacement Heifer" },
            { id: "milking-herd", label: "Milking Herd" },
            { id: "dry-cow", label: "Dry Cow" },
            { id: "grain-bin", label: "Grain Bin" },
            { id: "chisel-plow", label: "Chisel Plow" },
          ],
          correct: ["replacement-heifer", "milking-herd", "dry-cow"],
          feedback: "Those terms are all connected to dairy herd management.",
        },
        {
          id: "culled",
          prompt: "The farmer says they culled a few older cows. What does culled mean?",
          type: "single",
          choices: [
            { id: "removed", label: "Removed from the herd" },
            { id: "added", label: "Added to the herd" },
            { id: "pasture", label: "Moved to another pasture" },
            { id: "vaccinated", label: "Vaccinated" },
          ],
          correct: ["removed"],
          feedback: "Culled animals are removed from the herd.",
        },
        {
          id: "infra",
          prompt: "Which facility stores cooled milk before processor pickup?",
          type: "single",
          choices: [
            { id: "bulk", label: "Bulk Tank" },
            { id: "barn", label: "Free Stall Barn" },
            { id: "grain", label: "Grain Bin" },
            { id: "waterway", label: "Grassed Waterway" },
          ],
          correct: ["bulk"],
          feedback: "The bulk tank stores cooled milk before pickup.",
        },
      ],
    },
  },
  {
    id: "equipment",
    title: "Equipment Yard",
    shortTitle: "Equipment",
    color: "#c4631a",
    image: "/location-art/equipment-yard.png",
    alt: "Illustrated equipment yard with planter, drill, combine, chopper, chisel plow, and disk.",
    intro:
      "Explore equipment a conservation professional may hear farmers mention during planting, harvest, tillage, and cover crop establishment.",
    summary:
      "You connected common machines to their jobs: planters, drills, combines, choppers, chisel plows, disks, planting, and harvest.",
    badge: "Equipment Recognition Badge",
    hotspots: [
      {
        id: "farmer",
        label: "Farmer",
        position: { x: 50, y: 44 },
        dialogue: [
          {
            speaker: "Farmer",
            text: "This time of year, we are getting equipment ready for planting. Later in the season we will switch over to harvesting equipment.",
          },
          { speaker: "Conservation Officer", text: "Do most farms use different machines throughout the year?" },
          {
            speaker: "Farmer",
            text: "Absolutely. Different jobs require different equipment depending on the crop and season.",
          },
        ],
        terms: ["Planting", "Harvest", "Field operations"],
        question: {
          id: "machines",
          prompt: "Why might a farm use several different machines throughout the year?",
          type: "single",
          choices: [
            { id: "a", label: "Different machines perform different tasks" },
            { id: "b", label: "Equipment is only used once" },
            { id: "c", label: "Farmers rotate machines for tax purposes" },
            { id: "d", label: "All machines perform the same function" },
          ],
          correct: ["a"],
          feedback: "Different field jobs require different machines.",
        },
      },
      {
        id: "planter",
        label: "Planter",
        position: { x: 16, y: 42 },
        dialogue: [
          { speaker: "Farmer", text: "This planter places individual seeds at a consistent depth and spacing." },
          { speaker: "Conservation Officer", text: "So it is used when establishing the crop?" },
          { speaker: "Farmer", text: "Exactly. Good seed placement can make a big difference later in the season." },
        ],
        terms: ["Planter", "Seed placement"],
        question: {
          id: "planter",
          prompt: "What is the primary purpose of a planter?",
          type: "single",
          choices: [
            { id: "a", label: "Place seeds in the soil" },
            { id: "b", label: "Harvest grain" },
            { id: "c", label: "Apply manure" },
            { id: "d", label: "Store feed" },
          ],
          correct: ["a"],
          feedback: "A planter places seeds in the soil at a set spacing and depth.",
        },
      },
      {
        id: "drill",
        label: "Drill",
        position: { x: 39, y: 45 },
        dialogue: [
          { speaker: "Farmer", text: "We use the drill for smaller seeds and some cover crops." },
          { speaker: "Conservation Officer", text: "How is it different from the planter?" },
          { speaker: "Farmer", text: "A drill places many seeds in closely spaced rows rather than individual spacing." },
        ],
        terms: ["Drill", "Cover crop establishment"],
        question: {
          id: "drill",
          prompt: "A drill is commonly used to:",
          type: "single",
          choices: [
            { id: "a", label: "Plant small seeded crops" },
            { id: "b", label: "Harvest corn early" },
            { id: "c", label: "Chop forage" },
            { id: "d", label: "Store grain" },
          ],
          correct: ["a"],
          feedback: "Drills are commonly used for small seeds and cover crops.",
        },
      },
      {
        id: "combine",
        label: "Combine",
        position: { x: 68, y: 42 },
        dialogue: [
          { speaker: "Farmer", text: "This combine harvests grain crops like corn, soybeans, and small grains." },
          { speaker: "Conservation Officer", text: "So this is one of the last machines used during the season?" },
          { speaker: "Farmer", text: "That is right. Harvest is often what people picture when they think of farming." },
        ],
        terms: ["Combine", "Harvest"],
        question: {
          id: "combine",
          prompt: "What is a combine used for?",
          type: "single",
          choices: [
            { id: "a", label: "Harvesting grain crops" },
            { id: "b", label: "Planting seed" },
            { id: "c", label: "Tilling soil" },
            { id: "d", label: "Storing grain" },
          ],
          correct: ["a"],
          feedback: "A combine harvests grain crops.",
        },
      },
      {
        id: "chopper",
        label: "Chopper",
        position: { x: 88, y: 46 },
        dialogue: [
          { speaker: "Farmer", text: "When we harvest forage like corn silage, we use the chopper." },
          { speaker: "Conservation Officer", text: "So this ties back to the silage we talked about earlier?" },
          { speaker: "Farmer", text: "Exactly. The chopper cuts and processes the crop before it goes into storage." },
        ],
        terms: ["Chopper", "Silage", "Forage"],
        question: {
          id: "chopper",
          prompt: "A chopper is commonly associated with:",
          type: "single",
          choices: [
            { id: "a", label: "Forage harvest" },
            { id: "b", label: "Grain storage" },
            { id: "c", label: "Milk production" },
            { id: "d", label: "Grazing" },
          ],
          correct: ["a"],
          feedback: "Choppers are used in forage harvest, including silage.",
        },
      },
      {
        id: "chisel",
        label: "Chisel Plow",
        position: { x: 27, y: 72 },
        dialogue: [
          {
            speaker: "Farmer",
            text: "This is a chisel plow. It breaks up compacted areas at deeper depths while leaving some crop residue on the surface.",
          },
          { speaker: "Conservation Officer", text: "So it disturbs the soil but does not completely turn it over?" },
          { speaker: "Farmer", text: "Exactly." },
        ],
        terms: ["Chisel plow", "Conservation tillage"],
        question: {
          id: "chisel",
          prompt: "Why might a farmer use a chisel plow?",
          type: "single",
          choices: [
            { id: "a", label: "To break up hardpans" },
            { id: "b", label: "To harvest crops" },
            { id: "c", label: "To apply manure" },
            { id: "d", label: "To plant seed" },
          ],
          correct: ["a"],
          feedback: "A chisel plow can break up compacted soil layers.",
        },
      },
      {
        id: "disk",
        label: "Disk",
        position: { x: 70, y: 72 },
        dialogue: [
          { speaker: "Farmer", text: "This disk helps break up residue and prepare fields for planting." },
          { speaker: "Conservation Officer", text: "Is it considered tillage equipment?" },
          { speaker: "Farmer", text: "Yes. It is one of several tools farmers may use depending on field conditions." },
        ],
        terms: ["Disk", "Tillage"],
        question: {
          id: "disk",
          prompt: "A disk is primarily used for:",
          type: "single",
          choices: [
            { id: "a", label: "Soil preparation and residue management" },
            { id: "b", label: "Harvesting grain" },
            { id: "c", label: "Transporting crops" },
            { id: "d", label: "Feeding livestock" },
          ],
          correct: ["a"],
          feedback: "A disk is tillage equipment used for soil and residue preparation.",
        },
      },
    ],
    challenge: {
      title: "What Equipment Is the Farmer Talking About?",
      setup: "Listen for clues in realistic farmer comments and choose the machine being described.",
      xp: 50,
      questions: [
        {
          id: "equip-combine",
          prompt: "We will start using this machine once the soybeans are ready to come off the field.",
          type: "single",
          choices: [
            { id: "combine", label: "Combine" },
            { id: "planter", label: "Planter" },
            { id: "chopper", label: "Chopper" },
            { id: "drill", label: "Drill" },
          ],
          correct: ["combine"],
          feedback: "Soybeans coming off the field points to a combine.",
        },
        {
          id: "equip-drill",
          prompt: "We will use this machine to establish our cover crops after harvest.",
          type: "single",
          choices: [
            { id: "drill", label: "Drill" },
            { id: "combine", label: "Combine" },
            { id: "chopper", label: "Chopper" },
            { id: "bulk", label: "Bulk Tank" },
          ],
          correct: ["drill"],
          feedback: "A drill is often used to establish small-seeded cover crops.",
        },
        {
          id: "equip-chopper",
          prompt: "We will be harvesting corn silage next week.",
          type: "single",
          choices: [
            { id: "chopper", label: "Chopper" },
            { id: "planter", label: "Planter" },
            { id: "combine", label: "Combine" },
            { id: "disk", label: "Disk" },
          ],
          correct: ["chopper"],
          feedback: "Corn silage is commonly harvested with a chopper.",
        },
      ],
    },
  },
  {
    id: "conservation",
    title: "Conservation Area",
    shortTitle: "Conservation",
    color: "#087b83",
    image: "/location-art/conservation-area.png",
    alt: "Illustrated conservation area with cover crop field, grassed waterway, buffer strip, stream, and tile outlet.",
    intro:
      "Move to the edge of a field where conservation practices are visible. Explore terms farmers may use when talking about soil and water protection.",
    summary:
      "You reviewed conservation terminology related to grassed waterways, buffer strips, tile drainage, cover crops, runoff, erosion, and soil health.",
    badge: "Conservation Practices Explorer",
    hotspots: [
      {
        id: "farmer",
        label: "Farmer",
        position: { x: 55, y: 42 },
        dialogue: [
          {
            speaker: "Farmer",
            text: "We have added several conservation practices over the years to protect soil and water while keeping the farm productive.",
          },
        ],
        terms: ["Conservation practice", "Soil health"],
      },
      {
        id: "waterway",
        label: "Grassed Waterway",
        position: { x: 52, y: 54 },
        dialogue: [
          { speaker: "Farmer", text: "This waterway helps safely move runoff through the field without causing erosion." },
        ],
        terms: ["Grassed waterway", "Runoff", "Erosion"],
        question: {
          id: "waterway",
          prompt: "What is the primary purpose of a grassed waterway?",
          type: "single",
          choices: [
            { id: "a", label: "Reduce soil erosion from runoff" },
            { id: "b", label: "Store manure" },
            { id: "c", label: "Grow forage" },
            { id: "d", label: "Improve harvest efficiency" },
          ],
          correct: ["a"],
          feedback: "A grassed waterway carries runoff while reducing erosion.",
        },
      },
      {
        id: "buffer",
        label: "Buffer Strip",
        position: { x: 75, y: 58 },
        dialogue: [
          { speaker: "Farmer", text: "This strip of vegetation helps filter runoff before it reaches nearby water." },
        ],
        terms: ["Buffer strip", "Runoff"],
        question: {
          id: "buffer",
          prompt: "Buffer strips help:",
          type: "single",
          choices: [
            { id: "a", label: "Protect nearby waterways" },
            { id: "b", label: "Increase livestock production" },
            { id: "c", label: "Store grain" },
            { id: "d", label: "Dry crops" },
          ],
          correct: ["a"],
          feedback: "Buffer strips filter runoff and help protect water.",
        },
      },
      {
        id: "tile",
        label: "Tile Drainage Outlet",
        position: { x: 17, y: 76 },
        dialogue: [
          { speaker: "Farmer", text: "These tiles help move excess water away from crop roots." },
        ],
        terms: ["Tile drainage"],
        question: {
          id: "tile",
          prompt: "Tile drainage is designed to:",
          type: "single",
          choices: [
            { id: "a", label: "Remove excess water from fields" },
            { id: "b", label: "Irrigate crops" },
            { id: "c", label: "Store nutrients" },
            { id: "d", label: "Transport grain" },
          ],
          correct: ["a"],
          feedback: "Tile drainage helps move excess water away from fields.",
        },
      },
      {
        id: "cover-field",
        label: "Cover Crop Field",
        position: { x: 23, y: 45 },
        dialogue: [
          {
            speaker: "Farmer",
            text: "You have already seen cover crops on another farm. They are one of several tools we use to protect soil.",
          },
        ],
        terms: ["Cover crop", "Soil protection"],
      },
    ],
    challenge: {
      title: "Conservation Practice Challenge",
      setup: "Review the terms farmers may use when talking about soil and water protection.",
      xp: 40,
      questions: [
        {
          id: "conservation-recognize",
          prompt: "Which terms are conservation practices or features from this area?",
          type: "multi",
          choices: [
            { id: "waterway", label: "Grassed Waterway" },
            { id: "buffer", label: "Buffer Strip" },
            { id: "tile", label: "Tile Drainage" },
            { id: "bulk", label: "Bulk Tank" },
            { id: "heifer", label: "Replacement Heifer" },
          ],
          correct: ["waterway", "buffer", "tile"],
          feedback:
            "Grassed waterways, buffer strips, and tile drainage are conservation-related features in this module.",
        },
      ],
    },
  },
];

const finalQuestions: Question[] = [
  {
    id: "final-terms",
    prompt:
      "Farmer: We finished chopping silage last week. We planted cover crops right afterward and may chop them in spring for replacement heifer feed. We are adding soybeans into our rotation and checking the nutrient management plan. Which terms did you hear?",
    type: "multi",
    choices: [
      { id: "silage", label: "Silage" },
      { id: "cover", label: "Cover Crop" },
      { id: "heifer", label: "Replacement Heifer" },
      { id: "yield", label: "Yield" },
      { id: "nmp", label: "Nutrient Management Plan" },
      { id: "rotation", label: "Crop Rotation" },
    ],
    correct: ["silage", "cover", "heifer", "yield", "nmp", "rotation"],
    feedback: "All of these are terms used in the integrated farm conversation.",
  },
  {
    id: "boss-terms",
    prompt:
      "Farmer: This field was soybeans last year, so it will go into corn as part of the rotation. After harvest, we drill in a cover crop. This field gets wet and has drain tile to manage excess water. Which terms did you hear?",
    type: "multi",
    choices: [
      { id: "rotation", label: "Crop Rotation" },
      { id: "cover", label: "Cover Crop" },
      { id: "tile", label: "Tile Drainage" },
      { id: "nmp", label: "Nutrient Management Plan" },
      { id: "bulk", label: "Bulk Tank" },
      { id: "dry", label: "Dry Cow" },
    ],
    correct: ["rotation", "cover", "tile", "nmp"],
    feedback:
      "The relevant terms are crop rotation, cover crop, tile drainage, and nutrient management plan.",
  },
  {
    id: "boss-followup",
    prompt: "Which follow-up question would be most appropriate?",
    type: "single",
    choices: [
      { id: "a", label: "Can you tell me more about your cover crop strategy?" },
      { id: "b", label: "How many gallons of milk does your bulk tank hold?" },
      { id: "c", label: "What breed are your dairy cows?" },
      { id: "d", label: "How much grain fits in your silo?" },
    ],
    correct: ["a"],
    feedback:
      "Recognizing terminology helps you ask relevant questions that fit the conversation.",
  },
];

const initialProgress: SavedProgress = {
  xp: 0,
  completedLocations: [],
  hotspotProgress: {},
  learnedTerms: [],
  finalComplete: false,
};

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

function asset(path: string) {
  return `${basePath}${path}`;
}

const welcomeNarration =
  "Welcome to Farm Terminology Explorer. In this conservation officer training game, you will practice the language farmers use in real conversations. Visit crop, dairy, equipment, and conservation locations. Explore each scene, hear producer dialogue, answer quick checks, and collect terminology for later review.";

const mapDirectionsNarration =
  "Farm map. Choose a location to explore by selecting a location graphic on the map. Complete the crop farm, dairy farm, equipment yard, and conservation area visits in any order. Each visit opens an exploration scene with hotspots. Select each hotspot, listen to the producer dialogue, answer the knowledge check, and return to the map when the visit is complete. Completed locations stay available for review.";

function buildAudioScript() {
  const lines: string[] = [
    "Farm Terminology Explorer Audio Script",
    "",
    "WELCOME PAGE",
    welcomeNarration,
    "",
    "FARM MAP DIRECTIONS",
    mapDirectionsNarration,
    "Progress panel note: The storyboard mentions a Livestock Farm, but the provided Word document does not include livestock screens. It is shown as content needed.",
    "",
  ];

  locations.forEach((location) => {
    lines.push(`${location.title.toUpperCase()} - EXPLORE SCENE`);
    lines.push(`${location.title}. Explore the scene. ${location.intro}`);
    lines.push(`Available hotspots: ${location.hotspots.map((hotspot) => hotspot.label).join(", ")}.`);
    lines.push("");

    location.hotspots.forEach((hotspot) => {
      lines.push(`Hotspot: ${hotspot.label}`);
      hotspot.dialogue.forEach((line) => {
        lines.push(`${line.speaker}: ${line.text}`);
      });
      lines.push(`Terms added: ${hotspot.terms.join(", ")}.`);
      if (hotspot.question) {
        lines.push(`Knowledge check: ${hotspot.question.prompt}`);
        hotspot.question.choices.forEach((choice) => {
          lines.push(`Choice: ${choice.label}`);
        });
        lines.push(`Feedback: ${hotspot.question.feedback}`);
      }
      lines.push("");
    });

    lines.push(`${location.title.toUpperCase()} - CHALLENGE`);
    lines.push(location.challenge.title);
    lines.push(location.challenge.setup);
    location.challenge.questions.forEach((question) => {
      lines.push(`Question: ${question.prompt}`);
      question.choices.forEach((choice) => {
        lines.push(`Choice: ${choice.label}`);
      });
      lines.push(`Feedback: ${question.feedback}`);
    });
    lines.push(`Completion: ${location.summary} Badge earned: ${location.badge}.`);
    lines.push("");
  });

  lines.push("FINAL CHALLENGE");
  lines.push("Putting it all together. Conservation Professional Conversation Challenge. Recognize terms from multiple farm visits and choose a follow-up question that keeps the conversation productive.");
  finalQuestions.forEach((question) => {
    lines.push(`Question: ${question.prompt}`);
    question.choices.forEach((choice) => {
      lines.push(`Choice: ${choice.label}`);
    });
    lines.push(`Feedback: ${question.feedback}`);
  });
  lines.push("");
  lines.push("COMPLETION");
  lines.push("Training activity complete. Understanding farm terminology helps conservation professionals build rapport, ask better questions, and communicate more effectively with producers.");

  return lines.join("\n");
}

function downloadTextFile(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

type NarrationCue = {
  text: string;
  audioId: string;
};

type SoundName = "click" | "select" | "correct" | "incorrect" | "complete" | "open";

const narrationSettings = {
  rate: 0.94,
  pitch: 1,
  volume: 0.9,
  preferredVoice: "",
};

function useAudioFeedback() {
  const audioContext = useRef<AudioContext | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  function getContext() {
    if (typeof window === "undefined") return null;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!audioContext.current) {
      audioContext.current = new AudioContextClass();
    }
    return audioContext.current;
  }

  function tone(frequency: number, start: number, duration: number, gainValue: number) {
    const context = getContext();
    if (!context || !soundEnabled) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, context.currentTime + start);
    gain.gain.setValueAtTime(0.0001, context.currentTime + start);
    gain.gain.exponentialRampToValueAtTime(gainValue, context.currentTime + start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + start + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(context.currentTime + start);
    oscillator.stop(context.currentTime + start + duration + 0.02);
  }

  function playSound(name: SoundName) {
    if (!soundEnabled) return;
    if (name === "click") tone(420, 0, 0.07, 0.035);
    if (name === "select") {
      tone(520, 0, 0.06, 0.035);
      tone(720, 0.055, 0.08, 0.028);
    }
    if (name === "correct") {
      tone(523, 0, 0.09, 0.04);
      tone(659, 0.075, 0.09, 0.04);
      tone(784, 0.15, 0.12, 0.035);
    }
    if (name === "incorrect") {
      tone(220, 0, 0.11, 0.035);
      tone(164, 0.1, 0.14, 0.03);
    }
    if (name === "complete") {
      tone(392, 0, 0.08, 0.04);
      tone(523, 0.08, 0.08, 0.04);
      tone(659, 0.16, 0.13, 0.04);
      tone(1046, 0.29, 0.18, 0.025);
    }
    if (name === "open") {
      tone(330, 0, 0.08, 0.03);
      tone(494, 0.07, 0.1, 0.03);
    }
  }

  return {
    soundEnabled,
    setSoundEnabled,
    playSound,
  };
}

function useNarrator() {
  const [narrationEnabled, setNarrationEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioManifest, setAudioManifest] = useState<Record<string, string>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let active = true;
    fetch(asset("/audio/manifest.json"), { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : {}))
      .then((manifest) => {
        if (active && manifest && typeof manifest === "object") {
          setAudioManifest(manifest as Record<string, string>);
        }
      })
      .catch(() => {
        if (active) setAudioManifest({});
      });
    return () => {
      active = false;
    };
  }, []);

  const speak = useCallback((text: string, audioId?: string) => {
    if (typeof window === "undefined") return;
    const cleanText = text.replace(/\s+/g, " ").trim();
    if (!cleanText) return;
    audioRef.current?.pause();
    audioRef.current = null;
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();

    const audioPath = audioId ? audioManifest[audioId] : undefined;
    if (audioPath) {
      const audio = new Audio(asset(audioPath));
      audioRef.current = audio;
      audio.onplay = () => setIsSpeaking(true);
      audio.onended = () => setIsSpeaking(false);
      audio.onerror = () => {
        setIsSpeaking(false);
        audioRef.current = null;
      };
      audio.play().catch(() => setIsSpeaking(false));
      return;
    }

    if (!("speechSynthesis" in window)) return;
    const utterance = new SpeechSynthesisUtterance(cleanText);
    const voices = window.speechSynthesis.getVoices();
    const preferred =
      narrationSettings.preferredVoice &&
      voices.find((voice) => voice.name === narrationSettings.preferredVoice);
    const englishVoice =
      preferred ?? voices.find((voice) => voice.lang.toLowerCase().startsWith("en"));
    if (englishVoice) utterance.voice = englishVoice;
    utterance.rate = narrationSettings.rate;
    utterance.pitch = narrationSettings.pitch;
    utterance.volume = narrationSettings.volume;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, [audioManifest]);

  const stop = useCallback(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  const toggleNarration = useCallback((currentCue: NarrationCue) => {
    setNarrationEnabled((current) => {
      const next = !current;
      if (next) {
        speak(currentCue.text, currentCue.audioId);
      } else {
        stop();
      }
      return next;
    });
  }, [speak, stop]);

  useEffect(() => stop, []);

  return {
    narrationEnabled,
    isSpeaking,
    speak,
    stop,
    toggleNarration,
  };
}

function normalize(list: string[]) {
  return [...list].sort().join("|");
}

function isCorrect(question: Question, selected: string[]) {
  return normalize(question.correct) === normalize(selected);
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

function getLocation(id: string) {
  return locations.find((location) => location.id === id) ?? locations[0];
}

export default function Home() {
  const [view, setView] = useState<View>({ name: "welcome" });
  const [progress, setProgress] = useState<SavedProgress>(initialProgress);
  const [activeHotspot, setActiveHotspot] = useState<Hotspot | null>(null);
  const [dialogueIndex, setDialogueIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({});
  const [showGlossary, setShowGlossary] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const { soundEnabled, setSoundEnabled, playSound } = useAudioFeedback();
  const { narrationEnabled, isSpeaking, speak, toggleNarration } = useNarrator();
  const welcomeAutoPlayed = useRef(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("farm-terminology-progress");
    if (saved) {
      try {
        setProgress({ ...initialProgress, ...JSON.parse(saved) });
      } catch {
        setProgress(initialProgress);
      }
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("farm-terminology-progress", JSON.stringify(progress));
  }, [progress]);

  const totalHotspots = useMemo(
    () => locations.reduce((sum, location) => sum + location.hotspots.length, 0),
    [],
  );

  const completedHotspots = Object.values(progress.hotspotProgress).reduce(
    (sum, ids) => sum + ids.length,
    0,
  );

  const allLocationsComplete = activeLocationIds.every((id) =>
    progress.completedLocations.includes(id),
  );

  const narrationCue = useMemo<NarrationCue>(() => {
    if (view.name === "welcome") {
      return { text: welcomeNarration, audioId: "welcome" };
    }
    if (view.name === "map") {
      return {
        text: `${mapDirectionsNarration} ${progress.completedLocations.length} of ${activeLocationIds.length} active visits are complete.`,
        audioId: "map",
      };
    }
    if (view.name === "location") {
      const location = getLocation(view.locationId);
      if (activeHotspot) {
        const line = activeHotspot.dialogue[dialogueIndex];
        const question = activeHotspot.question;
        if (dialogueIndex === activeHotspot.dialogue.length - 1 && question) {
          return {
            text: `${line.speaker}: ${line.text} New terms added: ${activeHotspot.terms.join(", ")}. Knowledge check. ${question.prompt} Choices: ${question.choices.map((choice) => choice.label).join(". ")}.`,
            audioId: `hotspot-${location.id}-${activeHotspot.id}-${dialogueIndex}-check`,
          };
        }
        return {
          text: `${line.speaker}: ${line.text}`,
          audioId: `hotspot-${location.id}-${activeHotspot.id}-${dialogueIndex}`,
        };
      }
      return {
        text: `${location.title}. Explore the scene. ${location.intro}. Available hotspots: ${location.hotspots.map((hotspot) => hotspot.label).join(", ")}.`,
        audioId: `location-${location.id}`,
      };
    }
    if (view.name === "challenge") {
      const location = getLocation(view.locationId);
      return {
        text: `${location.challenge.title}. ${location.challenge.setup}. Questions: ${location.challenge.questions.map((question) => `${question.prompt} Choices: ${question.choices.map((choice) => choice.label).join(". ")}`).join(". ")}`,
        audioId: `challenge-${location.id}`,
      };
    }
    if (view.name === "final") {
      return {
        text: `Putting it all together. Conservation Professional Conversation Challenge. Recognize terms from multiple farm visits and choose a follow-up question that keeps the conversation productive. ${finalQuestions.map((question) => `${question.prompt} Choices: ${question.choices.map((choice) => choice.label).join(". ")}`).join(". ")}`,
        audioId: "final",
      };
    }
    return {
      text: `Training activity complete. Understanding farm terminology helps conservation professionals build rapport, ask better questions, and communicate more effectively with producers. You explored ${progress.completedLocations.length} locations, learned ${progress.learnedTerms.length} terms, and earned ${progress.xp} XP.`,
      audioId: "complete",
    };
  }, [activeHotspot, dialogueIndex, progress.completedLocations.length, progress.learnedTerms.length, progress.xp, view]);

  useEffect(() => {
    if (narrationEnabled) speak(narrationCue.text, narrationCue.audioId);
  }, [narrationCue, narrationEnabled, speak]);

  useEffect(() => {
    if (view.name !== "welcome" || welcomeAutoPlayed.current) return;
    welcomeAutoPlayed.current = true;
    window.setTimeout(() => speak(welcomeNarration, "welcome"), 350);
  }, [speak, view.name]);

  const downloadAudioScript = useCallback(() => {
    playSound("click");
    downloadTextFile("farm-terminology-explorer-audio-script.txt", buildAudioScript());
  }, [playSound]);

  function addTerms(terms: string[]) {
    setProgress((current) => ({
      ...current,
      learnedTerms: unique([...current.learnedTerms, ...terms]).sort(),
    }));
  }

  function completeHotspot(location: Location, hotspot: Hotspot) {
    playSound("complete");
    addTerms(hotspot.terms);
    setProgress((current) => {
      const currentIds = current.hotspotProgress[location.id] ?? [];
      const nextIds = unique([...currentIds, hotspot.id]);
      return {
        ...current,
        xp: currentIds.includes(hotspot.id) ? current.xp : current.xp + 10,
        hotspotProgress: { ...current.hotspotProgress, [location.id]: nextIds },
      };
    });
  }

  function completeLocation(location: Location) {
    playSound("complete");
    setProgress((current) => {
      if (current.completedLocations.includes(location.id)) return current;
      return {
        ...current,
        xp: current.xp + location.challenge.xp,
        completedLocations: [...current.completedLocations, location.id],
      };
    });
  }

  function chooseAnswer(question: Question, choiceId: string) {
    if (submitted[question.id]) return;
    playSound("select");
    setAnswers((current) => {
      const currentValues = current[question.id] ?? [];
      if (question.type === "single") {
        return { ...current, [question.id]: [choiceId] };
      }
      const next = currentValues.includes(choiceId)
        ? currentValues.filter((id) => id !== choiceId)
        : [...currentValues, choiceId];
      return { ...current, [question.id]: next };
    });
  }

  function submitQuestion(question: Question) {
    const selected = answers[question.id] ?? [];
    const correct = isCorrect(question, selected);
    playSound(correct ? "correct" : "incorrect");
    if (narrationEnabled) {
      speak(
        `${correct ? "Correct." : "Review this one."} ${question.feedback}`,
        `feedback-${question.id}-${correct ? "correct" : "review"}`,
      );
    }
    setSubmitted((current) => ({ ...current, [question.id]: true }));
    if (correct) {
      setProgress((current) => ({ ...current, xp: current.xp + 5 }));
    }
  }

  function resetTransient() {
    setActiveHotspot(null);
    setDialogueIndex(0);
    setAnswers({});
    setSubmitted({});
  }

  function resetProgress() {
    playSound("click");
    window.localStorage.removeItem("farm-terminology-progress");
    setProgress(initialProgress);
    resetTransient();
    setView({ name: "welcome" });
  }

  return (
    <main className="game-shell">
      <Header
        xp={progress.xp}
        completedCount={progress.completedLocations.length}
        learnedCount={progress.learnedTerms.length}
        totalHotspots={totalHotspots}
        completedHotspots={completedHotspots}
        onMap={() => {
          playSound("click");
          resetTransient();
          setView({ name: "map" });
        }}
        onGlossary={() => {
          playSound("open");
          setShowGlossary(true);
        }}
        onTranscript={() => {
          playSound("open");
          setShowTranscript(true);
        }}
        onDownloadScript={downloadAudioScript}
        onReset={resetProgress}
        narrationEnabled={narrationEnabled}
        isSpeaking={isSpeaking}
        soundEnabled={soundEnabled}
        onToggleNarration={() => {
          playSound("click");
          toggleNarration(narrationCue);
        }}
        onReplayNarration={() => {
          playSound("click");
          speak(narrationCue.text, narrationCue.audioId);
        }}
        onToggleSound={() => setSoundEnabled((current) => !current)}
      />

      {view.name === "welcome" && (
        <Welcome
          onPlayWelcome={() => {
            playSound("click");
            speak(welcomeNarration, "welcome");
          }}
          onDownloadScript={downloadAudioScript}
          onStart={() => {
            playSound("open");
            resetTransient();
            setView({ name: "map" });
          }}
        />
      )}

      {view.name === "map" && (
        <FarmMap
          progress={progress}
          allLocationsComplete={allLocationsComplete}
          onOpenLocation={(locationId) => {
            playSound("open");
            resetTransient();
            setView({ name: "location", locationId });
          }}
          onFinal={() => {
            playSound("open");
            resetTransient();
            setView({ name: "final" });
          }}
        />
      )}

      {view.name === "location" && (
        <LocationView
          location={getLocation(view.locationId)}
          progress={progress}
          activeHotspot={activeHotspot}
          dialogueIndex={dialogueIndex}
          answers={answers}
          submitted={submitted}
          onSelectHotspot={(hotspot) => {
            playSound("open");
            setActiveHotspot(hotspot);
            setDialogueIndex(0);
          }}
          onAdvanceDialogue={() => {
            if (!activeHotspot) return;
            if (dialogueIndex < activeHotspot.dialogue.length - 1) {
              playSound("click");
              setDialogueIndex((current) => current + 1);
            }
          }}
          onChooseAnswer={chooseAnswer}
          onSubmit={submitQuestion}
          onCompleteHotspot={(location, hotspot) => {
            completeHotspot(location, hotspot);
            setActiveHotspot(null);
            setDialogueIndex(0);
          }}
          onChallenge={(locationId) => {
            playSound("open");
            resetTransient();
            setView({ name: "challenge", locationId });
          }}
          onMap={() => {
            playSound("click");
            resetTransient();
            setView({ name: "map" });
          }}
        />
      )}

      {view.name === "challenge" && (
        <ChallengeView
          location={getLocation(view.locationId)}
          answers={answers}
          submitted={submitted}
          onChooseAnswer={chooseAnswer}
          onSubmit={submitQuestion}
          onComplete={(location) => {
            completeLocation(location);
            resetTransient();
            setView({ name: "map" });
          }}
        />
      )}

      {view.name === "final" && (
        <FinalChallenge
          answers={answers}
          submitted={submitted}
          finalComplete={progress.finalComplete}
          learnedTerms={progress.learnedTerms}
          onChooseAnswer={chooseAnswer}
          onSubmit={submitQuestion}
          onComplete={() => {
            playSound("complete");
            setProgress((current) => ({
              ...current,
              finalComplete: true,
              xp: current.finalComplete ? current.xp : current.xp + 75,
            }));
            resetTransient();
            setView({ name: "complete" });
          }}
        />
      )}

      {view.name === "complete" && (
        <Completion progress={progress} onMap={() => {
          playSound("click");
          setView({ name: "map" });
        }} />
      )}

      {showGlossary && (
        <Modal title="Field Notebook Glossary" onClose={() => {
          playSound("click");
          setShowGlossary(false);
        }}>
          <p>
            Terms are added as you explore hotspots. This list is stored on this device
            for review.
          </p>
          {progress.learnedTerms.length === 0 ? (
            <p className="empty">No terms collected yet.</p>
          ) : (
            <ul className="glossary-list">
              {progress.learnedTerms.map((term) => (
                <li key={term}>{term}</li>
              ))}
            </ul>
          )}
        </Modal>
      )}

      {showTranscript && (
        <Modal title="Accessible Transcript" onClose={() => {
          playSound("click");
          setShowTranscript(false);
        }}>
          <Transcript />
        </Modal>
      )}
    </main>
  );
}

function Header({
  xp,
  completedCount,
  learnedCount,
  totalHotspots,
  completedHotspots,
  onMap,
  onGlossary,
  onTranscript,
  onDownloadScript,
  onReset,
  narrationEnabled,
  isSpeaking,
  soundEnabled,
  onToggleNarration,
  onReplayNarration,
  onToggleSound,
}: {
  xp: number;
  completedCount: number;
  learnedCount: number;
  totalHotspots: number;
  completedHotspots: number;
  onMap: () => void;
  onGlossary: () => void;
  onTranscript: () => void;
  onDownloadScript: () => void;
  onReset: () => void;
  narrationEnabled: boolean;
  isSpeaking: boolean;
  soundEnabled: boolean;
  onToggleNarration: () => void;
  onReplayNarration: () => void;
  onToggleSound: () => void;
}) {
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">DATCP training game</p>
        <h1>Farm Terminology Explorer</h1>
      </div>
      <div className="status-strip" aria-label="Progress summary">
        <span>{completedCount} / {activeLocationIds.length} visits</span>
        <span>{completedHotspots} / {totalHotspots} hotspots</span>
        <span>{learnedCount} terms</span>
        <span>{xp} XP</span>
      </div>
      <nav aria-label="Game tools">
        <button type="button" className="nav-button" onClick={onToggleSound}>
          Sound {soundEnabled ? "On" : "Off"}
        </button>
        <button type="button" className="nav-button" onClick={onToggleNarration}>
          Narration {narrationEnabled ? "On" : "Off"}
        </button>
        <button type="button" className="nav-button" onClick={onReplayNarration} disabled={!narrationEnabled}>
          {isSpeaking ? "Replay" : "Read Screen"}
        </button>
        <button type="button" className="nav-button" onClick={onMap}>Map</button>
        <button type="button" className="nav-button" onClick={onGlossary}>Glossary</button>
        <button type="button" className="nav-button" onClick={onTranscript}>Transcript</button>
        <button type="button" className="nav-button" onClick={onDownloadScript}>Audio Script</button>
        <button type="button" className="nav-button subtle" onClick={onReset}>Reset</button>
      </nav>
    </header>
  );
}

function Welcome({
  onPlayWelcome,
  onDownloadScript,
  onStart,
}: {
  onPlayWelcome: () => void;
  onDownloadScript: () => void;
  onStart: () => void;
}) {
  return (
    <section className="welcome-screen">
        <div className="welcome-media" role="img" aria-label="Wisconsin farm landscape">
        <img src={asset("/source-media/image10.jpeg")} alt="" />
      </div>
      <div className="welcome-copy">
        <p className="eyebrow">Conservation officer training</p>
        <h2>Practice the language farmers use in real conversations.</h2>
        <p>
          Visit crop, dairy, equipment, and conservation locations. Explore each scene,
          hear producer dialogue, answer quick checks, and collect terminology for
          later review.
        </p>
        <div className="welcome-actions">
          <button type="button" className="primary-button" onClick={onStart}>
            Start Farm Visit
          </button>
          <button type="button" className="secondary-button" onClick={onPlayWelcome}>
            Play Welcome Audio
          </button>
          <button type="button" className="secondary-button" onClick={onDownloadScript}>
            Download Audio Script
          </button>
          <span>Progress saves automatically on this device.</span>
        </div>
      </div>
    </section>
  );
}

function FarmMap({
  progress,
  allLocationsComplete,
  onOpenLocation,
  onFinal,
}: {
  progress: SavedProgress;
  allLocationsComplete: boolean;
  onOpenLocation: (locationId: string) => void;
  onFinal: () => void;
}) {
  return (
    <section className="map-screen">
      <div className="section-heading">
        <p className="eyebrow">Farm map</p>
        <h2>Choose a location to explore.</h2>
        <p>
          Select a location graphic or tab through the accessible buttons. Each visit opens
          an exploration scene with hotspots, dialogue, quick checks, and a return-to-map path.
        </p>
      </div>

      <div className="map-layout">
        <div className="farm-map-art" role="img" aria-label="Illustrated map of farm visit locations">
          {locations.map((location) => {
            const complete = progress.completedLocations.includes(location.id);
            return (
              <button
                key={location.id}
                type="button"
                className={`map-pin ${complete ? "complete" : ""} ${location.id}`}
                style={{ ["--pin-color" as string]: location.color }}
                onClick={() => onOpenLocation(location.id)}
              >
                <img src={asset(location.image)} alt="" />
                <span>{complete ? "Complete" : "Visit"}</span>
                <strong>{location.title}</strong>
              </button>
            );
          })}
          <div className="map-pin locked livestock" aria-label="Livestock farm content not yet provided">
            <div className="map-placeholder-art" aria-hidden="true" />
            <span>Content needed</span>
            <strong>Livestock Farm</strong>
          </div>
        </div>

        <aside className="map-panel">
          <h3>Progress</h3>
          <div className="meter">
            <div
              className="meter-fill"
              style={{
                width: `${(progress.completedLocations.length / activeLocationIds.length) * 100}%`,
              }}
            />
          </div>
          <p>{progress.completedLocations.length} of {activeLocationIds.length} active visits complete.</p>
          <p className="note">
            The storyboard mentions a Livestock Farm, but the provided Word document does
            not include livestock screens. It is shown here as content needed.
          </p>
          <button
            type="button"
            className="primary-button"
            disabled={!allLocationsComplete}
            onClick={onFinal}
          >
            Start Final Challenge
          </button>
          {!allLocationsComplete && (
            <p className="hint">Finish all active visits to unlock the final conversation.</p>
          )}
        </aside>
      </div>
    </section>
  );
}

function LocationView({
  location,
  progress,
  activeHotspot,
  dialogueIndex,
  answers,
  submitted,
  onSelectHotspot,
  onAdvanceDialogue,
  onChooseAnswer,
  onSubmit,
  onCompleteHotspot,
  onChallenge,
  onMap,
}: {
  location: Location;
  progress: SavedProgress;
  activeHotspot: Hotspot | null;
  dialogueIndex: number;
  answers: Record<string, string[]>;
  submitted: Record<string, boolean>;
  onSelectHotspot: (hotspot: Hotspot) => void;
  onAdvanceDialogue: () => void;
  onChooseAnswer: (question: Question, choiceId: string) => void;
  onSubmit: (question: Question) => void;
  onCompleteHotspot: (location: Location, hotspot: Hotspot) => void;
  onChallenge: (locationId: string) => void;
  onMap: () => void;
}) {
  const completed = progress.hotspotProgress[location.id] ?? [];
  const allHotspotsComplete = location.hotspots.every((hotspot) => completed.includes(hotspot.id));
  const activeDialogue = activeHotspot?.dialogue[dialogueIndex];
  const dialogueDone = activeHotspot ? dialogueIndex === activeHotspot.dialogue.length - 1 : false;
  const question = activeHotspot?.question;
  const questionSubmitted = question ? submitted[question.id] : false;

  return (
    <section className="location-screen">
      <div className="section-heading">
        <p className="eyebrow" style={{ color: location.color }}>{location.title}</p>
        <h2>{allHotspotsComplete ? `${location.title} complete` : "Explore the scene."}</h2>
        <p>{location.intro}</p>
      </div>

      <div className="exploration-layout">
        <div className="scene-card">
          <img src={asset(location.image)} alt={location.alt} />
          {location.hotspots.map((hotspot) => {
            const isComplete = completed.includes(hotspot.id);
            return (
              <button
                type="button"
                key={hotspot.id}
                className={`hotspot ${isComplete ? "complete" : ""}`}
                style={{
                  left: `${hotspot.position.x}%`,
                  top: `${hotspot.position.y}%`,
                  ["--hotspot-color" as string]: location.color,
                }}
                onClick={() => onSelectHotspot(hotspot)}
                aria-label={`${hotspot.label}${isComplete ? ", completed" : ""}`}
              >
                <span>{hotspot.label}</span>
              </button>
            );
          })}
        </div>

        <aside className="side-panel">
          <h3>Accessible Hotspot List</h3>
          <div className="hotspot-list">
            {location.hotspots.map((hotspot) => (
              <button
                key={hotspot.id}
                type="button"
                className={completed.includes(hotspot.id) ? "complete" : ""}
                onClick={() => onSelectHotspot(hotspot)}
              >
                <span>{hotspot.label}</span>
                <small>{completed.includes(hotspot.id) ? "Completed" : "Available"}</small>
              </button>
            ))}
          </div>
          <button type="button" className="nav-button wide" onClick={onMap}>
            Return to Map
          </button>
        </aside>
      </div>

      {activeHotspot && (
        <div className="dialogue-panel" role="dialog" aria-modal="false" aria-labelledby="dialogue-title">
          <div className="dialogue-header">
            <div>
              <p className="eyebrow">Hotspot</p>
              <h3 id="dialogue-title">{activeHotspot.label}</h3>
            </div>
            <button type="button" className="nav-button" onClick={() => onCompleteHotspot(location, activeHotspot)}>
              Close
            </button>
          </div>

          <article className="speech-card">
            <strong>{activeDialogue?.speaker}</strong>
            <p>{activeDialogue?.text}</p>
          </article>

          {!dialogueDone && (
            <button type="button" className="primary-button" onClick={onAdvanceDialogue}>
              Continue Conversation
            </button>
          )}

          {dialogueDone && (
            <>
              <div className="terms-card">
                <h4>New Terms Added</h4>
                <ul>
                  {activeHotspot.terms.map((term) => (
                    <li key={term}>{term}</li>
                  ))}
                </ul>
              </div>

              {question && (
                <QuestionBlock
                  question={question}
                  selected={answers[question.id] ?? []}
                  submitted={questionSubmitted}
                  onChoose={onChooseAnswer}
                  onSubmit={onSubmit}
                />
              )}

              <button
                type="button"
                className="primary-button"
                disabled={question ? !questionSubmitted : false}
                onClick={() => onCompleteHotspot(location, activeHotspot)}
              >
                Mark Hotspot Complete
              </button>
            </>
          )}
        </div>
      )}

      {allHotspotsComplete && (
        <div className="completion-banner">
          <div>
            <p className="eyebrow">Badge ready</p>
            <h3>{location.badge}</h3>
            <p>{location.summary}</p>
          </div>
          <button type="button" className="primary-button" onClick={() => onChallenge(location.id)}>
            Start Location Challenge
          </button>
        </div>
      )}
    </section>
  );
}

function ChallengeView({
  location,
  answers,
  submitted,
  onChooseAnswer,
  onSubmit,
  onComplete,
}: {
  location: Location;
  answers: Record<string, string[]>;
  submitted: Record<string, boolean>;
  onChooseAnswer: (question: Question, choiceId: string) => void;
  onSubmit: (question: Question) => void;
  onComplete: (location: Location) => void;
}) {
  const done = location.challenge.questions.every((question) => submitted[question.id]);
  return (
    <section className="challenge-screen">
      <div className="challenge-hero" style={{ ["--challenge-color" as string]: location.color }}>
        <p className="eyebrow">{location.title}</p>
        <h2>{location.challenge.title}</h2>
        <p>{location.challenge.setup}</p>
      </div>
      <div className="question-stack">
        {location.challenge.questions.map((question) => (
          <QuestionBlock
            key={question.id}
            question={question}
            selected={answers[question.id] ?? []}
            submitted={submitted[question.id]}
            onChoose={onChooseAnswer}
            onSubmit={onSubmit}
          />
        ))}
      </div>
      <button type="button" className="primary-button" disabled={!done} onClick={() => onComplete(location)}>
        Complete Visit and Return to Map
      </button>
    </section>
  );
}

function FinalChallenge({
  answers,
  submitted,
  finalComplete,
  learnedTerms,
  onChooseAnswer,
  onSubmit,
  onComplete,
}: {
  answers: Record<string, string[]>;
  submitted: Record<string, boolean>;
  finalComplete: boolean;
  learnedTerms: string[];
  onChooseAnswer: (question: Question, choiceId: string) => void;
  onSubmit: (question: Question) => void;
  onComplete: () => void;
}) {
  const done = finalQuestions.every((question) => submitted[question.id]);
  return (
    <section className="challenge-screen final">
      <div className="challenge-hero">
        <p className="eyebrow">Putting it all together</p>
        <h2>Conservation Professional Conversation Challenge</h2>
        <p>
          This is the final scenario. Recognize terms from multiple farm visits and
          choose a follow-up question that keeps the conversation productive.
        </p>
      </div>
      <div className="question-stack">
        {finalQuestions.map((question) => (
          <QuestionBlock
            key={question.id}
            question={question}
            selected={answers[question.id] ?? []}
            submitted={submitted[question.id]}
            onChoose={onChooseAnswer}
            onSubmit={onSubmit}
          />
        ))}
      </div>
      <div className="reflection-panel">
        <h3>Reflection</h3>
        <p>Which area do you feel most comfortable discussing?</p>
        <div className="reflection-options" aria-label="Reflection options">
          {["Crop Production", "Dairy Operations", "Equipment", "Conservation Practices"].map((label) => (
            <button type="button" key={label} className="nav-button">{label}</button>
          ))}
        </div>
        <p className="hint">Reflection is not scored. You have collected {learnedTerms.length} terms.</p>
      </div>
      <button type="button" className="primary-button" disabled={!done} onClick={onComplete}>
        {finalComplete ? "View Completion" : "Earn Completion Badge"}
      </button>
    </section>
  );
}

function Completion({ progress, onMap }: { progress: SavedProgress; onMap: () => void }) {
  return (
    <section className="completion-screen">
      <div className="badge-large">
        <span>Farm Terminology Explorer</span>
      </div>
      <h2>Training activity complete.</h2>
      <p>
        Understanding farm terminology helps conservation professionals build rapport,
        ask better questions, and communicate more effectively with producers.
      </p>
      <div className="result-grid">
        <div><strong>{progress.completedLocations.length}</strong><span>Locations explored</span></div>
        <div><strong>{progress.learnedTerms.length}</strong><span>Terms learned</span></div>
        <div><strong>{progress.xp}</strong><span>Knowledge score</span></div>
      </div>
      <button type="button" className="primary-button" onClick={onMap}>Revisit Farms</button>
    </section>
  );
}

function QuestionBlock({
  question,
  selected,
  submitted,
  onChoose,
  onSubmit,
}: {
  question: Question;
  selected: string[];
  submitted: boolean;
  onChoose: (question: Question, choiceId: string) => void;
  onSubmit: (question: Question) => void;
}) {
  const correct = submitted && isCorrect(question, selected);
  return (
    <div className="question-card">
      <h4>{question.prompt}</h4>
      <div className="choice-list">
        {question.choices.map((choice) => {
          const checked = selected.includes(choice.id);
          return (
            <button
              type="button"
              key={choice.id}
              className={checked ? "selected" : ""}
              aria-pressed={checked}
              disabled={submitted}
              onClick={() => onChoose(question, choice.id)}
            >
              <span className="choice-control" aria-hidden="true">
                {question.type === "multi" ? (checked ? "X" : "") : checked ? "O" : ""}
              </span>
              {choice.label}
            </button>
          );
        })}
      </div>
      {!submitted ? (
        <button
          type="button"
          className="submit-button"
          disabled={selected.length === 0}
          onClick={() => onSubmit(question)}
        >
          Submit
        </button>
      ) : (
        <div className={`feedback ${correct ? "correct" : "incorrect"}`} role="status">
          <strong>{correct ? "Correct." : "Review this one."}</strong>
          <span>{question.feedback}</span>
        </div>
      )}
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-header">
          <h2 id="modal-title">{title}</h2>
          <button type="button" className="nav-button" onClick={onClose}>Close</button>
        </div>
        <div className="modal-body">{children}</div>
      </section>
    </div>
  );
}

function Transcript() {
  return (
    <div className="transcript">
      <p>
        This static transcript provides the same essential information as the visual
        and audio-style game sequence.
      </p>
      <h3>Welcome</h3>
      <p>
        As a Wisconsin conservation professional, you will work with farmers from a
        variety of operations. Understanding common farm terminology can help you ask
        better questions, build rapport, and have more productive conversations.
      </p>
      {locations.map((location) => (
        <section key={location.id}>
          <h3>{location.title}</h3>
          <p>{location.intro}</p>
          {location.hotspots.map((hotspot) => (
            <article key={hotspot.id}>
              <h4>{hotspot.label}</h4>
              {hotspot.dialogue.map((line, index) => (
                <p key={`${hotspot.id}-${index}`}>
                  <strong>{line.speaker}:</strong> {line.text}
                </p>
              ))}
              <p><strong>Terms:</strong> {hotspot.terms.join(", ")}</p>
            </article>
          ))}
        </section>
      ))}
      <h3>Final Challenge</h3>
      <p>
        Learners identify terms across crop production, dairy operations, equipment,
        and conservation practices, then choose an appropriate follow-up question.
      </p>
    </div>
  );
}
