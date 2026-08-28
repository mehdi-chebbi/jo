import { Link } from 'react-router-dom';
import type { Offer } from '../types';
import { getOfferTypeInfo } from '../utils/offerType';
import { API_BASE_URL } from '../config';
import { useI18n } from '../i18n';
import { showAlert } from '../utils/sweetalertConfig';
import { getCountryName } from '../utils/translations';
import { createOfferSlug } from '../utils/offerSlug';
interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'comite_ajout' | 'comite_ouverture' | 'rh';
}

const OfferCard = ({ offer }: { offer: Offer }) => {
  const deadlineDate = new Date(offer.deadline);
  const now = new Date();
  
  // Use real-time status checking for display consistency
  const hasSelectedCandidate = offer.status === 'resultat' && offer.winner_name;
  const isInfructueux = offer.status === 'infructueux';
  
  const { t, currentLangPrefix, lang } = useI18n();
  // Use the two-parameter version to get both type and method info (with lang for translations)
  const offerTypeInfo = getOfferTypeInfo(offer.type, offer.method, lang) as { type: { name: string; color: string }; method: { name: string; color: string } };
  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow flex flex-col h-full">
      <div className="p-6 flex-grow">
        <div className="flex flex-col gap-2 mb-2">
          <div className="flex justify-between items-start">
            <span className={`px-2 py-1 text-xs font-semibold rounded ${offerTypeInfo.type.color}`}>
              {offerTypeInfo.type.name}
            </span>
            <span className={`px-2 py-1 text-xs font-semibold rounded ${
              hasSelectedCandidate ? 'bg-purple-100 text-purple-800' : 
              offer.status === 'actif' ? 'bg-green-100 text-green-800' : 
              offer.status === 'sous_evaluation' ? 'bg-yellow-100 text-yellow-800' :
              offer.status === 'infructueux' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {hasSelectedCandidate ? t('filters.status.resultat') : 
               offer.status === 'actif' ? `${t('offer.closes')} ${deadlineDate.toLocaleDateString()}` : 
               offer.status === 'sous_evaluation' ? t('filters.status.sousEvaluation') :
               offer.status === 'infructueux' ? t('filters.status.infructueux') :
               t('filters.status.resultat')}
            </span>
          </div>
          <div className="flex justify-start">
            <span className={`px-2 py-1 text-xs font-semibold rounded ${offerTypeInfo.method.color}`}>
              {offerTypeInfo.method.name}
            </span>
          </div>
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">{offer.title}</h3>
        <p className="text-gray-600 mb-4 line-clamp-3">{offer.description}</p>
        <div className="grid grid-cols-1 gap-2 mb-4">

          <div>
            <p className="text-sm text-gray-500">{t('label.country')}</p>
            <p className="font-medium">{getCountryName(offer.country, lang)}</p>
          </div>

        </div>
      </div>
      <div className="p-6 pt-0 space-y-3">
        {/* Download TDR button */}
        {offer.tdr_url && (
          <button
            onClick={async (e) => {
              e.preventDefault();
              try {
                const response = await fetch(`${API_BASE_URL}${offer.tdr_url}?lang=${lang}`);
                if (!response.ok) throw new Error('fetch_fail');
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `TDR_${offer.title}.pdf`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
              } catch (err) {
                showAlert.error(t('offer.downloadTdr.error'));
                console.error(err);
              }
            }}
            className="text-sm text-blue-600 hover:underline cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 inline-block mr-1" viewBox="0 0 15 15">
              <path fill="currentColor" fillRule="evenodd" d="M7.5 1.05a.45.45 0 0 1 .45.45v6.914l2.232-2.232a.45.45 0 1 1 .636.636l-3 3a.45.45 0 0 1-.636 0l-3-3a.45.45 0 1 1 .636-.636L7.05 8.414V1.5a.45.45 0 0 1 .45-.45ZM2.5 10a.5.5 0 0 1 .5.5V12c0 .554.446 1 .996 1h7.005A.999.999 0 0 0 12 12v-1.5a.5.5 0 0 1 1 0V12a2 2 0 0 1-1.999 2H3.996A1.997 1.997 0 0 1 2 12v-1.5a.5.5 0 0 1 .5-.5Z" clipRule="evenodd"/>
            </svg>
            {t('offer.downloadTdr')}
          </button>
        )}
        {/* Learn More button - ALWAYS VISIBLE */}
        <Link
          to={`${currentLangPrefix}/offer/${createOfferSlug(offer.title, offer.id)}`}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-center block"
        >
          {t('offer.learnMore')}
        </Link>
        
        {/* Selected Candidate message - for resultat status */}
        {hasSelectedCandidate && (
          <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
            <div className="flex items-center text-purple-800">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium">
                {t('rh.candidateInfo').replace('{candidate}', offer.winner_name || '')}
              </span>
            </div>
          </div>
        )}

        {/* Infructueux message - for infructueux status */}
        {isInfructueux && (
          <div className="p-3 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-center text-red-800">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium">
                {t('rh.infructueuxInfo')}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OfferCard;
