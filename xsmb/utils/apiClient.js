import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { isTokenExpired } from './tokenUtil';

const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_BASE,
});

// Add token if exists
apiClient.interceptors.request.use(
  (config) => {
    // if (isTokenExpired()) {
    //   localStorage.removeItem('google_id_token');
    //   window.location.href = '/login'; // vì không dùng hook ở đây
    //   // throw new Error('Token expired');
    // }

    const token = localStorage.getItem('google_id_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default apiClient;
