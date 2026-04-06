"use client";

import { useState } from "react";
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

interface VerifyResult {
  verified: boolean;
  signature: string;
  message: string;
}

type Step = "search" | "preview" | "verified" | "registered";

export default function RegisterPage() {
  const [govId, setGovId] = useState("");
  const [step, setStep] = useState<Step>("search");
  const [animal, setAnimal] = useState<Animal | null>(null);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState("");

  async function handleSearch() {
    if (!govId.trim()) return;
    setLoading(true);
    setError("");
    setAnimal(null);

    try {
      const res = await fetch(`/api/torttulik/${encodeURIComponent(govId.trim())}`);
      if (res.status === 404) {
        setError("Животное не найдено");
        setStep("search");
        return;
      }
      if (!res.ok) throw new Error("Ошибка сервера");
      const data = await res.json();
      setAnimal(data);
      setStep("preview");
    } catch {
      setError("Ошибка сети. Попробуйте позже.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    if (!animal) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/verify-animal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gov_id: animal.id }),
      });
      if (!res.ok) throw new Error("Ошибка верификации");
      const data = await res.json();
      setVerifyResult(data);
      setStep("verified");
    } catch {
      setError("Ошибка верификации. Попробуйте позже.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister() {
    if (!animal) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/chain/register-animal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gov_id: animal.id,
          breed: animal.breed,
          birth_date: animal.birth_date,
          weight_kg: animal.weight_kg,
          sex: animal.sex,
          region: animal.region,
        }),
      });
      if (!res.ok) throw new Error("Ошибка регистрации");
      const data = await res.json();
      setTxHash(data.tx_hash);
      setStep("registered");
    } catch {
      setError("Ошибка записи на блокчейн. Попробуйте позже.");
    } finally {
      setLoading(false);
    }
  }

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

  function handleReset() {
    setGovId("");
    setStep("search");
    setAnimal(null);
    setVerifyResult(null);
    setError("");
    setTxHash("");
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <h1 className="text-2xl sm:text-3xl font-bold text-forest-600 mb-8">
        Регистрация животного
      </h1>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8 text-sm">
        {(["search", "preview", "verified", "registered"] as Step[]).map(
          (s, i) => {
            const labels = ["Поиск", "Проверка", "Верификация", "Блокчейн"];
            const isActive =
              ["search", "preview", "verified", "registered"].indexOf(step) >= i;
            return (
              <div key={s} className="flex items-center gap-2">
                {i > 0 && (
                  <div
                    className={`w-8 h-0.5 ${
                      isActive ? "bg-forest-400" : "bg-steppe-200"
                    }`}
                  />
                )}
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    isActive
                      ? "bg-forest-500 text-white"
                      : "bg-steppe-100 text-forest-600/50"
                  }`}
                >
                  {labels[i]}
                </span>
              </div>
            );
          }
        )}
      </div>

      {/* Step 1: Search */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold text-forest-600 mb-4">
          Шаг 1: Найти животное в реестре
        </h2>
        <p className="text-xs text-forest-600/50 mb-3">
          Введите номер бирки из системы TORTTULIK. Примеры:{" "}
          {["KZ-AKM-2022-000134", "KZ-KOS-2023-004782", "KZ-ALM-2024-007321"].map((id, i) => (
            <button
              key={id}
              onClick={() => { setGovId(id); }}
              className="font-mono text-forest-500 hover:underline cursor-pointer"
              disabled={step !== "search"}
            >
              {id}{i < 2 ? ", " : ""}
            </button>
          ))}
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            className="input-field flex-1"
            placeholder="KZ-AKM-2024-000001"
            value={govId}
            onChange={(e) => setGovId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            disabled={step !== "search" || loading}
          />
          <button
            className="btn-primary shrink-0"
            onClick={handleSearch}
            disabled={!govId.trim() || loading || step !== "search"}
          >
            {loading && step === "search" ? (
              <span className="flex items-center gap-2">
                <LoadingSpinner /> Поиск...
              </span>
            ) : (
              "Найти"
            )}
          </button>
        </div>
        {error && step === "search" && (
          <p className="mt-3 text-red-600 text-sm">{error}</p>
        )}
        {step !== "search" && (
          <button
            onClick={handleReset}
            className="mt-3 text-sm text-forest-500 underline hover:text-forest-600"
          >
            Новый поиск
          </button>
        )}
      </div>

      {/* Step 2: Animal preview */}
      {animal && step !== "search" && (
        <div className="card mb-6 transition-all">
          <h2 className="text-lg font-semibold text-forest-600 mb-4">
            Шаг 2: Данные животного
          </h2>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="font-mono text-sm bg-forest-50 text-forest-600 px-3 py-1 rounded-lg">
              {animal.id}
            </span>
            {vetStatusBadge(animal.vet_status)}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <InfoRow label="Порода" value={animal.breed} />
            <InfoRow
              label="Пол"
              value={animal.sex === "male" ? "Самец" : "Самка"}
            />
            <InfoRow label="Вес" value={`${animal.weight_kg} кг`} />
            <InfoRow
              label="Дата рождения"
              value={formatDate(animal.birth_date)}
            />
            <InfoRow label="Регион" value={animal.region} />
            <InfoRow label="Ферма" value={animal.farm_name} />
          </div>

          {/* Vaccinations */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-forest-600 mb-2">
              Вакцинации
            </h3>
            <div className="space-y-2">
              {animal.vaccinations.map((v, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 text-sm bg-steppe-50 rounded-lg px-3 py-2"
                >
                  <span className="w-2 h-2 rounded-full bg-forest-400 shrink-0" />
                  <span className="font-medium text-forest-700">{v.name}</span>
                  <span className="text-forest-600/50 ml-auto">
                    {formatDate(v.date)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Step 3: Verify */}
          {step === "preview" && (
            <button
              className="btn-primary w-full"
              onClick={handleVerify}
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <LoadingSpinner /> Верификация...
                </span>
              ) : (
                "Верифицировать и зарегистрировать"
              )}
            </button>
          )}

          {error && step === "preview" && (
            <p className="mt-3 text-red-600 text-sm">{error}</p>
          )}
        </div>
      )}

      {/* Verified state */}
      {step === "verified" && verifyResult && (
        <div className="card mb-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="badge-healthy text-sm">Верифицировано &#10003;</span>
          </div>
          <div className="bg-forest-50 rounded-lg p-4 mb-4">
            <p className="text-xs font-mono text-forest-600/70 break-all">
              <span className="font-semibold">Oracle подпись:</span>{" "}
              {verifyResult.signature}
            </p>
          </div>
          <button
            className="btn-primary w-full"
            onClick={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <LoadingSpinner /> Запись на блокчейн...
              </span>
            ) : (
              "Записать на блокчейн"
            )}
          </button>
          {error && (
            <p className="mt-3 text-red-600 text-sm">{error}</p>
          )}
        </div>
      )}

      {/* Registered state */}
      {step === "registered" && animal && (
        <div className="card mb-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4 text-center">
            <p className="text-green-800 font-semibold text-lg mb-1">
              Зарегистрировано на блокчейн &#10003;
            </p>
            <p className="text-green-700 text-sm">
              Животное успешно записано в реестр Solana
            </p>
          </div>
          {txHash && (
            <div className="bg-forest-50 rounded-lg p-4 mb-4">
              <p className="text-xs font-mono text-forest-600/70 break-all">
                <span className="font-semibold">TX Hash:</span> {txHash}
              </p>
            </div>
          )}
          <Link
            href={`/animal/${encodeURIComponent(animal.id)}`}
            className="btn-secondary w-full inline-block text-center"
          >
            Перейти к профилю животного
          </Link>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-forest-600/50 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-forest-700">{value}</p>
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
