"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const CURRENT_FARM = "Ферма Наурыз";

interface Animal {
  id: string;
  breed: string;
  region: string;
  weight_kg: number;
  sex: string;
  vet_status: string;
  farm_name: string;
  birth_date: string;
}

function vetBadge(status: string) {
  const map: Record<string, { cls: string; label: string }> = {
    healthy: { cls: "badge-healthy", label: "Здоров" },
    under_observation: { cls: "badge-observation", label: "Наблюдение" },
    quarantine: { cls: "badge-quarantine", label: "Карантин" },
  };
  const info = map[status] || map.healthy;
  return <span className={info.cls}>{info.label}</span>;
}

function calcAge(birthDate: string): string {
  const birth = new Date(birthDate);
  const now = new Date();
  const years = now.getFullYear() - birth.getFullYear();
  if (years < 1) {
    const months = (now.getFullYear() - birth.getFullYear()) * 12 + now.getMonth() - birth.getMonth();
    return `${months} мес.`;
  }
  const suffix = years === 1 ? "год" : years < 5 ? "года" : "лет";
  return `${years} ${suffix}`;
}

export default function MyAnimalsPage() {
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/torttulik")
      .then((r) => r.json())
      .then((data) => {
        setAnimals(
          data.animals.filter((a: Animal) => a.farm_name === CURRENT_FARM)
        );
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link
            href="/"
            className="text-sm text-forest-500 hover:text-forest-600 mb-1 inline-block"
          >
            &larr; Главная
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-forest-600">
            Мои животные
          </h1>
        </div>
        <Link href="/register" className="btn-primary text-sm">
          + Добавить
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card h-20 animate-pulse bg-steppe-50" />
          ))}
        </div>
      ) : animals.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-4xl mb-3">🐄</p>
          <p className="text-forest-600/60 text-lg mb-4">
            У вас пока нет зарегистрированных животных
          </p>
          <Link href="/register" className="btn-primary">
            Зарегистрировать первое
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {animals.map((animal) => (
            <Link
              key={animal.id}
              href={`/animal/${encodeURIComponent(animal.id)}`}
              className="card flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 hover:shadow-md transition-shadow"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-forest-700 truncate">
                    {animal.breed}
                  </span>
                  {vetBadge(animal.vet_status)}
                </div>
                <p className="font-mono text-xs text-forest-500">
                  {animal.id}
                </p>
              </div>

              <div className="flex items-center gap-4 text-sm text-forest-600/70 shrink-0">
                <span>{animal.sex === "male" ? "♂" : "♀"}</span>
                <span>{animal.weight_kg} кг</span>
                <span>{calcAge(animal.birth_date)}</span>
                <span className="text-forest-400">&rarr;</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
