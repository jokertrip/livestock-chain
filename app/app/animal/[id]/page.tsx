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

export default function AnimalProfilePage() {
  const params = useParams();
  const id = params.id as string;

  const [animal, setAnimal] = useState<Animal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [updateForm, setUpdateForm] = useState({
    weight_kg: "",
    vaccination: "",
    notes: "",
  });
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [chainInfo, setChainInfo] = useState<{ pda: string; exists: boolean } | null>(null);

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
    async function checkChain() {
      try {
        const res = await fetch(`/api/chain/check-animal?gov_id=${encodeURIComponent(id)}`);
        if (res.ok) {
          const data = await res.json();
          setChainInfo(data);
        }
      } catch { /* non-critical */ }
    }
    fetchAnimal();
    checkChain();
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

  async function handleUpdate() {
    setUpdateLoading(true);
    try {
      const res = await fetch("/api/update-record", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gov_id: id, ...updateForm }),
      });
      if (!res.ok) throw new Error();
      setUpdateSuccess(true);
      setTimeout(() => {
        setShowUpdateForm(false);
        setUpdateSuccess(false);
        setUpdateForm({ weight_kg: "", vaccination: "", notes: "" });
      }, 2000);
    } catch {
      // silently fail
    } finally {
      setUpdateLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="space-y-6">
          <div className="h-24 bg-steppe-50 rounded-xl animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-16 bg-steppe-50 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !animal) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="card text-center py-12">
          <p className="text-forest-600/60 text-lg mb-4">
            {error || "Животное не найдено"}
          </p>
          <Link href="/" className="btn-secondary">
            На главную
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Hero */}
      <div className="card mb-6">
        <div className="bg-steppe-50 rounded-lg h-48 flex items-center justify-center mb-4">
          <span className="text-7xl opacity-60">
            {animal.sex === "male" ? "🐂" : "🐄"}
          </span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-forest-600">
            {animal.breed}
          </h1>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs bg-forest-50 text-forest-600 px-3 py-1 rounded-lg">
              {animal.id}
            </span>
            {vetStatusBadge(animal.vet_status)}
          </div>
        </div>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <InfoCard label="Пол" value={animal.sex === "male" ? "Самец" : "Самка"} icon="♂♀" />
        <InfoCard label="Вес" value={`${animal.weight_kg} кг`} icon="⚖️" />
        <InfoCard label="Дата рождения" value={formatDate(animal.birth_date)} icon="📅" />
        <InfoCard label="Регион" value={animal.region} icon="📍" />
        <InfoCard label="Ферма" value={animal.farm_name} icon="🏠" />
        <InfoCard
          label="Последний осмотр"
          value={formatDate(animal.last_inspection)}
          icon="🩺"
        />
      </div>

      {/* Vaccinations timeline */}
      <div className="card mb-6">
        <h2 className="text-lg font-bold text-forest-600 mb-4">Вакцинации</h2>
        <div className="relative">
          <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-steppe-200" />
          <div className="space-y-4">
            {animal.vaccinations.map((v, i) => (
              <div key={i} className="relative flex items-start gap-4 pl-8">
                <div className="absolute left-1.5 top-1.5 w-3 h-3 rounded-full bg-forest-400 border-2 border-white" />
                <div>
                  <p className="font-medium text-sm text-forest-700">
                    {v.name}
                  </p>
                  <p className="text-xs text-forest-600/50">
                    {formatDate(v.date)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <button
          className="btn-secondary flex-1"
          onClick={() => setShowUpdateForm(!showUpdateForm)}
        >
          Обновить данные
        </button>
        <Link
          href={`/marketplace/create?animal=${encodeURIComponent(animal.id)}`}
          className="btn-primary flex-1 text-center"
        >
          Выставить на продажу
        </Link>
      </div>

      {/* Update form */}
      {showUpdateForm && (
        <div className="card mb-6">
          <h3 className="text-base font-semibold text-forest-600 mb-4">
            Обновить данные
          </h3>
          {updateSuccess ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <p className="text-green-800 font-medium">
                Данные обновлены &#10003;
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-forest-600/60 mb-1">
                  Новый вес (кг)
                </label>
                <input
                  type="number"
                  className="input-field"
                  placeholder="Например: 450"
                  value={updateForm.weight_kg}
                  onChange={(e) =>
                    setUpdateForm((f) => ({ ...f, weight_kg: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="block text-xs text-forest-600/60 mb-1">
                  Новая вакцинация
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Название вакцины"
                  value={updateForm.vaccination}
                  onChange={(e) =>
                    setUpdateForm((f) => ({
                      ...f,
                      vaccination: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="block text-xs text-forest-600/60 mb-1">
                  Заметки
                </label>
                <textarea
                  className="input-field min-h-[80px]"
                  placeholder="Дополнительная информация..."
                  value={updateForm.notes}
                  onChange={(e) =>
                    setUpdateForm((f) => ({ ...f, notes: e.target.value }))
                  }
                />
              </div>
              <button
                className="btn-primary w-full"
                onClick={handleUpdate}
                disabled={updateLoading}
              >
                {updateLoading ? "Сохранение..." : "Сохранить"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* On-chain info */}
      <div className="card bg-forest-50/50">
        <h2 className="text-lg font-bold text-forest-600 mb-3">
          Блокчейн данные
        </h2>
        {chainInfo?.exists ? (
          <div className="space-y-2 text-sm">
            <div className="flex flex-col gap-1">
              <span className="text-forest-600/60">On-chain аккаунт (PDA):</span>
              <a
                href={`https://explorer.solana.com/address/${chainInfo.pda}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs text-forest-500 hover:underline break-all"
              >
                {chainInfo.pda}
              </a>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-forest-600/60">cNFT метадата:</span>
              <a
                href={`/api/metadata/${encodeURIComponent(animal.id)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs text-forest-500 hover:underline"
              >
                Открыть JSON
              </a>
            </div>
            <div className="mt-2">
              <span className="badge-healthy">Записано на блокчейн &#10003;</span>
            </div>
          </div>
        ) : (
          <div className="space-y-2 text-sm">
            <p className="text-forest-600/40">
              Животное ещё не зарегистрировано на блокчейне
            </p>
            <Link href="/register" className="btn-primary inline-block text-sm">
              Зарегистрировать
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: string;
}) {
  return (
    <div className="card flex items-center gap-3">
      <span className="text-xl">{icon}</span>
      <div>
        <p className="text-xs text-forest-600/50">{label}</p>
        <p className="text-sm font-medium text-forest-700">{value}</p>
      </div>
    </div>
  );
}
