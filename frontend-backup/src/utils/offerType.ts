interface TypeInfo {
  name: string;
  color: string;
}

interface OfferTypeInfo {
  type: TypeInfo;
  method: TypeInfo;
}

export const getOfferTypeInfo = (type: string, method?: string): TypeInfo | OfferTypeInfo => {
  // Type information
  const typeInfo: { [key: string]: TypeInfo } = {
    'travaux': { name: 'Travaux', color: 'bg-blue-100 text-blue-800' },
    'prestation_intellectuelle': { name: 'Prestation Intellectuelle', color: 'bg-purple-100 text-purple-800' },
    'offre_d_emploi': { name: "Offre d'Emploi", color: 'bg-green-100 text-green-800' }
  };

  // Method information
  const methodInfo: { [key: string]: TypeInfo } = {
    'appel_d_offre': { name: "Appel d'Offre", color: 'bg-red-100 text-red-800' },
    'appel_a_candidature': { name: "Appel à Candidature", color: 'bg-orange-100 text-orange-800' }
  };

  if (method !== undefined) {
    return {
      type: typeInfo[type] || { name: type, color: 'bg-gray-100 text-gray-800' },
      method: methodInfo[method] || { name: method, color: 'bg-gray-100 text-gray-800' }
    };
  }

  // For backward compatibility - when only type is provided, return type info directly
  return typeInfo[type] || { name: type, color: 'bg-gray-100 text-gray-800' };
};

export const getOfferTypeOnlyInfo = (type: string): TypeInfo => {
  const typeInfo: { [key: string]: TypeInfo } = {
    'travaux': { name: 'Travaux', color: 'bg-blue-100 text-blue-800' },
    'prestation_intellectuelle': { name: 'Prestation Intellectuelle', color: 'bg-purple-100 text-purple-800' },
    'offre_d_emploi': { name: "Offre d'Emploi", color: 'bg-green-100 text-green-800' }
  };

  return typeInfo[type] || { name: type, color: 'bg-gray-100 text-gray-800' };
};

export const getOfferTypeOptions = () => [
  { value: 'travaux', label: 'Travaux' },
  { value: 'prestation_intellectuelle', label: 'Prestation Intellectuelle' },
  { value: 'offre_d_emploi', label: "Offre d'Emploi" }
];

export const getOfferMethodOptions = () => [
  { value: 'appel_d_offre', label: "Appel d'Offre" },
  { value: 'appel_a_candidature', label: "Appel à Candidature" }
];