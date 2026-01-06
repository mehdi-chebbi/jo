-- OSS Opportunities Platform - Seed Data
-- This will create realistic sample data for testing the statistics dashboard



-- Insert Users
INSERT INTO users (id, name, email, password, role, created_at) VALUES
(1, 'Admin OSS', 'admin@oss-online.org', '$2b$10$rQ8k8Z2Z2Z2Z2Z2Z2Z2Z2O7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7', 'admin', NOW()),
(2, 'Marie Dupont', 'm.dupont@oss-online.org', '$2b$10$rQ8k8Z2Z2Z2Z2Z2Z2Z2Z2O7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7', 'comite_ajout', NOW()),
(3, 'Ahmed Ben Ali', 'a.benali@oss-online.org', '$2b$10$rQ8k8Z2Z2Z2Z2Z2Z2Z2Z2O7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7', 'comite_ajout', NOW()),
(4, 'Fatima Al-Khatib', 'f.alkhatib@oss-online.org', '$2b$10$rQ8k8Z2Z2Z2Z2Z2Z2Z2Z2O7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7', 'comite_ouverture', NOW()),
(5, 'Jean-Pierre Martin', 'jp.martin@oss-online.org', '$2b$10$rQ8k8Z2Z2Z2Z2Z2Z2Z2Z2O7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7', 'comite_ouverture', NOW());

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

-- Insert Offers with varied types, countries, and deadlines
INSERT INTO offers (id, type, title, description, country, project_id, reference, created_by, deadline, status, created_at) VALUES
-- Active Offers
(1, 'candidature', 'Expert en Gestion de Projets Environnementaux', 'Nous recherchons un expert pour coordonner nos projets environnementaux en Afrique de l\'Ouest. Le candidat ideal aura une expérience de 5+ ans dans la gestion de projets de développement durable.', 'Sénégal', 3, 'OSS-ENV-2024-001', 2, DATE_ADD(NOW(), INTERVAL 30 DAY), 'actif', DATE_SUB(NOW(), INTERVAL 15 DAY)),
(2, 'appel_d_offre_service', 'Consultant en Technologies de l\'Information', 'Mission de consultance pour l\'amélioration de notre infrastructure IT. Durée: 6 mois. Expérience en cloud computing requise.', 'Tunisie', 8, 'OSS-IT-2024-002', 3, DATE_ADD(NOW(), INTERVAL 45 DAY), 'actif', DATE_SUB(NOW(), INTERVAL 10 DAY)),
(3, 'manifestation', 'Workshop sur la Gestion des Eaux Souterraines', 'Organisation d\'un workshop international sur les techniques modernes de gestion des eaux souterraines. Date: Mars 2024. Lieu: Tunis.', 'Tunisie', 2, 'OSS-WS-2024-003', 2, DATE_ADD(NOW(), INTERVAL 20 DAY), 'actif', DATE_SUB(NOW(), INTERVAL 5 DAY)),
(4, 'candidature', 'Chercheur en Changement Climatique', 'Poste de chercheur senior pour nos études sur l\'impact du changement climatique en Afrique. Doctorat requis.', 'Maroc', 4, 'OSS-CC-2024-004', 3, DATE_ADD(NOW(), INTERVAL 60 DAY), 'actif', DATE_SUB(NOW(), INTERVAL 20 DAY)),
(5, 'consultation', 'Audit du Système de Management Qualité', 'Mission d\'audit pour évaluer et améliorer notre système de management qualité selon les normes ISO 9001.', 'Algérie', 6, 'OSS-AUDIT-2024-005', 2, DATE_ADD(NOW(), INTERVAL 25 DAY), 'actif', DATE_SUB(NOW(), INTERVAL 8 DAY)),
(6, 'appel_d_offre_equipement', 'Équipement de Laboratoire Hydrologique', 'Acquisition d\'équipements modernes pour notre laboratoire d\'analyse hydrologique. Cahier des charges détaillé disponible.', 'Mali', 2, 'OSS-EQ-2024-006', 3, DATE_ADD(NOW(), INTERVAL 35 DAY), 'actif', DATE_SUB(NOW(), INTERVAL 12 DAY)),
(7, 'candidature', 'Spécialiste en Communication Digitale', 'Gestion de nos plateformes digitales et campagnes de communication. Expérience en réseaux sociaux et création de contenu requise.', 'France', 5, 'OSS-COM-2024-007', 2, DATE_ADD(NOW(), INTERVAL 40 DAY), 'actif', DATE_SUB(NOW(), INTERVAL 18 DAY)),
(8, 'manifestation', 'Conférence Annuelle OSS 2024', 'Organisation de notre conférence annuelle sur le développement durable en Afrique. Appel à communications et sponsors.', 'Tunisie', 7, 'OSS-CONF-2024-008', 3, DATE_ADD(NOW(), INTERVAL 50 DAY), 'actif', DATE_SUB(NOW(), INTERVAL 22 DAY)),

-- Under Evaluation Offers
(9, 'candidature', 'Data Scientist pour Projets Climatiques', 'Développement de modèles de machine learning pour l\'analyse de données climatiques. Python et R requis.', 'Kenya', 4, 'OSS-DS-2023-009', 2, DATE_SUB(NOW(), INTERVAL 5 DAY), 'sous_evaluation', DATE_SUB(NOW(), INTERVAL 60 DAY)),
(10, 'appel_d_offre_service', 'Formation en Gestion de Projet', 'Prestataire de formation pour nos équipes sur les méthodologies agiles et la gestion de projet. Durée: 2 semaines.', 'Burkina Faso', 5, 'OSS-FORM-2023-010', 3, DATE_SUB(NOW(), INTERVAL 8 DAY), 'sous_evaluation', DATE_SUB(NOW(), INTERVAL 70 DAY)),
(11, 'consultation', 'Étude d\'Impact Environnemental', 'Réalisation d\'une étude d\'impact environnemental pour un projet d\'infrastructure hydrologique au Niger.', 'Niger', 3, 'OSS-EIE-2023-011', 2, DATE_SUB(NOW(), INTERVAL 12 DAY), 'sous_evaluation', DATE_SUB(NOW(), INTERVAL 80 DAY)),
(12, 'candidature', 'Expert en Financement de Projets', 'Spécialiste en mobilisation de fonds pour les projets de développement durable. Expérience avec bailleurs internationaux requise.', 'Suisse', 7, 'OSS-FIN-2023-012', 3, DATE_SUB(NOW(), INTERVAL 15 DAY), 'sous_evaluation', DATE_SUB(NOW(), INTERVAL 90 DAY)),

-- Result Offers (with winners)
(13, 'candidature', 'Développeur Full Stack', 'Développement de notre nouvelle plateforme web. Technologies: React, Node.js, PostgreSQL. Poste basé à Tunis.', 'Tunisie', 1, 'OSS-DEV-2023-013', 2, DATE_SUB(NOW(), INTERVAL 30 DAY), 'resultat', DATE_SUB(NOW(), INTERVAL 120 DAY)),
(14, 'appel_d_offre_service', 'Audit Financier Annuel', 'Mission d\'audit financier pour l\'exercice 2023. Cabinet d\'expertise comptable requis.', 'Tunisie', 6, 'OSS-AUD-2023-014', 3, DATE_SUB(NOW(), INTERVAL 35 DAY), 'resultat', DATE_SUB(NOW(), INTERVAL 110 DAY)),
(15, 'consultation', 'Stratégie Digitale 2024-2027', 'Consultation pour définir notre stratégie digitale pour les 3 prochaines années. Expérience du secteur ONG requise.', 'Canada', 4, 'OSS-STRAT-2023-015', 2, DATE_SUB(NOW(), INTERVAL 40 DAY), 'resultat', DATE_SUB(NOW(), INTERVAL 100 DAY));

-- Update winners for result offers
UPDATE offers SET winner_name = 'Mohamed Salah' WHERE id = 13;
UPDATE offers SET winner_name = 'Cabinet Audit Expert' WHERE id = 14;
UPDATE offers SET winner_name = 'Digital Strategy Group' WHERE id = 15;

-- Insert Applications for each offer
INSERT INTO applications (id, offer_id, full_name, email, tel_number, applicant_country, cv_filename, cv_filepath, diplome_filename, diplome_filepath, id_card_filename, id_card_filepath, cover_letter_filename, cover_letter_filepath, created_at) VALUES

-- Applications for Offer 1 (Expert en Gestion de Projets)
(1, 1, 'Amadou Diallo', 'amadou.diallo@email.com', '+221771234567', 'Sénégal', 'cv_amadou.pdf', 'files/applicants/amadou_diallo/cv-123456.pdf', 'diplome_amadou.pdf', 'files/applicants/amadou_diallo/diplome-123457.pdf', 'id_amadou.pdf', 'files/applicants/amadou_diallo/id_card-123458.pdf', 'lettre_amadou.pdf', 'files/applicants/amadou_diallo/cover_letter-123459.pdf', DATE_SUB(NOW(), INTERVAL 10 DAY)),
(2, 1, 'Marie Claire N\'Goran', 'marie.ngoran@email.com', '+225070123456', 'Côte d\'Ivoire', 'cv_marie.pdf', 'files/applicants/marie_ngoran/cv-123460.pdf', 'diplome_marie.pdf', 'files/applicants/marie_ngoran/diplome-123461.pdf', 'id_marie.pdf', 'files/applicants/marie_ngoran/id_card-123462.pdf', 'lettre_marie.pdf', 'files/applicants/marie_ngoran/cover_letter-123463.pdf', DATE_SUB(NOW(), INTERVAL 8 DAY)),
(3, 1, 'Jean-Baptiste Ouedraogo', 'jb.ouedraogo@email.com', '+226701234567', 'Burkina Faso', 'cv_jb.pdf', 'files/applicants/jb_ouedraogo/cv-123464.pdf', 'diplome_jb.pdf', 'files/applicants/jb_ouedraogo/diplome-123465.pdf', 'id_jb.pdf', 'files/applicants/jb_ouedraogo/id_card-123466.pdf', 'lettre_jb.pdf', 'files/applicants/jb_ouedraogo/cover_letter-123467.pdf', DATE_SUB(NOW(), INTERVAL 12 DAY)),

-- Applications for Offer 2 (Consultant IT)
(4, 2, 'Karim Ben Mohamed', 'karim.ben@email.com', '+21698123456', 'Tunisie', 'cv_karim.pdf', 'files/applicants/karim_ben/cv-123468.pdf', 'diplome_karim.pdf', 'files/applicants/karim_ben/diplome-123469.pdf', 'id_karim.pdf', 'files/applicants/karim_ben/id_card-123470.pdf', 'lettre_karim.pdf', 'files/applicants/karim_ben/cover_letter-123471.pdf', DATE_SUB(NOW(), INTERVAL 5 DAY)),
(5, 2, 'Sophie Laurent', 'sophie.l@email.com', '+33612345678', 'France', 'cv_sophie.pdf', 'files/applicants/sophie_laurent/cv-123472.pdf', 'diplome_sophie.pdf', 'files/applicants/sophie_laurent/diplome-123473.pdf', 'id_sophie.pdf', 'files/applicants/sophie_laurent/id_card-123474.pdf', 'lettre_sophie.pdf', 'files/applicants/sophie_laurent/cover_letter-123475.pdf', DATE_SUB(NOW(), INTERVAL 7 DAY)),
(6, 2, 'Youssef Alami', 'youssef.alami@email.com', '+212612345678', 'Maroc', 'cv_youssef.pdf', 'files/applicants/youssef_alami/cv-123476.pdf', 'diplome_youssef.pdf', 'files/applicants/youssef_alami/diplome-123477.pdf', 'id_youssef.pdf', 'files/applicants/youssef_alami/id_card-123478.pdf', 'lettre_youssef.pdf', 'files/applicants/youssef_alami/cover_letter-123479.pdf', DATE_SUB(NOW(), INTERVAL 3 DAY)),

-- Applications for Offer 3 (Workshop)
(7, 3, 'Dr. Aminata Touré', 'aminata.toure@univ.edu', '+223641234567', 'Mali', 'cv_aminata.pdf', 'files/applicants/aminata_toure/cv-123480.pdf', 'diplome_aminata.pdf', 'files/applicants/aminata_toure/diplome-123481.pdf', 'id_aminata.pdf', 'files/applicants/aminata_toure/id_card-123482.pdf', 'lettre_aminata.pdf', 'files/applicants/aminata_toure/cover_letter-123483.pdf', DATE_SUB(NOW(), INTERVAL 2 DAY)),
(8, 3, 'Prof. Mohamed Cherif', 'm.cherif@univ.edu', '+213551234567', 'Algérie', 'cv_mohamed.pdf', 'files/applicants/mohamed_cherif/cv-123484.pdf', 'diplome_mohamed.pdf', 'files/applicants/mohamed_cherif/diplome-123485.pdf', 'id_mohamed.pdf', 'files/applicants/mohamed_cherif/id_card-123486.pdf', 'lettre_mohamed.pdf', 'files/applicants/mohamed_cherif/cover_letter-123487.pdf', DATE_SUB(NOW(), INTERVAL 4 DAY)),

-- Applications for Offer 4 (Chercheur)
(9, 4, 'Dr. Leila Khaled', 'leila.khaled@research.org', '+966501234567', 'Arabie Saoudite', 'cv_leila.pdf', 'files/applicants/leila_khaled/cv-123488.pdf', 'diplome_leila.pdf', 'files/applicants/leila_khaled/diplome-123489.pdf', 'id_leila.pdf', 'files/applicants/leila_khaled/id_card-123490.pdf', 'lettre_leila.pdf', 'files/applicants/leila_khaled/cover_letter-123491.pdf', DATE_SUB(NOW(), INTERVAL 15 DAY)),
(10, 4, 'Dr. Peter Johnson', 'p.johnson@climate.edu', '+447911234567', 'Royaume-Uni', 'cv_peter.pdf', 'files/applicants/peter_johnson/cv-123492.pdf', 'diplome_peter.pdf', 'files/applicants/peter_johnson/diplome-123493.pdf', 'id_peter.pdf', 'files/applicants/peter_johnson/id_card-123494.pdf', 'lettre_peter.pdf', 'files/applicants/peter_johnson/cover_letter-123495.pdf', DATE_SUB(NOW(), INTERVAL 18 DAY)),
(11, 4, 'Dr. Fatima Zahra', 'fatima.zahra@research.ma', '+212622345678', 'Maroc', 'cv_fatima.pdf', 'files/applicants/fatima_zahra/cv-123496.pdf', 'diplome_fatima.pdf', 'files/applicants/fatima_zahra/diplome-123497.pdf', 'id_fatima.pdf', 'files/applicants/fatima_zahra/id_card-123498.pdf', 'lettre_fatima.pdf', 'files/applicants/fatima_zahra/cover_letter-123499.pdf', DATE_SUB(NOW(), INTERVAL 20 DAY)),

-- Applications for Offer 5 (Audit)
(12, 5, 'Rachid Benzarti', 'r.benzarti@audit.tn', '+21622123456', 'Tunisie', 'cv_rachid.pdf', 'files/applicants/rachid_benzarti/cv-123500.pdf', 'diplome_rachid.pdf', 'files/applicants/rachid_benzarti/diplome-123501.pdf', 'id_rachid.pdf', 'files/applicants/rachid_benzarti/id_card-123502.pdf', 'lettre_rachid.pdf', 'files/applicants/rachid_benzarti/cover_letter-123503.pdf', DATE_SUB(NOW(), INTERVAL 6 DAY)),
(13, 5, 'Claude Dubois', 'c.dubis@audit.fr', '+33712345678', 'France', 'cv_claude.pdf', 'files/applicants/claude_dubois/cv-123504.pdf', 'diplome_claude.pdf', 'files/applicants/claude_dubois/diplome-123505.pdf', 'id_claude.pdf', 'files/applicants/claude_dubois/id_card-123506.pdf', 'lettre_claude.pdf', 'files/applicants/claude_dubois/cover_letter-123507.pdf', DATE_SUB(NOW(), INTERVAL 9 DAY)),

-- Applications for Offer 6 (Équipement)
(14, 6, 'Bakary Traoré', 'b.traore@equip.ml', '+223651234567', 'Mali', 'cv_bakary.pdf', 'files/applicants/bakary_traore/cv-123508.pdf', 'diplome_bakary.pdf', 'files/applicants/bakary_traore/diplome-123509.pdf', 'id_bakary.pdf', 'files/applicants/bakary_traore/id_card-123510.pdf', 'lettre_bakary.pdf', 'files/applicants/bakary_traore/cover_letter-123511.pdf', DATE_SUB(NOW(), INTERVAL 11 DAY)),
(15, 6, 'LaboTech Solutions', 'contact@labotech.com', '+243812345678', 'RD Congo', 'cv_labotech.pdf', 'files/applicants/labotech_solutions/cv-123512.pdf', 'diplome_labotech.pdf', 'files/applicants/labotech_solutions/diplome-123513.pdf', 'id_labotech.pdf', 'files/applicants/labotech_solutions/id_card-123514.pdf', 'lettre_labotech.pdf', 'files/applicants/labotech_solutions/cover_letter-123515.pdf', DATE_SUB(NOW(), INTERVAL 13 DAY)),

-- Applications for Offer 7 (Communication)
(16, 7, 'Nadia Belkacem', 'nadia.belkacem@com.dz', '+213552345678', 'Algérie', 'cv_nadia.pdf', 'files/applicants/nadia_belkacem/cv-123516.pdf', 'diplome_nadia.pdf', 'files/applicants/nadia_belkacem/diplome-123517.pdf', 'id_nadia.pdf', 'files/applicants/nadia_belkacem/id_card-123518.pdf', 'lettre_nadia.pdf', 'files/applicants/nadia_belkacem/cover_letter-123519.pdf', DATE_SUB(NOW(), INTERVAL 14 DAY)),
(17, 7, 'Pierre Martin', 'pierre.martin@digital.fr', '+33623456789', 'France', 'cv_pierre_m.pdf', 'files/applicants/pierre_martin/cv-123520.pdf', 'diplome_pierre_m.pdf', 'files/applicants/pierre_martin/diplome-123521.pdf', 'id_pierre_m.pdf', 'files/applicants/pierre_martin/id_card-123522.pdf', 'lettre_pierre_m.pdf', 'files/applicants/pierre_martin/cover_letter-123523.pdf', DATE_SUB(NOW(), INTERVAL 16 DAY)),
(18, 7, 'Aminatou Sow', 'aminatou.sow@com.sn', '+221761234567', 'Sénégal', 'cv_aminatou.pdf', 'files/applicants/aminatou_sow/cv-123524.pdf', 'diplome_aminatou.pdf', 'files/applicants/aminatou_sow/diplome-123525.pdf', 'id_aminatou.pdf', 'files/applicants/aminatou_sow/id_card-123526.pdf', 'lettre_aminatou.pdf', 'files/applicants/aminatou_sow/cover_letter-123527.pdf', DATE_SUB(NOW(), INTERVAL 17 DAY)),

-- Applications for Offer 8 (Conférence)
(19, 8, 'Dr. Hassan Mahmoud', 'h.mahmoud@conf.eg', '+202212345678', 'Égypte', 'cv_hassan.pdf', 'files/applicants/hassan_mahmoud/cv-123528.pdf', 'diplome_hassan.pdf', 'files/applicants/hassan_mahmoud/diplome-123529.pdf', 'id_hassan.pdf', 'files/applicants/hassan_mahmoud/id_card-123530.pdf', 'lettre_hassan.pdf', 'files/applicants/hassan_mahmoud/cover_letter-123531.pdf', DATE_SUB(NOW(), INTERVAL 19 DAY)),
(20, 8, 'Dr. Sarah Williams', 's.williams@conf.uk', '+447922345678', 'Royaume-Uni', 'cv_sarah.pdf', 'files/applicants/sarah_williams/cv-123532.pdf', 'diplome_sarah.pdf', 'files/applicants/sarah_williams/diplome-123533.pdf', 'id_sarah.pdf', 'files/applicants/sarah_williams/id_card-123534.pdf', 'lettre_sarah.pdf', 'files/applicants/sarah_williams/cover_letter-123535.pdf', DATE_SUB(NOW(), INTERVAL 21 DAY)),

-- Applications for expired offers (under evaluation)
(21, 9, 'David Kimani', 'd.kimani@data.ke', '+254711234567', 'Kenya', 'cv_david.pdf', 'files/applicants/david_kimani/cv-123536.pdf', 'diplome_david.pdf', 'files/applicants/david_kimani/diplome-123537.pdf', 'id_david.pdf', 'files/applicants/david_kimani/id_card-123538.pdf', 'lettre_david.pdf', 'files/applicants/david_kimani/cover_letter-123539.pdf', DATE_SUB(NOW(), INTERVAL 65 DAY)),
(22, 9, 'Emma Chen', 'e.chen@data.cn', '+861312345678', 'Chine', 'cv_emma.pdf', 'files/applicants/emma_chen/cv-123540.pdf', 'diplome_emma.pdf', 'files/applicants/emma_chen/diplome-123541.pdf', 'id_emma.pdf', 'files/applicants/emma_chen/id_card-123542.pdf', 'lettre_emma.pdf', 'files/applicants/emma_chen/cover_letter-123543.pdf', DATE_SUB(NOW(), INTERVAL 68 DAY)),
(23, 9, 'Ahmed Hassan', 'a.hassan@data.sd', '+249911234567', 'Soudan', 'cv_ahmed_h.pdf', 'files/applicants/ahmed_hassan/cv-123544.pdf', 'diplome_ahmed_h.pdf', 'files/applicants/ahmed_hassan/diplome-123545.pdf', 'id_ahmed_h.pdf', 'files/applicants/ahmed_hassan/id_card-123546.pdf', 'lettre_ahmed_h.pdf', 'files/applicants/ahmed_hassan/cover_letter-123547.pdf', DATE_SUB(NOW(), INTERVAL 70 DAY)),

-- Applications for other expired offers
(24, 10, 'Formation Pro SA', 'contact@formationpro.bf', '+226601234567', 'Burkina Faso', 'cv_formpro.pdf', 'files/applicants/formation_pro/cv-123548.pdf', 'diplome_formpro.pdf', 'files/applicants/formation_pro/diplome-123549.pdf', 'id_formpro.pdf', 'files/applicants/formation_pro/id_card-123550.pdf', 'lettre_formpro.pdf', 'files/applicants/formation_pro/cover_letter-123551.pdf', DATE_SUB(NOW(), INTERVAL 75 DAY)),
(25, 11, 'Environ Conseil', 'contact@envcon.ne', '+227201234567', 'Niger', 'cv_envcon.pdf', 'files/applicants/environ_conseil/cv-123552.pdf', 'diplome_envcon.pdf', 'files/applicants/environ_conseil/diplome-123553.pdf', 'id_envcon.pdf', 'files/applicants/environ_conseil/id_card-123554.pdf', 'lettre_envcon.pdf', 'files/applicants/environ_conseil/cover_letter-123555.pdf', DATE_SUB(NOW(), INTERVAL 85 DAY)),
(26, 12, 'Global Fund Expert', 'contact@globalfund.ch', '+41441234567', 'Suisse', 'cv_globalfund.pdf', 'files/applicants/global_fund/cv-123556.pdf', 'diplome_globalfund.pdf', 'files/applicants/global_fund/diplome-123557.pdf', 'id_globalfund.pdf', 'files/applicants/global_fund/id_card-123558.pdf', 'lettre_globalfund.pdf', 'files/applicants/global_fund/cover_letter-123559.pdf', DATE_SUB(NOW(), INTERVAL 95 DAY)),

-- Applications for result offers
(27, 13, 'Mohamed Salah', 'm.salah@dev.tn', '+21699123456', 'Tunisie', 'cv_mohamed_s.pdf', 'files/applicants/mohamed_salah/cv-123560.pdf', 'diplome_mohamed_s.pdf', 'files/applicants/mohamed_salah/diplome-123561.pdf', 'id_mohamed_s.pdf', 'files/applicants/mohamed_salah/id_card-123562.pdf', 'lettre_mohamed_s.pdf', 'files/applicants/mohamed_salah/cover_letter-123563.pdf', DATE_SUB(NOW(), INTERVAL 130 DAY)),
(28, 13, 'Sonia Gharbi', 's.gharbi@dev.tn', '+21698765432', 'Tunisie', 'cv_sonia.pdf', 'files/applicants/sonia_gharbi/cv-123564.pdf', 'diplome_sonia.pdf', 'files/applicants/sonia_gharbi/diplome-123565.pdf', 'id_sonia.pdf', 'files/applicants/sonia_gharbi/id_card-123566.pdf', 'lettre_sonia.pdf', 'files/applicants/sonia_gharbi/cover_letter-123567.pdf', DATE_SUB(NOW(), INTERVAL 125 DAY)),
(29, 13, 'Walid Ben Amor', 'w.benamor@dev.tn', '+21696543210', 'Tunisie', 'cv_walid.pdf', 'files/applicants/walid_ben_amor/cv-123568.pdf', 'diplome_walid.pdf', 'files/applicants/walid_ben_amor/diplome-123569.pdf', 'id_walid.pdf', 'files/applicants/walid_ben_amor/id_card-123570.pdf', 'lettre_walid.pdf', 'files/applicants/walid_ben_amor/cover_letter-123571.pdf', DATE_SUB(NOW(), INTERVAL 128 DAY)),

-- More applications for better statistics
(30, 1, 'Cheikh Tidjane', 'c.tidjane@email.com', '+221781234567', 'Sénégal', 'cv_cheikh.pdf', 'files/applicants/cheikh_tidjane/cv-123572.pdf', 'diplome_cheikh.pdf', 'files/applicants/cheikh_tidjane/diplome-123573.pdf', 'id_cheikh.pdf', 'files/applicants/cheikh_tidjane/id_card-123574.pdf', 'lettre_cheikh.pdf', 'files/applicants/cheikh_tidjane/cover_letter-123575.pdf', DATE_SUB(NOW(), INTERVAL 9 DAY)),
(31, 2, 'Nadia Ghanem', 'n.ghanem@email.com', '+96131234567', 'Liban', 'cv_nadia_g.pdf', 'files/applicants/nadia_ghanem/cv-123576.pdf', 'diplome_nadia_g.pdf', 'files/applicants/nadia_ghanem/diplome-123577.pdf', 'id_nadia_g.pdf', 'files/applicants/nadia_ghanem/id_card-123578.pdf', 'lettre_nadia_g.pdf', 'files/applicants/nadia_ghanem/cover_letter-123579.pdf', DATE_SUB(NOW(), INTERVAL 6 DAY)),
(32, 4, 'Dr. Samuel Okonkwo', 's.okonkwo@research.ng', '+234801234567', 'Nigeria', 'cv_samuel.pdf', 'files/applicants/samuel_okonkwo/cv-123580.pdf', 'diplome_samuel.pdf', 'files/applicants/samuel_okonkwo/diplome-123581.pdf', 'id_samuel.pdf', 'files/applicants/samuel_okonkwo/id_card-123582.pdf', 'lettre_samuel.pdf', 'files/applicants/samuel_okonkwo/cover_letter-123583.pdf', DATE_SUB(NOW(), INTERVAL 16 DAY)),
(33, 7, 'Lucie Rodriguez', 'l.rodriguez@com.es', '+34612345678', 'Espagne', 'cv_lucie.pdf', 'files/applicants/lucie_rodriguez/cv-123584.pdf', 'diplome_lucie.pdf', 'files/applicants/lucie_rodriguez/diplome-123585.pdf', 'id_lucie.pdf', 'files/applicants/lucie_rodriguez/id_card-123586.pdf', 'lettre_lucie.pdf', 'files/applicants/lucie_rodriguez/cover_letter-123587.pdf', DATE_SUB(NOW(), INTERVAL 15 DAY));

-- Insert Questions for some offers
INSERT INTO questions (id, offer_id, question, answer, created_at, answered_at) VALUES
(1, 1, 'Quelles sont les certifications requises pour ce poste?', 'Les certifications PMP et PRINCE2 sont fortement recommandées, ainsi qu\'une expérience en gestion de projets environnementaux.', DATE_SUB(NOW(), INTERVAL 8 DAY), DATE_SUB(NOW(), INTERVAL 5 DAY)),
(2, 1, 'Le poste peut-il être exercé en télétravail?', 'Oui, un télétravail partiel (2-3 jours/semaine) est possible après la période d\'intégration.', DATE_SUB(NOW(), INTERVAL 7 DAY), DATE_SUB(NOW(), INTERVAL 4 DAY)),
(3, 2, 'Quelles technologies cloud sont concernées par la mission?', 'La mission couvre principalement AWS et Azure, avec une ouverture vers Google Cloud Platform.', DATE_SUB(NOW(), INTERVAL 4 DAY), DATE_SUB(NOW(), INTERVAL 2 DAY)),
(4, 3, 'Les frais de participation au workshop sont-ils pris en charge?', 'Oui, les frais de participation, déplacement et hébergement sont pris en charge pour les intervenants sélectionnés.', DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_SUB(NOW(), INTERVAL 12 HOUR)),
(5, 4, 'Quelles sont les publications attendues pour ce poste?', 'Nous attendons au moins 2 publications par an dans des revues à comité de lecture, plus des communications à des conférences internationales.', DATE_SUB(NOW(), INTERVAL 12 DAY), DATE_SUB(NOW(), INTERVAL 8 DAY)),
(6, 7, 'Quels types de contenu seront à gérer?', 'Vous gérerez le contenu de notre site web, newsletters, réseaux sociaux, et supports de communication événementiels.', DATE_SUB(NOW(), INTERVAL 10 DAY), DATE_SUB(NOW(), INTERVAL 6 DAY)),
(7, 8, 'Quels sont les thèmes principaux de la conférence?', 'Les thèmes principaux sont: gestion durable des ressources en eau, adaptation au changement climatique, et technologies innovantes pour l\'agriculture en zones arides.', DATE_SUB(NOW(), INTERVAL 15 DAY), DATE_SUB(NOW(), INTERVAL 10 DAY)),

-- Unanswered questions
(8, 1, 'Quel est le salaire proposé pour ce poste?', NULL, DATE_SUB(NOW(), INTERVAL 2 DAY), NULL),
(9, 2, 'La mission peut-elle être étendue au-delà de 6 mois?', NULL, DATE_SUB(NOW(), INTERVAL 1 DAY), NULL),
(10, 4, 'Y aura-t-il des opportunités de formation continue?', NULL, DATE_SUB(NOW(), INTERVAL 3 DAY), NULL);

-- Insert some custom required documents for specific offers
INSERT INTO custom_required_documents (id, offer_id, document_name, document_key, required, created_at) VALUES
(1, 1, 'Références de projets similaires', 'project_references', true, DATE_SUB(NOW(), INTERVAL 15 DAY)),
(2, 1, 'Certification PMP', 'pmp_certification', false, DATE_SUB(NOW(), INTERVAL 15 DAY)),
(3, 2, 'Portfolio de projets cloud', 'cloud_portfolio', true, DATE_SUB(NOW(), INTERVAL 10 DAY)),
(4, 4, 'Liste des publications', 'publication_list', true, DATE_SUB(NOW(), INTERVAL 20 DAY)),
(5, 4, 'Lettres de recommandation', 'recommendation_letters', false, DATE_SUB(NOW(), INTERVAL 20 DAY)),
(6, 7, 'Portfolio de créations', 'creative_portfolio', true, DATE_SUB(NOW(), INTERVAL 18 DAY)),
(7, 7, 'Certifications en marketing digital', 'digital_marketing_cert', false, DATE_SUB(NOW(), INTERVAL 18 DAY));

-- Insert some logs
INSERT INTO logs (id, message, created_at) VALUES
(1, 'System initialized - Database connected successfully', NOW()),
(2, 'User Marie Dupont created offer OSS-ENV-2024-001', DATE_SUB(NOW(), INTERVAL 15 DAY)),
(3, 'User Ahmed Ben Ali created offer OSS-IT-2024-002', DATE_SUB(NOW(), INTERVAL 10 DAY)),
(4, 'New application received for offer OSS-ENV-2024-001 from Amadou Diallo', DATE_SUB(NOW(), INTERVAL 10 DAY)),
(5, 'New application received for offer OSS-IT-2024-002 from Karim Ben Mohamed', DATE_SUB(NOW(), INTERVAL 5 DAY)),
(6, 'Offer OSS-DS-2023-009 status changed to sous_evaluation', DATE_SUB(NOW(), INTERVAL 5 DAY)),
(7, 'Question answered for offer OSS-ENV-2024-001', DATE_SUB(NOW(), INTERVAL 5 DAY)),
(8, 'User Fatima Al-Khatib reviewed applications for offer OSS-DS-2023-009', DATE_SUB(NOW(), INTERVAL 3 DAY)),
(9, 'Offer OSS-DEV-2023-013 winner selected: Mohamed Salah', DATE_SUB(NOW(), INTERVAL 30 DAY)),
(10, 'Daily statistics report generated', NOW());

-- Archive some applications from expired offers (simulate archiving process)
UPDATE applications SET archived_at = DATE_SUB(NOW(), INTERVAL 20 DAY) WHERE offer_id IN (13, 14, 15);

-- Update notification counts and email tracking
UPDATE offers SET 
  two_day_notified = CASE 
    WHEN deadline BETWEEN DATE_SUB(NOW(), INTERVAL 2 DAY) AND DATE_SUB(NOW(), INTERVAL 1 DAY) THEN TRUE 
    ELSE two_day_notified 
  END,
  one_day_notified = CASE 
    WHEN deadline BETWEEN DATE_SUB(NOW(), INTERVAL 1 DAY) AND NOW() THEN TRUE 
    ELSE one_day_notified 
  END,
  deadline_notified = CASE 
    WHEN deadline < NOW() THEN TRUE 
    ELSE deadline_notified 
  END;

-- Print summary
SELECT 'Seed data completed successfully!' as message;
SELECT COUNT(*) as total_users FROM users;
SELECT COUNT(*) as total_departments FROM departments;
SELECT COUNT(*) as total_projects FROM projects;
SELECT COUNT(*) as total_offers FROM offers;
SELECT COUNT(*) as total_applications FROM applications;
SELECT COUNT(*) as total_questions FROM questions;
SELECT COUNT(*) as total_logs FROM logs;