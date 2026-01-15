import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../config';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

interface StatisticsData {
  overview: {
    total_offers: number;
    active_offers: number;
    evaluation_offers: number;
    result_offers: number;
    infructueux_offers: number;
    not_expired: number;
    total_applications: number;
    offers_with_applications: number;
    applications_today: number;
    applications_this_month: number;
    success_rate: string;
    avg_applications_per_offer: string;
  };
  geographic: {
    top_applicant_countries: Array<{ country: string; application_count: number }>;
    offer_distribution: Array<{ country: string; offer_count: number }>;
  };
  performance: {
    by_type: Array<{
      type: string;
      offer_count: number;
      avg_applications: number;
      total_applications: number;
    }>;
    by_department: Array<{
      department_name: string;
      offer_count: number;
      total_applications: number;
      avg_applications_per_offer: number;
    }>;
    top_offers: Array<{
      id: number;
      title: string;
      type: string;
      department_name: string;
      application_count: number;
    }>;
  };
  trends: {
    monthly_applications: Array<{ month: string; application_count: number }>;
    monthly_offers: Array<{ month: string; offer_count: number }>;
  };
  process: {
    archived_applications: number;
    total_expired_applications: number;
    answered_questions: number;
    total_questions: number;
    archive_completion_rate: string;
    question_response_rate: string;
  };
  user_activity: Array<{
    name: string;
    role: string;
    offers_created: number;
    applications_processed: number;
  }>;
  timestamp: string;
}

const StatisticsDashboard = () => {
  const [stats, setStats] = useState<StatisticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('Fetching statistics from:', `${API_BASE_URL}/api/statistics`);
      
      const response = await fetch(`${API_BASE_URL}/api/statistics`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Failed to fetch statistics: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log('Statistics data received:', data);
      setStats(data);
    } catch (err) {
      console.error('Statistics fetch error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('fr-FR').format(num);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR');
  };

  const getRoleLabel = (role: string) => {
    const labels: { [key: string]: string } = {
      'admin': 'Administrateur',
      'comite_ajout': 'Comité d\'Ajout',
      'comite_ouverture': 'Comité d\'Ouverture'
    };
    return labels[role] || role;
  };

  // Chart colors
  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-900">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatNumber(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin h-12 w-12 border-t-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <svg className="w-6 h-6 text-red-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="text-red-800 font-medium">Erreur de chargement</h3>
            <p className="text-red-600 text-sm mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  // Prepare data for charts
  const statusData = [
    { name: 'Actives', value: stats.overview.active_offers, color: '#10b981' },
    { name: 'Sous Évaluation', value: stats.overview.evaluation_offers, color: '#f59e0b' },
    { name: 'Résultat', value: stats.overview.result_offers, color: '#3b82f6' },
    { name: 'Infructueux', value: stats.overview.infructueux_offers, color: '#ef4444' }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold mb-2">Tableau de Bord Statistique</h2>
            <p className="text-blue-100">Vue d'ensemble des performances de recrutement</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-blue-100">Dernière mise à jour</p>
            <p className="text-lg font-medium">{formatDate(stats.timestamp)}</p>
          </div>
        </div>
      </div>

      {/* Top Row - 3 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className="text-2xl font-bold text-gray-900">{formatNumber(stats.overview.total_offers)}</span>
          </div>
          <p className="text-sm font-medium text-gray-600 mb-2">Total des Offres</p>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-500" 
              style={{ width: `${Math.min((stats.overview.active_offers / stats.overview.total_offers) * 100, 100)}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-500 mt-1">{stats.overview.active_offers} actives</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-2xl font-bold text-gray-900">{formatNumber(stats.overview.total_applications)}</span>
          </div>
          <p className="text-sm font-medium text-gray-600 mb-2">Total Candidatures</p>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-600 h-2 rounded-full transition-all duration-500" 
              style={{ width: `${Math.min((stats.overview.applications_this_month / stats.overview.total_applications) * 100, 100)}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-500 mt-1">{stats.overview.applications_this_month} ce mois</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <span className="text-2xl font-bold text-gray-900">{stats.overview.success_rate}%</span>
          </div>
          <p className="text-sm font-medium text-gray-600 mb-2">Taux de Succès</p>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-yellow-600 h-2 rounded-full transition-all duration-500" 
              style={{ width: `${stats.overview.success_rate}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-500 mt-1">Performance globale</p>
        </div>
      </div>

      {/* Bottom Row - 3 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <span className="text-2xl font-bold text-gray-900">{stats.overview.avg_applications_per_offer}</span>
          </div>
          <p className="text-sm font-medium text-gray-600 mb-2">Moyenne par Offre</p>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-purple-600 h-2 rounded-full transition-all duration-500" 
              style={{ width: `${Math.min(parseFloat(stats.overview.avg_applications_per_offer) * 10, 100)}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-500 mt-1">Engagement moyen</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-teal-100 rounded-lg">
              <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <span className="text-2xl font-bold text-gray-900">{stats.process.question_response_rate}%</span>
          </div>
          <p className="text-sm font-medium text-gray-600">Taux de Réponse</p>
          <p className="text-xs text-gray-500 mt-1">{stats.process.answered_questions}/{stats.process.total_questions} questions</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-red-100 rounded-lg">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <span className="text-2xl font-bold text-gray-900">{formatNumber(stats.overview.infructueux_offers)}</span>
          </div>
          <p className="text-sm font-medium text-gray-600">Offres Infructueuses</p>
          <p className="text-xs text-gray-500 mt-1">Sans candidatures</p>
        </div>
      </div>

      {/* Charts Row 1: Status Distribution & Monthly Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Status Distribution Pie Chart */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Répartition des Offres par Statut</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => formatNumber(value)} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center space-x-4 mt-4">
            {statusData.map((item, index) => (
              <div key={index} className="flex items-center">
                <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }}></div>
                <span className="text-sm text-gray-600">{item.name}: {formatNumber(item.value)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly Trends Line Chart */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Tendances Mensuelles</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={stats.trends.monthly_applications}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="application_count" 
                stroke="#3b82f6" 
                strokeWidth={3}
                dot={{ fill: '#3b82f6', r: 6 }}
                activeDot={{ r: 8 }}
                name="Candidatures"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2: Department Distribution & Geographic Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Offers per Department Bar Chart */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Offres par Département</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.performance.by_department}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="department_name" 
                angle={-45} 
                textAnchor="end" 
                height={80} 
                tick={{ fontSize: 11 }} 
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="offer_count" 
                fill="#8b5cf6" 
                name="Offres" 
                radius={[8, 8, 0, 0]} 
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Geographic Distribution */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Distribution Géographique</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.geographic.top_applicant_countries}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="country" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="application_count" fill="#ec4899" name="Candidatures" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default StatisticsDashboard;