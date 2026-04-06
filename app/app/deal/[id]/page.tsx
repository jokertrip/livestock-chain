"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Vaccination {
  name: string;
  date: string;
}

interface Animal {
  id: string;
  breed: string;
  birth_date: string;
  sex: string;
  weight_kg: number;
  region: string;
  farm_name: string;
  vaccinations: Vaccination[];
  vet_status: string;
  last_inspection: string;
}

type DealStatus = "not_listed" | "active" | "funded" | "completed";

interface ChainResult {
  success: boolean;
  tx_hash?: string;
  explorer_url?: string;
  error?: string;
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

function tengeToSol(tenge: number): string {
  // Approximate: 1 SOL ~ 50000 tenge for demo
  return (tenge / 50000).toFixed(2);
}

export default function DealPage() {
  const params = useParams();
  const id = params.id as string;

  const [animal, setAnimal] = useState<Animal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dealStatus, setDealStatus] = useState<DealStatus>("not_listed");
  const [processing, setProcessing] = useState(false);
  const [txHashes, setTxHashes] = useState<Record<string, string>>({});
  const [chainError, setChainError] = useState("");

  useEffect(() => {
    async function fetchAnimal() {
      try {
        const res = await fetch(`/api/torttulik/${encodeURIComponent(id)}`);
        if (res.status === 404) {
          setError("Животное не найдено");
          return;
        }
        if (!res.ok) throw new Error();
        const data = await res.json();
        setAnimal(data);
      } catch {
        setError("Ошибка загрузки данных");
      } finally {
        setLoading(false);
      }
    }
    fetchAnimal();
  }, [id]);

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("ru-RU", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  function vetStatusBadge(status: string) {
    const map: Record<string, { className: string; label: string }> = {
      healthy: { className: "badge-healthy", label: "Здоров" },
      observation: { className: "badge-observation", label: "Наблюдение" },
      quarantine: { className: "badge-quarantine", label: "Карантин" },
    };
    const info = map[status] || map.healthy;
    return <span className={info.className}>{info.label}</span>;
  }

  async function handleCreateListing() {
    if (!animal) return;
    setProcessing(true);
    setChainError("");
    try {
      const price = seededPrice(animal.id);
      const priceLamports = Math.round((price / 50000) * 1_000_000_000); // tenge to lamports
      const res = await fetch("/api/chain/create-listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gov_id: id,
          price_lamports: priceLamports,
          description: `Продажа: ${animal.breed}, ${animal.weight_kg} кг`,
        }),
      });
      const data: ChainResult = await res.json();
      if (data.success && data.tx_hash) {
        setTxHashes((prev) => ({ ...prev, listing: data.tx_hash! }));
        setDealStatus("active");
      } else {
        setChainError(data.error || "Ошибка создания листинга");
      }
    } catch {
      setChainError("Ошибка сети");
    } finally {
      setProcessing(false);
    }
  }

  async function handleBuy() {
    setProcessing(true);
    setChainError("");
    try {
      const res = await fetch("/api/chain/deposit-funds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gov_id: id }),
      });
      const data: ChainResult = await res.json();
      if (data.success && data.tx_hash) {
        setTxHashes((prev) => ({ ...prev, deposit: data.tx_hash! }));
        setDealStatus("funded");
      } else {
        setChainError(data.error || "Ошибка депозита");
      }
    } catch {
      setChainError("Ошибка сети");
    } finally {
      setProcessing(false);
    }
  }

  async function handleConfirm() {
    setProcessing(true);
    setChainError("");
    try {
      const res = await fetch("/api/chain/confirm-sale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gov_id: id }),
      });
      const data: ChainResult = await res.json();
      if (data.success && data.tx_hash) {
        setTxHashes((prev) => ({ ...prev, confirm: data.tx_hash! }));
        setDealStatus("completed");
      } else {
        setChainError(data.error || "Ошибка подтверждения");
      }
    } catch {
      setChainError("Ошибка сети");
    } finally {
      setProcessing(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card h-64 animate-pulse bg-steppe-50" />
          <div className="card h-64 animate-pulse bg-steppe-50" />
        </div>
      </div>
    );
  }

  if (error || !animal) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="card text-center py-12">
          <p className="text-forest-600/60 text-lg mb-4">
            {error || "Животное не найдено"}
          </p>
          <Link href="/marketplace" className="btn-secondary">
            Вернуться на маркетплейс
          </Link>
        </div>
      </div>
    );
  }

  const price = seededPrice(animal.id);
  const solPrice = tengeToSol(price);

  const statusSteps: { key: DealStatus; label: string }[] = [
    { key: "not_listed", label: "Листинг" },
    { key: "active", label: "Активна" },
    { key: "funded", label: "Оплачено" },
    { key: "completed", label: "Завершена" },
  ];

  const currentStepIndex = statusSteps.findIndex((s) => s.key === dealStatus);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <Link
        href="/marketplace"
        className="inline-flex items-center gap-1 text-sm text-forest-500 hover:text-forest-600 mb-6"
      >
        &larr; Маркетплейс
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Animal details */}
        <div className="card">
          <h2 className="text-xl font-bold text-forest-600 mb-4">
            {animal.breed}
          </h2>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="font-mono text-xs bg-forest-50 text-forest-600 px-3 py-1 rounded-lg">
              {animal.id}
            </span>
            {vetStatusBadge(animal.vet_status)}
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <p className="text-xs text-forest-600/50">Пол</p>
              <p className="text-sm font-medium text-forest-700">
                {animal.sex === "male" ? "Самец" : "Самка"}
              </p>
            </div>
            <div>
              <p className="text-xs text-forest-600/50">Вес</p>
              <p className="text-sm font-medium text-forest-700">
                {animal.weight_kg} кг
              </p>
            </div>
            <div>
              <p className="text-xs text-forest-600/50">Регион</p>
              <p className="text-sm font-medium text-forest-700">
                {animal.region}
              </p>
            </div>
            <div>
              <p className="text-xs text-forest-600/50">Ферма</p>
              <p className="text-sm font-medium text-forest-700">
                {animal.farm_name}
              </p>
            </div>
          </div>

          <div className="border-t border-steppe-100 pt-4 mb-4">
            <p className="text-xs text-forest-600/50 mb-1">Вакцинации</p>
            <p className="text-sm font-medium text-forest-700">
              {animal.vaccinations.length} записей
            </p>
            <div className="mt-2 space-y-1">
              {animal.vaccinations.map((v, i) => (
                <p key={i} className="text-xs text-forest-600/60">
                  {v.name} — {formatDate(v.date)}
                </p>
              ))}
            </div>
          </div>

          <div className="border-t border-steppe-100 pt-4">
            <p className="text-xs text-forest-600/50 mb-1">
              Последний осмотр
            </p>
            <p className="text-sm font-medium text-forest-700">
              {formatDate(animal.last_inspection)}
            </p>
          </div>
        </div>

        {/* Right: Deal flow */}
        <div className="space-y-4">
          <div className="card">
            <h2 className="text-lg font-bold text-forest-600 mb-4">Сделка</h2>

            {/* Status indicator */}
            <div className="flex items-center gap-2 mb-6">
              {statusSteps.map((s, i) => (
                <div key={s.key} className="flex items-center gap-2">
                  {i > 0 && (
                    <div
                      className={`w-6 h-0.5 ${
                        i <= currentStepIndex
                          ? "bg-forest-400"
                          : "bg-steppe-200"
                      }`}
                    />
                  )}
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      i <= currentStepIndex
                        ? "bg-forest-500 text-white"
                        : "bg-steppe-100 text-forest-600/50"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Price */}
            <div className="bg-steppe-50 rounded-lg p-4 mb-6">
              <p className="text-xs text-forest-600/50 mb-1">Цена</p>
              <p className="text-2xl font-bold text-forest-600">
                {formatTenge(price)}
              </p>
              <p className="text-sm text-forest-600/50 mt-1">
                ~{solPrice} SOL
              </p>
            </div>

            {/* Deal actions */}
            {dealStatus === "not_listed" && (
              <button
                className="btn-primary w-full text-lg py-3"
                onClick={handleCreateListing}
                disabled={processing}
              >
                {processing ? (
                  <span className="flex items-center justify-center gap-2">
                    <LoadingSpinner /> Создание листинга...
                  </span>
                ) : (
                  "Выставить на продажу"
                )}
              </button>
            )}

            {dealStatus === "active" && (
              <button
                className="btn-primary w-full text-lg py-3"
                onClick={handleBuy}
                disabled={processing}
              >
                {processing ? (
                  <span className="flex items-center justify-center gap-2">
                    <LoadingSpinner /> Обработка...
                  </span>
                ) : (
                  "Купить"
                )}
              </button>
            )}

            {dealStatus === "funded" && (
              <div className="space-y-3">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                  <p className="text-yellow-800 font-medium text-sm">
                    Ожидание подтверждения продавца
                  </p>
                </div>
                <button
                  className="btn-primary w-full"
                  onClick={handleConfirm}
                  disabled={processing}
                >
                  {processing ? (
                    <span className="flex items-center justify-center gap-2">
                      <LoadingSpinner /> Подтверждение...
                    </span>
                  ) : (
                    "Подтвердить передачу"
                  )}
                </button>
              </div>
            )}

            {dealStatus === "completed" && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <p className="text-green-800 font-semibold text-lg mb-1">
                  Сделка завершена &#10003;
                </p>
                <p className="text-green-700 text-sm">
                  Право собственности успешно передано
                </p>
              </div>
            )}
          </div>

          {/* Verified history */}
          <div className="card bg-forest-50/50">
            <h3 className="text-sm font-semibold text-forest-600 mb-2">
              Верификация
            </h3>
            <p className="text-xs text-forest-600/60">
              Данные верифицированы через блокчейн-оракул
            </p>
          </div>

          {/* Chain error */}
          {chainError && (
            <div className="card bg-red-50 border border-red-200">
              <p className="text-sm text-red-700">{chainError}</p>
            </div>
          )}

          {/* Transaction hashes */}
          <div className="card bg-forest-50/50">
            <h3 className="text-sm font-semibold text-forest-600 mb-2">
              Транзакции
            </h3>
            {Object.keys(txHashes).length > 0 ? (
              <div className="space-y-2">
                {txHashes.listing && (
                  <div>
                    <p className="text-xs text-forest-600/60 mb-0.5">Листинг:</p>
                    <a
                      href={`https://explorer.solana.com/tx/${txHashes.listing}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-mono text-forest-500 hover:underline break-all"
                    >
                      {txHashes.listing}
                    </a>
                  </div>
                )}
                {txHashes.deposit && (
                  <div>
                    <p className="text-xs text-forest-600/60 mb-0.5">Депозит:</p>
                    <a
                      href={`https://explorer.solana.com/tx/${txHashes.deposit}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-mono text-forest-500 hover:underline break-all"
                    >
                      {txHashes.deposit}
                    </a>
                  </div>
                )}
                {txHashes.confirm && (
                  <div>
                    <p className="text-xs text-forest-600/60 mb-0.5">Подтверждение:</p>
                    <a
                      href={`https://explorer.solana.com/tx/${txHashes.confirm}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-mono text-forest-500 hover:underline break-all"
                    >
                      {txHashes.confirm}
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-forest-600/40 font-mono">
                Будет доступно после записи в блокчейн
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <svg
      className="animate-spin h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
