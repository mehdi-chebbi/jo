import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import type { Offer } from '../types';
import { API_BASE_URL } from '../config';
import { useI18n } from '../i18n';
import OfferForm from '../components/forms/OfferForm';

// Language-aware navigation hook
const useLanguageNavigate = () => {
  const navigate = useNavigate();
  const { currentLangPrefix } = useI18n();
  
  return (path: string, options?: any) => {
    const isAbsolute = path.startsWith('http');
    const languagePath = isAbsolute ? path : `${currentLangPrefix}${path === '/' ? '' : path}`;
    navigate(languagePath, options);
  };
};

const OfferEditPage = () => {
  const langNavigate = useLanguageNavigate();
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [offer, setOffer] = useState<Offer | null>(null);

  useEffect(() => {
    const loadOfferData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          langNavigate('/login');
          return;
        }

        // Load offer data
        if (id) {
          const offerResponse = await fetch(`${API_BASE_URL}/offers/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (offerResponse.ok) {
            const offerData = await offerResponse.json();
            console.log('Loaded offer data for editing:', offerData);
            setOffer(offerData);
          } else {
            setError('Offer not found');
            langNavigate('/comite-ajout-dashboard');
          }
        }
      } catch (err) {
        console.error('Error loading offer data:', err);
        setError('Failed to load offer data');
      } finally {
        setIsLoading(false);
      }
    };

    loadOfferData();
  }, [id]);

  const handleSaveOffer = async (updatedOffer: Offer) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        langNavigate('/login');
        return;
      }

      // Create FormData for file upload
      const submitData = new FormData();
      
      // Add basic offer fields
      submitData.append('type', updatedOffer.type);
      submitData.append('method', updatedOffer.method);
      submitData.append('title', updatedOffer.title);
      submitData.append('description', updatedOffer.description);
      submitData.append('country', updatedOffer.country);
      submitData.append('project_id', updatedOffer.project_id?.toString() || '');
      submitData.append('reference', updatedOffer.reference);
      submitData.append('deadline', updatedOffer.deadline);

      const response = await fetch(`${API_BASE_URL}/offers/${id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: submitData,
      });

      if (response.ok) {
        toast.success('Offer updated successfully!');
        langNavigate('/comite-ajout-dashboard');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update offer');
      }
    } catch (err) {
      console.error('Error updating offer:', err);
      setError('Failed to update offer');
    }
  };

  const handleCancel = () => {
    langNavigate('/comite-ajout-dashboard');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin h-12 w-12 border-t-2 border-green-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{error}</p>
            </div>
            <button
              onClick={handleCancel}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {offer && (
          <OfferForm 
            offer={offer} 
            onSave={handleSaveOffer} 
            onCancel={handleCancel} 
          />
        )}
      </div>
    </div>
  );
};

export default OfferEditPage;