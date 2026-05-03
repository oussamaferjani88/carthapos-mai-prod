# Makefile pour le système POS
# Automatise les tâches de build, test et déploiement

.PHONY: help install build test clean dev-admin dev-backend dev-pos generate-license build-pos

# Variables
BACKEND_DIR = backend
ADMIN_DIR = admin
POS_TEMPLATE_DIR = pos-template
SCRIPTS_DIR = scripts

help: ## Affiche cette aide
	@echo "Système POS - Commandes disponibles:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

install: ## Installe toutes les dépendances
	@echo "📦 Installation des dépendances..."
	cd $(BACKEND_DIR) && npm install
	cd $(ADMIN_DIR) && pnpm install
	cd $(POS_TEMPLATE_DIR) && pnpm install
	cd $(SCRIPTS_DIR) && npm install
	@echo "✅ Installation terminée"

dev-backend: ## Lance le serveur backend en mode développement
	@echo "🚀 Démarrage du backend..."
	cd $(BACKEND_DIR) && npm run dev

dev-admin: ## Lance l'interface admin en mode développement
	@echo "🚀 Démarrage de l'interface admin..."
	cd $(ADMIN_DIR) && pnpm run dev

dev-pos: ## Lance le template POS en mode développement
	@echo "🚀 Démarrage du template POS..."
	cd $(POS_TEMPLATE_DIR) && pnpm run electron-dev

build-admin: ## Build l'interface admin pour la production
	@echo "🔨 Build de l'interface admin..."
	cd $(ADMIN_DIR) && pnpm run build

build-pos-template: ## Build le template POS
	@echo "🔨 Build du template POS..."
	cd $(POS_TEMPLATE_DIR) && pnpm run build

generate-license: ## Génère un template de licence
	@echo "🔐 Génération d'un template de licence..."
	cd $(SCRIPTS_DIR) && node generate-license.js template ../examples/license-template.json
	@echo "📄 Template créé dans examples/license-template.json"

build-pos: ## Génère une application POS personnalisée (nécessite un fichier de config)
	@echo "📦 Génération d'une application POS..."
	@if [ -z "$(CONFIG)" ]; then \
		echo "❌ Erreur: Spécifiez un fichier de configuration avec CONFIG=path/to/config.json"; \
		exit 1; \
	fi
	@if [ -z "$(OUTPUT)" ]; then \
		echo "❌ Erreur: Spécifiez un dossier de sortie avec OUTPUT=path/to/output"; \
		exit 1; \
	fi
	cd $(SCRIPTS_DIR) && node build-pos.js $(CONFIG) $(OUTPUT)

test-license: ## Teste la génération et vérification de licence
	@echo "🧪 Test du système de licence..."
	mkdir -p examples
	cd $(SCRIPTS_DIR) && node generate-license.js template ../examples/test-license.json
	cd $(SCRIPTS_DIR) && node generate-license.js generate ../examples/test-license.json ../examples/test-license.key
	cd $(SCRIPTS_DIR) && node generate-license.js verify ../examples/test-license.key
	@echo "✅ Test de licence réussi"

clean: ## Nettoie les fichiers de build
	@echo "🧹 Nettoyage..."
	rm -rf $(BACKEND_DIR)/node_modules
	rm -rf $(ADMIN_DIR)/node_modules
	rm -rf $(ADMIN_DIR)/dist
	rm -rf $(POS_TEMPLATE_DIR)/node_modules
	rm -rf $(POS_TEMPLATE_DIR)/dist
	rm -rf $(SCRIPTS_DIR)/node_modules
	rm -rf examples
	rm -rf generated-pos
	rm -rf temp-build
	@echo "✅ Nettoyage terminé"

setup-db: ## Configure la base de données (Prisma)
	@echo "🗄️ Configuration de la base de données..."
	cd $(BACKEND_DIR) && npx prisma migrate dev --name init
	cd $(BACKEND_DIR) && npx prisma db seed
	@echo "✅ Base de données configurée"

start-all: ## Lance tous les services en mode développement
	@echo "🚀 Démarrage de tous les services..."
	@echo "Ouvrez 3 terminaux et exécutez:"
	@echo "Terminal 1: make dev-backend"
	@echo "Terminal 2: make dev-admin"
	@echo "Terminal 3: make dev-pos"

# Exemples d'utilisation
example-restaurant: ## Génère un exemple d'application POS pour restaurant
	@echo "🍽️ Génération d'un exemple restaurant..."
	mkdir -p examples
	@echo '{"appConfig":{"theme":{"businessName":"Restaurant Le Gourmet","sector":"restaurant","currency":"EUR","taxRate":20.0,"colors":{"primary":"#DC2626","accent":"#F59E0B","background":"#FFFFFF","text":"#1F2937"}}},"license":{"licenseKey":"POS-RESTAURANT-2024","clientName":"Restaurant Le Gourmet","sector":"restaurant","licenseType":"LIFETIME","isActive":true,"modules":[{"name":"pos-core","displayName":"Caisse de base","isEnabled":true},{"name":"inventory","displayName":"Gestion des stocks","isEnabled":true},{"name":"reports","displayName":"Rapports","isEnabled":true},{"name":"kitchen-printer","displayName":"Impression cuisine","isEnabled":true},{"name":"table-management","displayName":"Gestion des tables","isEnabled":true}]}}' > examples/restaurant-config.json
	make build-pos CONFIG=examples/restaurant-config.json OUTPUT=examples/restaurant-pos
	@echo "✅ Application restaurant générée dans examples/restaurant-pos"

example-cafe: ## Génère un exemple d'application POS pour café
	@echo "☕ Génération d'un exemple café..."
	mkdir -p examples
	@echo '{"appConfig":{"theme":{"businessName":"Café Central","sector":"cafe","currency":"EUR","taxRate":20.0,"colors":{"primary":"#8B4513","accent":"#D2691E","background":"#FFFFFF","text":"#1F2937"}}},"license":{"licenseKey":"POS-CAFE-2024","clientName":"Café Central","sector":"cafe","licenseType":"SUBSCRIPTION","expirationDate":"2025-12-31T23:59:59.999Z","isActive":true,"modules":[{"name":"pos-core","displayName":"Caisse de base","isEnabled":true},{"name":"inventory","displayName":"Gestion des stocks","isEnabled":true},{"name":"reports","displayName":"Rapports","isEnabled":true}]}}' > examples/cafe-config.json
	make build-pos CONFIG=examples/cafe-config.json OUTPUT=examples/cafe-pos
	@echo "✅ Application café générée dans examples/cafe-pos"

docs: ## Génère la documentation
	@echo "📚 Génération de la documentation..."
	@echo "# Système POS - Documentation" > README.md
	@echo "" >> README.md
	@echo "## Installation" >> README.md
	@echo "\`\`\`bash" >> README.md
	@echo "make install" >> README.md
	@echo "\`\`\`" >> README.md
	@echo "" >> README.md
	@echo "## Développement" >> README.md
	@echo "\`\`\`bash" >> README.md
	@echo "make start-all" >> README.md
	@echo "\`\`\`" >> README.md
	@echo "" >> README.md
	@echo "## Génération d'applications POS" >> README.md
	@echo "\`\`\`bash" >> README.md
	@echo "make example-restaurant" >> README.md
	@echo "make example-cafe" >> README.md
	@echo "\`\`\`" >> README.md
	@echo "✅ Documentation générée dans README.md"

