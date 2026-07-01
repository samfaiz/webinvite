import type { InvitationContent } from "@/engine/types";

/**
 * Sample content reverse-engineered from the reference invite (Suraj & Libina).
 * The flagship template renders entirely from this object — proving the engine
 * is fully data-driven. Photos point to placeholder assets in /public/assets.
 */
export const sampleSurajLibina: InvitationContent = {
  meta: {
    slug: "suraj-libina",
    community: "kerala-christian",
    language: "en",
  },
  couple: {
    partner1: {
      name: "Suraj",
      father: "Cyril Philip",
      mother: "Soly Joseph",
      siblings: ["Dr. Sruthi Cyril", "Sreya Cyril"],
    },
    partner2: {
      name: "Libina",
      father: "Scaria Joseph",
      mother: "Bindu Scaria",
      siblings: ["Leona Mary Scaria", "Linett Mary Scaria"],
    },
    connector: "weds",
    monogram: "S | L",
  },
  envelope: {
    tagline: "Our Forever Begins",
    seal: "", // empty → auto-derived from the couple's names
  },
  hero: {
    marriageText: "We Are Getting Married",
    tagline: "Kottayam, Kerala",
    closingLine: "Thank you for being a part of our special day.",
  },
  dateReveal: {
    eventDate: "9th January 2027",
    location: "Kottayam, Kerala",
    teaser: "Scratch to reveal",
    revealLabel: "your special day",
  },
  countdown: {
    targetDate: "2027-01-09T15:00:00+05:30",
    headline: "The Countdown Begins",
    subtext: "Until our forever begins",
  },
  families: {
    heading: "Introducing the Families",
    subheading: "Two families, one promise",
    footer: "Raised with love, united by destiny — together forever",
  },
  story: {
    heading: "Our Story",
    subtext: "Some stories are written by destiny",
    items: [
      { photo: "/assets/story/1.jpg", caption: "From that first conversation…" },
      { photo: "/assets/story/2.jpg", caption: "Every journey led us here" },
      { photo: "/assets/story/3.jpg", caption: "From adventures to forever" },
      { photo: "/assets/story/4.jpg", caption: "From miles apart to forever close" },
      { photo: "/assets/story/5.jpg", caption: "We wrote our love story" },
      { photo: "/assets/story/6.jpg", caption: "The beginning of our favorite chapter" },
    ],
  },
  schedule: {
    heading: "Schedule of Events",
    subtext: "A celebration of love, faith & forever",
    events: [
      {
        id: "chanthamcharth",
        name: "Chanthamcharth",
        date: "5 January 2027",
        time: "7:00 PM",
        venue: "Grand Arena",
        address: "Ettumanoor, Kottayam",
        mapUrl: "https://maps.google.com/?q=Grand+Arena+Ettumanoor+Kottayam",
        icon: "lamp",
      },
      {
        id: "wedding",
        name: "Wedding",
        date: "9 January 2027",
        time: "3:00 PM",
        venue: "St. Joseph's Church, Pushpagiri",
        address: "Kottayam",
        mapUrl: "https://maps.google.com/?q=St+Josephs+Church+Pushpagiri+Kottayam",
        verse: "Therefore what God has joined together, let no one separate.",
        verseRef: "Matthew 19:6",
        icon: "church",
      },
      {
        id: "reception",
        name: "Reception",
        date: "9 January 2027",
        time: "7:30 PM",
        venue: "Backwaters Ripples",
        address: "Kumarakom",
        mapUrl: "https://maps.google.com/?q=Backwaters+Ripples+Kumarakom",
        icon: "cheers",
      },
    ],
  },
  rsvp: {
    heading: "RSVP",
    prompt: "Will you be attending?",
    acceptLabel: "Joyfully Accept",
    declineLabel: "Regretfully Decline",
    submitLabel: "Send RSVP",
    footer: "Celebrate this new chapter with us",
  },
  map: {
    points: [
      { label: "Grand Arena, Kottayam", address: "Ettumanoor, Kottayam" },
      { label: "St. Joseph's Church", address: "Pushpagiri, Kottayam" },
      { label: "Backwaters Ripples", address: "Kumarakom" },
    ],
    directionsUrl: "https://maps.google.com/?q=St+Josephs+Church+Pushpagiri+Kottayam",
    directionsLabel: "Get Directions",
  },
  music: {
    trackUrl: "/music/cant-help-falling-in-love.mp3",
    autoplay: false,
  },
  expiry: {
    expiresAt: "2027-01-10",
  },
};
