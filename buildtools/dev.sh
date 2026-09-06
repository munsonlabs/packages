#!/usr/bin/env bash
set -euo pipefail

COMPOSE="docker compose -f buildtools/containers/docker-compose.yml"
NETWORK="munsonlabs-network-shared"

ensure_network() {
  docker network inspect "$NETWORK" &>/dev/null || docker network create "$NETWORK"
}

build_filters() {
  local filters=""
  for pkg in "$@"; do
    filters="$filters --filter $pkg"
  done
  echo "$filters"
}

case "${1:-}" in
  up)
    ensure_network
    shift
    [ $# -gt 0 ] && export VPF_FILTERS="$(build_filters "$@")"
    $COMPOSE up traefik verdaccio web docs -d
    ;;
  docs)
    ensure_network
    $COMPOSE up traefik docs -d
    ;;
  registry)
    ensure_network
    $COMPOSE up traefik verdaccio -d
    ;;
  build)
    $COMPOSE build --no-cache "${2:-web}"
    ;;
  down)
    $COMPOSE down
    ;;
  restart)
    $COMPOSE down
    ensure_network
    $COMPOSE up traefik verdaccio web docs -d
    ;;
  clean)
    $COMPOSE down -v
    ;;
  ps)
    $COMPOSE ps
    ;;
  logs)
    $COMPOSE logs -f "${2:-}"
    ;;
  shell)
    $COMPOSE exec -it "${2:-web}" bash
    ;;
  web)
    ensure_network
    $COMPOSE up traefik -d
    $COMPOSE run --service-ports "${2:-web}" bash
    ;;
  publish)
    $COMPOSE exec web vp i && vp run publish:local
    ;;
  *)
    echo ""
    echo "buildtools"
    echo ""
    echo "Usage:"
    echo "  ./buildtools/dev.sh <command> [service]"
    echo ""
    echo "Commands:"
    echo "  build [service]  Rebuild image (default: web)"
    echo "  up [pkg...]      Start all services; optionally limit to specific packages"
    echo "  docs             Start traefik + docs only"
    echo "  registry         Start registry only (traefik + verdaccio)"
    echo "  publish          Publish packages to local Verdaccio registry"
    echo "  restart          Restart all services"
    echo "  down             Stop all services"
    echo "  clean            Stop services and remove volumes"
    echo "  ps               Show running services"
    echo "  logs [service]   Tail logs (all or specific service)"
    echo "  shell [service]  Shell into a running container (default: web)
  web [service]    Run a new container with service ports published (default: web)"
    echo ""
    echo "Options:"
    echo "  -h, --help  Display this message"
    exit 1
    ;;
esac
