"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const CURRENT_FARM = "Ферма Наурыз";

interface Animal {
  id: string;
  farm_name: string;
}

export default function Dashboard() {
  const [animalCount, setAnimalCount] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/torttulik")
      .then((r) => r.json())
      .then((data) => {
        const my = data.animals.filter(
          (a: Animal) => a.farm_name === CURRENT_FARM
        );
        setAnimalCount(my.length);
      })
      .catch(() => setAnimalCount(0));
  }, []);

  return (
    <div className="max-w-lg mx-auto px-4 py-12 sm:py-20 flex flex-col items-center gap-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-forest-600 text-center">
        {CURRENT_FARM}
      </h1>

      {/* Мои животные — кликабельная панель */}
      <Link
        href="/my-animals"
        className="card w-full flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer"
      >
        <span className="text-4xl">🐄</span>
        <div className="flex-1">
          <p className="text-sm text-forest-600/60">Мои животные</p>
          <p className="text-3xl font-bold text-forest-600">
            {animalCount === null ? (
              <span className="inline-block w-10 h-8 bg-steppe-100 rounded animate-pulse" />
            ) : (
              animalCount
            )}
          </p>
        </div>
        <span className="text-forest-400 text-xl">&rarr;</span>
      </Link>

      {/* Регистрация */}
      <Link
        href="/register"
        className="btn-primary w-full text-center text-lg py-4"
      >
        Зарегистрировать животное
      </Link>

      {/* Маркетплейс */}
      <Link
        href="/marketplace"
        className="btn-secondary w-full text-center text-lg py-4"
      >
        Маркетплейс
      </Link>
    </div>
  );
}
