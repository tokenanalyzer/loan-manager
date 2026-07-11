.PHONY: setup install lint format test docker-up docker-down clean

setup:
	bash scripts/setup.sh

install:
	pnpm install
	melos bootstrap

lint:
	pnpm lint
	melos run analyze

format:
	pnpm format
	melos run format:fix

test:
	pnpm test
	melos run test

docker-up:
	docker compose -f infra/docker/docker-compose.yml up -d

docker-down:
	docker compose -f infra/docker/docker-compose.yml down

clean:
	pnpm clean
	melos run clean
