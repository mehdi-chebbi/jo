import { useState, useRef, useEffect } from 'react';
import type { Offer, Department, Project, OfferType, OfferMethod } from '../../types';
import { API_BASE_URL } from '../../config';
import { useI18n } from '../../i18n';
import { getOfferTypeOptions, getOfferMethodOptions } from '../../utils/offerType';
import Swal from 'sweetalert2';

type LanguageChoice = 'fr' | 'en' | 'both';

const OfferForm = ({ offer, onSave, onCancel }: { offer?: Offer; onSave: (offer: Offer) => void; onCancel: () => void }) => {
  const { t } = useI18n();

  // Language selection step
  const [languageChoice, setLanguageChoice] = useState<LanguageChoice | null>(null);
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  // Form data for French (primary)
  const [formData, setFormData] = useState({
    type: offer?.type || 'travaux',
    method: offer?.method || 'entente_directe',
    title: offer?.title || '',
    title_en: offer?.title_en || '',
    description: offer?.description || '',
    description_en: offer?.description_en || '',
    country: offer?.country || '',
    reference: offer?.reference || '',
    deadline: offer?.deadline || '',
    tdr: null as File | null,
    tdr_en: null as File | null,
    language: offer?.language || 'fr',
  });

  // Notification emails state
  const [notificationEmails, setNotificationEmails] = useState<string[]>(['']);

  // Custom required documents state
  const [customDocuments, setCustomDocuments] = useState<Array<{ name: string; key: string; required: boolean }>>([]);
  const [newDocumentName, setNewDocumentName] = useState('');

  // Removed default documents state
  const [removedDefaultDocuments, setRemovedDefaultDocuments] = useState<Set<string>>(new Set());

  // Departments and projects state
  const [departments, setDepartments] = useState<Department[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Country dropdown state
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [filteredCountries, setFilteredCountries] = useState<string[]>([]);
  const [highlightedCountryIndex, setHighlightedCountryIndex] = useState(-1);
  const countryDropdownRef = useRef<HTMLDivElement>(null);
  const countryInputRef = useRef<HTMLInputElement>(null);

  // List of countries
 const countries = [
  "Afghanistan", "Albanie", "Algérie", "Andorre", "Angola",
  "Antigua-et-Barbuda", "Argentine", "Arménie", "Australie",
  "Autriche", "Azerbaïdjan", "Bahamas", "Bahreïn", "Bangladesh",
  "Barbade", "Biélorussie", "Belgique", "Belize", "Bénin", "Bhoutan",
  "Bolivie", "Bosnie-Herzégovine", "Botswana", "Brésil",
  "Brunéi", "Bulgarie", "Burkina Faso", "Burundi", "Cap-Vert",
  "Cambodge", "Cameroun", "Canada", "République centrafricaine",
  "Tchad", "Chili", "Chine", "Colombie", "Comores",
  "République démocratique du Congo", "République du Congo",
  "Costa Rica", "Côte d'Ivoire", "Croatie", "Cuba", "Chypre",
  "République tchèque", "Danemark", "Djibouti", "Dominique",
  "République dominicaine", "Équateur", "Égypte", "Salvador",
  "Guinée équatoriale", "Érythrée", "Estonie", "Eswatini",
  "Éthiopie", "Fidji", "Finlande", "France", "Gabon", "Gambie",
  "Géorgie", "Allemagne", "Ghana", "Grèce", "Grenade", "Guatemala",
  "Guinée", "Guinée-Bissau", "Guyana", "Haïti", "Honduras",
  "Hongrie", "Islande", "Inde", "Indonésie", "Iran", "Irak",
  "Irlande", "Israël", "Italie", "Jamaïque", "Japon", "Jordanie",
  "Kazakhstan", "Kenya", "Kiribati", "Corée du Nord", "Corée du Sud",
  "Kosovo", "Koweït", "Kirghizistan", "Laos", "Lettonie", "Liban",
  "Lesotho", "Libéria", "Libye", "Liechtenstein", "Lituanie",
  "Luxembourg", "Madagascar", "Malawi", "Malaisie", "Maldives",
  "Mali", "Malte", "Îles Marshall", "Mauritanie", "Maurice",
  "Mexique", "Micronésie", "Moldavie", "Monaco", "Mongolie",
  "Monténégro", "Maroc", "Mozambique", "Myanmar", "Namibie",
  "Nauru", "Népal", "Pays-Bas", "Nouvelle-Zélande", "Nicaragua",
  "Niger", "Nigéria", "Macédoine du Nord", "Norvège", "Oman",
  "Pakistan", "Palaos", "Palestine", "Panama", "Papouasie-Nouvelle-Guinée",
  "Paraguay", "Pérou", "Philippines", "Pologne", "Portugal", "Qatar",
  "Roumanie", "Russie", "Rwanda", "Saint-Christophe-et-Niévès",
  "Sainte-Lucie", "Saint-Vincent-et-les-Grenadines", "Samoa",
  "Saint-Marin", "Sao Tomé-et-Principe", "Arabie saoudite", "Sénégal",
  "Serbie", "Seychelles", "Sierra Leone", "Singapour", "Slovaquie",
  "Slovénie", "Îles Salomon", "Somalie", "Afrique du Sud",
  "Soudan du Sud", "Espagne", "Sri Lanka", "Soudan", "Suriname",
  "Suède", "Suisse", "Syrie", "Taïwan", "Tadjikistan",
  "Tanzanie", "Thaïlande", "Timor oriental", "Togo", "Tonga",
  "Trinité-et-Tobago", "Tunisie", "Turquie", "Turkménistan",
  "Tuvalu", "Ouganda", "Ukraine", "Émirats arabes unis",
  "Royaume-Uni", "États-Unis", "Uruguay", "Ouzbékistan",
  "Vanuatu", "Vatican", "Venezuela", "Viêt Nam", "Yémen",
  "Zambie", "Zimbabwe"
];

  // Initialize language choice from existing offer
  useEffect(() => {
    if (offer && offer.language) {
      if (offer.language === 'both') {
        setLanguageChoice('both');
      } else {
        setLanguageChoice(offer.language);
      }
    }
  }, [offer]);

  // Load existing notification emails and custom documents when editing
  useEffect(() => {
    const loadOfferDetails = async () => {
      if (offer) {
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(`${API_BASE_URL}/offers/${offer.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (response.ok) {
            const offerDetails = await response.json();
            // Parse notification emails if they exist
            if (offerDetails.notification_emails) {
              try {
                const emails = JSON.parse(offerDetails.notification_emails);
                if (Array.isArray(emails) && emails.length > 0) {
                  setNotificationEmails(emails);
                } else {
                  setNotificationEmails(['']);
                }
              } catch (e) {
                console.error('Error parsing notification emails:', e);
                setNotificationEmails(['']);
              }
            } else {
              setNotificationEmails(['']);
            }

            // Load custom required documents
            if (offerDetails.custom_required_documents && Array.isArray(offerDetails.custom_required_documents)) {
              setCustomDocuments(offerDetails.custom_required_documents);
            }

            // Load removed default documents
            if (offerDetails.removed_default_documents && Array.isArray(offerDetails.removed_default_documents)) {
              setRemovedDefaultDocuments(new Set(offerDetails.removed_default_documents));
            }
          } else {
            setNotificationEmails(['']);
          }
        } catch (error) {
          console.error('Error loading offer details:', error);
          setNotificationEmails(['']);
        }
      }
    };

    loadOfferDetails();
  }, [offer]);

  // Load departments and projects
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem('token');

        // Load departments
        const deptResponse = await fetch(`${API_BASE_URL}/departments`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (deptResponse.ok) {
          const deptData = await deptResponse.json();
          setDepartments(deptData);
        }

        // Load projects
        const projResponse = await fetch(`${API_BASE_URL}/projects`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (projResponse.ok) {
          const projData = await projResponse.json();
          setProjects(projData);
        }
      } catch (error) {
        console.error('Error loading departments and projects:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Handle department selection
  const handleDepartmentChange = (departmentId: string) => {
    setSelectedDepartment(departmentId);
    setSelectedProjectId(''); // Reset selected project when department changes
    if (departmentId) {
      const deptProjects = projects.filter(p => p.department_id.toString() === departmentId);
      setFilteredProjects(deptProjects);
    } else {
      setFilteredProjects([]);
    }
  };

  // Set initial department and project when editing
  useEffect(() => {
    if (offer && offer.project_id && departments.length > 0 && projects.length > 0) {
      const project = projects.find(p => p.id === offer.project_id);
      if (project) {
        setSelectedDepartment(project.department_id.toString());
        setSelectedProjectId(offer.project_id.toString());
        const deptProjects = projects.filter(p => p.department_id === project.department_id);
        setFilteredProjects(deptProjects);
      }
    }
  }, [offer, departments, projects]);

  // Handle email field changes
  const handleEmailChange = (index: number, value: string) => {
    const newEmails = [...notificationEmails];
    newEmails[index] = value;
    setNotificationEmails(newEmails);
  };

  // Add new email field
  const addEmailField = () => {
    if (notificationEmails.length < 10) {
      setNotificationEmails([...notificationEmails, '']);
    }
  };

  // Remove email field
  const removeEmailField = (index: number) => {
    if (notificationEmails.length > 1) {
      const newEmails = notificationEmails.filter((_, i) => i !== index);
      setNotificationEmails(newEmails);
    }
  };

  // Email validation function
  const isValidEmail = (email: string) => {
    if (!email.trim()) return true; // Empty emails are allowed (will be filtered out)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Custom documents functions
  const addCustomDocument = () => {
    if (newDocumentName.trim()) {
      const key = newDocumentName.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '_');

      if (!customDocuments.find(doc => doc.key === key)) {
        setCustomDocuments([...customDocuments, {
          name: newDocumentName.trim(),
          key: key,
          required: true
        }]);
        setNewDocumentName('');
      }
    }
  };

  const removeCustomDocument = (key: string) => {
    setCustomDocuments(customDocuments.filter(doc => doc.key !== key));
  };

  const toggleDocumentRequired = (key: string) => {
    setCustomDocuments(customDocuments.map(doc =>
      doc.key === key ? { ...doc, required: !doc.required } : doc
    ));
  };

  // Get default required documents for the offer type
  const getDefaultRequiredDocuments = () => {
    const baseDocuments = [
      { key: 'cv', name: 'CV', required: true },
      { key: 'diplome', name: 'Diplome', required: true },
      { key: 'id_card', name: 'Carte d\'identité', required: true },
      { key: 'cover_letter', name: 'Letter de motivation', required: true }
    ];

    // Additional documents based on method
    const additionalDocsByMethod = {
      'entente_directe': [],
      'consultation': [
        { key: 'declaration_sur_honneur', name: 'Declaration sur l\'Honneur', required: true },
        { key: 'fiche_de_referencement', name: 'Fiche de Referencement', required: true },
        { key: 'extrait_registre', name: 'Extrait Registre National', required: true }
      ],
      'appel_d_offre': [
        { key: 'declaration_sur_honneur', name: 'Declaration sur l\'Honneur', required: true },
        { key: 'fiche_de_referencement', name: 'Fiche de Referencement', required: true },
        { key: 'extrait_registre', name: 'Extrait Registre National', required: true },
        { key: 'note_methodologique', name: 'Note Methodologique', required: true },
        { key: 'liste_references', name: 'Liste des References', required: true },
        { key: 'offre_financiere', name: 'Offre Financiere', required: true }
      ]
    };

    const allDocuments = [
      ...baseDocuments,
      ...(additionalDocsByMethod[formData.method as keyof typeof additionalDocsByMethod] || [])
    ];

    // Filter out removed default documents
    return allDocuments.filter(doc => !removedDefaultDocuments.has(doc.key));
  };

  // Function to remove a default document
  const removeDefaultDocument = (documentKey: string) => {
    setRemovedDefaultDocuments(prev => new Set([...prev, documentKey]));
  };

  // Function to restore a default document
  const restoreDefaultDocument = (documentKey: string) => {
    setRemovedDefaultDocuments(prev => {
      const newSet = new Set(prev);
      newSet.delete(documentKey);
      return newSet;
    });
  };

  // Get all default documents (including removed ones) for display
  const getAllDefaultDocuments = () => {
    const baseDocuments = [
      { key: 'cv', name: 'CV', required: true },
      { key: 'diplome', name: 'Diplome', required: true },
      { key: 'id_card', name: 'Carte d\'identité', required: true },
      { key: 'cover_letter', name: 'Letter de motivation', required: true }
    ];

    // Additional documents based on method
    const additionalDocsByMethod = {
      'entente_directe': [],
      'consultation': [
        { key: 'declaration_sur_honneur', name: 'Declaration sur l\'Honneur', required: true },
        { key: 'fiche_de_referencement', name: 'Fiche de Referencement', required: true },
        { key: 'extrait_registre', name: 'Extrait Registre National', required: true }
      ],
      'appel_d_offre': [
        { key: 'declaration_sur_honneur', name: 'Declaration sur l\'Honneur', required: true },
        { key: 'fiche_de_referencement', name: 'Fiche de Referencement', required: true },
        { key: 'extrait_registre', name: 'Extrait Registre National', required: true },
        { key: 'note_methodologique', name: 'Note Methodologique', required: true },
        { key: 'liste_references', name: 'Liste des References', required: true },
        { key: 'offre_financiere', name: 'Offre Financiere', required: true }
      ]
    };

    return [
      ...baseDocuments,
      ...(additionalDocsByMethod[formData.method as keyof typeof additionalDocsByMethod] || [])
    ];
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle country input changes
  const handleCountryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, country: value }));

    if (value) {
      const filtered = countries.filter(country =>
        country.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredCountries(filtered.slice(0, 6)); // Limit to 6 options
      setShowCountryDropdown(true);
    } else {
      // Show first countries when input is empty
      setFilteredCountries(countries.slice(0, 6));
      setShowCountryDropdown(true);
    }
    setHighlightedCountryIndex(-1);
  };

  // Handle country key navigation
  const handleCountryKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showCountryDropdown) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedCountryIndex(prev =>
          prev < filteredCountries.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedCountryIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        if (highlightedCountryIndex >= 0) {
          e.preventDefault();
          selectCountry(filteredCountries[highlightedCountryIndex]);
        }
        break;
      case 'Escape':
        setShowCountryDropdown(false);
        break;
      default:
        break;
    }
  };

  // Select a country from of dropdown
  const selectCountry = (country: string) => {
    setFormData(prev => ({ ...prev, country }));
    setShowCountryDropdown(false);
    setHighlightedCountryIndex(-1);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        countryDropdownRef.current &&
        !countryDropdownRef.current.contains(event.target as Node) &&
        countryInputRef.current !== event.target
      ) {
        setShowCountryDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, isEnglish = false) => {
    if (e.target.files && e.target.files[0]) {
      if (isEnglish) {
        setFormData(prev => ({ ...prev, tdr_en: e.target.files![0] }));
      } else {
        setFormData(prev => ({ ...prev, tdr: e.target.files![0] }));
      }
    }
  };

  // Handle language choice selection
  const handleLanguageChoiceSelect = (choice: LanguageChoice) => {
    setLanguageChoice(choice);
    // Update the language field in formData
    setFormData(prev => ({
      ...prev,
      language: choice === 'both' ? 'both' : choice
    }));
  };

  // Handle "Next" button click (for bilingual offers)
  const handleNext = () => {
    setCurrentStep(2);
  };

  // Handle "Back" button click (for bilingual offers)
  const handleBack = () => {
    setCurrentStep(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate that a project is selected
    if (!selectedDepartment) {
      await Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: t('rh.form.validation.selectDepartment'),
        confirmButtonText: 'OK'
      });
      return;
    }

    // Find selected project using selected project ID
    const selectedProject = filteredProjects.find(p => p.id.toString() === selectedProjectId);
    if (!selectedProject) {
      await Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: t('rh.form.validation.selectProject'),
        confirmButtonText: 'OK'
      });
      return;
    }

    // For bilingual offers, validate step 2 before final submission
    if (languageChoice === 'both' && currentStep === 1) {
      // Move to step 2
      handleNext();
      return;
    }

    // Validate emails before submission
    const validEmails = notificationEmails.filter(email => email.trim() !== '');
    const invalidEmails = validEmails.filter(email => !isValidEmail(email));

    if (invalidEmails.length > 0) {
      await Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: t('rh.form.validation.validEmails'),
        confirmButtonText: 'OK'
      });
      return;
    }

    const token = localStorage.getItem('token');
    const formDataToSend = new FormData();

    Object.entries(formData).forEach(([key, value]) => {
      if (key !== 'tdr' && key !== 'tdr_en' && value != null) {
        formDataToSend.append(key, String(value));
      }
    });
    if (formData.tdr) formDataToSend.append('tdr', formData.tdr);
    if (formData.tdr_en) formDataToSend.append('tdr_en', formData.tdr_en);

    // Add project_id
    formDataToSend.append('project_id', selectedProject.id.toString());

    // Add notification emails (only valid ones)
    formDataToSend.append('notification_emails', JSON.stringify(validEmails));

    // Add custom required documents
    formDataToSend.append('custom_documents', JSON.stringify(customDocuments));

    // Add removed default documents
    formDataToSend.append('removed_default_documents', JSON.stringify(Array.from(removedDefaultDocuments)));

    const url = offer ? `${API_BASE_URL}/offers/${offer.id}` : `${API_BASE_URL}/offers`;
    const method = offer ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}` },
        body: formDataToSend,
      });

      if (response.ok) {
        const result = await response.json();
        onSave(result);
        onCancel();
      } else {
        const errorData = await response.json();
        await Swal.fire({
          icon: 'error',
          title: 'Save Failed',
          text: `${t('rh.form.error.saveOffer')}: ${errorData.error || 'Unknown error'} ❌`,
          confirmButtonText: 'OK'
        });
      }
    } catch (err) {
      console.error('Save error:', err);
      await Swal.fire({
        icon: 'error',
        title: 'Network Error',
        text: t('rh.form.error.network'),
        confirmButtonText: 'OK'
      });
    }
  };

  // Language selection screen (Step 0)
  if (!languageChoice && !offer) {
    return (
      <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          {t('rh.form.selectLanguage')}
        </h2>
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => handleLanguageChoiceSelect('fr')}
            className="w-full p-6 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all duration-200 text-left"
          >
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🇫🇷</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Français uniquement</h3>
                <p className="text-sm text-gray-500">L'offre ne sera affichée que sur la page /fr</p>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleLanguageChoiceSelect('en')}
            className="w-full p-6 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all duration-200 text-left"
          >
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🇬🇧</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">English only</h3>
                <p className="text-sm text-gray-500">The offer will only be displayed on the /en page</p>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleLanguageChoiceSelect('both')}
            className="w-full p-6 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all duration-200 text-left"
          >
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🌐</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Bilingual / Bilingue</h3>
                <p className="text-sm text-gray-500">L'offre sera affichée sur les deux pages /fr et /en</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    );
  }

  // Step indicator for bilingual offers
  const showStepIndicator = languageChoice === 'both' && !offer;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 rounded-xl shadow-lg border border-gray-100">
      {/* Step Indicator */}
      {showStepIndicator && (
        <div className="mb-6">
          <div className="flex items-center justify-center space-x-4">
            <div className={`flex items-center space-x-2 ${currentStep === 1 ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 1 ? 'bg-green-600 text-white' : 'bg-gray-200'}`}>
                1
              </div>
              <span className="font-medium">Français</span>
            </div>
            <div className="w-12 h-1 bg-gray-200">
              <div className={`h-full bg-green-600 transition-all duration-300 ${currentStep === 2 ? 'w-full' : 'w-0'}`}></div>
            </div>
            <div className={`flex items-center space-x-2 ${currentStep === 2 ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 2 ? 'bg-green-600 text-white' : 'bg-gray-200'}`}>
                2
              </div>
              <span className="font-medium">English</span>
            </div>
          </div>
        </div>
      )}

      {/* Language Selection Header (for editing) */}
      {!offer && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <span>Language selected:</span>
            <span className="font-semibold">
              {languageChoice === 'fr' ? '🇫🇷 Français' : languageChoice === 'en' ? '🇬🇧 English' : '🌐 Bilingual'}
            </span>
            {languageChoice !== 'both' && !offer && (
              <button
                type="button"
                onClick={() => setLanguageChoice(null as any)}
                className="ml-4 text-blue-600 hover:text-blue-800 underline"
              >
                Change
              </button>
            )}
          </div>
        </div>
      )}

      {/* Type and Method (only in step 1 or for non-bilingual) */}
      {(!showStepIndicator || currentStep === 1) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label htmlFor="type" className="block text-sm font-semibold text-gray-800 mb-2">{t('rh.form.type')}</label>
            <select
              id="type"
              name="type"
              className="mt-1 block w-full border-2 border-gray-200 focus:ring-2 focus:ring-green-500 focus:border-green-500 rounded-lg px-4 py-3 text-gray-700 bg-white transition-all duration-200 hover:border-gray-300 shadow-sm"
              value={formData.type}
              onChange={handleChange}
              required
            >
              {getOfferTypeOptions().map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="method" className="block text-sm font-semibold text-gray-800 mb-2">{t('rh.form.method')}</label>
            <select
              id="method"
              name="method"
              className="mt-1 block w-full border-2 border-gray-200 focus:ring-2 focus:ring-green-500 focus:border-green-500 rounded-lg px-4 py-3 text-gray-700 bg-white transition-all duration-200 hover:border-gray-300 shadow-sm"
              value={formData.method}
              onChange={handleChange}
              required
            >
              {getOfferMethodOptions().map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Title and Description based on language and step */}
      {!showStepIndicator || currentStep === 1 ? (
        <>
          {/* French Title */}
          <div className="space-y-2">
            <label htmlFor="title" className="block text-sm font-semibold text-gray-800 mb-2">
              {languageChoice === 'en' ? 'Title (English)' : t('rh.form.title')}
            </label>
            <input
              type="text"
              id="title"
              name="title"
              className="mt-1 block w-full border-2 border-gray-200 rounded-lg shadow-sm py-3 px-4 text-gray-700 placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 hover:border-gray-300"
              value={formData.title}
              onChange={handleChange}
              placeholder={languageChoice === 'en' ? 'Enter title in English' : 'Entrez le titre en français'}
              required
            />
          </div>

          {/* French Description */}
          <div className="space-y-2">
            <label htmlFor="description" className="block text-sm font-semibold text-gray-800 mb-2">
              {languageChoice === 'en' ? 'Description (English)' : t('rh.form.description')}
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              className="mt-1 block w-full border-2 border-gray-200 rounded-lg shadow-sm py-3 px-4 text-gray-700 placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 hover:border-gray-300 resize-vertical"
              value={formData.description}
              onChange={handleChange}
              placeholder={languageChoice === 'en' ? 'Enter description in English' : 'Entrez la description en français'}
            />
          </div>
        </>
      ) : (
        <>
          {/* English Title */}
          <div className="space-y-2">
            <label htmlFor="title_en" className="block text-sm font-semibold text-gray-800 mb-2">
              Title (English)
            </label>
            <input
              type="text"
              id="title_en"
              name="title_en"
              className="mt-1 block w-full border-2 border-gray-200 rounded-lg shadow-sm py-3 px-4 text-gray-700 placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 hover:border-gray-300"
              value={formData.title_en}
              onChange={handleChange}
              placeholder="Enter title in English"
              required
            />
          </div>

          {/* English Description */}
          <div className="space-y-2">
            <label htmlFor="description_en" className="block text-sm font-semibold text-gray-800 mb-2">
              Description (English)
            </label>
            <textarea
              id="description_en"
              name="description_en"
              rows={4}
              className="mt-1 block w-full border-2 border-gray-200 rounded-lg shadow-sm py-3 px-4 text-gray-700 placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 hover:border-gray-300 resize-vertical"
              value={formData.description_en}
              onChange={handleChange}
              placeholder="Enter description in English"
            />
          </div>
        </>
      )}

      {/* Reference, Country, Department, Project, Deadline, TDR, Custom Documents, Notification Emails (only in step 1 or for non-bilingual) */}
      {(!showStepIndicator || currentStep === 1) && (
        <>
          <div className="space-y-2">
            <label htmlFor="reference" className="block text-sm font-semibold text-gray-800 mb-2">{t('rh.form.reference')}</label>
            <input
              type="text"
              id="reference"
              name="reference"
              className="mt-1 block w-full border-2 border-gray-200 rounded-lg shadow-sm py-3 px-4 text-gray-700 placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 hover:border-gray-300"
              value={formData.reference}
              onChange={handleChange}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 relative" ref={countryDropdownRef}>
              <label htmlFor="country" className="block text-sm font-semibold text-gray-800 mb-2">{t('rh.form.country')}</label>
              <input
                ref={countryInputRef}
                type="text"
                id="country"
                name="country"
                className="mt-1 block w-full border-2 border-gray-200 rounded-lg shadow-sm py-3 px-4 text-gray-700 placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 hover:border-gray-300"
                value={formData.country}
                onChange={handleCountryChange}
                onKeyDown={handleCountryKeyDown}
                onFocus={() => {
                  // Show first countries when focused and empty
                  if (!formData.country) {
                    setFilteredCountries(countries.slice(0, 6));
                    setShowCountryDropdown(true);
                  } else {
                    // Filter countries if there's already a value
                    const filtered = countries.filter(country =>
                      country.toLowerCase().includes(formData.country.toLowerCase())
                    );
                    setFilteredCountries(filtered.slice(0, 6));
                    setShowCountryDropdown(true);
                  }
                }}
                placeholder={t('rh.form.countryPlaceholder')}
                required
              />

              {showCountryDropdown && filteredCountries.length > 0 && (
                <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-60 overflow-auto">
                  {filteredCountries.map((country, index) => (
                    <div
                      key={country}
                      className={`px-4 py-2 cursor-pointer ${
                        index === highlightedCountryIndex
                          ? 'bg-green-500 text-white'
                          : 'hover:bg-gray-100'
                      }`}
                      onClick={() => selectCountry(country)}
                    >
                      {country}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label
                htmlFor="department"
                className="block text-sm font-semibold text-gray-800 mb-2"
              >
                {t('rh.form.departmentRequired')}
              </label>
              <select
                id="department"
                name="department"
                className="mt-1 block w-full border-2 border-gray-200 rounded-lg shadow-sm py-3 px-4 text-gray-700 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 hover:border-gray-300"
                value={selectedDepartment}
                onChange={(e) => handleDepartmentChange(e.target.value)}
                required
                disabled={isLoading || departments.length === 0}
              >
                <option value="">
                  {isLoading ? t('rh.form.loading') : departments.length === 0 ? t('rh.form.noDepartmentsAvailable') : t('rh.form.selectDepartment')}
                </option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
              {departments.length === 0 && !isLoading && (
                <p className="text-sm text-gray-500">
                  {t('rh.form.noDepartmentsHelp')}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label
                htmlFor="project"
                className="block text-sm font-semibold text-gray-800 mb-2"
              >
                {t('rh.form.projectRequired')}
              </label>
              <select
                id="project"
                name="project"
                className="mt-1 block w-full border-2 border-gray-200 rounded-lg shadow-sm py-3 px-4 text-gray-700 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 hover:border-gray-300"
                value={selectedProjectId}
                onChange={(e) => {
                  // Update selected project state
                  setSelectedProjectId(e.target.value);
                }}
                required
                disabled={!selectedDepartment || filteredProjects.length === 0}
              >
                <option value="">
                  {!selectedDepartment ? t('rh.form.selectDepartmentFirst') : filteredProjects.length === 0 ? t('rh.form.noProjectsAvailable') : t('rh.form.selectProject')}
                </option>
                {filteredProjects.map(project => (
                  <option key={project.id} value={project.id.toString()}>
                    {project.name}
                  </option>
                ))}
              </select>
              {selectedDepartment && filteredProjects.length === 0 && (
                <p className="text-sm text-gray-500">
                  {t('rh.form.noProjectsHelp')}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="deadline" className="block text-sm font-semibold text-gray-800 mb-2">{t('rh.form.deadline')}</label>
            <input
              type="datetime-local"
              id="deadline"
              name="deadline"
              className="mt-1 block w-full border-2 border-gray-200 rounded-lg shadow-sm py-3 px-4 text-gray-700 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 hover:border-gray-300"
              value={formData.deadline}
              onChange={handleChange}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Select exact date and time when applications will close.
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="tdr" className="block text-sm font-semibold text-gray-800 mb-2">
              {languageChoice === 'en' ? 'TDR Document (English)' : t('rh.form.tdrDocument')}
            </label>
            <input
              type="file"
              id="tdr"
              name="tdr"
              accept=".pdf"
              className="mt-1 block w-full border-2 border-gray-200 rounded-lg shadow-sm py-3 px-4 text-gray-700 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 hover:border-gray-300"
              onChange={(e) => handleFileChange(e, false)}
            />
            <p className="text-sm text-gray-500">{t('rh.form.tdrOptional')}</p>
          </div>

          {/* Custom Required Documents Section */}
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">{t('rh.form.customDocuments.title')}</h3>

              {/* Default Required Documents */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-3">{t('rh.form.customDocuments.defaultDocuments')}</h4>
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {getAllDefaultDocuments().map(doc => {
                      const isRemoved = removedDefaultDocuments.has(doc.key);
                      return (
                        <div key={doc.key} className={`flex items-center justify-between p-2 rounded-lg border ${isRemoved ? 'bg-red-50 border-red-200 opacity-60' : 'bg-green-50 border-green-200'}`}>
                          <div className="flex items-center space-x-2">
                            {isRemoved ? (
                              <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                            <span className={`text-sm ${isRemoved ? 'text-gray-500 line-through' : 'text-gray-700'}`}>{doc.name}</span>
                            <span className="text-xs text-gray-500">({t('rh.form.customDocuments.required')})</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => isRemoved ? restoreDefaultDocument(doc.key) : removeDefaultDocument(doc.key)}
                            className={`text-xs px-2 py-1 rounded transition-colors ${
                              isRemoved
                                ? 'bg-green-100 hover:bg-green-200 text-green-700'
                                : 'bg-red-100 hover:bg-red-200 text-red-700'
                            }`}
                          >
                            {isRemoved ? 'Restaurer' : 'Retirer'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  {removedDefaultDocuments.size > 0 && (
                    <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-xs text-yellow-800">
                        <strong>Note:</strong> {removedDefaultDocuments.size} document(s) supprimé(s). Les candidat(e)s ne seront pas tenu(e)s de téléverser ces documents.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Custom Added Documents */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">{t('rh.form.customDocuments.additionalDocuments')}</h4>
                {customDocuments.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">{t('rh.form.customDocuments.noAdditional')}</p>
                ) : (
                  <div className="space-y-2">
                    {customDocuments.map(doc => (
                      <div key={doc.key} className="flex items-center justify-between bg-white rounded-lg p-3 border border-gray-200">
                        <div className="flex items-center space-x-3">
                          <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                          </svg>
                          <span className="text-sm font-medium text-gray-700">{doc.name}</span>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            doc.required
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {doc.required ? t('rh.form.customDocuments.required') : t('rh.form.customDocuments.optional')}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => toggleDocumentRequired(doc.key)}
                            className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded transition-colors"
                          >
                            {doc.required ? t('rh.form.customDocuments.makeOptional') : t('rh.form.customDocuments.makeRequired')}
                          </button>
                          <button
                            type="button"
                            onClick={() => removeCustomDocument(doc.key)}
                            className="text-red-500 hover:text-red-700 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add New Document */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">{t('rh.form.customDocuments.addNew')}</h4>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newDocumentName}
                    onChange={(e) => setNewDocumentName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addCustomDocument()}
                    placeholder={t('rh.form.customDocuments.placeholder')}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                  <button
                    type="button"
                    onClick={addCustomDocument}
                    disabled={!newDocumentName.trim()}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    {t('rh.form.customDocuments.addButton')}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">{t('rh.form.customDocuments.help')}</p>
              </div>
            </div>
          </div>

          {/* Notification Emails Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-semibold text-gray-800">{t('rh.form.notificationEmails')}</label>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">
                  {t('rh.form.emailsCount').replace('{count}', notificationEmails.filter(email => email.trim() !== '').length.toString())}
                </span>
                {notificationEmails.length < 10 && (
                  <button
                    type="button"
                    onClick={addEmailField}
                    className="inline-flex items-center px-3 py-1 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    {t('rh.form.addEmail')}
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-3">
              {notificationEmails.map((email, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => handleEmailChange(index, e.target.value)}
                    placeholder={t('rh.form.emailPlaceholder').replace('{index}', (index + 1).toString())}
                    className="flex-1 border-2 border-gray-200 rounded-lg shadow-sm py-2 px-3 text-gray-700 placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 hover:border-gray-300"
                  />
                  {notificationEmails.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeEmailField(index)}
                      className="inline-flex items-center px-2 py-1 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>

            {notificationEmails.length === 10 && (
              <p className="text-sm text-orange-600 bg-orange-50 p-2 rounded-lg">
                {t('rh.form.maxEmailsReached')}
              </p>
            )}

            <p className="text-sm text-gray-500">
              {t('rh.form.emailsDescription')}
            </p>
          </div>
        </>
      )}

      {/* English TDR (only in step 2 for bilingual offers) */}
      {showStepIndicator && currentStep === 2 && (
        <div className="space-y-2">
          <label htmlFor="tdr_en" className="block text-sm font-semibold text-gray-800 mb-2">TDR Document (English)</label>
          <input
            type="file"
            id="tdr_en"
            name="tdr_en"
            accept=".pdf"
            className="mt-1 block w-full border-2 border-gray-200 rounded-lg shadow-sm py-3 px-4 text-gray-700 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 hover:border-gray-300"
            onChange={(e) => handleFileChange(e, true)}
          />
          <p className="text-sm text-gray-500">Upload the English version of the TDR document</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
        >
          {t('rh.form.cancel')}
        </button>

        {/* Back button for bilingual offers */}
        {showStepIndicator && currentStep === 2 && (
          <button
            type="button"
            onClick={handleBack}
            className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            Back to French
          </button>
        )}

        {/* Submit/Next button */}
        {showStepIndicator && currentStep === 1 ? (
          <button
            type="submit"
            className="px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
          >
            Next to English →
          </button>
        ) : (
          <button
            type="submit"
            className="px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
          >
            {offer ? t('rh.form.updateOffer') : t('rh.form.createOffer')}
          </button>
        )}
      </div>
    </form>
  );
};

export default OfferForm;
