const axios = require('axios');
const FormData = require('form-data');

// ==========================================
// 🟢 CUSTOM OPENWA/WAHA API GATEWAY INTEGRATION
// ==========================================

const BASE_URL = 'https://harshh.in/api';
const SESSION_NAME = process.env.WHATSAPP_SESSION_ID || 'default';

/**
 * Creates an Axios instance with the necessary headers.
 */
const getApiClient = () => {
    const apiKey = process.env.WHATSAPP_API_KEY;
    if (!apiKey) {
        console.error('🚨 [CRITICAL] WHATSAPP_API_KEY is not defined in .env');
    }
    return axios.create({
        baseURL: BASE_URL,
        headers: {
            'X-API-Key': apiKey || '',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    });
};

/**
 * Ensures the phone number is correctly formatted for the API.
 * Converts 10 digit numbers to 91XXXXXXXXXX.
 * Appends @c.us for contacts if not already a JID (@c.us or @g.us).
 * @param {string} phone 
 * @returns {string} Formatted JID
 */
const formatJid = (phone) => {
    if (!phone) return '';
    let formatted = phone.toString().trim();
    
    // If it already contains @c.us or @g.us or @s.whatsapp.net, handle it
    if (formatted.includes('@')) {
        // Map Baileys style @s.whatsapp.net to @c.us for OpenWA
        if (formatted.endsWith('@s.whatsapp.net')) {
            formatted = formatted.replace('@s.whatsapp.net', '@c.us');
        }
        return formatted;
    }

    // Clean non-numeric characters for phone numbers
    let cleaned = formatted.replace(/\D/g, '');
    
    // Handle local numbers
    if (cleaned.startsWith('0')) cleaned = cleaned.substring(1);
    if (cleaned.length === 10) cleaned = '91' + cleaned;
    
    return `${cleaned}@c.us`;
};

const whatsappApi = {
    /**
     * Get Session Details (Check if connected)
     */
    async getSessionStatus() {
        try {
            const api = getApiClient();
            // In WAHA, session info is usually at /sessions/{id}
            const response = await api.get(`/sessions/${SESSION_NAME}`);
            return { success: true, data: response.data };
        } catch (error) {
            console.error('❌ WhatsApp API Error (getSessionStatus):', error.response?.data || error.message);
            return { success: false, error: error.response?.data?.message || error.message };
        }
    },

    /**
     * Send a Text Message
     * @param {string} phone Contact number or Group JID
     * @param {string} body Message content
     */
    async sendTextMessage(phone, body) {
        try {
            const api = getApiClient();
            const jid = formatJid(phone);
            
            // WAHA format
            const payload = {
                chatId: jid,
                text: body
            };
            
            const response = await api.post(`/sessions/${SESSION_NAME}/messages/send-text`, payload);
            return { success: true, data: response.data };
        } catch (error) {
            console.error(`❌ WhatsApp API Error (sendTextMessage to ${phone}):`, error.response?.data || error.message);
            return { success: false, error: error.response?.data?.message || error.message };
        }
    },

    /**
     * Send an Image/Document Message
     * @param {string} phone Contact number or Group JID
     * @param {string} mediaUrl Publicly accessible URL of the media
     * @param {string} caption Optional text caption
     */
    async sendImageMessage(phone, mediaUrl, caption = '') {
        try {
            const api = getApiClient();
            const jid = formatJid(phone);
            const payload = {
                chatId: jid,
                file: { url: mediaUrl },
                caption: caption
            };
            const response = await api.post(`/sessions/${SESSION_NAME}/messages/send-image`, payload);
            return { success: true, data: response.data };
        } catch (error) {
            console.error(`❌ WhatsApp API Error (sendImageMessage to ${phone}):`, error.response?.data || error.message);
            return { success: false, error: error.response?.data?.message || error.message };
        }
    },

    /**
     * Send a Document Message (e.g. PDF) via Base64
     * @param {string} phone Contact number or Group JID
     * @param {string|Buffer} mediaData The document data (Buffer or Base64 string)
     * @param {string} filename Name of the file (e.g. Invoice-123.pdf)
     * @param {string} caption Optional text caption
     */
    async sendDocumentMessage(phone, mediaData, filename, caption = '') {
        try {
            const api = getApiClient();
            const jid = formatJid(phone);
            
            // Ensure data is a base64 string
            const base64String = Buffer.isBuffer(mediaData) ? mediaData.toString('base64') : mediaData;

            const payload = {
                chatId: jid,
                base64: base64String,
                mimetype: 'application/pdf',
                filename: filename || 'Document.pdf',
                caption: caption || ''
            };
            
            const response = await api.post(`/sessions/${SESSION_NAME}/messages/send-document`, payload);
            return { success: true, data: response.data };
        } catch (error) {
            console.error(`❌ WhatsApp API Error (sendDocumentMessage to ${phone}):`, error.response?.data || error.message);
            return { success: false, error: error.response?.data?.message || error.message };
        }
    },

    /**
     * Check if a contact has WhatsApp registered
     * @param {string} phone Contact number
     */
    async checkContactExists(phone) {
        try {
            const api = getApiClient();
            let cleaned = phone.toString().replace(/\D/g, '');
            if (cleaned.startsWith('0')) cleaned = cleaned.substring(1);
            if (cleaned.length === 10) cleaned = '91' + cleaned;

            const response = await api.get(`/sessions/${SESSION_NAME}/contacts/check/${cleaned}`);
            return { success: true, exists: response.data?.numberExists || false };
        } catch (error) {
            console.error(`❌ WhatsApp API Error (checkContactExists for ${phone}):`, error.response?.data || error.message);
            return { success: false, error: error.response?.data?.message || error.message };
        }
    }
};

module.exports = whatsappApi;
