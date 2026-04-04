# Livestock Chain

Платформа цифрового учёта и торговли скотом в Казахстане с on-chain верификацией на Solana.

## Devnet Program IDs

| Программа | Program ID |
|---|---|
| `livestock_registry` | `2k1D6hQqgPpcbJxqwsyfXsD5KLyiXVcLa8xbCguWGDTQ` |
| `marketplace_escrow` | `4q2iYDHURLPT1xcU6k74v3G3uKUr1e7MamGyVdq13zqF` |
| `$LIVESTOCK SPL Token` | `HkUddt9Nm2Wx1USjNhCrYuVo2t5dprExvxHAJhudpefr` |

[Solana Explorer (devnet)](https://explorer.solana.com/address/2k1D6hQqgPpcbJxqwsyfXsD5KLyiXVcLa8xbCguWGDTQ?cluster=devnet)

## Стек

- **Blockchain**: Solana (devnet), Anchor Framework 0.29
- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Мок API**: TORTTULIK (гос. система идентификации скота в Казахстане)
- **NFT**: Compressed NFTs через Metaplex Bubblegum
- **Token**: $LIVESTOCK SPL Token — reward за регистрацию животных

## Быстрый старт

```bash
# 1. Установить зависимости
cd app && npm install

# 2. Запустить фронтенд (мок API встроен через API routes)
npm run dev
# -> http://localhost:3000

# 3. (Опционально) Собрать и задеплоить контракты
anchor build
anchor deploy --provider.cluster devnet

# 4. Тесты (7/7 passing)
solana-test-validator --reset --quiet &
anchor deploy --provider.cluster localnet
anchor test --skip-deploy --skip-local-validator --skip-build --provider.cluster localnet
```

## Как это работает

1. Фермер вводит номер бирки из системы TORTTULIK
2. Платформа подтягивает данные из гос. API (порода, вес, вакцинации)
3. Oracle верифицирует данные и подписывает их
4. Данные записываются on-chain в AnimalRecord PDA
5. Минтится cNFT — цифровой паспорт животного
6. Фермер получает 10 $LIVESTOCK токенов как reward
7. Животное можно выставить на маркетплейс с escrow-сделкой

Блокчейн невидим для пользователя — кошелёк создаётся на бэкенде.

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
│   │   ├── api/torttulik/     # Мок TORTTULIK API
│   │   └── api/verify-animal/ # Oracle верификация
│   └── lib/                   # Solana, Anchor, Bubblegum клиенты
├── mock-api/
│   └── db.json                # 106 записей казахского скота
├── tests/                     # Anchor тесты (7/7 passing)
└── Anchor.toml
```

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
