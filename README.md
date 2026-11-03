# 🇩🇿 DZ Order — Food Ordering & Delivery Platform (Algeria)

**DZ Order** est une plateforme complète et moderne de commande et de livraison de repas conçue spécifiquement pour le marché algérien.

---

## 🌟 Fonctionnalités Clés & Spécificités Algérie

- **Devise Nationale**: Dinar Algérien (**DZD**) avec calculs stricts et garantis côté serveur.
- **Mode de Paiement**: Paiement à la livraison (**Cash on Delivery - COD**) avec récapitulatif détaillé en espèces.
- **Bilingue Intégral**: 
  - **Arabe (العربية)** avec mise en page native **RTL** (Right-to-Left).
  - **Français** avec mise en page **LTR**.
  - Basculement instantané de la langue et de l'orientation de lecture.
- **Support des Wilayas Algériennes**: Alger, Oran, Constantine, Annaba, Béjaïa, Batna, Sétif, Blida, Tlemcen...
- **Règle Restaurant Unique par Commande**: Détection automatique et dialogue d'arbitrage si le client ajoute des articles d'un autre restaurant.
- **Protection Anti-Collision (ACID)**: Transactions SQL sécurisées empêchant deux livreurs d'accepter la même course.
- **PWA Mobile-First**: Compatible et installable sur Android (Progressive Web App).

---

## 👥 4 Rôles Utilisateurs & Espaces Dédiés

### 1. 👤 Client (Customer)
- Inscription et connexion sécurisée avec numéro de téléphone algérien (`+213`).
- Navigation par restaurants approuvés, recherche textuelle et filtrage par wilaya / spécialités.
- Consultation des menus bilingues (Rechta, Chakhchoukha, Couscous, Garantita, Pizzas, Burgers DZ, Boissons Selecto / Hamoud).
- Panier dynamique et validation des montants par le serveur.
- Gestion des adresses de livraison favorites.
- Suivi en direct du cycle de vie de la commande :
  `PENDING` → `ACCEPTED` → `PREPARING` → `READY` → `COURIER_ASSIGNED` → `PICKED_UP` → `ON_THE_WAY` → `DELIVERED`.
- Possibilité d'annulation avant prise en charge cuisine.
- Évaluation (étoiles 1-5 + commentaire) et dépôt de réclamation après livraison.

### 2. 👨‍🍳 Restaurateur (Restaurant Owner)
- Dépôt de candidature en ligne (Nom, ville, adresse, téléphone, catégorie, horaires, registre de commerce).
- Accès restreint au tableau de bord conditionné par la validation de l'administrateur.
- Réception des commandes en temps réel avec alertes.
- Acceptation ou refus avec justification obligatoire.
- Avancement de la préparation en cuisine et déclenchement automatique de la recherche de coursier (`READY`).
- Gestion de la carte (CRUD produits, mise à jour des prix en DZD, bouton de rupture de stock immédiate).
- Statistiques de ventes et chiffre d'affaires cumulé.

### 3. 🛵 Coursier (Courier)
- Inscription avec sélection du type de véhicule (Moto, Voiture, Vélo) et numéro de plaque.
- Basculement En Ligne / Hors Ligne.
- Radar des courses prêtes pour ramassage (`READY`) avec adresses et rémunération en DZD.
- Acceptation atomique d'une course.
- Workflow complet de livraison :
  1. *Arrivée au restaurant* → Confirmation du ramassage (`PICKED_UP`).
  2. *Déplacement* → En route vers le client (`ON_THE_WAY`).
  3. *Arrivée chez le client* → Remise de la commande et encaissement en espèces (`DELIVERED`).
- Tableau de bord des gains et historique des courses.

### 4. 🛡️ Administrateur (Admin)
- Tableau de bord avec 10 indicateurs clés (KPIs) en temps réel.
- Validation ou rejet motivé des demandes d'inscription de restaurants (avec notification automatique).
- Validation ou rejet des candidatures de livreurs.
- Gestion des utilisateurs (suspension et réactivation immédiate de comptes).
- Supervision de toutes les commandes et livraisons.
- Traitement des réclamations clients.
- Configuration globale de la plateforme (frais de livraison de base, commande minimum, commission).
- Journal d'audit exhaustif des actions système.

---

## 🗄️ Modèle de Base de Données Relationnelle (21 Tables)

1. `users`
2. `customer_profiles`
3. `restaurant_owner_profiles`
4. `courier_profiles`
5. `restaurant_categories`
6. `restaurant_applications`
7. `restaurants`
8. `product_categories`
9. `products`
10. `addresses`
11. `carts`
12. `cart_items`
13. `orders`
14. `order_items` (Snapshots immuables des noms et prix)
15. `deliveries`
16. `order_status_history`
17. `notifications`
18. `reviews`
19. `complaints`
20. `platform_settings`
21. `audit_logs`

---

## 🚀 Démarrage Rapide

### Prérequis
- Node.js (v18+)
- npm ou yarn

### Installation
```bash
npm install
```

### Lancement du Serveur Full-Stack
```bash
npm run dev
# Le serveur démarre sur http://localhost:3000
```

### Exécution de la Suite de Tests Automatisée
```bash
npm test
# Valide les 17 critères fonctionnels et de sécurité spécifiés
```

---

## 🔑 Comptes de Démonstration

Pour faciliter l'évaluation immédiate, utilisez le sélecteur rapide en haut de l'interface ou connectez-vous avec :

| Rôle | Email | Mot de passe |
|---|---|---|
| **Administrateur** | `admin@dzorder.dz` | `DzOrder2026!` |
| **Restaurateur (El Bahdja)** | `elbahdja@dzorder.dz` | `DzOrder2026!` |
| **Coursier (Moto)** | `courier@dzorder.dz` | `DzOrder2026!` |
| **Client** | `client@dzorder.dz` | `DzOrder2026!` |

---

## 📖 Documentation API REST (OpenAPI 3.0)

Accédez à la documentation interactive Swagger UI directement sur :
`http://localhost:3000/api/docs`
Ou consultez la spécification JSON sur :
`http://localhost:3000/api/openapi.json`

---

## 📱 Déploiement & Génération APK Android

### Progressive Web App (PWA)
L'application intègre le bouton d'installation in-app `PWAInstallButton` et le manifeste W3C compliant (`/public/manifest.json`). Tout utilisateur sur Android (Chrome) peut directement installer l'application sur son écran d'accueil sans passer par le Play Store.

### Génération d'APK Android (via TWA / Bubblewrap)
Pour publier un APK / AAB sur le Google Play Store à partir de la PWA :
1. Installer la CLI officielle Google Bubblewrap :
   ```bash
   npm install -g @bubblewrap/cli
   ```
2. Initialiser le projet Android TWA :
   ```bash
   bubblewrap init --manifest=https://<VOTRE_DOMAINE>/manifest.json
   ```
3. Compiler l'APK signé :
   ```bash
   bubblewrap build
   ```
