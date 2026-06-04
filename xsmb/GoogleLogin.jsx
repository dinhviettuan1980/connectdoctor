import { GoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';

function GoogleLoginPage() {
    const navigate = useNavigate();
    
  const handleLoginSuccess = (credentialResponse) => {
    const idToken = credentialResponse.credential;

    // Lưu token vào localStorage (hoặc context)
    localStorage.setItem('google_id_token', idToken);

    // Redirect về Home
    navigate('/');
  };

  return (
    <div>
      <h2>Login with Google</h2>
      <GoogleLogin
        onSuccess={handleLoginSuccess}
        onError={() => console.log('Login Failed')}
      />
    </div>
  );
}

export default GoogleLoginPage;
