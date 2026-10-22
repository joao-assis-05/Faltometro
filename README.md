# Faltômetro — controle de faltas universitárias

App em React + TypeScript + Tailwind CSS para acompanhar a frequência por disciplina e evitar reprovação por falta. Os dados ficam no `localStorage` do navegador.

## Como rodar

```bash
npm install
npm run dev
```

Abra o endereço mostrado no terminal (normalmente http://localhost:5173).

Para gerar a versão de produção: `npm run build` (saída em `dist/`).

## Estrutura

```
src/
  types.ts                 Tipos (Subject, AbsenceRecord, FilterOptions, SubjectStats...)
  hooks/useLocalStorage.ts Hook de persistência (salva automático + sincroniza abas)
  utils/calculations.ts    Regras de frequência, limite e status
  utils/backup.ts          Exportar/importar JSON com validação
  utils/date.ts, id.ts     Datas no fuso local e geração de IDs
  data/mockData.ts         Disciplinas e faltas de exemplo
  components/
    DashboardStats.tsx     Frequência média e contadores
    SubjectCard.tsx        Card da disciplina com +1 falta
    ProgressBar.tsx        Barra de consumo do limite (em "quadradinhos")
    AddSubjectModal.tsx    Cadastro/edição de disciplina
    AbsenceLogModal.tsx    Registro detalhado + histórico com edição/exclusão
    SimulatorModal.tsx     "Posso faltar?"
    Modal.tsx, Switch.tsx, Toast.tsx
  App.tsx                  Estado global, filtros e ações
```

## Regras de cálculo

- Máximo de faltas = `floor(carga total × limite% / 100)`
- Frequência = `((total − faltas contadas) / total) × 100`
- Faltas **abonadas** ficam no histórico mas não contam no limite; faltas apenas **justificadas** contam.
- Status: 🟢 < 50% do limite · 🟡 50–80% (ou frequência < 85%) · 🔴 > 80% (ou frequência < 75%) · 🟣 limite ultrapassado.

## Usando no Next.js

Os componentes funcionam no Next.js (App Router) adicionando `'use client';` no topo de `App.tsx` e renderizando `<App />` em `app/page.tsx`. Copie a configuração de `tailwind.config.js` (fontes, cores `ink`/`caneta` e animações) e o conteúdo de `src/index.css` para o `globals.css`.
