import AsyncStorage from '@react-native-async-storage/async-storage';

// Your Mac's local IP address
export const BASE_URL = 'http://192.168.31.186:3000/api/staff';

export const saveStaffData = async (data: any) => {
    try {
        await AsyncStorage.setItem('@staff_data', JSON.stringify(data));
    } catch (e) {
        console.error('Error saving staff data', e);
    }
};

export const getStaffData = async () => {
    try {
        const jsonValue = await AsyncStorage.getItem('@staff_data');
        return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (e) {
        console.error('Error reading staff data', e);
        return null;
    }
};

export const removeStaffData = async () => {
    try {
        await AsyncStorage.removeItem('@staff_data');
    } catch (e) {
        console.error('Error removing staff data', e);
    }
};
