# Livestock Chain

Платформа цифрового учёта и торговли скотом в Казахстане с on-chain верификацией на Solana.

**Демо:** https://app-eta-self-81.vercel.app

## Devnet

| Ресурс | Адрес |
|---|---|
| `livestock_registry` | [`2k1D6hQqgPpcbJxqwsyfXsD5KLyiXVcLa8xbCguWGDTQ`](https://explorer.solana.com/address/2k1D6hQqgPpcbJxqwsyfXsD5KLyiXVcLa8xbCguWGDTQ?cluster=devnet) |
| `marketplace_escrow` | [`4q2iYDHURLPT1xcU6k74v3G3uKUr1e7MamGyVdq13zqF`](https://explorer.solana.com/address/4q2iYDHURLPT1xcU6k74v3G3uKUr1e7MamGyVdq13zqF?cluster=devnet) |
| `$LIVESTOCK` SPL Token | [`HkUddt9Nm2Wx1USjNhCrYuVo2t5dprExvxHAJhudpefr`](https://explorer.solana.com/address/HkUddt9Nm2Wx1USjNhCrYuVo2t5dprExvxHAJhudpefr?cluster=devnet) |

## Стек

- **Blockchain**: Solana (devnet), Anchor 0.29
- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **NFT**: Compressed NFTs (Metaplex Bubblegum)
- **Token**: $LIVESTOCK SPL Token — reward за регистрацию
- **Oracle**: Верификация данных из гос. реестра TORTTULIK

## Быстрый старт

```bash
cd app && npm install && npm run dev
```

Открыть http://localhost:3000

## Как это работает

1. Фермер вводит номер бирки из системы TORTTULIK
2. Платформа подтягивает данные из гос. API (порода, вес, вакцинации)
3. Oracle верифицирует данные и подписывает их
4. Данные записываются on-chain в AnimalRecord PDA
5. Минтится cNFT — цифровой паспорт животного с метаданными
6. Фермер получает 10 $LIVESTOCK токенов как reward
7. Животное можно выставить на маркетплейс с escrow-сделкой

Блокчейн невидим для пользователя — кошелёк создаётся на бэкенде.

## Anchor-программы

### livestock_registry
- `register_animal` — регистрация с oracle-верификацией, создаёт AnimalRecord PDA
- `update_record` — обновление веса, вакцинаций (только owner)
- `transfer_ownership` — передача владения (только owner)

### marketplace_escrow
- `create_listing` — выставить на продажу (создаёт Listing PDA)
- `deposit_funds` — покупатель депонирует SOL в vault PDA
- `confirm_sale` — продавец подтверждает, escrow → продавцу, CPI transfer_ownership
- `cancel_listing` — отмена с возвратом средств покупателю

## Тесты

```
  livestock-registry
    ✔ registers an animal
    ✔ updates animal record
    ✔ transfers ownership
    ✔ FAIL: register duplicate gov_id
    ✔ FAIL: update_record from non-owner
    ✔ FAIL: transfer_ownership from non-owner
    ✔ FAIL: register with invalid weight (0)

  7 passing
```

## Структура

```
livestock-chain/
├── programs/
│   ├── livestock-registry/    # Anchor: регистрация, обновление, передача
│   └── marketplace-escrow/    # Anchor: листинг, escrow, сделки
├── app/                       # Next.js 14 фронтенд
│   ├── app/
│   │   ├── page.tsx           # Дашборд (Ферма Наурыз)
│   │   ├── my-animals/        # Мои животные
│   │   ├── register/          # Регистрация животного
│   │   ├── animal/[id]/       # Профиль животного
│   │   ├── marketplace/       # Маркетплейс
│   │   ├── deal/[id]/         # Страница сделки (escrow)
│   │   ├── api/chain/         # On-chain API (Anchor + SPL + Bubblegum)
│   │   ├── api/metadata/      # cNFT метадата (Metaplex JSON)
│   │   ├── api/torttulik/     # Мок TORTTULIK API
│   │   └── api/verify-animal/ # Oracle верификация
│   └── lib/                   # Solana, Anchor, Bubblegum клиенты
├── mock-api/
│   └── db.json                # 106 записей казахского скота
├── tests/                     # Anchor тесты (7/7 passing)
└── Anchor.toml
```
