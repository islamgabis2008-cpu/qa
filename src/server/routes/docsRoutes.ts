import { Router, Request, Response } from 'express';

const router = Router();

const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'DZ Order REST API - الجزائر',
    version: '1.0.0',
    description: 'Documentation officielle de l\'API DZ Order pour la commande et livraison de repas en Algérie (Dinar Algérien - DZD, Cash On Delivery).'
  },
  servers: [{ url: '/api', description: 'Serveur Principal DZ Order' }],
  paths: {
    '/auth/register': {
      post: {
        summary: 'Créer un nouveau compte utilisateur (Client, Propriétaire de restaurant, Coursier)',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', properties: { email: { type: 'string' }, password: { type: 'string' }, full_name: { type: 'string' }, phone: { type: 'string' }, role: { type: 'string', enum: ['CUSTOMER', 'RESTAURANT_OWNER', 'COURIER'] }, language: { type: 'string', enum: ['ar', 'fr'] } } } } }
        },
        responses: { '201': { description: 'Compte créé avec succès' } }
      }
    },
    '/auth/login': {
      post: {
        summary: 'Connexion sécurisée avec génération de JWT',
        responses: { '200': { description: 'Connexion réussie avec token JWT' } }
      }
    },
    '/auth/profile': {
      get: { summary: 'Récupérer le profil utilisateur authentifié', security: [{ BearerAuth: [] }] }
    },
    '/restaurants': {
      get: { summary: 'Lister les restaurants approuvés et actifs en Algérie (recherche par ville, nom, catégorie)' }
    },
    '/restaurants/{id}': {
      get: { summary: 'Détails du restaurant, menu complet et avis clients' }
    },
    '/restaurant-applications/apply': {
      post: { summary: 'Soumettre une demande d\'inscription de restaurant (Propriétaire)', security: [{ BearerAuth: [] }] }
    },
    '/cart': {
      get: { summary: 'Consulter le panier avec calcul des totaux côté serveur', security: [{ BearerAuth: [] }] }
    },
    '/cart/items': {
      post: { summary: 'Ajouter un article au panier avec vérification de restaurant unique', security: [{ BearerAuth: [] }] }
    },
    '/orders': {
      post: { summary: 'Valider et passer la commande (Paiement à la livraison COD)', security: [{ BearerAuth: [] }] }
    },
    '/orders/my': {
      get: { summary: 'Historique des commandes du client', security: [{ BearerAuth: [] }] }
    },
    '/owner/orders': {
      get: { summary: 'Commandes reçues par le restaurant en temps réel', security: [{ BearerAuth: [] }] }
    },
    '/owner/orders/{id}/accept': {
      post: { summary: 'Accepter la commande', security: [{ BearerAuth: [] }] }
    },
    '/owner/orders/{id}/ready': {
      post: { summary: 'Marquer la commande prête et diffuser la course aux livreurs', security: [{ BearerAuth: [] }] }
    },
    '/courier/tasks': {
      get: { summary: 'Consulter les courses de livraison disponibles', security: [{ BearerAuth: [] }] }
    },
    '/courier/tasks/{id}/accept': {
      post: { summary: 'Accepter une course avec transaction atomique anti-collision', security: [{ BearerAuth: [] }] }
    },
    '/courier/tasks/{id}/complete': {
      post: { summary: 'Confirmer la livraison et la réception du montant en espèces', security: [{ BearerAuth: [] }] }
    },
    '/admin/dashboard': {
      get: { summary: 'Statistiques globales de la plateforme (KPIs, ventes en DZD, livreurs)', security: [{ BearerAuth: [] }] }
    },
    '/admin/restaurant-applications/{id}/approve': {
      post: { summary: 'Approuver une demande de restaurant', security: [{ BearerAuth: [] }] }
    },
    '/admin/restaurant-applications/{id}/reject': {
      post: { summary: 'Refuser une demande de restaurant avec justification', security: [{ BearerAuth: [] }] }
    }
  }
};

router.get('/openapi.json', (_req: Request, res: Response) => {
  res.json(openApiSpec);
});

router.get('/docs', (_req: Request, res: Response) => {
  const html = `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="utf-8" />
      <title>DZ Order - Documentation API REST (Swagger)</title>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
      <style>
        body { margin: 0; background: #fafafa; font-family: sans-serif; }
        .topbar { background-color: #2563EB !important; padding: 12px 20px; color: white; display: flex; align-items: center; justify-content: space-between; }
        .topbar h1 { margin: 0; font-size: 20px; font-weight: 700; }
        .topbar a { color: #fef08a; text-decoration: none; font-size: 14px; font-weight: 600; }
      </style>
    </head>
    <body>
      <div class="topbar">
        <h1>🇩🇿 DZ Order - OpenAPI Documentation</h1>
        <a href="/">← Retour à l'application</a>
      </div>
      <div id="swagger-ui"></div>
      <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
      <script>
        window.onload = () => {
          window.ui = SwaggerUIBundle({
            url: '/api/openapi.json',
            dom_id: '#swagger-ui',
            deepLinking: true,
            presets: [
              SwaggerUIBundle.presets.apis,
              SwaggerUIBundle.SwaggerUIStandalonePreset
            ],
            layout: "BaseLayout"
          });
        };
      </script>
    </body>
    </html>
  `;
  res.send(html);
});

export default router;
