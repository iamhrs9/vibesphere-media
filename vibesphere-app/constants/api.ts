// VibeSphere Media – API Configuration
// Update BASE_URL to your local IP when testing on a physical device
// e.g. http://192.168.1.x:3000 (check with `ipconfig getifaddr en0` on Mac)

// For Expo Go on simulator: localhost works fine
// For Expo Go on physical phone: use your machine's LAN IP
export const BASE_URL = 'http://192.168.31.186:3000';

// Admin auth token (matches server.js checkAuth middleware)
export const ADMIN_TOKEN = 'SECRET_VIBESPHERE_KEY_123';

// Pre-built headers for all protected admin API calls
export const ADMIN_HEADERS = {
    'Authorization': ADMIN_TOKEN,
    'Content-Type': 'application/json',
};

// AsyncStorage key for persisting login session
export const STORAGE_KEY_TOKEN = 'vibesphere_admin_token';

// API Endpoints
export const API = {
    login: `${BASE_URL}/api/login`,
    orders: `${BASE_URL}/api/admin/orders`,
    updateStatus: `${BASE_URL}/api/admin/update-status`,
    staff: `${BASE_URL}/api/admin/staff`,
    addStaff: `${BASE_URL}/api/admin/add-staff`,
    deleteStaff: (id: string) => `${BASE_URL}/api/admin/delete-staff/${id}`,
    staffPerformance: `${BASE_URL}/api/admin/staff-performance`,
    addTask: `${BASE_URL}/api/admin/add-task`,
    notices: `${BASE_URL}/api/admin/notices`,
    addNotice: `${BASE_URL}/api/admin/add-notice`,
    deleteNotice: (id: string) => `${BASE_URL}/api/admin/delete-notice/${id}`,
    jobs: `${BASE_URL}/api/jobs`,
    addJob: `${BASE_URL}/api/admin/add-job`,
    deleteJob: (id: string) => `${BASE_URL}/api/admin/delete-job/${id}`,
    handovers: `${BASE_URL}/api/admin/handovers`,
    deleteHandover: (id: string) => `${BASE_URL}/api/admin/delete-handover/${id}`,
    reEmailHandover: (id: string) => `${BASE_URL}/api/admin/re-email-handover/${id}`,
    resendInvoice: `${BASE_URL}/api/admin/resend-invoice`,
    downloadInvoice: (orderId: string) => `${BASE_URL}/api/download-invoice/${encodeURIComponent(orderId)}`,
    blogs: `${BASE_URL}/api/blogs`,
    addBlog: `${BASE_URL}/api/add-blog`,
    editBlog: (id: string) => `${BASE_URL}/api/edit-blog/${id}`,
    deleteBlog: (id: string) => `${BASE_URL}/api/delete-blog/${id}`,
};
