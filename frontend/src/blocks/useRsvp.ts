"use client";

import { useState } from "react";
import type { InvitationContent } from "@/engine/types";
import { api } from "@/lib/api";

/**
 * Everything an RSVP form does, minus how it looks.
 *
 * Two templates now collect RSVPs in completely different dress — the brand
 * card and the Voyage boarding-pass stub — and the rules behind them are not
 * cosmetic: which fields a decline sends, what counts as a valid email, the
 * one closed set of meal keys the backend accepts. Those live here once so a
 * new design can't quietly drift from them.
 */

export const MEALS = [
  { key: "veg", label: "Veg" },
  { key: "non-veg", label: "Non-veg" },
  { key: "jain", label: "Jain" },
] as const;

export type Attending = "accept" | "decline";

export function useRsvp({
  content,
  live = false,
  editing = false,
}: {
  content: InvitationContent;
  live?: boolean;
  editing?: boolean;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(true);
  const [attending, setAttending] = useState<Attending | null>(null);
  const [guests, setGuests] = useState(1);
  const [meal, setMeal] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const couple = content.couple;
  const names =
    couple.partner1?.name && couple.partner2?.name
      ? `${couple.partner1.name} & ${couple.partner2.name}`
      : "the couple";

  /* party size and menu only mean something for a guest who's coming. In the
     builder they show regardless, so every label stays reachable to edit. */
  const showExtras = editing || attending === "accept";

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!name.trim()) return setError("Please enter your name.");
    if (!attending) return setError("Please let us know if you can make it.");
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim()))
      return setError("That email doesn't look right — please check it.");
    setError("");

    if (live && content.meta?.slug) {
      setBusy(true);
      try {
        await api.createRsvp(content.meta.slug, {
          guestName: name.trim(),
          attending,
          ...(attending === "accept" ? { guests } : {}),
          ...(attending === "accept" && meal ? { meal } : {}),
          ...(note.trim() ? { message: note.trim() } : {}),
          ...(email.trim() ? { email: email.trim(), subscribed } : {}),
        });
        setSubmitted(true);
      } catch (err) {
        setError((err as Error).message || "Could not send RSVP. Please try again.");
      } finally {
        setBusy(false);
      }
      return;
    }

    // demo / preview: no backend call
    setSubmitted(true);
  };

  /** Back to the form with the answers intact, so a guest can change one. */
  const reopen = () => {
    setSubmitted(false);
    setError("");
  };

  const stepGuests = (by: number) => setGuests((g) => Math.min(50, Math.max(1, g + by)));
  const pickMeal = (key: string) => setMeal((cur) => (cur === key ? null : key));

  return {
    name,
    setName,
    email,
    setEmail,
    subscribed,
    setSubscribed,
    attending,
    setAttending,
    guests,
    stepGuests,
    meal,
    pickMeal,
    note,
    setNote,
    submitted,
    error,
    busy,
    submit,
    reopen,
    showExtras,
    names,
  };
}

export type RsvpController = ReturnType<typeof useRsvp>;
