# RIPPLE

RIPPLE is a local-only decision-intelligence prototype for complex systems, beginning with a campus operations vertical.

It demonstrates one reliable loop:

`select a disruption → simulate the ripple → compare interventions → optimize → explain`

The application uses deterministic TypeScript simulation rules, deterministic synthetic local data, and a small locally trained tabular neural network in the predictive layer. There is no backend, authentication, persistence, external API, or hosted ML service. The visible disclosure is intentional: the outputs are representative prototype results, not official operational telemetry.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3001` for the thesis page or `http://localhost:3001/sandbox` for the product surface.

## Verification

```bash
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

The Tier 0 Golden Path is covered in `tests/golden-path.spec.ts`. The pure simulation engine and deterministic decision score are covered by unit tests.

The local model can be regenerated with `npm run train:neural`. It generates labels through the existing TypeScript simulation engine, trains and evaluates several MLP candidates in `scripts/train_neural_model.py`, and exports the selected JSON artifact to `src/data/neuralModel.json`. See `docs/NEURAL_NETWORK.md` for the model boundary and limitations.
