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
    'recrutement': { name: 'Recrutement', color: 'bg-green-100 text-green-800' },
    'service': { name: 'Service', color: 'bg-yellow-100 text-yellow-800' }
  };

  // Method information
  const methodInfo: { [key: string]: TypeInfo } = {
    'entente_directe': { name: 'Entente Directe', color: 'bg-gray-100 text-gray-800' },
    'consultation': { name: 'Consultation', color: 'bg-orange-100 text-orange-800' },
    'appel_d_offre': { name: 'Appel d\'Offre', color: 'bg-red-100 text-red-800' }
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
    'recrutement': { name: 'Recrutement', color: 'bg-green-100 text-green-800' },
    'service': { name: 'Service', color: 'bg-yellow-100 text-yellow-800' }
  };

  return typeInfo[type] || { name: type, color: 'bg-gray-100 text-gray-800' };
};

export const getOfferTypeOptions = () => [
  { value: 'travaux', label: 'Travaux' },
  { value: 'prestation_intellectuelle', label: 'Prestation Intellectuelle' },
  { value: 'recrutement', label: 'Recrutement' },
  { value: 'service', label: 'Service' }
];

export const getOfferMethodOptions = () => [
  { value: 'entente_directe', label: 'Entente Directe' },
  { value: 'consultation', label: 'Consultation' },
  { value: 'appel_d_offre', label: 'Appel d\'Offre' }
];