"use client";

import { useEffect, useId, useState } from "react";
import { SoccerPitch, type FormationName, type Player as PkgPlayer } from "soccer-pitch";
import "soccer-pitch/style.css";
import { proxyPhotoUrl } from "@/lib/utils";

type Lineup = { formation: FormationName; players: PkgPlayer[] };

// IDs are slot-index-based ("slot-0"…"slot-10") so framer-motion (used
// internally by soccer-pitch, keyed on player.id) treats each slot as the
// same component across country swaps and spring-animates positions.
const LINEUPS: Lineup[] = [
  {
    // USA — 4-2-3-1: GK LB LCB RCB RB CDM CDM LAM CAM RAM ST
    formation: "4-2-3-1",
    players: [
      { id: "slot-0",  name: "Turner",      countryCode: "US", photoUrl: "https://a8sh3xkgqkkpo6s8.public.blob.vercel-storage.com/portrait/header/425306-1771708610.jpg" },
      { id: "slot-1",  name: "Robinson",    countryCode: "US", photoUrl: "https://a8sh3xkgqkkpo6s8.public.blob.vercel-storage.com/portrait/header/349701-1703926612.jpg" },
      { id: "slot-2",  name: "Richards",    countryCode: "US", photoUrl: "https://a8sh3xkgqkkpo6s8.public.blob.vercel-storage.com/portrait/header/578539-1754244701.jpg" },
      { id: "slot-3",  name: "Ream",        countryCode: "US", photoUrl: "https://a8sh3xkgqkkpo6s8.public.blob.vercel-storage.com/portrait/header/145466-1771611843.jpg" },
      { id: "slot-4",  name: "Dest",        countryCode: "US", photoUrl: "https://a8sh3xkgqkkpo6s8.public.blob.vercel-storage.com/portrait/header/361104-1713981952.jpg" },
      { id: "slot-5",  name: "Adams",       countryCode: "US", photoUrl: "https://a8sh3xkgqkkpo6s8.public.blob.vercel-storage.com/portrait/header/332705-1754244571.jpg" },
      { id: "slot-6",  name: "McKennie",    countryCode: "US", photoUrl: "https://a8sh3xkgqkkpo6s8.public.blob.vercel-storage.com/portrait/header/332697-1754245044.jpg" },
      { id: "slot-7",  name: "Arfsten",     countryCode: "US", photoUrl: "https://a8sh3xkgqkkpo6s8.public.blob.vercel-storage.com/portrait/header/993063-1771598732.jpg" },
      { id: "slot-8",  name: "Aaronson",    countryCode: "US", photoUrl: "https://a8sh3xkgqkkpo6s8.public.blob.vercel-storage.com/portrait/header/393323-1691614083.jpg" },
      { id: "slot-9",  name: "Pulisic",     countryCode: "US", photoUrl: "https://a8sh3xkgqkkpo6s8.public.blob.vercel-storage.com/portrait/header/315779-1691696699.jpg" },
      { id: "slot-10", name: "Balogun",     countryCode: "US", photoUrl: "https://a8sh3xkgqkkpo6s8.public.blob.vercel-storage.com/portrait/header/503770-1672838317.jpg" },
    ],
  },
  {
    // France — 4-1-4-1: GK LB LCB RCB RB CDM LM LCM RCM RM ST
    formation: "4-1-4-1",
    players: [
      { id: "slot-0",  name: "Maignan",      countryCode: "FR", photoUrl: "https://a8sh3xkgqkkpo6s8.public.blob.vercel-storage.com/portrait/header/182906-1681459155.jpg" },
      { id: "slot-1",  name: "T. Hernández", countryCode: "FR", photoUrl: "https://a8sh3xkgqkkpo6s8.public.blob.vercel-storage.com/portrait/header/339808-1725532072.jpg" },
      { id: "slot-2",  name: "Saliba",       countryCode: "FR", photoUrl: "https://a8sh3xkgqkkpo6s8.public.blob.vercel-storage.com/portrait/header/495666-1718697201.jpg" },
      { id: "slot-3",  name: "Konaté",       countryCode: "FR", photoUrl: "https://a8sh3xkgqkkpo6s8.public.blob.vercel-storage.com/portrait/header/357119-1669190550.jpg" },
      { id: "slot-4",  name: "Koundé",       countryCode: "FR", photoUrl: "https://a8sh3xkgqkkpo6s8.public.blob.vercel-storage.com/portrait/header/411975-1702502639.jpg" },
      { id: "slot-5",  name: "Tchouaméni",   countryCode: "FR", photoUrl: "https://a8sh3xkgqkkpo6s8.public.blob.vercel-storage.com/portrait/header/413112-1668500754.jpg" },
      { id: "slot-6",  name: "Barcola",      countryCode: "FR", photoUrl: "https://a8sh3xkgqkkpo6s8.public.blob.vercel-storage.com/portrait/header/708265-1653406915.jpg" },
      { id: "slot-7",  name: "Camavinga",    countryCode: "FR", photoUrl: "https://a8sh3xkgqkkpo6s8.public.blob.vercel-storage.com/portrait/header/640428-1668500874.jpg" },
      { id: "slot-8",  name: "Zaïre-Emery",  countryCode: "FR", photoUrl: "https://a8sh3xkgqkkpo6s8.public.blob.vercel-storage.com/portrait/header/810092-1672303575.jpg" },
      { id: "slot-9",  name: "Olise",        countryCode: "FR", photoUrl: "https://a8sh3xkgqkkpo6s8.public.blob.vercel-storage.com/portrait/header/566723-1762944477.jpg" },
      { id: "slot-10", name: "Mbappé",       countryCode: "FR", photoUrl: "https://a8sh3xkgqkkpo6s8.public.blob.vercel-storage.com/portrait/header/342229-1682683695.jpg" },
    ],
  },
  {
    // Croatia — 3-4-3: GK LCB CB RCB LM LCM RCM RM LW ST RW
    formation: "3-4-3",
    players: [
      { id: "slot-0",  name: "Livakovic",   countryCode: "HR", photoUrl: "https://a8sh3xkgqkkpo6s8.public.blob.vercel-storage.com/portrait/header/205927-1757500641.jpg" },
      { id: "slot-1",  name: "Gvardiol",    countryCode: "HR", photoUrl: "https://a8sh3xkgqkkpo6s8.public.blob.vercel-storage.com/portrait/header/475959-1713391602.jpg" },
      { id: "slot-2",  name: "Caleta-Car",  countryCode: "HR", photoUrl: "https://a8sh3xkgqkkpo6s8.public.blob.vercel-storage.com/portrait/header/238266-1662069879.jpg" },
      { id: "slot-3",  name: "Sutalo",      countryCode: "HR", photoUrl: "https://a8sh3xkgqkkpo6s8.public.blob.vercel-storage.com/portrait/header/371001-1683031171.jpg" },
      { id: "slot-4",  name: "Perišić",     countryCode: "HR", photoUrl: "https://a8sh3xkgqkkpo6s8.public.blob.vercel-storage.com/portrait/header/42460-1667991317.jpg" },
      { id: "slot-5",  name: "Modrić",      countryCode: "HR", photoUrl: "https://a8sh3xkgqkkpo6s8.public.blob.vercel-storage.com/portrait/header/27992-1687776160.jpg" },
      { id: "slot-6",  name: "Kovacic",     countryCode: "HR", photoUrl: "https://a8sh3xkgqkkpo6s8.public.blob.vercel-storage.com/portrait/header/51471-1682668192.jpg" },
      { id: "slot-7",  name: "Tudor",       countryCode: "HR", photoUrl: "https://a8sh3xkgqkkpo6s8.public.blob.vercel-storage.com/portrait/header/343158-1641127407.png" },
      { id: "slot-8",  name: "Brekalo",     countryCode: "HR", photoUrl: "https://a8sh3xkgqkkpo6s8.public.blob.vercel-storage.com/portrait/header/293169-1695027309.jpg" },
      { id: "slot-9",  name: "Musa",        countryCode: "HR", photoUrl: "https://a8sh3xkgqkkpo6s8.public.blob.vercel-storage.com/portrait/header/387110-1771675545.jpg" },
      { id: "slot-10", name: "M. Pašalić",  countryCode: "HR", photoUrl: "https://a8sh3xkgqkkpo6s8.public.blob.vercel-storage.com/portrait/header/395928-1771712720.jpg" },
    ],
  },
  {
    // Uruguay — 4-3-3: GK LB LCB RCB RB LCM CM RCM LW ST RW
    formation: "4-3-3",
    players: [
      { id: "slot-0",  name: "Rochet",      countryCode: "UY", photoUrl: "https://a8sh3xkgqkkpo6s8.public.blob.vercel-storage.com/portrait/header/264014-1668501221.jpg" },
      { id: "slot-1",  name: "Olivera",     countryCode: "UY", photoUrl: "https://a8sh3xkgqkkpo6s8.public.blob.vercel-storage.com/portrait/header/376514-1681910576.jpg" },
      { id: "slot-2",  name: "Araujo",      countryCode: "UY", photoUrl: "https://a8sh3xkgqkkpo6s8.public.blob.vercel-storage.com/portrait/header/480267-1736431980.jpg" },
      { id: "slot-3",  name: "Giménez",     countryCode: "UY", photoUrl: "https://a8sh3xkgqkkpo6s8.public.blob.vercel-storage.com/portrait/header/250845-1664970029.jpg" },
      { id: "slot-4",  name: "Martirena",   countryCode: "UY", photoUrl: "https://a8sh3xkgqkkpo6s8.public.blob.vercel-storage.com/portrait/header/744324-1724348740.png" },
      { id: "slot-5",  name: "Ugarte",      countryCode: "UY", photoUrl: "https://a8sh3xkgqkkpo6s8.public.blob.vercel-storage.com/portrait/header/476701-1715107512.jpg" },
      { id: "slot-6",  name: "Valverde",    countryCode: "UY", photoUrl: "https://a8sh3xkgqkkpo6s8.public.blob.vercel-storage.com/portrait/header/369081-1731018042.jpg" },
      { id: "slot-7",  name: "De la Cruz",  countryCode: "UY", photoUrl: "https://a8sh3xkgqkkpo6s8.public.blob.vercel-storage.com/portrait/header/397458-1719565799.jpg" },
      { id: "slot-8",  name: "B. Rodríguez",countryCode: "UY", photoUrl: "https://a8sh3xkgqkkpo6s8.public.blob.vercel-storage.com/portrait/header/465818-1646496779.jpg" },
      { id: "slot-9",  name: "Núñez",       countryCode: "UY", photoUrl: "https://a8sh3xkgqkkpo6s8.public.blob.vercel-storage.com/portrait/header/546543-1681827179.jpg" },
      { id: "slot-10", name: "Torres",      countryCode: "UY", photoUrl: "https://a8sh3xkgqkkpo6s8.public.blob.vercel-storage.com/portrait/header/465822-1773849110.jpg" },
    ],
  },
  {
    // Japan — 3-4-2-1: GK LCB CB RCB LM LCM RCM RM LAM RAM ST
    formation: "3-4-2-1",
    players: [
      { id: "slot-0",  name: "Suzuki",    countryCode: "JP", photoUrl: "https://a8sh3xkgqkkpo6s8.public.blob.vercel-storage.com/portrait/header/432298-1713345567.png" },
      { id: "slot-1",  name: "Itakura",   countryCode: "JP", photoUrl: "https://a8sh3xkgqkkpo6s8.public.blob.vercel-storage.com/portrait/header/355816-1662966245.jpg" },
      { id: "slot-2",  name: "H. Ito",    countryCode: "JP", photoUrl: "https://a8sh3xkgqkkpo6s8.public.blob.vercel-storage.com/portrait/header/353892-1657181215.jpg" },
      { id: "slot-3",  name: "Tomiyasu",  countryCode: "JP", photoUrl: "https://a8sh3xkgqkkpo6s8.public.blob.vercel-storage.com/portrait/header/331560-1682591217.jpg" },
      { id: "slot-4",  name: "Mitoma",    countryCode: "JP", photoUrl: "https://a8sh3xkgqkkpo6s8.public.blob.vercel-storage.com/portrait/header/504849-1731683095.jpg" },
      { id: "slot-5",  name: "Endo",      countryCode: "JP", photoUrl: "https://a8sh3xkgqkkpo6s8.public.blob.vercel-storage.com/portrait/header/146310-1657181542.jpg" },
      { id: "slot-6",  name: "Tanaka",    countryCode: "JP", photoUrl: "https://a8sh3xkgqkkpo6s8.public.blob.vercel-storage.com/portrait/header/489359-1657113927.jpg" },
      { id: "slot-7",  name: "Kubo",      countryCode: "JP", photoUrl: "https://a8sh3xkgqkkpo6s8.public.blob.vercel-storage.com/portrait/header/405398-1697110254.jpg" },
      { id: "slot-8",  name: "Kamada",    countryCode: "JP", photoUrl: "https://a8sh3xkgqkkpo6s8.public.blob.vercel-storage.com/portrait/header/356141-1707947777.jpg" },
      { id: "slot-9",  name: "Doan",      countryCode: "JP", photoUrl: "https://a8sh3xkgqkkpo6s8.public.blob.vercel-storage.com/portrait/header/358504-1757597784.jpg" },
      { id: "slot-10", name: "Ueda",      countryCode: "JP", photoUrl: "https://a8sh3xkgqkkpo6s8.public.blob.vercel-storage.com/portrait/header/589128-1765214070.jpg" },
    ],
  },
];

// Stable phase: 1850ms. Flip out: 150ms. Then index updates + flip in begins.
// Framer-motion (inside soccer-pitch) spring-animates position changes since
// player IDs are stable across transitions.
const STABLE_MS = 3000;
const FLIP_MS = 150;

export function HeroPitch() {
  const [index, setIndex] = useState(0);
  const [isFlipping, setFlipping] = useState(false);
  const rawId = useId();
  const scope = `hp${rawId.replace(/[^a-zA-Z0-9]/g, "")}`;

  useEffect(() => {
    let t1: ReturnType<typeof setTimeout>;
    let t2: ReturnType<typeof setTimeout>;

    function cycle() {
      t1 = setTimeout(() => {
        setFlipping(true);
        t2 = setTimeout(() => {
          setIndex((i) => (i + 1) % LINEUPS.length);
          setFlipping(false);
          cycle();
        }, FLIP_MS);
      }, STABLE_MS);
    }

    cycle();
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const { formation, players } = LINEUPS[index];
  // Serve the portraits through our own proxy so a flaky upstream CDN response
  // is retried server-side instead of leaving a blank slot on the hero.
  const proxiedPlayers = players.map((p) => ({
    ...p,
    photoUrl: proxyPhotoUrl(p.photoUrl),
  }));

  // CSS individual `scale` property composes with the package's inline
  // `transform: translate(-50%,-50%)` without overriding it.
  const css = `
    .${scope} .sp-aspect-square { transition: scale ${FLIP_MS}ms ease-in-out; }
    .${scope}.is-flipping .sp-aspect-square { scale: 0 1; }
  `;

  return (
    <div className={`${scope}${isFlipping ? " is-flipping" : ""}`}>
      <style>{css}</style>
      <SoccerPitch
        formation={formation}
        players={proxiedPlayers}
        theme="grass"
        showNames={false}
        showFlags
      />
    </div>
  );
}
