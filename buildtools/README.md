# buildtools

Local development infrastructure for Munson Labs packages. Contains Docker configuration for the shared network services and helper scripts.

## Structure

```
buildtools/
  containers/
    docker-compose.yml   # service definitions (traefik, verdaccio, web, docs)
    Dockerfile           # node:25-alpine image for the web and docs services
  verdaccio/
    config.yaml          # Verdaccio registry configuration
  .npmrc.local           # npm config routing @munsonlabs/* through Verdaccio
  dev.sh                 # CLI wrapper for docker compose commands
```

## dev.sh

Run from the repo root.

```bash
./buildtools/dev.sh <command> [service]
```

| Command           | Description                                        |
| ----------------- | -------------------------------------------------- |
| `up`              | Start all services (traefik, verdaccio, web, docs) |
| `docs`            | Start traefik + docs only                          |
| `registry`        | Start registry only (traefik + verdaccio)          |
| `publish`         | Publish packages to local Verdaccio registry       |
| `down`            | Stop all services                                  |
| `build [service]` | Rebuild image without cache (default: web)         |
| `ps`              | Show running services                              |
| `logs [service]`  | Tail logs — all services or a specific one         |
| `shell [service]` | Shell into a container (default: web)              |

The shared Docker network (`munsonlabs-network-shared`) is created automatically on `up` and `registry` if it doesn't already exist.

## Registry config

`buildtools/.npmrc.local` configures npm to route `@munsonlabs/*` packages through Verdaccio. Inside Docker this is automatic. Outside Docker, export it for your session:

```bash
export NPM_CONFIG_USERCONFIG=buildtools/.npmrc.local
```

You can also copy it to `.npmrc` in the repo root (`cp buildtools/.npmrc.local .npmrc`) but you won't pick up future changes to the file automatically.

To publish packages to the local registry:

```bash
./buildtools/dev.sh up      # or: dev.sh registry + dev.sh web separately
./buildtools/dev.sh publish
```

From the host, `npm run publish:local` does the same thing without the containers, given a
`VERDACCIO_URL`:

```bash
docker compose up -d verdaccio    # http://localhost:4873
VERDACCIO_URL=http://localhost:4873 npm run publish:local
```

Either route runs `shipkit deploy --local --scope @munsonlabs/`, which publishes every non-private
`@munsonlabs/*` package under a `-local.<timestamp>` version, leaving changesets and git untouched.

To install one in another project, either point npm at the registry for the whole project with the
`.npmrc` above, or name it per install:

```bash
npm install @munsonlabs/video-player --registry=http://localhost:4873
```

## Services

### Traefik

Reverse proxy that routes `*.localhost` hostnames to the correct containers. Dashboard available at http://localhost:8080.

### Verdaccio

Local npm registry for `@munsonlabs/*` packages. Accessible at:

| Context       | URL                                    |
| ------------- | -------------------------------------- |
| Host machine  | `http://munsonlabs-registry.localhost` |
| Inside Docker | `http://verdaccio:4873`                |

`@munsonlabs/*` packages are open for anonymous access and publish. All other packages proxy through to npmjs.org. Package storage is persisted in the `verdaccio-storage` named Docker volume.

### Web

Builds from `buildtools/containers/Dockerfile` using the repo root as context. The container has:

- `vp` available globally (symlinked from `node_modules/.bin` after `npm install`)
- `VERDACCIO_URL=http://verdaccio:4873` pre-set so `shipkit deploy --local` works without extra config
- `FORCE_COLOR=1` for coloured terminal output

Serves the demo apps:

| App                 | URL                                        | Port |
| ------------------- | ------------------------------------------ | ---- |
| `video-player-demo` | `http://munsonlabs-video-player.localhost` | 5176 |

### Docs

Documentation site built with Nuxt. Accessible at:

| Context      | URL                                |
| ------------ | ---------------------------------- |
| Host machine | `http://munsonlabs-docs.localhost` |

Runs on port 3000 inside the container.

## Consuming packages from Verdaccio

In any repo that needs `@munsonlabs/*` packages, add the following to its `.npmrc`:

```ini
@munsonlabs:registry=http://munsonlabs-registry.localhost

# dummy token — Verdaccio accepts any value for anonymous packages
//munsonlabs-registry.localhost/:_authToken=local
```

Then install using the `local` dist-tag:

```bash
npm install @munsonlabs/video-player@local
```

This requires Traefik and Verdaccio to be running (`./buildtools/dev.sh registry`) and the package to have been published (`shipkit deploy --local`).

## Network

All services share the external `munsonlabs-network-shared` bridge network. This allows cross-project container communication — other repos on the same machine can connect to Verdaccio and Traefik by joining the same network.
