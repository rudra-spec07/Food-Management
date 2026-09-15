import { apiClient } from './api/apiClient';
import {
  AdminDashboardData,
  DonationReportData,
  DonationReportFilterParams,
  DonationTrendData,
  DonationStatusDistributionData,
  PickupReportData,
  PickupReportFilterParams,
  WorkerReportData,
  WorkerReportFilterParams,
  WorkerDetailData,
  ActivityReportData,
  ActivityReportFilterParams,
  WorkerDashboardData,
  GroupByPeriod,
  DateFilterParams,
} from '../types/reporting.types';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const reportingService = {
  getAdminDashboard: async (): Promise<AdminDashboardData> => {
    const response = await apiClient.get<ApiResponse<AdminDashboardData>>('/admin/dashboard');
    return response.data.data;
  },

  getDonationReport: async (params?: DonationReportFilterParams): Promise<DonationReportData> => {
    const response = await apiClient.get<ApiResponse<DonationReportData>>('/admin/reports/donations', { params });
    return response.data.data;
  },

  getDonationTrend: async (params?: DateFilterParams & { groupBy?: GroupByPeriod }): Promise<DonationTrendData> => {
    const response = await apiClient.get<ApiResponse<DonationTrendData>>('/admin/reports/donations/trend', { params });
    return response.data.data;
  },

  getDonationStatusDistribution: async (params?: DateFilterParams): Promise<DonationStatusDistributionData> => {
    const response = await apiClient.get<ApiResponse<DonationStatusDistributionData>>(
      '/admin/reports/donations/status-distribution',
      { params }
    );
    return response.data.data;
  },

  getPickupReport: async (params?: PickupReportFilterParams): Promise<PickupReportData> => {
    const response = await apiClient.get<ApiResponse<PickupReportData>>('/admin/reports/pickups', { params });
    return response.data.data;
  },

  getWorkerReport: async (params?: WorkerReportFilterParams): Promise<WorkerReportData> => {
    const response = await apiClient.get<ApiResponse<WorkerReportData>>('/admin/reports/workers', { params });
    return response.data.data;
  },

  getWorkerDetail: async (workerId: string, params?: DateFilterParams): Promise<WorkerDetailData> => {
    const response = await apiClient.get<ApiResponse<WorkerDetailData>>(`/admin/reports/workers/${workerId}`, { params });
    return response.data.data;
  },

  getActivityReport: async (params?: ActivityReportFilterParams): Promise<ActivityReportData> => {
    const response = await apiClient.get<ApiResponse<ActivityReportData>>('/admin/activity', { params });
    return response.data.data;
  },

  exportDonationsCsv: async (params?: DateFilterParams & { status?: string; category?: string }): Promise<Blob> => {
    const response = await apiClient.get('/admin/reports/donations/export', {
      params,
      responseType: 'blob',
    });
    return response.data;
  },

  getWorkerDashboard: async (): Promise<WorkerDashboardData> => {
    const response = await apiClient.get<ApiResponse<WorkerDashboardData>>('/worker/dashboard');
    return response.data.data;
  },
};
