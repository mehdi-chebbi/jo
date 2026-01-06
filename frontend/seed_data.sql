-- OSS Opportunities Platform - Seed Data
-- This will create realistic sample data for testing the statistics dashboard



-- Insert Users
INSERT INTO users (id, name, email, password, role, created_at) VALUES
(1, 'Admin OSS', 'admin@oss-online.org', '$2b$10$rQ8k8Z2Z2Z2Z2Z2Z2Z2Z2O7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7', 'admin', NOW()),
(2, 'Marie Dupont', 'm.dupont@oss-online.org', '$2b$10$rQ8k8Z2Z2Z2Z2Z2Z2Z2Z2O7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7', 'comite_ajout', NOW()),
(3, 'Ahmed Ben Ali', 'a.benali@oss-online.org', '$2b$10$rQ8k8Z2Z2Z2Z2Z2Z2Z2Z2O7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7', 'comite_ajout', NOW()),
(4, 'Fatima Al-Khatib', 'f.alkhatib@oss-online.org', '$2b$10$rQ8k8Z2Z2Z2Z2Z2Z2Z2Z2O7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7', 'comite_ouverture', NOW()),
(5, 'Jean-Pierre Martin', 'jp.martin@oss-online.org', '$2b$10$rQ8k8Z2Z2Z2Z2Z2Z2Z2Z2O7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7', 'comite_ouverture', NOW());

-- Insert Departments
INSERT INTO departments (id, name, description, created_by, created_at) VALUES
(1, 'Ressources Humaines', 'Gestion du personnel et recrutement pour les projets OSS', 1, NOW()),
(2, 'Recherche et Développement', 'Développement de solutions innovantes pour la gestion des ressources en eau', 1, NOW()),
(3, 'Projets Internationaux', 'Coordination des projets transfrontaliers en Afrique', 1, NOW()),
(4, 'Technologies de l\'Information', 'Développement et maintenance des systèmes d\'information', 1, NOW()),
(5, 'Formation et Capacitation', 'Programmes de formation et renforcement des capacités', 1, NOW()),
(6, 'Monitoring et Évaluation', 'Suivi et évaluation des projets et programmes', 1, NOW());

-- Insert Projects
INSERT INTO projects (id, name, description, department_id, created_by, created_at) VALUES
(1, 'Système de Gestion des RH', 'Développement d\'un système complet de gestion des ressources humaines', 1, 2, NOW()),
(2, 'Plateforme de Surveillance Hydrologique', 'Création d\'une plateforme IoT pour la surveillance des ressources en eau', 2, 3, NOW()),
(3, 'Programme Sahel Vert', 'Projet de reforestation et gestion durable des terres au Sahel', 3, 2, NOW()),
(4, 'Portail de Données Climatiques', 'Développement d\'un portail web pour les données climatiques africaines', 4, 3, NOW()),
(5, 'Académie OSS', 'Programme de formation en ligne sur la gestion durable des ressources', 5, 2, NOW()),
(6, 'Système de Suivi-Evaluation', 'Mise en place d\'un système intégré de suivi et évaluation', 6, 3, NOW()),
(7, 'Appel à Projets Innovation', 'Programme de financement de projets innovants en eau et climat', 3, 2, NOW()),
(8, 'Migration Cloud Infrastructure', 'Migration des systèmes OSS vers une infrastructure cloud moderne', 4, 3, NOW());

-- Insert Offers with new structure (type + method)
INSERT INTO offers (id, type, method, title, description, country, project_id, reference, created_by, deadline, status, created_at) VALUES
-- Active Offers - Travaux
(1, 'travaux', 'appel_d_offre', 'Construction de Centre Hydrologique', 'Construction d\'un centre moderne de recherche hydrologique au Sénégal. Le projet inclut les travaux de gros œuvre, l\'installation des équipements et l\'aménagement des espaces.', 'Sénégal', 2, 'OSS-TRAVAUX-2024-001', 2, DATE_ADD(NOW(), INTERVAL 30 DAY), 'actif', DATE_SUB(NOW(), INTERVAL 15 DAY)),
(2, 'travaux', 'consultation', 'Réhabilitation Réseau Hydrique', 'Mission de consultance pour la réhabilitation du réseau hydrique dans la région de Tunis. Étude technique et supervision des travaux.', 'Tunisie', 2, 'OSS-TRAVAUX-2024-002', 3, DATE_ADD(NOW(), INTERVAL 45 DAY), 'actif', DATE_SUB(NOW(), INTERVAL 10 DAY)),

-- Active Offers - Prestation Intellectuelle
(3, 'prestation_intellectuelle', 'appel_d_offre', 'Expertise en Changement Climatique', 'Prestation intellectuelle pour une étude approfondie sur l\'impact du changement climatique sur les ressources en eau souterraine. Analyse de données et modélisation.', 'Tunisie', 4, 'OSS-PREST-2024-003', 2, DATE_ADD(NOW(), INTERVAL 20 DAY), 'actif', DATE_SUB(NOW(), INTERVAL 5 DAY)),
(4, 'prestation_intellectuelle', 'consultation', 'Audit Environnemental', 'Mission d\'audit environnemental pour l\'évaluation des impacts des projets OSS sur les écosystèmes locaux. Rapport détaillé et recommandations.', 'Maroc', 3, 'OSS-PREST-2024-004', 3, DATE_ADD(NOW(), INTERVAL 60 DAY), 'actif', DATE_SUB(NOW(), INTERVAL 20 DAY)),

-- Active Offers - Recrutement
(5, 'recrutement', 'entente_directe', 'Expert en Gestion de Projets', 'Recrutement d\'un expert senior en gestion de projets environnementaux pour la coordination du programme Sahel Vert. Expérience de 10+ ans requise.', 'Algérie', 3, 'OSS-RECRT-2024-005', 2, DATE_ADD(NOW(), INTERVAL 25 DAY), 'actif', DATE_SUB(NOW(), INTERVAL 8 DAY)),
(6, 'recrutement', 'consultation', 'Chercheur en Data Science', 'Poste de chercheur en data science pour l\'analyse des données climatiques. Expertise en machine learning et big data requise.', 'Kenya', 4, 'OSS-RECRT-2024-006', 3, DATE_ADD(NOW(), INTERVAL 35 DAY), 'actif', DATE_SUB(NOW(), INTERVAL 12 DAY)),

-- Active Offers - Service
(7, 'service', 'appel_d_offre', 'Maintenance Systèmes IT', 'Prestation de service pour la maintenance des systèmes informatiques de l\'OSS. Contrat annuel avec possibilité de renouvellement.', 'France', 8, 'OSS-SERV-2024-007', 2, DATE_ADD(NOW(), INTERVAL 40 DAY), 'actif', DATE_SUB(NOW(), INTERVAL 18 DAY)),
(8, 'service', 'entente_directe', 'Service de Nettoyage et Sécurité', 'Prestation de service de nettoyage et sécurité pour les locaux OSS à Tunis. Contrat mensuel avec équipe dédiée.', 'Tunisie', 1, 'OSS-SERV-2024-008', 3, DATE_ADD(NOW(), INTERVAL 50 DAY), 'actif', DATE_SUB(NOW(), INTERVAL 22 DAY)),

-- Under Evaluation Offers
(9, 'travaux', 'consultation', 'Expertise Infrastructure', 'Mission d\'expertise pour l\'évaluation de l\'état des infrastructures hydrologiques existantes. Rapport technique et propositions.', 'Mali', 2, 'OSS-TRAVAUX-2023-009', 2, DATE_SUB(NOW(), INTERVAL 5 DAY), 'sous_evaluation', DATE_SUB(NOW(), INTERVAL 60 DAY)),
(10, 'prestation_intellectuelle', 'appel_d_offre', 'Formation Gestion de Projet', 'Prestation intellectuelle pour la formation des équipes OSS aux méthodologies agiles de gestion de projet. Programme complet.', 'Burkina Faso', 5, 'OSS-PREST-2023-010', 3, DATE_SUB(NOW(), INTERVAL 8 DAY), 'sous_evaluation', DATE_SUB(NOW(), INTERVAL 70 DAY)),
(11, 'recrutement', 'entente_directe', 'Spécialiste Communication', 'Recrutement d\'un spécialiste en communication digitale pour la promotion des projets OSS. Expérience en réseaux sociaux requise.', 'Niger', 7, 'OSS-RECRT-2023-011', 2, DATE_SUB(NOW(), INTERVAL 12 DAY), 'sous_evaluation', DATE_SUB(NOW(), INTERVAL 80 DAY)),
(12, 'service', 'consultation', 'Audit Qualité', 'Prestation de service pour l\'audit qualité des processus internes OSS. Certification ISO 9001 visée.', 'Suisse', 6, 'OSS-SERV-2023-012', 3, DATE_SUB(NOW(), INTERVAL 15 DAY), 'sous_evaluation', DATE_SUB(NOW(), INTERVAL 90 DAY)),