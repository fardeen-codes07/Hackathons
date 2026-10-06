# RIPPLE local neural predictive layer

## Purpose

RIPPLE uses a small local neural network to project operational conditions from a campus state and a scenario. It does not replace the deterministic ripple engine. The product boundary is:

`campus state + scenario → local neural projection → deterministic ripple → decision intelligence`

The model is a predictive component inside the existing Predictive Signals panel, not a new product mode.

## Dataset and teacher

`npm run train:neural` first runs `scripts/generate_neural_dataset.ts`. That generator creates 12,000 reproducible samples with seed `42017`. Each sample varies active students, current utilization, faculty load, transport load, campus stability, severity, duration, target building capacity/schedule ratios, start time, event/weather/infrastructure intensity, affected systems, and scenario kind.

Ground-truth targets are produced by calling the existing `runSimulation()` for each scenario. The current-state variations apply transparent sensitivity adjustments around the same engine output so the dataset covers plausible campus conditions without inventing an independent label system. The generated dataset is validated for finite/range-safe values, duplicates, distribution and target bounds before training. The full generated dataset is intentionally ignored from source control; the generator is the reproducible source.

## Features and targets

There are 24 inputs: five current campus metrics, severity, duration, three target capacity/schedule ratios, start-time fraction, event/weather/infrastructure severity, five affected-system flags, and five one-hot scenario-kind flags. Categorical values are explicitly encoded; IDs are not treated as continuous values.

The six regression targets are projected room utilization, projected transport load, projected student movement, projected faculty conflicts, projected campus stability, and projected recovery hours.

## Split and preprocessing

The trainer deterministically shuffles rows with seed `42017` and uses 70% train, 15% validation, and 15% test. The test set is not used for architecture selection. Feature and target standard-score means/stddevs are fit from train rows only and exported inside the artifact. The same train-fitted values are applied to validation, test, and browser inference.

## Training and export

`scripts/train_neural_model.py` uses only the Python standard library. It performs genuine mini-batch gradient descent with backpropagation, ReLU hidden layers, momentum, deterministic initialization, validation-based early stopping, and evaluates small, medium, and large MLP candidates. Candidate selection uses validation MAE with a parameter-count tie preference; held-out test metrics are calculated only after selection.

The selected artifact is `src/data/neuralModel.json` in `ripple-mlp-json-v1` format. It contains the architecture, weights, biases, feature/target metadata, train-only preprocessing, seed, split counts, candidate metrics, selected-model metrics, parameter count, and limitations. The Next.js application performs the model's forward pass locally in `src/engine/neuralInference.ts`; it does not download weights or call an API.

## Application inference and fallback

`src/engine/predictiveModel.ts` keeps the existing deterministic preview and adds the neural result. Before a run, the UI shows the rule-based preview. During and after a run, the Predictive Signals cards consume the actual exported-model outputs and show the model source, measured local pass time, confidence basis, and an expandable disclosure. If the artifact is absent, invalid, or produces a non-finite result, the code returns an explicit deterministic fallback and the UI says `Predictive model unavailable — deterministic simulation active.`

Model confidence is not a claim of real-world probability. It is derived from the measured held-out test MAE and the distance of the current feature vector from the training distribution. The causal simulation confidence and intervention recommendation remain separate concepts.

## Limitations and production path

The model learns deterministic synthetic labels from the RIPPLE simulation environment. It demonstrates a real local training/export/inference architecture, but it is not calibrated to live campus telemetry and should not be used as an operational forecast. Production deployment would require:

`real campus data → ingestion → validation/normalization → digital twin → predictive model → scenario engine → intervention simulation → comparison → explainable recommendation → human approval`

That path needs historical backtesting, drift monitoring, calibration, uncertainty evaluation, access controls, and explicit operator review. The current product always keeps human approval visible and treats the model as decision support.
