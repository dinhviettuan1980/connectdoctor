import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function LogoutPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // Xoá token
    localStorage.removeItem('google_id_token');

    // Chuyển về login sau 100ms
    setTimeout(() => {
      navigate('/login');
    }, 100);
  }, [navigate]);

  return <p>Đang đăng xuất...</p>;
}

export default LogoutPage;
