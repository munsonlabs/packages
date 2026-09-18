# @munsonlabs/shipkit

Shared build tooling for Munson Labs packages. Provides the `shipkit` CLI, shared vite configs, and shared tsconfigs used across all `@munsonlabs/*` packages.

[![npm](https://img.shields.io/npm/v/@munsonlabs/shipkit)](https://www.npmjs.com/package/@munsonlabs/shipkit)

## Installation

```bash
npm install --save-dev @munsonlabs/shipkit vite-plus
```

`vite-plus` is a required peer dependency.

## Usage

```bash
shipkit init library   # scaffold a vite.config.ts for a @munsonlabs/* package
shipkit deploy         # publish (local, snapshot, or via changesets)
```

## Docs

CLI reference, vite configs, and tsconfigs: **https://munsonlabs.github.io/packages/shipkit/introduction**
