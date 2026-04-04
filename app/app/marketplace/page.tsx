"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";

interface Animal {
  id: string;
  breed: string;
  region: string;
  weight_kg: number;
  sex: string;
  vet_status: string;
}

function seededPrice(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return 500000 + Math.abs(hash % 4500000);
}

function formatTenge(n: number): string {
  return n.toLocaleString("ru-RU") + " ₸";
}

export default function MarketplacePage() {
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);
  const [breedFilter, setBreedFilter] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [search, setSearch] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");

  useEffect(() => {
    async function fetchAnimals() {
      try {
        const res = await fetch("/api/torttulik");
        if (res.ok) {
          const data = await res.json();
          setAnimals(data.animals);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    fetchAnimals();
  }, []);

  const breeds = useMemo(
    () => Array.from(new Set(animals.map((a) => a.breed))).sort(),
    [animals]
  );
  const regions = useMemo(
    () => Array.from(new Set(animals.map((a) => a.region))).sort(),
    [animals]
  );

  const filtered = useMemo(() => {
    return animals.filter((a) => {
      if (breedFilter && a.breed !== breedFilter) return false;
      if (regionFilter && a.region !== regionFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !a.id.toLowerCase().includes(q) &&
          !a.breed.toLowerCase().includes(q) &&
          !a.region.toLowerCase().includes(q)
        )
          return false;
      }
      const price = seededPrice(a.id);
      if (priceMin && price < Number(priceMin)) return false;
      if (priceMax && price > Number(priceMax)) return false;
      return true;
    });
  }, [animals, breedFilter, regionFilter, search, priceMin, priceMax]);

  function vetStatusBadge(status: string) {
    const map: Record<string, { className: string; label: string }> = {
      healthy: { className: "badge-healthy", label: "Здоров" },
      observation: { className: "badge-observation", label: "Наблюдение" },
      quarantine: { className: "badge-quarantine", label: "Карантин" },
    };
    const info = map[status] || map.healthy;
    return <span className={info.className}>{info.label}</span>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <h1 className="text-2xl sm:text-3xl font-bold text-forest-600 mb-6">
        Маркетплейс
      </h1>

      {/* Filter bar */}
      <div className="card mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <input
            type="text"
            className="input-field"
            placeholder="Поиск..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="input-field"
            value={breedFilter}
            onChange={(e) => setBreedFilter(e.target.value)}
          >
            <option value="">Все породы</option>
            {breeds.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
          <select
            className="input-field"
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
          >
            <option value="">Все регионы</option>
            {regions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <input
            type="number"
            className="input-field"
            placeholder="Цена от (₸)"
            value={priceMin}
            onChange={(e) => setPriceMin(e.target.value)}
          />
          <input
            type="number"
            className="input-field"
            placeholder="Цена до (₸)"
            value={priceMax}
            onChange={(e) => setPriceMax(e.target.value)}
          />
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-6 bg-steppe-100 rounded w-3/4 mb-3" />
              <div className="h-4 bg-steppe-50 rounded w-1/2 mb-2" />
              <div className="h-4 bg-steppe-50 rounded w-2/3 mb-4" />
              <div className="h-10 bg-steppe-100 rounded" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-forest-600/60 text-lg">Нет результатов</p>
          <p className="text-forest-600/40 text-sm mt-1">
            Попробуйте изменить фильтры
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((animal) => {
            const price = seededPrice(animal.id);
            return (
              <div key={animal.id} className="card flex flex-col">
                <div className="bg-steppe-50 rounded-lg h-32 flex items-center justify-center mb-3">
                  <span className="text-5xl opacity-60">
                    {animal.sex === "male" ? "🐂" : "🐄"}
                  </span>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-forest-700">
                    {animal.breed}
                  </h3>
                  {vetStatusBadge(animal.vet_status)}
                </div>
                <div className="space-y-1 text-sm text-forest-600/70 mb-4 flex-1">
                  <p className="flex items-center gap-2">
                    <span>📍</span> {animal.region}
                  </p>
                  <p className="flex items-center gap-2">
                    <span>⚖️</span> {animal.weight_kg} кг
                  </p>
                  <p className="flex items-center gap-2">
                    <span>{animal.sex === "male" ? "♂" : "♀"}</span>
                    {animal.sex === "male" ? "Самец" : "Самка"}
                  </p>
                </div>
                <p className="font-mono text-xs text-forest-500/50 mb-2">
                  {animal.id}
                </p>
                <p className="text-lg font-bold text-forest-600 mb-3">
                  {formatTenge(price)}
                </p>
                <Link
                  href={`/deal/${encodeURIComponent(animal.id)}`}
                  className="btn-primary text-center text-sm"
                >
                  Подробнее
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
