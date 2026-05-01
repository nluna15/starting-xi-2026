"use client";

import { useEffect, useState } from "react";
import { SoccerPitch, type FormationName } from "soccer-pitch";
import "soccer-pitch/style.css";

const EMPTY_STARTERS = Array(11).fill(null);
const FORMATIONS: FormationName[] = ["4-2-3-1", "4-1-4-1", "4-3-3", "3-4-2-1"];

export function HeroPitch() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % FORMATIONS.length);
    }, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <SoccerPitch
      formation={FORMATIONS[index]}
      players={EMPTY_STARTERS}
      theme="grass"
      showNames={false}
      showFlags={false}
    />
  );
}
