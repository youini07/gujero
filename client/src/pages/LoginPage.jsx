import { useNavigate } from 'react-router-dom';

const LoginPage = ({ lang }) => {
    const navigate = useNavigate();

    const handleKakaoLogin = () => {
        const KAKAO_CLIENT_ID = '3c06363b47020b23e4774d22720f79f9';
        // 현재 접속된 도메인(localhost 또는 gujero.com)을 동적으로 사용
        const REDIRECT_URI = `${window.location.origin}/api/auth/kakao/callback`;
        const KAKAO_AUTH_URL = `https://kauth.kakao.com/oauth/authorize?client_id=${KAKAO_CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code`;
        
        // 실제 카카오 로그인(동의) 화면으로 이동
        window.location.href = KAKAO_AUTH_URL;
    };

    return (
        <div className="max-w-md mx-auto px-4 py-14 md:py-20">
            <div className="bg-white rounded-2xl border border-[#E7E5E4] p-7 md:p-9 text-center">
                <div className="mb-9">
                    <span className="inline-block text-[10px] font-bold uppercase tracking-[0.24em] text-[#78716C] mb-2">
                        Gujero Archive
                    </span>
                    <h1 className="text-2xl font-extrabold tracking-tight text-[#18181B] mb-2.5">
                        간편하게 시작하기
                    </h1>
                    <p className="text-[#78716C] text-[13px] leading-relaxed">
                        복잡한 회원가입 없이 카카오톡으로 1초 만에 로그인하세요.
                    </p>
                </div>

                <button
                    onClick={handleKakaoLogin}
                    className="w-full bg-[#FEE500] text-[#191919] py-3.5 rounded-xl font-bold text-[15px] tracking-tight hover:bg-[#F5DC00] transition-all active:scale-[0.985] flex items-center justify-center gap-2.5"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 3C6.477 3 2 6.55 2 10.925C2 13.784 3.96 16.273 6.845 17.61L5.86 21.361C5.78 21.666 6.136 21.895 6.395 21.724L10.875 18.753C11.242 18.799 11.616 18.825 12 18.825C17.523 18.825 22 15.275 22 10.912C22 6.55 17.523 3 12 3Z"/>
                    </svg>
                    카카오로 계속하기
                </button>

                <div className="mt-7 pt-6 border-t border-[#F5F5F4]">
                    <button 
                        onClick={() => navigate(`/?lang=${lang}`)}
                        className="text-[#78716C] font-medium text-[13px] hover:text-[#18181B] transition-colors underline underline-offset-4"
                    >
                        다음에 할게요 (둘러보기)
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
