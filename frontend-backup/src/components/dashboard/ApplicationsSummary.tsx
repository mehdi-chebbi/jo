import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { showAlert } from '../../utils/sweetalertConfig';
import Swal from 'sweetalert2';
import { getOfferTypeOnlyInfo } from '../../utils/offerType';
import { getOfferTypeName, getOfferMethodName, getCountryName } from '../../utils/translations';
import { API_BASE_URL } from '../../config';
import { useI18n } from '../../i18n';

// Escape user-provided strings before injecting into SweetAlert2 HTML
const escapeHtml = (str: string | null | undefined): string => {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'comite_ajout' | 'comite_ouverture' | 'rh';
}

interface ApplicationsSummaryProps {
  showAllOffers?: boolean;
}

interface OfferSummary {
  offer_id: number;
  offer_title: string;
  offer_type: string;
  offer_department: string;
  offer_project?: string;
  deadline: string;
  application_count: number;
  status: 'actif' | 'sous_evaluation' | 'resultat' | 'infructueux';
  winner_name?: string | null;
}

const ApplicationsSummary = ({ showAllOffers = false }: ApplicationsSummaryProps) => {
  const [offerSummaries, setOfferSummaries] = useState<OfferSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [archiving, setArchiving] = useState<number | null>(null);
  const [settingCandidate, setSettingCandidate] = useState<number | null>(null);
  const [settingInfructueux, setSettingInfructueux] = useState<number | null>(null);
  const [loadingAiRanking, setLoadingAiRanking] = useState<number | null>(null);
  const [revertingWinner, setRevertingWinner] = useState<number | null>(null);
  const [revertingInfructueux, setRevertingInfructueux] = useState<number | null>(null);
  const { t, currentLangPrefix, lang } = useI18n();
  const [filters, setFilters] = useState({
    search: '',
    type: '',
    department: '',
    status: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  // Get user from localStorage to determine role
  const getUser = (): User | null => {
    const token = localStorage.getItem('token');
    if (!token) return null;
    
    try {
      const decoded = JSON.parse(atob(token.split('.')[1]));
      return {
        id: decoded.id,
        name: decoded.name,
        email: decoded.email,
        role: decoded.role,
      };
    } catch {
      return null;
    }
  };
  
  const user = getUser();
  const isComiteOuverture = user?.role === 'comite_ouverture';

  useEffect(() => {
    fetchOfferSummaries();
  }, []);

  const fetchOfferSummaries = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/applications/summary`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (res.ok) {
        const data = await res.json();
        setOfferSummaries(data);
      } else {
        setError(t('rh.error.fetchApplicationSummary'));
      }
    } catch {
      setError(t('rh.error.fetchApplicationSummary'));
    } finally {
      setIsLoading(false);
    }
  };

  const filteredSummaries = offerSummaries.filter(summary => {
    const matchesSearch = filters.search === '' || 
      summary.offer_title.toLowerCase().includes(filters.search.toLowerCase());
    const matchesType = filters.type === '' || summary.offer_type === filters.type;
    const matchesDepartment = filters.department === '' || summary.offer_department === filters.department;
    const matchesStatus = filters.status === '' || 
      (filters.status === 'active' && summary.status === 'actif') ||
      (filters.status === 'sous_evaluation' && summary.status === 'sous_evaluation') ||
      (filters.status === 'resultat' && summary.status === 'resultat') ||
      (filters.status === 'infructueux' && summary.status === 'infructueux');
    
    // If showAllOffers is true (for comite_ouverture), show all offers
    // Otherwise, only show offers with applications (for comite_ajout)
    const showBasedOnApplications = showAllOffers || summary.application_count > 0;
    
    return matchesSearch && matchesType && matchesDepartment && matchesStatus && showBasedOnApplications;
  });

  const uniqueTypes = Array.from(new Set(offerSummaries.map(summary => summary.offer_type)));
  const uniqueDepartments = Array.from(new Set(offerSummaries.map(summary => summary.offer_department)));

  const statusOptions = [
    { value: 'active', label: t('rh.status.actif') },
    { value: 'sous_evaluation', label: t('rh.status.sousEvaluation') },
    { value: 'resultat', label: t('rh.status.resultat') },
    { value: 'infructueux', label: t('rh.status.infructueux') }
  ];

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      type: '',
      department: '',
      status: ''
    });
  };

  const handleArchive = async (offerId: number, offerTitle: string) => {
    const result = await showAlert.confirm(
      t('rh.swal.archiveTitle'),
      t('rh.swal.archiveConfirmation').replace('{offerTitle}', offerTitle),
      t('rh.swal.archiveConfirm'),
      t('rh.swal.archiveCancel')
    );

    if (!result.isConfirmed) {
      return;
    }

    setArchiving(offerId);
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/applications/archive/${offerId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (res.ok) {
        const result = await res.json();
        
        // Download the archive file
        const downloadRes = await fetch(`${API_BASE_URL}/applications/archive/${result.archiveFile}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        
        if (downloadRes.ok) {
          const blob = await downloadRes.blob();
          const downloadUrl = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = downloadUrl;
          a.download = result.archiveFile;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(downloadUrl);
        }
        
        // Refresh the summaries
        await fetchOfferSummaries();
        
        // Show detailed success message
        let message = t('rh.success.archivedApplications')
          .replace('{count}', result.applicationsCount.toString())
          .replace('{offerTitle}', offerTitle);
        
        if (result.newlyArchivedCount > 0) {
          message += `\n\n${result.newlyArchivedCount} new applications were marked as archived.`;
        }
        
        if (result.allowReArchive) {
          message += '\n\nYou can archive again if new applications are submitted.';
        } else {
          message += '\n\nAll applications have been archived. You can still create new archives if needed.';
        }
        
        await showAlert.success(t('rh.swal.archiveCompleteTitle'), message.replace(/\n/g, '<br>'));
      } else {
        const errorData = await res.json();
        await showAlert.error(t('rh.swal.archiveFailedTitle'), `${t('rh.error.archiveApplications')}: ${errorData.error}`);
      }
    } catch {
      console.error('Archive error');
      await showAlert.error(t('rh.swal.archiveFailedTitle'), t('rh.error.archiveApplications'));
    } finally {
      setArchiving(null);
    }
  };

  const handleSetCandidate = async (offerId: number, offerTitle: string) => {
    const { value: candidateName } = await showAlert.input(
      t('rh.candidateModal.title'),
      t('rh.candidateModal.namePlaceholder')
    );

    if (!candidateName || !candidateName.trim()) {
      return;
    }

    setSettingCandidate(offerId);
    
    try {
      const token = localStorage.getItem('token');
      
      // First, try to update the offer status if it's expired
      try {
        await fetch(`${API_BASE_URL}/offers/${offerId}/update-expired-status`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
        });
      } catch (updateError) {
        console.log('Status update failed, continuing with winner selection:', updateError);
        // Don't fail the whole process if status update fails
      }
      
      // Now try to set the winner
      const response = await fetch(`${API_BASE_URL}/offers/${offerId}/set-winner`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ winner_name: candidateName.trim() })
      });

      if (response.ok) {
        await showAlert.success(t('rh.swal.selectionCompleteTitle'), t('rh.swal.selectionCompleteText')
            .replace('{successMessage}', t('rh.candidateModal.success'))
            .replace('{candidate}', candidateName)
            .replace('{offerTitle}', offerTitle));
        // Refresh the summaries to show the updated status
        await fetchOfferSummaries();
      } else {
        const errorData = await response.json();
        console.error('Backend error:', errorData);
        
        // Provide more helpful error messages
        let errorMessage = errorData.error || 'Unknown error';
        if (errorMessage.includes('sous_evaluation')) {
          errorMessage = 'This offer must be in "sous_evaluation" status. Please make sure the offer has expired or contact an administrator.';
        } else if (errorMessage.includes('not found')) {
          errorMessage = 'Offer not found or you do not have permission to modify this offer.';
        }
        
        await showAlert.error(t('rh.swal.selectionFailedTitle'), `${t('rh.candidateModal.error')}: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Error setting candidate:', error);
      await showAlert.error(t('rh.swal.selectionFailedTitle'), t('rh.candidateModal.error'));
    } finally {
      setSettingCandidate(null);
    }
  };

  const handleSetInfructueux = async (offerId: number, offerTitle: string) => {
    const result = await showAlert.confirm(
      t('rh.swal.infructueuxTitle'),
      t('rh.swal.infructueuxConfirmation').replace('{offerTitle}', offerTitle),
      t('rh.swal.infructueuxConfirm'),
      t('rh.swal.infructueuxCancel')
    );

    if (!result.isConfirmed) {
      return;
    }

    setSettingInfructueux(offerId);
    
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_BASE_URL}/offers/${offerId}/set-infructueux`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        await showAlert.success(t('rh.swal.infructueuxCompleteTitle'), t('rh.button.infructueuxSuccess'));
        // Refresh the summaries to show the updated status
        await fetchOfferSummaries();
      } else {
        const errorData = await response.json();
        console.error('Backend error:', errorData);
        
        // Provide more helpful error messages
        let errorMessage = errorData.error || 'Unknown error';
        if (errorMessage.includes('sous_evaluation')) {
          errorMessage = 'This offer must be in "sous_evaluation" status to mark as infructueux.';
        } else if (errorMessage.includes('expired')) {
          errorMessage = 'This offer must be expired to mark as infructueux.';
        } else if (errorMessage.includes('not found')) {
          errorMessage = 'Offer not found or you do not have permission to modify this offer.';
        }
        
        await showAlert.error(t('rh.swal.selectionFailedTitle'), `${t('rh.candidateModal.error')}: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Error setting infructueux:', error);
      await showAlert.error(t('rh.swal.selectionFailedTitle'), t('rh.candidateModal.error'));
    } finally {
      setSettingInfructueux(null);
    }
  };

  // Revert a previously-set winner (status 'resultat' -> 'sous_evaluation', clears winner)
  const handleRevertWinner = async (offerId: number, offerTitle: string, winnerName: string) => {
    const confirmText = t('rh.swal.revertWinnerConfirmation')
      .replace('{offerTitle}', offerTitle)
      .replace('{winner}', winnerName);

    const result = await showAlert.confirm(
      t('rh.swal.revertWinnerTitle'),
      confirmText,
      t('rh.swal.revertWinnerConfirm'),
      t('rh.swal.revertWinnerCancel')
    );

    if (!result.isConfirmed) {
      return;
    }

    setRevertingWinner(offerId);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/offers/${offerId}/revert-winner`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        await showAlert.success(
          t('rh.swal.revertWinnerCompleteTitle'),
          t('rh.swal.revertWinnerCompleteText')
        );
        await fetchOfferSummaries();
      } else {
        const errorData = await response.json();
        let errorMessage = errorData.error || 'Unknown error';
        if (errorMessage.includes('resultat')) {
          errorMessage = 'Offer must be in "resultat" status to revert the winner.';
        } else if (errorMessage.includes('not found')) {
          errorMessage = 'Offer not found or you do not have permission to modify this offer.';
        }
        await showAlert.error(t('rh.swal.revertWinnerFailedTitle'), errorMessage);
      }
    } catch (err) {
      console.error('Error reverting winner:', err);
      await showAlert.error(t('rh.swal.revertWinnerFailedTitle'), 'Network error');
    } finally {
      setRevertingWinner(null);
    }
  };

  // Revert a previously-set infructueux status (status 'infructueux' -> 'sous_evaluation')
  const handleRevertInfructueux = async (offerId: number, offerTitle: string) => {
    const confirmText = t('rh.swal.revertInfructueuxConfirmation')
      .replace('{offerTitle}', offerTitle);

    const result = await showAlert.confirm(
      t('rh.swal.revertInfructueuxTitle'),
      confirmText,
      t('rh.swal.revertInfructueuxConfirm'),
      t('rh.swal.revertInfructueuxCancel')
    );

    if (!result.isConfirmed) {
      return;
    }

    setRevertingInfructueux(offerId);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/offers/${offerId}/revert-infructueux`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        await showAlert.success(
          t('rh.swal.revertInfructueuxCompleteTitle'),
          t('rh.swal.revertInfructueuxCompleteText')
        );
        await fetchOfferSummaries();
      } else {
        const errorData = await response.json();
        let errorMessage = errorData.error || 'Unknown error';
        if (errorMessage.includes('infructueux')) {
          errorMessage = 'Offer must be in "infructueux" status to revert.';
        } else if (errorMessage.includes('not found')) {
          errorMessage = 'Offer not found or you do not have permission to modify this offer.';
        }
        await showAlert.error(t('rh.swal.revertInfructueuxFailedTitle'), errorMessage);
      }
    } catch (err) {
      console.error('Error reverting infructueux:', err);
      await showAlert.error(t('rh.swal.revertInfructueuxFailedTitle'), 'Network error');
    } finally {
      setRevertingInfructueux(null);
    }
  };

  const handleAiRanking = async (offerId: number, offerTitle: string) => {
    setLoadingAiRanking(offerId);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/offers/${offerId}/ai-ranking`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!res.ok) {
        const errorData = await res.json();
        await showAlert.error('AI Ranking Error', errorData.error || 'Failed to fetch AI rankings');
        return;
      }

      const rankings = await res.json();

      if (!rankings || rankings.length === 0) {
        await showAlert.info(
          'Classement IA',
          'Aucun candidat n\'a encore postulé à cette offre.'
        );
        return;
      }

      // Build HTML for the ranking modal
      let rankingHtml = `
        <div style="text-align: left; max-height: 400px; overflow-y: auto;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <thead>
              <tr style="border-bottom: 2px solid #e5e7eb;">
                <th style="padding: 8px; text-align: left;">#</th>
                <th style="padding: 8px; text-align: left;">Candidat</th>
                <th style="padding: 8px; text-align: left;">Pays</th>
                <th style="padding: 8px; text-align: center;">Score IA</th>
                <th style="padding: 8px; text-align: left;">Commentaire</th>
              </tr>
            </thead>
            <tbody>
      `;

      rankings.forEach((r: any, index: number) => {
        const scoreColor = r.ai_score === null ? '#9ca3af' :
          r.ai_score >= 80 ? '#059669' :
          r.ai_score >= 60 ? '#d97706' :
          r.ai_score >= 40 ? '#ea580c' : '#dc2626';

        const scoreBadge = r.ai_score !== null
          ? `<span style="background: ${scoreColor}; color: white; padding: 2px 10px; border-radius: 12px; font-weight: 600; font-size: 12px;">${r.ai_score}/100</span>`
          : '<span style="color: #9ca3af; font-style: italic;">En attente...</span>';

        rankingHtml += `
          <tr style="border-bottom: 1px solid #f3f4f6; ${index === 0 && r.ai_score !== null ? 'background: #f0fdf4;' : ''}">
            <td style="padding: 8px; font-weight: 600;">${r.ai_score !== null ? index + 1 : '–'}</td>
            <td style="padding: 8px; font-weight: 500;">${r.full_name}</td>
            <td style="padding: 8px;">${r.applicant_country}</td>
            <td style="padding: 8px; text-align: center;">${scoreBadge}</td>
            <td style="padding: 8px; font-size: 12px; color: #6b7280; max-width: 200px;">${r.ai_comment || '–'}</td>
          </tr>
        `;
      });

      rankingHtml += `
            </tbody>
          </table>
          <p style="margin-top: 12px; font-size: 11px; color: #9ca3af; text-align: center;">
            Les scores sont calculés automatiquement par IA lors de la soumission de chaque candidature.
          </p>
        </div>
      `;

      await Swal.fire({
        title: `Classement IA – ${offerTitle}`,
        html: rankingHtml,
        width: 750,
        showConfirmButton: true,
        confirmButtonText: 'Fermer',
        buttonsStyling: false,
        customClass: {
          confirmButton: 'swal2-confirm',
          popup: 'swal2-popup'
        },
        showClass: {
          popup: 'animate__animated animate__fadeInDown'
        },
        hideClass: {
          popup: 'animate__animated animate__fadeOutUp'
        }
      });

    } catch (error) {
      console.error('Error fetching AI ranking:', error);
      await showAlert.error('AI Ranking Error', 'Failed to fetch AI rankings');
    } finally {
      setLoadingAiRanking(null);
    }
  };

  // Open a SweetAlert2 popup with the full offer details (incl. TDR downloads)
  // Solves: long titles truncation + provides a place to read TDR.
  const handleShowOfferDetails = async (offerId: number) => {
    Swal.fire({
      title: t('rh.offerDetails.loading'),
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/offers/${offerId}?lang=${lang}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error('Failed to fetch offer');
      }

      const offer = await res.json();

      // Application count comes from the already-loaded summary
      const relatedSummary = offerSummaries.find((s) => s.offer_id === offerId);
      const applicationCount = relatedSummary?.application_count ?? 0;

      // Deadline display: always show formatted date + status suffix
      const deadlineDate = new Date(offer.deadline);
      const now = new Date();
      const isExpired = deadlineDate <= now;
      const daysLeft = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const locale = lang === 'fr' ? 'fr-FR' : 'en-US';
      const formattedDeadline = deadlineDate.toLocaleDateString(locale, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      const deadlineStatus = isExpired
        ? t('rh.deadlineExpired')
        : daysLeft === 0
          ? t('rh.deadlineToday')
          : t('rh.deadlineDaysLeft').replace('{days}', daysLeft.toString());
      const deadlineColor = isExpired ? '#ef4444' : daysLeft <= 7 ? '#f59e0b' : '#10b981';

      // Status badge config
      const statusConfig: { [key: string]: { color: string; label: string } } = {
        actif: { color: '#10b981', label: t('rh.status.actif') },
        sous_evaluation: { color: '#f59e0b', label: t('rh.status.sousEvaluation') },
        resultat: { color: '#3b82f6', label: t('rh.status.resultat') },
        infructueux: { color: '#ef4444', label: t('rh.status.infructueux') },
      };
      const statusInfo = statusConfig[offer.status] || { color: '#6b7280', label: offer.status };

      // Localized names
      const typeName = getOfferTypeName(offer.type, lang);
      const methodName = offer.method ? getOfferMethodName(offer.method, lang) : null;
      const countryName = offer.country ? getCountryName(offer.country, lang) : null;

      // Created date
      const createdDate = offer.created_at
        ? new Date(offer.created_at).toLocaleDateString(locale, {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          })
        : null;

      // TDR availability (backend returns both filenames regardless of ?lang=)
      const hasFrTdr = !!offer.tdr_filename || !!offer.tdr_filepath;
      const hasEnTdr = !!(offer.tdr_filename_en || offer.tdr_filepath_en);

      // Description (multi-line safe)
      const description = offer.description
        ? escapeHtml(offer.description).replace(/\n/g, '<br>')
        : null;

      // Row helper for the details table
      const row = (label: string, value: string) => `
        <tr>
          <td style="padding: 10px 12px; vertical-align: top; font-weight: 600; color: #6b7280; width: 38%; border-bottom: 1px solid #f3f4f6;">${escapeHtml(label)}</td>
          <td style="padding: 10px 12px; vertical-align: top; color: #111827; border-bottom: 1px solid #f3f4f6;">${value}</td>
        </tr>
      `;

      const tdrIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>`;

      const detailsHtml = `
        <div style="text-align: left; max-height: 62vh; overflow-y: auto; padding-right: 4px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 16px;">
            ${offer.reference ? row(t('rh.offerDetails.reference'), escapeHtml(offer.reference)) : ''}
            ${row(t('rh.offerDetails.type'), escapeHtml(typeName))}
            ${methodName ? row(t('rh.offerDetails.method'), escapeHtml(methodName)) : ''}
            ${countryName ? row(t('rh.offerDetails.country'), escapeHtml(countryName)) : ''}
            ${offer.department_name ? row(t('rh.offerDetails.department'), escapeHtml(offer.department_name)) : ''}
            ${offer.project_name ? row(t('rh.offerDetails.project'), escapeHtml(offer.project_name)) : ''}
            ${row(t('rh.offerDetails.status'), `<span style="background: ${statusInfo.color}; color: white; padding: 3px 12px; border-radius: 12px; font-weight: 600; font-size: 12px; white-space: nowrap;">${escapeHtml(statusInfo.label)}</span>`)}
            ${row(t('rh.offerDetails.deadline'), `${escapeHtml(formattedDeadline)} <span style="color: ${deadlineColor}; font-weight: 500; margin-left: 6px;">· ${escapeHtml(deadlineStatus)}</span>`)}
            ${row(t('rh.offerDetails.applications'), `<span style="background: #dbeafe; color: #1e40af; padding: 3px 12px; border-radius: 12px; font-weight: 600; font-size: 12px;">${applicationCount} ${escapeHtml(lang === 'fr' ? 'candidat(s)' : 'candidate(s)')}</span>`)}
            ${offer.winner_name
              ? row(t('rh.offerDetails.winner'), `<span style="color: #059669; font-weight: 600;">✓ ${escapeHtml(offer.winner_name)}</span>`)
              : row(t('rh.offerDetails.winner'), `<span style="color: #9ca3af; font-style: italic;">${escapeHtml(t('rh.offerDetails.noWinner'))}</span>`)
            }
            ${createdDate ? row(t('rh.offerDetails.createdOn'), escapeHtml(createdDate)) : ''}
          </table>

          ${description ? `
            <div style="margin-top: 16px;">
              <h4 style="font-size: 13px; font-weight: 600; color: #6b7280; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.03em;">${escapeHtml(t('rh.offerDetails.description'))}</h4>
              <div style="background: #f9fafb; padding: 12px; border-radius: 8px; font-size: 13px; color: #374151; line-height: 1.6; max-height: 200px; overflow-y: auto; border-left: 3px solid #e5e7eb;">${description}</div>
            </div>
          ` : ''}

          <div style="margin-top: 16px;">
            <h4 style="font-size: 13px; font-weight: 600; color: #6b7280; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.03em;">${escapeHtml(t('rh.offerDetails.tdr'))}</h4>
            ${hasFrTdr || hasEnTdr ? `
              <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                ${hasFrTdr ? `
                  <a href="${API_BASE_URL}/offers/${offerId}/tdr?lang=fr" target="_blank" rel="noopener noreferrer"
                     style="display: inline-flex; align-items: center; padding: 8px 16px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px; font-weight: 500; font-size: 13px;">
                    ${tdrIcon}${escapeHtml(t('rh.offerDetails.tdrFr'))}
                  </a>
                ` : ''}
                ${hasEnTdr ? `
                  <a href="${API_BASE_URL}/offers/${offerId}/tdr?lang=en" target="_blank" rel="noopener noreferrer"
                     style="display: inline-flex; align-items: center; padding: 8px 16px; background: #7c3aed; color: white; text-decoration: none; border-radius: 8px; font-weight: 500; font-size: 13px;">
                    ${tdrIcon}${escapeHtml(t('rh.offerDetails.tdrEn'))}
                  </a>
                ` : ''}
              </div>
            ` : `
              <p style="color: #9ca3af; font-style: italic; font-size: 13px;">${escapeHtml(t('rh.offerDetails.tdrNotAvailable'))}</p>
            `}
          </div>
        </div>
      `;

      Swal.fire({
        titleText: offer.title,
        html: detailsHtml,
        width: 720,
        showConfirmButton: true,
        confirmButtonText: t('rh.offerDetails.close'),
        buttonsStyling: false,
        customClass: {
          confirmButton: 'swal2-confirm',
          popup: 'swal2-popup',
        },
        showClass: { popup: 'animate__animated animate__fadeInDown' },
        hideClass: { popup: 'animate__animated animate__fadeOutUp' },
      });
    } catch (err) {
      console.error('Error fetching offer details:', err);
      await showAlert.error(t('rh.offerDetails.error'));
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin h-12 w-12 border-t-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{t('rh.tabs.applications')}</h2>
          <p className="text-gray-600 mt-1">{t('rh.applications.subtitle')}</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-600">
            {t('rh.statistics.totalOffers')} {offerSummaries.length}
          </div>
          <div className="text-sm text-gray-600">
            {t('rh.statistics.activeOffers')} {offerSummaries.filter(s => s.offer_status === 'active').length}
          </div>
          <div className="text-sm text-gray-600">
            {t('rh.statistics.expiredOffers')} {offerSummaries.filter(s => s.offer_status === 'expired').length}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 sm:mb-0">{t('rh.filterApplications')}</h3>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            {showFilters ? t('rh.toggle.hide') : t('rh.toggle.show')}
          </button>
        </div>

        {showFilters && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">{t('rh.searchLabel')}</label>
                <div className="relative">
                  <input
                    type="text"
                    id="search"
                    name="search"
                    placeholder={t('rh.searchOffersPlaceholder')}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    value={filters.search}
                    onChange={handleFilterChange}
                  />
                  <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
              
              <div>
                <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">{t('rh.offerTypeLabel')}</label>
                <select
                  id="type"
                  name="type"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  value={filters.type}
                  onChange={handleFilterChange}
                >
                  <option value="">{t('rh.allTypes')}</option>
                  {uniqueTypes.map(type => {
                    const typeInfo = getOfferTypeOnlyInfo(type);
                    return (
                      <option key={type} value={type}>
                        {typeInfo.name}
                      </option>
                    );
                  })}
                </select>
              </div>
              
              <div>
                <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1">{t('rh.departmentLabel')}</label>
                <select
                  id="department"
                  name="department"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  value={filters.department}
                  onChange={handleFilterChange}
                >
                  <option value="">{t('rh.allDepartments')}</option>
                  {uniqueDepartments.map(department => (
                    <option key={department} value={department}>
                      {department}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">{t('rh.statusLabel')}</label>
                <select
                  id="status"
                  name="status"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  value={filters.status}
                  onChange={handleFilterChange}
                >
                  <option value="">{t('rh.allStatuses')}</option>
                  {statusOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={clearFilters}
              className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.001 0 01-15.357-2m15.357 2H15" />
              </svg>
              {t('rh.clearAllFilters')}
            </button>
          </>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-700 font-medium">{error}</p>
          </div>
        </div>
      )}

      {filteredSummaries.length === 0 ? (
        <div className="text-center py-16 bg-white/80 backdrop-blur-sm rounded-3xl border border-gray-200">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('rh.noApplicationsFound')}</h3>
          <p className="text-gray-600">{t('rh.noApplicationsDescription')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSummaries.map((summary) => {
            const deadlineDate = new Date(summary.deadline);
            const now = new Date();
            const isExpired = deadlineDate <= now;
            const daysLeft = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            
            return (
              <div key={summary.offer_id} className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      {(() => {
                        const typeInfo = getOfferTypeOnlyInfo(summary.offer_type);
                        return (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeInfo.color}`}>
                            {typeInfo.name}
                          </span>
                        );
                      })()}
                      <h3
                        className="text-lg font-semibold text-gray-900 mt-2 line-clamp-2 cursor-pointer hover:text-blue-600 hover:underline transition-colors"
                        onClick={() => handleShowOfferDetails(summary.offer_id)}
                        title={t('rh.offerDetails.viewDetails')}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleShowOfferDetails(summary.offer_id);
                          }
                        }}
                      >
                        {summary.offer_title}
                      </h3>
                    </div>
                    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      summary.status === 'actif' ? 'bg-green-100 text-green-800' :
                      summary.status === 'sous_evaluation' ? 'bg-yellow-100 text-yellow-800' :
                      summary.status === 'resultat' ? 'bg-blue-100 text-blue-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {summary.status === 'actif' ? t('rh.status.actif') :
                       summary.status === 'sous_evaluation' ? t('rh.status.sousEvaluation') :
                       summary.status === 'resultat' ? t('rh.status.resultat') :
                       t('rh.status.infructueux')}
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{t('rh.departmentLabel')}</span>
                      <span className="text-sm font-medium text-gray-900">{summary.offer_department}</span>
                    </div>
                    
                    {summary.offer_project && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{t('rh.projectLabel')}</span>
                        <span className="text-sm font-medium text-gray-900">{summary.offer_project}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{t('rh.applicationsLabel')}</span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {summary.application_count} candidats{summary.application_count !== 1 ? 's' : ''}
                      </span>
                    </div>
                    
                    <div className={`flex items-center justify-between ${
                      isExpired ? 'text-red-600' : daysLeft <= 7 ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      <span className="text-sm">{t('rh.deadlineLabel')}</span>
                      <span className="text-sm font-medium">
                        {(() => {
                          const locale = lang === 'fr' ? 'fr-FR' : 'en-US';
                          const formattedDate = deadlineDate.toLocaleDateString(locale, {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                          });
                          const statusText = isExpired
                            ? t('rh.deadlineExpired')
                            : daysLeft === 0
                              ? t('rh.deadlineToday')
                              : t('rh.deadlineDaysLeft').replace('{days}', daysLeft.toString());
                          return `${formattedDate} · ${statusText}`;
                        })()}
                      </span>
                    </div>
                  </div>
                  
                  {/* Comité d'Ouverture Action Buttons - Always show all 4 buttons */}
                  {isComiteOuverture && (
                    <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                      
                      {/* 1. Answer Questions Button */}
                      <div>
                        <Link
                          to={`${currentLangPrefix}/answer-questions/${summary.offer_id}`}
                          className={`w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                            summary.status === 'actif'
                              ? 'bg-teal-600 text-white hover:bg-teal-700'
                              : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                          }`}
                          onClick={(e) => {
                            if (summary.status !== 'actif') {
                              e.preventDefault();
                            }
                          }}
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          {t('answerQuestions.button')}
                        </Link>
                        <p className="text-xs text-gray-500 mt-1 text-center">
                          {summary.status === 'actif' 
                            ? 'Répondre aux questions des candidats' 
                            : 'Offre expirée – questions désactivées.'
                          }
                        </p>
                      </div>

                      {/* 2. Archive Button */}
                      <div>
                        <button
                          onClick={() => handleArchive(summary.offer_id, summary.offer_title)}
                          disabled={archiving === summary.offer_id || summary.status === 'actif' || summary.status === 'resultat' || summary.status === 'infructueux'}
                          className={`w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                            summary.status === 'sous_evaluation'
                              ? 'bg-orange-600 text-white hover:bg-orange-700'
                              : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                          }`}
                        >
                          {archiving === summary.offer_id ? (
                            <>
                              <svg className="w-4 h-4 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.001 0 01-15.357-2m15.357 2H15" />
                              </svg>
                              {t('rh.button.archiving')}
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                              </svg>
                              {t('rh.archiveApplications')}
                            </>
                          )}
                        </button>
                        <p className="text-xs text-gray-500 mt-1 text-center">
                          {summary.status === 'sous_evaluation'
                            ? 'Download all application documents'
                            : summary.status === 'actif'
                              ? 'Archivage désactivé – offre toujours active'
                              : 'Archivage désactivé – offre terminée'
                          }
                        </p>
                      </div>

                      {/* 3. Select Candidate Button */}
                      <div>
                        <button
                          onClick={() => handleSetCandidate(summary.offer_id, summary.offer_title)}
                          disabled={settingCandidate === summary.offer_id || settingInfructueux === summary.offer_id || summary.status !== 'sous_evaluation' || !!summary.winner_name}
                          className={`w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                            summary.status === 'sous_evaluation' && !summary.winner_name
                              ? 'bg-blue-600 text-white hover:bg-blue-700'
                              : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                          }`}
                        >
                          {settingCandidate === summary.offer_id ? (
                            <>
                              <svg className="w-4 h-4 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.001 0 01-15.357-2m15.357 2H15" />
                              </svg>
                              Setting...
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {t('rh.selectCandidate')}
                            </>
                          )}
                        </button>
                        <p className="text-xs text-gray-500 mt-1 text-center">
                          {summary.status === 'sous_evaluation' && !summary.winner_name
                            ? 'Sélectionner un candidat pour ce poste'
                            : summary.winner_name
                              ? `Candidat sélectionné: ${summary.winner_name}`
                              : summary.status === 'actif'
                                ? 'Sélection désactivée – offre toujours active'
                                : 'Sélection désactivée – offre terminée'
                          }
                        </p>
                      </div>

                      {/* 4. Set Infructueux Button */}
                      <div>
                        <button
                          onClick={() => handleSetInfructueux(summary.offer_id, summary.offer_title)}
                          disabled={settingInfructueux === summary.offer_id || settingCandidate === summary.offer_id || summary.status !== 'sous_evaluation' || !!summary.winner_name}
                          className={`w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                            summary.status === 'sous_evaluation' && !summary.winner_name
                              ? 'bg-red-600 text-white hover:bg-red-700'
                              : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                          }`}
                        >
                          {settingInfructueux === summary.offer_id ? (
                            <>
                              <svg className="w-4 h-4 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.001 0 01-15.357-2m15.357 2H15" />
                              </svg>
                              Marking...
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {t('rh.button.setInfructueux')}
                            </>
                          )}
                        </button>
                        <p className="text-xs text-gray-500 mt-1 text-center">
                          {summary.status === 'sous_evaluation' && !summary.winner_name
                            ? 'Marquer comme infructueux (aucun candidat approprié)'
                            : summary.winner_name
                              ? 'Candidat déjà sélectionné'
                              : summary.status === 'actif'
                                ? 'Marquage désactivé – offre toujours active'
                                : 'Marquage désactivé – offre terminée'
                          }
                        </p>
                      </div>

                      {/* 5. AI Ranking Button */}
                      <div>
                        <button
                          onClick={() => handleAiRanking(summary.offer_id, summary.offer_title)}
                          disabled={loadingAiRanking === summary.offer_id || summary.status === 'actif' || summary.status === 'resultat' || summary.status === 'infructueux' || !!summary.winner_name}
                          className={`w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                            summary.status === 'sous_evaluation' && !summary.winner_name
                              ? 'bg-purple-600 text-white hover:bg-purple-700'
                              : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                          }`}
                        >
                          {loadingAiRanking === summary.offer_id ? (
                            <>
                              <svg className="w-4 h-4 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.001 0 01-15.357-2m15.357 2H15" />
                              </svg>
                              Chargement...
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              Classement IA
                            </>
                          )}
                        </button>
                        <p className="text-xs text-gray-500 mt-1 text-center">
                          {summary.status === 'sous_evaluation' && !summary.winner_name
                            ? 'Voir le classement des candidats par IA'
                            : summary.status === 'actif'
                              ? 'Classement IA désactivé – offre toujours active'
                              : summary.winner_name
                                ? 'Candidat déjà sélectionné'
                                : 'Classement IA désactivé – offre terminée'
                          }
                        </p>
                      </div>

                      {/* 6. Revert Winner Button - only when status is 'resultat' */}
                      {summary.status === 'resultat' && summary.winner_name && (
                        <div>
                          <button
                            onClick={() => handleRevertWinner(summary.offer_id, summary.offer_title, summary.winner_name!)}
                            disabled={revertingWinner === summary.offer_id || revertingInfructueux === summary.offer_id}
                            className="w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-300"
                          >
                            {revertingWinner === summary.offer_id ? (
                              <>
                                <svg className="w-4 h-4 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.001 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                {t('rh.button.reverting')}
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                </svg>
                                {t('rh.button.revertWinner')}
                              </>
                            )}
                          </button>
                          <p className="text-xs text-amber-700 mt-1 text-center">
                            {t('rh.swal.archiveWarning')}
                          </p>
                        </div>
                      )}

                      {/* 7. Revert Infructueux Button - only when status is 'infructueux' */}
                      {summary.status === 'infructueux' && (
                        <div>
                          <button
                            onClick={() => handleRevertInfructueux(summary.offer_id, summary.offer_title)}
                            disabled={revertingWinner === summary.offer_id || revertingInfructueux === summary.offer_id}
                            className="w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-300"
                          >
                            {revertingInfructueux === summary.offer_id ? (
                              <>
                                <svg className="w-4 h-4 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.001 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                {t('rh.button.reverting')}
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                </svg>
                                {t('rh.button.revertInfructueux')}
                              </>
                            )}
                          </button>
                          <p className="text-xs text-amber-700 mt-1 text-center">
                            {t('rh.swal.archiveWarning')}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Archive functionality for non-Comité d'Ouverture users */}
                  {!isComiteOuverture && summary.status !== 'actif' && summary.application_count > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <button
                        onClick={() => handleArchive(summary.offer_id, summary.offer_title)}
                        disabled={archiving === summary.offer_id || summary.status === 'resultat' || summary.status === 'infructueux'}
                        className={`w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                          summary.status === 'sous_evaluation'
                            ? 'bg-orange-600 text-white hover:bg-orange-700'
                            : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                        }`}
                      >
                        {archiving === summary.offer_id ? (
                          <>
                            <svg className="w-4 h-4 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.001 0 01-15.357-2m15.357 2H15" />
                            </svg>
                              {t('rh.button.archiving')}
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                            </svg>
                            {t('rh.archiveApplications')}
                          </>
                        )}
                      </button>
                      <p className="text-xs text-gray-500 mt-2 text-center">
                        {summary.status === 'sous_evaluation'
                          ? 'Télécharger tous les documents de candidature'
                          : 'Archivage désactivé – offre terminée'
                        }
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ApplicationsSummary;